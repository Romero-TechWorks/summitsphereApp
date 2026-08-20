'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { crearQueryClient } from '@/lib/query/cliente'
import { iniciarPersistencia, restaurarCache } from '@/lib/offline/persistencia'
import { iniciarSincronizacion } from '@/lib/offline/sync'

/**
 * React Query, su caché en disco y el vaciado de la cola, montados juntos.
 *
 * ⚠️ **No pinta a sus hijos hasta restaurar la caché.** Es a propósito y es la
 * parte que se rompe si alguien la "arregla": si los hijos montaran antes, sus
 * `useQuery` arrancarían con la caché vacía, dispararían consultas —sin señal,
 * al vacío— y el resultado de esas consultas pisaría a la caché que estaba
 * llegando del disco. El auditor abriría la app en la planta y vería pantallas
 * vacías con los datos ahí, en IndexedDB, sin usarse.
 *
 * Son milisegundos, y sólo afecta al contenido: el armazón —header, sidebar,
 * barra inferior— se pinta antes y no espera a nadie. De esa separación se
 * encarga `EsperaCache`, aquí abajo.
 */

/** `true` cuando la caché ya volvió del disco. */
const ContextoCache = createContext(false)
export default function ProveedorConsultas({ children }: { children: React.ReactNode }) {
  const [cliente] = useState(crearQueryClient)
  const [restaurado, setRestaurado] = useState(false)

  useEffect(() => {
    let vivo = true

    restaurarCache(cliente)
      .catch((error) => {
        // Sin caché la app arranca vacía pero funciona. Callarlo sería no
        // enterarse nunca de que el offline dejó de existir.
        console.warn('No se pudo restaurar la caché offline.', error)
      })
      .finally(() => {
        if (vivo) setRestaurado(true)
      })

    return () => {
      vivo = false
    }
  }, [cliente])

  useEffect(() => {
    if (!restaurado) return

    const detenerPersistencia = iniciarPersistencia(cliente)
    const detenerSincronia = iniciarSincronizacion(cliente)

    return () => {
      detenerPersistencia()
      detenerSincronia()
    }
  }, [cliente, restaurado])

  return (
    <QueryClientProvider client={cliente}>
      <ContextoCache.Provider value={restaurado}>{children}</ContextoCache.Provider>
    </QueryClientProvider>
  )
}

/**
 * Envuelve lo que NO debe montarse antes de que la caché vuelva del disco: el
 * contenido de la página. El armazón queda fuera y se pinta de inmediato.
 */
export function EsperaCache({ children }: { children: React.ReactNode }) {
  return useContext(ContextoCache) ? <>{children}</> : null
}
