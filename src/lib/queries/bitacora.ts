/**
 * La bitácora de un proyecto [F01·B4].
 *
 * **La línea de tiempo del cliente**: visitas, entregas, acuerdos, incidencias
 * y los cambios de etapa. Es lo primero que se abre antes de una reunión, y hoy
 * vive en la memoria del consultor y en un hilo de correo de hace ocho meses.
 *
 * ⚠️ Las entradas de tipo `cambio_etapa` **las escribe la base**, no esta capa
 * (`registrar_cambio_etapa()`). Aquí sólo se capturan las de una persona.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Proyecto } from '@/lib/queries/proyectos'
import type { Tables } from '@/types/database'

export type Entrada = Tables<'bitacora_proyecto'>
export type Autor = Pick<Tables<'usuarios'>, 'id' | 'nombre'>
export type EntradaConAutor = Entrada & { autor: Autor | null }

/**
 * ⚠️ Una sola FK a `usuarios` (`creado_por`), así que aquí el embed **no**
 * necesita nombrarla — al revés que en `proyectos` y `tareas_etapa`. Se nombra
 * igualmente: cuando esta tabla gane un `responsable_id`, el día que alguien lo
 * agregue no hay que acordarse de venir a arreglar esto.
 */
const EMBEBIDO_AUTOR =
  '*, autor:usuarios!bitacora_proyecto_creado_por_fkey(id, nombre)'

export async function listarBitacora(proyectoId: string): Promise<EntradaConAutor[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bitacora_proyecto')
    .select(EMBEBIDO_AUTOR)
    .eq('proyecto_id', proyectoId)
    // Lo más reciente arriba; a igual fecha, lo último capturado.
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false })

  if (error) throw error
  return (data ?? []) as EntradaConAutor[]
}

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

export type DatosEntrada = {
  tipo: string
  fecha: string
  titulo: string
  detalle: string | null
  participantes: string[]
}

/**
 * Registrar algo que pasó.
 *
 * ⚠️ Se captura **en la visita**, muchas veces desde la planta y sin señal: pasa
 * por `offlineWrite` como todo lo demás y la etiqueta de la cola dice qué es —
 * «Bitácora: visita de arranque», no un UUID.
 */
export async function crearEntrada(
  proyecto: Proyecto,
  datos: DatosEntrada,
  autor: Autor | null,
): Promise<ResultadoEscritura<EntradaConAutor>> {
  const id = uuid()
  const creadoPor = await idDeLaSesion()

  const valores = {
    id,
    proyecto_id: proyecto.id,
    // La reemplaza `heredar_org_del_proyecto()`; va porque la columna es NOT NULL.
    org_id: proyecto.org_id,
    ...datos,
    creado_por: creadoPor,
  }

  return offlineWrite<EntradaConAutor>({
    tabla: 'bitacora_proyecto',
    operacion: 'insert',
    etiqueta: `Bitácora: ${datos.titulo}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('bitacora_proyecto')
        .insert(valores)
        .select(EMBEBIDO_AUTOR)
      if (error) throw error
      return exigirFilas(data, 'Entrada de bitácora')[0] as EntradaConAutor
    },
    offline: { ...valores, creado_en: new Date().toISOString(), autor } as EntradaConAutor,
  })
}

/**
 * Corregir una entrada.
 *
 * ⚠️ **Sólo su autor, o un socio** — lo impone la política
 * `bitacora_proyecto_update`, no esta función. Y **no hay borrado**: una entrada
 * equivocada se corrige o se aclara con otra. Es una bitácora; si se pudiera
 * vaciar, no serviría para lo que existe.
 */
export async function actualizarEntrada(
  entrada: EntradaConAutor,
  datos: DatosEntrada,
): Promise<ResultadoEscritura<EntradaConAutor>> {
  return offlineWrite<EntradaConAutor>({
    tabla: 'bitacora_proyecto',
    operacion: 'update',
    etiqueta: `Bitácora corregida: ${datos.titulo}`,
    valores: datos,
    filtro: { id: entrada.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('bitacora_proyecto')
        .update(datos)
        .eq('id', entrada.id)
        .select(EMBEBIDO_AUTOR)
      if (error) throw error
      // ⚠️ Cero filas aquí es la política diciendo «ésta no es tuya»: el UPDATE
      // sólo alcanza a su autor o a un socio, y sin esto parecería que guardó.
      return exigirFilas(data, 'Entrada de bitácora')[0] as EntradaConAutor
    },
    offline: { ...entrada, ...datos },
  })
}
