/**
 * Fechas.
 *
 * ⚠️ TRAMPA HEREDADA — CLAUDE.md. **Una columna `date` no se formatea con
 * `new Date()`.** `new Date('2026-08-21')` lee el texto como medianoche *UTC*,
 * y en México (UTC−6) eso es el 20 de agosto a las 18:00: la fecha sale corrida
 * un día. Donde más duele es en un vencimiento normativo o en una fecha
 * comprometida con el cliente, que es justo donde un día decide si algo está
 * vencido o no.
 *
 * La regla, sin excepciones:
 *
 * | En la base | En el código |
 * |---|---|
 * | `date` (fecha de calendario) | `formatDateOnly` · `toISODate` |
 * | `timestamptz` (un instante) | `formatDate` |
 *
 * ⚠️ Estas funciones se usan en componentes de cliente. `formatDate` depende de
 * la zona horaria del navegador, así que un valor pintado en el servidor y otra
 * vez en el cliente puede no coincidir; en esta app no ocurre porque todo lo
 * que lleva fecha se lee por `useQuery`, ya en el navegador.
 */

const MESES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const

/** Lo que se pinta donde no hay fecha. Un hueco en blanco parece un error. */
const SIN_FECHA = '—'

const FORMATO_ISO = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * Una columna `date` → `21 ago 2026`.
 *
 * Parte el texto a mano en vez de construir un `Date`: así no hay zona horaria
 * de por medio y el día es el que dice la base.
 *
 * ⚠️ Si el texto no tiene la forma esperada **devuelve el valor crudo**, no
 * `Invalid Date` ni una cadena vacía. Es la misma regla que la de los catálogos
 * (CLAUDE.md · trampas heredadas): degradar enseñando el dato, nunca romper la
 * pantalla ni esconder lo que hay guardado.
 */
export function formatDateOnly(fecha: string | null | undefined): string {
  if (!fecha) return SIN_FECHA

  const partes = FORMATO_ISO.exec(fecha)
  if (!partes) return fecha

  const [, anio, mes, dia] = partes
  const indiceMes = Number(mes) - 1
  const nombreMes = MESES[indiceMes]
  if (!nombreMes) return fecha

  return `${Number(dia)} ${nombreMes} ${anio}`
}

/**
 * Un `Date` → `2026-08-21`, **en la zona del usuario**.
 *
 * Es lo que se manda a una columna `date` y lo que espera un `<input
 * type="date">`. ⚠️ `toISOString().slice(0, 10)` NO sirve: convierte a UTC
 * primero, así que a las 19:00 de un martes en México devuelve el miércoles.
 */
export function toISODate(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/** Hoy, listo para un `<input type="date">` o para una columna `date`. */
export function hoyISO(): string {
  return toISODate()
}

/**
 * Un `timestamptz` → `21 ago 2026, 14:32`.
 *
 * Aquí `new Date()` sí es lo correcto: el valor es un instante y se enseña en
 * la hora local de quien lo mira.
 */
export function formatDate(instante: string | null | undefined): string {
  if (!instante) return SIN_FECHA

  const fecha = new Date(instante)
  if (Number.isNaN(fecha.getTime())) return instante

  const dia = fecha.getDate()
  const mes = MESES[fecha.getMonth()]
  const anio = fecha.getFullYear()
  const hora = String(fecha.getHours()).padStart(2, '0')
  const minuto = String(fecha.getMinutes()).padStart(2, '0')

  return `${dia} ${mes} ${anio}, ${hora}:${minuto}`
}
