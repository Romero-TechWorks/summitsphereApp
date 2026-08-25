/**
 * La lista de verificación [F03·B2].
 *
 * Es lo que el auditor recorre en planta, y por eso todo lo de aquí se prepara
 * **con señal**: se genera del alcance, se le aplica la plantilla de la firma y
 * se edita antes de entrar. Lo que pasa dentro de la planta —marcar veredictos y
 * levantar hallazgos— es F03·B3 y B4.
 *
 * ⚠️ **La lista se genera en la BASE, no aquí.** `generar_lista_verificacion()`
 * recorre `auditoria_normas`, toma sólo las cláusulas **hoja** auditables y
 * activas, y es idempotente. Rehacer ese recorrido en el cliente significaría
 * bajarse el árbol entero de cada norma para calcular qué es hoja — y además
 * duplicaría un criterio que ya está escrito y probado en un sitio.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { normalizar } from '@/lib/utils/texto'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type ItemVerificacion = Tables<'auditoria_items'>
export type Clausula = Tables<'norma_clausulas'>

/** El ítem con su cláusula y su proceso, que es como se pinta. */
export type ItemConContexto = ItemVerificacion & {
  clausula: Pick<Clausula, 'id' | 'numero' | 'titulo' | 'resumen' | 'norma_id'> | null
  proceso: Pick<Tables<'procesos'>, 'id' | 'nombre'> | null
}

const EMBEBIDO =
  '*, clausula:norma_clausulas(id, numero, titulo, resumen, norma_id), proceso:procesos(id, nombre)'

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/**
 * La lista entera de una auditoría, en su orden.
 *
 * ⚠️ Sin filtrar por veredicto, y a propósito: el filtro «sólo lo que me falta»
 * de la pantalla de recorrido se aplica **en memoria**. Con una clave de caché
 * por filtro, en la planta la lista se vaciaría al tocar el filtro —esa clave no
 * está en la caché— y el auditor concluiría que perdió su trabajo.
 */
export async function listarItems(auditoriaId: string): Promise<ItemConContexto[]> {
  const { data, error } = await createClient()
    .from('auditoria_items')
    .select(EMBEBIDO)
    .eq('auditoria_id', auditoriaId)
    .order('orden')

  if (error) throw error
  return (data ?? []) as ItemConContexto[]
}

/**
 * Genera la lista desde el alcance. Devuelve cuántos puntos creó.
 *
 * ⚠️ **NO pasa por `offlineWrite`, y es una excepción consciente más** —la
 * quinta, junto a los adjuntos, el link del portal, la importación de normas y
 * el archivo de una versión. Motivos, y son tres:
 *
 * 1. Es una RPC: la cola sabe reproducir `insert`/`update`/`delete` sobre una
 *    tabla, no una llamada a una función.
 * 2. Genera **cientos de filas de golpe** —una ISO 9001 completa son ~60 puntos,
 *    y con 45001 en el alcance el doble—. Encolarlas de una en una llenaría la
 *    cola de ruido justo antes de entrar a planta, que es cuando el contador
 *    tiene que servir para algo.
 * 3. Y sobre todo: **es lo que se hace en la oficina antes de salir.** El día que
 *    esto haga falta sin señal, ya es tarde — la lista tenía que estar hecha.
 *
 * La pantalla lo dice y no deja empezar sin conexión, igual que las otras cuatro.
 */
export async function generarDesdeElAlcance(auditoriaId: string): Promise<number> {
  const { data, error } = await createClient().rpc('generar_lista_verificacion', {
    p_auditoria: auditoriaId,
  })

  if (error) throw error
  return data ?? 0
}

export type DatosItem = {
  clausula_id: string | null
  proceso_id: string | null
  pregunta: string
  orden: number
}

export async function crearItem(
  auditoriaId: string,
  orgId: string,
  datos: DatosItem,
  clausula: ItemConContexto['clausula'],
  proceso: ItemConContexto['proceso'],
): Promise<ResultadoEscritura<ItemConContexto>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const creadoPor = await idDeLaSesion()
  // ⚠️ `org_id` se manda porque la columna es NOT NULL; la pisa
  // `heredar_org_de_la_auditoria()`. Lo de aquí sólo alimenta la copia optimista.
  const valores = { id, auditoria_id: auditoriaId, org_id: orgId, ...datos, creado_por: creadoPor }

  return offlineWrite<ItemConContexto>({
    tabla: 'auditoria_items',
    operacion: 'insert',
    etiqueta: `Punto de verificación — ${datos.pregunta}`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_items')
        .insert(valores)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Punto de verificación')[0] as ItemConContexto
    },
    offline: {
      ...valores,
      veredicto: 'pendiente',
      nota: null,
      evaluado_en: null,
      evaluado_por: null,
      creado_en: ahora,
      actualizado_en: ahora,
      clausula,
      proceso,
    } as ItemConContexto,
  })
}

export async function actualizarItem(
  item: ItemConContexto,
  datos: DatosItem,
  clausula: ItemConContexto['clausula'],
  proceso: ItemConContexto['proceso'],
): Promise<ResultadoEscritura<ItemConContexto>> {
  return offlineWrite<ItemConContexto>({
    tabla: 'auditoria_items',
    operacion: 'update',
    etiqueta: `Cambios en el punto — ${datos.pregunta}`,
    valores: datos,
    filtro: { id: item.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_items')
        .update(datos)
        .eq('id', item.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Cambios en el punto')[0] as ItemConContexto
    },
    offline: { ...item, ...datos, clausula, proceso },
  })
}

/**
 * Mover un punto de sitio.
 *
 * ⚠️ Reordenar son **dos escrituras**, no una: se intercambia el `orden` de los
 * dos puntos implicados. No se reescribe la lista entera, que con sesenta puntos
 * serían sesenta operaciones en la cola por cada flechita.
 */
export async function intercambiarOrden(
  a: ItemConContexto,
  b: ItemConContexto,
): Promise<{ encolado: boolean }> {
  const primera = await offlineWrite<ItemConContexto>({
    tabla: 'auditoria_items',
    operacion: 'update',
    etiqueta: `Reordenar la lista de verificación`,
    valores: { orden: b.orden },
    filtro: { id: a.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_items')
        .update({ orden: b.orden })
        .eq('id', a.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Reordenar la lista')[0] as ItemConContexto
    },
    offline: { ...a, orden: b.orden },
  })

  const segunda = await offlineWrite<ItemConContexto>({
    tabla: 'auditoria_items',
    operacion: 'update',
    etiqueta: `Reordenar la lista de verificación`,
    valores: { orden: a.orden },
    filtro: { id: b.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_items')
        .update({ orden: a.orden })
        .eq('id', b.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Reordenar la lista')[0] as ItemConContexto
    },
    offline: { ...b, orden: a.orden },
  })

  return { encolado: primera.encolado || segunda.encolado }
}

/**
 * Quitar un punto de la lista.
 *
 * ⚠️ La política de DELETE **no deja quitar un punto que ya produjo un
 * hallazgo**: es la cita de ese hallazgo. Y un DELETE bloqueado por RLS no es un
 * error — afecta a cero filas y PostgREST responde 200 con lista vacía. Por eso
 * `.select()` y `exigirFilas`: sin ellos el punto desaparecería de la pantalla y
 * reaparecería al refrescar.
 */
export async function eliminarItem(item: ItemConContexto): Promise<ResultadoEscritura<null>> {
  return offlineWrite<null>({
    tabla: 'auditoria_items',
    operacion: 'delete',
    etiqueta: `Quitar el punto — ${item.pregunta}`,
    filtro: { id: item.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_items')
        .delete()
        .eq('id', item.id)
        .select()
      if (error) throw error
      exigirFilas(data, 'Quitar el punto de verificación')
      return null
    },
    offline: null,
  })
}

// ═══════════════════════════════════════════════ la plantilla de la firma ══

/** Un punto de la plantilla. Sin `numero` es una pregunta suelta del auditor. */
export type PuntoPlantilla = { numero?: string; pregunta: string }

/** `{ iso_9001: { manufactura: [{ numero, pregunta }] } }` */
export type PlantillaVerificacion = Record<string, Record<string, PuntoPlantilla[]>>

/** El bucket que sirve para cualquier giro. */
export const GIRO_GENERAL = 'general'

/**
 * Con qué clave se guarda un giro.
 *
 * ⚠️ `organizaciones.giro` es **texto libre** —«Manufactura», «manufactura»,
 * «Manufactura ligera»—, así que no se puede usar tal cual como clave de un
 * jsonb: la firma acabaría con tres plantillas que son la misma. Se normaliza
 * (sin acentos, en minúsculas) y lo que venga vacío cae en `general`, que es
 * también el respaldo cuando el giro de este cliente todavía no tiene plantilla
 * propia.
 */
export function claveDeGiro(giro: string | null | undefined): string {
  const limpio = normalizar(giro ?? '')
  return limpio === '' ? GIRO_GENERAL : limpio
}

/**
 * La plantilla de listas de verificación de la firma.
 *
 * ⚠️ Vive en `config_firma.plantillas` (jsonb) **y no en una tabla**, igual que
 * la plantilla de tareas de la Fase 01: es configuración de la firma, la lee
 * cualquiera con sesión y sólo la escribe un socio. Una tabla para esto sería
 * una tabla con una fila.
 *
 * ⚠️ Se lee **a la defensiva**. Ese jsonb lo puede haber escrito una versión
 * vieja de la app o una mano en el SQL Editor: si no tiene la forma esperada se
 * devuelve vacío, nunca se revienta la pantalla de la auditoría (CLAUDE.md ·
 * trampas heredadas).
 */
export async function leerPlantillaVerificacion(): Promise<PlantillaVerificacion> {
  const { data, error } = await createClient()
    .from('config_firma')
    .select('plantillas')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error
  return normalizarPlantilla(data?.plantillas)
}

function normalizarPlantilla(crudo: unknown): PlantillaVerificacion {
  if (!crudo || typeof crudo !== 'object') return {}

  const contenedor = (crudo as { verificacion?: unknown }).verificacion
  if (!contenedor || typeof contenedor !== 'object') return {}

  const limpio: PlantillaVerificacion = {}

  for (const [norma, porGiro] of Object.entries(contenedor as Record<string, unknown>)) {
    if (!porGiro || typeof porGiro !== 'object') continue
    const giros: Record<string, PuntoPlantilla[]> = {}

    for (const [giro, lista] of Object.entries(porGiro as Record<string, unknown>)) {
      if (!Array.isArray(lista)) continue
      const puntos = lista
        .filter((p): p is PuntoPlantilla =>
          Boolean(p) && typeof p === 'object' &&
          typeof (p as { pregunta?: unknown }).pregunta === 'string' &&
          (p as { pregunta: string }).pregunta.trim() !== '')
        .map((p) => ({
          numero: typeof p.numero === 'string' && p.numero.trim() !== '' ? p.numero : undefined,
          pregunta: p.pregunta,
        }))

      if (puntos.length > 0) giros[giro] = puntos
    }

    if (Object.keys(giros).length > 0) limpio[norma] = giros
  }

  return limpio
}

/**
 * Qué puntos ofrece la plantilla para estas normas y este giro.
 *
 * Se mira primero el giro del cliente y después `general`, y **no se mezclan**:
 * si la firma escribió una lista para manufactura, ésa es la que sabe de
 * manufactura. `general` es el respaldo, no un complemento — sumar las dos daría
 * preguntas repetidas con distinta redacción.
 */
export function puntosDeLaPlantilla(
  plantilla: PlantillaVerificacion,
  clavesDeNorma: readonly string[],
  giro: string | null | undefined,
): { norma: string; puntos: PuntoPlantilla[] }[] {
  const clave = claveDeGiro(giro)

  return clavesDeNorma
    .map((norma) => {
      const porGiro = plantilla[norma]
      if (!porGiro) return null
      const puntos = porGiro[clave] ?? porGiro[GIRO_GENERAL]
      return puntos && puntos.length > 0 ? { norma, puntos } : null
    })
    .filter((v): v is { norma: string; puntos: PuntoPlantilla[] } => v !== null)
}

/**
 * Guarda la lista de esta auditoría como plantilla de sus normas y su giro.
 *
 * **La plantilla se define con el ejemplo**, no en una pantalla de
 * configuración: el auditor deja bien la lista de un cliente y la guarda para
 * los siguientes. Es como se trabaja de verdad —«hazla como la de Aceros»— y
 * ahorra la pantalla de administración que no llega hasta la Fase 06. Es el
 * mismo gesto que «Guardar como plantilla» de las tareas.
 *
 * ⚠️ **Se guarda el `numero` de la cláusula, no su `id`.** El id es de esta base
 * y de este catálogo; el número —«8.5.1»— es lo que un auditor reconoce, lo que
 * sobrevive a reimportar el catálogo, y lo que hace legible el jsonb el día que
 * alguien lo abra en el SQL Editor.
 *
 * ⚠️ Lee y reescribe el jsonb entero: sólo lo hace un socio, de uno en uno, así
 * que no se pierde lo que haya de otras normas ni la plantilla de tareas.
 */
export async function guardarComoPlantilla(
  items: readonly ItemConContexto[],
  normaDeLaClausula: (clausulaId: string) => string | null,
  clavesDeNorma: readonly string[],
  giro: string | null | undefined,
): Promise<ResultadoEscritura<PlantillaVerificacion>> {
  const supabase = createClient()

  const { data: actual, error } = await supabase
    .from('config_firma')
    .select('plantillas')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error

  const previo = (actual?.plantillas ?? {}) as Record<string, unknown>
  const plantilla = normalizarPlantilla(actual?.plantillas)
  const giroClave = claveDeGiro(giro)

  // Los puntos atados a una cláusula van con la norma de esa cláusula. Los
  // sueltos —las preguntas propias del auditor— no tienen norma que los reclame,
  // así que se guardan en TODAS las del alcance: es donde el auditor las volverá
  // a querer, y son pocas.
  const porNorma = new Map<string, PuntoPlantilla[]>()
  for (const clave of clavesDeNorma) porNorma.set(clave, [])

  for (const item of [...items].sort((a, b) => a.orden - b.orden)) {
    const pregunta = item.pregunta.trim()
    if (pregunta === '') continue

    if (item.clausula) {
      const clave = normaDeLaClausula(item.clausula.id)
      if (clave && porNorma.has(clave)) {
        porNorma.get(clave)!.push({ numero: item.clausula.numero, pregunta })
      }
      continue
    }

    for (const lista of porNorma.values()) lista.push({ pregunta })
  }

  for (const [clave, puntos] of porNorma) {
    if (puntos.length === 0) continue
    plantilla[clave] = { ...(plantilla[clave] ?? {}), [giroClave]: puntos }
  }

  const plantillas = { ...previo, verificacion: plantilla }

  return offlineWrite<PlantillaVerificacion>({
    tabla: 'config_firma',
    operacion: 'update',
    etiqueta: 'Guardar la plantilla de listas de verificación de la firma',
    valores: { plantillas },
    filtro: { id: 1 },
    online: async () => {
      const { data, error: fallo } = await createClient()
        .from('config_firma')
        .update({ plantillas })
        .eq('id', 1)
        .select('plantillas')
      if (fallo) throw fallo
      return normalizarPlantilla(exigirFilas(data, 'Plantilla de verificación')[0].plantillas)
    },
    offline: plantilla,
  })
}

export type ResultadoPlantilla = {
  /** Puntos generados a los que la plantilla les cambió la redacción. */
  reescritos: ItemConContexto[]
  /** Preguntas propias de la firma que no estaban en la lista. */
  agregados: ItemConContexto[]
  /**
   * Cláusulas que la plantilla nombra y que **no están en la lista generada**.
   * No se añaden: si no salieron del alcance, auditarlas sería auditar fuera de
   * alcance. La pantalla lo dice en vez de callarlo.
   */
  omitidos: string[]
  /** Puntos **ya evaluados** que la plantilla no tocó. Ver abajo. */
  respetados: number
  encolado: boolean
}

/**
 * Aplica la plantilla de la firma a una lista **ya generada**.
 *
 * El reparto es deliberado: **la base decide QUÉ se audita** —las cláusulas hoja
 * del alcance— y **la plantilla decide CÓMO se pregunta**. Al revés, una
 * plantilla vieja podría meter en el recorrido cláusulas que este cliente no
 * tiene en su alcance, y el auditor levantaría hallazgos fuera de él.
 *
 * ⚠️ **Idempotente**, como todo lo demás de esta fase: sólo reescribe lo que de
 * verdad cambia de texto y sólo agrega la pregunta suelta que todavía no está.
 * Aplicarla dos veces no duplica nada.
 *
 * ⚠️ **Y NO toca un punto ya evaluado** — la misma promesa que hace
 * `generar_lista_verificacion()`, y por una razón más fuerte: si el auditor ya
 * marcó «conforme» y la plantilla le cambiara la redacción a la pregunta, ese
 * veredicto quedaría contestando algo que nadie preguntó. Un informe de
 * auditoría con un «conforme» sobre una pregunta reescrita después es
 * exactamente el hallazgo que un organismo certificador le levanta a la firma.
 *
 * ⚠️ **Una escritura por punto, no un lote.** Es lo mismo que hace
 * `instanciarPlantilla()` con las tareas: `offlineWrite` encola de una en una y
 * en orden, así que quedan operaciones con nombre legible en vez de un lote que
 * la cola no sabe reproducir.
 */
export async function aplicarPlantilla({
  auditoriaId,
  orgId,
  items,
  porNorma,
  normaDeLaClausula,
}: {
  auditoriaId: string
  orgId: string
  items: readonly ItemConContexto[]
  porNorma: readonly { norma: string; puntos: PuntoPlantilla[] }[]
  normaDeLaClausula: (clausulaId: string) => string | null
}): Promise<ResultadoPlantilla> {
  const reescritos: ItemConContexto[] = []
  const agregados: ItemConContexto[] = []
  const omitidos: string[] = []
  let respetados = 0
  let encolado = false
  let orden = items.reduce((mayor, item) => Math.max(mayor, item.orden), 0)

  // Las preguntas sueltas se comparan por texto normalizado: la plantilla las
  // guarda una vez por norma del alcance, y con dos normas llegarían dos veces.
  const sueltasPuestas = new Set(
    items.filter((i) => !i.clausula_id).map((i) => normalizar(i.pregunta)),
  )

  // Un punto ya reescrito no se vuelve a tocar: si la plantilla nombrara dos
  // veces la misma cláusula, la segunda escritura saldría con el texto viejo
  // que quedó en `items` y desharía la primera.
  const yaReescritos = new Set<string>()

  for (const { norma, puntos } of porNorma) {
    for (const punto of puntos) {
      if (punto.numero) {
        const item = items.find((i) => {
          if (!i.clausula) return false
          return i.clausula.numero === punto.numero && normaDeLaClausula(i.clausula.id) === norma
        })

        if (!item) {
          omitidos.push(`${norma} ${punto.numero}`)
          continue
        }
        if (yaReescritos.has(item.id)) continue
        if (item.pregunta.trim() === punto.pregunta.trim()) continue
        if (item.veredicto !== 'pendiente') {
          respetados += 1
          continue
        }
        yaReescritos.add(item.id)

        const resultado = await actualizarItem(
          item,
          {
            clausula_id: item.clausula_id,
            proceso_id: item.proceso_id,
            pregunta: punto.pregunta,
            orden: item.orden,
          },
          item.clausula,
          item.proceso,
        )
        reescritos.push(resultado.fila)
        encolado = encolado || resultado.encolado
        continue
      }

      const huella = normalizar(punto.pregunta)
      if (sueltasPuestas.has(huella)) continue
      sueltasPuestas.add(huella)

      const resultado = await crearItem(
        auditoriaId,
        orgId,
        { clausula_id: null, proceso_id: null, pregunta: punto.pregunta, orden: ++orden },
        null,
        null,
      )
      agregados.push(resultado.fila)
      encolado = encolado || resultado.encolado
    }
  }

  return { reescritos, agregados, omitidos, respetados, encolado }
}

// ══════════════════════════════════════════════ el recorrido en planta ══════

export type Evaluacion = { veredicto: string; nota: string | null }

/**
 * Marcar un punto durante el recorrido [F03·B3].
 *
 * Va aparte de `actualizarItem()` porque no toca lo mismo ni se hace en el mismo
 * sitio: aquélla edita la lista **en la oficina** —la pregunta, la cláusula, el
 * orden—; ésta es el gesto del pulgar **en la planta**, y su etiqueta en la cola
 * tiene que poder leerse sin contexto.
 *
 * ⚠️ **`evaluado_en` lo manda el TELÉFONO, no el servidor.** Es la regla del
 * encabezado de la migración de la Fase 03: se evalúa a las 10:15 en modo avión
 * y la fila llega a las 14:00, así que un `now()` del servidor pondría en el
 * informe la hora en que volvió el semáforo, no la hora en que se vio el
 * extintor descargado. El **quién** sí lo sella la base.
 *
 * ⚠️ **Y sólo se sella cuando el veredicto CAMBIA.** Corregirle la nota a un
 * punto ya evaluado no puede mover su hora: eso reescribiría la hora del
 * recorrido cada vez que alguien añade una coma, y esa hora es lo que sostiene
 * la trazabilidad de la observación.
 */
export async function registrarEvaluacion(
  item: ItemConContexto,
  cambios: Evaluacion,
  evaluadoPor: string | null,
): Promise<ResultadoEscritura<ItemConContexto>> {
  const cambiaVeredicto = cambios.veredicto !== item.veredicto

  const evaluado_en = !cambiaVeredicto
    ? item.evaluado_en
    : cambios.veredicto === 'pendiente'
      ? null
      : new Date().toISOString()

  const valores = { veredicto: cambios.veredicto, nota: cambios.nota, evaluado_en }

  return offlineWrite<ItemConContexto>({
    tabla: 'auditoria_items',
    operacion: 'update',
    etiqueta: cambiaVeredicto
      ? `${cambios.veredicto === 'pendiente' ? 'Sin evaluar' : cambios.veredicto} — ${item.pregunta}`
      : `Nota — ${item.pregunta}`,
    valores,
    filtro: { id: item.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_items')
        .update(valores)
        .eq('id', item.id)
        .select(EMBEBIDO)
      if (error) throw error
      return exigirFilas(data, 'Evaluación del punto')[0] as ItemConContexto
    },
    offline: {
      ...item,
      ...valores,
      // Lo que va a escribir el trigger. Se refleja aquí para que la fila
      // optimista no diga «sin evaluar por nadie» durante todo el recorrido.
      evaluado_por: cambios.veredicto === 'pendiente' ? null : (evaluadoPor ?? item.evaluado_por),
    },
  })
}
