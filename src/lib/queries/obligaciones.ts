/**
 * La matriz de obligaciones de un cliente y las áreas de sus sitios [F05·B1].
 *
 * ⚠️ **UNA tabla** (decisión 1 del dueño, 22 sep 2026): la matriz de NOMs y la
 * matriz de obligaciones de compliance son lo mismo. Una NOM es un tipo de
 * fuente, no el eje — una obligación de la LFPDPPP o de un contrato vive aquí
 * igual que un extintor, con `nom_id` en null.
 *
 * ⚠️ **`aplica` tiene tres estados**, y el tercero es el que resuelve la
 * especificación: `null` es «generada y todavía sin decidir». La base exige
 * justificación en cuanto alguien decide, en los dos sentidos, y no deja evaluar
 * lo que no aplica. Ver el encabezado de §3 de la migración.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { proximaVerificacion } from '@/lib/cumplimiento/catalogos'
import { toISODate } from '@/lib/utils/dates'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'
import type { Adjunto } from './adjuntos'

export type Obligacion = Tables<'obligaciones'>
export type SitioArea = Tables<'sitio_areas'>

export type ContextoObligacion = {
  nom: Pick<Tables<'noms'>, 'id' | 'clave' | 'nombre'> | null
  requisito: Pick<
    Tables<'nom_requisitos'>,
    'id' | 'numeral' | 'elemento' | 'aplica_si' | 'min_trabajadores' | 'max_trabajadores'
  > | null
  tipo: Pick<Tables<'obligacion_tipos'>, 'id' | 'nombre'> | null
  responsable: Pick<Tables<'usuarios'>, 'id' | 'nombre'> | null
  documento: Pick<Tables<'documentos'>, 'id' | 'codigo' | 'titulo'> | null
}

export type ObligacionConContexto = Obligacion & ContextoObligacion

/**
 * ⚠️ **Un solo literal**, no una concatenación: con `'a' + 'b'` el tipo se
 * ensancha a `string` y supabase-js deja de inferir la fila (CLAUDE.md).
 * `usuarios` va por el nombre de la FK: la tabla le apunta tres veces
 * (responsable, evaluador y autor), y sin nombrarla PostgREST contesta «more
 * than one relationship was found».
 */
const EMBEBIDO =
  '*, nom:noms(id, clave, nombre), requisito:nom_requisitos(id, numeral, elemento, aplica_si, min_trabajadores, max_trabajadores), tipo:obligacion_tipos(id, nombre), responsable:usuarios!obligaciones_responsable_id_fkey(id, nombre), documento:documentos(id, codigo, titulo)'

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/**
 * La matriz entera del cliente, **todos sus sitios y áreas**.
 *
 * ⚠️ Sin filtrar por sitio, por área ni por estado: el recorrido los filtra en
 * memoria (CLAUDE.md · reglas del offline, 7). Con una consulta por sitio, en
 * la planta cambiar de sitio vaciaría la lista.
 */
export async function listarObligaciones(orgId: string): Promise<ObligacionConContexto[]> {
  const { data, error } = await createClient()
    .from('obligaciones')
    .select(EMBEBIDO)
    .eq('org_id', orgId)
    .order('orden')

  if (error) throw error
  return (data ?? []) as ObligacionConContexto[]
}

/**
 * Genera la matriz de una NOM para un sitio. Devuelve cuántas creó.
 *
 * ⚠️ **NO pasa por `offlineWrite`: es la SEXTA excepción consciente** (CLAUDE.md
 * · reglas del offline), por los mismos tres motivos que la quinta
 * (`generarDesdeElAlcance`): es una RPC —la cola reproduce escrituras de tabla,
 * no llamadas a función—, escribe decenas de filas de golpe, y **se hace en la
 * oficina antes de salir**. La pantalla lo dice y no deja empezar sin señal.
 *
 * La RPC es idempotente, no pisa lo evaluado y **no decide si aplica**: eso lo
 * hace una persona, con justificación.
 */
export async function generarObligacionesDeNom(
  orgId: string,
  sitioId: string | null,
  nomId: string,
): Promise<number> {
  const { data, error } = await createClient().rpc('generar_obligaciones_de_nom', {
    p_org: orgId,
    // ⚠️ El generador de tipos marca los parámetros como `string` aunque la
    // función acepte null; una obligación de alcance organizacional —la carpeta
    // de un despacho sin sitios— sí existe.
    p_sitio: sitioId as string,
    p_nom: nomId,
  })

  if (error) throw error
  return data ?? 0
}

export type DatosObligacion = {
  sitio_id: string | null
  area_id: string | null
  tipo_id: string | null
  nom_id: string | null
  elemento: string | null
  fuente: string | null
  naturaleza: string[]
  obligacion: string
  aplica: boolean | null
  justificacion: string | null
  responsable_id: string | null
  documento_id: string | null
  evidencia_esperada: string | null
  frecuencia_verificacion: string | null
}

export async function crearObligacion(
  orgId: string,
  datos: DatosObligacion & { nom_requisito_id?: string | null; orden?: number },
  contexto: ContextoObligacion,
): Promise<ResultadoEscritura<ObligacionConContexto>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const valores = {
    id,
    org_id: orgId,
    ...datos,
    nom_requisito_id: datos.nom_requisito_id ?? null,
    orden: datos.orden ?? 0,
    creado_por: await idDeLaSesion(),
  }

  return offlineWrite<ObligacionConContexto>({
    tabla: 'obligaciones',
    operacion: 'insert',
    etiqueta: `Obligación — ${datos.elemento || datos.obligacion}`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('obligaciones')
        .insert(valores)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Alta de la obligación')[0] as ObligacionConContexto
    },
    offline: {
      ...valores,
      estado_cumplimiento: 'sin_evaluar',
      observacion: null,
      evaluado_en: null,
      evaluado_por_id: null,
      proxima_verificacion: null,
      creado_en: ahora,
      actualizado_en: ahora,
      ...contexto,
    },
  })
}

export async function actualizarObligacion(
  obligacion: ObligacionConContexto,
  datos: DatosObligacion,
  contexto: ContextoObligacion,
): Promise<ResultadoEscritura<ObligacionConContexto>> {
  return offlineWrite<ObligacionConContexto>({
    tabla: 'obligaciones',
    operacion: 'update',
    etiqueta: `Cambios en la obligación — ${datos.elemento || datos.obligacion}`,
    valores: datos,
    filtro: { id: obligacion.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('obligaciones')
        .update(datos)
        .eq('id', obligacion.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Cambios en la obligación')[0] as ObligacionConContexto
    },
    offline: { ...obligacion, ...datos, ...contexto },
  })
}

/**
 * **La misma obligación, en otra área.** Es el gesto del recorrido: el elemento
 * «Extintores» se generó para el sitio y el consultor lo va evaluando área por
 * área. Copia el deber y lo decidido; nace sin evaluar.
 *
 * ⚠️ Pasa por la cola, al revés que la RPC: es UNA fila y se hace en el piso.
 */
export async function copiarAlArea(
  obligacion: ObligacionConContexto,
  area: SitioArea,
): Promise<ResultadoEscritura<ObligacionConContexto>> {
  const { nom, requisito, tipo, responsable, documento } = obligacion
  return crearObligacion(
    obligacion.org_id,
    {
      sitio_id: area.sitio_id,
      area_id: area.id,
      tipo_id: obligacion.tipo_id,
      nom_id: obligacion.nom_id,
      nom_requisito_id: obligacion.nom_requisito_id,
      elemento: obligacion.elemento,
      fuente: obligacion.fuente,
      naturaleza: obligacion.naturaleza,
      obligacion: obligacion.obligacion,
      aplica: obligacion.aplica,
      justificacion: obligacion.justificacion,
      responsable_id: obligacion.responsable_id,
      documento_id: obligacion.documento_id,
      evidencia_esperada: obligacion.evidencia_esperada,
      frecuencia_verificacion: obligacion.frecuencia_verificacion,
      orden: obligacion.orden,
    },
    { nom, requisito, tipo, responsable, documento },
  )
}

/**
 * Quitar una obligación generada por error.
 *
 * ⚠️ La política sólo deja quitar una **sin evaluar, sin fotos y sin
 * vencimientos**: una evaluación es evidencia (regla 13). Y un DELETE bloqueado
 * por RLS no lanza — afecta a cero filas y PostgREST responde 200. Por eso
 * `.select()` y `exigirFilas`.
 */
export async function eliminarObligacion(
  obligacion: ObligacionConContexto,
): Promise<ResultadoEscritura<null>> {
  return offlineWrite<null>({
    tabla: 'obligaciones',
    operacion: 'delete',
    etiqueta: `Quitar la obligación — ${obligacion.elemento || obligacion.obligacion}`,
    filtro: { id: obligacion.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('obligaciones')
        .delete()
        .eq('id', obligacion.id)
        .select()
      if (error) throw error
      exigirFilas(data, 'Quitar la obligación')
      return null
    },
    offline: null,
  })
}

export type Evaluacion = { estado: string; observacion: string | null }

/**
 * Evaluar un elemento en el recorrido.
 *
 * ⚠️ **`evaluado_en` lo manda el TELÉFONO** (docs/13 §5.3): se evalúa a las
 * 10:15 en modo avión y la fila llega a las 14:00. El QUIÉN lo sella la base, y
 * además la base **conserva** quién y cuándo si el veredicto no cambia: corregir
 * la observación no mueve la hora del recorrido.
 */
export async function registrarEvaluacion(
  obligacion: ObligacionConContexto,
  cambios: Evaluacion,
  evaluadoPor: string | null,
): Promise<ResultadoEscritura<ObligacionConContexto>> {
  const cambiaEstado = cambios.estado !== obligacion.estado_cumplimiento
  const ahora = new Date()

  const evaluado_en = !cambiaEstado
    ? obligacion.evaluado_en
    : cambios.estado === 'sin_evaluar'
      ? null
      : ahora.toISOString()

  const valores = {
    estado_cumplimiento: cambios.estado,
    observacion: cambios.observacion,
    evaluado_en,
  }
  const nombre = obligacion.elemento || obligacion.obligacion

  return offlineWrite<ObligacionConContexto>({
    tabla: 'obligaciones',
    operacion: 'update',
    etiqueta: cambiaEstado
      ? `${cambios.estado === 'sin_evaluar' ? 'Sin evaluar' : cambios.estado.replace('_', ' ')} — ${nombre}`
      : `Observación — ${nombre}`,
    valores,
    filtro: { id: obligacion.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('obligaciones')
        .update(valores)
        .eq('id', obligacion.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Evaluación')[0] as ObligacionConContexto
    },
    offline: {
      ...obligacion,
      ...valores,
      // Lo que va a escribir el trigger, para que la fila optimista no diga
      // «sin evaluar por nadie» ni pierda su próxima fecha durante el recorrido.
      evaluado_por_id:
        cambios.estado === 'sin_evaluar'
          ? null
          : cambiaEstado
            ? evaluadoPor
            : obligacion.evaluado_por_id,
      proxima_verificacion:
        cambios.estado === 'sin_evaluar'
          ? null
          : cambiaEstado
            ? proximaVerificacion(toISODate(ahora), obligacion.frecuencia_verificacion)
            : obligacion.proxima_verificacion,
    },
  })
}

// ═══════════════════════════════════════════════════════════════ áreas ══

/** Las áreas de todos los sitios del cliente; el sitio se filtra en memoria. */
export async function listarAreas(orgId: string): Promise<SitioArea[]> {
  const { data, error } = await createClient()
    .from('sitio_areas')
    .select('*')
    .eq('org_id', orgId)
    .order('orden')
    .order('nombre')

  if (error) throw error
  return data ?? []
}

export async function crearArea(
  orgId: string,
  sitioId: string,
  nombre: string,
  orden: number,
): Promise<ResultadoEscritura<SitioArea>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  // `org_id` se manda porque es NOT NULL; la pisa `heredar_org_del_sitio()`.
  const valores = { id, org_id: orgId, sitio_id: sitioId, nombre, orden, creado_por: await idDeLaSesion() }

  return offlineWrite<SitioArea>({
    tabla: 'sitio_areas',
    operacion: 'insert',
    etiqueta: `Área «${nombre}»`,
    valores,
    online: async () => {
      const { data, error } = await createClient().from('sitio_areas').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, 'Alta del área')[0]
    },
    offline: { ...valores, activa: true, creado_en: ahora, actualizado_en: ahora },
  })
}

export async function cambiarActivaArea(
  area: SitioArea,
  activa: boolean,
): Promise<ResultadoEscritura<SitioArea>> {
  return offlineWrite<SitioArea>({
    tabla: 'sitio_areas',
    operacion: 'update',
    etiqueta: `${activa ? 'Reactivar' : 'Dar de baja'} el área «${area.nombre}»`,
    valores: { activa },
    filtro: { id: area.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('sitio_areas')
        .update({ activa })
        .eq('id', area.id)
        .select()
      if (error) throw error
      return exigirFilas(data, 'Baja del área')[0]
    },
    offline: { ...area, activa },
  })
}

/**
 * Quitar un área capturada por error.
 *
 * ⚠️ **Una con obligaciones o vencimientos no se quita** —la política lo impide,
 * porque el `on delete cascade` se llevaría las evaluaciones y sus fotos
 * saltándose el RLS—. Se da de baja.
 */
export async function eliminarArea(area: SitioArea): Promise<ResultadoEscritura<null>> {
  return offlineWrite<null>({
    tabla: 'sitio_areas',
    operacion: 'delete',
    etiqueta: `Quitar el área «${area.nombre}»`,
    filtro: { id: area.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('sitio_areas')
        .delete()
        .eq('id', area.id)
        .select()
      if (error) throw error
      exigirFilas(data, 'Quitar el área')
      return null
    },
    offline: null,
  })
}

// ═════════════════════════════════════════════════════════════ evidencia ══

/**
 * La evidencia de **todas** las obligaciones del cliente, en una consulta.
 *
 * ⚠️ Una por obligación serían cien viajes en la precarga; ésta es una. La fila
 * del recorrido cuenta las suyas en memoria.
 */
export async function listarAdjuntosDeObligaciones(orgId: string): Promise<Adjunto[]> {
  const { data, error } = await createClient()
    .from('adjuntos')
    .select('*')
    .eq('org_id', orgId)
    .not('obligacion_id', 'is', null)
    .order('creado_en', { ascending: false })

  if (error) throw error
  return data ?? []
}
