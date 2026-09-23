/**
 * Lo que comparten las rutas de `/api/users` [F06·B3]: quién llama, si puede, y
 * la contraseña temporal.
 *
 * ⚠️ **Por qué estas tres cosas no pasan por la cola ni por el RLS.** Crear una
 * cuenta, ponerle contraseña y cerrarle la puerta son operaciones de
 * `auth.users`, y ese esquema sólo lo toca `service_role`. Es el caso que
 * `src/lib/supabase/admin.ts` ya nombraba como legítimo. Y ninguna tiene sentido
 * sin red: son de oficina, las hace un socio frente a su computadora.
 *
 * ⚠️ **Con `service_role` el RLS no existe**, así que el candado vive aquí:
 * cada ruta llama a `socioQueLlama()` ANTES de crear el cliente privilegiado, y
 * cada una comprueba la partición del destino con `puedeAdministrar()`.
 */

import 'server-only'
import { randomInt } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

export type Llamante = { id: string; nombre: string; esDev: boolean }

/**
 * El socio que hace la petición, validado contra Supabase —`getUser()`, no
 * `getSession()`: en un guard, una cookie se puede falsificar—.
 *
 * Devuelve la respuesta de rechazo en vez de lanzar: la ruta sólo hace
 * `if ('rechazo' in r) return r.rechazo`.
 */
export async function socioQueLlama(): Promise<{ llamante: Llamante } | { rechazo: NextResponse }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { rechazo: error(401, 'Tu sesión terminó. Vuelve a entrar.') }

  const { data: perfil, error: fallo } = await supabase
    .from('usuarios')
    .select('id, nombre, rol, activo, es_dev')
    .eq('id', user.id)
    .maybeSingle()

  if (fallo) return { rechazo: error(500, fallo.message) }
  if (!perfil || perfil.rol !== 'socio' || !perfil.activo) {
    return { rechazo: error(403, 'Sólo un socio da de alta cuentas y cambia contraseñas ajenas.') }
  }

  return { llamante: { id: perfil.id, nombre: perfil.nombre, esDev: perfil.es_dev } }
}

/**
 * La misma pared que `proteger_rol_usuario()` en la base: un socio de PRUEBAS
 * sólo administra cuentas de pruebas. Un socio real, todas.
 */
export function puedeAdministrar(llamante: Llamante, destino: { es_dev: boolean }): boolean {
  return !llamante.esDev || destino.es_dev
}

/**
 * Una contraseña temporal: `Xk7m-Qp3r-Hn9w`.
 *
 * Doce caracteres al azar de un alfabeto **sin los que se confunden al dictarla
 * por teléfono** (0/O, 1/l/I), con mayúscula, minúscula, número y guion
 * garantizados —así pasa cualquier política de contraseñas que se encienda en
 * Supabase—. `randomInt` de `node:crypto`, nunca `Math.random`.
 */
export function contrasenaTemporal(): string {
  const mayus = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const minus = 'abcdefghijkmnpqrstuvwxyz'
  const nums = '23456789'
  const todos = mayus + minus + nums

  const elegir = (de: string) => de[randomInt(de.length)]
  const bloques: string[] = []
  for (let b = 0; b < 3; b++) {
    let bloque = ''
    for (let i = 0; i < 4; i++) bloque += elegir(todos)
    bloques.push(bloque)
  }
  // Garantizar las tres clases sin que su posición sea predecible.
  const pos = () => randomInt(4)
  const poner = (b: number, c: string) => {
    const p = pos()
    bloques[b] = bloques[b].slice(0, p) + c + bloques[b].slice(p + 1)
  }
  poner(0, elegir(mayus))
  poner(1, elegir(minus))
  poner(2, elegir(nums))

  return bloques.join('-')
}

/**
 * La marca que obliga a cambiar la contraseña al entrar. Vive en
 * `user_metadata` —la lee `src/proxy.ts` de lo que ya le devuelve `getUser()`,
 * sin otra consulta— y la apaga la propia persona **en la misma llamada** que
 * pone su contraseña nueva (`updateUser({ password, data })`).
 *
 * ⚠️ Es un empujón, no un candado: `user_metadata` la puede escribir el propio
 * usuario. Quitársela sin cambiar la contraseña sólo le perjudica a él.
 * El ROL nunca sale de ahí (`crear_perfil_usuario()`).
 */
export const MARCA_CAMBIO: { [clave: string]: Json } = { debe_cambiar_contrasena: true }

/**
 * Lo que hizo `service_role` queda en la bitácora **con el nombre del socio**.
 *
 * El trigger `registrar_bitacora()` ya escribe el cambio de la fila de
 * `usuarios`, pero con `auth.uid()` vacío —quien escribe es la llave de
 * servicio—. Este renglón es el que contesta «¿quién le dio acceso?».
 * ⚠️ **Nunca lleva la contraseña.**
 */
export async function anotar(
  admin: ReturnType<typeof createAdminClient>,
  llamante: Llamante,
  usuarioId: string,
  operacion: 'INSERT' | 'UPDATE',
  contexto: string,
): Promise<string | null> {
  const { error: fallo } = await admin.from('audit_logs').insert({
    tabla: 'usuarios',
    registro_id: usuarioId,
    operacion,
    usuario_id: llamante.id,
    contexto: `${contexto} — por ${llamante.nombre}`,
  })
  // No se lanza: la cuenta ya se tocó y deshacerlo sería peor. Se devuelve el
  // motivo y la ruta lo pinta, para que un hueco en la bitácora no pase callado.
  return fallo ? `No quedó el renglón en la bitácora: ${fallo.message}` : null
}

export function error(status: number, motivo: string): NextResponse {
  return NextResponse.json({ ok: false, motivo }, { status })
}
