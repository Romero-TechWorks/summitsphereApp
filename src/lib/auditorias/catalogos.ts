/**
 * Los catálogos de las auditorías [Fase 03], en un solo archivo.
 *
 * ⚠️ TRAMPA HEREDADA — CLAUDE.md. **Un catálogo indexado por un valor que viene
 * de la base nunca devuelve `undefined`.** Aquí pesa más que en ningún otro
 * dominio: una pantalla de auditoría pinta cuarenta hallazgos **en bucle**, y en
 * JDM Built un solo registro con un tipo inesperado no rompía su fila — rompía
 * las cuarenta. El auditor no veía «un hallazgo raro», veía la página de error y
 * ninguno de sus hallazgos. Se lee siempre con `etiquetaDe()` y `tonoDe()`, que
 * degradan enseñando el valor crudo.
 *
 * ⚠️ Estas listas son la traducción a TypeScript de los `CHECK` de
 * `20260824120000_auditorias_y_hallazgos.sql`. **Si cambia un CHECK, cambia esta
 * lista en el mismo commit.**
 */

import type { Opcion } from '@/lib/cartera/catalogos'

/** `auditorias.tipo` — los cinco encargos que la firma hace de verdad. */
export const TIPOS_AUDITORIA: readonly Opcion[] = [
  { valor: 'interna',                       etiqueta: 'Interna' },
  { valor: 'preauditoria',                  etiqueta: 'Preauditoría' },
  { valor: 'seguimiento',                   etiqueta: 'Seguimiento' },
  { valor: 'certificacion_acompanamiento',  etiqueta: 'Acompañamiento a certificación' },
  { valor: 'proveedor',                     etiqueta: 'A proveedor' },
]

/**
 * `auditorias.estado`
 *
 * ⚠️ `cancelada` no es «borrada». Una auditoría que se planeó y no se hizo es
 * información: explica por qué el programa anual no se cumplió, y eso es justo
 * lo que un organismo certificador pregunta. La base no deja borrarla
 * (CLAUDE.md regla 13).
 */
export const ESTADOS_AUDITORIA: readonly Opcion[] = [
  { valor: 'planeada',   etiqueta: 'Planeada',   tono: 'info' },
  { valor: 'en_curso',   etiqueta: 'En curso',   tono: 'advertencia' },
  { valor: 'cerrada',    etiqueta: 'Cerrada',    tono: 'exito' },
  { valor: 'cancelada',  etiqueta: 'Cancelada',  tono: 'neutro' },
]

/** Lo que los listados esconden por defecto, igual que en la cartera. */
export const ESTADOS_ARCHIVADOS_AUDITORIA: readonly string[] = ['cerrada', 'cancelada']

/** `programa_auditorias.estado` */
export const ESTADOS_PROGRAMA: readonly Opcion[] = [
  { valor: 'borrador',  etiqueta: 'Borrador',  tono: 'neutro' },
  { valor: 'aprobado',  etiqueta: 'Aprobado',  tono: 'exito' },
  { valor: 'cerrado',   etiqueta: 'Cerrado',   tono: 'info' },
]

/**
 * `auditoria_equipo.papel`
 *
 * ⚠️ **No es lo mismo que `usuarios_organizaciones.papel`.** Aquél dice quién de
 * la firma toca el expediente del cliente y decide permisos; éste dice qué hizo
 * cada quien en *esta* auditoría, y se imprime en el informe junto a sus
 * certificaciones. Un mismo consultor puede ser `lider` del expediente y
 * `observador` de una auditoría concreta.
 */
export const PAPELES_AUDITOR: readonly Opcion[] = [
  { valor: 'lider',            etiqueta: 'Auditor líder',   tono: 'exito' },
  { valor: 'auditor',          etiqueta: 'Auditor' },
  { valor: 'experto_tecnico',  etiqueta: 'Experto técnico', tono: 'info' },
  { valor: 'observador',       etiqueta: 'Observador',      tono: 'neutro' },
]

/**
 * `auditoria_items.veredicto` — la lista de verificación [F03·B2].
 *
 * ⚠️ `pendiente` es un valor de verdad y no un `null`: dos maneras de decir
 * «todavía no lo miré» son dos maneras de contar mal el avance del recorrido, y
 * ese porcentaje es lo que el auditor mira para saber si le da tiempo.
 */
export const VEREDICTOS_ITEM: readonly Opcion[] = [
  { valor: 'pendiente',    etiqueta: 'Pendiente' },
  { valor: 'conforme',     etiqueta: 'Conforme',     tono: 'exito' },
  { valor: 'no_conforme',  etiqueta: 'No conforme',  tono: 'error' },
  { valor: 'observacion',  etiqueta: 'Observación',  tono: 'advertencia' },
  { valor: 'no_aplica',    etiqueta: 'No aplica',    tono: 'neutro' },
]

/**
 * Los años que ofrece el selector del programa anual.
 *
 * Del año pasado al siguiente: un programa se captura a fin de año para el que
 * viene, y a veces hay que meter a mano el del año que ya corría cuando la firma
 * empezó a usar la app.
 */
export function aniosDelPrograma(hoy: number = new Date().getFullYear()): number[] {
  return [hoy - 1, hoy, hoy + 1]
}

/**
 * `hallazgos.tipo` — los cinco, y el orden es el de gravedad.
 *
 * ⚠️ **`conformidad` es un hallazgo de verdad**, no un relleno. Un informe que
 * sólo enumera lo que está mal no es una auditoría, es una lista de quejas: la
 * norma pide evidencia de lo que **sí** cumple, y es lo que el cliente enseña
 * cuando le preguntan por su sistema.
 */
export const TIPOS_HALLAZGO: readonly Opcion[] = [
  { valor: 'nc_mayor',            etiqueta: 'NC mayor',              tono: 'error' },
  { valor: 'nc_menor',            etiqueta: 'NC menor',              tono: 'advertencia' },
  { valor: 'observacion',         etiqueta: 'Observación',           tono: 'info' },
  { valor: 'oportunidad_mejora',  etiqueta: 'Oportunidad de mejora', tono: 'neutro' },
  { valor: 'conformidad',         etiqueta: 'Conformidad',           tono: 'exito' },
]

/** Los que abren un ciclo de acción correctiva. Una conformidad no. */
export const TIPOS_QUE_EXIGEN_ACCION: readonly string[] = ['nc_mayor', 'nc_menor']

/**
 * **Qué hace mayor a una no conformidad** — la ayuda contextual del clasificador.
 *
 * ⚠️ **Esto es texto de arranque, no el criterio de la firma.** La tarea del
 * dueño `D02` es entregarlo por escrito, y cuando llegue **se reemplaza aquí**.
 * Mientras tanto vale más un criterio general y defendible que un campo de ayuda
 * vacío: lo que hace que dos auditores clasifiquen igual es tener la regla
 * delante en el momento de decidir, no en un manual que nadie abre en la planta.
 */
export const CRITERIO_HALLAZGO: Readonly<Record<string, string>> = {
  nc_mayor:
    'Ausencia total de un requisito, falla sistémica o repetida, incumplimiento legal, ' +
    'o algo que pone en riesgo la seguridad de las personas o la conformidad del producto.',
  nc_menor:
    'El requisito existe y se aplica, pero falla en un punto aislado y no compromete al sistema.',
  observacion:
    'Cumple hoy, y hay una debilidad que puede convertirse en no conformidad si nadie la atiende.',
  oportunidad_mejora:
    'No incumple nada. Es una propuesta para hacerlo mejor, y el cliente decide si la toma.',
  conformidad:
    'Se verificó y cumple. Se registra con su evidencia: el informe también dice qué está bien.',
}

/**
 * El criterio de un tipo. **Nunca `undefined`**: un tipo que el código no conoce
 * devuelve una cadena vacía, no revienta la pantalla del clasificador.
 */
export function criterioDe(tipo: string | null | undefined): string {
  if (!tipo) return ''
  return CRITERIO_HALLAZGO[tipo] ?? ''
}

/**
 * `hallazgos.estado`
 *
 * ⚠️ **`anulado` no es «borrado».** Un hallazgo levantado por error se anula
 * **con motivo** —el CHECK de la base lo exige— y queda, con su historial. Es la
 * regla 13: lo que un organismo certificador viene a revisar es justamente qué se
 * levantó, qué se cambió y por qué.
 */
export const ESTADOS_HALLAZGO: readonly Opcion[] = [
  { valor: 'abierto',     etiqueta: 'Abierto',     tono: 'error' },
  { valor: 'en_accion',   etiqueta: 'En acción',   tono: 'advertencia' },
  { valor: 'verificado',  etiqueta: 'Verificado',  tono: 'info' },
  { valor: 'cerrado',     etiqueta: 'Cerrado',     tono: 'exito' },
  { valor: 'anulado',     etiqueta: 'Anulado',     tono: 'neutro' },
]

/** Los que siguen contando: el tablero del lunes es esto. */
export const ESTADOS_ABIERTOS_HALLAZGO: readonly string[] = ['abierto', 'en_accion', 'verificado']

/**
 * `hallazgos.fuente_nc` — **de dónde salió la no conformidad** [F04·B0 + B1].
 *
 * ⚠️ Los quince valores NO se inventaron: catorce salen de las nueve etapas que
 * `P-SG-05` §5.1 tabula y del catálogo documental del cliente, y cada uno tiene
 * un formato con nombre y número detrás. Cambiar esta lista sin cambiar el CHECK
 * de `hallazgos_fuente_valida` deja la pantalla ofreciendo un valor que la base
 * rechaza — y al revés, un valor que la base acepta y la pantalla no sabe pintar.
 *
 * ⚠️ **Las tres primeras exigen auditoría y las doce restantes la prohíben.** Lo
 * impone `hallazgos_fuente_coherente`, no la pantalla: el informe `F-SG-12` se
 * arma filtrando por `auditoria_id`, así que una NC de una queja con auditoría
 * saldría impresa como hallazgo de auditoría.
 */
export const FUENTES_NC: readonly Opcion[] = [
  { valor: 'auditoria_interna',       etiqueta: 'Auditoría interna' },
  { valor: 'auditoria_externa',       etiqueta: 'Auditoría externa' },
  { valor: 'auditoria_proveedor',     etiqueta: 'Auditoría a proveedor' },
  { valor: 'queja_cliente',           etiqueta: 'Queja de cliente' },
  { valor: 'servicio_no_conforme',    etiqueta: 'Servicio no conforme' },
  { valor: 'revision_direccion',      etiqueta: 'Revisión por la Dirección' },
  { valor: 'seguimiento_interno',     etiqueta: 'Seguimiento interno' },
  { valor: 'indicador',               etiqueta: 'Indicador bajo meta' },
  { valor: 'satisfaccion_cliente',    etiqueta: 'Satisfacción del cliente' },
  { valor: 'evaluacion_proveedor',    etiqueta: 'Evaluación de proveedor' },
  { valor: 'informacion_documentada', etiqueta: 'Información documentada' },
  { valor: 'capacitacion',            etiqueta: 'Capacitación' },
  { valor: 'incumplimiento_legal',    etiqueta: 'Incumplimiento legal' },
  { valor: 'incidente',               etiqueta: 'Incidente' },
  { valor: 'otro',                    etiqueta: 'Otra' },
]

/** Las tres que cuelgan de una auditoría. Es la partición del CHECK, en TS. */
export const FUENTES_DE_AUDITORIA: readonly string[] = [
  'auditoria_interna', 'auditoria_externa', 'auditoria_proveedor',
]

/**
 * La ayuda que se pinta al elegir la fuente, con el formato del cliente que la
 * respalda. Es la misma idea que `CRITERIO_HALLAZGO`: lo que hace que dos
 * personas clasifiquen igual no es un manual, es el texto que está a la vista
 * mientras se elige.
 */
export const CRITERIO_FUENTE: Readonly<Record<string, string>> = {
  queja_cliente:
    'La puso un cliente por teléfono, correo o en persona, y se determinó que procede. Va con su folio de queja (F-SG-08).',
  satisfaccion_cliente:
    'La encuesta de fin de proyecto quedó por debajo del objetivo. NO es una queja: nadie llamó a reclamar (F-SG-13).',
  servicio_no_conforme:
    'Un servicio salió fuera de los requisitos y se detectó después de entregarlo (P-SG-02 §5.1).',
  indicador:
    'Un indicador de proceso o un objetivo de calidad quedó por debajo de su meta (F-SG-15).',
  informacion_documentada:
    'Un procedimiento o un registro está desactualizado o falta.',
  capacitacion:
    'Personal sin la capacitación necesaria para las funciones que desempeña.',
  incumplimiento_legal:
    'Desviación en un parámetro o requisito de la legislación aplicable — NOM, licencia, dictamen o permiso.',
  revision_direccion:
    'Se detectó durante la Revisión por la Dirección (F-SG-18).',
  seguimiento_interno:
    'Salió del checklist de seguimiento interno (F-SG-26), no de una auditoría formal.',
  evaluacion_proveedor:
    'De la evaluación periódica de un proveedor, sin auditoría de por medio (P-CO-02).',
  incidente:
    'Un accidente, un cuasi-accidente o una emergencia.',
}

/**
 * Los tramos de antigüedad de un hallazgo abierto, del más urgente al menos.
 *
 * ⚠️ Vive aquí y no en la pantalla porque lo leen **dos**: el tablero del lunes
 * (`/auditorias?tab=hallazgos`) y el widget «Hallazgos abiertos» del tablero de
 * inicio. Con la lista duplicada, mover el corte de 90 días en una y no en la
 * otra deja al mismo hallazgo en dos tramos distintos según por dónde se mire —y
 * el consultor deja de creerle a los dos.
 */
export const TRAMOS_ANTIGUEDAD: readonly { hasta: number; etiqueta: string; corta: string }[] = [
  { hasta: 30,       etiqueta: 'Menos de 30 días',  corta: '< 30 d' },
  { hasta: 90,       etiqueta: 'De 30 a 90 días',   corta: '30-90 d' },
  { hasta: 180,      etiqueta: 'De 90 a 180 días',  corta: '90-180 d' },
  { hasta: Infinity, etiqueta: 'Más de 180 días',   corta: '> 180 d' },
]

/**
 * Cómo se lee un campo del historial de un hallazgo.
 *
 * ⚠️ Las claves son **nombres de columna** porque las escribe un trigger de la
 * base, no una pantalla. Un campo que el código no conozca se enseña con su
 * nombre crudo en vez de dejar el renglón sin etiqueta.
 */
export const CAMPOS_HISTORIAL: Readonly<Record<string, string>> = {
  tipo: 'Tipo',
  estado: 'Estado',
  clausula_id: 'Cláusula citada',
  descripcion: 'Descripción',
  evidencia_objetiva: 'Evidencia objetiva',
  requisito_incumplido: 'Requisito incumplido',
  fecha_compromiso: 'Fecha compromiso',
  responsable_contacto_id: 'Responsable del cliente',
  motivo_anulacion: 'Motivo de anulación',
  // F04·B0 — los escribe el trigger desde el 2 sep 2026.
  fuente_nc: 'Fuente de la NC',
  fuente_detalle: 'Detalle de la fuente',
  auditoria_id: 'Auditoría',
  // F04·B1
  aceptada: 'Aceptada por el auditado',
  causa_raiz: 'Causa raíz',
  nc_origen_id: 'NC de origen (reincidencia)',
}

export function campoDelHistorial(campo: string): string {
  return CAMPOS_HISTORIAL[campo] ?? campo
}
