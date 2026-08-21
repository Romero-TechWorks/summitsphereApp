import PantallaSistemas from '@/components/normas/PantallaSistemas'

/**
 * `/sistemas` — el catálogo de normas [F01·B2b]; el resto del dominio, Fase 02.
 *
 * Sin `<Suspense>` porque esta pantalla todavía no lee el query string: cuando
 * gane pestañas, lo necesitará (ver `/cartera`).
 */
export default function Pagina() {
  return <PantallaSistemas />
}
