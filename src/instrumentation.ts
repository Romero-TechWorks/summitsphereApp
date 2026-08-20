/**
 * Punto de entrada de instrumentación de Next.
 *
 * `register()` corre una vez por proceso de servidor. Cada runtime carga su
 * propia configuración: el import es dinámico porque el bundle de Edge no puede
 * arrastrar el SDK de Node.
 */

import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

// Sin esto, los errores lanzados dentro de un Server Component nunca llegan a
// Sentry: Next los captura y los convierte en la página de error antes de que
// ningún try/catch nuestro los vea.
export const onRequestError = Sentry.captureRequestError
