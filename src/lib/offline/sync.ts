/**
 * El vaciado de la cola: lo que pasa cuando vuelve la señal.
 *
 * Se dispara solo —al recuperar la red, al volver la app al frente, y cada
 * treinta segundos mientras quede algo— y también a mano desde el indicador de
 * conexión.
 */

import type { QueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { esFalloDeRed, mensajeDeError } from '@/lib/supabase/errores'
import { marcarFallo, pendientes, quitarDeCola, refrescarCola } from './cola'
import { ejecutarOperacion } from './mutate'

export type ResultadoSincronia = { enviadas: number; fallidas: number }

/** Una sola sincronía a la vez: dos en paralelo mandarían la misma fila dos veces. */
let sincronizando = false

export async function sincronizar(cliente: QueryClient): Promise<ResultadoSincronia> {
  const vacio: ResultadoSincronia = { enviadas: 0, fallidas: 0 }

  if (sincronizando) return vacio
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return vacio

  sincronizando = true
  let enviadas = 0
  let fallidas = 0

  try {
    // ⚠️ Sin sesión NO se reproduce nada, y no es una optimización.
    //
    // Esta función corre al montar la app, y las políticas de la base son todas
    // `TO authenticated`. Si el token todavía no está listo —o caducó mientras
    // el teléfono estaba sin señal—, cada operación saldría como anónima, el
    // RLS la rechazaría con un 42501 legítimo y `marcarFallo` la daría por
    // perdida para siempre. No es que el servidor la haya rechazado: es que no
    // llegó a presentarse. Se queda en la cola y se intenta al siguiente aviso.
    const { data: { session } } = await createClient().auth.getSession()
    if (!session) return vacio

    // ⚠️ En serie y en orden. Ver `cola.ts`: el paralelo rompe la secuencia.
    for (const operacion of pendientes()) {
      try {
        await ejecutarOperacion(operacion)
        await quitarDeCola(operacion.id)
        enviadas++
      } catch (error) {
        if (esFalloDeRed(error)) {
          // Se cortó otra vez a media cola. Lo que queda espera su turno: no se
          // marca como fallido, porque no falló nada.
          break
        }
        await marcarFallo(operacion, mensajeDeError(error))
        fallidas++
      }
    }

    // Lo que subió cambió el servidor: la caché deja de ser verdad.
    if (enviadas > 0) await cliente.invalidateQueries()

    return { enviadas, fallidas }
  } finally {
    sincronizando = false
  }
}

/** Deja la sincronía andando sola. Devuelve cómo detenerla. */
export function iniciarSincronizacion(cliente: QueryClient): () => void {
  void refrescarCola().then(() => sincronizar(cliente))

  const intentar = () => {
    void sincronizar(cliente)
  }

  const alVolverAlFrente = () => {
    // ⚠️ `visibilitychange` y no `focus`: en un teléfono la app no pierde el
    // foco al bloquear la pantalla, se oculta. Volver del bolsillo con señal
    // otra vez es el caso más común de todos.
    if (document.visibilityState === 'visible') intentar()
  }

  window.addEventListener('online', intentar)
  document.addEventListener('visibilitychange', alVolverAlFrente)

  const temporizador = window.setInterval(() => {
    if (pendientes().length > 0) intentar()
  }, 30_000)

  return () => {
    window.removeEventListener('online', intentar)
    document.removeEventListener('visibilitychange', alVolverAlFrente)
    window.clearInterval(temporizador)
  }
}
