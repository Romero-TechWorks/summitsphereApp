/**
 * La caché de React Query, guardada en IndexedDB.
 *
 * ⚠️ **Esto es lo que hace que la app abra sin señal.** Sin persistir, la caché
 * vive en memoria y se muere al cerrar la pestaña: el auditor que abrió la
 * auditoría en la oficina, cerró la app y la vuelve a abrir en el sótano de la
 * planta se encuentra una pantalla vacía y un día perdido.
 *
 * Se hace a mano —`dehydrate` y `hydrate` los exporta React Query— en vez de
 * sumar `@tanstack/react-query-persist-client`: son cuarenta líneas, y así el
 * proyecto controla el disparador, el tamaño y la caducidad, que es justo lo
 * que hay que ajustar cuando una auditoría entera tiene que caber en el
 * teléfono.
 */

import { dehydrate, hydrate, type DehydratedState, type QueryClient } from '@tanstack/react-query'
import { ALMACEN_CACHE, borrarIdb, escribirIdb, leerIdb } from './idb'

const CLAVE = 'react-query'

/**
 * ⚠️ Súbelo cuando cambie la FORMA de lo que se cachea —una columna que se
 * renombra, una consulta que devuelve otra cosa—. Una caché vieja con una forma
 * nueva pinta pantallas rotas con datos que parecen buenos.
 */
const VERSION_CACHE = 1

/** Una semana. Más allá, es más honesto recargar que enseñar algo de otro mes. */
const MAX_EDAD = 7 * 24 * 60 * 60 * 1000

/** Se escribe como mucho una vez por segundo: guardar en cada tecla ahoga el hilo. */
const RETARDO_ESCRITURA = 1_000

type CacheGuardada = {
  version: number
  guardado_en: number
  estado: DehydratedState
}

/** Devuelve la caché del disco a memoria. Se llama ANTES de pintar nada. */
export async function restaurarCache(cliente: QueryClient): Promise<void> {
  const guardada = await leerIdb<CacheGuardada>(ALMACEN_CACHE, CLAVE)
  if (!guardada) return

  if (guardada.version !== VERSION_CACHE || Date.now() - guardada.guardado_en > MAX_EDAD) {
    await borrarIdb(ALMACEN_CACHE, CLAVE)
    return
  }

  hydrate(cliente, guardada.estado)
}

/** Empieza a persistir cada cambio de la caché. Devuelve cómo detenerlo. */
export function iniciarPersistencia(cliente: QueryClient): () => void {
  let programado: number | null = null

  async function guardar() {
    try {
      const estado = dehydrate(cliente, {
        // ⚠️ Las mutaciones NO se persisten: el `outbox` de esta app es
        // `src/lib/offline/cola.ts`. Guardar además las mutaciones pausadas de
        // React Query mandaría cada escritura dos veces al volver la señal.
        shouldDehydrateMutation: () => false,
      })

      await escribirIdb(
        ALMACEN_CACHE,
        { version: VERSION_CACHE, guardado_en: Date.now(), estado } satisfies CacheGuardada,
        CLAVE,
      )
    } catch (error) {
      // Sin caché la app sigue andando con señal; sin aviso, nadie se entera de
      // que dejó de haber offline hasta que alguien está en una planta.
      console.warn('No se pudo guardar la caché offline.', error)
    }
  }

  function programar() {
    if (programado !== null) return
    programado = window.setTimeout(() => {
      programado = null
      void guardar()
    }, RETARDO_ESCRITURA)
  }

  const desuscribir = cliente.getQueryCache().subscribe(programar)

  return () => {
    desuscribir()
    if (programado !== null) window.clearTimeout(programado)
    // Un último guardado al desmontar: lo que pasó en el último segundo también
    // cuenta.
    void guardar()
  }
}
