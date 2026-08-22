/**
 * Riesgos y oportunidades [F02·B4].
 *
 * Cubre ISO 9001 §6.1, 45001 §6.1, 27001 y 37001 **de una sola vez**: las cuatro
 * piden lo mismo con distintas palabras —identificar, valorar y tratar—, y una
 * tabla por norma sería la misma información capturada cuatro veces.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type Riesgo = Tables<'riesgos'>

/**
 * El nivel de un riesgo: `probabilidad × impacto`.
 *
 * ⚠️ **`nivel` llega tipado como `number | null` y no es un descuido.** Es una
 * columna GENERADA de Postgres, y el generador de tipos de Supabase no marca
 * esas columnas como no anulables ni como no insertables — así salen de
 * `supabase gen types`, y lo generado manda (CLAUDE.md · cómo trabajar). En la
 * base nunca es null: `probabilidad` e `impacto` son NOT NULL. Este helper
 * recalcula lo mismo que calcularía la base, para que el tipo no obligue a
 * salpicar la interfaz de `?? 0` — que además mentiría, poniendo en verde un
 * riesgo del que sólo se ignora el número.
 */
export function nivelDe(riesgo: Pick<Riesgo, 'nivel' | 'probabilidad' | 'impacto'>): number {
  return riesgo.nivel ?? riesgo.probabilidad * riesgo.impacto
}
export type ProcesoDelRiesgo = Pick<Tables<'procesos'>, 'id' | 'nombre'>
export type RiesgoConProceso = Riesgo & { proceso: ProcesoDelRiesgo | null }

const EMBEBIDO = '*, proceso:procesos(id, nombre)'

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/** Los de un cliente, **de mayor a menor nivel**: es el orden en que se tratan. */
export async function listarRiesgos(orgId: string): Promise<RiesgoConProceso[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('riesgos')
    .select(EMBEBIDO)
    .eq('org_id', orgId)
    .order('nivel', { ascending: false })

  if (error) throw error
  return (data ?? []) as RiesgoConProceso[]
}

export type DatosRiesgo = {
  proceso_id: string | null
  tipo: string
  descripcion: string
  causa: string | null
  consecuencia: string | null
  probabilidad: number
  impacto: number
  tratamiento: string | null
  plan: string | null
  fecha_revision: string | null
}

export async function crearRiesgo(
  orgId: string,
  datos: DatosRiesgo,
  proceso: ProcesoDelRiesgo | null,
): Promise<ResultadoEscritura<RiesgoConProceso>> {
  const id = uuid()
  const ahora = new Date().toISOString()

  const valores = { id, org_id: orgId, ...datos, creado_por: await idDeLaSesion() }

  return offlineWrite<RiesgoConProceso>({
    tabla: 'riesgos',
    operacion: 'insert',
    etiqueta: `Alta de riesgo — ${datos.descripcion.slice(0, 60)}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('riesgos').insert(valores).select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Alta de riesgo')[0] as RiesgoConProceso
    },
    offline: {
      ...valores,
      // ⚠️ `nivel` es una columna GENERADA: la calcula Postgres. Aquí se estima
      // para que la fila optimista se ordene bien mientras espera en la cola; la
      // verdad la trae la respuesta del servidor.
      nivel: datos.probabilidad * datos.impacto,
      responsable_id: null,
      creado_en: ahora,
      actualizado_en: ahora,
      proceso,
    } as RiesgoConProceso,
  })
}

export async function actualizarRiesgo(
  riesgo: RiesgoConProceso,
  datos: DatosRiesgo,
  proceso: ProcesoDelRiesgo | null,
): Promise<ResultadoEscritura<RiesgoConProceso>> {
  return offlineWrite<RiesgoConProceso>({
    tabla: 'riesgos',
    operacion: 'update',
    etiqueta: `Cambios en el riesgo ${riesgo.descripcion.slice(0, 60)}`,
    valores: datos,
    filtro: { id: riesgo.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('riesgos')
        .update(datos)
        .eq('id', riesgo.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Cambios en el riesgo')[0] as RiesgoConProceso
    },
    offline: {
      ...riesgo,
      ...datos,
      nivel: datos.probabilidad * datos.impacto,
      proceso,
    },
  })
}

/**
 * Borrar un riesgo.
 *
 * ⚠️ Y sí se borra, sin contradecir la regla 13: un riesgo mal capturado en un
 * taller de análisis es trabajo interno, no evidencia de auditoría. Lo que no se
 * borra es el hallazgo que salga de no haberlo tratado.
 */
export async function eliminarRiesgo(riesgo: Riesgo): Promise<ResultadoEscritura<{ id: string }>> {
  const filtro = { id: riesgo.id }

  return offlineWrite<{ id: string }>({
    tabla: 'riesgos',
    operacion: 'delete',
    etiqueta: `Quitar el riesgo ${riesgo.descripcion.slice(0, 60)}`,
    filtro,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('riesgos')
        .delete()
        .eq('id', riesgo.id)
        .select('id')
      if (error) throw error
      return exigirFilas(data, 'Quitar el riesgo')[0]
    },
    offline: filtro,
  })
}
