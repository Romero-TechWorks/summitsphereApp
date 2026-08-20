/**
 * Sentry — navegador.
 *
 * Next carga este archivo automáticamente por su nombre; no se importa desde
 * ningún layout.
 */

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 1,
  sendDefaultPii: false,
  debug: false,

  /**
   * Sin sesión de repetición (Session Replay), y es una decisión, no un olvido:
   * graba el DOM de la pantalla. En esta app eso significa grabar hallazgos de
   * auditoría de clientes reales, razones sociales, RFC y datos de contacto —
   * y mandarlos a un tercero. La LFPDPPP no lo prohíbe, pero convertiría cada
   * sesión de trabajo en una transferencia de datos personales que nadie
   * consintió. Ver docs/08_SEGURIDAD_Y_RLS.md §7.
   */

  /**
   * `beforeSend` filtra el ruido que no es un fallo de la app. Sin esto, cada
   * foto tomada en una planta sin señal manda un error de red y el panel de
   * Sentry se vuelve inservible en una semana.
   */
  beforeSend(event, hint) {
    const error = hint.originalException
    const mensaje = error instanceof Error ? error.message : String(error ?? '')

    // Fallos de red: la capa offline los maneja encolando la escritura. Que no
    // haya señal en una nave industrial no es un error del software — es el
    // caso de uso.
    if (/Failed to fetch|NetworkError|Load failed|ERR_INTERNET_DISCONNECTED/i.test(mensaje)) {
      return null
    }

    // Extensiones del navegador inyectando código en la página.
    if (/chrome-extension:|moz-extension:|safari-extension:/i.test(mensaje)) {
      return null
    }

    return event
  },

  // El service worker se actualiza solo (`skipWaiting`). Cuando lo hace, un
  // chunk viejo deja de existir y el navegador reporta un error de carga que
  // no es un fallo: es la app actualizándose.
  ignoreErrors: [
    'ChunkLoadError',
    'Loading chunk',
    'Loading CSS chunk',
  ],
})

// Sin esto, las transiciones de navegación del App Router no se instrumentan.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
