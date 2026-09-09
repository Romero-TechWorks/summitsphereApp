/**
 * Suscripciones push y preferencias de aviso [F04·B3].
 *
 * ⚠️ **Ninguna de estas escrituras pasa por `offlineWrite`, y es la sexta
 * excepción consciente.** Suscribir un aparato **no tiene sentido sin red**: el
 * endpoint lo emite el servicio de push del navegador en ese momento, y encolar
 * la fila para mandarla media hora después guardaría una suscripción que puede
 * haber caducado. Es el mismo caso que crear el link del portal.
 *
 * Las **preferencias** sí podrían encolarse, pero se apagan desde una pantalla de
 * ajustes con señal y guardarlas en la cola las dejaría discrepando de lo que el
 * cron lee durante el rato que tarde en vaciarse — que es justo cuando llegaría
 * el aviso que alguien acaba de apagar.
 */

import { createClient } from '@/lib/supabase/client'
import { exigirFilas } from '@/lib/supabase/errores'
import type { DatosSuscripcion } from '@/lib/push/cliente'
import type { Tables } from '@/types/database'

export type Suscripcion = Tables<'push_suscripciones'>

async function idDeLaSesion(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  if (!session) throw new Error('No hay sesión.')
  return session.user.id
}

/** Los aparatos de quien está dentro. La política sólo deja ver los suyos. */
export async function listarSuscripciones(): Promise<Suscripcion[]> {
  const { data, error } = await createClient()
    .from('push_suscripciones')
    .select('*')
    .order('creado_en', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Guardar la suscripción de este aparato.
 *
 * ⚠️ **`upsert` sobre `endpoint` SÍ está bien aquí**, aunque no sea la clave
 * primaria: esta escritura no pasa por la cola, así que la trampa de §6.1 —dos
 * intentos sin señal con ids distintos— no aplica. Y hace falta: reinstalar el
 * service worker devuelve el mismo endpoint, y un `insert` chocaría contra el
 * UNIQUE en vez de reactivar la fila.
 */
export async function guardarSuscripcion(datos: DatosSuscripcion): Promise<Suscripcion> {
  const usuarioId = await idDeLaSesion()

  const { data, error } = await createClient()
    .from('push_suscripciones')
    .upsert(
      {
        usuario_id: usuarioId,
        endpoint: datos.endpoint,
        p256dh: datos.p256dh,
        auth: datos.auth,
        descripcion: datos.descripcion,
        // Reactivar: el aparato pudo haberse desactivado por fallos y ahora
        // vuelve con un endpoint nuevo o el mismo.
        activa: true,
        fallos: 0,
      },
      { onConflict: 'endpoint' },
    )
    .select('*')

  if (error) throw error
  return exigirFilas(data, 'Guardar la suscripción')[0]
}

/** Quitarle el permiso a un aparato. Esto sí borra: no es evidencia de nada. */
export async function olvidarSuscripcion(endpoint: string): Promise<void> {
  const { data, error } = await createClient()
    .from('push_suscripciones')
    .delete()
    .eq('endpoint', endpoint)
    .select('id')

  if (error) throw error
  // ⚠️ Un DELETE bloqueado por RLS NO es un error: afecta a cero filas y
  // PostgREST responde 200 (CLAUDE.md · trampas heredadas). Se pide `.select()`
  // y se trata el cero como fallo.
  exigirFilas(data, 'Olvidar el aparato')
}

/** Las preferencias de quien está dentro. */
export async function obtenerPreferencias(): Promise<Record<string, boolean>> {
  const usuarioId = await idDeLaSesion()

  const { data, error } = await createClient()
    .from('usuarios')
    .select('preferencias_aviso')
    .eq('id', usuarioId)
    .maybeSingle()

  if (error) throw error

  const crudo = data?.preferencias_aviso
  if (typeof crudo !== 'object' || crudo === null || Array.isArray(crudo)) return {}

  return Object.fromEntries(
    Object.entries(crudo as Record<string, unknown>).map(([k, v]) => [k, v !== false]),
  )
}

/**
 * Encender o apagar una categoría.
 *
 * ⚠️ **Se manda el objeto entero, no un parche.** Es una columna `jsonb` y
 * `update` la reemplaza: mandar `{resumen_diario: false}` borraría lo demás. Se
 * lee, se cambia una llave y se escribe — que además es **una** operación, que es
 * el motivo de que esto sea un `jsonb` y no una tabla (§6.1).
 */
export async function cambiarPreferencia(
  categoria: string,
  encendida: boolean,
): Promise<Record<string, boolean>> {
  const usuarioId = await idDeLaSesion()
  const actuales = await obtenerPreferencias()
  const siguientes = { ...actuales, [categoria]: encendida }

  const { data, error } = await createClient()
    .from('usuarios')
    .update({ preferencias_aviso: siguientes })
    .eq('id', usuarioId)
    .select('preferencias_aviso')

  if (error) throw error
  exigirFilas(data, 'Guardar la preferencia')

  return siguientes
}
