/**
 * Capacitación [F05·B3]: la biblioteca de la firma (cursos y proveedores), el
 * programa anual de cada cliente, sus sesiones y sus asistentes con su DC-3.
 *
 * ⚠️ **Listas PLANAS, sin embebidos.** Cursos y proveedores son catálogos que ya
 * están en la caché —son los desplegables de los formularios, regla 3 del
 * offline—, así que la pantalla los cruza en memoria. Con embebidos, cada fila
 * optimista tendría que fabricar su contexto a mano y cambiarle el nombre a un
 * curso dejaría viejas cien filas cacheadas.
 *
 * ⚠️ **Summit NO emite DC-3** (`F03`). `folio_dc3` y `dc3_recibido_en` se
 * capturan cuando el proveedor manda la constancia; el PDF es un adjunto.
 *
 * ⚠️ Toda escritura por `offlineWrite`: una lista de asistencia se captura en la
 * sala de capacitación de una planta, que es donde no hay señal.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type Curso = Tables<'cursos'>
export type Proveedor = Tables<'proveedores_capacitacion'>
export type RenglonDnc = Tables<'dnc'>
export type Sesion = Tables<'sesiones'>
export type Asistente = Tables<'asistentes'>

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

// Un DELETE bloqueado por RLS afecta a cero filas sin lanzar: por eso cada
// borrado pide `.select()` y pasa por `exigirFilas`.
//
// ⚠️ Cada función nombra su tabla con un LITERAL, aunque se repitan. Un helper
// genérico sobre la unión de las cinco tablas deja a supabase-js sin poder
// inferir la fila, y «arreglarlo» con un cliente sin tipos sería renunciar a la
// regla 9.

/** Los dos sellos de la fila optimista; la base pone los suyos al llegar. */
function sellos() {
  const ahora = new Date().toISOString()
  return { creado_en: ahora, actualizado_en: ahora }
}

// ═══════════════════════════════════════════════════ la biblioteca: cursos ══

/** Todos, activos y dados de baja: una sesión vieja puede citar uno apagado. */
export async function listarCursos(): Promise<Curso[]> {
  const { data, error } = await createClient().from('cursos').select('*').order('nombre')
  if (error) throw error
  return data ?? []
}

export type DatosCurso = Pick<Curso, 'clave' | 'nombre' | 'tipo' | 'nom_id' | 'duracion_horas' | 'temario' | 'modalidad'>

export async function crearCurso(datos: DatosCurso): Promise<ResultadoEscritura<Curso>> {
  const valores = { id: uuid(), ...datos, creado_por: await idDeLaSesion() }
  const etiqueta = `Curso «${datos.nombre}»`
  return offlineWrite<Curso>({
    tabla: 'cursos', operacion: 'insert', etiqueta, valores,
    online: async () => {
      const { data, error } = await createClient().from('cursos').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, etiqueta)[0]
    },
    offline: { ...valores, activo: true, es_demo: false, ...sellos() },
  })
}

export async function actualizarCurso(
  curso: Curso,
  datos: Partial<DatosCurso> & { activo?: boolean },
): Promise<ResultadoEscritura<Curso>> {
  const etiqueta = `Cambios en el curso «${datos.nombre ?? curso.nombre}»`
  return offlineWrite<Curso>({
    tabla: 'cursos', operacion: 'update', etiqueta, valores: datos, filtro: { id: curso.id },
    online: async () => {
      const { data, error } = await createClient().from('cursos').update(datos).eq('id', curso.id).select()
      if (error) throw error
      return exigirFilas(data, etiqueta)[0]
    },
    offline: { ...curso, ...datos },
  })
}

// ═════════════════════════════════════════════ la biblioteca: proveedores ══

export async function listarProveedores(): Promise<Proveedor[]> {
  const { data, error } = await createClient().from('proveedores_capacitacion').select('*').order('nombre')
  if (error) throw error
  return data ?? []
}

export type DatosProveedor = Pick<
  Proveedor,
  'nombre' | 'razon_social' | 'rfc' | 'registro_stps' | 'contacto' | 'correo' | 'telefono' | 'notas'
>

export async function crearProveedor(datos: DatosProveedor): Promise<ResultadoEscritura<Proveedor>> {
  const valores = { id: uuid(), ...datos, creado_por: await idDeLaSesion() }
  const etiqueta = `Proveedor «${datos.nombre}»`
  return offlineWrite<Proveedor>({
    tabla: 'proveedores_capacitacion', operacion: 'insert', etiqueta, valores,
    online: async () => {
      const { data, error } = await createClient().from('proveedores_capacitacion').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, etiqueta)[0]
    },
    offline: { ...valores, activo: true, es_demo: false, ...sellos() },
  })
}

export async function actualizarProveedor(
  proveedor: Proveedor,
  datos: Partial<DatosProveedor> & { activo?: boolean },
): Promise<ResultadoEscritura<Proveedor>> {
  const etiqueta = `Cambios en el proveedor «${datos.nombre ?? proveedor.nombre}»`
  return offlineWrite<Proveedor>({
    tabla: 'proveedores_capacitacion', operacion: 'update', etiqueta, valores: datos, filtro: { id: proveedor.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('proveedores_capacitacion').update(datos).eq('id', proveedor.id).select()
      if (error) throw error
      return exigirFilas(data, etiqueta)[0]
    },
    offline: { ...proveedor, ...datos },
  })
}

// ═══════════════════════════════════════════ el programa anual (DNC) ══

/** El programa de un cliente, todos los años: el año se filtra en memoria. */
export async function listarDnc(orgId: string): Promise<RenglonDnc[]> {
  const { data, error } = await createClient()
    .from('dnc').select('*').eq('org_id', orgId)
    .order('anio').order('mes')
  if (error) throw error
  return data ?? []
}

export type DatosDnc = Pick<RenglonDnc, 'anio' | 'mes' | 'curso_id' | 'sitio_id' | 'participantes' | 'notas'>

export async function crearDnc(
  orgId: string,
  datos: DatosDnc,
  nombreCurso: string,
): Promise<ResultadoEscritura<RenglonDnc>> {
  const valores = { id: uuid(), org_id: orgId, ...datos, creado_por: await idDeLaSesion() }
  const etiqueta = `Programa — ${nombreCurso}`
  return offlineWrite<RenglonDnc>({
    tabla: 'dnc', operacion: 'insert', etiqueta, valores,
    online: async () => {
      const { data, error } = await createClient().from('dnc').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, etiqueta)[0]
    },
    offline: { ...valores, cancelada: false, motivo_cancelacion: null, ...sellos() },
  })
}

export async function actualizarDnc(
  renglon: RenglonDnc,
  datos: Partial<DatosDnc> & { cancelada?: boolean; motivo_cancelacion?: string | null },
  nombreCurso: string,
): Promise<ResultadoEscritura<RenglonDnc>> {
  const etiqueta = `Programa — ${nombreCurso}`
  return offlineWrite<RenglonDnc>({
    tabla: 'dnc', operacion: 'update', etiqueta, valores: datos, filtro: { id: renglon.id },
    online: async () => {
      const { data, error } = await createClient().from('dnc').update(datos).eq('id', renglon.id).select()
      if (error) throw error
      return exigirFilas(data, etiqueta)[0]
    },
    offline: { ...renglon, ...datos },
  })
}

/** ⚠️ Uno con sesión no se quita (política): se cancela, con motivo. */
export async function eliminarDnc(renglon: RenglonDnc, nombreCurso: string): Promise<ResultadoEscritura<null>> {
  const etiqueta = `Quitar del programa — ${nombreCurso}`
  return offlineWrite<null>({
    tabla: 'dnc', operacion: 'delete', etiqueta, filtro: { id: renglon.id },
    online: async () => {
      const { data, error } = await createClient().from('dnc').delete().eq('id', renglon.id).select()
      if (error) throw error
      exigirFilas(data, etiqueta)
      return null
    },
    offline: null,
  })
}

// ═══════════════════════════════════════════════════════════════ sesiones ══

export async function listarSesiones(orgId: string): Promise<Sesion[]> {
  const { data, error } = await createClient()
    .from('sesiones').select('*').eq('org_id', orgId)
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return data ?? []
}

export type DatosSesion = Pick<
  Sesion,
  'curso_id' | 'dnc_id' | 'proveedor_id' | 'instructor' | 'fecha_inicio' | 'fecha_fin' |
  'duracion_horas' | 'sede' | 'sitio_id' | 'estado' | 'motivo_cancelacion' | 'notas'
>

export async function crearSesion(
  orgId: string,
  datos: DatosSesion,
  nombreCurso: string,
): Promise<ResultadoEscritura<Sesion>> {
  const valores = { id: uuid(), org_id: orgId, ...datos, creado_por: await idDeLaSesion() }
  const etiqueta = `Sesión — ${nombreCurso}`
  return offlineWrite<Sesion>({
    tabla: 'sesiones', operacion: 'insert', etiqueta, valores,
    online: async () => {
      const { data, error } = await createClient().from('sesiones').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, etiqueta)[0]
    },
    offline: { ...valores, ...sellos() },
  })
}

export async function actualizarSesion(
  sesion: Sesion,
  datos: Partial<DatosSesion>,
  nombreCurso: string,
): Promise<ResultadoEscritura<Sesion>> {
  const etiqueta = `Sesión — ${nombreCurso}`
  return offlineWrite<Sesion>({
    tabla: 'sesiones', operacion: 'update', etiqueta, valores: datos, filtro: { id: sesion.id },
    online: async () => {
      const { data, error } = await createClient().from('sesiones').update(datos).eq('id', sesion.id).select()
      if (error) throw error
      return exigirFilas(data, etiqueta)[0]
    },
    offline: { ...sesion, ...datos },
  })
}

/** ⚠️ Sólo sin impartir, sin asistentes y sin evidencia (política). */
export async function eliminarSesion(sesion: Sesion, nombreCurso: string): Promise<ResultadoEscritura<null>> {
  const etiqueta = `Quitar la sesión — ${nombreCurso}`
  return offlineWrite<null>({
    tabla: 'sesiones', operacion: 'delete', etiqueta, filtro: { id: sesion.id },
    online: async () => {
      const { data, error } = await createClient().from('sesiones').delete().eq('id', sesion.id).select()
      if (error) throw error
      exigirFilas(data, etiqueta)
      return null
    },
    offline: null,
  })
}

// ═════════════════════════════════════════════════════════════ asistentes ══

/**
 * Los asistentes de **todas** las sesiones del cliente, en una consulta: la
 * lista de sesiones cuenta los DC-3 pendientes de cada una en memoria, y la
 * ficha filtra los suyos. Una consulta por sesión serían veinte claves que
 * pueden faltar en la caché.
 */
export async function listarAsistentes(orgId: string): Promise<Asistente[]> {
  const { data, error } = await createClient()
    .from('asistentes').select('*').eq('org_id', orgId)
    .order('nombre')
  if (error) throw error
  return data ?? []
}

export type DatosAsistente = Pick<
  Asistente,
  'nombre' | 'curp' | 'puesto' | 'ocupacion' | 'asistio' | 'calificacion' | 'folio_dc3' | 'dc3_recibido_en' | 'notas'
>

export async function crearAsistente(
  orgId: string,
  sesionId: string,
  datos: DatosAsistente,
): Promise<ResultadoEscritura<Asistente>> {
  // `org_id` se manda porque es NOT NULL; la pisa `heredar_org_de_la_sesion()`.
  const valores = { id: uuid(), org_id: orgId, sesion_id: sesionId, ...datos, creado_por: await idDeLaSesion() }
  const etiqueta = `Asistente — ${datos.nombre}`
  return offlineWrite<Asistente>({
    tabla: 'asistentes', operacion: 'insert', etiqueta, valores,
    online: async () => {
      const { data, error } = await createClient().from('asistentes').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, etiqueta)[0]
    },
    offline: { ...valores, ...sellos() },
  })
}

export async function actualizarAsistente(
  asistente: Asistente,
  datos: Partial<DatosAsistente>,
): Promise<ResultadoEscritura<Asistente>> {
  const etiqueta = datos.folio_dc3 && datos.folio_dc3 !== asistente.folio_dc3
    ? `DC-3 ${datos.folio_dc3} — ${asistente.nombre}`
    : `Asistente — ${datos.nombre ?? asistente.nombre}`
  return offlineWrite<Asistente>({
    tabla: 'asistentes', operacion: 'update', etiqueta, valores: datos, filtro: { id: asistente.id },
    online: async () => {
      const { data, error } = await createClient().from('asistentes').update(datos).eq('id', asistente.id).select()
      if (error) throw error
      return exigirFilas(data, etiqueta)[0]
    },
    offline: { ...asistente, ...datos },
  })
}

/** ⚠️ Uno con DC-3 registrado o con PDF adjunto no se quita (política). */
export async function eliminarAsistente(asistente: Asistente): Promise<ResultadoEscritura<null>> {
  const etiqueta = `Quitar a ${asistente.nombre} de la sesión`
  return offlineWrite<null>({
    tabla: 'asistentes', operacion: 'delete', etiqueta, filtro: { id: asistente.id },
    online: async () => {
      const { data, error } = await createClient().from('asistentes').delete().eq('id', asistente.id).select()
      if (error) throw error
      exigirFilas(data, etiqueta)
      return null
    },
    offline: null,
  })
}
