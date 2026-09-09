/**
 * La mitad del servidor del push [F04·B3] — **nunca llega al navegador**.
 *
 * ⚠️ `VAPID_PRIVATE_KEY` es server-only (regla 5). Este archivo sólo se importa
 * desde `src/app/api/cron/*`, que corre en el servidor: si alguna vez lo importa
 * un componente cliente, la llave privada acaba en el bundle y cualquiera puede
 * mandarle notificaciones falsas a los usuarios de la firma.
 */

import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

let configurado = false

/**
 * Configura `web-push` una vez por proceso.
 *
 * Devuelve el motivo cuando falta algo, en vez de lanzar: el cron tiene que poder
 * contestar «faltan las llaves VAPID» con un 200 y su explicación. Un 500 en
 * Vercel Cron sólo deja una línea roja en el panel que no dice qué falta.
 */
function configurar(): string | null {
  if (configurado) return null

  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privada = process.env.VAPID_PRIVATE_KEY
  const sujeto = process.env.VAPID_SUBJECT

  if (!publica || !privada) {
    return 'Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY en el despliegue.'
  }

  webpush.setVapidDetails(sujeto || 'mailto:contacto@summit-sphere.com', publica, privada)
  configurado = true
  return null
}

/** Lo que se empuja a un aparato. Lo lee `worker/index.js`. */
export type Carga = {
  titulo: string
  cuerpo: string
  enlace: string
  categoria: string
  /** Colapsa avisos del mismo hecho si el teléfono estuvo apagado. */
  clave?: string
}

export type ResultadoFanOut = {
  aparatos: number
  entregados: number
  desactivados: number
  motivo?: string
}

/**
 * Manda una carga a **todos los aparatos vivos** de una lista de usuarios.
 *
 * ⚠️ **Un 404 o un 410 desactivan la suscripción, no la borran.** Es lo que el
 * servicio de push contesta cuando el navegador se desinstaló o el usuario
 * revocó el permiso: seguir intentándolo cada día es ruido, pero borrar la fila
 * deja sin explicación el «llevo tres semanas sin recibir nada».
 *
 * ⚠️ **Y ningún fallo detiene el resto.** Con quince consultores, un endpoint
 * muerto no puede dejar sin aviso a los otros catorce: se cuenta y se sigue.
 */
export async function empujar(
  supabase: SupabaseClient<Database>,
  destinatarios: { usuarioId: string; carga: Carga }[],
): Promise<ResultadoFanOut> {
  const motivo = configurar()
  if (motivo) return { aparatos: 0, entregados: 0, desactivados: 0, motivo }

  if (destinatarios.length === 0) {
    return { aparatos: 0, entregados: 0, desactivados: 0 }
  }

  const usuarios = [...new Set(destinatarios.map((d) => d.usuarioId))]

  const { data: suscripciones, error } = await supabase
    .from('push_suscripciones')
    .select('id, usuario_id, endpoint, p256dh, auth, fallos')
    .in('usuario_id', usuarios)
    .eq('activa', true)

  if (error) throw error
  if (!suscripciones || suscripciones.length === 0) {
    return { aparatos: 0, entregados: 0, desactivados: 0 }
  }

  const porUsuario = new Map<string, typeof suscripciones>()
  for (const s of suscripciones) {
    const lista = porUsuario.get(s.usuario_id) ?? []
    lista.push(s)
    porUsuario.set(s.usuario_id, lista)
  }

  let entregados = 0
  let desactivados = 0
  let aparatos = 0

  for (const { usuarioId, carga } of destinatarios) {
    for (const s of porUsuario.get(usuarioId) ?? []) {
      aparatos += 1
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(carga),
        )
        entregados += 1
        await supabase
          .from('push_suscripciones')
          .update({ ultimo_envio_en: new Date().toISOString(), fallos: 0 })
          .eq('id', s.id)
      } catch (problema: unknown) {
        const codigo =
          typeof problema === 'object' && problema !== null && 'statusCode' in problema
            ? Number((problema as { statusCode: unknown }).statusCode)
            : 0

        // 404 / 410: el aparato ya no existe. Se apaga y queda el rastro.
        if (codigo === 404 || codigo === 410) {
          await supabase.from('push_suscripciones').update({ activa: false }).eq('id', s.id)
          desactivados += 1
        } else {
          // Cualquier otro fallo se cuenta: tres seguidos y se apaga sola en la
          // siguiente corrida. Un tropiezo de red no debería matar una
          // suscripción buena.
          const fallos = (s.fallos ?? 0) + 1
          await supabase
            .from('push_suscripciones')
            .update({ fallos, activa: fallos < 3 })
            .eq('id', s.id)
          if (fallos >= 3) desactivados += 1
        }
      }
    }
  }

  return { aparatos, entregados, desactivados }
}
