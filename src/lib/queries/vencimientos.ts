/**
 * Los vencimientos [F05·B2]: lo que caduca — estudios, dictámenes, licencias,
 * recargas, poderes notariales.
 *
 * ⚠️ **No es `obligaciones`** (docs/13 §3.5). La obligación es permanente
 * («contar con el estudio de iluminación»); el vencimiento es la cosa concreta
 * que caduca («estudio del 10-mar-2025, vence el 10-mar-2027, PDF adjunto»).
 *
 * ⚠️ **Una fila por EMISIÓN.** Renovar no reescribe la fila: da de alta otra con
 * `renueva_id`, y la base marca la anterior como `renovado` en la misma
 * escritura. Reescribirla dejaría sin avisos el ciclo nuevo —la `clave_evento`
 * del cron lleva el id— y borraría de la lista el estudio anterior con su PDF
 * (`20260923120000_renovacion_de_vencimientos.sql`).
 *
 * ⚠️ **`vence_en` es `date` y se GUARDA calculada** (docs/13 §5.4): la calcula
 * la pantalla con `sumarMeses()` y la base la exige. Nunca `new Date()` sobre
 * ella: corre un día en México, y aquí un día decide si algo está vencido.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { estadoVisible } from '@/lib/cumplimiento/catalogos'
import { hoyISO } from '@/lib/utils/dates'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type Vencimiento = Tables<'vencimientos'>

export type ContextoVencimiento = {
  organizacion: Pick<Tables<'organizaciones'>, 'id' | 'razon_social' | 'nombre_comercial'> | null
  obligacion: Pick<Tables<'obligaciones'>, 'id' | 'elemento' | 'obligacion'> | null
  tipo: Pick<Tables<'obligacion_tipos'>, 'id' | 'nombre'> | null
  responsable: Pick<Tables<'usuarios'>, 'id' | 'nombre'> | null
  documento: Pick<Tables<'documentos'>, 'id' | 'codigo' | 'titulo'> | null
}

export type VencimientoConContexto = Vencimiento & ContextoVencimiento

/**
 * ⚠️ Un solo literal (CLAUDE.md). `usuarios` va por el nombre de la FK:
 * `vencimientos` le apunta dos veces (responsable y autor).
 */
const EMBEBIDO =
  '*, organizacion:organizaciones(id, razon_social, nombre_comercial), obligacion:obligaciones(id, elemento, obligacion), tipo:obligacion_tipos(id, nombre), responsable:usuarios!vencimientos_responsable_id_fkey(id, nombre), documento:documentos(id, codigo, titulo)'

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/**
 * **Todos los vencimientos visibles de la cartera**, en una sola consulta.
 *
 * ⚠️ **Sin `orgId`, y a propósito**: la usan la pestaña Vencimientos —que
 * filtra el cliente en memoria— y el widget «Vencimientos críticos» del tablero,
 * que cruza la cartera. Compartir la clave hace que abrir una deje lista la
 * otra, y el tablero **no estrena clave**: es la regla de los widgets (§8.10).
 * El RLS ya la recorta a las organizaciones asignadas.
 */
export async function listarVencimientos(): Promise<VencimientoConContexto[]> {
  const { data, error } = await createClient()
    .from('vencimientos')
    .select(EMBEBIDO)
    .order('vence_en')

  if (error) throw error
  return (data ?? []) as VencimientoConContexto[]
}

export type DatosVencimiento = {
  obligacion_id: string | null
  sitio_id: string | null
  area_id: string | null
  tipo_id: string | null
  nombre: string
  emitido_en: string | null
  vigencia_meses: number | null
  vence_en: string
  responsable_id: string | null
  documento_id: string | null
  /** `vigente` = «según la fecha»; la base lo recoloca. */
  estado: string
  notas: string | null
}

/**
 * La fila optimista tiene que decir el estado que va a poner la base, o sin
 * señal un estudio vencido saldría «vigente» hasta sincronizar.
 */
function estadoOptimista(datos: DatosVencimiento): string {
  return estadoVisible({ estado: datos.estado, vence_en: datos.vence_en }, hoyISO())
}

export async function crearVencimiento(
  orgId: string,
  datos: DatosVencimiento & { renueva_id?: string | null },
  contexto: ContextoVencimiento,
): Promise<ResultadoEscritura<VencimientoConContexto>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const valores = {
    id,
    org_id: orgId,
    ...datos,
    renueva_id: datos.renueva_id ?? null,
    creado_por: await idDeLaSesion(),
  }

  return offlineWrite<VencimientoConContexto>({
    tabla: 'vencimientos',
    operacion: 'insert',
    etiqueta: datos.renueva_id ? `Renovación — ${datos.nombre}` : `Vencimiento — ${datos.nombre}`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('vencimientos')
        .insert(valores)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Alta del vencimiento')[0] as VencimientoConContexto
    },
    offline: {
      ...valores,
      estado: estadoOptimista(datos),
      creado_en: ahora,
      actualizado_en: ahora,
      ...contexto,
    },
  })
}

export async function actualizarVencimiento(
  vencimiento: VencimientoConContexto,
  datos: DatosVencimiento,
  contexto: ContextoVencimiento,
): Promise<ResultadoEscritura<VencimientoConContexto>> {
  return offlineWrite<VencimientoConContexto>({
    tabla: 'vencimientos',
    operacion: 'update',
    etiqueta: `Cambios en el vencimiento — ${datos.nombre}`,
    valores: datos,
    filtro: { id: vencimiento.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('vencimientos')
        .update(datos)
        .eq('id', vencimiento.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Cambios en el vencimiento')[0] as VencimientoConContexto
    },
    offline: { ...vencimiento, ...datos, estado: estadoOptimista(datos), ...contexto },
  })
}

/**
 * Quitar uno capturado por error.
 *
 * ⚠️ La política sólo deja quitar uno **sin adjunto**: el dictamen es evidencia.
 * Y un DELETE bloqueado por RLS afecta a cero filas sin lanzar — por eso
 * `.select()` y `exigirFilas`. Quitar una renovación devuelve la anterior a su
 * ciclo (lo hace la base).
 */
export async function eliminarVencimiento(
  vencimiento: VencimientoConContexto,
): Promise<ResultadoEscritura<null>> {
  return offlineWrite<null>({
    tabla: 'vencimientos',
    operacion: 'delete',
    etiqueta: `Quitar el vencimiento — ${vencimiento.nombre}`,
    filtro: { id: vencimiento.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('vencimientos')
        .delete()
        .eq('id', vencimiento.id)
        .select()
      if (error) throw error
      exigirFilas(data, 'Quitar el vencimiento')
      return null
    },
    offline: null,
  })
}
