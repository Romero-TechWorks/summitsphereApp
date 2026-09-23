/**
 * Los catálogos del cumplimiento normativo [F05·B1].
 *
 * ⚠️ Son la traducción a TypeScript de los `CHECK` de
 * `20260922120000_cumplimiento_normativo.sql`. **Si cambia un CHECK, cambia esta
 * lista en el mismo commit.** Y se leen siempre con `etiquetaDe()`/`tonoDe()`,
 * que degradan enseñando el valor crudo: un catálogo que devuelve `undefined`
 * dentro de un bucle se lleva los cuarenta renglones (CLAUDE.md · trampas
 * heredadas).
 *
 * ⚠️ **El tipo de obligación NO está aquí**: es `obligacion_tipos`, un catálogo
 * que el socio edita desde la pantalla (decisión 3 del dueño, 22 sep 2026).
 * Aquí sólo van las SUGERENCIAS que la pantalla de alta ofrece cuando la
 * biblioteca todavía está vacía.
 */

import type { Opcion } from '@/lib/cartera/catalogos'

/** `noms.autoridad` */
export const AUTORIDADES_NOM: readonly Opcion[] = [
  { valor: 'stps',             etiqueta: 'STPS' },
  { valor: 'semarnat',         etiqueta: 'SEMARNAT' },
  { valor: 'proteccion_civil', etiqueta: 'Protección Civil' },
  { valor: 'salud',            etiqueta: 'Salud' },
  { valor: 'otro',             etiqueta: 'Otra' },
]

/** `noms.tipo` */
export const TIPOS_NOM: readonly Opcion[] = [
  { valor: 'seguridad',    etiqueta: 'Seguridad' },
  { valor: 'higiene',      etiqueta: 'Higiene' },
  { valor: 'organizacion', etiqueta: 'Organización' },
  { valor: 'producto',     etiqueta: 'Producto' },
  { valor: 'ambiental',    etiqueta: 'Ambiental' },
]

/**
 * `obligaciones.naturaleza` — **un arreglo**, no un valor: el formato real del
 * cliente combina («Legal / Norma») en un tercio de sus renglones.
 */
export const NATURALEZAS: readonly Opcion[] = [
  { valor: 'legal',       etiqueta: 'Legal' },
  { valor: 'norma',       etiqueta: 'Norma' },
  { valor: 'contractual', etiqueta: 'Contractual' },
  { valor: 'voluntaria',  etiqueta: 'Voluntaria' },
]

/**
 * `obligaciones.frecuencia_verificacion` — ⚠️ **una cadencia, no un
 * vencimiento** (docs/13 §5.1). Lo que caduca es la próxima verificación.
 */
export const FRECUENCIAS: readonly Opcion[] = [
  { valor: 'anual',      etiqueta: 'Anual' },
  { valor: 'semestral',  etiqueta: 'Semestral' },
  { valor: 'trimestral', etiqueta: 'Trimestral' },
  { valor: 'mensual',    etiqueta: 'Mensual' },
  { valor: 'por_evento', etiqueta: 'Por evento' },
  { valor: 'unica_vez',  etiqueta: 'Única vez y ante cambios' },
]

/**
 * `obligaciones.estado_cumplimiento`.
 *
 * El formato del levantamiento usa tres —Cumple, No cumple, Parcial— y los dos
 * que sobran hacen falta igual: el documento real tiene un renglón con el
 * veredicto en blanco (`sin_evaluar`) y el `SGI-F-COM-18` usa «En proceso».
 */
export const ESTADOS_CUMPLIMIENTO: readonly Opcion[] = [
  { valor: 'sin_evaluar', etiqueta: 'Sin evaluar' },
  { valor: 'cumple',      etiqueta: 'Cumple',     tono: 'exito' },
  { valor: 'parcial',     etiqueta: 'Parcial',    tono: 'advertencia' },
  { valor: 'no_cumple',   etiqueta: 'No cumple',  tono: 'error' },
  { valor: 'en_proceso',  etiqueta: 'En proceso', tono: 'info' },
]

/** Los que se pulsan en el piso. `sin_evaluar` es deshacer, no un juicio. */
export const VEREDICTOS_DE_CAMPO = ESTADOS_CUMPLIMIENTO.filter((e) => e.valor !== 'sin_evaluar')

/**
 * **Cómo se decide cada veredicto**, pintado al elegirlo.
 *
 * ⚠️ Es lo que hace que dos consultores evalúen igual, y va en la pantalla, no
 * en un manual: la misma lección que `CRITERIO_HALLAZGO`. Está redactado desde
 * el formato real del levantamiento STPS de Summit: «Parcial» llega con su
 * motivo pegado —«Parcial (no presentó documentación)»—, y por eso la base lo
 * exige.
 *
 * ⚠️ Es texto de arranque escrito a partir del formato, **no criterio firmado
 * por Summit**. Si la firma lo redacta con sus palabras, se sustituye aquí.
 */
export const CRITERIO_CUMPLIMIENTO: Readonly<Record<string, string>> = {
  cumple:
    'El elemento está y se demuestra: se vio en el área o se presentó el registro que lo prueba. Si falta la evidencia, no es «cumple».',
  parcial:
    'Existe pero incompleto: el extintor está pero sin recarga vigente, el programa existe pero no se ejecutó, o no se presentó la documentación. Escribe qué falta — la base no deja guardar un parcial sin observación.',
  no_cumple:
    'No existe o no se presentó nada. Es un incumplimiento ante la autoridad: al terminar el recorrido se levanta como no conformidad con fuente «incumplimiento legal».',
  en_proceso:
    'El cliente ya lo está atendiendo y lo puede demostrar (orden de compra, cita con el laboratorio, borrador del programa), pero todavía no está en operación.',
}

/** El criterio de un veredicto; nunca `undefined`. */
export function criterioDe(estado: string): string | null {
  return CRITERIO_CUMPLIMIENTO[estado] ?? null
}

/**
 * Los tipos de obligación que el dominio ya conoce, para **proponer** en el alta
 * mientras la biblioteca está vacía. No se siembran: el socio decide cuáles da
 * de alta y cómo los llama (decisión 3).
 */
export const TIPOS_OBLIGACION_SUGERIDOS: readonly string[] = [
  'Estudio',
  'Dictamen',
  'Licencia',
  'Permiso',
  'Mantenimiento',
  'Recarga',
  'Examen médico',
  'Capacitación',
  'Licencia de software',
  'Poder notarial',
  'Otro',
]

/** Las áreas del levantamiento real, para proponer al dar de alta las de un sitio. */
export const AREAS_SUGERIDAS: readonly string[] = [
  'Recepción',
  'Sala de juntas',
  'Oficinas privadas',
  'Área común de trabajo',
  'Sanitarios',
  'Site de telecomunicaciones',
  'Comedor',
]

/**
 * La clave de un tipo a partir de su nombre: «Examen médico» → `examen_medico`.
 *
 * Se deriva y no se pide: nadie tiene por qué escribir una clave, y dos socios
 * escribiéndola a mano acabarían con `examen-medico` y `examenmedico`.
 */
export function claveDeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export type Propuesta = {
  /** `null` = la app no tiene con qué proponer. */
  aplica: boolean | null
  /** Por qué. Se ofrece como punto de partida de la justificación. */
  motivo: string
}

/**
 * **La app PROPONE si un requisito aplica; la persona DECIDE** (docs/13 §5.2).
 *
 * Compara `min/max_trabajadores` del requisito con `sitios.num_trabajadores`.
 * ⚠️ Vive aquí y no en la RPC a propósito: la RPC deja `aplica` en null, y la
 * columna sólo guarda lo que alguien decidió. Los dos números ya están en la
 * caché, así que la propuesta sale igual sin señal.
 */
export function proponerAplica(
  requisito: { min_trabajadores: number | null; max_trabajadores: number | null; aplica_si: string | null } | null,
  numTrabajadores: number | null,
): Propuesta {
  if (!requisito) {
    return { aplica: null, motivo: '' }
  }

  const { min_trabajadores: min, max_trabajadores: max } = requisito

  if (min == null && max == null) {
    return {
      aplica: null,
      motivo: requisito.aplica_si ? `Condición: ${requisito.aplica_si}` : '',
    }
  }

  const rango =
    min != null && max != null
      ? `de ${min} a ${max} trabajadores`
      : min != null
        ? `de ${min} trabajadores o más`
        : `de hasta ${max} trabajadores`

  if (numTrabajadores == null) {
    return {
      aplica: null,
      motivo: `El requisito es para centros ${rango}, y el sitio no tiene capturado su número de trabajadores.`,
    }
  }

  const dentro = (min == null || numTrabajadores >= min) && (max == null || numTrabajadores <= max)

  return {
    aplica: dentro,
    motivo: `El sitio tiene ${numTrabajadores} trabajadores; el requisito es para centros ${rango}.`,
  }
}

/**
 * Suma meses a una fecha `YYYY-MM-DD` **como lo hace Postgres**: si el día no
 * existe en el mes de llegada, se recorta al último (31-ene + 1 mes = 28/29-feb).
 *
 * ⚠️ Trabaja sobre el texto y `Date.UTC`, nunca con `new Date('2026-03-10')`:
 * una columna `date` leída así corre un día en México (CLAUDE.md · trampas).
 */
export function sumarMeses(fechaISO: string, meses: number): string {
  const [a, m, d] = fechaISO.split('-').map(Number)
  const total = a * 12 + (m - 1) + meses
  const anio = Math.floor(total / 12)
  const mes = (total % 12) + 1
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  const dia = Math.min(d, ultimo)
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Días de `desde` a `hasta`, las dos `YYYY-MM-DD`. Negativo si ya pasó. */
export function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split('-').map(Number)
  const [a2, m2, d2] = hasta.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000)
}

/**
 * La próxima verificación, para la fila optimista.
 *
 * ⚠️ **La autoridad es la base** (`sellar_evaluacion_obligacion()`): esto sólo
 * existe para que la fecha salga sin señal mientras la evaluación espera en la
 * cola.
 */
export function proximaVerificacion(fechaISO: string, frecuencia: string | null): string | null {
  const meses: Record<string, number> = { anual: 12, semestral: 6, trimestral: 3, mensual: 1 }
  const n = frecuencia ? meses[frecuencia] : undefined
  return n ? sumarMeses(fechaISO, n) : null
}

// ══════════════════════════════════════════════════════ vencimientos · B2 ══

/**
 * `vencimientos.estado`.
 *
 * ⚠️ Los tres primeros los mantiene **la base contra la fecha** (trigger y cron
 * diario); `en_tramite` y `no_aplica` son decisiones de una persona, y
 * `renovado` lo pone la emisión que lo sustituye
 * (`20260923120000_renovacion_de_vencimientos.sql`).
 */
export const ESTADOS_VENCIMIENTO: readonly Opcion[] = [
  { valor: 'vigente',    etiqueta: 'Vigente',    tono: 'exito' },
  { valor: 'por_vencer', etiqueta: 'Por vencer', tono: 'advertencia' },
  { valor: 'vencido',    etiqueta: 'Vencido',    tono: 'error' },
  { valor: 'en_tramite', etiqueta: 'En trámite', tono: 'info' },
  { valor: 'no_aplica',  etiqueta: 'No aplica' },
  { valor: 'renovado',   etiqueta: 'Renovado' },
]

/** Los que calcula la fecha. */
export const ESTADOS_POR_FECHA: readonly string[] = ['vigente', 'por_vencer', 'vencido']

/**
 * A cuántos días un vencimiento pasa a «por vencer». ⚠️ Copia de
 * `dias_por_vencer()` en la base, que es la autoridad: coincide con el primer
 * aviso del cron.
 */
export const DIAS_POR_VENCER = 90

/**
 * El estado que se PINTA.
 *
 * ⚠️ **Se recalcula aquí contra la fecha**, no se lee tal cual de la fila: el
 * cron lo pone al día una vez al día, y una lista que lleva tres días en la
 * caché del teléfono diría «vigente» de algo que venció anteayer. Si la persona
 * lo marcó en trámite, no aplica o renovado, eso manda.
 */
export function estadoVisible(v: { estado: string; vence_en: string }, hoy: string): string {
  if (!ESTADOS_POR_FECHA.includes(v.estado)) return v.estado
  const dias = diasEntre(hoy, v.vence_en)
  if (dias < 0) return 'vencido'
  if (dias <= DIAS_POR_VENCER) return 'por_vencer'
  return 'vigente'
}

/** ¿Pide atención? Lo que vence o venció y nadie ha resuelto. */
export function esCritico(estado: string): boolean {
  return estado === 'vencido' || estado === 'por_vencer' || estado === 'en_tramite'
}
