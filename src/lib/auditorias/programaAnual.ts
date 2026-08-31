/**
 * **El programa anual por proceso** [F03·B6b] — la regla de frecuencia del
 * `F-SG-09`.
 *
 * Transcripción y mapeo campo por campo:
 * `docs/formatos_informeAuditorias/F-SG-09_programa_anual.md`.
 *
 * ⚠️ **LA DECISIÓN QUE NO SE DESHACE: manda la hoja de cálculo, no el texto del
 * procedimiento.** `P-SG-03` §5.2 dice «valor × NC = cantidad de auditorías»; el
 * archivo que la firma llena todos los años calcula `Puntos = valor × NC` y
 * luego `Auditorías = IF(Puntos <= 5, 1, 2)`. Con 4 NC en un proceso de servicio
 * el texto pediría ocho auditorías al año y la hoja pide dos. El párrafo se
 * redactó una vez; el papel se llena cada enero. Decisión del dueño, 31 ago 2026.
 *
 * ⚠️ **La fórmula vive DOS veces a propósito, y la base es la autoridad.** En
 * `programa_procesos` son dos columnas generadas y un CHECK; aquí es una función
 * pura. La copia de TypeScript existe **sólo para que el número aparezca sin
 * señal**, en la fila optimista que la cola todavía no ha subido. Si alguna vez
 * discrepan, la que está mal es ésta.
 */

import type { Json } from '@/types/database'
import type { Opcion } from '@/lib/cartera/catalogos'
import type { HallazgoEnCartera } from '@/lib/queries/hallazgos'

/** Por encima de estos puntos, el proceso se audita dos veces al año. */
export const UMBRAL_PUNTOS = 5

/** El techo del formato. No hay un tercer escalón. */
export const AUDITORIAS_MAXIMAS = 2

export function puntosDe(valor: number, ncPrevias: number): number {
  return valor * ncPrevias
}

export function auditoriasDe(valor: number, ncPrevias: number): number {
  return puntosDe(valor, ncPrevias) <= UMBRAL_PUNTOS ? 1 : AUDITORIAS_MAXIMAS
}

/**
 * El valor de un proceso, tal como lo nombra la leyenda del formato.
 *
 * ⚠️ **Se guarda, no se deriva.** Nuestro `procesos.tipo` es
 * `estrategico/operativo/soporte` y el del formato es «del servicio» vs «de
 * soporte»: en el ejemplo de la firma, Compras y Transporte valen 1 aunque en
 * muchos SGC serían operativos, y el propio proceso de SGC vale 1 aunque
 * gobierne todo. Es un juicio de la firma sobre ese cliente.
 */
export const VALORES_PROCESO: readonly Opcion[] = [
  { valor: '2', etiqueta: 'Del servicio', tono: 'info' },
  { valor: '1', etiqueta: 'De soporte', tono: 'neutro' },
]

/** Lo que la pantalla PROPONE al añadir un proceso. El consultor decide. */
export function valorSugerido(tipoProceso: string | null | undefined): number {
  return tipoProceso === 'operativo' ? 2 : 1
}

/**
 * ⚠️ El formato sólo distingue interna de externa, y `auditorias.tipo` tiene
 * cinco valores. Una de certificación y una de proveedor son las dos «externa»
 * en este papel: se mapea al imprimir, no se guarda dos veces.
 */
export const MODALIDADES_PROGRAMA: readonly Opcion[] = [
  { valor: 'interna', etiqueta: 'Interna', tono: 'exito' },
  { valor: 'externa', etiqueta: 'Externa', tono: 'info' },
]

export const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const

export type MesPlaneado = { mes: number; modalidad: 'interna' | 'externa' }

/**
 * Lee la columna `meses` sin poder reventar.
 *
 * ⚠️ **Nunca lanza y nunca devuelve `undefined`.** Es un `jsonb` que viene de la
 * base, y la parrilla se pinta **en bucle**: un solo renglón con una forma rara
 * se llevaría el programa entero por delante, no ese renglón. Es la misma
 * trampa heredada que `TIPOS_HALLAZGO[...]` sin valor por defecto. La base ya
 * valida la forma con un CHECK; esto es el cinturón del lado del navegador.
 */
export function mesesDe(crudo: Json | null | undefined): MesPlaneado[] {
  if (!Array.isArray(crudo)) return []

  const salida: MesPlaneado[] = []

  for (const dato of crudo) {
    if (typeof dato !== 'object' || dato === null || Array.isArray(dato)) continue

    const fila = dato as Record<string, unknown>
    const mes = Number(fila.mes)
    const modalidad = fila.modalidad

    if (!Number.isInteger(mes) || mes < 1 || mes > 12) continue
    if (modalidad !== 'interna' && modalidad !== 'externa') continue

    salida.push({ mes, modalidad })
  }

  return salida
}

/** Marca, desmarca o cambia la modalidad de un mes. Devuelve la lista ordenada. */
export function alternarMes(
  meses: readonly MesPlaneado[],
  mes: number,
  modalidad: 'interna' | 'externa',
): MesPlaneado[] {
  const puesto = meses.find((m) => m.mes === mes)

  // Volver a pulsar la misma modalidad lo quita; pulsar la otra lo cambia.
  const resto = meses.filter((m) => m.mes !== mes)
  if (puesto && puesto.modalidad === modalidad) return [...resto].sort((a, b) => a.mes - b.mes)

  return [...resto, { mes, modalidad }].sort((a, b) => a.mes - b.mes)
}

/**
 * Cuántas NC documentadas tiene cada proceso de un cliente en un año.
 *
 * ⚠️ **Se calcula EN MEMORIA sobre `hallazgosDeLaCartera()`**, que es la lista
 * que el tablero del lunes ya baja: ni una clave de caché nueva, igual que los
 * widgets del tablero. Una consulta propia sería otra clave que puede faltar.
 *
 * ⚠️ **Sólo `nc_mayor` y `nc_menor`.** Una observación no es una no conformidad
 * —`P-SG-03` §3 lo dice— y una conformidad menos. Es la misma lista que
 * `TIPOS_QUE_EXIGEN_ACCION`.
 *
 * ⚠️ **Los anulados no cuentan.** Anular es que el auditor se equivocó: subirle
 * la frecuencia a un proceso por una NC que nunca existió sería cobrarle al
 * cliente una auditoría de más.
 *
 * ⚠️ Y el año sale de `auditoria.fecha_inicio`, no de `detectado_en`: una
 * auditoría de diciembre que se cierra en enero pertenece al programa del año en
 * que se hizo.
 */
export function contarNcPorProceso(
  hallazgos: readonly HallazgoEnCartera[],
  orgId: string,
  anio: number,
): Map<string, number> {
  const conteo = new Map<string, number>()

  for (const hallazgo of hallazgos) {
    if (hallazgo.org_id !== orgId) continue
    if (hallazgo.tipo !== 'nc_mayor' && hallazgo.tipo !== 'nc_menor') continue
    if (hallazgo.estado === 'anulado') continue
    if (!hallazgo.proceso_id) continue

    // ⚠️ `slice(0, 4)` y no `new Date(...).getFullYear()`: `fecha_inicio` es una
    // columna `date` y el constructor la corre un día en México — el 1 de enero
    // se contaría en el año anterior (CLAUDE.md · Trampas heredadas).
    const inicio = hallazgo.auditoria?.fecha_inicio
    if (!inicio || Number(inicio.slice(0, 4)) !== anio) continue

    conteo.set(hallazgo.proceso_id, (conteo.get(hallazgo.proceso_id) ?? 0) + 1)
  }

  return conteo
}
