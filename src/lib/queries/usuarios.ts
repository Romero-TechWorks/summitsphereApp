/**
 * Consultas de usuarios.
 */

import { createClient } from '@/lib/supabase/client'
import { exigirFilas } from '@/lib/supabase/errores'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
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

// ═══════════════════════════════════════════════ administración [F06·B3] ══

/**
 * Todas las cuentas que el RLS deja ver —a un socio, las de su partición—,
 * **incluidas las dadas de baja**: es la lista de `/admin?tab=usuarios`, donde
 * se reactivan.
 */
export async function listarCuentas(): Promise<Usuario[]> {
  const { data, error } = await createClient()
    .from('usuarios')
    .select('*')
    .order('activo', { ascending: false })
    .order('nombre')

  if (error) throw error
  return data ?? []
}

export type DatosPerfil = Pick<Usuario, 'nombre' | 'telefono' | 'rol' | 'certificaciones'>

/**
 * Cambiar nombre, teléfono, rol o certificaciones de una cuenta.
 *
 * ⚠️ **Esto SÍ pasa por la cola**, al revés que el alta y la baja: es una fila
 * de `public.usuarios` y el RLS + `proteger_rol_usuario()` ya deciden quién
 * puede — sólo un socio cambia un rol, y uno de pruebas sólo dentro de su
 * partición—. Cero filas es rechazo (`exigirFilas`).
 */
export async function actualizarPerfil(
  usuario: Usuario,
  datos: DatosPerfil,
): Promise<ResultadoEscritura<Usuario>> {
  return offlineWrite<Usuario>({
    tabla: 'usuarios',
    operacion: 'update',
    etiqueta: `Cambios en la cuenta de ${datos.nombre}`,
    valores: datos,
    filtro: { id: usuario.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('usuarios')
        .update(datos)
        .eq('id', usuario.id)
        .select()
      if (error) throw error
      return exigirFilas(data, 'Cambios en la cuenta')[0]
    },
    offline: { ...usuario, ...datos },
  })
}

/** Lo que devuelven las rutas de `/api/users`. */
type RespuestaApi = { ok: boolean; motivo?: string; avisos?: string[] }

/**
 * Llama a una ruta de `/api/users`.
 *
 * ⚠️ **Sin cola, a propósito**: tocan `auth.users` con `service_role` y no
 * tienen sentido sin red. Sin señal se dice y no se intenta.
 */
async function llamar<T extends RespuestaApi>(ruta: string, metodo: 'POST' | 'PATCH', cuerpo?: unknown): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Sin conexión. Las cuentas se dan de alta y se bloquean con señal.')
  }
  const respuesta = await fetch(ruta, {
    method: metodo,
    headers: { 'content-type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  const datos = (await respuesta.json().catch(() => null)) as T | null
  if (!respuesta.ok || !datos?.ok) {
    throw new Error(datos?.motivo ?? `El servidor respondió ${respuesta.status}.`)
  }
  return datos
}

export type DatosAlta = { nombre: string; correo: string; rol: string; telefono?: string }

/** Alta con contraseña temporal. La contraseña llega UNA vez: se enseña y se olvida. */
export function darDeAltaCuenta(datos: DatosAlta) {
  return llamar<RespuestaApi & { id: string; contrasena: string }>('/api/users', 'POST', datos)
}

/** Contraseña temporal nueva para otra cuenta. */
export function nuevaContrasenaTemporal(usuarioId: string) {
  return llamar<RespuestaApi & { contrasena: string }>(`/api/users/${usuarioId}/contrasena`, 'POST')
}

/** Baja (bloquea la cuenta) o reactivación. */
export function cambiarActivoCuenta(usuarioId: string, activo: boolean) {
  return llamar<RespuestaApi & { usuario: Usuario }>(`/api/users/${usuarioId}`, 'PATCH', { activo })
}
