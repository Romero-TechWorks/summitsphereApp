import withPWAInit from '@ducanh2912/next-pwa'
import { withSentryConfig } from '@sentry/nextjs'

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',

  // Cachea cada pantalla al navegar a ella, y también las que Next precarga al
  // ver un link en pantalla. Es lo que permite abrir una auditoría sin señal si
  // ya se pasó por ahí —o si el link estuvo a la vista— estando en línea.
  //
  // ⚠️ El nombre lleva doble 'g': `aggressive`. En JDM Built estuvo escrito
  // `aggresive` y el plugin lo ignoró en silencio durante meses: la precarga
  // nunca estuvo encendida y nadie se enteró hasta la primera prueba de campo.
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,

  // ⚠️ CRÍTICO: sin esta línea, el `runtimeCaching` de abajo **reemplaza** la
  // lista por defecto del plugin en vez de sumarse a ella. Y esa lista por
  // defecto es justo la que cachea los documentos HTML, las peticiones RSC del
  // App Router, las fuentes y los assets. Sin ella, la app sin señal sólo abre
  // lo que ya esté en memoria y cualquier otra pantalla cae en la página de
  // "sin conexión" del navegador.
  //
  // Para esta app eso no es una molestia: es un auditor a media planta con
  // treinta hallazgos levantados y ninguna pantalla que abrir.
  extendDefaultRuntimeCaching: true,

  // La pantalla que se sirve cuando una navegación no está ni en la red ni en
  // la caché: `src/app/~offline/page.tsx`. El plugin la precachea al instalar
  // el worker.
  //
  // ⚠️ Sin esto, esa navegación cae en la pantalla de error del navegador. La
  // caché de arriba sólo tiene lo que el usuario ya visitó o lo que Next
  // precargó al ver un link; la primera vez que alguien toca un destino nuevo
  // sin señal, no hay nada que servir. Lo que ve entonces no dice el nombre de
  // la app ni menciona que su trabajo sigue guardado, y en campo eso se lee
  // como que la app lo perdió.
  //
  // ⚠️ `/~offline` está excluida del matcher de `src/proxy.ts`. Los dos cambios
  // van juntos SIEMPRE: si el guard la redirigiera a `/login`, el worker
  // precachearía la redirección en vez de la pantalla.
  fallbacks: { document: '/~offline' },

  // Worker propio: el plugin compila `worker/index.js` aparte y lo importa desde
  // el `sw.js` generado. Es la única forma de añadir los oyentes `push` y
  // `notificationclick` sin editar código de Workbox, que se sobreescribe en
  // cada build.
  customWorkerSrc: 'worker',

  workboxOptions: {
    runtimeCaching: [
      {
        // Portal del cliente [Fase 06]: **nunca desde la caché**.
        //
        // El service worker se registra en cualquier página de este origen, así
        // que también en el navegador del cliente que abre su liga. Sin esta
        // regla, la caché por defecto de documentos HTML le serviría el avance
        // de la última vez: vería hallazgos abiertos que ya se cerraron y
        // llamaría a la firma por algo resuelto hace una semana.
        //
        // Un portal sin señal es preferible a un portal que miente.
        //
        // Va ANTES que las reglas por defecto a propósito: la primera que casa
        // es la que gana.
        urlPattern: /\/portal\/.*/i,
        handler: 'NetworkOnly',
      },
      {
        // Lecturas de Supabase: red primero, caché HTTP como red de seguridad.
        // La caché con la que se trabaja de verdad sin señal es la de React
        // Query en IndexedDB [F00·B4]; ésta es sólo la capa HTTP.
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-cache',
          expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
          // Sin esto, una consulta sin señal espera el timeout completo del
          // navegador antes de rendirse y servir lo cacheado. En campo son
          // treinta segundos mirando una pantalla en blanco.
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Los adjuntos de hallazgo son fotos de celular: se sirven desde Storage de
  // Supabase y pasan por el optimizador de Next.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/**' },
    ],
  },
}

// Sentry va POR FUERA de la PWA. El orden importa: `withPWA` produce la config
// con el service worker, y `withSentryConfig` la envuelve para añadir el plugin
// que sube los source maps. Al revés, Sentry no vería la config final.
//
// ⚠️ Esta integración está hecha A MANO. NO correr `npx @sentry/wizard`:
// reescribe este archivo y se lleva por delante el fork `@ducanh2912/next-pwa`,
// el `customWorkerSrc` del push y el `extendDefaultRuntimeCaching` del offline.
export default withSentryConfig(withPWA(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Sin SENTRY_AUTH_TOKEN el build no falla: sólo se queda sin source maps y los
  // errores llegan minificados. Es lo correcto — que un token ausente no impida
  // desplegar un arreglo urgente desde otra máquina.
  silent: true,

  // Los source maps se suben a Sentry y se BORRAN del bundle. Si se quedaran,
  // cualquiera podría leer el código de la app desde el navegador.
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // Los reportes salen por una ruta propia en vez de ir directo al dominio de
  // Sentry, que los bloqueadores de anuncios reconocen y cortan.
  //
  // ⚠️ `/monitoring` está excluida del matcher de `src/proxy.ts`. Si no, el
  // guard de sesión la redirigiría a /login y el túnel no serviría de nada.
  // Los dos cambios van juntos SIEMPRE.
  //
  // Contrapartida asumida: la ruta queda sin autenticar, así que es un relevo
  // abierto hacia *este* proyecto de Sentry. El daño posible es ruido en el
  // panel, no acceso a datos de ningún cliente.
  tunnelRoute: '/monitoring',

  // Quita el código de logging del SDK del bundle de producción.
  // (Sustituye a `disableLogger`, deprecado en el SDK de Sentry 10.)
  webpack: {
    treeshake: { removeDebugLogging: true },
  },
})
