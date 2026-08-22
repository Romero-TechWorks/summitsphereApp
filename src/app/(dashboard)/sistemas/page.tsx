import { Suspense } from 'react'
import PantallaSistemas from '@/components/sistemas/PantallaSistemas'
import Skeleton from '@/components/ui/Skeleton'

/**
 * `/sistemas` — documentos, requisitos, procesos, riesgos e indicadores
 * [Fase 02], más el catálogo de normas que llegó en la Fase 01.
 *
 * ⚠️ El `<Suspense>` **no es opcional**: la pantalla lee la pestaña y el cliente
 * elegido del query string con `useSearchParams()`, y sin un límite de suspense
 * Next no puede prerenderizar la ruta y `npm run build` falla con
 * *"useSearchParams() should be wrapped in a suspense boundary"*. Es la misma
 * razón por la que `/cartera` lo lleva.
 */
export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <PantallaSistemas />
    </Suspense>
  )
}

function Cargando() {
  return (
    <div className="contenido-pagina" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Skeleton alto={36} ancho="45%" />
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
    </div>
  )
}
