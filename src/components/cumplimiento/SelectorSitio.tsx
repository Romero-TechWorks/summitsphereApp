'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { listarSitios, type Sitio } from '@/lib/queries/cartera'
import Select from '@/components/ui/Select'

/**
 * Las obligaciones que no cuelgan de ningún sitio: la carpeta de un despacho,
 * el aviso de privacidad, una cláusula de contrato. Existen, y el selector
 * tiene que poder llegar a ellas.
 */
export const SIN_SITIO = 'organizacion'

/**
 * **En qué sitio estamos**, en el query string (`?sitio=`), igual que el
 * cliente: cambiar de pestaña entre la matriz y el recorrido no lo pierde.
 *
 * ⚠️ **Es un FILTRO, no una clave de caché.** La matriz del cliente se baja
 * entera y el sitio se aplica en memoria (reglas del offline, 7): en la planta
 * cambiar de sitio no puede dejar la pantalla vacía.
 *
 * ⚠️ La lista de sitios sale de `useQuery` con la clave de la cartera — es un
 * desplegable y es un dato (regla 3). Y un sitio que ya no está cae en «todos».
 */
export function useSitioSeleccionado(orgId: string): {
  sitioId: string
  sitios: Sitio[]
  elegir: (id: string) => void
} {
  const router = useRouter()
  const ruta = usePathname()
  const params = useSearchParams()

  const { data: sitios = [] } = useQuery({
    queryKey: queryKeys.cartera.sitios(orgId),
    queryFn: () => listarSitios(orgId),
    enabled: Boolean(orgId),
  })

  const pedido = params.get('sitio') ?? ''
  const sitioId = pedido === SIN_SITIO || sitios.some((s) => s.id === pedido) ? pedido : ''

  function elegir(id: string) {
    const siguientes = new URLSearchParams(params.toString())
    if (id) siguientes.set('sitio', id)
    else siguientes.delete('sitio')
    router.replace(`${ruta}?${siguientes.toString()}`, { scroll: false })
  }

  return { sitioId, sitios, elegir }
}

/** ¿Esta fila está en el sitio elegido? `''` = todos. */
export function enElSitio(filaSitioId: string | null, sitioId: string): boolean {
  if (sitioId === '') return true
  if (sitioId === SIN_SITIO) return filaSitioId === null
  return filaSitioId === sitioId
}

export default function SelectorSitio({
  sitioId,
  sitios,
  elegir,
  permitirTodos = true,
  ayuda,
}: {
  sitioId: string
  sitios: Sitio[]
  elegir: (id: string) => void
  /** El recorrido se camina en UN sitio; la matriz y el semáforo ven todos. */
  permitirTodos?: boolean
  ayuda?: string
}) {
  // Los dados de baja salen de la lista salvo el que esté elegido: un sitio que
  // cerró sigue teniendo su matriz, y no puede desaparecer mientras se mira.
  const visibles = sitios.filter((s) => s.activo || s.id === sitioId)

  return (
    <Select
      etiqueta="Sitio"
      ayuda={ayuda}
      marcador={permitirTodos ? 'Todos los sitios' : 'Elige dónde vas a caminar'}
      value={sitioId}
      onChange={(e) => elegir(e.target.value)}
    >
      {visibles.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}{s.num_trabajadores != null ? ` · ${s.num_trabajadores} trabajadores` : ''}
        </option>
      ))}
      <option value={SIN_SITIO}>De la organización (sin sitio)</option>
    </Select>
  )
}
