'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Widget } from '@/lib/tablero/widgets'
import { reintentarFallidos } from '@/lib/offline/cola'
import { useEnLinea, useOperacionesCola } from '@/lib/offline/estado'
import { sincronizar } from '@/lib/offline/sync'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import { listarProyectos, type ProyectoEnCartera } from '@/lib/queries/proyectos'
import {
  cargaPorConsultor,
  embudoPorEtapa,
  misProyectos,
  proximosACerrar,
} from '@/lib/tablero/calculos'
import { ETAPAS_PROYECTO, etiquetaDe } from '@/lib/cartera/catalogos'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import Skeleton from '@/components/ui/Skeleton'

/**
 * El cuerpo de cada widget.
 *
 * Casi todos dicen todavía "sin datos" y **cuándo** van a tener: un bloque
 * vacío sin explicación se lee como una app rota, y esta pantalla es lo primero
 * que ve la firma cada mañana durante los próximos meses
 * (docs/05_SISTEMA_DE_DISENO.md §4.5).
 */
/** Los que ya tienen datos de verdad: salen todos de la lista de proyectos. */
const WIDGETS_DE_CARTERA = new Set([
  'embudo_proyectos',
  'mis_proyectos',
  'carga_equipo',
  'contratos_por_renovar',
])

export default function ContenidoWidget({ widget }: { widget: Widget }) {
  if (widget.id === 'esperando_senal') return <EsperandoSenal />
  if (WIDGETS_DE_CARTERA.has(widget.id)) return <WidgetDeCartera widget={widget} />

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--texto-dim)', lineHeight: 1.55 }}>
        {widget.descripcion}
      </p>
      <p style={{ marginTop: 9, fontSize: 11.5, color: 'var(--texto-dim)', opacity: 0.85 }}>
        Sin datos todavía · llega en la{' '}
        <span className="mono">Fase {String(widget.fase).padStart(2, '0')}</span>
      </p>
    </div>
  )
}

/**
 * Los cuatro widgets de la cartera [F01·B3].
 *
 * ⚠️ **Los cuatro leen LA MISMA consulta** —`queryKeys.cartera.proyectos()`, la
 * de `/cartera?tab=proyectos`— y cada uno calcula lo suyo en memoria. React
 * Query comparte la clave, así que un tablero con cuatro widgets hace **una**
 * petición, y abrir la cartera deja el tablero listo (y al revés).
 *
 * Y por eso funciona sin señal: no hay una vista por widget que pueda faltar en
 * la caché, hay una lista que ya está. Ver `lib/tablero/calculos.ts`.
 */
function WidgetDeCartera({ widget }: { widget: Widget }) {
  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  const { data: proyectos = [], isPending, error } = useQuery({
    queryKey: queryKeys.cartera.proyectos(),
    queryFn: listarProyectos,
  })

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={12} radio={3} />)}
      </div>
    )
  }

  if (error) {
    return <Nota>{mensajeDeError(error)}</Nota>
  }

  if (widget.id === 'embudo_proyectos') return <Embudo proyectos={proyectos} />
  if (widget.id === 'carga_equipo') return <Carga proyectos={proyectos} />
  if (widget.id === 'contratos_por_renovar') return <PorCerrar proyectos={proyectos} />
  return <Mios proyectos={proyectos} usuarioId={usuario?.id ?? null} />
}

function Embudo({ proyectos }: { proyectos: ProyectoEnCartera[] }) {
  const tramos = embudoPorEtapa(proyectos)
  const total = tramos.reduce((suma, t) => suma + t.total, 0)

  if (total === 0) {
    return <Nota>Todavía no hay proyectos abiertos en la cartera.</Nota>
  }

  const mayor = Math.max(...tramos.map((t) => t.total))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {tramos.map((tramo) => (
        <div key={tramo.etapa} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--texto-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tramo.etiqueta}
          </span>
          <Barra valor={tramo.total} maximo={mayor} />
          <span className="mono" style={{ fontSize: 12.5, width: 18, textAlign: 'right', color: tramo.total === 0 ? 'var(--texto-dim)' : 'var(--texto)' }}>
            {tramo.total}
          </span>
        </div>
      ))}
    </div>
  )
}

function Carga({ proyectos }: { proyectos: ProyectoEnCartera[] }) {
  const carga = cargaPorConsultor(proyectos)
  if (carga.length === 0) return <Nota>Nadie tiene proyectos abiertos todavía.</Nota>

  const mayor = Math.max(...carga.map((c) => c.total))
  const visibles = carga.slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {visibles.map((consultor) => (
        <div key={consultor.id ?? 'sin-lider'} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              flex: 1, minWidth: 0, fontSize: 12.5, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
              color: consultor.id ? 'var(--texto)' : 'var(--advertencia)',
            }}
          >
            {consultor.nombre}
          </span>
          <Barra valor={consultor.total} maximo={mayor} />
          <span className="mono" style={{ fontSize: 12.5, width: 18, textAlign: 'right' }}>
            {consultor.total}
          </span>
        </div>
      ))}
      {carga.length > visibles.length && <Mas cuantos={carga.length - visibles.length} />}
    </div>
  )
}

function PorCerrar({ proyectos }: { proyectos: ProyectoEnCartera[] }) {
  const proximos = proximosACerrar(proyectos)
  if (proximos.length === 0) {
    return <Nota>Ningún contrato termina en los próximos 60 días.</Nota>
  }

  const visibles = proximos.slice(0, 4)
  const hoy = hoyISO()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {visibles.map((proyecto) => {
        const vencido = (proyecto.fecha_fin_estimada ?? '') < hoy

        return (
          <Renglon key={proyecto.id} proyecto={proyecto}>
            <span
              className="mono"
              style={{ fontSize: 12, color: vencido ? 'var(--error)' : 'var(--texto-dim)', flexShrink: 0 }}
            >
              {formatDateOnly(proyecto.fecha_fin_estimada)}
            </span>
          </Renglon>
        )
      })}
      {proximos.length > visibles.length && <Mas cuantos={proximos.length - visibles.length} />}
    </div>
  )
}

function Mios({ proyectos, usuarioId }: { proyectos: ProyectoEnCartera[]; usuarioId: string | null }) {
  const mios = misProyectos(proyectos, usuarioId)
  if (mios.length === 0) {
    return <Nota>Todavía no tienes proyectos abiertos. Un socio te asigna los clientes que atiendes.</Nota>
  }

  const visibles = mios.slice(0, 4)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {visibles.map((proyecto) => (
        <Renglon key={proyecto.id} proyecto={proyecto}>
          <span className="mono" style={{ fontSize: 12, color: 'var(--texto-dim)', flexShrink: 0 }}>
            {ETAPAS_PROYECTO.findIndex((e) => e.valor === proyecto.etapa) + 1 || '—'}/6
          </span>
        </Renglon>
      ))}
      {mios.length > visibles.length && <Mas cuantos={mios.length - visibles.length} />}
    </div>
  )
}

/** Un proyecto en dos líneas, con enlace a su ficha. */
function Renglon({ proyecto, children }: { proyecto: ProyectoEnCartera; children: React.ReactNode }) {
  return (
    <Link
      href={`/cartera/${proyecto.org_id}?tab=proyectos&proyecto=${proyecto.id}`}
      style={{ display: 'flex', alignItems: 'baseline', gap: 8, textDecoration: 'none', color: 'inherit' }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {proyecto.organizacion?.nombre_comercial || proyecto.organizacion?.razon_social || 'Sin cliente'}
        </span>
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {proyecto.nombre} · {etiquetaDe(ETAPAS_PROYECTO, proyecto.etapa)}
        </span>
      </span>
      {children}
    </Link>
  )
}

/** La barra proporcional del embudo y de la carga. Sin librería de gráficas. */
function Barra({ valor, maximo }: { valor: number; maximo: number }) {
  const porcentaje = maximo > 0 ? Math.round((valor / maximo) * 100) : 0

  return (
    <span
      aria-hidden
      style={{ position: 'relative', width: 64, height: 4, borderRadius: 2, background: 'rgba(61, 186, 78, .16)', flexShrink: 0 }}
    >
      <span
        style={{
          position: 'absolute', inset: '0 auto 0 0', width: `${porcentaje}%`,
          borderRadius: 2,
          background: 'linear-gradient(90deg, var(--verde-hondo), var(--verde))',
        }}
      />
    </span>
  )
}

function Nota({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, color: 'var(--texto-dim)', lineHeight: 1.55 }}>{children}</p>
}

function Mas({ cuantos }: { cuantos: number }) {
  return (
    <p style={{ fontSize: 11.5, color: 'var(--texto-dim)' }}>
      y {cuantos} más
    </p>
  )
}

/**
 * El único widget con datos de verdad en la Fase 00: la cola de salida.
 *
 * Es la ventana del auditor a lo que lleva en el bolsillo sin subir. Cuando la
 * Fase 03 llegue, aquí va a haber treinta hallazgos esperando el
 * estacionamiento.
 *
 * ⚠️ **Un rechazo se pinta CON SU MOTIVO.** Decir sólo "no se pudo guardar" es
 * la versión con cara de mensaje de un `catch` vacío: quien lo lee no sabe si
 * perdió el dato, si fue un permiso o si basta con reintentar, y el motivo ya
 * está guardado en la cola desde que falló. CLAUDE.md · trampas heredadas.
 */
function EsperandoSenal() {
  const cliente = useQueryClient()
  const enLinea = useEnLinea()
  const operaciones = useOperacionesCola()
  const [trabajando, setTrabajando] = useState(false)

  const fallidos = operaciones.filter((o) => o.estado === 'fallido').length

  if (operaciones.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--texto-dim)', lineHeight: 1.55 }}>
        {enLinea
          ? 'Todo lo que has hecho ya está guardado en el servidor.'
          : 'Sin conexión, y no hay nada esperando. Puedes seguir trabajando.'}
      </p>
    )
  }

  const visibles = operaciones.slice(0, 4)

  async function reintentar() {
    setTrabajando(true)
    try {
      await reintentarFallidos()
      await sincronizar(cliente)
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--texto-dim)', lineHeight: 1.55, marginBottom: 9 }}>
        {enLinea
          ? 'Saliendo en orden. No hace falta hacer nada.'
          : 'Guardado en este teléfono. Sube solo al volver la señal.'}
      </p>

      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visibles.map((operacion) => (
          <li
            key={operacion.id}
            style={{
              fontSize: 12.5,
              paddingLeft: 9,
              borderLeft: `2px solid ${
                operacion.estado === 'fallido' ? 'var(--error)' : 'rgba(61, 186, 78, .45)'
              }`,
            }}
          >
            {/* La etiqueta en español: es el motivo por el que la cola guarda
                una y no un UUID. */}
            <span>{operacion.etiqueta}</span>

            {operacion.estado === 'fallido' && (
              <span
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  lineHeight: 1.45,
                  color: 'var(--error)',
                  marginTop: 1,
                }}
              >
                {operacion.motivo ?? 'El servidor rechazó el cambio.'}
              </span>
            )}
          </li>
        ))}
      </ul>

      {operaciones.length > visibles.length && (
        <p style={{ marginTop: 7, fontSize: 11.5, color: 'var(--texto-dim)' }}>
          y {operaciones.length - visibles.length} más
        </p>
      )}

      {enLinea && fallidos > 0 && (
        <button
          type="button"
          onClick={reintentar}
          disabled={trabajando}
          style={{
            marginTop: 10,
            minHeight: 32,
            padding: '0 12px',
            background: 'transparent',
            border: '1px solid var(--borde-fuerte)',
            borderRadius: 6,
            color: 'var(--texto)',
            fontSize: 12.5,
            fontFamily: 'var(--fuente-texto), sans-serif',
            cursor: trabajando ? 'wait' : 'pointer',
          }}
        >
          {trabajando ? 'Reintentando…' : `Reintentar ${fallidos === 1 ? 'el rechazado' : 'los rechazados'}`}
        </button>
      )}
    </div>
  )
}
