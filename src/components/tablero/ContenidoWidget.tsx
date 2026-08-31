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
  folioVisible,
  listarAuditorias,
  type AuditoriaEnLista,
} from '@/lib/queries/auditorias'
import { listarHallazgosDeLaCartera } from '@/lib/queries/hallazgos'
import {
  listarVersionesPorAprobar,
  type VersionPorAprobar,
} from '@/lib/queries/documentos'
import { nombreDeOrganizacion } from '@/lib/queries/cartera'
import { faltaPorPrecargar } from '@/lib/auditorias/precarga'
import {
  cargaPorConsultor,
  embudoPorEtapa,
  hallazgosAbiertos,
  hallazgosPorAntiguedad,
  hallazgosVencidos,
  misAuditorias,
  misProyectos,
  proximaVisita,
  proximosACerrar,
} from '@/lib/tablero/calculos'
import { ESTADOS_AUDITORIA } from '@/lib/auditorias/catalogos'
import { ETAPAS_PROYECTO, etiquetaDe } from '@/lib/cartera/catalogos'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import Skeleton from '@/components/ui/Skeleton'

/**
 * El cuerpo de cada widget.
 *
 * Los que todavía no tienen datos dicen **cuándo** los van a tener: un bloque
 * vacío sin explicación se lee como una app rota, y esta pantalla es lo primero
 * que ve la firma cada mañana durante los próximos meses
 * (docs/05_SISTEMA_DE_DISENO.md §4.5).
 *
 * ⚠️ **Al cerrar una fase se conectan sus widgets, en el mismo bloque.** Es el
 * cabo que se quedó suelto al terminar la Fase 02 y la 03: el código estaba
 * entero y el tablero seguía diciendo «llega en la Fase 03», que es exactamente
 * lo que un usuario lee como «la fase no está». Hoy quedan dos placeholders y
 * los dos son de verdad — `acciones_semana` [F04] y `vencimientos_criticos`
 * [F05].
 */
/** Los cuatro que salen de la lista de proyectos [F01·B3]. */
const WIDGETS_DE_CARTERA = new Set([
  'embudo_proyectos',
  'mis_proyectos',
  'carga_equipo',
  'contratos_por_renovar',
])

/**
 * Los dos que salen de la lista de auditorías [F03].
 *
 * ⚠️ Comparten `queryKeys.auditorias.lista()` con `/auditorias`, igual que los
 * de la cartera comparten la suya: el tablero **no estrena ni una clave de
 * caché**, así que abrir el dominio deja el tablero listo y al revés. Si esto
 * fuera una vista o una consulta propia, sería otra cosa que puede faltar en la
 * caché la mañana que alguien abre la app en el estacionamiento de una planta.
 */
const WIDGETS_DE_AUDITORIA = new Set(['mis_auditorias', 'proxima_visita'])

export default function ContenidoWidget({ widget }: { widget: Widget }) {
  if (widget.id === 'esperando_senal') return <EsperandoSenal />
  if (WIDGETS_DE_CARTERA.has(widget.id)) return <WidgetDeCartera widget={widget} />
  if (WIDGETS_DE_AUDITORIA.has(widget.id)) return <WidgetDeAuditorias widget={widget} />
  if (widget.id === 'hallazgos_abiertos') return <HallazgosAbiertos />
  if (widget.id === 'documentos_por_aprobar') return <DocumentosPorAprobar />

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

/**
 * «Documentos por aprobar»: lo que espera una firma [F02·B2].
 *
 * ⚠️ **El único widget con consulta propia**, y por eso lleva su justificación
 * encima: los cuatro de la cartera y los tres de auditorías comparten la lista
 * de su pantalla, pero `/sistemas` es por cliente —cinco de sus seis pestañas
 * cuelgan de un `?org=`— y aquí la pregunta cruza la cartera. `porAprobar()` es
 * esa consulta, y no la trae nadie más.
 *
 * ⚠️ Lo más viejo arriba: un procedimiento que lleva tres semanas esperando una
 * firma es el que hay que mirar hoy, no el que se mandó ayer.
 */
function DocumentosPorAprobar() {
  const { data: versiones = [], isPending, error } = useQuery({
    queryKey: queryKeys.sistemas.porAprobar(),
    queryFn: listarVersionesPorAprobar,
  })

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={12} radio={3} />)}
      </div>
    )
  }

  if (error) return <Nota>{mensajeDeError(error)}</Nota>

  if (versiones.length === 0) {
    return <Nota>No hay ninguna versión esperando revisión en el control documental.</Nota>
  }

  const visibles = versiones.slice(0, 4)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {visibles.map((version) => (
        <RenglonVersion key={version.id} version={version} />
      ))}
      {versiones.length > visibles.length && <Mas cuantos={versiones.length - visibles.length} />}
    </div>
  )
}

/** Una versión en revisión, con enlace a su expediente. */
function RenglonVersion({ version }: { version: VersionPorAprobar }) {
  return (
    <Link
      href={`/sistemas?tab=documentos&org=${version.org_id}&documento=${version.documento_id}`}
      style={{ display: 'flex', alignItems: 'baseline', gap: 8, textDecoration: 'none', color: 'inherit' }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {version.documento
            ? `${version.documento.codigo} · ${version.documento.titulo}`
            : 'Documento sin identificar'}
        </span>
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {version.organizacion ? nombreDeOrganizacion(version.organizacion) : 'Sin cliente'}
        </span>
      </span>
      <span className="mono" style={{ fontSize: 12, color: 'var(--texto-dim)', flexShrink: 0 }}>
        v{version.version}
      </span>
    </Link>
  )
}

/**
 * Los dos widgets de auditorías [F03].
 *
 * ⚠️ **Los dos leen LA MISMA consulta** —`queryKeys.auditorias.lista()`, la de
 * `/auditorias`— y cada uno calcula lo suyo en memoria, exactamente como los
 * cuatro de la cartera. Sin vista en la base y sin clave propia: es la regla que
 * sostiene toda la Fase 03 (`src/lib/auditorias/precarga.ts`).
 */
function WidgetDeAuditorias({ widget }: { widget: Widget }) {
  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  const { data: auditorias = [], isPending, error } = useQuery({
    queryKey: queryKeys.auditorias.lista(),
    queryFn: listarAuditorias,
  })

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={12} radio={3} />)}
      </div>
    )
  }

  if (error) return <Nota>{mensajeDeError(error)}</Nota>

  const usuarioId = usuario?.id ?? null
  if (widget.id === 'proxima_visita') {
    return <ProximaVisita auditoria={proximaVisita(auditorias, usuarioId)} />
  }
  return <MisAuditorias auditorias={misAuditorias(auditorias, usuarioId)} />
}

/**
 * «Mis auditorías»: lo que uno tiene por delante, y **cuáles ya están bajadas**.
 *
 * ⚠️ La marca de «lista sin señal» se pregunta a la CACHÉ en cada render
 * (`faltaPorPrecargar`), nunca a un `useState`. Es la misma regla que la pestaña
 * de recorrido: con un booleano del componente, el tablero diría «falta
 * descargar» sobre una auditoría perfectamente bajada —o al revés, y eso último
 * es lo que manda a alguien a un sótano con la pantalla vacía.
 */
function MisAuditorias({ auditorias }: { auditorias: AuditoriaEnLista[] }) {
  const cliente = useQueryClient()

  if (auditorias.length === 0) {
    return <Nota>No tienes auditorías abiertas. Se programan desde Auditorías, en el programa anual.</Nota>
  }

  const listas = auditorias.filter(
    (a) => faltaPorPrecargar(cliente, a.id, a.org_id).length === 0,
  ).length
  const visibles = auditorias.slice(0, 4)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{ fontSize: 11.5, color: 'var(--texto-dim)' }}>
        {listas === 0
          ? 'Ninguna está descargada todavía para trabajar sin señal.'
          : `${listas} de ${auditorias.length} listas para trabajar sin señal.`}
      </p>

      {visibles.map((auditoria) => (
        <RenglonAuditoria key={auditoria.id} auditoria={auditoria}>
          <span style={{ flexShrink: 0, textAlign: 'right' }}>
            <span className="mono" style={{ display: 'block', fontSize: 12, color: 'var(--texto-dim)' }}>
              {auditoria.fecha_inicio ? formatDateOnly(auditoria.fecha_inicio) : 'Sin fecha'}
            </span>
            <MarcaDeCampo auditoria={auditoria} />
          </span>
        </RenglonAuditoria>
      ))}

      {auditorias.length > visibles.length && <Mas cuantos={auditorias.length - visibles.length} />}
    </div>
  )
}

/**
 * «Próxima visita»: a dónde vas, cuándo y **qué te falta llevar**.
 *
 * Lo que hay que llevar preparado no es una lista de materiales: es la descarga.
 * Por eso el widget nombra las piezas que faltan en vez de decir «no está lista»
 * — quien lo lee está a punto de subirse al coche.
 */
function ProximaVisita({ auditoria }: { auditoria: AuditoriaEnLista | null }) {
  const cliente = useQueryClient()

  if (!auditoria) {
    return <Nota>No tienes ninguna auditoría por delante. Las que ya se cerraron siguen en Auditorías.</Nota>
  }

  const faltan = faltaPorPrecargar(cliente, auditoria.id, auditoria.org_id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <RenglonAuditoria auditoria={auditoria}>
        <span className="mono" style={{ fontSize: 12, color: 'var(--texto-dim)', flexShrink: 0 }}>
          {auditoria.estado === 'en_curso'
            ? 'En curso'
            : auditoria.fecha_inicio
              ? formatDateOnly(auditoria.fecha_inicio)
              : 'Sin fecha'}
        </span>
      </RenglonAuditoria>

      <Link
        href={`/auditorias/${auditoria.id}?tab=recorrido`}
        style={{
          fontSize: 11.5,
          lineHeight: 1.45,
          textDecoration: 'none',
          color: faltan.length === 0 ? 'var(--verde)' : 'var(--advertencia)',
        }}
      >
        {faltan.length === 0
          ? 'Descargada: puedes entrar a la planta sin señal.'
          : `Falta descargar: ${faltan.slice(0, 2).join(', ').toLowerCase()}${
              faltan.length > 2 ? ` y ${faltan.length - 2} más` : ''
            }.`}
      </Link>
    </div>
  )
}

/** Una auditoría en dos líneas, con enlace a su expediente. */
function RenglonAuditoria({
  auditoria,
  children,
}: {
  auditoria: AuditoriaEnLista
  children: React.ReactNode
}) {
  return (
    <Link
      href={`/auditorias/${auditoria.id}`}
      style={{ display: 'flex', alignItems: 'baseline', gap: 8, textDecoration: 'none', color: 'inherit' }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {auditoria.organizacion ? nombreDeOrganizacion(auditoria.organizacion) : 'Sin cliente'}
        </span>
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {folioVisible(auditoria)} · {etiquetaDe(ESTADOS_AUDITORIA, auditoria.estado)}
        </span>
      </span>
      {children}
    </Link>
  )
}

/** Si esa auditoría se puede trabajar hoy sin señal. Se lee de la caché. */
function MarcaDeCampo({ auditoria }: { auditoria: AuditoriaEnLista }) {
  const cliente = useQueryClient()
  const lista = faltaPorPrecargar(cliente, auditoria.id, auditoria.org_id).length === 0

  return (
    <span
      style={{
        display: 'block',
        fontSize: 11,
        color: lista ? 'var(--verde)' : 'var(--texto-dim)',
      }}
    >
      {lista ? 'Sin señal' : 'Sin bajar'}
    </span>
  )
}

/**
 * «Hallazgos abiertos»: la deuda de la firma, repartida por antigüedad.
 *
 * ⚠️ Misma consulta que el tablero del lunes —`hallazgosDeLaCartera()`— y **sin
 * la vista `hallazgos_abiertos`** que apunta el modelo de datos: una vista es
 * otra clave que puede faltar en la caché (docs/04 · F03·B4). La antigüedad se
 * calcula en memoria con `diasAbierto`.
 *
 * ⚠️ Los cuatro tramos se pintan **siempre, incluidos los vacíos**: lo que dice
 * «no hay nada de más de 180 días» es justamente el hueco.
 */
function HallazgosAbiertos() {
  const { data: hallazgos = [], isPending, error } = useQuery({
    queryKey: queryKeys.auditorias.hallazgosDeLaCartera(),
    queryFn: listarHallazgosDeLaCartera,
  })

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={12} radio={3} />)}
      </div>
    )
  }

  if (error) return <Nota>{mensajeDeError(error)}</Nota>

  const abiertos = hallazgosAbiertos(hallazgos)
  if (abiertos.length === 0) {
    return (
      <Nota>
        {hallazgos.length === 0
          ? 'Todavía no se ha levantado ningún hallazgo.'
          : 'No queda ningún hallazgo abierto en la cartera.'}
      </Nota>
    )
  }

  const tramos = hallazgosPorAntiguedad(hallazgos)
  const mayor = Math.max(...tramos.map((t) => t.total))
  const vencidos = hallazgosVencidos(hallazgos).length

  return (
    <Link
      href="/auditorias?tab=hallazgos"
      style={{ display: 'flex', flexDirection: 'column', gap: 5, textDecoration: 'none', color: 'inherit' }}
    >
      {tramos.map((tramo) => (
        <span key={tramo.etiqueta} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--texto-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tramo.etiqueta}
          </span>
          <Barra valor={tramo.total} maximo={mayor} />
          <span
            className="mono"
            style={{
              fontSize: 12.5, width: 18, textAlign: 'right',
              color: tramo.total === 0 ? 'var(--texto-dim)' : 'var(--texto)',
            }}
          >
            {tramo.total}
          </span>
        </span>
      ))}

      <span style={{ fontSize: 11.5, color: vencidos > 0 ? 'var(--error)' : 'var(--texto-dim)', marginTop: 2 }}>
        {vencidos > 0
          ? `${vencidos} con la fecha de compromiso vencida.`
          : `${abiertos.length} abiertos, ninguno vencido.`}
      </span>
    </Link>
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
 * El primer widget con datos de verdad, desde la Fase 00: la cola de salida.
 *
 * Es la ventana del auditor a lo que lleva en el bolsillo sin subir. Con la Fase
 * 03 entregada, aquí es donde salen los treinta hallazgos esperando el
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
