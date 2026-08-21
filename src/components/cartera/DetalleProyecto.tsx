'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly } from '@/lib/utils/dates'
import type { MiembroEquipo, Sitio } from '@/lib/queries/cartera'
import {
  actualizarProyecto,
  type DatosProyecto,
  type Lider,
  type ProyectoConLider,
} from '@/lib/queries/proyectos'
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
import Modal from '@/components/ui/Modal'
import PanelAlcance from './PanelAlcance'
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
  volverHref,
}: {
  proyecto: ProyectoConLider
  sitios: Sitio[]
  equipo: MiembroEquipo[]
  puedoEditar: boolean
  /** A dónde vuelve la lista. */
  volverHref: string
}) {
  const cliente = useQueryClient()
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      <div style={{ paddingTop: 22 }}>
        <PanelAlcance proyecto={proyecto} sitios={sitios} puedoEditar={puedoEditar} />
      </div>

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
