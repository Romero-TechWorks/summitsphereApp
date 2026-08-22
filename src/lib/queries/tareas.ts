/**
 * Las tareas por etapa de un proyecto [F01·B5].
 *
 * **El checklist de la metodología de Summit dentro de un contrato.** Es lo que
 * un consultor abre todos los días: qué toca hacer en la etapa en la que va este
 * cliente.
 *
 * ⚠️ No confundir con las `tareas` de la Fase 04, que son los pasos de una
 * acción correctiva y las audita un tercero.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Proyecto } from '@/lib/queries/proyectos'
import type { Tables } from '@/types/database'

export type Tarea = Tables<'tareas_etapa'>
export type Responsable = Pick<Tables<'usuarios'>, 'id' | 'nombre' | 'correo'>
export type TareaConResponsable = Tarea & { responsable: Responsable | null }

/**
 * ⚠️ **`tareas_etapa` tiene TRES claves foráneas a `usuarios`** —`responsable_id`,
 * `hecha_por` y `creado_por`—, así que el embed se nombra por la FK o PostgREST
 * responde *"more than one relationship was found"*. Es la tercera vez que
 * aparece esta trampa en el proyecto; a estas alturas es una regla: **si la
 * tabla apunta dos veces a la misma, se nombra la clave**.
 */
const EMBEBIDO_RESPONSABLE =
  '*, responsable:usuarios!tareas_etapa_responsable_id_fkey(id, nombre, correo)'

export async function listarTareas(proyectoId: string): Promise<TareaConResponsable[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tareas_etapa')
    .select(EMBEBIDO_RESPONSABLE)
    .eq('proyecto_id', proyectoId)
    .order('orden')

  if (error) throw error
  return (data ?? []) as TareaConResponsable[]
}

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

export type DatosTarea = {
  etapa: string
  titulo: string
  detalle: string | null
  estado: string
  responsable_id: string | null
  fecha_compromiso: string | null
  orden: number
  /**
   * Si esta tarea no se puede dar por hecha sin un adjunto [F02·B2b].
   *
   * ⚠️ **No es una casilla decorativa**: `sellar_tarea_hecha()` rechaza el
   * cambio a `hecha` si no hay ninguna fila en `adjuntos` apuntando a la tarea.
   * Entró con los adjuntos justamente para no ser un interruptor muerto
   * (CLAUDE.md regla 11).
   */
  exige_evidencia: boolean
}

export async function crearTarea(
  proyecto: Proyecto,
  datos: DatosTarea,
  responsable: Responsable | null,
): Promise<ResultadoEscritura<TareaConResponsable>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const creadoPor = await idDeLaSesion()

  const valores = {
    id,
    proyecto_id: proyecto.id,
    // La reemplaza el trigger `heredar_org_del_proyecto()`; va porque la columna
    // es NOT NULL y el tipo generado la exige.
    org_id: proyecto.org_id,
    ...datos,
    creado_por: creadoPor,
  }

  return offlineWrite<TareaConResponsable>({
    tabla: 'tareas_etapa',
    operacion: 'insert',
    etiqueta: `Tarea nueva — ${datos.titulo}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tareas_etapa')
        .insert(valores)
        .select(EMBEBIDO_RESPONSABLE)
      if (error) throw error
      return exigirFilas(data, 'Tarea nueva')[0] as TareaConResponsable
    },
    offline: {
      ...valores,
      hecha_en: null,
      hecha_por: null,
      creado_en: ahora,
      actualizado_en: ahora,
      responsable,
    } as TareaConResponsable,
  })
}

export async function actualizarTarea(
  tarea: TareaConResponsable,
  datos: DatosTarea,
  responsable: Responsable | null,
): Promise<ResultadoEscritura<TareaConResponsable>> {
  return offlineWrite<TareaConResponsable>({
    tabla: 'tareas_etapa',
    operacion: 'update',
    etiqueta: `Cambios en la tarea ${datos.titulo}`,
    valores: datos,
    filtro: { id: tarea.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tareas_etapa')
        .update(datos)
        .eq('id', tarea.id)
        .select(EMBEBIDO_RESPONSABLE)
      if (error) throw error
      return exigirFilas(data, 'Cambios en la tarea')[0] as TareaConResponsable
    },
    offline: { ...tarea, ...datos, responsable },
  })
}

/**
 * Marcar y desmarcar, que es el gesto de todos los días.
 *
 * ⚠️ **`hecha_en` y `hecha_por` NO se mandan desde aquí.** Los pone el trigger
 * `sellar_tarea_hecha()` en la base, con `now()` y `auth.uid()`. Una fecha de
 * cierre que viaja desde el navegador es una fecha que se puede escribir a mano,
 * y quién dio por cumplida una etapa de la metodología es justo lo que se
 * pregunta después. La fila optimista de aquí es una estimación de lo que va a
 * escribir el servidor; la verdad la trae la respuesta.
 */
export async function cambiarEstadoTarea(
  tarea: TareaConResponsable,
  estado: string,
  yo: Responsable | null,
): Promise<ResultadoEscritura<TareaConResponsable>> {
  const hecha = estado === 'hecha'

  return offlineWrite<TareaConResponsable>({
    tabla: 'tareas_etapa',
    operacion: 'update',
    etiqueta: hecha ? `Hecha: ${tarea.titulo}` : `Reabrir: ${tarea.titulo}`,
    valores: { estado },
    filtro: { id: tarea.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tareas_etapa')
        .update({ estado })
        .eq('id', tarea.id)
        .select(EMBEBIDO_RESPONSABLE)
      if (error) throw error
      return exigirFilas(data, 'Estado de la tarea')[0] as TareaConResponsable
    },
    offline: {
      ...tarea,
      estado,
      hecha_en: hecha ? new Date().toISOString() : null,
      hecha_por: hecha ? yo?.id ?? null : null,
    },
  })
}

/**
 * Borrar una tarea.
 *
 * ⚠️ Y sí se borra, sin contradecir la regla 13: una tarea de método es trabajo
 * interno de la firma, no evidencia de auditoría. Lo que no se borra nunca es el
 * hallazgo que salga de no haberla hecho.
 */
export async function eliminarTarea(
  tarea: Tarea,
): Promise<ResultadoEscritura<{ id: string }>> {
  const filtro = { id: tarea.id }

  return offlineWrite<{ id: string }>({
    tabla: 'tareas_etapa',
    operacion: 'delete',
    etiqueta: `Quitar la tarea ${tarea.titulo}`,
    filtro,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tareas_etapa')
        .delete()
        .eq('id', tarea.id)
        .select('id')
      if (error) throw error
      return exigirFilas(data, 'Quitar la tarea')[0]
    },
    offline: filtro,
  })
}

// ═════════════════════════════════════════════════════════════ plantilla ══

/** `{ implementacion: { diagnostico: [{ titulo, detalle }] } }` */
export type PlantillaTareas = Record<string, Record<string, { titulo: string; detalle?: string }[]>>

/**
 * La plantilla de la metodología, por tipo de proyecto.
 *
 * ⚠️ Vive en `config_firma.plantillas` (jsonb), que ya existía, y **no en una
 * tabla**: es configuración de la firma, la lee cualquiera con sesión y sólo la
 * escribe un socio. Una tabla nueva para esto sería una tabla con una fila.
 *
 * ⚠️ Se lee a la defensiva. Ese jsonb lo puede haber escrito una versión vieja
 * de la app o una mano en el SQL Editor: si no tiene la forma esperada se
 * devuelve vacío, **nunca se revienta la pantalla del proyecto** (CLAUDE.md ·
 * trampas heredadas).
 */
export async function leerPlantillaTareas(): Promise<PlantillaTareas> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('config_firma')
    .select('plantillas')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error
  return normalizarPlantilla(data?.plantillas)
}

function normalizarPlantilla(crudo: unknown): PlantillaTareas {
  if (!crudo || typeof crudo !== 'object') return {}

  const contenedor = (crudo as { tareas?: unknown }).tareas
  if (!contenedor || typeof contenedor !== 'object') return {}

  const limpio: PlantillaTareas = {}

  for (const [tipo, porEtapa] of Object.entries(contenedor as Record<string, unknown>)) {
    if (!porEtapa || typeof porEtapa !== 'object') continue
    const etapas: Record<string, { titulo: string; detalle?: string }[]> = {}

    for (const [etapa, lista] of Object.entries(porEtapa as Record<string, unknown>)) {
      if (!Array.isArray(lista)) continue
      const tareas = lista
        .filter((t): t is { titulo: string; detalle?: string } =>
          Boolean(t) && typeof t === 'object' && typeof (t as { titulo?: unknown }).titulo === 'string')
        .map((t) => ({ titulo: t.titulo, detalle: typeof t.detalle === 'string' ? t.detalle : undefined }))

      if (tareas.length > 0) etapas[etapa] = tareas
    }

    if (Object.keys(etapas).length > 0) limpio[tipo] = etapas
  }

  return limpio
}

/**
 * Guarda las tareas de este proyecto como la plantilla de su tipo.
 *
 * **La plantilla se define con el ejemplo**, no en una pantalla de
 * configuración: el consultor arma bien las tareas de un cliente y las guarda
 * para los siguientes. Es como se trabaja de verdad —«hazlo como el de
 * Aceros»— y ahorra la pantalla de administración que no llega hasta la Fase 06.
 *
 * ⚠️ Lee y reescribe el jsonb entero: sólo lo hace un socio, de uno en uno, y
 * así no se pierde lo que haya de otros tipos de proyecto.
 */
export async function guardarComoPlantilla(
  tipoProyecto: string,
  tareas: Tarea[],
): Promise<ResultadoEscritura<PlantillaTareas>> {
  const supabase = createClient()

  const { data: actual, error } = await supabase
    .from('config_firma')
    .select('plantillas')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error

  const previo = (actual?.plantillas ?? {}) as Record<string, unknown>
  const plantilla = normalizarPlantilla(actual?.plantillas)

  const porEtapa: Record<string, { titulo: string; detalle?: string }[]> = {}
  for (const tarea of [...tareas].sort((a, b) => a.orden - b.orden)) {
    const lista = porEtapa[tarea.etapa] ?? []
    lista.push({ titulo: tarea.titulo, detalle: tarea.detalle ?? undefined })
    porEtapa[tarea.etapa] = lista
  }

  plantilla[tipoProyecto] = porEtapa
  const plantillas = { ...previo, tareas: plantilla }

  return offlineWrite<PlantillaTareas>({
    tabla: 'config_firma',
    operacion: 'update',
    etiqueta: 'Guardar la plantilla de tareas de la firma',
    valores: { plantillas },
    filtro: { id: 1 },
    online: async () => {
      const cliente = createClient()
      const { data, error: fallo } = await cliente
        .from('config_firma')
        .update({ plantillas })
        .eq('id', 1)
        .select('plantillas')
      if (fallo) throw fallo
      return normalizarPlantilla(exigirFilas(data, 'Plantilla de tareas')[0].plantillas)
    },
    offline: plantilla,
  })
}

/**
 * Crea en el proyecto las tareas de la plantilla de su tipo.
 *
 * ⚠️ **Una escritura por tarea, no un lote.** `offlineWrite` encola una
 * operación a la vez y en orden, y así instanciar la plantilla sin señal
 * funciona igual que con ella: quedan doce entradas en la cola con su nombre
 * legible, en vez de un lote que la cola no sabe reproducir.
 */
export async function instanciarPlantilla(
  proyecto: Proyecto,
  plantilla: PlantillaTareas,
  desdeOrden: number,
): Promise<{ creadas: TareaConResponsable[]; encolado: boolean }> {
  const porEtapa = plantilla[proyecto.tipo] ?? {}
  const creadas: TareaConResponsable[] = []
  let encolado = false
  let orden = desdeOrden

  for (const [etapa, tareas] of Object.entries(porEtapa)) {
    for (const tarea of tareas) {
      const resultado = await crearTarea(
        proyecto,
        {
          etapa,
          titulo: tarea.titulo,
          detalle: tarea.detalle ?? null,
          estado: 'pendiente',
          responsable_id: null,
          fecha_compromiso: null,
          orden: orden++,
          // La plantilla no guarda la exigencia de evidencia: se decide por
          // cliente, y marcarla a ciegas en doce tareas dejaría media
          // metodología bloqueada el día que alguien no tenga qué adjuntar.
          exige_evidencia: false,
        },
        null,
      )

      creadas.push(resultado.fila)
      encolado = encolado || resultado.encolado
    }
  }

  return { creadas, encolado }
}
