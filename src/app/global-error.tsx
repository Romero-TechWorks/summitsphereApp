'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * El último recurso: se enseña cuando el error ocurrió tan arriba que ni el
 * layout raíz sobrevivió. Por eso trae sus propias etiquetas `<html>` y
 * `<body>` — no hay layout que las ponga.
 *
 * ⚠️ Sin el `captureException` de aquí, los fallos más graves de la app —los que
 * dejan la pantalla en blanco— son justo los que nunca llegan a Sentry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f8fc', color: '#0d1f35' }}>
        <div style={{ maxWidth: 460, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, marginBottom: 10 }}>Algo se rompió</h1>
          <p style={{ fontSize: 15, color: '#4a6080', marginBottom: 6 }}>
            El fallo ya quedó reportado. Si estabas capturando algo sin señal,
            no se perdió: sigue en la cola de este dispositivo.
          </p>
          {error.digest && (
            // El digest es lo que permite encontrar ESTE fallo entre los del
            // día. Sin él, "se rompió" no es un reporte accionable.
            <p style={{ fontSize: 12, color: '#4a6080', fontFamily: 'ui-monospace, monospace', marginBottom: 22 }}>
              Referencia: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '10px 18px',
              fontSize: 14,
              background: '#3dba4e',
              color: '#0d1f35',
              border: '1px solid #2d9a3c',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
