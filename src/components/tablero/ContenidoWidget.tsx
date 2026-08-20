'use client'

import type { Widget } from '@/lib/tablero/widgets'
import { useEnLinea, useOperacionesCola } from '@/lib/offline/estado'

/**
 * El cuerpo de cada widget.
 *
 * Casi todos dicen todavía "sin datos" y **cuándo** van a tener: una tarjeta
 * vacía sin explicación se lee como una app rota, y esta pantalla es lo primero
 * que ve la firma cada mañana durante los próximos meses
 * (docs/05_SISTEMA_DE_DISENO.md §4.5).
 */
export default function ContenidoWidget({ widget }: { widget: Widget }) {
  if (widget.id === 'esperando_senal') return <EsperandoSenal />

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--texto-dim)', lineHeight: 1.5 }}>
        {widget.descripcion}
      </p>
      <p style={{ marginTop: 10, fontSize: 12, color: 'var(--texto-dim)' }}>
        Sin datos todavía · llega en la{' '}
        <span className="mono">Fase {String(widget.fase).padStart(2, '0')}</span>
      </p>
    </div>
  )
}

/**
 * El único widget con datos de verdad en la Fase 00: la cola de salida.
 *
 * Es la ventana del auditor a lo que lleva en el bolsillo sin subir. Cuando la
 * Fase 03 llegue, aquí va a haber treinta hallazgos esperando el
 * estacionamiento.
 */
function EsperandoSenal() {
  const enLinea = useEnLinea()
  const operaciones = useOperacionesCola()

  if (operaciones.length === 0) {
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
          {enLinea
            ? 'Todo lo que has hecho ya está guardado en el servidor.'
            : 'Sin conexión, y no hay nada esperando. Puedes seguir trabajando.'}
        </p>
      </div>
    )
  }

  const visibles = operaciones.slice(0, 4)

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--texto-dim)', marginBottom: 8 }}>
        {enLinea
          ? 'Saliendo en orden. No hace falta hacer nada.'
          : 'Guardado en este teléfono. Sube solo al volver la señal.'}
      </p>

      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {visibles.map((operacion) => (
          <li
            key={operacion.id}
            style={{
              fontSize: 12.5,
              padding: '6px 8px',
              background: 'var(--superficie-2)',
              borderRadius: 5,
              borderLeft: `2px solid ${
                operacion.estado === 'fallido' ? 'var(--error)' : 'var(--borde-fuerte)'
              }`,
            }}
          >
            {operacion.etiqueta}
            {operacion.estado === 'fallido' && (
              <span style={{ color: 'var(--error)' }}> · no se pudo guardar</span>
            )}
          </li>
        ))}
      </ul>

      {operaciones.length > visibles.length && (
        <p style={{ marginTop: 6, fontSize: 12, color: 'var(--texto-dim)' }}>
          y {operaciones.length - visibles.length} más
        </p>
      )}
    </div>
  )
}
