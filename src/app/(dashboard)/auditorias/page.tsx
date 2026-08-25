import { Suspense } from 'react'
import PantallaAuditorias from '@/components/auditorias/PantallaAuditorias'
import Skeleton from '@/components/ui/Skeleton'

/**
 * `/auditorias` — el programa y el plan [F03·B1].
 *
 * ⚠️ El `<Suspense>` **no es opcional**: la pantalla lee la pestaña del query
 * string con `useSearchParams()`, y sin un límite de suspense Next no puede
 * prerenderizar la ruta y `npm run build` falla con *"useSearchParams() should
 * be wrapped in a suspense boundary"*. Es la misma razón por la que la llevan
 * `/cartera` y `/sistemas`.
 */
export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <PantallaAuditorias />
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
