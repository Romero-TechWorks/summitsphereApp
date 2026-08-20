'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { reintentarFallidos } from '@/lib/offline/cola'
import { useEnLinea, useOperacionesCola, useResumenCola } from '@/lib/offline/estado'
import { sincronizar } from '@/lib/offline/sync'

/**
 * El indicador de conexión del header (el `ConnectionStatus` de F00·B4).
 *
 * ⚠️ **Cuando todo está en línea y no queda nada por subir, no se pinta.** Un
 * indicador verde permanente se vuelve parte del fondo en dos días, y entonces
 * ya no avisa de nada el día que se pone ámbar. Aquí la ausencia es el estado
 * bueno: si aparece algo, es porque hay algo que saber.
 *
 * Y late sólo mientras hay cambios saliendo — el criterio de cierre de la Fase
 * 00 dice, literalmente, que al volver la señal *deja de latir*.
 */
export default function EstadoConexion({ compacto = false }: { compacto?: boolean }) {
  const cliente = useQueryClient()
  const enLinea = useEnLinea()
  const { pendientes, fallidos } = useResumenCola()
  const operaciones = useOperacionesCola()

  const [abierto, setAbierto] = useState(false)
  const [trabajando, setTrabajando] = useState(false)

  if (enLinea && pendientes === 0 && fallidos === 0) return null

  const { color, texto } = describir(enLinea, pendientes, fallidos)

  async function reintentar() {
    setTrabajando(true)
    try {
      if (fallidos > 0) await reintentarFallidos()
      await sincronizar(cliente)
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`${texto}. Ver los cambios pendientes.`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: compacto ? '6px 8px' : '6px 10px',
          background: 'rgba(232, 238, 245, 0.10)',
          border: '1px solid rgba(232, 238, 245, 0.16)',
          borderRadius: 999,
          color: 'var(--nav-texto)',
          fontSize: 12.5,
          fontFamily: 'var(--fuente-texto), sans-serif',
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            // El latido sólo mientras algo está saliendo.
            animation: enLinea && pendientes > 0 ? 'latido-punto 1.2s ease-in-out infinite' : undefined,
          }}
        />
        {compacto ? (
          pendientes + fallidos > 0 && <span className="mono">{pendientes + fallidos}</span>
        ) : (
          <span>{texto}</span>
        )}
      </button>

      {abierto && (
        <>
          {/* Cierra al tocar fuera. Va antes del panel para quedar por debajo. */}
          <div
            onClick={() => setAbierto(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 59 }}
          />

          <div
            role="dialog"
            aria-label="Cambios pendientes de subir"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              zIndex: 60,
              width: 290,
              maxWidth: 'calc(100vw - 24px)',
              // ⚠️ `--vh-full`, nunca `vh` en crudo: con el armazón fijo, la
              // barra del navegador no se pliega y `50vh` mide de más.
              maxHeight: 'calc(var(--vh-full) * 0.6)',
              overflowY: 'auto',
              background: 'var(--superficie)',
              border: '1px solid var(--borde)',
              borderRadius: 8,
              boxShadow: '0 10px 30px rgba(13, 31, 53, 0.18)',
              padding: 12,
              color: 'var(--texto)',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
              {enLinea ? 'Esperando para subir' : 'Trabajando sin conexión'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--texto-dim)', marginBottom: 10 }}>
              {enLinea
                ? 'Nada se pierde: sale solo, en el mismo orden en que lo hiciste.'
                : 'Puedes seguir trabajando. Todo se guarda en el teléfono y sube al volver la señal.'}
            </p>

            {operaciones.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--texto-dim)' }}>No hay nada pendiente.</p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {operaciones.map((operacion) => (
                  <li
                    key={operacion.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '7px 9px',
                      background: 'var(--superficie-2)',
                      borderRadius: 6,
                      borderLeft: `2px solid ${
                        operacion.estado === 'fallido' ? 'var(--error)' : 'var(--borde-fuerte)'
                      }`,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      {/* La etiqueta en español: es el motivo por el que la cola
                          guarda una y no un UUID. */}
                      <p style={{ fontSize: 12.5 }}>{operacion.etiqueta}</p>
                      {operacion.estado === 'fallido' && operacion.motivo && (
                        <p style={{ fontSize: 11.5, color: 'var(--error)', marginTop: 2 }}>
                          {operacion.motivo}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {enLinea && operaciones.length > 0 && (
              <button
                type="button"
                onClick={reintentar}
                disabled={trabajando}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--superficie)',
                  border: '1px solid var(--borde-fuerte)',
                  borderRadius: 6,
                  color: 'var(--texto)',
                  fontSize: 13,
                  fontFamily: 'var(--fuente-texto), sans-serif',
                  cursor: trabajando ? 'wait' : 'pointer',
                }}
              >
                {trabajando ? 'Subiendo…' : 'Intentar ahora'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function describir(enLinea: boolean, pendientes: number, fallidos: number) {
  if (!enLinea) {
    return {
      color: 'var(--nav-alerta)',
      texto: pendientes > 0 ? `Sin conexión · ${pendientes} por subir` : 'Sin conexión',
    }
  }
  if (fallidos > 0) {
    return {
      color: 'var(--nav-error)',
      texto: `${fallidos} sin guardar`,
    }
  }
  return {
    color: 'var(--nav-activo)',
    texto: `${pendientes} por subir`,
  }
}
