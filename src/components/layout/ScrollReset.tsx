'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { scrollAlInicio } from '@/lib/utils/appScroll'

/**
 * Devuelve el scroll arriba al cambiar de pantalla.
 *
 * ⚠️ El App Router lo hace solo... sobre el documento. Y en esta app el
 * documento no scrollea: quien scrollea es el div del armazón. Sin esto, al
 * entrar a un hallazgo desde el final de una lista de cuarenta, la pantalla
 * nueva abre a media altura.
 *
 * También reacciona al query string porque **los dominios son pestañas**
 * (`/auditorias?tab=hallazgos`): cambiar de pestaña es cambiar de pantalla
 * aunque la ruta no cambie.
 */
export default function ScrollReset() {
  const ruta = usePathname()
  const params = useSearchParams()

  useEffect(() => {
    scrollAlInicio()
  }, [ruta, params])

  return null
}
