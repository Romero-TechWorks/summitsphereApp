/**
 * Los dos errores de Supabase que este proyecto trata distinto que el resto.
 */

import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Si un error es «no llegué al servidor» y no «el servidor dijo que no».
 *
 * La diferencia decide el destino de una escritura: un fallo de red se encola y
 * se reintenta; un rechazo del servidor **no se encola nunca** —reintentarlo
 * mil veces daría el mismo 42501— y tiene que llegarle al usuario.
 *
 * PostgREST siempre responde con un `code` (`42501` de RLS, `23505` de único,
 * `PGRST116` de fila no encontrada…). Un `fetch` que no salió del teléfono no
 * tiene ninguno: llega como `TypeError: Failed to fetch`, y en Safari como
 * `Load failed`, que es el mismo error con otro nombre.
 */
export function esFalloDeRed(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true

  if (error instanceof TypeError) return true

  const codigo = (error as Partial<PostgrestError>)?.code
  if (typeof codigo === 'string' && codigo.length > 0) return false

  const mensaje = error instanceof Error ? error.message : String(error ?? '')
  return /failed to fetch|networkerror|load failed|network request failed|timeout/i.test(mensaje)
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
