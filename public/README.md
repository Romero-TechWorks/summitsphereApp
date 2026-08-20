# `public/` — estáticos

Iconos de la PWA, `manifest.json`, imágenes, plantillas `.docx` maestras.

⚠️ **Todo lo que el build genere aquí hay que sumarlo al matcher de
`src/proxy.ts`, en el mismo commit.** Si un archivo generado entra al guard de
sesión, un visitante sin sesión lo pide, el guard lo redirige a `/login`, y el
navegador recibe HTML donde esperaba JavaScript. El efecto: **el service worker no
se registra en la pantalla de login** y la capa offline no existe hasta que
alguien entra.

Ya generados por el build (y ya en `.gitignore`): `sw.js`, `workbox-*.js`,
`worker-*.js`, `swe-worker-*.js`, `fallback-*.js`.
