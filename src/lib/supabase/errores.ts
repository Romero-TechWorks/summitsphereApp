/**
 * Los dos errores de Supabase que este proyecto trata distinto que el resto.
 */

import type { PostgrestError } from '@supabase/supabase-js'

/**
 * El texto de un error, venga como venga.
 *
 * ⚠️ **`String(error)` NO sirve aquí, y es la trampa que costó el primer bug de
 * campo de esta app.** Cuando un `fetch` no sale del teléfono, postgrest-js no
 * lanza un `Error`: devuelve un **objeto plano**
 * `{ message: 'TypeError: Failed to fetch', details, hint, code: '' }`.
 * Un `error instanceof Error ? error.message : String(error)` sobre eso
 * devuelve la cadena `"[object Object]"`, y a partir de ahí cualquier cosa que
 * mire el mensaje —como `esFalloDeRed`— decide mal.
 */
export function mensajeDeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error

  const posible = error as { message?: unknown }
  if (typeof posible?.message === 'string' && posible.message.length > 0) {
    return posible.message
  }

  return 'Error desconocido'
}

/**
 * Si un error es «no llegué al servidor» y no «el servidor dijo que no».
 *
 * La diferencia decide el destino de una escritura: un fallo de red se encola y
 * se reintenta; un rechazo del servidor **no se encola nunca** —reintentarlo
 * mil veces daría el mismo 42501— y tiene que llegarle al usuario.
 *
 * PostgREST siempre responde con un `code` (`42501` de RLS, `23505` de único,
 * `PGRST116` de fila no encontrada…). Un `fetch` que no salió del teléfono no
 * tiene ninguno: llega con `code: ''` y el mensaje `TypeError: Failed to fetch`,
 * que en Safari es `Load failed` y en el vaciado de la cola puede ser
 * `FetchError: …`. Son el mismo error con tres nombres.
 *
 * ⚠️ **Dónde muerde esto de verdad: al vaciar la cola.** `offlineWrite` está
 * protegido porque sin señal `navigator.onLine` ya es `false` y ni siquiera
 * llega aquí. `sync.ts` no: sólo reproduce la cola cuando el navegador dice que
 * hay red, así que si esta función se equivoca ahí, un corte a media subida
 * —justo lo que pasa al recuperar señal en el estacionamiento— marca la
 * operación como RECHAZADA en vez de dejarla esperando. El auditor ve treinta
 * hallazgos en rojo diciendo «no se pudo guardar» cuando lo único que pasó es
 * que el semáforo cambió. Por eso el mensaje se lee con `mensajeDeError` y no
 * con `String()`.
 */
export function esFalloDeRed(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true

  if (error instanceof TypeError) return true

  // Un código de PostgREST es un veredicto del servidor: llegó, miró y dijo que
  // no. Eso nunca es un fallo de red, y reintentarlo no lo va a arreglar.
  const codigo = (error as Partial<PostgrestError>)?.code
  if (typeof codigo === 'string' && codigo.length > 0) return false

  return /failed to fetch|networkerror|network error|load failed|network request failed|fetcherror|timeout|abort/i.test(
    mensajeDeError(error),
  )
}

/**
 * ⚠️ TRAMPA HEREDADA — CLAUDE.md.
 *
 * Un UPDATE o un DELETE que el RLS no deja tocar **no es un error**: afecta a
 * cero filas y PostgREST responde 200 con una lista vacía. El síntoma es
 * *"lo cierro, desaparece, lo refresco y vuelve"*, y no se parece en nada a un
 * problema de permisos.
 *
 * Con el RLS cerrado de SummitApp esto pasa seguido: es el caso normal, no la
 * excepción. Por eso toda escritura pide `.select()` y pasa por aquí.
 */
export function exigirFilas<T>(filas: T[] | null, que: string): T[] {
  if (!filas || filas.length === 0) {
    throw new Error(
      `${que}: la operación no tocó ninguna fila. Casi siempre es el RLS ` +
      `—la fila existe pero no es de una organización asignada a esta cuenta—, ` +
      `o el registro ya no está.`,
    )
  }
  return filas
}
