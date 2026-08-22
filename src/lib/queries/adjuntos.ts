/**
 * Adjuntos: la fila y su archivo [F02·B2b].
 *
 * ⚠️ **Las dos fases están aquí juntas a propósito**: `adjuntar()` escribe la
 * fila por la cola normal —para que conserve su orden respecto a las demás
 * escrituras— y encola el binario en la cola de adjuntos, que se vacía después.
 * Ver `src/lib/offline/adjuntos.ts` para el porqué del orden.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import {
  BUCKET_EVIDENCIAS,
  campoDominante,
  encolarSubida,
  quitarSubida,
  rutaDeAdjunto,
  type DestinoAdjunto,
} from '@/lib/offline/adjuntos'
import type { Tables } from '@/types/database'

export type Adjunto = Tables<'adjuntos'>

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/**
 * Los adjuntos de algo, **filtrados por su campo dominante**.
 *
 * ⚠️ Nunca con un OR (docs/03 §8.8, regla 3). Un destino sin campo dominante es
 * el cliente entero, y entonces se piden los que no cuelgan de nada más — no
 * todos los de la organización, que sería enseñarle a un consultor las fotos de
 * cuarenta hallazgos en la ficha del cliente.
 */
export async function listarAdjuntos(orgId: string, destino: DestinoAdjunto): Promise<Adjunto[]> {
  const supabase = createClient()
  const dominante = campoDominante(destino)

  let consulta = supabase.from('adjuntos').select('*').eq('org_id', orgId)

  if (dominante) {
    consulta = consulta.eq(dominante.campo, dominante.id)
  } else {
    consulta = consulta.is('tarea_etapa_id', null).is('documento_id', null)
  }

  const { data, error } = await consulta.order('creado_en', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Adjuntar un archivo. **Escribe la fila y ENCOLA el binario; no sube nada.**
 *
 * Quien sube es `sincronizarAdjuntos()`, y hay que esperarlo antes de refrescar
 * la pantalla (§8.8, regla 4).
 */
export async function adjuntar({
  orgId,
  destino,
  archivo,
  titulo,
}: {
  orgId: string
  destino: DestinoAdjunto
  archivo: File
  titulo: string | null
}): Promise<ResultadoEscritura<Adjunto>> {
  const id = uuid()
  const ruta = rutaDeAdjunto(orgId, id, archivo.name)
  const dominante = campoDominante(destino)

  const valores = {
    id,
    // La reemplaza `heredar_org_del_adjunto()` cuando hay campo dominante; con
    // un adjunto suelto de la organización, ésta es la que vale.
    org_id: orgId,
    tarea_etapa_id: destino.tarea_etapa_id ?? null,
    documento_id: destino.documento_id ?? null,
    ruta,
    nombre: archivo.name,
    tipo_mime: archivo.type || null,
    tamano: archivo.size,
    titulo,
    subido_desde: 'app',
    creado_por: await idDeLaSesion(),
  }

  // ⚠️ El binario se encola ANTES de escribir la fila. Si el orden fuera al
  // revés y la app se cerrara justo en medio, quedaría una fila apuntando a una
  // ruta que nadie va a subir nunca: un adjunto que existe en la lista y no se
  // puede abrir. Al revés, lo que queda es un binario huérfano en IndexedDB, que
  // se sube, no encuentra fila y se limpia — sin perder nada del usuario.
  await encolarSubida({ id, ruta, archivo })

  try {
    return await offlineWrite<Adjunto>({
      tabla: 'adjuntos',
      operacion: 'insert',
      etiqueta: `Adjuntar ${titulo || archivo.name}${dominante ? '' : ' al cliente'}`,
      valores,
      online: async () => {
        const supabase = createClient()
        const { data, error } = await supabase.from('adjuntos').insert(valores).select()
        if (error) throw error
        return exigirFilas(data, 'Adjuntar archivo')[0]
      },
      offline: { ...valores, creado_en: new Date().toISOString() } as Adjunto,
    })
  } catch (problema) {
    // ⚠️ El servidor RECHAZÓ la fila —un 42501 del RLS, casi siempre—, así que
    // el binario ya no tiene a qué colgarse: se saca de la cola. Sin esto se
    // subiría igual y quedaría un objeto en el bucket que nada referencia, y el
    // indicador de conexión enseñaría para siempre «1 archivo por subir» de algo
    // que nunca va a existir. Un fallo de RED no llega aquí: `offlineWrite` lo
    // encola y devuelve normal.
    await quitarSubida(id)
    throw problema
  }
}

/**
 * La URL para ver o descargar un adjunto.
 *
 * ⚠️ **Firmada y caduca.** El bucket es privado porque guarda evidencia de
 * auditoría de plantas industriales. Sin señal esto falla, y no es un fallo de
 * la app: firmar es una llamada al servidor. La pantalla lo dice.
 */
export async function urlDelAdjunto(ruta: string): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from(BUCKET_EVIDENCIAS)
    .createSignedUrl(ruta, 300)

  if (error) throw error
  if (!data?.signedUrl) throw new Error('No se pudo abrir el adjunto.')

  return data.signedUrl
}

/**
 * Quitar un adjunto.
 *
 * ⚠️ **Sólo el socio, y lo impone la base.** Una foto adjunta a un hallazgo
 * [Fase 03] es evidencia de auditoría: si cualquiera pudiera quitarla, la
 * trazabilidad dependería de que nadie se equivoque de botón. Si la política
 * dice que no, el DELETE toca cero filas y `exigirFilas` lo convierte en un
 * error con motivo — no en un «desapareció y al refrescar volvió».
 *
 * ⚠️ **El objeto del bucket NO se borra aquí.** Deliberado mientras no haya un
 * cron de limpieza: un archivo huérfano en Storage cuesta unos centavos; una
 * evidencia borrada por accidente no se recupera.
 */
export async function quitarAdjunto(adjunto: Adjunto): Promise<ResultadoEscritura<{ id: string }>> {
  const filtro = { id: adjunto.id }

  return offlineWrite<{ id: string }>({
    tabla: 'adjuntos',
    operacion: 'delete',
    etiqueta: `Quitar el adjunto ${adjunto.titulo || adjunto.nombre}`,
    filtro,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('adjuntos')
        .delete()
        .eq('id', adjunto.id)
        .select('id')
      if (error) throw error
      return exigirFilas(data, 'Quitar el adjunto')[0]
    },
    offline: filtro,
  })
}
