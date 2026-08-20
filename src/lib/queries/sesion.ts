/**
 * Consultas de la sesión. Como todas, viven aquí y no dentro de un componente
 * (docs/03_ARQUITECTURA.md §6).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Deja constancia del inicio de sesión en `audit_logs`.
 *
 * Es una RPC y no un `insert` porque `audit_logs` no tiene política de INSERT
 * para nadie: se escribe sólo desde funciones `SECURITY DEFINER`, que es lo que
 * impide que alguien con sesión fabrique registros de bitácora a mano.
 *
 * ⚠️ No pasa por `offlineWrite`: sin señal no hay inicio de sesión que
 * registrar, porque tampoco hay inicio de sesión.
 */
export async function registrarInicioSesion(supabase: SupabaseClient<Database>) {
  const { error } = await supabase.rpc('registrar_inicio_sesion')
  if (error) throw error
}
