/**
 * Los catálogos de los sistemas de gestión [Fase 02], en un solo archivo.
 *
 * ⚠️ TRAMPA HEREDADA — CLAUDE.md. **Un catálogo indexado por un valor que viene
 * de la base nunca devuelve `undefined`.** Se lee siempre con `etiquetaDe()` y
 * `tonoDe()` de `lib/cartera/catalogos.ts`, que degradan enseñando el valor
 * crudo. Una matriz de requisitos pinta cientos de filas en bucle: un solo
 * estado inesperado se llevaría la pantalla entera, no una fila.
 *
 * ⚠️ Estas listas son la traducción a TypeScript de los `CHECK` de
 * `20260822120000_sistemas_de_gestion.sql`. **Si cambia un CHECK, cambia esta
 * lista en el mismo commit.**
 */

import type { Opcion } from '@/lib/cartera/catalogos'

// ═══════════════════════════════════════════════════════════════ procesos ══

/** `procesos.tipo` — las tres familias del mapa de procesos. */
export const TIPOS_PROCESO: readonly Opcion[] = [
  { valor: 'estrategico', etiqueta: 'Estratégico', tono: 'info' },
  { valor: 'operativo',   etiqueta: 'Operativo',   tono: 'exito' },
  { valor: 'soporte',     etiqueta: 'Soporte' },
]

// ════════════════════════════════════════════════════ control documental ══

/** `documentos.tipo` — la pirámide documental de un SGC. */
export const TIPOS_DOCUMENTO: readonly Opcion[] = [
  { valor: 'manual',        etiqueta: 'Manual' },
  { valor: 'procedimiento', etiqueta: 'Procedimiento' },
  { valor: 'instructivo',   etiqueta: 'Instructivo' },
  { valor: 'formato',       etiqueta: 'Formato' },
  { valor: 'registro',      etiqueta: 'Registro' },
  { valor: 'politica',      etiqueta: 'Política' },
  { valor: 'plan',          etiqueta: 'Plan' },
  { valor: 'externo',       etiqueta: 'Externo' },
]

/** `documentos.estado` — el del documento, no el de la versión. */
export const ESTADOS_DOCUMENTO: readonly Opcion[] = [
  { valor: 'en_elaboracion', etiqueta: 'En elaboración', tono: 'advertencia' },
  { valor: 'vigente',        etiqueta: 'Vigente',        tono: 'exito' },
  { valor: 'obsoleto',       etiqueta: 'Obsoleto',       tono: 'neutro' },
]

/**
 * `documento_versiones.estado` — **el ciclo de vida, y en este orden**.
 *
 * ⚠️ El orden no es cosmético: `siguienteEstadoVersion()` lo recorre para saber
 * qué botón ofrecer. Y `aprobado` no es el final del camino: `obsoleto` llega
 * solo, cuando se aprueba la versión siguiente, y **lo escribe la base**
 * (`jubilar_version_anterior()`), nunca una persona.
 */
export const ESTADOS_VERSION: readonly Opcion[] = [
  { valor: 'borrador',    etiqueta: 'Borrador',    tono: 'neutro' },
  { valor: 'en_revision', etiqueta: 'En revisión', tono: 'advertencia' },
  { valor: 'aprobado',    etiqueta: 'Aprobado',    tono: 'exito' },
  { valor: 'obsoleto',    etiqueta: 'Obsoleto',    tono: 'neutro' },
]

/**
 * A qué estado se puede mover una versión, y con qué palabra en el botón.
 *
 * `null` cuando no hay siguiente: una versión aprobada sólo se jubila al
 * aprobarse la próxima, y una obsoleta ya no se mueve. Es exactamente lo que
 * impide `proteger_version_aprobada()` en la base — aquí sólo se deja de pintar
 * un botón que terminaría en error.
 */
export function siguienteEstadoVersion(
  estado: string,
): { valor: string; verbo: string } | null {
  if (estado === 'borrador') return { valor: 'en_revision', verbo: 'Mandar a revisión' }
  if (estado === 'en_revision') return { valor: 'aprobado', verbo: 'Aprobar' }
  return null
}

/** `documento_versiones.origen_markdown` — de dónde salió, y cuánto fiarse. */
export const ORIGENES_MARKDOWN: readonly Opcion[] = [
  { valor: 'docx',    etiqueta: 'Convertido de Word' },
  { valor: 'pdf',     etiqueta: 'Extraído de un PDF', tono: 'advertencia' },
  { valor: 'escrito', etiqueta: 'Escrito en la app',  tono: 'exito' },
]

// ══════════════════════════════════════════════════════════════ requisitos ══

/**
 * `requisitos.estado` — **la escala de madurez de la matriz**.
 *
 * ⚠️ El orden es el avance, y de él sale el porcentaje que el cliente pide en
 * cada reunión: `avanceDeRequisitos()` lo pondera con `PESO_REQUISITO`. Cambiar
 * el orden cambia el número que se enseña en una junta.
 *
 * ⚠️ `no_aplica` **exige justificación**, y lo impone la base (el CHECK
 * `requisitos_no_aplica_justificado`). Es el primer punto que revisa un auditor
 * de certificación. Tarea `C02` del dueño: si en la firma les dicen de otra
 * manera, se cambia antes de capturar mil requisitos.
 */
export const ESTADOS_REQUISITO: readonly Opcion[] = [
  { valor: 'no_iniciado',  etiqueta: 'No iniciado',  tono: 'neutro' },
  { valor: 'documentado',  etiqueta: 'Documentado',  tono: 'info' },
  { valor: 'implementado', etiqueta: 'Implementado', tono: 'advertencia' },
  { valor: 'evidenciado',  etiqueta: 'Evidenciado',  tono: 'exito' },
  { valor: 'no_aplica',    etiqueta: 'No aplica',    tono: 'neutro' },
]

/**
 * Cuánto cuenta cada estado para el avance, de 0 a 1.
 *
 * ⚠️ **`no_aplica` no aparece aquí a propósito: no cuenta ni a favor ni en
 * contra.** Se saca del denominador. Una cláusula que no aplica —«no diseñamos
 * producto»— no es un pendiente, y contarla como cero haría que un cliente
 * perfectamente conforme nunca llegara al 100 %.
 */
export const PESO_REQUISITO: Readonly<Record<string, number>> = {
  no_iniciado: 0,
  documentado: 0.34,
  implementado: 0.67,
  evidenciado: 1,
}

/**
 * El porcentaje de avance de un conjunto de requisitos, de 0 a 100.
 *
 * Devuelve `0` con la lista vacía, **nunca `NaN`**: el número se pinta en una
 * barra y en un texto, y un `NaN%` en la pantalla de un cliente es peor que un
 * cero honesto.
 */
export function avanceDeRequisitos(estados: readonly string[]): number {
  const cuentan = estados.filter((e) => e !== 'no_aplica')
  if (cuentan.length === 0) return 0

  const suma = cuentan.reduce((total, estado) => total + (PESO_REQUISITO[estado] ?? 0), 0)
  return Math.round((suma / cuentan.length) * 100)
}

// ═════════════════════════════════════════════ riesgos · indicadores ══

export const TIPOS_RIESGO: readonly Opcion[] = [
  { valor: 'riesgo',      etiqueta: 'Riesgo',      tono: 'advertencia' },
  { valor: 'oportunidad', etiqueta: 'Oportunidad', tono: 'info' },
]

export const TRATAMIENTOS_RIESGO: readonly Opcion[] = [
  { valor: 'evitar',      etiqueta: 'Evitar' },
  { valor: 'mitigar',     etiqueta: 'Mitigar' },
  { valor: 'transferir',  etiqueta: 'Transferir' },
  { valor: 'aceptar',     etiqueta: 'Aceptar' },
  { valor: 'explotar',    etiqueta: 'Explotar' },
]

/**
 * El semáforo de un riesgo por su `nivel` (probabilidad × impacto, de 1 a 25).
 *
 * Los cortes son los de la matriz 5×5 de siempre: hasta 4 bajo, hasta 9 medio,
 * hasta 15 alto, de ahí arriba extremo.
 */
export function nivelDeRiesgo(nivel: number): Opcion {
  if (nivel >= 16) return { valor: 'extremo', etiqueta: 'Extremo', tono: 'error' }
  if (nivel >= 10) return { valor: 'alto',    etiqueta: 'Alto',    tono: 'error' }
  if (nivel >= 5)  return { valor: 'medio',   etiqueta: 'Medio',   tono: 'advertencia' }
  return { valor: 'bajo', etiqueta: 'Bajo', tono: 'exito' }
}

export const SENTIDOS_INDICADOR: readonly Opcion[] = [
  { valor: 'mayor_mejor', etiqueta: 'Más es mejor' },
  { valor: 'menor_mejor', etiqueta: 'Menos es mejor' },
]

export const FRECUENCIAS_INDICADOR: readonly Opcion[] = [
  { valor: 'mensual',    etiqueta: 'Mensual' },
  { valor: 'trimestral', etiqueta: 'Trimestral' },
  { valor: 'semestral',  etiqueta: 'Semestral' },
  { valor: 'anual',      etiqueta: 'Anual' },
]

/**
 * Si una medición cumple la meta.
 *
 * ⚠️ Sin `sentido` esto no se puede contestar: un 3 % de rechazos con meta 2 %
 * está fuera, y un 3 % de satisfacción con meta 2 % está dentro. Devuelve `null`
 * cuando el indicador no tiene meta —hay indicadores que sólo se observan— y la
 * pantalla pinta un guion, no un semáforo apagado que parece rojo.
 */
export function cumpleLaMeta(
  valor: number,
  meta: number | null,
  sentido: string,
): boolean | null {
  if (meta === null) return null
  return sentido === 'menor_mejor' ? valor <= meta : valor >= meta
}

// ═════════════════════════════════════════════════════════════ adjuntos ══

/** `adjuntos.subido_desde` */
export const ORIGENES_ADJUNTO: readonly Opcion[] = [
  { valor: 'app',    etiqueta: 'Desde la app' },
  { valor: 'portal', etiqueta: 'Desde el portal del cliente', tono: 'info' },
  { valor: 'correo', etiqueta: 'Por correo', tono: 'info' },
]
