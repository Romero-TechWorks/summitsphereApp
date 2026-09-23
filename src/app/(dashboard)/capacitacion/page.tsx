import { Suspense } from 'react'
import PantallaCapacitacion from '@/components/capacitacion/PantallaCapacitacion'
import Skeleton from '@/components/ui/Skeleton'

/**
 * `/capacitacion` — programa anual, sesiones y DC-3 [F05·B3].
 *
 * ⚠️ El `<Suspense>` no es opcional: la pantalla lee la pestaña, el cliente y la
 * sesión abierta del query string con `useSearchParams()`, y sin él
 * `npm run build` falla. Mismo motivo que `/sistemas`.
 */
export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <PantallaCapacitacion />
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
