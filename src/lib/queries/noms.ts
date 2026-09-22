/**
 * La biblioteca de cumplimiento de la firma [F05·B1]: NOMs, sus elementos
 * verificables y los tipos de obligación.
 *
 * ⚠️ **LA BIBLIOTECA LA CONSTRUYE EL USUARIO** (decisión del dueño, 22 sep 2026).
 * `noms`, `nom_requisitos` y `obligacion_tipos` nacen vacías y las llena un
 * socio desde la pantalla, con sus palabras (regla 12). Por eso aquí hay alta,
 * edición y baja — al revés que el importador de normas, que sólo importa.
 *
 * ⚠️ **Baja es apagar, nunca borrar.** No hay función de borrado: hay
 * obligaciones colgando de cada requisito, y la base no tiene política de
 * DELETE para ninguna de las tres tablas. Ofrecer un botón que termina en cero
 * filas es peor que no ofrecerlo.
 *
 * ⚠️ **Una NOM nueva es otra fila.** La clave lleva el año
 * (`NOM-035-STPS-2018`): cuando sale la versión nueva se da de alta como otra
 * NOM y la vieja pasa a `vigente = false`. Editar la clave de una existente para
 * «actualizarla» reescribiría lo que citan las obligaciones ya evaluadas.
 *
 * ⚠️ **Nada de `upsert` sobre `clave`**: el índice único es
 * `(clave, es_demo)`, no la clave primaria, y la cola resuelve los `upsert` por
 * la PK (docs/03 §6.1). Es la lección de `A10` con `normas.clave`.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type Nom = Tables<'noms'>
export type NomRequisito = Tables<'nom_requisitos'>
export type ObligacionTipo = Tables<'obligacion_tipos'>
export type NomConRequisitos = Nom & { requisitos: NomRequisito[] }

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/**
 * La biblioteca entera, **con las NOMs sustituidas y los elementos apagados**.
 *
 * ⚠️ Los esconde la pantalla, no la consulta: una obligación evaluada el año
 * pasado sigue citando un elemento que hoy está apagado, y la matriz tiene que
 * poder decir cuál era.
 */
export async function listarNoms(): Promise<NomConRequisitos[]> {
  const { data, error } = await createClient()
    .from('noms')
    .select('*, requisitos:nom_requisitos(*)')
    .order('clave')

  if (error) throw error

  return ((data ?? []) as NomConRequisitos[]).map((nom) => ({
    ...nom,
    requisitos: [...(nom.requisitos ?? [])].sort(
      (a, b) => a.orden - b.orden || (a.numeral ?? '').localeCompare(b.numeral ?? '', 'es', { numeric: true }),
    ),
  }))
}

export type DatosNom = {
  clave: string
  nombre: string
  autoridad: string
  tipo: string | null
  periodicidad: string | null
  vigente: boolean
}

export async function crearNom(datos: DatosNom): Promise<ResultadoEscritura<NomConRequisitos>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  // `es_demo` no se manda: lo sella `sellar_particion()`.
  const valores = { id, ...datos, creado_por: await idDeLaSesion() }

  return offlineWrite<NomConRequisitos>({
    tabla: 'noms',
    operacion: 'insert',
    etiqueta: `Alta de la ${datos.clave} en la biblioteca`,
    valores,
    online: async () => {
      const { data, error } = await createClient().from('noms').insert(valores).select()
      if (error) throw error
      return { ...exigirFilas(data, 'Alta de NOM')[0], requisitos: [] }
    },
    offline: {
      ...valores,
      es_demo: false,
      creado_en: ahora,
      actualizado_en: ahora,
      requisitos: [],
    },
  })
}

export async function actualizarNom(
  nom: NomConRequisitos,
  datos: DatosNom,
): Promise<ResultadoEscritura<NomConRequisitos>> {
  return offlineWrite<NomConRequisitos>({
    tabla: 'noms',
    operacion: 'update',
    etiqueta: `Cambios en la ${datos.clave}`,
    valores: datos,
    filtro: { id: nom.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('noms')
        .update(datos)
        .eq('id', nom.id)
        .select()
      if (error) throw error
      return { ...exigirFilas(data, 'Cambios en la NOM')[0], requisitos: nom.requisitos }
    },
    offline: { ...nom, ...datos },
  })
}

export type DatosRequisito = {
  numeral: string | null
  elemento: string
  descripcion: string
  evidencia_esperada: string | null
  aplica_si: string | null
  min_trabajadores: number | null
  max_trabajadores: number | null
  orden: number
  activa: boolean
}

export async function crearRequisito(
  nomId: string,
  datos: DatosRequisito,
): Promise<ResultadoEscritura<NomRequisito>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const valores = { id, nom_id: nomId, ...datos, creado_por: await idDeLaSesion() }

  return offlineWrite<NomRequisito>({
    tabla: 'nom_requisitos',
    operacion: 'insert',
    etiqueta: `Elemento «${datos.elemento}»`,
    valores,
    online: async () => {
      const { data, error } = await createClient().from('nom_requisitos').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, 'Alta del elemento')[0]
    },
    offline: { ...valores, es_demo: false, creado_en: ahora, actualizado_en: ahora },
  })
}

export async function actualizarRequisito(
  requisito: NomRequisito,
  datos: DatosRequisito,
): Promise<ResultadoEscritura<NomRequisito>> {
  return offlineWrite<NomRequisito>({
    tabla: 'nom_requisitos',
    operacion: 'update',
    etiqueta: `Cambios en el elemento «${datos.elemento}»`,
    valores: datos,
    filtro: { id: requisito.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('nom_requisitos')
        .update(datos)
        .eq('id', requisito.id)
        .select()
      if (error) throw error
      return exigirFilas(data, 'Cambios en el elemento')[0]
    },
    offline: { ...requisito, ...datos },
  })
}

// ═══════════════════════════════════════════════════ tipos de obligación ══

/** Todos, activos y dados de baja: una obligación vieja puede citar uno apagado. */
export async function listarTiposObligacion(): Promise<ObligacionTipo[]> {
  const { data, error } = await createClient()
    .from('obligacion_tipos')
    .select('*')
    .order('orden')
    .order('nombre')

  if (error) throw error
  return data ?? []
}

export type DatosTipo = { clave: string; nombre: string; descripcion: string | null; orden: number }

export async function crearTipoObligacion(datos: DatosTipo): Promise<ResultadoEscritura<ObligacionTipo>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const valores = { id, ...datos, creado_por: await idDeLaSesion() }

  return offlineWrite<ObligacionTipo>({
    tabla: 'obligacion_tipos',
    operacion: 'insert',
    etiqueta: `Tipo de obligación «${datos.nombre}»`,
    valores,
    online: async () => {
      const { data, error } = await createClient().from('obligacion_tipos').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, 'Alta del tipo')[0]
    },
    offline: { ...valores, activo: true, es_demo: false, creado_en: ahora, actualizado_en: ahora },
  })
}

export async function cambiarActivoTipo(
  tipo: ObligacionTipo,
  activo: boolean,
): Promise<ResultadoEscritura<ObligacionTipo>> {
  return offlineWrite<ObligacionTipo>({
    tabla: 'obligacion_tipos',
    operacion: 'update',
    etiqueta: `${activo ? 'Reactivar' : 'Dar de baja'} el tipo «${tipo.nombre}»`,
    valores: { activo },
    filtro: { id: tipo.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('obligacion_tipos')
        .update({ activo })
        .eq('id', tipo.id)
        .select()
      if (error) throw error
      return exigirFilas(data, 'Baja del tipo')[0]
    },
    offline: { ...tipo, activo },
  })
}
