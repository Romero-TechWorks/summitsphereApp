'use client'

import type { QueryClient, QueryKey } from '@tanstack/react-query'

/**
 * Qué hacer con la caché después de una escritura.
 *
 * **La caché es la fuente de verdad** (CLAUDE.md · reglas del offline, 2): lo
 * que la pantalla enseña sale de aquí, no de un `useState` del componente. Por
 * eso toda escritura termina escribiendo también aquí.
 *
 * ⚠️ **Y por eso `invalidateQueries` sólo se llama si la operación VIAJÓ.** Si
 * quedó encolada, invalidar dispararía una relectura al servidor que devolvería
 * los datos de *antes* del cambio —el cambio sigue en la cola, el servidor no lo
 * ha visto— y borraría la fila optimista de la pantalla. El auditor vería
 * desaparecer el sitio que acaba de capturar, con el cambio perfectamente a
 * salvo en la cola. Es la forma más rápida de que alguien deje de confiar en la
 * app y capture todo dos veces.
 */
export function aplicarEscritura<T>({
  cliente,
  clave,
  encolado,
  actualizar,
  ademasInvalidar,
}: {
  cliente: QueryClient
  clave: QueryKey
  /** Lo que devolvió `offlineWrite`: si `true`, no salió a la red. */
  encolado: boolean
  /** Cómo queda la lista después del cambio. */
  actualizar: (previo: T[]) => T[]
  /** Otras claves que dependen de esto — los conteos de la lista de cartera. */
  ademasInvalidar?: QueryKey[]
}): void {
  cliente.setQueryData<T[]>(clave, (previo) => actualizar(previo ?? []))

  if (encolado) return

  void cliente.invalidateQueries({ queryKey: clave })
  for (const otra of ademasInvalidar ?? []) {
    void cliente.invalidateQueries({ queryKey: otra })
  }
}
