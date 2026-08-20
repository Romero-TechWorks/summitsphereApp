/**
 * Cliente de Supabase para el NAVEGADOR.
 *
 * Lo usan los componentes marcados `'use client'`. Habla con la sesión del
 * usuario, así que **todo lo que consulte pasa por RLS** — que es justo lo que
 * queremos: es la capa que garantiza que un consultor no vea organizaciones que
 * no le tocan (docs/08_SEGURIDAD_Y_RLS.md).
 *
 * ⚠️ Esta variante NUNCA lleva la `service_role`. Si necesitas saltarte el RLS,
 * es una ruta de API en el servidor, no un componente.
 */

import { createBrowserClient } from '@supabase/ssr'
import { exigirConfigSupabase } from './entorno'
import type { Database } from '@/types/database'

export function createClient() {
  const { url, anonKey } = exigirConfigSupabase()
  // El genérico `<Database>` es lo que hace que `.from('hallazgos')` conozca
  // sus columnas. Sin él, todo lo que salga de Supabase llega como `any` y la
  // regla de cero `any` del proyecto se pierde en el primer `select`.
  return createBrowserClient<Database>(url, anonKey)
}
