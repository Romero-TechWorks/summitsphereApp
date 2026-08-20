/**
 * Código propio del service worker.
 *
 * `@ducanh2912/next-pwa` compila este archivo aparte y lo importa desde el
 * `sw.js` que genera. Es la única forma de añadir oyentes sin editar código de
 * Workbox, que se sobreescribe en cada build.
 *
 * ⚠️ Aquí van los oyentes `push` y `notificationclick` en la **Fase 04**, cuando
 * existan las acciones correctivas y haya algo que avisar. Hoy el archivo está
 * vacío a propósito: existe porque `customWorkerSrc: 'worker'` en
 * `next.config.mjs` lo espera, y porque el día que se agregue el push conviene
 * que el andamio ya esté montado y probado.
 *
 * ⚠️ Este archivo NO es `public/sw.js`. Ése lo genera el build y no se edita:
 * cualquier cambio se pierde en la siguiente compilación. Ver `worker/README.md`.
 */

// Sin oyentes todavía. Ver Fase 04 en docs/02_PLAN_DE_FASES.md.
export {}
