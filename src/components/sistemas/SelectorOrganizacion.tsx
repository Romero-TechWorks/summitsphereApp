'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import {
  listarOrganizaciones,
  nombreDeOrganizacion,
  type OrganizacionEnLista,
} from '@/lib/queries/cartera'
import { ESTADOS_ARCHIVADOS_ORGANIZACION } from '@/lib/cartera/catalogos'
import Select from '@/components/ui/Select'

/**
 * **De qué cliente estamos hablando.**
 *
 * Los siete dominios son pantallas globales con pestañas (§2.1), pero un
 * documento, un proceso o un riesgo son de *un* cliente. Este selector es lo que
 * cierra esa distancia, y vive **en el query string** (`?org=<id>`) por lo mismo
 * que las pestañas: se cambia de pestaña sin perder el cliente, el enlace se
 * puede mandar por correo y el botón de atrás hace lo que se espera.
 *
 * ⚠️ La lista es un DATO: `useQuery` con la clave de la cartera, la misma que ya
 * está en la caché desde `/cartera` (CLAUDE.md · reglas del offline, 1 y 3). Sin
 * señal el consultor sigue pudiendo elegir a su cliente porque la lista ya está
 * descargada; con una consulta propia aquí, no.
 */
export function useOrganizacionSeleccionada(): {
  orgId: string
  organizaciones: OrganizacionEnLista[]
  cargando: boolean
  elegir: (id: string) => void
} {
  const router = useRouter()
  const ruta = usePathname()
  const params = useSearchParams()

  const { data: organizaciones = [], isPending } = useQuery({
    queryKey: queryKeys.cartera.organizaciones(),
    queryFn: listarOrganizaciones,
  })

  const pedida = params.get('org') ?? ''

  // ⚠️ Una `org` que ya no está —un enlace viejo, un cliente que se borró, o el
  // expediente de otro consultor— cae en «ninguna», nunca en una pantalla que
  // consulta con un id fantasma y se queda cargando para siempre.
  const orgId = organizaciones.some((o) => o.id === pedida) ? pedida : ''

  function elegir(id: string) {
    const siguientes = new URLSearchParams(params.toString())
    if (id) siguientes.set('org', id)
    else siguientes.delete('org')

    // `scroll: false`: en esta app quien scrollea no es el documento, y
    // `ScrollReset` ya devuelve arriba el contenedor que sí lo hace.
    router.replace(`${ruta}?${siguientes.toString()}`, { scroll: false })
  }

  return { orgId, organizaciones, cargando: isPending, elegir }
}

export default function SelectorOrganizacion({
  orgId,
  organizaciones,
  elegir,
  ayuda,
}: {
  orgId: string
  organizaciones: OrganizacionEnLista[]
  elegir: (id: string) => void
  ayuda?: string
}) {
  // Los clientes cerrados salen de la lista salvo que sea justo el que está
  // abierto: si el expediente que alguien tiene en pantalla desapareciera del
  // selector al cerrarse el cliente, la pantalla se quedaría enseñando datos de
  // una organización que el control dice no tener elegida.
  const visibles = organizaciones.filter(
    (o) => !ESTADOS_ARCHIVADOS_ORGANIZACION.includes(o.estado) || o.id === orgId,
  )

  return (
    <div style={{ maxWidth: 420, marginBottom: 18 }}>
      <Select
        etiqueta="Cliente"
        ayuda={ayuda}
        marcador="Elige una organización"
        value={orgId}
        onChange={(e) => elegir(e.target.value)}
      >
        {visibles.map((o) => (
          <option key={o.id} value={o.id}>
            {nombreDeOrganizacion(o)}
          </option>
        ))}
      </Select>
    </div>
  )
}
