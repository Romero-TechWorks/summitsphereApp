/**
 * El ciclo de acciones [F04·B1] — **lo que cierra una no conformidad**.
 *
 * Lo gobierna `P-SG-05`: corrección inmediata → análisis de causa → acciones
 * correctivas → seguimiento → verificación de eficacia → cierre.
 *
 * ⚠️ **Una acción no se cierra sin verificar su eficacia, y lo impone la BASE**
 * (`acciones_cierre_con_eficacia`). Es el error más común en los SGC reales, y
 * por eso no es una validación del navegador. Aquí se comprueba antes sólo para
 * que el aviso salga al pulsar y no media hora después al vaciar la cola.
 *
 * ⚠️ **Los folios NO se mandan.** Los compone `sellar_folio_accion()`: el nuestro
 * (`ACC-2026-105`) al nacer, y el del cliente (`AC-FA-01-25`) en cuanto la acción
 * tiene un proceso con código. Mandar uno calculado sería enseñar un número que
 * el servidor va a ignorar.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Json, Tables } from '@/types/database'

export type Accion = Tables<'acciones'>
export type PlanMejora = Tables<'planes_mejora'>
export type CambioSgc = Tables<'cambios_sgc'>
export type Queja = Tables<'quejas'>

export type AccionConContexto = Accion & {
  proceso: Pick<Tables<'procesos'>, 'id' | 'nombre' | 'codigo'> | null
  responsable: Pick<Tables<'usuarios'>, 'id' | 'nombre'> | null
  contacto: Pick<Tables<'contactos'>, 'id' | 'nombre' | 'puesto'> | null
}

/** El de la lista de la cartera: además, de qué NC y de qué cliente es. */
export type AccionEnCartera = AccionConContexto & {
  hallazgo: Pick<Tables<'hallazgos'>, 'id' | 'folio' | 'descripcion' | 'tipo' | 'estado'> | null
  organizacion: Pick<Tables<'organizaciones'>, 'id' | 'razon_social' | 'nombre_comercial'> | null
}

/**
 * ⚠️ Los embebidos van **nombrados por la clave foránea** y **en UN literal**.
 * `acciones` apunta tres veces a `usuarios` (`responsable_id`,
 * `eficacia_verificada_por_id`, `creado_por`): sin nombrar la relación, PostgREST
 * responde *"more than one relationship was found"* y la pantalla se queda vacía
 * sin decir por qué. Y con `'a' + 'b'` el tipo se ensancha a `string`, con lo que
 * supabase-js deja de inferir la forma de la fila y el `as` no compila.
 */
const EMBEBIDO =
  '*, proceso:procesos(id, nombre, codigo), responsable:usuarios!acciones_responsable_id_fkey(id, nombre), contacto:contactos(id, nombre, puesto)'

const EMBEBIDO_CARTERA =
  `${EMBEBIDO}, hallazgo:hallazgos(id, folio, descripcion, tipo, estado), organizacion:organizaciones(id, razon_social, nombre_comercial)` as const

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/** Hoy, en México y como `YYYY-MM-DD`. Nunca `new Date()` sobre una `date`. */
function hoyISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

/**
 * Cuántos días faltan para el compromiso. Negativo = vencida.
 *
 * ⚠️ `fecha_compromiso` es una columna `date`, y formatearla con `new Date()` la
 * corre un día en México — que es justo donde se decide si algo está vencido
 * (CLAUDE.md · trampas heredadas). Se compara como texto `YYYY-MM-DD`, que ordena
 * igual que la fecha y no pasa por ninguna zona horaria.
 */
export function diasParaVencer(accion: Pick<Accion, 'fecha_compromiso'>): number {
  const hoy = hoyISO()
  const [ah, mh, dh] = hoy.split('-').map(Number)
  const [af, mf, df] = accion.fecha_compromiso.split('-').map(Number)
  return Math.round(
    (Date.UTC(af, mf - 1, df) - Date.UTC(ah, mh - 1, dh)) / 86_400_000,
  )
}

/** Vencida = pasó su fecha y sigue pidiendo trabajo. */
export function estaVencida(accion: Pick<Accion, 'fecha_compromiso' | 'estado'>): boolean {
  return accion.fecha_compromiso < hoyISO()
    && accion.estado !== 'cerrada'
    && accion.estado !== 'cancelada'
}

// ═══════════════════════════════════════════════════════════════ lecturas ══

/**
 * **Todas las acciones visibles de la cartera.**
 *
 * ⚠️ Sin filtrar por estado ni por cliente y **sin una vista de la base**, por lo
 * mismo que el tablero del lunes: una vista es otra clave que puede faltar en la
 * caché, y quien abre esta pantalla suele estar con media barra de señal. El
 * vencimiento y el promedio de avance se calculan en memoria.
 */
export async function listarAcciones(): Promise<AccionEnCartera[]> {
  const { data, error } = await createClient()
    .from('acciones')
    .select(EMBEBIDO_CARTERA)
    .order('fecha_compromiso', { ascending: true })

  if (error) throw error
  return (data ?? []) as AccionEnCartera[]
}

/** Las acciones de una no conformidad, en el orden en que se levantaron. */
export async function listarAccionesDelHallazgo(hallazgoId: string): Promise<AccionConContexto[]> {
  const { data, error } = await createClient()
    .from('acciones')
    .select(EMBEBIDO)
    .eq('hallazgo_id', hallazgoId)
    .order('creado_en', { ascending: true })

  if (error) throw error
  return (data ?? []) as AccionConContexto[]
}

// ══════════════════════════════════════════════════════════════ escritura ══

export type DatosAccion = {
  tipo: string
  descripcion: string
  proceso_id: string | null
  responsable_id: string | null
  responsable_contacto_id: string | null
  fecha_compromiso: string
  monitoreo: string | null
}

export type ContextoAccion = {
  proceso: AccionConContexto['proceso']
  responsable: AccionConContexto['responsable']
  contacto: AccionConContexto['contacto']
}

/**
 * Levantar una acción.
 *
 * ⚠️ **`hallazgoId` puede ser `null`.** Una acción de mejora nace sola —
 * `P-SG-07` §5.5.2 la saca de una sugerencia de cliente, y el `F-SG-16` de un
 * plan—, y entonces la organización la manda la fila: la valida la política de
 * INSERT, que es la que siempre decidió quién escribe en qué cliente.
 */
export async function crearAccion({
  hallazgoId,
  orgId,
  planMejoraId,
  cambioSgcId,
  datos,
  contexto,
}: {
  hallazgoId: string | null
  /** Obligatoria cuando no hay hallazgo; si lo hay, la base la ignora. */
  orgId: string
  /**
   * Los dos **contenedores** del `F-SG-16` y el `F-SG-24`.
   *
   * ⚠️ **No son excluyentes con `hallazgoId`**: una acción correctiva que se metió
   * en un plan de mejora responde igual a su no conformidad. Lo que sí exige la
   * base es que los tres padres sean del **mismo cliente**
   * (`resolver_org_de_la_accion()`).
   */
  planMejoraId?: string | null
  cambioSgcId?: string | null
  datos: DatosAccion
  contexto: ContextoAccion
}): Promise<ResultadoEscritura<AccionConContexto>> {
  const id = uuid()
  const ahora = new Date().toISOString()

  const valores = {
    id,
    hallazgo_id: hallazgoId,
    plan_mejora_id: planMejoraId ?? null,
    cambio_sgc_id: cambioSgcId ?? null,
    org_id: orgId,
    // ⚠️ Vacíos a propósito: `folio` y `consecutivo` son NOT NULL sin default, así
    // que el tipo generado los exige — pero quien los escribe de verdad es
    // `sellar_folio_accion()`, que además renumera si otro se adelantó.
    consecutivo: 0,
    folio: '',
    estado: 'abierta',
    avance_pct: 0,
    ...datos,
    creado_por: await idDeLaSesion(),
  }

  return offlineWrite<AccionConContexto>({
    tabla: 'acciones',
    operacion: 'insert',
    etiqueta: `Acción — ${datos.descripcion}`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('acciones')
        .insert(valores)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Levantar acción')[0] as AccionConContexto
    },
    offline: {
      ...valores,
      consecutivo_cliente: null,
      folio_cliente: null,
      fecha_compromiso_original: null,
      motivo_reprogramacion: null,
      meses: null,
      eficacia_fecha_programada: null,
      eficacia_verificada_en: null,
      eficacia_verificada_por_id: null,
      eficacia_resultado: null,
      eficacia_evidencia: null,
      cerrada_en: null,
      cerrada_por_id: null,
      motivo_cambio: null,
      creado_en: ahora,
      actualizado_en: ahora,
      ...contexto,
    } as AccionConContexto,
  })
}

/**
 * Corregir una acción **sin mover su fecha compromiso**.
 *
 * ⚠️ Mover la fecha va por `reprogramarAccion()`, no por aquí: `P-SG-05` §5.6
 * exige justificar cada demora, y la base rechaza el cambio si el motivo falta o
 * es el mismo de la vez pasada. Mezclarlos dejaría a esta función fallando a
 * ratos y sin manera de explicar por qué.
 */
export async function actualizarAccion(
  accion: AccionConContexto,
  datos: Omit<DatosAccion, 'fecha_compromiso'>,
  contexto: ContextoAccion,
): Promise<ResultadoEscritura<AccionConContexto>> {
  return offlineWrite<AccionConContexto>({
    tabla: 'acciones',
    operacion: 'update',
    etiqueta: `Cambios en la acción ${accion.folio_cliente ?? accion.folio}`,
    valores: datos,
    filtro: { id: accion.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('acciones')
        .update(datos)
        .eq('id', accion.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Cambios en la acción')[0] as AccionConContexto
    },
    offline: { ...accion, ...datos, ...contexto },
  })
}

/**
 * Mover la fecha compromiso. **Exige justificar la demora** (`P-SG-05` §5.6).
 *
 * ⚠️ Y el motivo tiene que ser **nuevo**: `sellar_accion()` rechaza el mismo
 * texto de la reprogramación anterior. Sin eso, una acción movida tres veces
 * enseñaría siempre la primera excusa. La anterior no se pierde — queda entera en
 * `audit_logs`, con su fecha.
 *
 * ⚠️ `fecha_compromiso_original` **no se manda**: la sella la base la primera vez
 * que la fecha se mueve, y es contra la que se mide el retraso.
 */
export async function reprogramarAccion(
  accion: AccionConContexto,
  fecha: string,
  motivo: string,
): Promise<ResultadoEscritura<AccionConContexto>> {
  if (motivo.trim() === '') {
    throw new Error('Mover la fecha compromiso exige justificar la demora')
  }
  if (motivo.trim() === (accion.motivo_reprogramacion ?? '').trim()) {
    throw new Error('La justificación tiene que ser distinta de la anterior')
  }

  const valores = { fecha_compromiso: fecha, motivo_reprogramacion: motivo.trim() }

  return offlineWrite<AccionConContexto>({
    tabla: 'acciones',
    operacion: 'update',
    etiqueta: `Reprogramar ${accion.folio_cliente ?? accion.folio} al ${fecha}`,
    valores,
    filtro: { id: accion.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('acciones')
        .update(valores)
        .eq('id', accion.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Reprogramar la acción')[0] as AccionConContexto
    },
    offline: {
      ...accion,
      ...valores,
      fecha_compromiso_original: accion.fecha_compromiso_original ?? accion.fecha_compromiso,
    },
  })
}

/** El avance del `F-SG-17` col. M. Se mueve solo, sin ceremonia. */
export async function marcarAvance(
  accion: AccionConContexto,
  avance: number,
  monitoreo: string | null,
): Promise<ResultadoEscritura<AccionConContexto>> {
  const valores = {
    avance_pct: Math.max(0, Math.min(100, Math.round(avance))),
    monitoreo,
    // Tocar el avance saca la acción de «abierta» sola: es lo que la hoja del
    // cliente hace con su columna de porcentaje.
    estado: accion.estado === 'abierta' && avance > 0 ? 'en_proceso' : accion.estado,
  }

  return offlineWrite<AccionConContexto>({
    tabla: 'acciones',
    operacion: 'update',
    etiqueta: `Avance ${valores.avance_pct} % en ${accion.folio_cliente ?? accion.folio}`,
    valores,
    filtro: { id: accion.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('acciones')
        .update(valores)
        .eq('id', accion.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Registrar avance')[0] as AccionConContexto
    },
    offline: { ...accion, ...valores },
  })
}

/**
 * **Verificar la eficacia y cerrar.** El paso que ningún SGC real hace bien.
 *
 * ⚠️ `P-SG-05` §5.7: la verificación se hace **después** de concluir las
 * acciones, con su propia fecha. Sólo `eficaz` cierra — `parcial` deja la acción
 * abierta, y `no_eficaz` **no reabre nada**: si el incumplimiento se repite hay
 * que levantar una NC nueva enlazada con `nc_origen_id`, y la pantalla lo ofrece.
 *
 * ⚠️ **`eficacia_verificada_por_id`, `cerrada_en` y `cerrada_por_id` NO se
 * mandan**: los sella la base. Verificar es un acto de oficina y su firma es la
 * que un certificador mira — una que viaja desde el navegador se puede escribir a
 * mano.
 */
export async function verificarEficacia(
  accion: AccionConContexto,
  {
    fecha,
    resultado,
    evidencia,
  }: { fecha: string; resultado: string; evidencia: string },
): Promise<ResultadoEscritura<AccionConContexto>> {
  if (evidencia.trim() === '') {
    throw new Error('La verificación de eficacia necesita decir qué se comprobó')
  }

  const valores = {
    eficacia_verificada_en: fecha,
    eficacia_resultado: resultado,
    eficacia_evidencia: evidencia.trim(),
    // Sólo `eficaz` cierra; lo impone `acciones_cierre_con_eficacia` en la base.
    estado: resultado === 'eficaz' ? 'cerrada' : 'en_proceso',
    avance_pct: resultado === 'eficaz' ? 100 : accion.avance_pct,
  }

  return offlineWrite<AccionConContexto>({
    tabla: 'acciones',
    operacion: 'update',
    etiqueta: `Verificar eficacia de ${accion.folio_cliente ?? accion.folio}`,
    valores,
    filtro: { id: accion.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('acciones')
        .update(valores)
        .eq('id', accion.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Verificar eficacia')[0] as AccionConContexto
    },
    offline: { ...accion, ...valores },
  })
}

/**
 * Programar **cuándo** se va a verificar la eficacia. Es la segunda fecha de
 * `P-SG-05` §5.7, y se fija después de concluir las acciones — no al abrirlas.
 */
export async function programarVerificacion(
  accion: AccionConContexto,
  fecha: string | null,
): Promise<ResultadoEscritura<AccionConContexto>> {
  const valores = {
    eficacia_fecha_programada: fecha,
    estado: fecha && accion.estado === 'en_proceso' ? 'por_verificar' : accion.estado,
  }

  return offlineWrite<AccionConContexto>({
    tabla: 'acciones',
    operacion: 'update',
    etiqueta: `Verificación de ${accion.folio_cliente ?? accion.folio} programada`,
    valores,
    filtro: { id: accion.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('acciones')
        .update(valores)
        .eq('id', accion.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Programar la verificación')[0] as AccionConContexto
    },
    offline: { ...accion, ...valores },
  })
}

/**
 * **Cancelar** una acción, con motivo.
 *
 * ⚠️ No hay función de borrado y no es un olvido: una acción que se decidió no
 * ejecutar explica por qué la NC sigue abierta, y eso es lo que un certificador
 * pregunta. La base sólo deja borrar la recién capturada —sin avance, sin
 * evidencia y sin verificación—, y para eso está la pantalla de captura, no ésta.
 */
export async function cancelarAccion(
  accion: AccionConContexto,
  motivo: string,
): Promise<ResultadoEscritura<AccionConContexto>> {
  if (motivo.trim() === '') {
    throw new Error('Cancelar una acción exige decir por qué')
  }

  const valores = { estado: 'cancelada', motivo_cambio: motivo.trim() }

  return offlineWrite<AccionConContexto>({
    tabla: 'acciones',
    operacion: 'update',
    etiqueta: `Cancelar ${accion.folio_cliente ?? accion.folio}`,
    valores,
    filtro: { id: accion.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('acciones')
        .update(valores)
        .eq('id', accion.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Cancelar la acción')[0] as AccionConContexto
    },
    offline: { ...accion, ...valores },
  })
}

/**
 * Marcar un mes del calendario del plan de mejora (`F-SG-16`).
 *
 * ⚠️ **Los doce meses viajan en UNA escritura, no doce.** Es la misma razón por
 * la que `programa_procesos` guarda los suyos en un `jsonb`: marcar seis meses
 * serían seis operaciones de la cola, y sin señal podrían llegar desparejadas.
 *
 * ⚠️ Y sólo tiene sentido dentro de un plan: `acciones_meses_solo_con_plan` lo
 * exige, porque el calendario es del contenedor, no de la acción suelta.
 */
export async function marcarMeses(
  accion: AccionConContexto,
  meses: { p: boolean[]; r: boolean[] },
): Promise<ResultadoEscritura<AccionConContexto>> {
  const valores = { meses: meses as unknown as Json }

  return offlineWrite<AccionConContexto>({
    tabla: 'acciones',
    operacion: 'update',
    etiqueta: `Calendario de ${accion.folio_cliente ?? accion.folio}`,
    valores,
    filtro: { id: accion.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('acciones')
        .update(valores)
        .eq('id', accion.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Guardar el calendario')[0] as AccionConContexto
    },
    offline: { ...accion, ...valores },
  })
}

/** Las acciones de un plan de mejora, en el orden en que se planearon. */
export async function listarAccionesDelPlan(planId: string): Promise<AccionConContexto[]> {
  const { data, error } = await createClient()
    .from('acciones')
    .select(EMBEBIDO)
    .eq('plan_mejora_id', planId)
    .order('creado_en', { ascending: true })

  if (error) throw error
  return (data ?? []) as AccionConContexto[]
}
