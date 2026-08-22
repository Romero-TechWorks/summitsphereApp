/**
 * Indicadores y sus mediciones [F02·B4].
 *
 * Los objetivos de calidad con su meta, y el valor de cada periodo. El semáforo
 * —quién va fuera de meta— es lo que alimenta la revisión por la dirección, que
 * es la reunión que un cliente prepara la noche anterior con una hoja de cálculo
 * que nadie más entiende.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type Indicador = Tables<'indicadores'>
export type Medicion = Tables<'mediciones'>
export type ProcesoDelIndicador = Pick<Tables<'procesos'>, 'id' | 'nombre'>

export type IndicadorConProceso = Indicador & {
  proceso: ProcesoDelIndicador | null
  /**
   * La última medición, para el semáforo de la lista.
   *
   * ⚠️ Viene embebida y **limitada a una** con `order` + `limit` de PostgREST:
   * traer la serie completa de treinta indicadores para enseñar un número por
   * fila serían cientos de filas que sin señal no caben en ningún sitio útil.
   * La serie entera se pide al abrir el indicador.
   */
  ultima: Pick<Medicion, 'id' | 'periodo' | 'valor'>[]
}

const EMBEBIDO =
  '*, proceso:procesos(id, nombre)' +
  ', ultima:mediciones(id, periodo, valor)'

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

export async function listarIndicadores(orgId: string): Promise<IndicadorConProceso[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('indicadores')
    .select(EMBEBIDO)
    .eq('org_id', orgId)
    // ⚠️ `referencedTable` va con el ALIAS del embebido (`ultima`), no con el
    // nombre de la tabla: PostgREST arma los parámetros `ultima.order` y
    // `ultima.limit` a partir de cómo se llamó el embebido en el `select`. Con
    // `'mediciones'` los ignora en silencio y devuelve la serie entera de cada
    // indicador — cientos de filas para pintar un número por renglón.
    .order('periodo', { referencedTable: 'ultima', ascending: false })
    .limit(1, { referencedTable: 'ultima' })
    .order('nombre')

  if (error) throw error
  return (data ?? []) as unknown as IndicadorConProceso[]
}

export async function listarMediciones(indicadorId: string): Promise<Medicion[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('mediciones')
    .select('*')
    .eq('indicador_id', indicadorId)
    .order('periodo', { ascending: false })

  if (error) throw error
  return data ?? []
}

export type DatosIndicador = {
  proceso_id: string | null
  nombre: string
  formula: string | null
  unidad: string | null
  meta: number | null
  sentido: string
  frecuencia: string
}

export async function crearIndicador(
  orgId: string,
  datos: DatosIndicador,
  proceso: ProcesoDelIndicador | null,
): Promise<ResultadoEscritura<IndicadorConProceso>> {
  const id = uuid()
  const ahora = new Date().toISOString()

  const valores = { id, org_id: orgId, ...datos, creado_por: await idDeLaSesion() }

  return offlineWrite<IndicadorConProceso>({
    tabla: 'indicadores',
    operacion: 'insert',
    etiqueta: `Alta de indicador — ${datos.nombre}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('indicadores').insert(valores).select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Alta de indicador')[0] as unknown as IndicadorConProceso
    },
    offline: {
      ...valores,
      activo: true,
      responsable_id: null,
      creado_en: ahora,
      actualizado_en: ahora,
      proceso,
      ultima: [],
    } as unknown as IndicadorConProceso,
  })
}

export async function actualizarIndicador(
  indicador: IndicadorConProceso,
  datos: DatosIndicador,
  proceso: ProcesoDelIndicador | null,
): Promise<ResultadoEscritura<IndicadorConProceso>> {
  return offlineWrite<IndicadorConProceso>({
    tabla: 'indicadores',
    operacion: 'update',
    etiqueta: `Cambios en el indicador ${datos.nombre}`,
    valores: datos,
    filtro: { id: indicador.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('indicadores')
        .update(datos)
        .eq('id', indicador.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Cambios en el indicador')[0] as unknown as IndicadorConProceso
    },
    offline: { ...indicador, ...datos, proceso },
  })
}

/**
 * Capturar el valor de un periodo.
 *
 * ⚠️ **`periodo` es una `date`, y se formatea con `formatDateOnly`, nunca con
 * `new Date()`** — que corre un día en México (CLAUDE.md · trampas heredadas).
 * Aquí eso cambiaría el mes de la medición, y con él el semáforo del trimestre.
 *
 * ⚠️ Insert o update decidido por la fila que ya está en la caché, no `upsert`:
 * el índice único es `(indicador_id, periodo)` y la cola resuelve sus `upsert`
 * por la clave primaria. Es el mismo razonamiento que en la matriz de requisitos.
 */
export async function guardarMedicion(
  indicador: Indicador,
  existente: Medicion | undefined,
  datos: { periodo: string; valor: number; comentario: string | null },
): Promise<ResultadoEscritura<Medicion>> {
  if (existente) {
    const valores = { valor: datos.valor, comentario: datos.comentario }

    return offlineWrite<Medicion>({
      tabla: 'mediciones',
      operacion: 'update',
      etiqueta: `Medición de ${indicador.nombre} — ${datos.periodo}`,
      valores,
      filtro: { id: existente.id },
      online: async () => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('mediciones')
          .update(valores)
          .eq('id', existente.id)
          .select()
        if (error) throw error
        return exigirFilas(data, 'Medición')[0]
      },
      offline: { ...existente, ...valores },
    })
  }

  const id = uuid()
  const valores = {
    id,
    indicador_id: indicador.id,
    // La reemplaza `heredar_org_del_indicador()`; va porque la columna es NOT
    // NULL y el tipo generado la exige.
    org_id: indicador.org_id,
    ...datos,
    creado_por: await idDeLaSesion(),
  }

  return offlineWrite<Medicion>({
    tabla: 'mediciones',
    operacion: 'insert',
    etiqueta: `Medición de ${indicador.nombre} — ${datos.periodo}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('mediciones').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, 'Medición')[0]
    },
    offline: { ...valores, creado_en: new Date().toISOString() } as Medicion,
  })
}

/** Baja de un indicador: se deja de medir, pero su historial se queda. */
export async function cambiarActivoIndicador(
  indicador: IndicadorConProceso,
  activo: boolean,
): Promise<ResultadoEscritura<IndicadorConProceso>> {
  return offlineWrite<IndicadorConProceso>({
    tabla: 'indicadores',
    operacion: 'update',
    etiqueta: `${activo ? 'Reactivar' : 'Dar de baja'} el indicador ${indicador.nombre}`,
    valores: { activo },
    filtro: { id: indicador.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('indicadores')
        .update({ activo })
        .eq('id', indicador.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Baja del indicador')[0] as unknown as IndicadorConProceso
    },
    offline: { ...indicador, activo },
  })
}
