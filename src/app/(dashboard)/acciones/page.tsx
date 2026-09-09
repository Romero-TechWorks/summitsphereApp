import { Suspense } from 'react'
import PantallaAcciones from '@/components/acciones/PantallaAcciones'
import Skeleton from '@/components/ui/Skeleton'

/**
 * `/acciones` — el ciclo que cierra una no conformidad [F04·B1].
 *
 * ⚠️ El `<Suspense>` **no es opcional**: la pantalla lee la pestaña del query
 * string con `useSearchParams()`, y sin un límite de suspense Next no puede
 * prerenderizar la ruta y `npm run build` falla con *"useSearchParams() should
 * be wrapped in a suspense boundary"*. Es la misma razón por la que lo llevan
 * `/cartera`, `/sistemas` y `/auditorias`.
 */
export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <PantallaAcciones />
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
