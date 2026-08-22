/**
 * El mapa de procesos del cliente [F02·B4].
 *
 * De aquí cuelgan tres cosas: el **proceso dueño** de un documento, el proceso
 * al que pertenece un **riesgo** y el que mide un **indicador**. Sin esta tabla
 * los tres serían texto libre y no habría forma de contestar la pregunta que se
 * hace en cada revisión por la dirección: *"¿qué riesgos tiene Compras y cómo va
 * su indicador?"*.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type Proceso = Tables<'procesos'>
export type DuenoProceso = Pick<Tables<'contactos'>, 'id' | 'nombre' | 'puesto'>
export type ProcesoConDueno = Proceso & { dueno: DuenoProceso | null }

/**
 * ⚠️ El embed se nombra por la clave foránea. `procesos` sólo apunta una vez a
 * `contactos`, pero nombrarla cuesta lo mismo y ahorra el
 * *"more than one relationship was found"* del día que se añada un segundo
 * responsable.
 */
const EMBEBIDO_DUENO = '*, dueno:contactos!procesos_dueno_contacto_id_fkey(id, nombre, puesto)'

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/**
 * El mapa entero de un cliente, **incluidos los inactivos**.
 *
 * ⚠️ Los da de baja el filtro de la pantalla, no la consulta: un proceso
 * inactivo sigue siendo el dueño de documentos aprobados, y una lista que no lo
 * trae deja esos documentos diciendo «sin proceso» sin que nadie lo haya
 * quitado. Es la misma regla que la del buscador: se descarga una vez y se
 * filtra en memoria.
 */
export async function listarProcesos(orgId: string): Promise<ProcesoConDueno[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('procesos')
    .select(EMBEBIDO_DUENO)
    .eq('org_id', orgId)
    .order('orden')
    .order('nombre')

  if (error) throw error
  return (data ?? []) as ProcesoConDueno[]
}

export type DatosProceso = {
  codigo: string | null
  nombre: string
  tipo: string
  dueno_contacto_id: string | null
  objetivo: string | null
  entradas: string | null
  salidas: string | null
  orden: number
}

export async function crearProceso(
  orgId: string,
  datos: DatosProceso,
  dueno: DuenoProceso | null,
): Promise<ResultadoEscritura<ProcesoConDueno>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const creadoPor = await idDeLaSesion()

  const valores = { id, org_id: orgId, ...datos, creado_por: creadoPor }

  return offlineWrite<ProcesoConDueno>({
    tabla: 'procesos',
    operacion: 'insert',
    etiqueta: `Alta de proceso — ${datos.nombre}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('procesos').insert(valores).select(EMBEBIDO_DUENO)
      if (error) throw error
      return exigirFilas(data, 'Alta de proceso')[0] as ProcesoConDueno
    },
    offline: {
      ...valores,
      activo: true,
      creado_en: ahora,
      actualizado_en: ahora,
      dueno,
    } as ProcesoConDueno,
  })
}

export async function actualizarProceso(
  proceso: ProcesoConDueno,
  datos: DatosProceso,
  dueno: DuenoProceso | null,
): Promise<ResultadoEscritura<ProcesoConDueno>> {
  return offlineWrite<ProcesoConDueno>({
    tabla: 'procesos',
    operacion: 'update',
    etiqueta: `Cambios en el proceso ${datos.nombre}`,
    valores: datos,
    filtro: { id: proceso.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('procesos')
        .update(datos)
        .eq('id', proceso.id)
        .select(EMBEBIDO_DUENO)
      if (error) throw error
      return exigirFilas(data, 'Cambios en el proceso')[0] as ProcesoConDueno
    },
    offline: { ...proceso, ...datos, dueno },
  })
}

/**
 * Baja de un proceso.
 *
 * ⚠️ **Baja, no borrado, y por el mismo motivo que un sitio**: puede haber
 * documentos aprobados, riesgos e indicadores apuntando a él. La política de
 * DELETE existe —un proceso capturado por error se quita—, pero el gesto normal
 * de la pantalla es éste: el mapa de procesos de un cliente cambia con los años
 * y la versión anterior sigue explicando por qué el procedimiento decía lo que
 * decía.
 */
export async function cambiarActivoProceso(
  proceso: ProcesoConDueno,
  activo: boolean,
): Promise<ResultadoEscritura<ProcesoConDueno>> {
  return offlineWrite<ProcesoConDueno>({
    tabla: 'procesos',
    operacion: 'update',
    etiqueta: `${activo ? 'Reactivar' : 'Dar de baja'} el proceso ${proceso.nombre}`,
    valores: { activo },
    filtro: { id: proceso.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('procesos')
        .update({ activo })
        .eq('id', proceso.id)
        .select(EMBEBIDO_DUENO)
      if (error) throw error
      return exigirFilas(data, 'Baja del proceso')[0] as ProcesoConDueno
    },
    offline: { ...proceso, activo },
  })
}
