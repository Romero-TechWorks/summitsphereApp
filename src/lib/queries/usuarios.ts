/**
 * Consultas de usuarios.
 */

import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

export type Usuario = Tables<'usuarios'>

/**
 * El perfil de quien tiene la sesión abierta.
 *
 * ⚠️ `getSession()`, **nunca `getUser()`**. `getUser()` valida el token contra
 * el servidor: en el guard del proxy eso es exactamente lo que se quiere, pero
 * aquí, dentro de la app y sin señal, es una llamada que se queda colgada y deja
 * la pantalla cargando para siempre. `getSession()` lee la sesión local.
 */
export async function obtenerUsuarioActual(): Promise<Usuario | null> {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()

  if (error) throw error
  return data
}
