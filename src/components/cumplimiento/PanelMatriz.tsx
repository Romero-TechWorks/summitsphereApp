'use client'

import { Fragment, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { useEnLinea } from '@/lib/offline/estado'
import { normalizar } from '@/lib/utils/texto'
import { formatDateOnly } from '@/lib/utils/dates'
import { ESTADOS_CUMPLIMIENTO } from '@/lib/cumplimiento/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { listarNoms } from '@/lib/queries/noms'
import {
  actualizarObligacion,
  crearObligacion,
  eliminarObligacion,
  generarObligacionesDeNom,
  listarAreas,
  listarObligaciones,
  type ContextoObligacion,
  type DatosObligacion,
  type ObligacionConContexto,
} from '@/lib/queries/obligaciones'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import { IconoMatriz } from '@/components/ui/Iconos'
import FormularioObligacion from './FormularioObligacion'
import PanelAreas from './PanelAreas'
import SelectorSitio, { SIN_SITIO, enElSitio, useSitioSeleccionado } from './SelectorSitio'

const FORM = 'form-obligacion'

/**
 * **La matriz de obligaciones** [F05·B1] — docs/13 §8.
 *
 * Es la preparación del recorrido, y se hace **en la oficina**: se dan de alta
 * las áreas del sitio, se genera la matriz desde las NOMs de la biblioteca y se
 * decide, renglón por renglón y con justificación, qué aplica. Las obligaciones
 * que no vienen de una NOM —una ley, un contrato, un compromiso voluntario— se
 * dan de alta a mano: es la misma tabla (decisión 1 del dueño).
 *
 * ⚠️ **La lista del cliente se baja entera** y el sitio, el texto y «sólo sin
 * decidir» se aplican en memoria (reglas del offline, 7).
 */
export default function PanelMatriz({ orgId }: { orgId: string }) {
  const cliente = useQueryClient()
  const enLinea = useEnLinea()
  const clave = queryKeys.cumplimiento.obligaciones(orgId)
  const { sitioId, sitios, elegir } = useSitioSeleccionado(orgId)

  const [texto, setTexto] = useState('')
  const [soloSinDecidir, setSoloSinDecidir] = useState(false)
  const [nomAGenerar, setNomAGenerar] = useState('')
  const [generando, setGenerando] = useState(false)
  const [generadas, setGeneradas] = useState<string | null>(null)
  const [editando, setEditando] = useState<ObligacionConContexto | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: obligaciones = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarObligaciones(orgId),
  })
  const { data: noms = [] } = useQuery({
    queryKey: queryKeys.cumplimiento.noms(),
    queryFn: listarNoms,
  })
  const { data: areas = [] } = useQuery({
    queryKey: queryKeys.cumplimiento.areas(orgId),
    queryFn: () => listarAreas(orgId),
  })

  const sitio = sitios.find((s) => s.id === sitioId) ?? null
  const nombreDeSitio = (id: string | null) => (id ? sitios.find((s) => s.id === id)?.nombre ?? 'Sitio' : 'Organización')
  const nombreDeArea = (id: string | null) => (id ? areas.find((a) => a.id === id)?.nombre ?? 'Área' : null)
  const areasEnUso = useMemo(
    () => new Set(obligaciones.map((o) => o.area_id).filter((v): v is string => Boolean(v))),
    [obligaciones],
  )

  const delSitio = obligaciones.filter((o) => enElSitio(o.sitio_id, sitioId))
  const sinDecidir = delSitio.filter((o) => o.aplica === null).length

  // Agrupadas por NOM, y las que no vienen de una NOM al final: son las de
  // compliance, y en un despacho son casi todas.
  const grupos = useMemo(() => {
    const aguja = normalizar(texto)
    const filtradas = obligaciones.filter((o) => {
      if (!enElSitio(o.sitio_id, sitioId)) return false
      if (soloSinDecidir && o.aplica !== null) return false
      if (!aguja) return true
      return [o.elemento, o.obligacion, o.fuente, o.nom?.clave, o.justificacion]
        .some((v) => normalizar(v ?? '').includes(aguja))
    })

    const porNom = new Map<string, { titulo: string; filas: ObligacionConContexto[] }>()
    for (const o of filtradas) {
      const claveGrupo = o.nom?.id ?? '_sin_nom'
      const titulo = o.nom ? `${o.nom.clave} · ${o.nom.nombre}` : 'Leyes, contratos y compromisos voluntarios'
      if (!porNom.has(claveGrupo)) porNom.set(claveGrupo, { titulo, filas: [] })
      porNom.get(claveGrupo)!.filas.push(o)
    }
    return [...porNom.entries()]
      .sort(([a], [b]) => (a === '_sin_nom' ? 1 : b === '_sin_nom' ? -1 : 0))
      .map(([id, grupo]) => ({ id, ...grupo }))
  }, [obligaciones, sitioId, soloSinDecidir, texto])

  async function generar() {
    if (!nomAGenerar) return
    setGenerando(true)
    setError(null)
    setGeneradas(null)
    try {
      const sitioDestino = sitioId === SIN_SITIO ? null : sitioId
      const n = await generarObligacionesDeNom(orgId, sitioDestino, nomAGenerar)
      const nom = noms.find((x) => x.id === nomAGenerar)
      setGeneradas(
        n === 0
          ? `La ${nom?.clave ?? 'NOM'} ya estaba completa en ${sitio?.nombre ?? 'la organización'}: no se creó nada ni se tocó lo evaluado.`
          : `Se crearon ${n} obligacion${n === 1 ? '' : 'es'} de la ${nom?.clave ?? 'NOM'}. Nacen «sin decidir»: revisa cada una y di si aplica, con su justificación.`,
      )
      await cliente.invalidateQueries({ queryKey: clave })
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGenerando(false)
    }
  }

  async function guardar(datos: DatosObligacion, contexto: ContextoObligacion) {
    setGuardando(true)
    setError(null)
    try {
      if (editando) {
        const { fila, encolado } = await actualizarObligacion(editando, datos, contexto)
        aplicarEscritura<ObligacionConContexto>({
          cliente, clave, encolado,
          actualizar: (p) => p.map((o) => (o.id === fila.id ? fila : o)),
        })
      } else {
        const orden = obligaciones.reduce((m, o) => Math.max(m, o.orden), 0) + 1
        const { fila, encolado } = await crearObligacion(orgId, { ...datos, orden }, contexto)
        aplicarEscritura<ObligacionConContexto>({
          cliente, clave, encolado,
          actualizar: (p) => [...p, fila],
        })
      }
      setAbierto(false)
      setEditando(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function quitar(obligacion: ObligacionConContexto) {
    setGuardando(true)
    setError(null)
    try {
      const { encolado } = await eliminarObligacion(obligacion)
      aplicarEscritura<ObligacionConContexto>({
        cliente, clave, encolado,
        actualizar: (p) => p.filter((o) => o.id !== obligacion.id),
      })
      setAbierto(false)
      setEditando(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  const nomsVigentes = noms.filter((n) => n.vigente)
  const puedeGenerar = sitioId !== ''

  return (
    <>
      <div style={{ maxWidth: 420, marginBottom: 16 }}>
        <SelectorSitio sitioId={sitioId} sitios={sitios} elegir={elegir} />
      </div>

      {sitio && <PanelAreas orgId={orgId} sitio={sitio} enUso={areasEnUso} />}

      {/* ── Generar desde la biblioteca: oficina, con señal ───────────────── */}
      <section style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px' }}>
          Generar desde una NOM
        </h3>
        {nomsVigentes.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-dim)', margin: 0 }}>
            La biblioteca de la firma está vacía. Las NOMs se dan de alta en la pestaña «Catálogo de NOMs».
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', maxWidth: 360 }}>
              <Select
                etiqueta="NOM"
                etiquetaOculta
                marcador="Elige la NOM"
                value={nomAGenerar}
                onChange={(e) => setNomAGenerar(e.target.value)}
              >
                {nomsVigentes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.clave} · {n.requisitos.filter((r) => r.activa).length} elementos
                  </option>
                ))}
              </Select>
            </div>
            <Button
              variante="secundario"
              onClick={generar}
              cargando={generando}
              disabled={!enLinea || !nomAGenerar || !puedeGenerar}
            >
              Generar
            </Button>
          </div>
        )}
        {/* ⚠️ Sexta excepción consciente a `offlineWrite`: sin señal se dice y no
            se deja empezar. Es trabajo de oficina, antes de salir a planta. */}
        <p style={{ fontSize: 12, color: 'var(--texto-dim)', margin: '6px 0 0', lineHeight: 1.5 }}>
          {!enLinea
            ? 'Sin señal no se puede generar: se hace en la oficina, antes de salir. Lo que ya está generado sí se puede editar y evaluar.'
            : !puedeGenerar
              ? 'Elige arriba el sitio para el que vas a generarla.'
              : 'Crea un renglón por elemento activo. Si ya existían, no duplica ni toca lo evaluado.'}
        </p>
        {generadas && <div style={{ marginTop: 8 }}><Aviso tono="exito">{generadas}</Aviso></div>}
      </section>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 10,
        }}
      >
        <div style={{ flex: '1 1 220px', maxWidth: 320 }}>
          <Input
            etiqueta="Buscar"
            etiquetaOculta
            placeholder="Elemento, obligación, fuente o NOM"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <Button variante="primario" onClick={() => { setEditando(null); setError(null); setAbierto(true) }}>
          Nueva obligación
        </Button>
      </div>

      {sinDecidir > 0 && (
        <div style={{ marginBottom: 10 }}>
          <Aviso tono="advertencia">
            <strong>{sinDecidir} sin decidir.</strong> Antes de recorrer, di de cada una si aplica y por qué: lo que
            no está decidido no se puede evaluar.
          </Aviso>
          <div style={{ marginTop: 6 }}>
            <Checkbox
              etiqueta="Ver sólo las que faltan por decidir"
              checked={soloSinDecidir}
              onChange={(e) => setSoloSinDecidir(e.target.checked)}
            />
          </div>
        </div>
      )}

      {error && !abierto && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {grupos.length === 0 ? (
        <EstadoVacio
          titulo={delSitio.length === 0 ? 'La matriz está vacía' : 'Nada con ese filtro'}
          descripcion={
            delSitio.length === 0
              ? 'Genera la matriz desde una NOM de la biblioteca, o da de alta a mano una obligación que no venga de una NOM: una ley, una cláusula de contrato, un compromiso voluntario.'
              : 'Prueba con otro texto o quita el filtro.'
          }
        />
      ) : (
        grupos.map((grupo) => (
          <Fragment key={grupo.id}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto-dim)', margin: '18px 0 2px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {grupo.titulo}
            </h3>
            <Lista etiqueta={grupo.titulo}>
              {grupo.filas.map((o) => (
                <Fila
                  key={o.id}
                  Icono={IconoMatriz}
                  titulo={o.elemento || o.obligacion}
                  meta={
                    <>
                      <span>{nombreDeSitio(o.sitio_id)}{o.area_id ? ` · ${nombreDeArea(o.area_id)}` : ''}</span>
                      <span>{o.aplica === null ? 'Sin decidir' : o.aplica ? 'Aplica' : 'No aplica'}</span>
                      {o.responsable && <span>{o.responsable.nombre}</span>}
                      {o.proxima_verificacion && <span>Próxima: {formatDateOnly(o.proxima_verificacion)}</span>}
                    </>
                  }
                  derecha={
                    o.aplica === false ? (
                      <Badge tono="neutro">No aplica</Badge>
                    ) : (
                      <Badge tono={tonoDe(ESTADOS_CUMPLIMIENTO, o.estado_cumplimiento)}>
                        {etiquetaDe(ESTADOS_CUMPLIMIENTO, o.estado_cumplimiento)}
                      </Badge>
                    )
                  }
                  onClick={() => { setEditando(o); setError(null); setAbierto(true) }}
                />
              ))}
            </Lista>
          </Fragment>
        ))
      )}

      <Modal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo={editando ? editando.elemento || 'Obligación' : 'Nueva obligación'}
        ancho={640}
        pie={
          <>
            {/* Sólo lo que la base deja quitar: sin evaluar. Una con foto o con
                vencimientos también se rechaza, y el motivo sale en el aviso. */}
            {editando && editando.estado_cumplimiento === 'sin_evaluar' && (
              <Button variante="peligro" onClick={() => quitar(editando)} disabled={guardando} style={{ marginRight: 'auto' }}>
                Quitar
              </Button>
            )}
            <Button variante="fantasma" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM} cargando={guardando}>
              {editando ? 'Guardar' : 'Dar de alta'}
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {editando?.requisito && (
          <p style={{ fontSize: 12, color: 'var(--texto-dim)', margin: '0 0 12px' }}>
            Nació del elemento {editando.requisito.numeral ? `${editando.requisito.numeral} · ` : ''}
            «{editando.requisito.elemento}» de la {editando.nom?.clave}.
          </p>
        )}
        {abierto && (
          <FormularioObligacion
            key={editando?.id ?? 'nueva'}
            id={FORM}
            orgId={orgId}
            sitios={sitios}
            sitioInicial={sitioId}
            inicial={editando ?? undefined}
            alEnviar={guardar}
          />
        )}
      </Modal>
    </>
  )
}
