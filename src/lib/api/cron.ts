/**
 * Lo que comparten las dos rutas de cron [F04·B4].
 *
 * ⚠️ **`api/cron` está EXCLUIDA del matcher de `src/proxy.ts`** (regla 2): llega
 * sin sesión, así que el guard la mandaría a `/login` y Vercel Cron recibiría un
 * 307 en vez de ejecutar nada. Quien la autentica es `CRON_SECRET`.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * ¿Viene de Vercel Cron o de alguien que adivinó la URL?
 *
 * Vercel manda `Authorization: Bearer <CRON_SECRET>`. Se acepta también
 * `?secreto=` para poder dispararlo a mano desde una terminal al probar, que es
 * lo que hace falta el primer día.
 *
 * ⚠️ **Sin `CRON_SECRET` configurado se RECHAZA, nunca se deja pasar.** Es el
 * mismo criterio que el guard cuando faltan las variables de Supabase: una puerta
 * abierta por omisión es peor que una rota, y aquí significaría que cualquiera
 * dispara los avisos en bucle.
 */
export function cronAutorizado(request: Request): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto) return false

  const cabecera = request.headers.get('authorization')
  if (cabecera === `Bearer ${secreto}`) return true

  const url = new URL(request.url)
  return url.searchParams.get('secreto') === secreto
}

/**
 * El cliente con `service_role`: **el cron no tiene sesión**, así que no puede
 * pasar por el RLS. Es la única parte de la app que lo usa junto con
 * `/api/fiscal/credenciales`.
 *
 * ⚠️ `SUPABASE_SERVICE_ROLE_KEY` **se salta el RLS entero**. Por eso las RPC que
 * llama son `SECURITY DEFINER` con su lógica dentro y con el `revoke` puesto:
 * la ruta sólo hace el fan-out, no decide a quién le toca qué.
 */
export function clienteDeServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !clave) return null

  return createClient<Database>(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
