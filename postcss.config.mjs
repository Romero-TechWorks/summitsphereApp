// Tailwind 4 se conecta por PostCSS. En este proyecto Tailwind sólo se usa en
// `src/components/ui/`; el resto estiliza con `style` inline y variables CSS
// (ver docs/05_SISTEMA_DE_DISENO.md §4.1).
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
