/**
 * La cola de salida (`outbox`).
 *
 * Todo lo que la app escribe sin señal espera aquí, **en orden**, hasta que
 * vuelve la red. Es la pieza que convierte "no hay internet" en "todavía no
 * subió": el auditor levanta treinta hallazgos en modo avión y los treinta
 * salen solos al llegar al estacionamiento.
 *
 * ⚠️ El orden importa y por eso se reproduce en serie, nunca en paralelo: si un
 * hallazgo se crea y después se reclasifica, mandar el UPDATE antes que el
 * INSERT deja la fila mal —o la pierde—.
 *
 * ⚠️ Toda operación lleva una **etiqueta legible en español**, nunca un UUID. La
 * cola se le enseña al usuario: *"Orden del tablero"* se entiende; *"prefs
 * 8f3c…"* le dice que la app está rota.
 */

import type { Database } from '@/types/database'
import { uuid } from '@/lib/utils/uuid'
import { ALMACEN_COLA, borrarIdb, escribirIdb, listarIdb } from './idb'

/** Sólo se encola contra tablas que existen en el esquema. */
export type TablaEscribible = keyof Database['public']['Tables']

/**
 * Qué se le hace a la fila. Vive aquí y no en `mutate.ts` porque es la cola
 * quien la persiste: `mutate.ts` importa de este archivo, no al revés.
 */
export type TipoEscritura = 'insert' | 'upsert' | 'update' | 'delete'

export type OperacionCola = {
  id: string
  tabla: TablaEscribible
  operacion: TipoEscritura
  /** Lo que se manda. `null` en un delete. */
  valores: Record<string, unknown> | null
  /** Qué filas toca. `null` en un insert. */
  filtro: Record<string, unknown> | null
  /** En español, y que se entienda fuera de la oficina. */
  etiqueta: string
  creado_en: string
  /**
   * `fallido` es una operación que el servidor RECHAZÓ —RLS, validación—, no una
   * que no salió. Se queda en la cola para que alguien la vea y decida: tirarla
   * en silencio sería perder un dato que el usuario cree guardado.
   */
  estado: 'pendiente' | 'fallido'
  intentos: number
  motivo: string | null
}

export type ResumenCola = { pendientes: number; fallidos: number }

// --------------------------------------------------------------------------
// Espejo en memoria.
//
// `useSyncExternalStore` exige una instantánea SÍNCRONA y con identidad estable:
// si `getSnapshot()` devolviera un objeto nuevo en cada llamada, React
// re-renderizaría sin parar. Por eso estas dos referencias sólo se reemplazan
// cuando el contenido cambia de verdad.
// --------------------------------------------------------------------------

const LISTA_VACIA: OperacionCola[] = []
const RESUMEN_VACIO: ResumenCola = { pendientes: 0, fallidos: 0 }

let lista: OperacionCola[] = LISTA_VACIA
let resumen: ResumenCola = RESUMEN_VACIO

const oyentes = new Set<() => void>()

export function suscribirCola(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

/** La instantánea del cliente. */
export function leerCola(): OperacionCola[] {
  return lista
}

export function leerResumenCola(): ResumenCola {
  return resumen
}

/** La del servidor: nunca hay cola en el servidor, y la referencia es fija. */
export function colaDelServidor(): OperacionCola[] {
  return LISTA_VACIA
}

export function resumenDelServidor(): ResumenCola {
  return RESUMEN_VACIO
}

/** Relee IndexedDB y avisa a quien esté mirando. */
export async function refrescarCola(): Promise<OperacionCola[]> {
  const todas = await listarIdb<OperacionCola>(ALMACEN_COLA)
  todas.sort((a, b) => (a.creado_en < b.creado_en ? -1 : a.creado_en > b.creado_en ? 1 : 0))

  lista = todas.length === 0 ? LISTA_VACIA : todas

  const pendientes = todas.filter((o) => o.estado === 'pendiente').length
  const fallidos = todas.length - pendientes
  if (pendientes !== resumen.pendientes || fallidos !== resumen.fallidos) {
    resumen = pendientes === 0 && fallidos === 0 ? RESUMEN_VACIO : { pendientes, fallidos }
  }

  for (const oyente of oyentes) oyente()
  return lista
}

export async function encolar(
  operacion: Omit<OperacionCola, 'id' | 'creado_en' | 'estado' | 'intentos' | 'motivo'>,
): Promise<OperacionCola> {
  const fila: OperacionCola = {
    ...operacion,
    id: uuid(),
    // ISO en UTC: es lo que hace que el orden alfabético sea el cronológico.
    creado_en: new Date().toISOString(),
    estado: 'pendiente',
    intentos: 0,
    motivo: null,
  }

  await escribirIdb(ALMACEN_COLA, fila)
  await refrescarCola()
  return fila
}

/** Las que todavía pueden salir, en el orden en que se hicieron. */
export function pendientes(): OperacionCola[] {
  return lista.filter((o) => o.estado === 'pendiente')
}

export async function quitarDeCola(id: string): Promise<void> {
  await borrarIdb(ALMACEN_COLA, id)
  await refrescarCola()
}

export async function marcarFallo(operacion: OperacionCola, motivo: string): Promise<void> {
  await escribirIdb(ALMACEN_COLA, {
    ...operacion,
    estado: 'fallido',
    intentos: operacion.intentos + 1,
    motivo,
  } satisfies OperacionCola)
  await refrescarCola()
}

/** Devuelve los rechazados a la cola. Lo dispara el usuario, no un temporizador. */
export async function reintentarFallidos(): Promise<void> {
  for (const operacion of lista) {
    if (operacion.estado !== 'fallido') continue
    await escribirIdb(ALMACEN_COLA, {
      ...operacion,
      estado: 'pendiente',
      motivo: null,
    } satisfies OperacionCola)
  }
  await refrescarCola()
}
