/**
 * Quejas y sugerencias de cliente [F04·B1] — `P-SG-07` · `F-SG-08` · `F-SG-10`.
 *
 * ⚠️ **DOS RAMAS CON DOS DESTINOS, y es lo que decide el modelo.** Una **queja**
 * procedente genera una no conformidad y se trata por `P-SG-05`; una
 * **sugerencia** procedente **no** — va a gestión de cambios (`F-SG-24`) o a un
 * plan de mejora (`F-SG-16`). Lo impone `quejas_nc_solo_de_queja` en la base, no
 * esta capa.
 *
 * ⚠️ **Una queja improcedente NO se borra: se cierra.** `P-SG-07` §1 — el
 * registro de que se atendió es el producto. La política de DELETE sólo deja
 * quitar la capturada por error, antes de decidir si procede.
 *
 * ⚠️ **Es la puerta por la que una NC nace sin auditoría**, que era el punto
 * entero de `F04·B0`: hasta que existió esta pantalla, `hallazgos.auditoria_id`
 * podía ser nulo y nadie podía aprovecharlo.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type Queja = Tables<'quejas'>

export type QuejaConContexto = Queja & {
  contacto: Pick<Tables<'contactos'>, 'id' | 'nombre' | 'puesto'> | null
  proceso: Pick<Tables<'procesos'>, 'id' | 'nombre'> | null
  hallazgo: Pick<Tables<'hallazgos'>, 'id' | 'folio' | 'descripcion' | 'estado'> | null
}

/** El de la lista: además, de qué cliente es. */
export type QuejaEnCartera = QuejaConContexto & {
  organizacion: Pick<Tables<'organizaciones'>, 'id' | 'razon_social' | 'nombre_comercial'> | null
}

const EMBEBIDO =
  '*, contacto:contactos(id, nombre, puesto), proceso:procesos(id, nombre), hallazgo:hallazgos(id, folio, descripcion, estado)'

const EMBEBIDO_CARTERA =
  `${EMBEBIDO}, organizacion:organizaciones(id, razon_social, nombre_comercial)` as const

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/** Quién la puso: el contacto si está dado de alta, el nombre suelto si no. */
export function quienLaPuso(queja: QuejaConContexto): string {
  return queja.contacto?.nombre ?? queja.cliente_nombre ?? 'Sin identificar'
}

// ═══════════════════════════════════════════════════════════════ lecturas ══

/**
 * **Todas las quejas visibles de la cartera.**
 *
 * ⚠️ Sin filtrar por cliente y sin vista en la base, por lo mismo que el tablero
 * de acciones: se baja una vez y se filtra en memoria, que es lo único que
 * sobrevive a una pantalla abierta con media barra de señal.
 */
export async function listarQuejas(): Promise<QuejaEnCartera[]> {
  const { data, error } = await createClient()
    .from('quejas')
    .select(EMBEBIDO_CARTERA)
    .order('fecha', { ascending: false })

  if (error) throw error
  return (data ?? []) as QuejaEnCartera[]
}

// ══════════════════════════════════════════════════════════════ escritura ══

export type DatosQueja = {
  tipo: string
  fecha: string
  descripcion: string
  contacto_id: string | null
  cliente_nombre: string | null
  proceso_id: string | null
  observaciones: string | null
}

export type ContextoQueja = {
  contacto: QuejaConContexto['contacto']
  proceso: QuejaConContexto['proceso']
}

/**
 * Registrar una queja o una sugerencia.
 *
 * ⚠️ `folio` y `consecutivo` **no se mandan**: los compone `sellar_folio_queja()`
 * —`Q-01-25` o `S-01-25`, por organización, tipo y año— y renumera si otro se
 * adelantó. Adelantar aquí un número sería enseñar uno que el servidor ignora.
 */
export async function crearQueja({
  orgId,
  datos,
  contexto,
}: {
  orgId: string
  datos: DatosQueja
  contexto: ContextoQueja
}): Promise<ResultadoEscritura<QuejaConContexto>> {
  const id = uuid()
  const ahora = new Date().toISOString()

  const valores = {
    id,
    org_id: orgId,
    consecutivo: 0,
    folio: '',
    estado: 'abierta',
    avance_pct: 0,
    ...datos,
    creado_por: await idDeLaSesion(),
  }

  return offlineWrite<QuejaConContexto>({
    tabla: 'quejas',
    operacion: 'insert',
    etiqueta: `${datos.tipo === 'sugerencia' ? 'Sugerencia' : 'Queja'} — ${datos.descripcion}`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('quejas')
        .insert(valores)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Registrar la queja')[0] as QuejaConContexto
    },
    offline: {
      ...valores,
      procede: null,
      responsable_id: null,
      hallazgo_id: null,
      cambio_sgc_id: null,
      plan_mejora_id: null,
      cerrada_en: null,
      creado_en: ahora,
      actualizado_en: ahora,
      hallazgo: null,
      ...contexto,
    } as QuejaConContexto,
  })
}

/**
 * **Decidir si procede.** Es la columna `PROCEDE` del `F-SG-08` y la bifurcación
 * de todo el procedimiento.
 *
 * ⚠️ **Improcedente no es «borrar»: es cerrar con su explicación.** `P-SG-07` §1
 * lo dice —«se registra y se cierra»—, y la base sólo deja borrar la que todavía
 * no se ha triado. Que alguien se quejara y se le dijera que no procede es
 * exactamente lo que un certificador viene a revisar.
 */
export async function triarQueja(
  queja: QuejaConContexto,
  procede: boolean,
  observaciones: string,
): Promise<ResultadoEscritura<QuejaConContexto>> {
  if (!procede && observaciones.trim() === '') {
    throw new Error(
      'Decir que una queja no procede exige explicarlo: es lo que se le contesta al cliente, y queda en el expediente.',
    )
  }

  const valores = {
    procede,
    observaciones: observaciones.trim() || queja.observaciones,
    // Improcedente se cierra en el acto; procedente sigue viva hasta que su
    // salida —la NC, el cambio o el plan— se cierre.
    estado: procede ? 'en_proceso' : 'cerrada',
    avance_pct: procede ? queja.avance_pct : 100,
  }

  return offlineWrite<QuejaConContexto>({
    tabla: 'quejas',
    operacion: 'update',
    etiqueta: `${queja.folio}: ${procede ? 'procede' : 'no procede'}`,
    valores,
    filtro: { id: queja.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('quejas')
        .update(valores)
        .eq('id', queja.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Triar la queja')[0] as QuejaConContexto
    },
    offline: { ...queja, ...valores },
  })
}

/**
 * Enlazar la queja con la no conformidad que generó.
 *
 * ⚠️ Va **después** de crear el hallazgo y en una escritura aparte, no en la
 * misma: son dos tablas distintas y la cola reproduce operación por operación. Si
 * la de `hallazgos` no llega, ésta falla contra la FK y se ve — que es mejor que
 * una queja apuntando a una NC que no existe.
 */
export async function enlazarNC(
  queja: QuejaConContexto,
  hallazgoId: string,
  hallazgo: QuejaConContexto['hallazgo'],
): Promise<ResultadoEscritura<QuejaConContexto>> {
  const valores = { hallazgo_id: hallazgoId }

  return offlineWrite<QuejaConContexto>({
    tabla: 'quejas',
    operacion: 'update',
    etiqueta: `${queja.folio}: no conformidad levantada`,
    valores,
    filtro: { id: queja.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('quejas')
        .update(valores)
        .eq('id', queja.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Enlazar la no conformidad')[0] as QuejaConContexto
    },
    offline: { ...queja, ...valores, hallazgo },
  })
}

/**
 * Enlazar una **sugerencia** procedente con su salida.
 *
 * ⚠️ `P-SG-07` §5.5.2: una sugerencia no genera no conformidad — se atiende con
 * un **cambio al SGC** (`F-SG-24`) o con un **plan de mejora** (`F-SG-16`), según
 * su alcance. Es la columna `REGISTRO` de la hoja de sugerencias, la gemela de la
 * columna `NO CONFORMIDAD` de la de quejas.
 */
export async function enlazarSalida(
  queja: QuejaConContexto,
  salida: { clase: 'cambio' | 'plan'; id: string },
): Promise<ResultadoEscritura<QuejaConContexto>> {
  const valores =
    salida.clase === 'cambio'
      ? { cambio_sgc_id: salida.id, plan_mejora_id: null }
      : { plan_mejora_id: salida.id, cambio_sgc_id: null }

  return offlineWrite<QuejaConContexto>({
    tabla: 'quejas',
    operacion: 'update',
    etiqueta: `${queja.folio}: ${salida.clase === 'cambio' ? 'cambio al SGC' : 'plan de mejora'}`,
    valores,
    filtro: { id: queja.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('quejas')
        .update(valores)
        .eq('id', queja.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Enlazar la sugerencia')[0] as QuejaConContexto
    },
    offline: { ...queja, ...valores },
  })
}

/** Avance y cierre, que es lo que el `F-SG-08` lleva en sus columnas I, J y K. */
export async function actualizarQueja(
  queja: QuejaConContexto,
  datos: { avance_pct: number; estado: string; observaciones: string | null },
): Promise<ResultadoEscritura<QuejaConContexto>> {
  const valores = {
    avance_pct: Math.max(0, Math.min(100, Math.round(datos.avance_pct))),
    estado: datos.estado,
    observaciones: datos.observaciones,
    // ⚠️ `cerrada_en` sí viaja desde aquí: `quejas` no tiene sellador propio, y
    // cerrarla es un acto de oficina con el reloj del servidor a un `now()` de
    // distancia. Si algún día hace falta blindarlo, es un trigger de tres líneas.
    cerrada_en: datos.estado === 'cerrada' ? new Date().toISOString() : null,
  }

  return offlineWrite<QuejaConContexto>({
    tabla: 'quejas',
    operacion: 'update',
    etiqueta: `Cambios en ${queja.folio}`,
    valores,
    filtro: { id: queja.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('quejas')
        .update(valores)
        .eq('id', queja.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Cambios en la queja')[0] as QuejaConContexto
    },
    offline: { ...queja, ...valores },
  })
}
