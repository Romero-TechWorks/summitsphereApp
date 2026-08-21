import { Suspense } from 'react'
import ExpedienteOrganizacion from '@/components/cartera/ExpedienteOrganizacion'
import Skeleton from '@/components/ui/Skeleton'

/**
 * `/cartera/[id]` — el expediente de un cliente [F01·B1].
 *
 * **La única ruta propia de la cartera**: el resto son pestañas del dominio
 * (docs/03_ARQUITECTURA.md §2.1).
 *
 * ⚠️ `params` es una promesa en Next 16 — se espera antes de usarla. Y el
 * `<Suspense>` es obligatorio por el `useSearchParams()` de las pestañas de
 * dentro.
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={<Cargando />}>
      <ExpedienteOrganizacion id={id} />
    </Suspense>
  )
}

function Cargando() {
  return (
    <div className="contenido-pagina" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Skeleton alto={36} ancho="55%" />
      {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
    </div>
  )
}
