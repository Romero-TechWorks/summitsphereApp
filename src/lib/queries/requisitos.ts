/**
 * **La matriz de requisitos** [F02·B3] — la pantalla que contesta
 * *"¿cuánto nos falta para certificarnos?"*.
 *
 * El diagnóstico inicial de la etapa 1 de la metodología **es** esta matriz
 * recién llenada; no un documento aparte que después haya que mantener
 * sincronizado. Y el porcentaje que sale de aquí es el número que el cliente
 * pide en cada reunión mensual.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Proyecto } from '@/lib/queries/proyectos'
import type { Tables } from '@/types/database'

export type Requisito = Tables<'requisitos'>

export type ClausulaEvaluable = Pick<
  Tables<'norma_clausulas'>,
  'id' | 'numero' | 'titulo' | 'resumen' | 'orden'
> & {
  normaId: string
  normaClave: string
  normaNombre: string
}

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/**
 * Las cláusulas que este proyecto tiene que cumplir: **las auditables de las
 * normas de su alcance**.
 *
 * ⚠️ Se traen en UNA consulta con los embebidos de PostgREST, no una por norma.
 * Con tres normas en alcance eso serían cuatro viajes, y esta pantalla se abre
 * al empezar una visita —cuando la señal es lo que es—.
 *
 * ⚠️ **`auditable = false` fuera.** Los capítulos 0 a 3 de una ISO son objeto,
 * campo de aplicación y términos: no se auditan y no se evalúan. Meterlos en la
 * matriz baja el porcentaje del cliente con filas que nunca se van a poder
 * marcar.
 */
export async function listarClausulasDelAlcance(proyectoId: string): Promise<ClausulaEvaluable[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('proyecto_normas')
    .select(
      'norma:normas(id, clave, nombre, activa, clausulas:norma_clausulas(id, numero, titulo, resumen, auditable, activa, orden))',
    )
    .eq('proyecto_id', proyectoId)

  if (error) throw error

  type Fila = {
    norma: {
      id: string
      clave: string
      nombre: string
      activa: boolean
      clausulas: (Pick<Tables<'norma_clausulas'>, 'id' | 'numero' | 'titulo' | 'resumen' | 'orden' | 'auditable' | 'activa'>)[]
    } | null
  }

  const clausulas: ClausulaEvaluable[] = []

  for (const fila of (data ?? []) as unknown as Fila[]) {
    const norma = fila.norma
    if (!norma) continue

    for (const clausula of norma.clausulas ?? []) {
      if (!clausula.auditable || !clausula.activa) continue
      clausulas.push({
        id: clausula.id,
        numero: clausula.numero,
        titulo: clausula.titulo,
        resumen: clausula.resumen,
        orden: clausula.orden,
        normaId: norma.id,
        normaClave: norma.clave,
        normaNombre: norma.nombre,
      })
    }
  }

  // Por norma y después por el orden del catálogo. Ordenar por `numero` como
  // texto pondría «10.3» antes que «2.1».
  return clausulas.sort(
    (a, b) => a.normaNombre.localeCompare(b.normaNombre, 'es') || a.orden - b.orden,
  )
}

/** Lo evaluado hasta ahora. Las cláusulas sin fila valen `no_iniciado`. */
export async function listarRequisitos(proyectoId: string): Promise<Requisito[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('requisitos')
    .select('*')
    .eq('proyecto_id', proyectoId)

  if (error) throw error
  return data ?? []
}

export type DatosRequisito = {
  estado: string
  justificacion: string | null
  observaciones: string | null
  responsable_id: string | null
}

/**
 * Evaluar una cláusula.
 *
 * ⚠️ **Insert la primera vez, update las siguientes — no `upsert`.** La cola
 * reproduce las operaciones como se encolaron y su `upsert` resuelve el
 * conflicto por la clave primaria, no por `(proyecto_id, clausula_id)`: un
 * segundo cambio sin señal sobre la misma cláusula llegaría con otro `id` y
 * chocaría contra el índice único. Se decide aquí, con la fila que ya está en la
 * caché —que es la fuente de verdad—, y así el mismo gesto funciona igual con
 * señal y sin ella.
 *
 * ⚠️ `evaluado_en` y `evaluado_por` **no se mandan**: los escribe
 * `sellar_evaluacion_requisito()` en la base. «Evaluado el 3 de marzo» se enseña
 * en una junta con el cliente y tiene que ser cierto.
 *
 * ⚠️ La justificación de un `no_aplica` la exige el CHECK de la base. Se valida
 * también aquí para decirlo antes de encolarlo: sin señal, un rechazo del
 * servidor llega media hora después y sin nadie mirando.
 */
export async function evaluarRequisito(
  proyecto: Proyecto,
  clausula: ClausulaEvaluable,
  existente: Requisito | undefined,
  datos: DatosRequisito,
): Promise<ResultadoEscritura<Requisito>> {
  if (datos.estado === 'no_aplica' && !datos.justificacion?.trim()) {
    throw new Error(
      'Un «no aplica» necesita justificación por escrito: es el primer punto que revisa un ' +
      'auditor de certificación.',
    )
  }

  const etiqueta = `${clausula.normaClave} ${clausula.numero} — ${datos.estado}`

  if (existente) {
    return offlineWrite<Requisito>({
      tabla: 'requisitos',
      operacion: 'update',
      etiqueta,
      valores: datos,
      filtro: { id: existente.id },
      online: async () => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('requisitos')
          .update(datos)
          .eq('id', existente.id)
          .select()
        if (error) throw error
        return exigirFilas(data, 'Evaluación del requisito')[0]
      },
      offline: { ...existente, ...datos, evaluado_en: new Date().toISOString() },
    })
  }

  const id = uuid()
  const ahora = new Date().toISOString()

  const valores = {
    id,
    proyecto_id: proyecto.id,
    clausula_id: clausula.id,
    // La reemplaza `heredar_org_del_proyecto()`; va porque la columna es NOT
    // NULL y el tipo generado la exige.
    org_id: proyecto.org_id,
    ...datos,
    creado_por: await idDeLaSesion(),
  }

  return offlineWrite<Requisito>({
    tabla: 'requisitos',
    operacion: 'insert',
    etiqueta,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('requisitos').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, 'Evaluación del requisito')[0]
    },
    offline: {
      ...valores,
      evaluado_en: ahora,
      evaluado_por: null,
      creado_en: ahora,
      actualizado_en: ahora,
    } as Requisito,
  })
}
