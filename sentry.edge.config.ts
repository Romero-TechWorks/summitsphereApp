/**
 * Sentry — runtime Edge.
 *
 * Lo carga `src/instrumentation.ts` cuando `NEXT_RUNTIME === 'edge'`. Aquí cae
 * `src/proxy.ts`, que es el guard de sesión: si falla, la app entera es
 * inaccesible. Es justo lo que hay que vigilar.
 */

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 1,
  sendDefaultPii: false,
  debug: false,
})
