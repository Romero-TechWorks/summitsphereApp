# `worker/` — los oyentes del service worker

⚠️ **`public/sw.js` lo REGENERA el build.** Cualquier cosa que escribas ahí
desaparece en el siguiente `npm run build`.

Los oyentes propios —recibir un push, abrir la app al tocar la notificación— van
en **`worker/index.js`**, que `next.config.mjs` declara como `customWorkerSrc` y
el fork de PWA inyecta dentro del `sw.js` generado.

**`worker/index.js` ya existe y está vacío a propósito**: `customWorkerSrc` lo
espera desde la Fase 00 y el build lo compila a `public/worker-<hash>.js`. Los
oyentes se escriben en la **Fase 04, bloque 3**, cuando existan las acciones
correctivas y haya algo que avisar.

⚠️ El push exige **HTTPS o `localhost`**: no se prueba desde una IP de red local.
Y el service worker está **apagado en `dev`** — para probarlo,
`npm run build && npm run start`.
