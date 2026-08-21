'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Widget } from '@/lib/tablero/widgets'
import { reintentarFallidos } from '@/lib/offline/cola'
import { useEnLinea, useOperacionesCola } from '@/lib/offline/estado'
import { sincronizar } from '@/lib/offline/sync'

/**
 * El cuerpo de cada widget.
 *
 * Casi todos dicen todavía "sin datos" y **cuándo** van a tener: un bloque
 * vacío sin explicación se lee como una app rota, y esta pantalla es lo primero
 * que ve la firma cada mañana durante los próximos meses
 * (docs/05_SISTEMA_DE_DISENO.md §4.5).
 */
export default function ContenidoWidget({ widget }: { widget: Widget }) {
  if (widget.id === 'esperando_senal') return <EsperandoSenal />

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
