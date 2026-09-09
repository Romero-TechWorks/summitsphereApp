/**
 * Las categorías de aviso [F04·B3].
 *
 * ⚠️ **SALEN DE LA MATRIZ DEL CLIENTE, NO DE LO QUE EL PLAN IMAGINÓ.** `P-SG-08`
 * §5.5 tabula qué se comunica, cuándo, a quién y quién comunica — doce renglones
 * con cadencias reales. El plan tenía seis categorías y fallaba en tres cosas
 * (hueco 27 del catálogo):
 *   · el cliente **no pide «resumen diario»**: vive en mensual, bimestral y por
 *     evento;
 *   · «acción por vencer» no está como evento — pide **«Estado de las NC»,
 *     bimestral**;
 *   · faltaban cuatro que sí pide.
 *
 * Se conservan las nuestras porque son criterio de Summit y sirven; lo que
 * cambió es que dejaron de ser las únicas.
 *
 * ⚠️ Esta lista es la traducción del CHECK de
 * `20260909120000_avisos_y_notificaciones.sql`. **Si cambia el CHECK, cambia
 * aquí en el mismo commit.**
 */

import type { Opcion } from '@/lib/cartera/catalogos'

/** De quién es cada categoría: de la firma o del procedimiento del cliente. */
export type OrigenCategoria = 'summit' | 'cliente'

export type CategoriaAviso = Opcion & {
  /** Cuándo se manda, en el lenguaje de la matriz. */
  cadencia: string
  origen: OrigenCategoria
  /** Qué gana quien la deja encendida. Se pinta al lado de la casilla. */
  ayuda: string
  /** `false` mientras no haya de dónde leerla — regla 11. */
  activa: boolean
}

export const CATEGORIAS_AVISO: readonly CategoriaAviso[] = [
  {
    valor: 'accion_por_vencer',
    etiqueta: 'Acción por vencer',
    cadencia: 'A 7, 3 y 1 día',
    origen: 'summit',
    ayuda: 'Te avisa de las acciones de las que eres responsable, antes de que venzan.',
    activa: true,
  },
  {
    valor: 'accion_vencida',
    etiqueta: 'Acción vencida',
    cadencia: 'Una vez, el día que vence',
    origen: 'summit',
    ayuda: 'Una sola vez. Un aviso que se repite todos los días se silencia, y con él los que sí importaban.',
    activa: true,
  },
  {
    valor: 'estado_nc_bimestral',
    etiqueta: 'Estado de las no conformidades',
    cadencia: 'Bimestral',
    origen: 'cliente',
    ayuda: 'El resumen de abiertas y cerradas que P-SG-08 pide comunicar al personal involucrado.',
    activa: true,
  },
  {
    valor: 'resumen_diario',
    etiqueta: 'Resumen de la mañana',
    cadencia: 'Diario',
    origen: 'summit',
    ayuda: 'Qué te vence hoy y esta semana. Si no tienes nada, no se manda.',
    activa: true,
  },
  {
    valor: 'hallazgo_asignado',
    etiqueta: 'Hallazgo asignado',
    cadencia: 'Por evento',
    origen: 'cliente',
    ayuda: 'Cuando se te asigna un hallazgo. P-SG-08 lo llama «Resultados de Auditorías».',
    activa: false,
  },
  {
    valor: 'queja_recibida',
    etiqueta: 'Queja de cliente recibida',
    cadencia: 'Por evento',
    origen: 'cliente',
    ayuda: 'P-SG-08 la dirige a Dirección y al Coordinador del SGC.',
    activa: false,
  },
  {
    valor: 'indicadores_mensual',
    etiqueta: 'Resultados de indicadores',
    cadencia: 'Mensual',
    origen: 'cliente',
    ayuda: 'Llega con la Fase 02, cuando haya mediciones de dónde leerlos.',
    activa: false,
  },
  {
    valor: 'satisfaccion_cliente',
    etiqueta: 'Satisfacción de clientes',
    cadencia: 'Por evento',
    origen: 'cliente',
    ayuda: 'Llega con la Fase 06, con la encuesta F-SG-13 del portal.',
    activa: false,
  },
  {
    valor: 'documento_publicado',
    etiqueta: 'Documento publicado o cambiado',
    cadencia: 'Ante aprobación y cambios',
    origen: 'cliente',
    ayuda: 'A los responsables de proceso, cuando se aprueba una versión.',
    activa: false,
  },
  {
    valor: 'documento_por_aprobar',
    etiqueta: 'Documento esperando aprobación',
    cadencia: 'Por evento',
    origen: 'summit',
    ayuda: 'Cuando una versión se manda a revisión y te toca aprobarla.',
    activa: false,
  },
  {
    valor: 'obligacion_proxima',
    etiqueta: 'Vencimiento normativo próximo',
    cadencia: 'A 90, 30 y 7 días',
    origen: 'summit',
    ayuda: 'Llega con la Fase 05: dictámenes, licencias y estudios por caducar.',
    activa: false,
  },
  {
    valor: 'evidencia_evaluada',
    etiqueta: 'Evidencia evaluada',
    cadencia: 'Por evento',
    origen: 'summit',
    ayuda: 'Cuando alguien revisa una evidencia que subiste.',
    activa: false,
  },
]

/** Las que ya tienen quien las dispare. Lo demás no se ofrece: regla 11. */
export const CATEGORIAS_VIVAS = CATEGORIAS_AVISO.filter((c) => c.activa)

/**
 * ¿Está encendida esta categoría para esta persona?
 *
 * ⚠️ **Lo ausente está ENCENDIDO**, igual que en `quiere_aviso()` de la base. El
 * silencio por omisión es lo que hace inútil un sistema de avisos: si una
 * categoría nueva naciera apagada, nadie se enteraría de que existe.
 */
export function estaEncendida(
  preferencias: unknown,
  categoria: string,
): boolean {
  if (typeof preferencias !== 'object' || preferencias === null || Array.isArray(preferencias)) {
    return true
  }
  const valor = (preferencias as Record<string, unknown>)[categoria]
  return valor === undefined ? true : valor !== false
}
