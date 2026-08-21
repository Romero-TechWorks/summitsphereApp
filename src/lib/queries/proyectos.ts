/**
 * Consultas de proyectos y de su alcance [F01·B2].
 *
 * El proyecto **es el contrato**: de él cuelgan la matriz de requisitos [Fase
 * 02], la lista de verificación de una auditoría [Fase 03] y las acciones
 * [Fase 04]. Su alcance —qué normas y qué sitios cubre— vive en dos tablas, no
 * en una cadena de texto, justamente porque esas tres fases lo van a leer.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type Proyecto = Tables<'proyectos'>
export type Norma = Tables<'normas'>

/**
 * ⚠️ **`proyectos` tiene DOS claves foráneas a `usuarios`** —`lider_id` y
 * `creado_por`—, así que el embed se nombra por la FK. Un
 * `lider:usuarios(...)` a secas es ambiguo y PostgREST responde *"more than one
 * relationship was found"*: la consulta no falla al escribirla, falla en el
 * teléfono. Es la misma trampa que en `usuarios_organizaciones`.
 */
const EMBEBIDO_LIDER = 'lider:usuarios!proyectos_lider_id_fkey(id, nombre, correo)'

export type Lider = Pick<Tables<'usuarios'>, 'id' | 'nombre' | 'correo'>

export type ProyectoConLider = Proyecto & { lider: Lider | null }

export type ProyectoEnCartera = ProyectoConLider & {
  organizacion: Pick<Tables<'organizaciones'>, 'id' | 'razon_social' | 'nombre_comercial'> | null
}

/** Una fila del alcance, con la norma o el sitio ya resuelto. */
export type AlcanceNorma = Tables<'proyecto_normas'> & { norma: Norma | null }
export type AlcanceSitio = Tables<'proyecto_sitios'> & { sitio: Tables<'sitios'> | null }

async function idDeLaSesion(): Promise<string | null> {
  // `getSession()` (local), nunca `getUser()` (pega a la red).
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

// ══════════════════════════════════════════════════════════════════ lecturas ══

/** Todos los proyectos que esta cuenta puede ver, de toda su cartera. */
export async function listarProyectos(): Promise<ProyectoEnCartera[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('proyectos')
    .select(`*, ${EMBEBIDO_LIDER}, organizacion:organizaciones(id, razon_social, nombre_comercial)`)
    .order('creado_en', { ascending: false })

  if (error) throw error
  return (data ?? []) as ProyectoEnCartera[]
}

/** Los proyectos de un cliente, para su expediente. */
export async function listarProyectosDe(orgId: string): Promise<ProyectoConLider[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('proyectos')
    .select(`*, ${EMBEBIDO_LIDER}`)
    .eq('org_id', orgId)
    .order('creado_en', { ascending: false })

  if (error) throw error
  return (data ?? []) as ProyectoConLider[]
}

/**
 * El catálogo de normas.
 *
 * ⚠️ Hoy devuelve **vacío**, y no es un error: `normas` nace sin filas y se
 * llena subiendo el `.md` del catálogo de Summit desde `/sistemas` [F01·B2b].
 * Quien pinte un selector de normas tiene que decir eso —«todavía no hay
 * catálogo, súbelo aquí»— en vez de enseñar una lista vacía sin explicación.
 */
export async function listarNormas(): Promise<Norma[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('normas')
    .select('*')
    .eq('activa', true)
    .order('nombre')

  if (error) throw error
  return data ?? []
}

export async function listarAlcanceNormas(proyectoId: string): Promise<AlcanceNorma[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('proyecto_normas')
    .select('*, norma:normas(*)')
    .eq('proyecto_id', proyectoId)

  if (error) throw error
  return (data ?? []) as AlcanceNorma[]
}

export async function listarAlcanceSitios(proyectoId: string): Promise<AlcanceSitio[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('proyecto_sitios')
    .select('*, sitio:sitios(*)')
    .eq('proyecto_id', proyectoId)

  if (error) throw error
  return (data ?? []) as AlcanceSitio[]
}

// ════════════════════════════════════════════════════════════════ escrituras ══

export type DatosProyecto = {
  nombre: string
  tipo: string
  etapa: string
  estado: string
  lider_id: string | null
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
  fecha_fin_real: string | null
  monto: number | null
  moneda: string
  objetivo: string | null
}

export async function crearProyecto(
  orgId: string,
  datos: DatosProyecto,
  lider: Lider | null,
): Promise<ResultadoEscritura<ProyectoConLider>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const creadoPor = await idDeLaSesion()

  const valores = { id, org_id: orgId, ...datos, creado_por: creadoPor }

  return offlineWrite<ProyectoConLider>({
    tabla: 'proyectos',
    operacion: 'insert',
    etiqueta: `Alta de proyecto — ${datos.nombre}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('proyectos')
        .insert(valores)
        .select(`*, ${EMBEBIDO_LIDER}`)
      if (error) throw error
      return exigirFilas(data, 'Alta de proyecto')[0] as ProyectoConLider
    },
    offline: { ...valores, creado_en: ahora, actualizado_en: ahora, lider } as ProyectoConLider,
  })
}

/**
 * Guardar cambios de un proyecto — **incluido el cambio de etapa**.
 *
 * ⚠️ La entrada de bitácora del cambio de etapa **no se escribe aquí**: la
 * escribe el trigger `registrar_cambio_etapa()` de la base. Si la pusiera la
 * app, sin señal saldrían como dos operaciones distintas de la cola y la línea
 * de tiempo podría quedarse sin el renglón — o llevarlo dos veces si alguien
 * reintenta. Una escritura del cliente, dos filas garantizadas.
 */
export async function actualizarProyecto(
  proyecto: ProyectoConLider,
  datos: DatosProyecto,
  lider: Lider | null,
): Promise<ResultadoEscritura<ProyectoConLider>> {
  const cambiaEtapa = proyecto.etapa !== datos.etapa

  return offlineWrite<ProyectoConLider>({
    tabla: 'proyectos',
    operacion: 'update',
    // La etiqueta dice lo que de verdad pasó: en la cola, "Cambios en X" y
    // "Movido a auditoría interna" no se leen igual.
    etiqueta: cambiaEtapa
      ? `${datos.nombre}: cambio de etapa`
      : `Cambios en el proyecto ${datos.nombre}`,
    valores: datos,
    filtro: { id: proyecto.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('proyectos')
        .update(datos)
        .eq('id', proyecto.id)
        .select(`*, ${EMBEBIDO_LIDER}`)
      if (error) throw error
      // ⚠️ Cero filas = el RLS lo rechazó con cara de éxito.
      return exigirFilas(data, 'Cambios en el proyecto')[0] as ProyectoConLider
    },
    offline: { ...proyecto, ...datos, lider },
  })
}

/**
 * Agregar una norma al alcance.
 *
 * ⚠️ `org_id` va en los valores porque la columna es `NOT NULL` y el tipo
 * generado la exige — pero **la última palabra la tiene el trigger**
 * `heredar_org_del_proyecto()`, que la reemplaza por la del proyecto. Mandar
 * otra no serviría de nada, y ése es justamente el punto.
 */
export async function agregarNormaAlAlcance(
  proyecto: Proyecto,
  norma: Norma,
): Promise<ResultadoEscritura<AlcanceNorma>> {
  const creadoPor = await idDeLaSesion()
  const valores = {
    proyecto_id: proyecto.id,
    norma_id: norma.id,
    org_id: proyecto.org_id,
    creado_por: creadoPor,
  }

  return offlineWrite<AlcanceNorma>({
    tabla: 'proyecto_normas',
    operacion: 'insert',
    etiqueta: `Alcance de ${proyecto.nombre}: agregar ${norma.nombre}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('proyecto_normas')
        .insert(valores)
        .select('*, norma:normas(*)')
      if (error) throw error
      return exigirFilas(data, 'Alcance del proyecto')[0] as AlcanceNorma
    },
    offline: { ...valores, creado_en: new Date().toISOString(), norma } as AlcanceNorma,
  })
}

export async function quitarNormaDelAlcance(
  proyecto: Proyecto,
  norma: Norma,
): Promise<ResultadoEscritura<{ proyecto_id: string; norma_id: string }>> {
  const filtro = { proyecto_id: proyecto.id, norma_id: norma.id }

  return offlineWrite<{ proyecto_id: string; norma_id: string }>({
    tabla: 'proyecto_normas',
    operacion: 'delete',
    etiqueta: `Alcance de ${proyecto.nombre}: quitar ${norma.nombre}`,
    filtro,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('proyecto_normas')
        .delete()
        .match(filtro)
        .select()
      if (error) throw error
      exigirFilas(data, 'Alcance del proyecto')
      return filtro
    },
    offline: filtro,
  })
}

export async function agregarSitioAlAlcance(
  proyecto: Proyecto,
  sitio: Tables<'sitios'>,
): Promise<ResultadoEscritura<AlcanceSitio>> {
  const creadoPor = await idDeLaSesion()
  const valores = {
    proyecto_id: proyecto.id,
    sitio_id: sitio.id,
    org_id: proyecto.org_id,
    creado_por: creadoPor,
  }

  return offlineWrite<AlcanceSitio>({
    tabla: 'proyecto_sitios',
    operacion: 'insert',
    etiqueta: `Alcance de ${proyecto.nombre}: agregar ${sitio.nombre}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('proyecto_sitios')
        .insert(valores)
        .select('*, sitio:sitios(*)')
      if (error) throw error
      return exigirFilas(data, 'Alcance del proyecto')[0] as AlcanceSitio
    },
    offline: { ...valores, creado_en: new Date().toISOString(), sitio } as AlcanceSitio,
  })
}

export async function quitarSitioDelAlcance(
  proyecto: Proyecto,
  sitio: Tables<'sitios'>,
): Promise<ResultadoEscritura<{ proyecto_id: string; sitio_id: string }>> {
  const filtro = { proyecto_id: proyecto.id, sitio_id: sitio.id }

  return offlineWrite<{ proyecto_id: string; sitio_id: string }>({
    tabla: 'proyecto_sitios',
    operacion: 'delete',
    etiqueta: `Alcance de ${proyecto.nombre}: quitar ${sitio.nombre}`,
    filtro,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('proyecto_sitios')
        .delete()
        .match(filtro)
        .select()
      if (error) throw error
      exigirFilas(data, 'Alcance del proyecto')
      return filtro
    },
    offline: filtro,
  })
}
