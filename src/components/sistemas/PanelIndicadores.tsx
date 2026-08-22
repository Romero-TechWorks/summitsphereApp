'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import { listarProcesos } from '@/lib/queries/procesos'
import {
  actualizarIndicador,
  cambiarActivoIndicador,
  crearIndicador,
  guardarMedicion,
  listarIndicadores,
  listarMediciones,
  type DatosIndicador,
  type IndicadorConProceso,
  type Medicion,
} from '@/lib/queries/indicadores'
import {
  FRECUENCIAS_INDICADOR,
  SENTIDOS_INDICADOR,
  cumpleLaMeta,
} from '@/lib/sistemas/catalogos'
import { etiquetaDe } from '@/lib/cartera/catalogos'
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
import Textarea from '@/components/ui/Textarea'
import { IconoIndicador } from '@/components/ui/Iconos'

/**
 * **Indicadores y su semáforo** [F02·B4].
 *
 * ⚠️ El semáforo NUNCA se pinta sólo con color: cada fila lleva el valor, la
 * meta y la palabra —«En meta» / «Fuera de meta»—. Un color solo no es
 * información accesible, y esta lista se lee además en la pantalla de un
 * proyector durante la revisión por la dirección.
 */
export default function PanelIndicadores({ orgId }: { orgId: string }) {
  const cliente = useQueryClient()
  const clave = queryKeys.sistemas.indicadores(orgId)

  const [verBajas, setVerBajas] = useState(false)
  const [editando, setEditando] = useState<IndicadorConProceso | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [midiendo, setMidiendo] = useState<IndicadorConProceso | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: indicadores = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarIndicadores(orgId),
    enabled: Boolean(orgId),
  })

  const visibles = indicadores.filter((i) => verBajas || i.activo)
  const dadosDeBaja = indicadores.filter((i) => !i.activo).length

  async function guardar(datos: DatosIndicador, proceso: { id: string; nombre: string } | null) {
    setError(null)

    try {
      if (editando) {
        const { fila, encolado } = await actualizarIndicador(editando, datos, proceso)
        aplicarEscritura<IndicadorConProceso>({
          cliente, clave, encolado,
          actualizar: (previo) => previo.map((i) => (i.id === fila.id ? fila : i)),
        })
      } else {
        const { fila, encolado } = await crearIndicador(orgId, datos, proceso)
        aplicarEscritura<IndicadorConProceso>({
          cliente, clave, encolado,
          actualizar: (previo) => [...previo, fila],
        })
      }

      setAbierto(false)
      setEditando(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  async function cambiarActivo(indicador: IndicadorConProceso) {
    setError(null)

    try {
      const { fila, encolado } = await cambiarActivoIndicador(indicador, !indicador.activo)
      aplicarEscritura<IndicadorConProceso>({
        cliente, clave, encolado,
        actualizar: (previo) => previo.map((i) => (i.id === fila.id ? fila : i)),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        {dadosDeBaja > 0 ? (
          <Checkbox
            etiqueta={`Ver los ${dadosDeBaja} dados de baja`}
            checked={verBajas}
            onChange={(e) => setVerBajas(e.target.checked)}
          />
        ) : (
          <span />
        )}
        <Button variante="primario" onClick={() => { setEditando(null); setError(null); setAbierto(true) }}>
          Nuevo indicador
        </Button>
      </div>

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo="Sin indicadores"
          descripcion="Los objetivos de calidad con su meta y su frecuencia. Es lo que se enseña en la revisión por la dirección, y sin ellos esa reunión se prepara la noche anterior en una hoja de cálculo."
          accion={<Button variante="primario" onClick={() => setAbierto(true)}>Dar de alta el primero</Button>}
        />
      ) : (
        <Lista etiqueta="Indicadores">
          {visibles.map((indicador) => {
            const ultima = indicador.ultima?.[0]
            const cumple = ultima ? cumpleLaMeta(ultima.valor, indicador.meta, indicador.sentido) : null

            return (
              <Fila
                key={indicador.id}
                Icono={IconoIndicador}
                titulo={indicador.nombre}
                onClick={() => { setEditando(indicador); setError(null); setAbierto(true) }}
                meta={
                  <>
                    <span>{indicador.proceso?.nombre ?? 'Sin proceso'}</span>
                    <span>{etiquetaDe(FRECUENCIAS_INDICADOR, indicador.frecuencia)}</span>
                    {indicador.meta !== null && (
                      <span className="mono">
                        Meta {indicador.meta}{indicador.unidad ? ` ${indicador.unidad}` : ''}
                        {' · '}{etiquetaDe(SENTIDOS_INDICADOR, indicador.sentido)}
                      </span>
                    )}
                    {ultima && (
                      <span className="mono">
                        Último {ultima.valor} el {formatDateOnly(ultima.periodo)}
                      </span>
                    )}
                    {!indicador.activo && <span>Dado de baja</span>}
                  </>
                }
                derecha={
                  <>
                    {cumple === null ? (
                      <Badge>{ultima ? 'Sin meta' : 'Sin medir'}</Badge>
                    ) : (
                      <Badge tono={cumple ? 'exito' : 'error'}>
                        {cumple ? 'En meta' : 'Fuera de meta'}
                      </Badge>
                    )}
                    <Button variante="secundario" tamano="sm" onClick={() => setMidiendo(indicador)}>
                      Medir
                    </Button>
                    <Button
                      variante="fantasma"
                      tamano="sm"
                      onClick={() => cambiarActivo(indicador)}
                      title={indicador.activo ? 'Dejar de medirlo' : 'Volver a medirlo'}
                    >
                      {indicador.activo ? 'Baja' : 'Reactivar'}
                    </Button>
                  </>
                }
              />
            )
          })}
        </Lista>
      )}

      {abierto && (
        <ModalIndicador
          orgId={orgId}
          inicial={editando}
          alCerrar={() => { setAbierto(false); setEditando(null) }}
          alGuardar={guardar}
        />
      )}

      {midiendo && (
        <ModalMediciones
          indicador={midiendo}
          alCerrar={() => setMidiendo(null)}
          alGuardado={() => {
            void cliente.invalidateQueries({ queryKey: clave })
          }}
        />
      )}
    </>
  )
}

function ModalIndicador({
  orgId,
  inicial,
  alCerrar,
  alGuardar,
}: {
  orgId: string
  inicial: IndicadorConProceso | null
  alCerrar: () => void
  alGuardar: (datos: DatosIndicador, proceso: { id: string; nombre: string } | null) => void
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [procesoId, setProcesoId] = useState(inicial?.proceso_id ?? '')
  const [formula, setFormula] = useState(inicial?.formula ?? '')
  const [unidad, setUnidad] = useState(inicial?.unidad ?? '')
  const [meta, setMeta] = useState(inicial?.meta == null ? '' : String(inicial.meta))
  const [sentido, setSentido] = useState(inicial?.sentido ?? 'mayor_mejor')
  const [frecuencia, setFrecuencia] = useState(inicial?.frecuencia ?? 'mensual')
  const [error, setError] = useState<string | null>(null)

  const { data: procesos = [] } = useQuery({
    queryKey: queryKeys.sistemas.procesos(orgId),
    queryFn: () => listarProcesos(orgId),
    enabled: Boolean(orgId),
  })

  function enviar() {
    if (nombre.trim().length === 0) {
      setError('El indicador necesita un nombre.')
      return
    }
    if (meta !== '' && !Number.isFinite(Number(meta))) {
      setError('La meta tiene que ser un número.')
      return
    }

    const proceso = procesos.find((p) => p.id === procesoId)

    alGuardar(
      {
        proceso_id: procesoId || null,
        nombre: nombre.trim(),
        formula: formula.trim() || null,
        unidad: unidad.trim() || null,
        meta: meta === '' ? null : Number(meta),
        sentido,
        frecuencia,
      },
      proceso ? { id: proceso.id, nombre: proceso.nombre } : null,
    )
  }

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={inicial ? 'Indicador' : 'Nuevo indicador'}
      ancho={600}
      pie={
        <>
          <Button variante="fantasma" onClick={alCerrar}>Cancelar</Button>
          <Button variante="primario" onClick={enviar}>Guardar</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Aviso tono="error">{error}</Aviso>}

        <Input
          etiqueta="Nombre"
          required
          ayuda="«Entregas a tiempo», «Índice de frecuencia de accidentes»."
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <Select
          etiqueta="Proceso"
          marcador="Sin proceso"
          value={procesoId}
          onChange={(e) => setProcesoId(e.target.value)}
        >
          {procesos.filter((p) => p.activo || p.id === procesoId).map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </Select>

        <Textarea
          etiqueta="Fórmula"
          rows={2}
          ayuda="Cómo se calcula. Va en la ficha del indicador que se entrega al cliente."
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          <Input
            etiqueta="Meta"
            inputMode="decimal"
            className="mono"
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
          />
          <Input
            etiqueta="Unidad"
            ayuda="%, días, piezas."
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <Select
            etiqueta="Sentido"
            ayuda="Sin esto el semáforo no sabe si 3 % de rechazos es bueno o malo."
            value={sentido}
            onChange={(e) => setSentido(e.target.value)}
          >
            {SENTIDOS_INDICADOR.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </Select>

          <Select
            etiqueta="Frecuencia"
            value={frecuencia}
            onChange={(e) => setFrecuencia(e.target.value)}
          >
            {FRECUENCIAS_INDICADOR.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </Select>
        </div>
      </div>
    </Modal>
  )
}

function ModalMediciones({
  indicador,
  alCerrar,
  alGuardado,
}: {
  indicador: IndicadorConProceso
  alCerrar: () => void
  alGuardado: () => void
}) {
  const cliente = useQueryClient()
  const clave = queryKeys.sistemas.mediciones(indicador.id)

  const [periodo, setPeriodo] = useState(hoyISO())
  const [valor, setValor] = useState('')
  const [comentario, setComentario] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: mediciones = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarMediciones(indicador.id),
  })

  async function guardar() {
    if (!Number.isFinite(Number(valor)) || valor.trim() === '') {
      setError('El valor tiene que ser un número.')
      return
    }

    setGuardando(true)
    setError(null)

    try {
      const { fila, encolado } = await guardarMedicion(
        indicador,
        mediciones.find((m) => m.periodo === periodo),
        { periodo, valor: Number(valor), comentario: comentario.trim() || null },
      )

      aplicarEscritura<Medicion>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) =>
          [...previo.filter((m) => m.periodo !== fila.periodo), fila].sort(
            (a, b) => b.periodo.localeCompare(a.periodo),
          ),
      })

      setValor('')
      setComentario('')
      alGuardado()
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={`Mediciones de ${indicador.nombre}`}
      ancho={600}
      pie={
        <>
          <Button variante="fantasma" onClick={alCerrar}>Cerrar</Button>
          <Button variante="primario" cargando={guardando} onClick={guardar}>Guardar la medición</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Aviso tono="error">{error}</Aviso>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          <Input
            etiqueta="Periodo"
            type="date"
            ayuda="El primer día del mes o del trimestre que se mide."
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          />
          <Input
            etiqueta={`Valor${indicador.unidad ? ` (${indicador.unidad})` : ''}`}
            inputMode="decimal"
            className="mono"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>

        <Input
          etiqueta="Comentario"
          ayuda="Por qué salió así. Es lo que se explica en la revisión por la dirección."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />

        {isPending ? (
          <Skeleton alto={80} radio={4} />
        ) : mediciones.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
            Todavía no hay mediciones de este indicador.
          </p>
        ) : (
          <Lista etiqueta="Historial de mediciones">
            {mediciones.map((medicion) => {
              const cumple = cumpleLaMeta(medicion.valor, indicador.meta, indicador.sentido)
              return (
                <Fila
                  key={medicion.id}
                  titulo={<span className="mono">{formatDateOnly(medicion.periodo)}</span>}
                  meta={medicion.comentario ? <span>{medicion.comentario}</span> : null}
                  derecha={
                    <>
                      <span className="mono" style={{ fontSize: 14 }}>
                        {medicion.valor}{indicador.unidad ? ` ${indicador.unidad}` : ''}
                      </span>
                      {cumple !== null && (
                        <Badge tono={cumple ? 'exito' : 'error'}>
                          {cumple ? 'En meta' : 'Fuera'}
                        </Badge>
                      )}
                    </>
                  }
                />
              )
            })}
          </Lista>
        )}
      </div>
    </Modal>
  )
}
