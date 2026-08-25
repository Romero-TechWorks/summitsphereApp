/**
 * **La cola de adjuntos** [F02·B2b] — evidencia que pesa megabytes.
 *
 * ⚠️ **No es el `outbox`, y la subida va en DOS FASES**:
 *
 *   1. **La fila** (`adjuntos`) viaja por la cola normal, con `offlineWrite`.
 *      Es una escritura de tabla como cualquier otra, y va ahí a propósito:
 *      así conserva su ORDEN respecto a las demás. Sin eso, marcar una tarea
 *      con evidencia obligatoria como hecha llegaría al servidor antes que su
 *      adjunto, y `sellar_tarea_hecha()` la rechazaría — justo al recuperar la
 *      señal, con el auditor ya fuera de la planta.
 *   2. **El binario** espera aquí, en su propio almacén de IndexedDB, y se sube
 *      **después** de que la cola de datos esté vacía. Una foto de 4 MB no puede
 *      bloquear el envío de treinta hallazgos de texto.
 *
 * ⚠️ **`subirAdjunto()` sólo encola.** Quien sube de verdad es
 * `sincronizarAdjuntos()`, **y hay que esperarlo**: refrescar la pantalla sin
 * esperar es el «hay que subirla dos veces» de JDM Built (docs/03 §8.8, regla 4).
 *
 * ⚠️ **El bucket es privado**: lo ya subido se lee con URL firmada, así que **no
 * se ve sin señal**. Tomar la foto y adjuntarla, sí. Es una limitación real que
 * la interfaz dice, no esconde.
 */

import { createClient } from '@/lib/supabase/client'
import { esFalloDeRed, mensajeDeError } from '@/lib/supabase/errores'
import { ALMACEN_ADJUNTOS, borrarIdb, escribirIdb, listarIdb } from './idb'

export const BUCKET_EVIDENCIAS = 'evidencias'

/**
 * **El orden del campo dominante, escrito UNA sola vez.**
 *
 * De lo más específico a lo más general: la tarea de etapa es más concreta que
 * la acción, y la acción más que el hallazgo. Si un adjunto llegara con dos,
 * gana el primero de la lista.
 *
 * ⚠️ **Nunca se filtra con un OR.** `where tarea_etapa_id = X or documento_id = X`
 * no usa índice, y peor: devuelve adjuntos de otro sitio en cuanto dos ids
 * coinciden. Se filtra por el campo que manda, y ya.
 *
 * ⚠️ Tres de estos campos **todavía no existen en la tabla**: `accion_id`,
 * `tarea_id` y `obligacion_id` llegan en la Fase 04 y la 05. El orden se escribe
 * entero desde ahora para que añadirlos sea descomentar una línea aquí y otra en
 * `heredar_org_del_adjunto()`, en vez de reconstruir el criterio a partir de cómo
 * quedó el código.
 *
 * ⚠️ `hallazgo_id` e `item_id` **ya están** —los añadieron las migraciones de
 * F03·B0 y F03·B3— y van entre la tarea y el documento. Esta lista y el `if` del
 * trigger `heredar_org_del_adjunto()` se mueven juntos: si divergen, un adjunto
 * hereda la organización equivocada.
 *
 * ⚠️ **El hallazgo va ANTES que el punto de verificación**, y no es arbitrario:
 * un hallazgo *cita* a un punto, así que es más específico. Una foto que llegue
 * con los dos campos puestos es evidencia del hallazgo, y bajo él tiene que
 * aparecer.
 */
export const CAMPOS_DOMINANTES = [
  'tarea_etapa_id',
  // 'tarea_id',      → Fase 04
  // 'accion_id',     → Fase 04
  'hallazgo_id',
  'item_id',
  'documento_id',
  // 'obligacion_id', → Fase 05
] as const

export type CampoDominante = (typeof CAMPOS_DOMINANTES)[number]

/** De quién cuelga un adjunto. `null` = del cliente entero. */
export type DestinoAdjunto = Partial<Record<CampoDominante, string | null>>

/**
 * Qué campo manda en este destino.
 *
 * Devuelve `null` cuando no hay ninguno: eso es un adjunto de la organización, y
 * es válido. Nunca lanza — quien lo llama pinta una lista, y una excepción aquí
 * se lleva la pantalla entera.
 */
export function campoDominante(destino: DestinoAdjunto): { campo: CampoDominante; id: string } | null {
  for (const campo of CAMPOS_DOMINANTES) {
    const id = destino[campo]
    if (id) return { campo, id }
  }
  return null
}

// ══════════════════════════════════════════════════════ la cola de binarios ══

export type SubidaPendiente = {
  /** El mismo `id` que la fila de `adjuntos`: es lo que las une. */
  id: string
  ruta: string
  nombre: string
  tipo: string
  tamano: number
  contenido: Blob
  creado_en: string
  intentos: number
  estado: 'pendiente' | 'fallida'
  motivo: string | null
}

const LISTA_VACIA: SubidaPendiente[] = []
let lista: SubidaPendiente[] = LISTA_VACIA
const oyentes = new Set<() => void>()

export function suscribirAdjuntos(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

/** La instantánea del cliente. Identidad estable: la exige `useSyncExternalStore`. */
export function leerSubidas(): SubidaPendiente[] {
  return lista
}

/** En el servidor no hay IndexedDB, y la lista tiene que ser la MISMA referencia. */
export function subidasDelServidor(): SubidaPendiente[] {
  return LISTA_VACIA
}

function avisar(nueva: SubidaPendiente[]) {
  lista = nueva.length === 0 ? LISTA_VACIA : nueva
  for (const oyente of oyentes) oyente()
}

export async function refrescarSubidas(): Promise<SubidaPendiente[]> {
  const guardadas = await listarIdb<SubidaPendiente>(ALMACEN_ADJUNTOS)
  const ordenadas = [...guardadas].sort((a, b) => a.creado_en.localeCompare(b.creado_en))
  avisar(ordenadas)
  return ordenadas
}

/**
 * La ruta del objeto en el bucket privado.
 *
 * ⚠️ **Empieza SIEMPRE por la organización**, porque de eso —y sólo de eso—
 * cuelga la política de Storage: `(storage.foldername(name))[1]` es la `org_id`.
 * Una ruta que no empiece así no la puede leer nadie (docs/08 §4).
 *
 * ⚠️ Y lleva un `uuid`, no el nombre del archivo: dos fotos de un teléfono se
 * llaman las dos `IMG_0421.jpg`, y con el nombre como ruta la segunda pisaría la
 * primera. El nombre de verdad se guarda en la fila y es el que se enseña.
 */
export function rutaDeAdjunto(orgId: string, id: string, nombre: string): string {
  const punto = nombre.lastIndexOf('.')
  const extension = punto > 0 ? nombre.slice(punto + 1).toLowerCase() : 'bin'
  const anio = new Date().getFullYear()
  return `${orgId}/${anio}/${id}.${extension}`
}

/**
 * Encola el binario. **No sube nada.**
 *
 * La fila de `adjuntos` la escribe `lib/queries/adjuntos.ts` con `offlineWrite`,
 * y las dos comparten el `id`.
 */
export async function encolarSubida(subida: {
  id: string
  ruta: string
  archivo: File
}): Promise<void> {
  const fila: SubidaPendiente = {
    id: subida.id,
    ruta: subida.ruta,
    nombre: subida.archivo.name,
    tipo: subida.archivo.type || 'application/octet-stream',
    tamano: subida.archivo.size,
    // Se guarda el `File` tal cual: IndexedDB clona estructuras y un `File` es
    // un `Blob`. Copiarlo a un ArrayBuffer duplicaría en memoria una foto de 4 MB.
    contenido: subida.archivo,
    creado_en: new Date().toISOString(),
    intentos: 0,
    estado: 'pendiente',
    motivo: null,
  }

  await escribirIdb(ALMACEN_ADJUNTOS, fila)
  await refrescarSubidas()
}

export async function quitarSubida(id: string): Promise<void> {
  await borrarIdb(ALMACEN_ADJUNTOS, id)
  await refrescarSubidas()
}

async function marcarFallo(subida: SubidaPendiente, motivo: string): Promise<void> {
  await escribirIdb(ALMACEN_ADJUNTOS, {
    ...subida,
    estado: 'fallida',
    intentos: subida.intentos + 1,
    motivo,
  })
  await refrescarSubidas()
}

export type ResultadoSubidas = { subidas: number; fallidas: number }

/** Una sola tanda a la vez: dos en paralelo subirían el mismo archivo dos veces. */
let subiendo = false

/**
 * Vacía la cola de binarios contra el bucket privado.
 *
 * ⚠️ **Hay que esperar esta promesa antes de refrescar la pantalla.** Es la
 * regla 4 de §8.8, y el bug que costó en JDM Built: quien refresca sin esperar
 * ve la lista sin el archivo, lo vuelve a adjuntar, y acaba con dos.
 */
export async function sincronizarAdjuntos(): Promise<ResultadoSubidas> {
  const vacio: ResultadoSubidas = { subidas: 0, fallidas: 0 }

  if (subiendo) return vacio
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return vacio

  subiendo = true
  let subidas = 0
  let fallidas = 0

  try {
    const supabase = createClient()

    // Sin sesión no se sube nada: las políticas del bucket son `TO authenticated`
    // y un intento anónimo se rechazaría con un permiso denegado legítimo que
    // daría la foto por perdida. Mismo razonamiento que en `sync.ts`.
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return vacio

    for (const subida of await refrescarSubidas()) {
      if (subida.estado === 'fallida') continue

      try {
        const { error } = await supabase.storage
          .from(BUCKET_EVIDENCIAS)
          .upload(subida.ruta, subida.contenido, {
            contentType: subida.tipo,
            // ⚠️ `upsert: false`: la ruta lleva un uuid, así que si ya existe es
            // que esta misma subida llegó antes y la respuesta se perdió. El
            // error de duplicado se trata abajo como éxito.
            upsert: false,
          })

        if (error) throw error

        await quitarSubida(subida.id)
        subidas++
      } catch (error) {
        if (esFalloDeRed(error)) {
          // Se cortó a media tanda. Lo que queda espera: no falló nada.
          break
        }

        const motivo = mensajeDeError(error)

        // El objeto ya está arriba: la subida anterior sí llegó y lo que se
        // perdió fue la respuesta. Darlo por fallido dejaría en rojo una
        // evidencia que está perfectamente guardada.
        if (/duplicate|already exists|resource already/i.test(motivo)) {
          await quitarSubida(subida.id)
          subidas++
          continue
        }

        await marcarFallo(subida, motivo)
        fallidas++
      }
    }

    return { subidas, fallidas }
  } finally {
    subiendo = false
  }
}

/** Reintentar una subida que el servidor rechazó, cuando alguien lo pide. */
export async function reintentarSubida(id: string): Promise<void> {
  const subida = lista.find((s) => s.id === id)
  if (!subida) return

  await escribirIdb(ALMACEN_ADJUNTOS, { ...subida, estado: 'pendiente', motivo: null })
  await refrescarSubidas()
}
