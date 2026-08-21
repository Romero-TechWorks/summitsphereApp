import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/**
 * ⚠️ Configuración plana directa, sin `FlatCompat`.
 *
 * `eslint-config-next` 16 ya exporta configuración plana. Pasarla por
 * `FlatCompat` —que es lo que genera `create-next-app` en versiones anteriores y
 * lo que sale en casi todos los ejemplos— revienta con
 * `TypeError: Converting circular structure to JSON`, porque el plugin de React
 * se referencia a sí mismo y el validador antiguo intenta serializarlo.
 */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      // Generados por el build de la PWA. No se editan y no se revisan.
      'public/sw.js',
      'public/workbox-*.js',
      'public/worker-*.js',
      'public/swe-worker-*.js',
      // ⚠️ El de respaldo también: lo genera el build, lo carga `sw.js` con
      // `importScripts`, y sin esta línea `npm run lint` sale con 26 avisos y
      // un error en código que nadie escribió — y un lint ruidoso deja de
      // mirarse. Es el mismo archivo que va excluido del matcher de `proxy.ts`.
      'public/fallback-*.js',
    ],
  },
  {
    rules: {
      // CLAUDE.md regla 9: cero `any`. Los tipos salen del esquema de la base.
      '@typescript-eslint/no-explicit-any': 'error',
      // Un catch vacío convierte un bug en "error". CLAUDE.md, trampas heredadas.
      // La única excepción justificada del proyecto está en
      // `src/lib/supabase/server.ts`, y lleva su explicación escrita.
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
]

export default eslintConfig
