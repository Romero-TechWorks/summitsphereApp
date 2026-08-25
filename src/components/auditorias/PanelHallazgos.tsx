'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import { listarAlcanceNormas, type AuditoriaEnLista } from '@/lib/queries/auditorias'
import {
  actualizarHallazgo,
  cambiarEstadoHallazgo,
  crearHallazgo,
  diasAbierto,
  folioDeHallazgo,
  listarHallazgos,
  siguienteConsecutivo,
  type ContextoHallazgo,
  type DatosHallazgo,
  type HallazgoConContexto,
} from '@/lib/queries/hallazgos'
import {
  ESTADOS_ABIERTOS_HALLAZGO,
  ESTADOS_HALLAZGO,
  TIPOS_HALLAZGO,
} from '@/lib/auditorias/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { normalizar } from '@/lib/utils/texto'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import { IconoAlerta } from '@/components/ui/Iconos'
import FormularioHallazgo from './FormularioHallazgo'
import FichaHallazgo from './FichaHallazgo'

const FORM = 'form-hallazgo'

type Edicion =
  | { modo: 'nuevo'; clausula?: string | null; proceso?: string | null }
  | { modo: 'editar'; hallazgo: HallazgoConContexto }
  | null

/**
 * **Los hallazgos de una auditoría** [F03·B4].
 *
 * ⚠️ **No hay borrar** (regla 13). Se anula con motivo o se reclasifica, y queda
 * el historial. Y no es sólo una decisión de pantalla: la base lo impide para
 * todos, `service_role` incluido.
 *
 * ⚠️ **El consecutivo se calcula sobre la CACHÉ**, no preguntándole al servidor:
 * en la planta no hay a quién preguntar. Si otro auditor ya usó ese número, la
 * base **renumera al llegar** en vez de rechazar el hallazgo.
 *
 * ⚠️ Levantar un hallazgo **desde el recorrido** no pasa por aquí: esa pantalla
 * tiene su propio modal (`PanelRecorrido`). Pilotarla desde este panel obligaba a
 * llamar a `setEdicion` durante el render, que es un bucle esperando a pasar — y
 * además el recorrido necesita quedarse donde está al guardar, no saltar a otra
 * pestaña con el auditor a media nave.
 */
export default function PanelHallazgos({ auditoria }: { auditoria: AuditoriaEnLista }) {
  const cliente = useQueryClient()
  const clave = queryKeys.auditorias.hallazgos(auditoria.id)

  const [texto, setTexto] = useState('')
  const [verCerrados, setVerCerrados] = useState(false)
  const [edicion, setEdicion] = useState<Edicion>(null)
  const [viendo, setViendo] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: hallazgos = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarHallazgos(auditoria.id),
  })

  const { data: alcance = [] } = useQuery({
    queryKey: queryKeys.auditorias.alcanceNormas(auditoria.id),
    queryFn: () => listarAlcanceNormas(auditoria.id),
  })

  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })
  const esSocio = usuario?.rol === 'socio'

  const normasDelAlcance = useMemo(() => alcance.map((a) => a.norma_id), [alcance])

  // ⚠️ El filtro va EN MEMORIA y no entra en la clave de caché: en la planta,
  // una consulta por búsqueda vacía la lista al teclear la primera letra.
  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    return hallazgos.filter((h) => {
      if (!verCerrados && !ESTADOS_ABIERTOS_HALLAZGO.includes(h.estado)) return false
      if (!aguja) return true
      return (
        normalizar(h.descripcion).includes(aguja) ||
        normalizar(h.folio).includes(aguja) ||
        normalizar(h.clausula?.numero ?? '').includes(aguja) ||
        normalizar(h.proceso?.nombre ?? '').includes(aguja)
      )
    })
  }, [hallazgos, texto, verCerrados])

  const cerrados = hallazgos.filter((h) => !ESTADOS_ABIERTOS_HALLAZGO.includes(h.estado)).length
  const enPantalla = viendo ? hallazgos.find((h) => h.id === viendo) ?? null : null

  function cerrarModal() {
    setEdicion(null)
  }

  async function guardar(datos: DatosHallazgo, motivo: string | null, contexto: ContextoHallazgo) {
    setGuardando(true)
    setError(null)

    try {
      if (edicion?.modo === 'editar') {
        const { fila, encolado } = await actualizarHallazgo(edicion.hallazgo, datos, motivo, contexto)
        aplicarEscritura<HallazgoConContexto>({
          cliente,
          clave,
          encolado,
          actualizar: (previo) => previo.map((h) => (h.id === fila.id ? fila : h)),
        })
        if (!encolado) {
          void cliente.invalidateQueries({ queryKey: queryKeys.auditorias.historial(fila.id) })
        }
      } else {
        const { fila, encolado } = await crearHallazgo({
          auditoriaId: auditoria.id,
          orgId: auditoria.org_id,
          // Un hallazgo levantado aquí no sale de un punto del recorrido.
          itemId: null,
          consecutivo: siguienteConsecutivo(hallazgos),
          folioAuditoria: auditoria.folio,
          datos,
          contexto,
        })
        aplicarEscritura<HallazgoConContexto>({
          cliente,
          clave,
          encolado,
          actualizar: (previo) => [...previo, fila].sort((a, b) => a.consecutivo - b.consecutivo),
        })
      }

      // El tablero del lunes enseña estas mismas filas.
      void cliente.invalidateQueries({ queryKey: queryKeys.auditorias.hallazgosDeLaCartera() })
      cerrarModal()
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function moverEstado(hallazgo: HallazgoConContexto, estado: string, motivo: string) {
    const { fila, encolado } = await cambiarEstadoHallazgo(hallazgo, estado, motivo)
    aplicarEscritura<HallazgoConContexto>({
      cliente,
      clave,
      encolado,
      actualizar: (previo) => previo.map((h) => (h.id === fila.id ? fila : h)),
    })
    if (!encolado) {
      void cliente.invalidateQueries({ queryKey: queryKeys.auditorias.historial(fila.id) })
      void cliente.invalidateQueries({ queryKey: queryKeys.auditorias.hallazgosDeLaCartera() })
    }
  }

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div style={{ flex: '1 1 200px', maxWidth: 320 }}>
          <Input
            etiqueta="Buscar"
            etiquetaOculta
            placeholder="Folio, cláusula, proceso o descripción"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <Button
          variante="primario"
          onClick={() => { setError(null); setEdicion({ modo: 'nuevo' }) }}
        >
          Levantar hallazgo
        </Button>
      </div>

      {cerrados > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Checkbox
            etiqueta={`Ver los ${cerrados} cerrados y anulados`}
            checked={verCerrados}
            onChange={(e) => setVerCerrados(e.target.checked)}
          />
        </div>
      )}

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={hallazgos.length === 0 ? 'Esta auditoría no tiene hallazgos' : 'Nada con ese filtro'}
          descripcion={
            hallazgos.length === 0
              ? 'Se levantan durante el recorrido, desde cada punto de la lista de verificación, o aquí a mano. Cada uno cita una cláusula y describe qué se vio, dónde y cuándo.'
              : 'Prueba con otro texto, o marca la casilla para ver también los cerrados.'
          }
        />
      ) : (
        <Lista etiqueta="Hallazgos de la auditoría">
          {visibles.map((hallazgo) => {
            const abierto = ESTADOS_ABIERTOS_HALLAZGO.includes(hallazgo.estado)
            const dias = diasAbierto(hallazgo)
            return (
              <Fila
                key={hallazgo.id}
                Icono={IconoAlerta}
                titulo={
                  <>
                    <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                      {folioDeHallazgo(hallazgo)}
                    </span>
                    {hallazgo.descripcion}
                  </>
                }
                meta={
                  <>
                    {hallazgo.clausula && (
                      <span>{hallazgo.clausula.numero} · {hallazgo.clausula.titulo}</span>
                    )}
                    {hallazgo.proceso && <span>{hallazgo.proceso.nombre}</span>}
                    {abierto && <span>{dias} día{dias === 1 ? '' : 's'}</span>}
                  </>
                }
                onClick={() => setViendo(hallazgo.id)}
                derecha={
                  <>
                    <Badge tono={tonoDe(TIPOS_HALLAZGO, hallazgo.tipo)}>
                      {etiquetaDe(TIPOS_HALLAZGO, hallazgo.tipo)}
                    </Badge>
                    <Badge tono={tonoDe(ESTADOS_HALLAZGO, hallazgo.estado)}>
                      {etiquetaDe(ESTADOS_HALLAZGO, hallazgo.estado)}
                    </Badge>
                  </>
                }
              />
            )
          })}
        </Lista>
      )}

      {/* El expediente del hallazgo */}
      <Modal
        abierto={enPantalla !== null}
        alCerrar={() => setViendo(null)}
        titulo={enPantalla ? folioDeHallazgo(enPantalla) : ''}
      >
        {enPantalla && (
          <FichaHallazgo
            hallazgo={enPantalla}
            orgId={auditoria.org_id}
            esSocio={esSocio}
            alEditar={() => {
              setViendo(null)
              setEdicion({ modo: 'editar', hallazgo: enPantalla })
            }}
            alCambiarEstado={(estado, motivo) => moverEstado(enPantalla, estado, motivo)}
          />
        )}
      </Modal>

      {/* Levantar o reclasificar */}
      <Modal
        abierto={edicion !== null}
        alCerrar={cerrarModal}
        titulo={edicion?.modo === 'editar' ? `Hallazgo ${edicion.hallazgo.folio}` : 'Levantar hallazgo'}
        pie={
          <>
            <Button variante="fantasma" onClick={cerrarModal}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM} cargando={guardando}>
              {edicion?.modo === 'editar' ? 'Guardar' : 'Levantar'}
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {edicion && (
          <FormularioHallazgo
            id={FORM}
            orgId={auditoria.org_id}
            normasDelAlcance={normasDelAlcance}
            inicial={edicion.modo === 'editar' ? edicion.hallazgo : undefined}
            clausulaSugerida={edicion.modo === 'nuevo' ? edicion.clausula : undefined}
            procesoSugerido={edicion.modo === 'nuevo' ? edicion.proceso : undefined}
            alEnviar={guardar}
          />
        )}
      </Modal>
    </>
  )
}
