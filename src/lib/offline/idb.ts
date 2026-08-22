/**
 * IndexedDB, lo mínimo y a mano.
 *
 * Sin librería a propósito: son sesenta líneas, y la capa offline es la pieza de
 * la que depende que un auditor pueda trabajar en el sótano de una planta. Una
 * dependencia más aquí es una cosa más que puede cambiar de API entre versiones
 * mientras nadie mira.
 *
 * ⚠️ **`localStorage` no sirve para esto.** Es síncrono —bloquea el hilo que
 * pinta— y tiene un tope de unos 5 MB por origen. La caché de una auditoría
 * completa con su lista de verificación no cabe, y el día que no quepa el
 * navegador lanza `QuotaExceededError` en mitad de un guardado.
 *
 * Dos almacenes:
 *   · `cache` — el estado deshidratado de React Query. Una sola clave.
 *   · `cola`  — las escrituras que todavía no llegaron al servidor.
 */

const NOMBRE_BD = 'summitapp'

/**
 * ⚠️ **Subir esta versión es lo ÚNICO que crea un almacén nuevo.** El navegador
 * sólo llama a `onupgradeneeded` cuando el número cambia; con la base ya abierta
 * en el teléfono de un consultor, añadir un `createObjectStore` sin tocar aquí
 * no hace nada — y la primera lectura de ese almacén falla con
 * `NotFoundError` en el aparato de campo y en ninguno de desarrollo, porque en
 * desarrollo la base se creó desde cero.
 *
 * 1 → 2 (F02·B2b): entra `adjuntos`, la cola de subida de evidencias.
 */
const VERSION_BD = 2

export const ALMACEN_CACHE = 'cache'
export const ALMACEN_COLA = 'cola'
/** Los binarios que esperan a subir al bucket privado [F02·B2b]. */
export const ALMACEN_ADJUNTOS = 'adjuntos'

let promesaBD: Promise<IDBDatabase | null> | null = null

/**
 * Abre la base, una sola vez por pestaña.
 *
 * Devuelve `null` —en vez de lanzar— cuando IndexedDB no está disponible: pasa
 * en el servidor, y también en el navegador de Safari en modo privado. La app
 * tiene que seguir funcionando sin persistencia; lo que no puede es caerse.
 */
export function abrirBD(): Promise<IDBDatabase | null> {
  if (promesaBD) return promesaBD

  promesaBD = new Promise((resolver) => {
    if (typeof indexedDB === 'undefined') {
      resolver(null)
      return
    }

    let peticion: IDBOpenDBRequest
    try {
      peticion = indexedDB.open(NOMBRE_BD, VERSION_BD)
    } catch (error) {
      console.warn('IndexedDB no está disponible: la app funciona sin caché persistente.', error)
      resolver(null)
      return
    }

    peticion.onupgradeneeded = () => {
      const bd = peticion.result
      if (!bd.objectStoreNames.contains(ALMACEN_CACHE)) bd.createObjectStore(ALMACEN_CACHE)
      if (!bd.objectStoreNames.contains(ALMACEN_COLA)) {
        bd.createObjectStore(ALMACEN_COLA, { keyPath: 'id' })
      }
      if (!bd.objectStoreNames.contains(ALMACEN_ADJUNTOS)) {
        bd.createObjectStore(ALMACEN_ADJUNTOS, { keyPath: 'id' })
      }
    }

    peticion.onsuccess = () => resolver(peticion.result)
    peticion.onerror = () => {
      console.warn('No se pudo abrir IndexedDB.', peticion.error)
      resolver(null)
    }
  })

  return promesaBD
}

/** Envuelve una petición de IndexedDB en una promesa. */
function esperar<T>(peticion: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    peticion.onsuccess = () => resolver(peticion.result)
    peticion.onerror = () => rechazar(peticion.error)
  })
}

export async function leerIdb<T>(almacen: string, clave: string): Promise<T | null> {
  const bd = await abrirBD()
  if (!bd) return null
  const valor = await esperar<T | undefined>(
    bd.transaction(almacen, 'readonly').objectStore(almacen).get(clave),
  )
  return valor ?? null
}

/**
 * `clave` va aparte para `cache` —almacén sin `keyPath`— y sobra para `cola`,
 * que saca la suya del propio objeto.
 */
export async function escribirIdb(almacen: string, valor: unknown, clave?: string): Promise<void> {
  const bd = await abrirBD()
  if (!bd) return
  const tienda = bd.transaction(almacen, 'readwrite').objectStore(almacen)
  await esperar(clave === undefined ? tienda.put(valor) : tienda.put(valor, clave))
}

export async function borrarIdb(almacen: string, clave: string): Promise<void> {
  const bd = await abrirBD()
  if (!bd) return
  await esperar(bd.transaction(almacen, 'readwrite').objectStore(almacen).delete(clave))
}

export async function listarIdb<T>(almacen: string): Promise<T[]> {
  const bd = await abrirBD()
  if (!bd) return []
  return esperar<T[]>(bd.transaction(almacen, 'readonly').objectStore(almacen).getAll())
}
