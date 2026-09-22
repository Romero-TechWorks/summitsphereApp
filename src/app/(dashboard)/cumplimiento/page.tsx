import { Suspense } from 'react'
import PantallaCumplimiento from '@/components/cumplimiento/PantallaCumplimiento'
import Skeleton from '@/components/ui/Skeleton'

/**
 * `/cumplimiento` — la matriz de obligaciones, el recorrido de campo y la
 * biblioteca de NOMs [F05·B1].
 *
 * ⚠️ El `<Suspense>` **no es opcional**: la pantalla lee la pestaña y el cliente
 * del query string con `useSearchParams()`, y sin un límite de suspense
 * `npm run build` falla. Mismo motivo que `/sistemas`.
 */
export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <PantallaCumplimiento />
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
