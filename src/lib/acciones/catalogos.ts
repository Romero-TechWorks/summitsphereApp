/**
 * Los catálogos del ciclo de acciones [F04·B1], en un solo archivo.
 *
 * ⚠️ TRAMPA HEREDADA — CLAUDE.md. **Un catálogo indexado por un valor que viene
 * de la base nunca devuelve `undefined`.** Se lee siempre con `etiquetaDe()` y
 * `tonoDe()`, que degradan enseñando el valor crudo.
 *
 * ⚠️ Estas listas son la traducción a TypeScript de los `CHECK` de
 * `20260908120000_acciones_y_ciclo_de_mejora.sql`. **Si cambia un CHECK, cambia
 * esta lista en el mismo commit.**
 */

import type { Opcion } from '@/lib/cartera/catalogos'

/**
 * `acciones.tipo` — los cuatro los confirman **tres fuentes independientes**:
 * `P-SG-05` §5.3 (corrección), §5.5 (correctiva), la columna `PREV / CORR` del
 * `F-SG-17` (preventiva) y el `F-SG-16` (mejora).
 */
export const TIPOS_ACCION: readonly Opcion[] = [
  { valor: 'correccion',        etiqueta: 'Corrección inmediata' },
  { valor: 'accion_correctiva', etiqueta: 'Acción correctiva' },
  { valor: 'preventiva',        etiqueta: 'Preventiva' },
  { valor: 'mejora',            etiqueta: 'Mejora' },
]

/**
 * La distinción que la norma exige y que el papel de la firma ya dibuja: el
 * `F-SG-06` tiene «Acción inmediata» y «Acciones correctivas» en dos bloques
 * separados **por el análisis de causa**.
 *
 * Se pinta al elegir el tipo, no en un manual: es lo que hace que dos personas
 * clasifiquen igual. Misma decisión que `CRITERIO_HALLAZGO`.
 */
export const CRITERIO_ACCION: Readonly<Record<string, string>> = {
  correccion:
    'Apagar el fuego. Contiene el problema mientras se determina por qué pasó — reemitir la factura, retirar el lote, poner el extintor. Lleva su propia fecha de vencimiento (P-SG-02 §5.2b).',
  accion_correctiva:
    'Que no vuelva a pasar. Ataca la causa raíz que salió del análisis, no el síntoma. Es la que un certificador revisa (ISO 9001 §10.2).',
  preventiva:
    'Se anticipa a un problema que todavía no ocurrió. Nace de un riesgo, no de una no conformidad.',
  mejora:
    'No corrige nada: mejora algo que ya funciona. Puede nacer sola, sin hallazgo.',
}

/**
 * `acciones.estado`
 *
 * ⚠️ **Los cinco son NUESTROS, y son más finos que los del cliente.** El
 * `F-SG-17` sólo tiene `ABIERTA` / `CERRADA` más un porcentaje. Los cinco se
 * quedan porque el seguimiento diario los necesita, pero **al reportarle al
 * cliente hay que colapsarlos** — para eso está `estadoParaElCliente()`.
 *
 * ⚠️ `cancelada` no es «borrada»: una acción que se decidió no ejecutar explica
 * por qué la NC sigue abierta, y el CHECK exige el motivo.
 */
export const ESTADOS_ACCION: readonly Opcion[] = [
  { valor: 'abierta',       etiqueta: 'Abierta',        tono: 'info' },
  { valor: 'en_proceso',    etiqueta: 'En proceso',     tono: 'advertencia' },
  { valor: 'por_verificar', etiqueta: 'Por verificar',  tono: 'advertencia' },
  { valor: 'cerrada',       etiqueta: 'Cerrada',        tono: 'exito' },
  { valor: 'cancelada',     etiqueta: 'Cancelada',      tono: 'neutro' },
]

/** Lo que los listados esconden por defecto, igual que en la cartera. */
export const ESTADOS_ARCHIVADOS_ACCION: readonly string[] = ['cerrada', 'cancelada']

/** Las que siguen pidiendo trabajo. Es por lo que filtra el widget del tablero. */
export const ESTADOS_ABIERTOS_ACCION: readonly string[] = [
  'abierta', 'en_proceso', 'por_verificar',
]

/**
 * Lo que el `F-SG-17` del cliente sabe leer: dos estados y nada más.
 * `P-SG-05` §6.2 — el reporte al cliente colapsa; el seguimiento interno no.
 */
export function estadoParaElCliente(estado: string): 'ABIERTA' | 'CERRADA' {
  return estado === 'cerrada' || estado === 'cancelada' ? 'CERRADA' : 'ABIERTA'
}

/**
 * `acciones.eficacia_resultado`
 *
 * ⚠️ **Sólo `eficaz` cierra la acción**, y lo impone un CHECK de la base.
 * `parcial` sigue abierta; y `no_eficaz` **no reabre nada** — `P-SG-05` §5.7
 * manda levantar una NC NUEVA enlazada con `nc_origen_id`, porque si el
 * incumplimiento se repite las acciones no sirvieron y eso es un hecho aparte.
 */
export const RESULTADOS_EFICACIA: readonly Opcion[] = [
  { valor: 'eficaz',     etiqueta: 'Eficaz',      tono: 'exito' },
  { valor: 'parcial',    etiqueta: 'Parcial',     tono: 'advertencia' },
  { valor: 'no_eficaz',  etiqueta: 'No eficaz',   tono: 'error' },
]

/** `hallazgos.causa_metodo` */
export const METODOS_CAUSA: readonly Opcion[] = [
  { valor: 'cinco_porques', etiqueta: '5 ¿Por qué?' },
  { valor: 'ishikawa',      etiqueta: 'Ishikawa (6M)' },
  { valor: 'otro',          etiqueta: 'Otro' },
]

/** `quejas.tipo` — las dos ramas de `P-SG-07`, con destinos distintos. */
export const TIPOS_QUEJA: readonly Opcion[] = [
  { valor: 'queja',      etiqueta: 'Queja' },
  { valor: 'sugerencia', etiqueta: 'Sugerencia' },
]

/** `planes_mejora.estado` y `cambios_sgc.estado`. */
export const ESTADOS_PLAN_MEJORA: readonly Opcion[] = [
  { valor: 'borrador', etiqueta: 'Borrador', tono: 'neutro' },
  { valor: 'aprobado', etiqueta: 'Aprobado', tono: 'exito' },
  { valor: 'cerrado',  etiqueta: 'Cerrado',  tono: 'info' },
]

export const ESTADOS_CAMBIO_SGC: readonly Opcion[] = [
  { valor: 'borrador',    etiqueta: 'Borrador',    tono: 'neutro' },
  { valor: 'en_revision', etiqueta: 'En revisión', tono: 'advertencia' },
  { valor: 'autorizado',  etiqueta: 'Autorizado',  tono: 'exito' },
  { valor: 'rechazado',   etiqueta: 'Rechazado',   tono: 'error' },
  { valor: 'cerrado',     etiqueta: 'Cerrado',     tono: 'info' },
]

/**
 * ⚠️ **Los cinco pares del F-SG-07 son lo que cabe en la hoja, no un límite.**
 * La metodología dice «pregunta hasta que dejes de aprender», y **menos de cinco
 * es lo normal**: la pantalla no los exige. Si un análisis necesita siete, se
 * guardan siete y al imprimir se continúa.
 */
export const PORQUES_SUGERIDOS = 5

/** Un renglón del análisis: el «por qué», su respuesta y **su propia evidencia**. */
export type Porque = {
  n: number
  pregunta: string
  respuesta: string
  evidencia: string
}

/**
 * La forma de `hallazgos.causa_analisis`, que fija el `F-SG-07` §3.
 *
 * ⚠️ **Pregunta y respuesta van separadas aunque el papel dé una sola celda.**
 * Cada «por qué» interroga la respuesta anterior, y con un único campo de texto
 * la gente escribe cinco causas sueltas en vez de una cadena. Al imprimir se
 * vuelven a juntar con un guion, para que el documento salga idéntico al que el
 * cliente conoce.
 */
export type AnalisisCausa = {
  metodo: string
  participantes: string
  porques: Porque[]
}

/**
 * Lee el jsonb sin confiar en él. Lo escribió una versión anterior de la app, o
 * un `update` a mano, o la migración de otro cliente: **nunca lanza**, porque
 * quien lo llama pinta una ficha y una excepción aquí se lleva la pantalla.
 */
export function leerAnalisis(valor: unknown): AnalisisCausa {
  const vacio: AnalisisCausa = { metodo: 'cinco_porques', participantes: '', porques: [] }
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return vacio

  const obj = valor as Record<string, unknown>
  const crudos = Array.isArray(obj.porques) ? obj.porques : []

  return {
    metodo: typeof obj.metodo === 'string' ? obj.metodo : 'cinco_porques',
    participantes: typeof obj.participantes === 'string' ? obj.participantes : '',
    porques: crudos.flatMap((fila, indice): Porque[] => {
      if (typeof fila !== 'object' || fila === null) return []
      const f = fila as Record<string, unknown>
      return [{
        n: typeof f.n === 'number' ? f.n : indice + 1,
        pregunta: typeof f.pregunta === 'string' ? f.pregunta : '',
        respuesta: typeof f.respuesta === 'string' ? f.respuesta : '',
        evidencia: typeof f.evidencia === 'string' ? f.evidencia : '',
      }]
    }),
  }
}

/** Un renglón vale la pena guardarlo si tiene pregunta o respuesta. */
export function porqueEscrito(p: Porque): boolean {
  return p.pregunta.trim() !== '' || p.respuesta.trim() !== ''
}

/**
 * El avance de una no conformidad es **el promedio del avance de sus acciones**
 * (`F-SG-17`, renglón `PROMEDIO DE AVANCE` de cada bloque).
 *
 * ⚠️ **Se calcula en memoria, no en la base**, por lo mismo que el tablero del
 * lunes y los widgets: es una agregación sobre una lista que la caché ya tiene,
 * y una vista sería otra clave que puede faltar sin señal.
 *
 * Las canceladas no cuentan: una acción que se decidió no ejecutar no arrastra
 * el promedio hacia abajo eternamente.
 */
export function avancePromedio(acciones: readonly { estado: string; avance_pct: number }[]): number | null {
  const cuentan = acciones.filter((a) => a.estado !== 'cancelada')
  if (cuentan.length === 0) return null
  return Math.round(cuentan.reduce((suma, a) => suma + a.avance_pct, 0) / cuentan.length)
}

/**
 * El folio que se enseña.
 *
 * ⚠️ **Manda el del cliente cuando existe.** `AC-FA-01-25` es el número que su
 * Coordinador del SGC escribe en el `F-SG-17` y el que va a buscar cuando llame;
 * `ACC-2026-105` es el nuestro, para el expediente. Enseñar el nuestro primero
 * obligaría a traducir en cada conversación.
 */
export function folioDeAccion(accion: { folio: string; folio_cliente: string | null }): string {
  return accion.folio_cliente ?? accion.folio
}
