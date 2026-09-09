/**
 * Planes de mejora y cambios al SGC [F04·B1] — `F-SG-16` y `F-SG-24`.
 *
 * Los dos son **contenedores de acciones**, no entidades con vida propia: un plan
 * de mejora agrupa acciones con un calendario anual, y un cambio de SGC agrupa
 * las «actividades» de su §VI. Por eso ninguno tiene tabla de tareas — las
 * acciones ya son eso.
 *
 * ⚠️ **El `F-SG-16` NO es «acciones con tipo = mejora»**, que es lo que el índice
 * del catálogo supuso hasta que llegó el formato. Y es **condicional**: `P-SG-05`
 * §5.5 lo pide sólo «cuando las acciones requieran una planeación de mayor
 * complejidad».
 *
 * ⚠️ **El `F-SG-24` tiene TRES disparadores y sólo uno es de la Fase 04**: la
 * acción correctiva (`P-SG-05` §5.5), la solicitud de cambio de un documento
 * publicado (`P-SG-01` §5.7, que es Fase 02) y la sugerencia de cliente
 * (`P-SG-07` §5.5.2). Las tres bocas escriben en la misma tabla.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type PlanMejora = Tables<'planes_mejora'>
export type CambioSgc = Tables<'cambios_sgc'>

export type PlanEnCartera = PlanMejora & {
  organizacion: Pick<Tables<'organizaciones'>, 'id' | 'razon_social' | 'nombre_comercial'> | null
}

export type CambioEnCartera = CambioSgc & {
  organizacion: Pick<Tables<'organizaciones'>, 'id' | 'razon_social' | 'nombre_comercial'> | null
  proyecto: Pick<Tables<'proyectos'>, 'id' | 'nombre'> | null
}

const ORG = 'organizacion:organizaciones(id, razon_social, nombre_comercial)'

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/**
 * Los doce meses de un renglón del `F-SG-16`, en sus dos líneas.
 *
 * ⚠️ **`p` es lo programado y `r` lo real**, y el formato del cliente lleva las
 * dos filas por acción. Es la única diferencia con la parrilla del `F-SG-09`,
 * que sólo tiene una.
 */
export type CalendarioPR = { p: boolean[]; r: boolean[] }

const DOCE = Array.from({ length: 12 }, () => false)

/**
 * Lee el `jsonb` sin confiar en él. **Nunca lanza**: quien lo llama pinta una
 * parrilla, y una excepción aquí se lleva la pantalla entera. Misma regla que
 * `leerAnalisis()`.
 */
export function leerCalendario(valor: unknown): CalendarioPR {
  const vacio: CalendarioPR = { p: [...DOCE], r: [...DOCE] }
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return vacio

  const obj = valor as Record<string, unknown>
  const linea = (v: unknown): boolean[] =>
    Array.isArray(v)
      ? Array.from({ length: 12 }, (_, i) => Boolean(v[i]))
      : [...DOCE]

  return { p: linea(obj.p), r: linea(obj.r) }
}

/** Cuánto se ha cumplido: meses reales sobre meses programados. */
export function cumplimiento(calendario: CalendarioPR): number | null {
  const programados = calendario.p.filter(Boolean).length
  if (programados === 0) return null
  const reales = calendario.r.filter((v, i) => v && calendario.p[i]).length
  return Math.round((reales / programados) * 100)
}

// ══════════════════════════════════════════════════ planes de mejora ══════

export async function listarPlanesMejora(): Promise<PlanEnCartera[]> {
  const { data, error } = await createClient()
    .from('planes_mejora')
    .select(`*, ${ORG}`)
    .order('anio', { ascending: false })

  if (error) throw error
  return (data ?? []) as PlanEnCartera[]
}

export type DatosPlan = {
  anio: number
  alcance: string | null
  objetivo: string | null
  programa_de: string | null
}

export async function crearPlanMejora({
  orgId,
  datos,
}: {
  orgId: string
  datos: DatosPlan
}): Promise<ResultadoEscritura<PlanMejora>> {
  const ahora = new Date().toISOString()
  const valores = {
    id: uuid(),
    org_id: orgId,
    estado: 'borrador',
    ...datos,
    elaborado_por_id: await idDeLaSesion(),
    creado_por: await idDeLaSesion(),
  }

  return offlineWrite<PlanMejora>({
    tabla: 'planes_mejora',
    operacion: 'insert',
    etiqueta: `Plan de mejora ${datos.anio} — ${datos.programa_de ?? 'sin título'}`,
    valores,
    online: async () => {
      const { data, error } = await createClient().from('planes_mejora').insert(valores).select('*')
      if (error) throw error
      return exigirFilas(data, 'Crear el plan de mejora')[0] as PlanMejora
    },
    offline: {
      ...valores,
      aprobado_por_id: null,
      aprobado_en: null,
      creado_en: ahora,
      actualizado_en: ahora,
    } as PlanMejora,
  })
}

/**
 * Mover el estado del plan.
 *
 * ⚠️ **`aprobado_por_id` y `aprobado_en` NO se mandan**: los sella
 * `sellar_plan_aprobado()`. Aprobar es la firma que va al pie del entregable, y
 * una que viaja desde el navegador es una que se puede escribir a mano. Es la
 * misma decisión que en `programa_auditorias` y en `documento_versiones`.
 */
export async function cambiarEstadoPlan(
  plan: PlanEnCartera,
  estado: string,
): Promise<ResultadoEscritura<PlanEnCartera>> {
  const valores = { estado }

  return offlineWrite<PlanEnCartera>({
    tabla: 'planes_mejora',
    operacion: 'update',
    etiqueta: `Plan de mejora ${plan.anio}: ${estado}`,
    valores,
    filtro: { id: plan.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('planes_mejora')
        .update(valores)
        .eq('id', plan.id)
        .select(`*, ${ORG}`)
      if (error) throw error
      return exigirFilas(data, 'Cambio de estado del plan')[0] as PlanEnCartera
    },
    offline: { ...plan, ...valores },
  })
}

// ═══════════════════════════════════════════════════ cambios al SGC ══════

export async function listarCambiosSgc(): Promise<CambioEnCartera[]> {
  const { data, error } = await createClient()
    .from('cambios_sgc')
    .select(`*, ${ORG}, proyecto:proyectos(id, nombre)`)
    .order('creado_en', { ascending: false })

  if (error) throw error
  return (data ?? []) as CambioEnCartera[]
}

export type DatosCambio = {
  nombre: string
  numero: string | null
  descripcion: string | null
  alcance: string | null
  ambito: string
  justificacion: string | null
  riesgos: string | null
  recursos: string | null
  origen: string
  fecha: string | null
}

export async function crearCambioSgc({
  orgId,
  accionOrigenId = null,
  datos,
}: {
  orgId: string
  accionOrigenId?: string | null
  datos: DatosCambio
}): Promise<ResultadoEscritura<CambioSgc>> {
  const ahora = new Date().toISOString()
  const valores = {
    id: uuid(),
    org_id: orgId,
    estado: 'borrador',
    accion_origen_id: accionOrigenId,
    elaborado_por_id: await idDeLaSesion(),
    ...datos,
    creado_por: await idDeLaSesion(),
  }

  return offlineWrite<CambioSgc>({
    tabla: 'cambios_sgc',
    operacion: 'insert',
    etiqueta: `Cambio al SGC — ${datos.nombre}`,
    valores,
    online: async () => {
      const { data, error } = await createClient().from('cambios_sgc').insert(valores).select('*')
      if (error) throw error
      return exigirFilas(data, 'Crear el cambio')[0] as CambioSgc
    },
    offline: {
      ...valores,
      proyecto_id: null,
      revisado_por_id: null,
      autorizado_por_id: null,
      autorizado_en: null,
      creado_en: ahora,
      actualizado_en: ahora,
    } as CambioSgc,
  })
}

/**
 * ⚠️ **`autorizado_por_id` y `autorizado_en` NO se mandan**: los sella
 * `sellar_cambio_autorizado()`. Es la tercera firma del pie del `F-SG-24`.
 */
export async function cambiarEstadoCambio(
  cambio: CambioEnCartera,
  estado: string,
): Promise<ResultadoEscritura<CambioEnCartera>> {
  const valores = { estado }

  return offlineWrite<CambioEnCartera>({
    tabla: 'cambios_sgc',
    operacion: 'update',
    etiqueta: `Cambio «${cambio.nombre}»: ${estado}`,
    valores,
    filtro: { id: cambio.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('cambios_sgc')
        .update(valores)
        .eq('id', cambio.id)
        .select(`*, ${ORG}, proyecto:proyectos(id, nombre)`)
      if (error) throw error
      return exigirFilas(data, 'Cambio de estado')[0] as CambioEnCartera
    },
    offline: { ...cambio, ...valores },
  })
}
