# `public/` — archivos servidos tal cual

## Lo que hay

| Archivo | Qué es |
|---|---|
| `manifest.json` | Lo que lee el navegador para ofrecer "instalar la app" |
| `icono.svg` | La esfera de Summit sobre navy, fuente de los PNG |
| `icono-192.png` · `icono-512.png` | Iconos de la PWA |
| `icono-512-maskable.png` | Versión con margen para Android, que recorta el icono a su forma |
| `apple-touch-icon.png` | iOS, que ignora el manifest |
| `favicon.png` | Pestaña del navegador |

⚠️ **`icono-512-maskable.png` existe por una razón concreta.** Android recorta el
icono a la forma del lanzador —círculo, cuadrado redondeado, gota— y lo hace sobre
el 40% central. Sin una versión con margen, la esfera sale mordida por los bordes
en la mitad de los teléfonos.

## Lo que el build genera aquí

`sw.js`, `workbox-*.js`, `worker-*.js`, `swe-worker-*.js`

⚠️ **No se editan y no se commitean** — están en `.gitignore`. El código propio
del service worker vive en `worker/index.js`; ese sí se edita.

⚠️ **Todo archivo generado que aparezca aquí va también en el matcher de
`src/proxy.ts`.** Si no, un visitante sin sesión pide `/sw.js`, el guard lo manda
a `/login` y el navegador recibe HTML donde esperaba JavaScript:

```
SecurityError: ... script resource is behind a redirect, which is disallowed
Uncaught SyntaxError: Unexpected token '<'
```

El efecto real es que el service worker no se registra en la pantalla de login, y
la capa offline no existe hasta que alguien entra. Los dos cambios van en el mismo
commit.

## Regenerar los iconos

Salen de `icono.svg` con `sharp`, que ya es dependencia del proyecto:

```bash
node -e "
const sharp = require('sharp');
sharp('public/icono.svg', { density: 600 }).resize(192, 192).png().toFile('public/icono-192.png');
sharp('public/icono.svg', { density: 600 }).resize(512, 512).png().toFile('public/icono-512.png');
sharp('public/icono.svg', { density: 600 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
"
```

El maskable no se regenera así: lleva la esfera al 55% y sin esquinas redondeadas
para sobrevivir al recorte. Su fuente está en el propio `icono.svg` con otra
escala.
