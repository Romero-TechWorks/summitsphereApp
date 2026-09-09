import { Suspense } from 'react'
import PantallaAdmin from '@/components/admin/PantallaAdmin'
import Skeleton from '@/components/ui/Skeleton'

/**
 * `/admin` — los avisos al teléfono [F04·B3]; el resto del dominio, Fase 06.
 *
 * ⚠️ El `<Suspense>` **no es opcional**: la pantalla lee la pestaña del query
 * string con `useSearchParams()`, y sin un límite de suspense Next no puede
 * prerenderizar la ruta y `npm run build` falla.
 */
export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <PantallaAdmin />
    </Suspense>
  )
}

function Cargando() {
  return (
    <div className="contenido-pagina" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Skeleton alto={36} ancho="45%" />
      {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
    </div>
  )
}
