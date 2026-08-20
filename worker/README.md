# `worker/` — los oyentes del service worker

⚠️ **`public/sw.js` lo REGENERA el build.** Cualquier cosa que escribas ahí
desaparece en el siguiente `npm run build`.

Los oyentes propios —recibir un push, abrir la app al tocar la notificación— van
en **`worker/index.js`**, que `next.config.mjs` declara como `customWorkerSrc` y
el fork de PWA inyecta dentro del `sw.js` generado.

Se llena en la **Fase 04, bloque 3**.

⚠️ El push exige **HTTPS o `localhost`**: no se prueba desde una IP de red local.
Y el service worker está **apagado en `dev`** — para probarlo,
`npm run build && npm run start`.
