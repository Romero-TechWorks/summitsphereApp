/**
 * Los catálogos de capacitación [F05·B3].
 *
 * ⚠️ Traducción a TypeScript de los `CHECK` de
 * `20260924120000_capacitacion.sql`. **Si cambia un CHECK, cambia esta lista en
 * el mismo commit.** Se leen con `etiquetaDe()`/`tonoDe()`, que degradan
 * enseñando el valor crudo (CLAUDE.md · trampas heredadas).
 *
 * ⚠️ **Summit NO emite DC-3** (`F03`, 23 sep 2026): los expide el agente
 * capacitador externo que imparte el curso. Aquí no hay formato oficial ni
 * generador; hay **el estado de la constancia de cada asistente** y **la lista
 * que se le manda al proveedor para que la expida**.
 */

import type { Opcion } from '@/lib/cartera/catalogos'

/** `cursos.tipo` */
export const TIPOS_CURSO: readonly Opcion[] = [
  { valor: 'normatividad',    etiqueta: 'Normatividad STPS' },
  { valor: 'brigada',         etiqueta: 'Brigada' },
  { valor: 'sistema_gestion', etiqueta: 'Sistema de gestión' },
  { valor: 'otro',            etiqueta: 'Otro' },
]

/** `cursos.modalidad` */
export const MODALIDADES: readonly Opcion[] = [
  { valor: 'presencial', etiqueta: 'Presencial' },
  { valor: 'en_linea',   etiqueta: 'En línea' },
  { valor: 'mixta',      etiqueta: 'Mixta' },
]

/** `sesiones.estado` */
export const ESTADOS_SESION: readonly Opcion[] = [
  { valor: 'programada', etiqueta: 'Programada', tono: 'info' },
  { valor: 'impartida',  etiqueta: 'Impartida',  tono: 'exito' },
  { valor: 'cancelada',  etiqueta: 'Cancelada' },
]

/**
 * El umbral de aprobación: **80 %** (`SGI-P-RH-01` §5.4). ⚠️ Quien no llega **no
 * reprueba**: se le programa un reforzamiento, y mientras tanto no se le pide
 * DC-3 al proveedor.
 */
export const UMBRAL_APROBACION = 80

/** El estado del DC-3 de un asistente. Se DERIVA, no se guarda. */
export const ESTADOS_DC3: readonly Opcion[] = [
  { valor: 'recibido',      etiqueta: 'DC-3 recibido',  tono: 'exito' },
  { valor: 'pendiente',     etiqueta: 'DC-3 pendiente', tono: 'advertencia' },
  { valor: 'reforzamiento', etiqueta: 'Reforzamiento',  tono: 'info' },
  { valor: 'no_asistio',    etiqueta: 'No asistió' },
]

export function estadoDc3(a: {
  asistio: boolean
  calificacion: number | null
  folio_dc3: string | null
}): string {
  if (!a.asistio) return 'no_asistio'
  if (a.folio_dc3) return 'recibido'
  if (a.calificacion != null && a.calificacion < UMBRAL_APROBACION) return 'reforzamiento'
  return 'pendiente'
}

/**
 * ⚠️ **Copia del CHECK de `asistentes.curp`**, para que el error salga en el
 * campo y no como un 23514 desde la cola. La base es la autoridad.
 */
export const FORMATO_CURP = /^[A-Z]{4}[0-9]{6}[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9][0-9]$/

/** Mayúsculas y sin espacios: así se dicta una CURP y así la guarda la base. */
export function normalizarCurp(texto: string): string {
  return texto.toUpperCase().replace(/\s+/g, '')
}

/**
 * ⚠️ **La advertencia de datos personales** (decisión 6 del dueño, hueco 42):
 * la CURP es un dato personal. Corta y sin bloquear.
 */
export const AVISO_CURP =
  'La CURP es un dato personal: se guarda sólo porque el DC-3 la lleva y el proveedor la pide. Captúrala si el cliente lo autorizó.'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const

export function nombreDeMes(mes: number): string {
  return MESES[mes - 1] ?? String(mes)
}

// ══════════════════════════════════════════════ la solicitud al proveedor ══

export type FilaSolicitud = {
  nombre: string
  curp: string | null
  puesto: string | null
  ocupacion: string | null
  calificacion: number | null
}

export type DatosSolicitud = {
  empresa: string
  rfcEmpresa: string | null
  curso: string
  duracionHoras: number | null
  fechaInicio: string
  fechaFin: string
  instructor: string | null
  proveedor: string | null
  registroStps: string | null
}

/** Un campo de CSV: entre comillas si hace falta, con las comillas dobladas. */
function campo(valor: string | number | null | undefined): string {
  const texto = valor == null ? '' : String(valor)
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/**
 * **La solicitud de DC-3**: lo que se le manda al agente capacitador externo
 * para que expida las constancias (respuesta 3 de Summit: una lista genérica).
 *
 * Lleva lo que cualquier agente pide para llenar un DC-3: los datos del
 * trabajador, de la empresa, del curso y del propio agente. Una fila por
 * trabajador, con los datos repetidos: es lo que se pega en cualquier formato
 * de proveedor sin reacomodar nada.
 *
 * ⚠️ **Con BOM y fechas `YYYY-MM-DD`**: sin el BOM, Excel abre los acentos como
 * «LÃ³pez»; y una fecha `dd/mm/aaaa` la reinterpreta según la configuración de
 * la computadora de quien la abre. Se construye en el navegador, así que sale
 * igual sin señal.
 */
export function solicitudCsv(datos: DatosSolicitud, filas: readonly FilaSolicitud[]): string {
  const encabezado = [
    'Nombre', 'CURP', 'Puesto', 'Ocupación específica', 'Calificación',
    'Empresa', 'RFC de la empresa', 'Curso', 'Duración (horas)',
    'Fecha de inicio', 'Fecha de término', 'Instructor',
    'Agente capacitador', 'Registro STPS del agente',
  ]

  const renglones = filas.map((f) => [
    f.nombre, f.curp, f.puesto, f.ocupacion, f.calificacion,
    datos.empresa, datos.rfcEmpresa, datos.curso, datos.duracionHoras,
    datos.fechaInicio, datos.fechaFin, datos.instructor,
    datos.proveedor, datos.registroStps,
  ].map(campo).join(','))

  return '\uFEFF' + [encabezado.map(campo).join(','), ...renglones].join('\r\n')
}

/** Descarga un texto como archivo. Sin red: es un `Blob` en el navegador. */
export function descargarTexto(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
