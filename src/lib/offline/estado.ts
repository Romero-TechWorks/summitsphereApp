/**
 * El estado de la conexión y de la cola, para la interfaz.
 *
 * ⚠️ Con `useSyncExternalStore` y no con `useState` + `useEffect`: es la API que
 * React trae para leer algo que vive fuera de React —`navigator.onLine`, la
 * cola en IndexedDB— sin renderizar de más ni desincronizarse al hidratar.
 */

import { useSyncExternalStore } from 'react'
import {
  colaDelServidor,
  leerCola,
  leerResumenCola,
  resumenDelServidor,
  suscribirCola,
  type OperacionCola,
  type ResumenCola,
} from './cola'

function suscribirRed(alCambiar: () => void): () => void {
  window.addEventListener('online', alCambiar)
  window.addEventListener('offline', alCambiar)
  return () => {
    window.removeEventListener('online', alCambiar)
    window.removeEventListener('offline', alCambiar)
  }
}

/**
 * ⚠️ `navigator.onLine` dice si hay interfaz de red, no si Supabase contesta:
 * el WiFi de una planta puede estar conectado y no llevar a ningún lado. Sirve
 * para decidir el primer intento; quien manda de verdad es que la escritura
 * llegue o no, y de eso se encarga `offlineWrite`.
 */
export function useEnLinea(): boolean {
  return useSyncExternalStore(
    suscribirRed,
    () => navigator.onLine,
    () => true, // en el servidor se asume conexión: es donde se renderiza
  )
}

export function useResumenCola(): ResumenCola {
  return useSyncExternalStore(suscribirCola, leerResumenCola, resumenDelServidor)
}

export function useOperacionesCola(): OperacionCola[] {
  return useSyncExternalStore(suscribirCola, leerCola, colaDelServidor)
}
