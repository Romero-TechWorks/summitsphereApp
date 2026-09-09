# `worker/` — los oyentes del service worker

⚠️ **`public/sw.js` lo REGENERA el build.** Cualquier cosa que escribas ahí
desaparece en el siguiente `npm run build`.

Los oyentes propios —recibir un push, abrir la app al tocar la notificación— van
en **`worker/index.js`**, que `next.config.mjs` declara como `customWorkerSrc` y
el fork de PWA inyecta dentro del `sw.js` generado.

✅ **Escrito el 9 sep 2026** (`F04·B3`). Dos oyentes:

- **`push`** — pinta la notificación. ⚠️ El `event.waitUntil` **no es opcional**:
  el navegador puede matar el service worker en cuanto el manejador devuelve, y
  sin él la notificación se pierde a mitad de camino en un teléfono dormido, que
  es justo el caso para el que existe todo esto. Y el `try` alrededor del `json()`
  tampoco: si el cuerpo no es JSON —un push de prueba desde las herramientas del
  navegador— sin él no se enseña nada.
- **`notificationclick`** — busca una pestaña ya abierta **antes** de abrir otra.
  Sin eso, cada aviso deja una pestaña nueva y al final de la semana hay ocho
  SummitApp abiertas y ninguna es la que se estaba usando.

⚠️ **El `tag` colapsa los avisos del mismo hecho**: si el teléfono estuvo dos días
apagado, al volver no se apilan tres «vence en 3».

⚠️ El push exige **HTTPS o `localhost`**: no se prueba desde una IP de red local.
Y el service worker está **apagado en `dev`** — para probarlo,
`npm run build && npm run start`, o contra la URL de Vercel desde el teléfono,
que es la única prueba que vale para el criterio de cierre.
