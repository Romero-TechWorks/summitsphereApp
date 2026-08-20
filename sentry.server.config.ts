/**
 * Sentry — proceso de servidor.
 *
 * Lo carga `src/instrumentation.ts` cuando `NEXT_RUNTIME === 'nodejs'`.
 *
 * ⚠️ Integración a mano, sin `npx @sentry/wizard`: el asistente reescribe
 * `next.config.mjs`, y ahí vive el fork `@ducanh2912/next-pwa` con `--webpack`.
 * Dejarlo pasar rompe la PWA entera.
 */

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  // Sin DSN no se inicializa nada. Es lo que mantiene silencioso el desarrollo
  // local y lo que evita que un despliegue sin configurar reviente al arrancar.
  enabled: Boolean(dsn),

  // Una firma de consultoría no genera volumen de errores: se muestrea todo.
  // Si algún día esto crece, bajar aquí antes que perder errores.
  tracesSampleRate: 1,

  // ⚠️ `false` a propósito y con más razón que en JDM Built. Aquí los datos que
  // pasan por el servidor son de los CLIENTES de la firma: razones sociales,
  // RFC, hallazgos de auditoría, nombres en constancias. Nada de eso viaja a un
  // tercero por omisión. La identidad del usuario del equipo se manda aparte y
  // a propósito, desde el componente que la conoce.
  sendDefaultPii: false,

  debug: false,
})
