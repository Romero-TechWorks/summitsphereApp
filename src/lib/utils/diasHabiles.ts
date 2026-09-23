/**
 * Días hábiles con el calendario oficial de México [E03 · F06·B3].
 *
 * ⚠️ **Hábiles, no naturales, y no es un detalle.** `P-SG-03` §5.5 fija los
 * plazos del cliente en «días hábiles», y un plazo de 15 naturales vence cinco
 * días antes que uno de 15 hábiles: la app marcaría en rojo acciones que según
 * el procedimiento de la firma siguen en tiempo (docs/09 · E03).
 *
 * ⚠️ **Todo va sobre cadenas `YYYY-MM-DD`, nunca sobre un `Date` local.** Son
 * columnas `date`, y un `new Date('2026-11-16')` es medianoche UTC — en México,
 * el domingo anterior a las 18:00 (CLAUDE.md · trampas heredadas). La aritmética
 * se hace con `Date.UTC` y se lee con `getUTC*`, así que la zona del teléfono no
 * entra en ningún momento.
 *
 * **Los festivos oficiales son los de la Ley Federal del Trabajo, art. 74**, y se
 * calculan, no se capturan: tres de ellos caen en lunes móvil y cambian cada año.
 * Lo que la ley no fija —la jornada electoral, Jueves y Viernes Santo, el 12 de
 * diciembre si la firma descansa— lo añade la firma en `/admin?tab=config`, y
 * llega aquí como `extras`.
 */

const DIA_MS = 86_400_000
const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/

/** `YYYY-MM-DD` → milisegundos UTC. `null` si el texto no es una fecha. */
function aUTC(iso: string): number | null {
  const partes = FORMATO.exec(iso)
  if (!partes) return null
  const [, a, m, d] = partes
  const ms = Date.UTC(Number(a), Number(m) - 1, Number(d))
  return Number.isNaN(ms) ? null : ms
}

function aISO(ms: number): string {
  const f = new Date(ms)
  const a = f.getUTCFullYear()
  const m = String(f.getUTCMonth() + 1).padStart(2, '0')
  const d = String(f.getUTCDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}

/** El `n`-ésimo lunes de un mes (mes 1–12). */
function enesimoLunes(anio: number, mes: number, n: number): string {
  const primero = new Date(Date.UTC(anio, mes - 1, 1))
  // getUTCDay: 0 domingo … 1 lunes.
  const hastaLunes = (8 - primero.getUTCDay()) % 7
  return aISO(Date.UTC(anio, mes - 1, 1 + hastaLunes + (n - 1) * 7))
}

/**
 * Los días de descanso obligatorio de la LFT (art. 74) de un año.
 *
 * El 1 de octubre sólo cuenta el año de la transmisión del Poder Ejecutivo
 * Federal —cada seis años desde 2024—. La jornada electoral (fracción IX) no se
 * puede calcular: la firma la añade como festivo propio.
 */
export function festivosOficiales(anio: number): string[] {
  const dos = (n: number) => String(n).padStart(2, '0')
  const fijo = (mes: number, dia: number) => `${anio}-${dos(mes)}-${dos(dia)}`

  const lista = [
    fijo(1, 1),
    enesimoLunes(anio, 2, 1),   // 5 de febrero, Constitución
    enesimoLunes(anio, 3, 3),   // 21 de marzo, Benito Juárez
    fijo(5, 1),
    fijo(9, 16),
    enesimoLunes(anio, 11, 3),  // 20 de noviembre, Revolución
    fijo(12, 25),
  ]
  if (anio >= 2024 && (anio - 2024) % 6 === 0) lista.push(fijo(10, 1))

  return lista.sort()
}

/** Cache por año: un plazo de 90 hábiles recorre ~130 días y pregunta 130 veces. */
const porAnio = new Map<number, ReadonlySet<string>>()

function oficialesDe(anio: number): ReadonlySet<string> {
  let conjunto = porAnio.get(anio)
  if (!conjunto) {
    conjunto = new Set(festivosOficiales(anio))
    porAnio.set(anio, conjunto)
  }
  return conjunto
}

/** Si ese día se trabaja: ni sábado, ni domingo, ni festivo oficial o de la firma. */
export function esDiaHabil(iso: string, extras: ReadonlySet<string> = new Set()): boolean {
  const ms = aUTC(iso)
  if (ms === null) return false
  const f = new Date(ms)
  const dia = f.getUTCDay()
  if (dia === 0 || dia === 6) return false
  return !oficialesDe(f.getUTCFullYear()).has(iso) && !extras.has(iso)
}

/**
 * `desde` + `n` días hábiles.
 *
 * **El día de partida no cuenta**: un hallazgo levantado el lunes con 15 hábiles
 * empieza a correr el martes. Es como se computa un plazo en México y como lo va
 * a contar el cliente con el calendario en la mano.
 *
 * Con `n <= 0` devuelve `desde` tal cual. Con una fecha que no se entiende,
 * `null`: no se inventa un vencimiento.
 */
export function sumarDiasHabiles(
  desde: string,
  n: number,
  extras: ReadonlySet<string> = new Set(),
): string | null {
  let ms = aUTC(desde)
  if (ms === null) return null
  let faltan = Math.floor(n)
  while (faltan > 0) {
    ms += DIA_MS
    if (esDiaHabil(aISO(ms), extras)) faltan -= 1
  }
  return aISO(ms)
}

/** `desde` + `n` días de calendario. Para la firma que decida contar naturales. */
export function sumarDiasNaturales(desde: string, n: number): string | null {
  const ms = aUTC(desde)
  if (ms === null) return null
  return aISO(ms + Math.floor(n) * DIA_MS)
}

/** Si un texto es una fecha `YYYY-MM-DD` que existe (rechaza el 31 de febrero). */
export function esFechaISO(texto: string): boolean {
  const ms = aUTC(texto)
  return ms !== null && aISO(ms) === texto
}
