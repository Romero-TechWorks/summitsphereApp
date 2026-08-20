/**
 * Cliente de Supabase para el SERVIDOR — Server Components y rutas de API.
 *
 * Sigue usando la `anon key` y la sesión del usuario que hizo la petición, así
 * que **también pasa por RLS**. No es un cliente privilegiado.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { exigirConfigSupabase } from './entorno'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = exigirConfigSupabase()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Un Server Component no puede escribir cookies: sólo el proxy y las
          // rutas de API pueden. Aquí no pasa nada porque `src/proxy.ts` ya
          // refrescó la sesión antes de llegar.
          //
          // ⚠️ Éste es el ÚNICO catch vacío justificado del proyecto, y lleva
          // esta explicación por eso. En cualquier otro sitio, un catch vacío es
          // un error que se pierde — CLAUDE.md, trampas heredadas.
        }
      },
    },
  })
}
