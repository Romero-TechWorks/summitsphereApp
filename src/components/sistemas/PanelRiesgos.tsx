'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly } from '@/lib/utils/dates'
import { listarProcesos } from '@/lib/queries/procesos'
import {
  actualizarRiesgo,
  crearRiesgo,
  eliminarRiesgo,
  listarRiesgos,
  nivelDe,
  type DatosRiesgo,
  type RiesgoConProceso,
} from '@/lib/queries/riesgos'
import {
  TIPOS_RIESGO,
  TRATAMIENTOS_RIESGO,
  nivelDeRiesgo,
} from '@/lib/sistemas/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Textarea from '@/components/ui/Textarea'
import { IconoRiesgo } from '@/components/ui/Iconos'

/** 1 a 5, la matriz de siempre. */
const ESCALA = [1, 2, 3, 4, 5]

/**
 * **Riesgos y oportunidades** [F02·B4].
 *
 * Ordenados por nivel de mayor a menor, que es el orden en el que se tratan y el
 * que un auditor espera ver.
 */
export default function PanelRiesgos({ orgId }: { orgId: string }) {
  const cliente = useQueryClient()
  const clave = queryKeys.sistemas.riesgos(orgId)

  const [tipo, setTipo] = useState('')
  const [editando, setEditando] = useState<RiesgoConProceso | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: riesgos = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarRiesgos(orgId),
    enabled: Boolean(orgId),
  })

  const visibles = useMemo(
    () => (tipo ? riesgos.filter((r) => r.tipo === tipo) : riesgos),
    [riesgos, tipo],
  )

  async function guardar(datos: DatosRiesgo, proceso: { id: string; nombre: string } | null) {
    setError(null)

    try {
      if (editando) {
        const { fila, encolado } = await actualizarRiesgo(editando, datos, proceso)
        aplicarEscritura<RiesgoConProceso>({
          cliente,
          clave,
          encolado,
          actualizar: (previo) =>
            previo.map((r) => (r.id === fila.id ? fila : r)).sort((a, b) => nivelDe(b) - nivelDe(a)),
        })
      } else {
        const { fila, encolado } = await crearRiesgo(orgId, datos, proceso)
        aplicarEscritura<RiesgoConProceso>({
          cliente,
          clave,
          encolado,
          actualizar: (previo) => [...previo, fila].sort((a, b) => nivelDe(b) - nivelDe(a)),
        })
      }

      setAbierto(false)
      setEditando(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  async function quitar(riesgo: RiesgoConProceso) {
    setError(null)

    try {
      const { encolado } = await eliminarRiesgo(riesgo)
      aplicarEscritura<RiesgoConProceso>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.filter((r) => r.id !== riesgo.id),
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
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ width: 200 }}>
          <Select
            etiqueta="Tipo"
            etiquetaOculta
            marcador="Riesgos y oportunidades"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS_RIESGO.map((o) => (
              <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
            ))}
          </Select>
        </div>
        <span style={{ flex: 1 }} />
        <Button variante="primario" onClick={() => { setEditando(null); setError(null); setAbierto(true) }}>
          Nuevo riesgo
        </Button>
      </div>

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={riesgos.length === 0 ? 'Sin riesgos capturados' : 'Nada de ese tipo'}
          descripcion={
            riesgos.length === 0
              ? 'ISO 9001 §6.1, 45001 §6.1, 27001 y 37001 piden lo mismo: identificar, valorar y tratar. Se captura una vez y sirve para las cuatro. Empieza por los procesos operativos.'
              : 'Quita el filtro para ver todo.'
          }
          accion={riesgos.length === 0 ? <Button variante="primario" onClick={() => setAbierto(true)}>Capturar el primero</Button> : null}
        />
      ) : (
        <Lista etiqueta="Riesgos y oportunidades">
          {visibles.map((riesgo) => {
            const numero = nivelDe(riesgo)
            const nivel = nivelDeRiesgo(numero)
            return (
              <Fila
                key={riesgo.id}
                Icono={IconoRiesgo}
                titulo={riesgo.descripcion}
                onClick={() => { setEditando(riesgo); setError(null); setAbierto(true) }}
                meta={
                  <>
                    <span>{riesgo.proceso?.nombre ?? 'Sin proceso'}</span>
                    <span className="mono">P{riesgo.probabilidad} × I{riesgo.impacto} = {numero}</span>
                    {riesgo.tratamiento && <span>{etiquetaDe(TRATAMIENTOS_RIESGO, riesgo.tratamiento)}</span>}
                    {riesgo.fecha_revision && <span>Revisar el {formatDateOnly(riesgo.fecha_revision)}</span>}
                  </>
                }
                derecha={
                  <>
                    <Badge tono={tonoDe(TIPOS_RIESGO, riesgo.tipo)}>
                      {etiquetaDe(TIPOS_RIESGO, riesgo.tipo)}
                    </Badge>
                    <Badge tono={nivel.tono}>{nivel.etiqueta}</Badge>
                    <Button
                      variante="fantasma"
                      tamano="sm"
                      onClick={() => quitar(riesgo)}
                      title="Quitar este riesgo"
                    >
                      Quitar
                    </Button>
                  </>
                }
              />
            )
          })}
        </Lista>
      )}

      {abierto && (
        <ModalRiesgo
          orgId={orgId}
          inicial={editando}
          alCerrar={() => { setAbierto(false); setEditando(null) }}
          alGuardar={guardar}
        />
      )}
    </>
  )
}

function ModalRiesgo({
  orgId,
  inicial,
  alCerrar,
  alGuardar,
}: {
  orgId: string
  inicial: RiesgoConProceso | null
  alCerrar: () => void
  alGuardar: (datos: DatosRiesgo, proceso: { id: string; nombre: string } | null) => void
}) {
  const [procesoId, setProcesoId] = useState(inicial?.proceso_id ?? '')
  const [tipo, setTipo] = useState(inicial?.tipo ?? 'riesgo')
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '')
  const [causa, setCausa] = useState(inicial?.causa ?? '')
  const [consecuencia, setConsecuencia] = useState(inicial?.consecuencia ?? '')
  const [probabilidad, setProbabilidad] = useState(inicial?.probabilidad ?? 3)
  const [impacto, setImpacto] = useState(inicial?.impacto ?? 3)
  const [tratamiento, setTratamiento] = useState(inicial?.tratamiento ?? '')
  const [plan, setPlan] = useState(inicial?.plan ?? '')
  const [fechaRevision, setFechaRevision] = useState(inicial?.fecha_revision ?? '')
  const [error, setError] = useState<string | null>(null)

  const { data: procesos = [] } = useQuery({
    queryKey: queryKeys.sistemas.procesos(orgId),
    queryFn: () => listarProcesos(orgId),
    enabled: Boolean(orgId),
  })

  const nivel = nivelDeRiesgo(probabilidad * impacto)

  function enviar() {
    if (descripcion.trim().length === 0) {
      setError('Describe el riesgo: qué puede pasar.')
      return
    }

    const proceso = procesos.find((p) => p.id === procesoId)

    alGuardar(
      {
        proceso_id: procesoId || null,
        tipo,
        descripcion: descripcion.trim(),
        causa: causa.trim() || null,
        consecuencia: consecuencia.trim() || null,
        probabilidad,
        impacto,
        tratamiento: tratamiento || null,
        plan: plan.trim() || null,
        fecha_revision: fechaRevision || null,
      },
      proceso ? { id: proceso.id, nombre: proceso.nombre } : null,
    )
  }

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={inicial ? 'Riesgo' : 'Nuevo riesgo'}
      ancho={620}
      pie={
        <>
          <Button variante="fantasma" onClick={alCerrar}>Cancelar</Button>
          <Button variante="primario" onClick={enviar}>Guardar</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Aviso tono="error">{error}</Aviso>}

        <Textarea
          etiqueta="Descripción"
          required
          rows={2}
          ayuda="Qué puede pasar. «Retraso en la entrega por dependencia de un solo proveedor»."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
          <Select etiqueta="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_RIESGO.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </Select>

          <Select
            etiqueta="Proceso"
            marcador="Sin proceso"
            ayuda={procesos.length === 0 ? 'Este cliente aún no tiene mapa de procesos.' : undefined}
            value={procesoId}
            onChange={(e) => setProcesoId(e.target.value)}
          >
            {procesos.filter((p) => p.activo || p.id === procesoId).map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </Select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
          <Select
            etiqueta="Probabilidad"
            value={String(probabilidad)}
            onChange={(e) => setProbabilidad(Number(e.target.value))}
          >
            {ESCALA.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>

          <Select
            etiqueta="Impacto"
            value={String(impacto)}
            onChange={(e) => setImpacto(Number(e.target.value))}
          >
            {ESCALA.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>

          {/* El nivel lo calcula la BASE (columna generada). Aquí sólo se
              adelanta lo que va a salir, para que quien captura vea el semáforo
              antes de guardar. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-end', paddingBottom: 9 }}>
            <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '.04em', color: 'var(--texto-dim)' }}>
              Nivel
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono" style={{ fontSize: 16 }}>{probabilidad * impacto}</span>
              <Badge tono={nivel.tono}>{nivel.etiqueta}</Badge>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Textarea etiqueta="Causa" rows={2} value={causa} onChange={(e) => setCausa(e.target.value)} />
          <Textarea etiqueta="Consecuencia" rows={2} value={consecuencia} onChange={(e) => setConsecuencia(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
          <Select
            etiqueta="Tratamiento"
            marcador="Sin decidir"
            value={tratamiento}
            onChange={(e) => setTratamiento(e.target.value)}
          >
            {TRATAMIENTOS_RIESGO.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </Select>

          <Input
            etiqueta="Próxima revisión"
            type="date"
            value={fechaRevision}
            onChange={(e) => setFechaRevision(e.target.value)}
          />
        </div>

        <Textarea
          etiqueta="Plan"
          rows={3}
          ayuda="Qué se va a hacer. Si se convierte en tareas, van al plan de acción [Fase 04]."
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
        />
      </div>
    </Modal>
  )
}
