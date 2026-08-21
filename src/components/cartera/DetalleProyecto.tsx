'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly } from '@/lib/utils/dates'
import type { MiembroEquipo, Sitio } from '@/lib/queries/cartera'
import {
  actualizarProyecto,
  eliminarProyecto,
  type DatosProyecto,
  type Lider,
  type ProyectoConLider,
} from '@/lib/queries/proyectos'
import { listarTareas } from '@/lib/queries/tareas'
import {
  ESTADOS_PROYECTO,
  ETAPAS_PROYECTO,
  TIPOS_PROYECTO,
  etiquetaDe,
  numeroDeEtapa,
  tonoDe,
} from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmarBorrado from '@/components/ui/ConfirmarBorrado'
import Modal from '@/components/ui/Modal'
import PanelAlcance from './PanelAlcance'
import PanelBitacora from './PanelBitacora'
import PanelTareas from './PanelTareas'
import FormularioProyecto from './FormularioProyecto'

const FORM_PROYECTO = 'form-editar-proyecto'

/**
 * Un proyecto abierto dentro del expediente de su cliente.
 *
 * ⚠️ **No tiene ruta propia**: se abre con `?proyecto=<id>` sobre la pestaña de
 * proyectos. Los dominios son páginas con pestañas y la única ruta de detalle de
 * la cartera es la organización (docs/03_ARQUITECTURA.md §2.1). Aun así la URL
 * es compartible y el botón de atrás devuelve a la lista, que es lo que la gente
 * espera.
 */
export default function DetalleProyecto({
  proyecto,
  sitios,
  equipo,
  puedoEditar,
  esSocio,
  volverHref,
}: {
  proyecto: ProyectoConLider
  sitios: Sitio[]
  equipo: MiembroEquipo[]
  puedoEditar: boolean
  /** Sólo un socio puede borrar un proyecto. Lo impone la base, no esta prop. */
  esSocio: boolean
  /** A dónde vuelve la lista. */
  volverHref: string
}) {
  const cliente = useQueryClient()
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  // Las tres secciones del proyecto, y sólo las tareas abiertas: son lo de
  // todos los días. En un teléfono, tres secciones desplegadas obligan a
  // scrollear media pantalla para llegar a lo que se venía a hacer.
  const [secciones, setSecciones] = useState<Set<string>>(new Set(['tareas']))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Misma clave que usa `PanelTareas`: React Query la comparte, así que esto no
  // es una segunda petición. Sirve para decir qué se lleva por delante el
  // borrado, con número.
  const { data: tareas = [] } = useQuery({
    queryKey: queryKeys.cartera.tareas(proyecto.id),
    queryFn: () => listarTareas(proyecto.id),
  })

  async function guardar(datos: DatosProyecto, lider: Lider | null) {
    setGuardando(true)
    setError(null)

    try {
      const { fila, encolado } = await actualizarProyecto(proyecto, datos, lider)

      aplicarEscritura<ProyectoConLider>({
        cliente,
        clave: queryKeys.cartera.proyectosDe(proyecto.org_id),
        encolado,
        actualizar: (previo) => previo.map((p) => (p.id === fila.id ? fila : p)),
        ademasInvalidar: [queryKeys.cartera.proyectos()],
      })

      setEditando(false)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  /**
   * Mover el proyecto a la etapa siguiente.
   *
   * ⚠️ Lo dispara una persona desde el aviso de «todas las tareas están
   * cerradas», nunca la app sola. El renglón de la bitácora lo escribe el
   * trigger de la base con quién y cuándo.
   */
  async function avanzarEtapa(etapa: string) {
    await guardar(
      {
        nombre: proyecto.nombre,
        tipo: proyecto.tipo,
        etapa,
        estado: proyecto.estado,
        lider_id: proyecto.lider_id,
        fecha_inicio: proyecto.fecha_inicio,
        fecha_fin_estimada: proyecto.fecha_fin_estimada,
        fecha_fin_real: proyecto.fecha_fin_real,
        monto: proyecto.monto,
        moneda: proyecto.moneda,
        objetivo: proyecto.objetivo,
      },
      proyecto.lider,
    )
  }

  async function borrar() {
    setGuardando(true)
    setError(null)

    try {
      const { encolado } = await eliminarProyecto(proyecto)

      aplicarEscritura<ProyectoConLider>({
        cliente,
        clave: queryKeys.cartera.proyectosDe(proyecto.org_id),
        encolado,
        actualizar: (previo) => previo.filter((p) => p.id !== proyecto.id),
        ademasInvalidar: [queryKeys.cartera.proyectos()],
      })

      // La pantalla que se está mirando ya no existe: se vuelve a la lista.
      router.push(volverHref)
    } catch (problema) {
      setError(mensajeDeError(problema))
      setBorrando(false)
    } finally {
      setGuardando(false)
    }
  }

  const etapa = numeroDeEtapa(proyecto.etapa)

  return (
    <div>
      <Link
        href={volverHref}
        style={{ display: 'inline-block', marginBottom: 12, fontSize: 13, color: 'var(--texto-dim)', textDecoration: 'none' }}
      >
        ← Proyectos
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 20, fontWeight: 600 }}>{proyecto.nombre}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <Badge tono={tonoDe(ESTADOS_PROYECTO, proyecto.estado)}>
              {etiquetaDe(ESTADOS_PROYECTO, proyecto.estado)}
            </Badge>
            <span style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
              {etiquetaDe(TIPOS_PROYECTO, proyecto.tipo)}
            </span>
          </div>
        </div>

        {puedoEditar && (
          <Button onClick={() => { setError(null); setEditando(true) }}>Editar</Button>
        )}
      </div>

      {error && <div style={{ marginTop: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      <Etapas actual={etapa} nombre={etiquetaDe(ETAPAS_PROYECTO, proyecto.etapa)} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '18px 24px',
          padding: '18px 0',
          borderBottom: '2px solid rgba(61, 186, 78, .16)',
        }}
      >
        <Dato etiqueta="Consultor líder" valor={proyecto.lider?.nombre ?? 'Sin asignar'} />
        <Dato etiqueta="Inicio" valor={formatDateOnly(proyecto.fecha_inicio)} mono />
        <Dato
          etiqueta={proyecto.fecha_fin_real ? 'Cierre real' : 'Fin estimado'}
          valor={formatDateOnly(proyecto.fecha_fin_real ?? proyecto.fecha_fin_estimada)}
          mono
        />
        <Dato etiqueta="Monto" valor={importe(proyecto.monto, proyecto.moneda)} mono />
      </div>

      {proyecto.objetivo && (
        <div style={{ padding: '18px 0', borderBottom: '2px solid rgba(61, 186, 78, .16)' }}>
          <Etiqueta>Objetivo</Etiqueta>
          <p style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{proyecto.objetivo}</p>
        </div>
      )}

      <Seccion
        clave="tareas"
        titulo="Tareas por etapa"
        abiertas={secciones}
        alAlternar={setSecciones}
      >
        <PanelTareas
          proyecto={proyecto}
          equipo={equipo}
          puedoEditar={puedoEditar}
          esSocio={esSocio}
          alAvanzarEtapa={avanzarEtapa}
        />
      </Seccion>

      <Seccion clave="bitacora" titulo="Bitácora" abiertas={secciones} alAlternar={setSecciones}>
        <PanelBitacora proyecto={proyecto} puedoEditar={puedoEditar} esSocio={esSocio} />
      </Seccion>

      <Seccion clave="alcance" titulo="Alcance" abiertas={secciones} alAlternar={setSecciones}>
        <PanelAlcance proyecto={proyecto} sitios={sitios} puedoEditar={puedoEditar} />
      </Seccion>

      {/* ⚠️ El borrado va al fondo, separado y con su texto — nunca un icono
          suelto arriba (docs/05 §4.4). En esta app casi nada se elimina; cuando
          aparece un botón así es porque se lleva un expediente entero. */}
      {esSocio && (
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--borde)' }}>
          <Button variante="peligro" onClick={() => { setError(null); setBorrando(true) }}>
            Eliminar este proyecto
          </Button>
        </div>
      )}

      <ConfirmarBorrado
        abierto={borrando}
        alCerrar={() => setBorrando(false)}
        titulo="Eliminar el proyecto"
        nombre={proyecto.nombre}
        queSeLleva={[
          `${tareas.length} ${tareas.length === 1 ? 'tarea' : 'tareas'} de la metodología`,
          'su alcance de normas y sitios',
          'su bitácora, incluidos los cambios de etapa',
        ]}
        error={error}
        trabajando={guardando}
        alConfirmar={borrar}
      />

      <Modal
        abierto={editando}
        alCerrar={() => setEditando(false)}
        titulo="Editar el proyecto"
        pie={
          <>
            <Button variante="fantasma" onClick={() => setEditando(false)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_PROYECTO} cargando={guardando}>
              Guardar
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 14 }}><Aviso tono="error">{error}</Aviso></div>}
        <FormularioProyecto
          key={proyecto.id}
          id={FORM_PROYECTO}
          inicial={proyecto}
          equipo={equipo}
          alEnviar={guardar}
        />
      </Modal>
    </div>
  )
}

/**
 * Las seis etapas de la metodología.
 *
 * En el teléfono no caben seis rótulos, así que se pintan seis tramos y **el
 * nombre de la etapa actual en texto**: el color solo no puede ser la única
 * señal (WCAG 1.4.1), y de paso es lo que el consultor lee de un vistazo.
 */
function Etapas({ actual, nombre }: { actual: number; nombre: string }) {
  return (
    <div style={{ padding: '18px 0' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {ETAPAS_PROYECTO.map((etapa, i) => (
          <div
            key={etapa.valor}
            title={etapa.etiqueta}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background:
                i < actual
                  ? 'linear-gradient(90deg, var(--verde-hondo), var(--verde))'
                  : 'rgba(61, 186, 78, .16)',
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
        Etapa <span className="mono">{actual || '—'}</span> de{' '}
        <span className="mono">{ETAPAS_PROYECTO.length}</span> · {nombre}
      </p>
    </div>
  )
}

/**
 * Una sección desplegable del proyecto.
 *
 * ⚠️ Sin marco, como todo: lo que la delimita es su hairline verde, que se
 * enciende cuando está abierta. El estado vive en el detalle y no aquí dentro
 * para que abrir una no cierre las otras.
 */
function Seccion({
  clave,
  titulo,
  abiertas,
  alAlternar,
  children,
}: {
  clave: string
  titulo: string
  abiertas: Set<string>
  alAlternar: (siguiente: Set<string>) => void
  children: React.ReactNode
}) {
  const abierta = abiertas.has(clave)

  return (
    <div style={{ marginTop: 22 }}>
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => {
          const copia = new Set(abiertas)
          if (copia.has(clave)) copia.delete(clave)
          else copia.add(clave)
          alAlternar(copia)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          width: '100%',
          padding: '4px 2px 10px',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          color: 'inherit',
          font: 'inherit',
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            color: 'var(--texto-dim)',
          }}
        >
          {titulo}
        </span>
        <span aria-hidden style={{ fontSize: 12.5, color: 'var(--texto-dim)' }}>
          {abierta ? 'Ocultar' : 'Ver'}
        </span>
      </button>

      <div
        aria-hidden
        style={{
          height: 2,
          borderRadius: 2,
          marginBottom: abierta ? 14 : 0,
          background: abierta
            ? 'linear-gradient(90deg, var(--verde-hondo), var(--verde) 55%, rgba(61,186,78,0))'
            : 'rgba(61, 186, 78, .16)',
        }}
      />

      {abierta && children}
    </div>
  )
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '.04em', color: 'var(--texto-dim)', marginBottom: 4 }}>
      {children}
    </div>
  )
}

function Dato({ etiqueta, valor, mono }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div>
      <Etiqueta>{etiqueta}</Etiqueta>
      <div className={mono ? 'mono' : undefined} style={{ fontSize: 15 }}>{valor}</div>
    </div>
  )
}

/** El monto, en la moneda del contrato. Sin importe, una raya — no un `$0.00`. */
function importe(monto: number | null, moneda: string): string {
  if (monto == null) return '—'

  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 2,
    }).format(monto)
  } catch {
    // Una moneda que `Intl` no conozca no puede tumbar la pantalla del
    // proyecto: se enseña el número con su código al lado.
    return `${monto.toFixed(2)} ${moneda}`
  }
}
