/**
 * Los hallazgos [F03·B4] — **el producto de una auditoría**.
 *
 * ⚠️ **UN HALLAZGO NO SE BORRA** (CLAUDE.md regla 13). Aquí no hay ni habrá una
 * función de borrado, y no es que se nos haya olvidado: la base tampoco lo deja
 * —sin política de DELETE, con el permiso revocado hasta a `service_role` y con
 * un trigger que grita—. Lo que hay es **anular con motivo** y **reclasificar**,
 * y las dos cosas dejan su renglón en `hallazgos_historial`.
 *
 * ⚠️ **El folio se compone SIN RED** (docs/03 §8.7): el folio de la auditoría,
 * que ya está en la caché, más un consecutivo que se calcula sobre los hallazgos
 * que el teléfono tiene delante. Si dos auditores en modo avión levantan el mismo
 * número, **la base renumera al llegar** en vez de rechazar — un número corrido
 * se edita, un hallazgo perdido no se recupera.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type Hallazgo = Tables<'hallazgos'>
export type RenglonHistorial = Tables<'hallazgos_historial'>

export type HallazgoConContexto = Hallazgo & {
  clausula: Pick<Tables<'norma_clausulas'>, 'id' | 'numero' | 'titulo' | 'norma_id'> | null
  proceso: Pick<Tables<'procesos'>, 'id' | 'nombre'> | null
  sitio: Pick<Tables<'sitios'>, 'id' | 'nombre'> | null
  responsable: Pick<Tables<'contactos'>, 'id' | 'nombre' | 'puesto'> | null
}

/** El del tablero del lunes: además, de qué auditoría y de qué cliente es. */
export type HallazgoEnCartera = HallazgoConContexto & {
  auditoria: Pick<Tables<'auditorias'>, 'id' | 'folio' | 'titulo' | 'fecha_inicio'> | null
  organizacion: Pick<Tables<'organizaciones'>, 'id' | 'razon_social' | 'nombre_comercial'> | null
}

/**
 * ⚠️ Los embebidos van **nombrados por la clave foránea**. `hallazgos` apunta dos
 * veces a `usuarios` (`cerrado_por_id` y `creado_por`), y sin nombrar la relación
 * PostgREST responde *"more than one relationship was found"* y la pantalla se
 * queda vacía sin decir por qué.
 *
 * ⚠️ **Y van en UN literal, no concatenados con `+`.** `'a' + 'b'` se ensancha a
 * `string`, y con un `string` cualquiera supabase-js ya no puede inferir la forma
 * de la fila: devuelve `GenericStringError` y el `as` de abajo deja de compilar.
 * Un `${}` sobre constantes literales sí lo conserva; el `+` no.
 */
const EMBEBIDO =
  '*, clausula:norma_clausulas(id, numero, titulo, norma_id), proceso:procesos(id, nombre), sitio:sitios(id, nombre), responsable:contactos!hallazgos_responsable_contacto_id_fkey(id, nombre, puesto)'

const EMBEBIDO_CARTERA =
  `${EMBEBIDO}, auditoria:auditorias(id, folio, titulo, fecha_inicio), organizacion:organizaciones(id, razon_social, nombre_comercial)` as const

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/**
 * El folio para enseñar.
 *
 * Un hallazgo levantado sin señal sobre una auditoría que tampoco tiene folio
 * todavía no puede componerlo: se dice, en vez de inventar un número que después
 * cambia solo.
 */
export function folioDeHallazgo(hallazgo: Pick<Hallazgo, 'folio' | 'consecutivo'>): string {
  if (hallazgo.folio && hallazgo.folio.trim() !== '') return hallazgo.folio
  return `H-${String(hallazgo.consecutivo).padStart(2, '0')} · sin folio hasta sincronizar`
}

/**
 * El consecutivo que le toca al siguiente, **calculado sobre la caché**.
 *
 * ⚠️ Es una cuenta local a propósito: en la planta no hay a quién preguntarle. La
 * base lo respeta si está libre y **renumera** si otro auditor ya lo usó.
 */
export function siguienteConsecutivo(hallazgos: readonly Pick<Hallazgo, 'consecutivo'>[]): number {
  return hallazgos.reduce((mayor, h) => Math.max(mayor, h.consecutivo), 0) + 1
}

/** Cuántos días lleva abierto. Para el tablero del lunes. */
export function diasAbierto(hallazgo: Pick<Hallazgo, 'detectado_en' | 'creado_en'>): number {
  const desde = new Date(hallazgo.detectado_en ?? hallazgo.creado_en).getTime()
  return Math.max(0, Math.floor((Date.now() - desde) / 86_400_000))
}

// ═══════════════════════════════════════════════════════════════ lecturas ══

export async function listarHallazgos(auditoriaId: string): Promise<HallazgoConContexto[]> {
  const { data, error } = await createClient()
    .from('hallazgos')
    .select(EMBEBIDO)
    .eq('auditoria_id', auditoriaId)
    .order('consecutivo')

  if (error) throw error
  return (data ?? []) as HallazgoConContexto[]
}

/**
 * **El tablero del lunes**: todos los hallazgos visibles de la cartera.
 *
 * ⚠️ Sin filtrar por estado ni por cliente, y **sin una vista de la base**. El
 * modelo de datos apunta una vista `hallazgos_abiertos`; se aplaza por el mismo
 * motivo que los widgets del tablero [F01·B3] no la tienen: **una vista es otra
 * clave que puede faltar en la caché**, y esta pantalla se abre el lunes por la
 * mañana con media barra de señal. La antigüedad y el vencimiento se calculan en
 * memoria (`diasAbierto`). Se moverá a una vista con `security_invoker` el día
 * que una firma tenga decenas de miles de hallazgos.
 */
export async function listarHallazgosDeLaCartera(): Promise<HallazgoEnCartera[]> {
  const { data, error } = await createClient()
    .from('hallazgos')
    .select(EMBEBIDO_CARTERA)
    .order('detectado_en', { ascending: false, nullsFirst: false })
    .order('creado_en', { ascending: false })

  if (error) throw error
  return (data ?? []) as HallazgoEnCartera[]
}

/**
 * El historial de un hallazgo, lo más reciente primero.
 *
 * Es de sólo lectura y no hay forma de escribirlo desde aquí: lo escribe
 * `registrar_historial_hallazgo()` en la base, campo por campo.
 */
export async function listarHistorial(hallazgoId: string): Promise<RenglonHistorial[]> {
  const { data, error } = await createClient()
    .from('hallazgos_historial')
    .select('*')
    .eq('hallazgo_id', hallazgoId)
    .order('hecho_en', { ascending: false })

  if (error) throw error
  return (data ?? []) as RenglonHistorial[]
}

// ═══════════════════════════════════════════════════════════════ escritura ══

export type DatosHallazgo = {
  clausula_id: string
  tipo: string
  descripcion: string
  evidencia_objetiva: string
  requisito_incumplido: string | null
  proceso_id: string | null
  sitio_id: string | null
  responsable_contacto_id: string | null
  fecha_compromiso: string | null
}

export type ContextoHallazgo = {
  clausula: HallazgoConContexto['clausula']
  proceso: HallazgoConContexto['proceso']
  sitio: HallazgoConContexto['sitio']
  responsable: HallazgoConContexto['responsable']
}

/**
 * Levantar un hallazgo. **Esto es lo que se hace en la planta.**
 *
 * ⚠️ `detectado_en` es **el reloj del teléfono**: cuándo se vio, no cuándo llegó
 * al servidor. Es la regla del encabezado de la migración de la fase, y aquí es
 * donde más pesa — la hora de una observación es parte de la evidencia objetiva.
 *
 * ⚠️ `consecutivo` se manda; `folio` **no**. El folio lo compone
 * `sellar_folio_hallazgo()` juntando el de la auditoría con el consecutivo ya
 * resuelto, y renumera si otro auditor se adelantó.
 */
export async function crearHallazgo({
  auditoriaId,
  orgId,
  itemId,
  consecutivo,
  folioAuditoria,
  datos,
  contexto,
}: {
  auditoriaId: string
  orgId: string
  /** De qué punto de la lista salió, si salió de uno. */
  itemId: string | null
  consecutivo: number
  /** Para componer el folio provisional que se enseña mientras no sincroniza. */
  folioAuditoria: string | null
  datos: DatosHallazgo
  contexto: ContextoHallazgo
}): Promise<ResultadoEscritura<HallazgoConContexto>> {
  const id = uuid()
  const ahora = new Date().toISOString()

  const valores = {
    id,
    auditoria_id: auditoriaId,
    // La reemplaza `heredar_org_de_la_auditoria()`; el cliente no la decide.
    org_id: orgId,
    item_id: itemId,
    consecutivo,
    // ⚠️ Vacío a propósito. `folio` es NOT NULL sin default, así que el tipo
    // generado lo exige — pero quien lo escribe de verdad es
    // `sellar_folio_hallazgo()`, que lo compone SIEMPRE juntando el folio de la
    // auditoría con el consecutivo ya resuelto. Mandar aquí un folio calculado
    // sería enseñar un número que el servidor va a ignorar.
    folio: '',
    estado: 'abierto',
    detectado_en: ahora,
    ...datos,
    creado_por: await idDeLaSesion(),
  }

  const folioProvisional = folioAuditoria
    ? `${folioAuditoria}/H-${String(consecutivo).padStart(2, '0')}`
    : ''

  return offlineWrite<HallazgoConContexto>({
    tabla: 'hallazgos',
    operacion: 'insert',
    etiqueta: `Hallazgo ${folioProvisional || `H-${consecutivo}`} — ${datos.descripcion}`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('hallazgos')
        .insert(valores)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Levantar hallazgo')[0] as HallazgoConContexto
    },
    offline: {
      ...valores,
      folio: folioProvisional,
      cerrado_en: null,
      cerrado_por_id: null,
      motivo_anulacion: null,
      motivo_cambio: null,
      creado_en: ahora,
      actualizado_en: ahora,
      ...contexto,
    } as HallazgoConContexto,
  })
}

/**
 * Corregir o **reclasificar** un hallazgo.
 *
 * ⚠️ `motivo_cambio` viaja en la MISMA escritura, y es la razón de que esa
 * columna viva en `hallazgos` y no en el historial: sin señal, el cambio y su
 * motivo por separado podrían llegar desparejados y el renglón del historial
 * quedaría sin explicación — justo el renglón que un certificador va a leer.
 */
export async function actualizarHallazgo(
  hallazgo: HallazgoConContexto,
  datos: DatosHallazgo,
  motivo: string | null,
  contexto: ContextoHallazgo,
): Promise<ResultadoEscritura<HallazgoConContexto>> {
  const valores = { ...datos, motivo_cambio: motivo }

  return offlineWrite<HallazgoConContexto>({
    tabla: 'hallazgos',
    operacion: 'update',
    etiqueta:
      datos.tipo !== hallazgo.tipo
        ? `Reclasificar ${hallazgo.folio} a ${datos.tipo}`
        : `Cambios en el hallazgo ${hallazgo.folio}`,
    valores,
    filtro: { id: hallazgo.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('hallazgos')
        .update(valores)
        .eq('id', hallazgo.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Cambios en el hallazgo')[0] as HallazgoConContexto
    },
    offline: { ...hallazgo, ...valores, ...contexto },
  })
}

/**
 * Mover el estado, incluida la **anulación**.
 *
 * ⚠️ Anular exige motivo y lo impone **el CHECK de la base**, no esta función:
 * `hallazgos_anulado_con_motivo` rechaza un `anulado` con `motivo_anulacion`
 * vacío o en blanco. Aquí se valida antes sólo para que el error se vea al
 * escribirlo y no media hora después al vaciar la cola.
 *
 * ⚠️ **`cerrado_en` y `cerrado_por_id` NO se mandan**: los sella
 * `sellar_cierre_hallazgo()`. Cerrar un hallazgo es un acto administrativo, y su
 * fecha es la que se le enseña al organismo certificador — una que viaja desde el
 * navegador es una que se puede escribir a mano.
 */
export async function cambiarEstadoHallazgo(
  hallazgo: HallazgoConContexto,
  estado: string,
  motivo: string,
): Promise<ResultadoEscritura<HallazgoConContexto>> {
  const limpio = motivo.trim()

  if (estado === 'anulado' && limpio === '') {
    throw new Error(
      'Anular un hallazgo exige decir por qué: es lo único que lo distingue de borrarlo, y queda en el historial.',
    )
  }

  const valores = {
    estado,
    motivo_cambio: limpio === '' ? null : limpio,
    // La base lo limpia sola si el estado deja de ser `anulado`; se manda para
    // que el CHECK lo vea en la misma escritura.
    motivo_anulacion: estado === 'anulado' ? limpio : null,
  }

  return offlineWrite<HallazgoConContexto>({
    tabla: 'hallazgos',
    operacion: 'update',
    etiqueta: `${estado === 'anulado' ? 'Anular' : `Mover a ${estado}`} el hallazgo ${hallazgo.folio}`,
    valores,
    filtro: { id: hallazgo.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('hallazgos')
        .update(valores)
        .eq('id', hallazgo.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Cambio de estado del hallazgo')[0] as HallazgoConContexto
    },
    offline: { ...hallazgo, ...valores },
  })
}
