/**
 * El buscador global [F06·B4]: la RPC `buscar_global()`.
 *
 * ⚠️ **La seguridad no vive aquí**: la RPC es `SECURITY INVOKER` sobre una
 * vista `security_invoker`, así que cada una de las siete tablas aplica su RLS
 * a quien busca. Esto sólo la llama.
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

export type ResultadoBusqueda = Database['public']['Functions']['buscar_global']['Returns'][number]

/** Lo mínimo para que valga la pena preguntar: con una letra sale media base. */
export const LARGO_MINIMO_BUSQUEDA = 2

export async function buscarGlobal(texto: string): Promise<ResultadoBusqueda[]> {
  const { data, error } = await createClient().rpc('buscar_global', {
    p_consulta: texto,
    p_limite: 40,
  })
  if (error) throw error
  return data ?? []
}
