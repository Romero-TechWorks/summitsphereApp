/**
 * Los plazos por defecto de la firma: cuánto tiene un cliente para responder a
 * cada tipo de hallazgo [E03 · F06·B3].
 *
 * Viven en `config_firma.plazos_default` —un `jsonb`, sembrado por la migración
 * de avisos con el 15/30/60/90 hábiles que decidió el dueño— y los edita un
 * socio en `/admin?tab=config`. **Quien los lee es el formulario del hallazgo**,
 * que propone la fecha compromiso al elegir el tipo: sin ese lector, esta
 * configuración sería un interruptor muerto (regla 11).
 *
 * ⚠️ **Proponer, no imponer.** El auditor puede mover la fecha —hay clientes que
 * negocian el plazo en la reunión de cierre—, y la columna guarda lo que se
 * acordó. Lo mismo que `programa_procesos.valor`: la pantalla propone, la base
 * guarda lo decidido.
 *
 * ⚠️ **El escalonado es criterio de Summit, no del cliente**: `P-SG-05` sólo
 * fija los 15 hábiles del análisis de causa. Por eso es configuración y no un
 * CHECK.
 */

import type { Json } from '@/types/database'
import { hoyISO } from '@/lib/utils/dates'
import { esFechaISO, sumarDiasHabiles, sumarDiasNaturales } from '@/lib/utils/diasHabiles'

/** Los tipos de hallazgo que llevan plazo. Una conformidad no se responde. */
export const TIPOS_CON_PLAZO = ['nc_mayor', 'nc_menor', 'observacion', 'oportunidad_mejora'] as const

export type TipoConPlazo = (typeof TIPOS_CON_PLAZO)[number]

export type UnidadPlazo = 'habiles' | 'naturales'

export type Plazos = {
  unidad: UnidadPlazo
  /** Días por tipo. `null` = sin plazo propuesto: la fecha se captura a mano. */
  dias: Record<TipoConPlazo, number | null>
  /** Los festivos de la firma, además de los de la LFT. `YYYY-MM-DD`, ordenados. */
  festivos: string[]
}

/** Lo que decidió el dueño en E03. Es el respaldo si el jsonb viene vacío o raro. */
export const PLAZOS_DE_FABRICA: Plazos = {
  unidad: 'habiles',
  dias: { nc_mayor: 15, nc_menor: 30, observacion: 60, oportunidad_mejora: 90 },
  festivos: [],
}

function esObjeto(valor: Json | undefined): valor is { [clave: string]: Json | undefined } {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

/**
 * El `jsonb` → algo con forma.
 *
 * ⚠️ **Nunca revienta** (CLAUDE.md · trampas heredadas): el jsonb lo pudo tocar
 * alguien desde el panel de Supabase. Un número raro se vuelve «sin plazo», no un
 * `NaN` que acabe en una fecha inválida dentro de un hallazgo.
 */
export function leerPlazos(valor: Json | undefined | null): Plazos {
  if (!esObjeto(valor ?? undefined)) return PLAZOS_DE_FABRICA
  const obj = valor as { [clave: string]: Json | undefined }

  const dias = { ...PLAZOS_DE_FABRICA.dias }
  for (const tipo of TIPOS_CON_PLAZO) {
    if (!(tipo in obj)) continue
    const n = obj[tipo]
    dias[tipo] = typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : null
  }

  const festivos = Array.isArray(obj.festivos)
    ? obj.festivos.filter((f): f is string => typeof f === 'string' && esFechaISO(f))
    : []

  return {
    unidad: obj.unidad === 'naturales' ? 'naturales' : 'habiles',
    dias,
    festivos: [...new Set(festivos)].sort(),
  }
}

/**
 * Lo que se guarda. **Conserva la forma plana del sembrado** (`nc_mayor: 15`),
 * no la anidada de `Plazos`: así el jsonb de la base sigue siendo legible para
 * quien lo abra en el panel, y las filas ya sembradas no cambian de forma.
 */
export function plazosAJson(plazos: Plazos): Json {
  return {
    unidad: plazos.unidad,
    ...plazos.dias,
    festivos: [...new Set(plazos.festivos)].sort(),
  }
}

export function tienePlazo(tipo: string): tipo is TipoConPlazo {
  return (TIPOS_CON_PLAZO as readonly string[]).includes(tipo)
}

/** Días del plazo de ese tipo, o `null` si no tiene. */
export function diasDelPlazo(tipo: string, plazos: Plazos): number | null {
  return tienePlazo(tipo) ? plazos.dias[tipo] : null
}

/**
 * La fecha compromiso que propone la firma para un hallazgo de ese tipo
 * levantado en `desde` (hoy, si no se dice).
 */
export function proponerFechaCompromiso(
  tipo: string,
  plazos: Plazos,
  desde: string = hoyISO(),
): string | null {
  const n = diasDelPlazo(tipo, plazos)
  if (n === null) return null
  return plazos.unidad === 'naturales'
    ? sumarDiasNaturales(desde, n)
    : sumarDiasHabiles(desde, n, new Set(plazos.festivos))
}

/** «15 días hábiles». */
export function describirPlazo(dias: number, unidad: UnidadPlazo): string {
  return `${dias} ${dias === 1 ? 'día' : 'días'} ${unidad === 'habiles' ? (dias === 1 ? 'hábil' : 'hábiles') : (dias === 1 ? 'natural' : 'naturales')}`
}
