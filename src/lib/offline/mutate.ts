/**
 * `offlineWrite` — **la única puerta de escritura de la aplicación**.
 *
 * Un componente nunca llama a `supabase.from(...).insert(...)` directamente: lo
 * hace a través de aquí, y así una escritura sin señal no se pierde ni explota,
 * se encola (CLAUDE.md · reglas del offline, 4).
 *
 * Excepciones conscientes, y son sólo dos: los adjuntos, que tienen cola propia
 * porque pesan megabytes y van en dos fases, y crear o revocar el link del
 * portal, que no tiene sentido sin red.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { esFalloDeRed, exigirFilas } from '@/lib/supabase/errores'
import {
  encolar,
  pendientes,
  type OperacionCola,
  type TablaEscribible,
  type TipoEscritura,
} from './cola'

export type { TipoEscritura }

export type EscrituraOffline<T> = {
  tabla: TablaEscribible
  operacion: TipoEscritura
  /** En español y legible. Es lo que va a leer el usuario en la cola. */
  etiqueta: string
  /** Lo que se manda. Sobra en un `delete`. */
  valores?: Record<string, unknown>
  /** Qué filas toca. Sobra en un `insert`. */
  filtro?: Record<string, unknown>
  /** El camino normal, con señal. Devuelve la fila del servidor. */
  online: () => Promise<T>
  /** La fila optimista: lo que la interfaz enseña mientras espera. */
  offline: T
}

export type ResultadoEscritura<T> = {
  fila: T
  /** `true` si no viajó y quedó en la cola. La interfaz lo dice, no lo esconde. */
  encolado: boolean
}

export async function offlineWrite<T>({
  tabla,
  operacion,
  etiqueta,
  valores,
  filtro,
  online,
  offline,
}: EscrituraOffline<T>): Promise<ResultadoEscritura<T>> {
  const sinSenal = typeof navigator !== 'undefined' && navigator.onLine === false

  // ⚠️ Con cola pendiente se encola aunque HAYA señal, y no es exceso de celo:
  // si un hallazgo se creó sin red y sigue esperando, mandar ahora mismo su
  // reclasificación por la vía directa la haría llegar ANTES que el insert. El
  // servidor respondería "no existe esa fila" y el cambio se perdería con la
  // app en línea y el usuario mirando. La cola es el orden.
  if (sinSenal || pendientes().length > 0) {
    await encolar({
      tabla,
      operacion,
      valores: valores ?? null,
      filtro: filtro ?? null,
      etiqueta,
    })
    return { fila: offline, encolado: true }
  }

  try {
    return { fila: await online(), encolado: false }
  } catch (error) {
    // ⚠️ Un rechazo del servidor NO se encola. Un 42501 de RLS o una violación
    // de un CHECK van a fallar igual dentro de una hora: encolarlos sólo mueve
    // el error a un sitio donde nadie lo mira. Sube, y la pantalla lo pinta.
    if (!esFalloDeRed(error)) throw error

    await encolar({
      tabla,
      operacion,
      valores: valores ?? null,
      filtro: filtro ?? null,
      etiqueta,
    })
    return { fila: offline, encolado: true }
  }
}

/**
 * Reproduce una operación de la cola contra Supabase. La usa `sync.ts`.
 *
 * ⚠️ Cliente **sin** el genérico `<Database>`, y es el único sitio del proyecto
 * donde eso está bien: el nombre de la tabla sale de la cola como texto, y
 * `.from()` no se puede resolver contra una unión de tablas. El tipo se cuida
 * donde el dato todavía tiene forma —`TablaEscribible`, al encolar—, no aquí.
 */
export async function ejecutarOperacion(operacion: OperacionCola): Promise<void> {
  const cliente = createClient() as unknown as SupabaseClient
  const tabla = cliente.from(operacion.tabla)
  const valores = operacion.valores ?? {}
  const filtro = operacion.filtro ?? {}

  if (operacion.operacion === 'insert' || operacion.operacion === 'upsert') {
    const { data, error } =
      operacion.operacion === 'insert'
        ? await tabla.insert(valores).select()
        : await tabla.upsert(valores).select()
    if (error) throw error
    exigirFilas(data, operacion.etiqueta)
    return
  }

  if (operacion.operacion === 'update') {
    const { data, error } = await tabla.update(valores).match(filtro).select()
    if (error) throw error
    // ⚠️ Cero filas en un UPDATE es un rechazo del RLS con cara de éxito.
    exigirFilas(data, operacion.etiqueta)
    return
  }

  const { data, error } = await tabla.delete().match(filtro).select()
  if (error) throw error
  exigirFilas(data, operacion.etiqueta)
}
