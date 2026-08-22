/**
 * El control documental [F02·B2] — el corazón de un SGC.
 *
 * ⚠️ **Cuatro reglas que sostiene la BASE, no esta pantalla.** Están aquí
 * escritas porque quien lea este archivo tiene que saber por qué no se
 * implementan aquí:
 *
 *   1. Una versión aprobada **no se sobrescribe nunca**
 *      (`proteger_version_aprobada()`). Editarla es crear la siguiente.
 *   2. Aprobar una versión **jubila a la anterior** y actualiza el documento, en
 *      una sola escritura del cliente (`jubilar_version_anterior()`).
 *   3. Quién aprobó y cuándo lo escribe la base (`sellar_version_documento()`).
 *      Una fecha que viaja desde el navegador es una fecha que se puede escribir
 *      a mano, y la firma de aprobación es lo primero que mira un auditor.
 *   4. Un documento con alguna versión aprobada **no se borra**
 *      (`puedo_borrar_documento()`).
 *
 * ⚠️ **CUARTA EXCEPCIÓN CONSCIENTE A `offlineWrite`, y sólo una mitad**: subir
 * el ARCHIVO de una versión necesita conexión. Pesa megabytes, sale de un `File`
 * que sólo existe en esa pantalla, hay que convertirlo antes de guardarlo y lo
 * hace un consultor con el Word del cliente delante de su computadora — nunca un
 * auditor en un sótano. Sin conexión, la pantalla lo dice y no deja empezar.
 * **Todo lo demás pasa por la cola**: crear el documento, escribir una versión a
 * mano, mandarla a revisión, aprobarla y vincular cláusulas.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas, mensajeDeError } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import { extensionDe, type OrigenMarkdown } from '@/lib/documentos/convertir'
import type { Tables } from '@/types/database'

export const BUCKET_DOCUMENTOS = 'documentos'

export type Documento = Tables<'documentos'>
export type VersionDocumento = Tables<'documento_versiones'>
export type Firmante = Pick<Tables<'usuarios'>, 'id' | 'nombre'>

export type VersionConFirmas = VersionDocumento & {
  elaboro: Firmante | null
  reviso: Firmante | null
  aprobo: Firmante | null
}

export type DocumentoEnLista = Documento & {
  proceso: { id: string; nombre: string } | null
  proyecto: { id: string; nombre: string } | null
  vigente: Pick<VersionDocumento, 'id' | 'version' | 'estado' | 'fecha_aprobacion' | 'fecha_vigencia'> | null
  versiones: { count: number }[]
  clausulas: { count: number }[]
}

export type ClausulaDelDocumento = Tables<'documento_clausulas'> & {
  clausula:
    | (Pick<Tables<'norma_clausulas'>, 'id' | 'numero' | 'titulo' | 'auditable'> & {
        norma: Pick<Tables<'normas'>, 'id' | 'clave' | 'nombre'> | null
      })
    | null
}

/**
 * ⚠️ `documento_versiones` apunta **cuatro veces** a `usuarios` —elaboró,
 * revisó, aprobó y creó—, así que cada embed se nombra por su clave foránea o
 * PostgREST responde *"more than one relationship was found"*. Es la cuarta vez
 * que aparece esta trampa en el proyecto: **si la tabla apunta dos veces a la
 * misma, se nombra la clave**.
 */
const EMBEBIDO_VERSION =
  '*, elaboro:usuarios!documento_versiones_elaboro_id_fkey(id, nombre)' +
  ', reviso:usuarios!documento_versiones_reviso_id_fkey(id, nombre)' +
  ', aprobo:usuarios!documento_versiones_aprobo_id_fkey(id, nombre)'

const EMBEBIDO_LISTA =
  '*, proceso:procesos(id, nombre)' +
  ', proyecto:proyectos(id, nombre)' +
  ', vigente:documento_versiones!documentos_version_vigente_fkey(id, version, estado, fecha_aprobacion, fecha_vigencia)' +
  ', versiones:documento_versiones!documento_versiones_documento_id_fkey(count)' +
  ', clausulas:documento_clausulas(count)'

async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

// ═══════════════════════════════════════════════════════════════ lecturas ══

/**
 * **La lista maestra de documentos**, que es un entregable en sí mismo.
 *
 * ⚠️ Se trae la biblioteca del cliente ENTERA, sin filtro de tipo, de estado ni
 * de proyecto: esos filtros son de pantalla y se aplican en memoria
 * (CLAUDE.md · reglas del offline, 7). Con una consulta por filtro, elegir
 * «Procedimientos» sin señal vaciaría la lista.
 */
export async function listarDocumentos(orgId: string): Promise<DocumentoEnLista[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documentos')
    .select(EMBEBIDO_LISTA)
    .eq('org_id', orgId)
    .order('codigo')

  if (error) throw error
  return (data ?? []) as unknown as DocumentoEnLista[]
}

/**
 * **Qué documento cubre cada cláusula, para toda la biblioteca de un cliente.**
 *
 * Es la mitad que le faltaba a la matriz de requisitos: sin esto, marcar una
 * cláusula como `documentado` es una afirmación sin respaldo, y lo primero que
 * pregunta un auditor de certificación es *«enséñemelo»*. Con esto, la fila de
 * la 4.1 dice **con qué** — y el consultor descubre de un vistazo las cláusulas
 * que dio por documentadas sin tener nada.
 *
 * ⚠️ Una consulta para todo el cliente, no una por cláusula: la matriz pinta
 * cientos de filas y se abre al empezar una visita.
 */
export type CoberturaClausula = {
  clausula_id: string
  documento: Pick<Documento, 'id' | 'codigo' | 'titulo' | 'estado'> | null
}

export async function listarCoberturaDeClausulas(orgId: string): Promise<CoberturaClausula[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documento_clausulas')
    .select('clausula_id, documento:documentos(id, codigo, titulo, estado)')
    .eq('org_id', orgId)

  if (error) throw error
  return (data ?? []) as unknown as CoberturaClausula[]
}

export type ExpedienteDocumento = {
  documento: Documento
  versiones: VersionConFirmas[]
  clausulas: ClausulaDelDocumento[]
}

/** Un documento con todo lo suyo: sus versiones y las cláusulas que cubre. */
export async function obtenerDocumento(documentoId: string): Promise<ExpedienteDocumento | null> {
  const supabase = createClient()

  const { data: documento, error: falloDoc } = await supabase
    .from('documentos')
    .select('*')
    .eq('id', documentoId)
    .maybeSingle()

  if (falloDoc) throw falloDoc
  if (!documento) return null

  const { data: versiones, error: falloVersiones } = await supabase
    .from('documento_versiones')
    .select(EMBEBIDO_VERSION)
    .eq('documento_id', documentoId)
    .order('creado_en', { ascending: false })

  if (falloVersiones) throw falloVersiones

  const { data: clausulas, error: falloClausulas } = await supabase
    .from('documento_clausulas')
    .select('*, clausula:norma_clausulas(id, numero, titulo, auditable, norma:normas(id, clave, nombre))')
    .eq('documento_id', documentoId)

  if (falloClausulas) throw falloClausulas

  return {
    documento,
    versiones: (versiones ?? []) as unknown as VersionConFirmas[],
    clausulas: (clausulas ?? []) as unknown as ClausulaDelDocumento[],
  }
}

/**
 * La URL para abrir el archivo original.
 *
 * ⚠️ **Se firma al pedirla y caduca**, y por eso no se guarda en la base: el
 * bucket es privado porque guarda los documentos del SGC de plantas
 * industriales. Una URL firmada guardada en una columna es una URL caducada
 * dentro de una hora — y, mientras vive, una puerta abierta para quien la copie.
 *
 * ⚠️ **Sin señal esto no funciona, y no es un fallo**: firmar es una llamada al
 * servidor. La pantalla lo dice en vez de dejar un botón que no hace nada.
 */
export async function urlDelArchivo(ruta: string): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(ruta, 300)

  if (error) throw error
  if (!data?.signedUrl) throw new Error('No se pudo abrir el archivo original.')

  return data.signedUrl
}

// ═════════════════════════════════════════════════════════════ documentos ══

export type DatosDocumento = {
  codigo: string
  titulo: string
  tipo: string
  proceso_id: string | null
  proyecto_id: string | null
}

export async function crearDocumento(
  orgId: string,
  datos: DatosDocumento,
): Promise<ResultadoEscritura<DocumentoEnLista>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const creadoPor = await idDeLaSesion()

  const valores = { id, org_id: orgId, ...datos, creado_por: creadoPor }

  return offlineWrite<DocumentoEnLista>({
    tabla: 'documentos',
    operacion: 'insert',
    etiqueta: `Alta de documento — ${datos.codigo} ${datos.titulo}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('documentos').insert(valores).select(EMBEBIDO_LISTA)
      if (error) throw error
      return exigirFilas(data, 'Alta de documento')[0] as unknown as DocumentoEnLista
    },
    offline: {
      ...valores,
      estado: 'en_elaboracion',
      version_vigente_id: null,
      creado_en: ahora,
      actualizado_en: ahora,
      proceso: null,
      proyecto: null,
      vigente: null,
      versiones: [{ count: 0 }],
      clausulas: [{ count: 0 }],
    } as unknown as DocumentoEnLista,
  })
}

export async function actualizarDocumento(
  documento: DocumentoEnLista,
  datos: DatosDocumento,
): Promise<ResultadoEscritura<DocumentoEnLista>> {
  return offlineWrite<DocumentoEnLista>({
    tabla: 'documentos',
    operacion: 'update',
    etiqueta: `Cambios en el documento ${datos.codigo}`,
    valores: datos,
    filtro: { id: documento.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('documentos')
        .update(datos)
        .eq('id', documento.id)
        .select(EMBEBIDO_LISTA)
      if (error) throw error
      return exigirFilas(data, 'Cambios en el documento')[0] as unknown as DocumentoEnLista
    },
    offline: { ...documento, ...datos },
  })
}

/**
 * Borrar un documento.
 *
 * ⚠️ Sólo mientras **nunca haya tenido una versión aprobada**, y lo comprueba la
 * base (`puedo_borrar_documento()`). Un borrador capturado por error se quita;
 * un procedimiento que estuvo vigente es evidencia y se queda, obsoleto pero
 * consultable (CLAUDE.md regla 13). Si la política dice que no, el DELETE toca
 * cero filas y `exigirFilas` lo convierte en un error con motivo — no en un
 * "desapareció y al refrescar volvió".
 */
export async function eliminarDocumento(
  documento: Documento,
): Promise<ResultadoEscritura<{ id: string }>> {
  const filtro = { id: documento.id }

  return offlineWrite<{ id: string }>({
    tabla: 'documentos',
    operacion: 'delete',
    etiqueta: `Borrar el documento ${documento.codigo}`,
    filtro,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('documentos')
        .delete()
        .eq('id', documento.id)
        .select('id')
      if (error) throw error
      return exigirFilas(data, 'Borrar el documento')[0]
    },
    offline: filtro,
  })
}

// ═══════════════════════════════════════════════════════════════ versiones ══

/**
 * El número que le toca a la versión siguiente.
 *
 * `1.0` → `2.0`. Se propone, no se impone: la firma puede querer `1.1` para un
 * cambio menor y el campo se deja editar.
 */
export function siguienteVersion(versiones: readonly { version: string }[]): string {
  const mayores = versiones
    .map((v) => Number.parseInt(v.version, 10))
    .filter((n) => Number.isFinite(n))

  return mayores.length === 0 ? '1.0' : `${Math.max(...mayores) + 1}.0`
}

export type DatosVersion = {
  version: string
  control_cambios: string | null
  fecha_elaboracion: string | null
  fecha_vigencia: string | null
  elaboro_id: string | null
  reviso_id: string | null
}

export type ArchivoDeVersion = {
  archivo: File
  markdown: string
  avisos: string[]
  origen: OrigenMarkdown
}

/**
 * Una versión nueva **con archivo**: la que sube el Word o el PDF del cliente.
 *
 * ⚠️ **Necesita conexión.** Es la excepción declarada arriba: primero viaja el
 * archivo al bucket privado y después la fila. En ese orden a propósito — una
 * fila que apunta a una ruta que no existe deja un documento que no se puede
 * abrir; un objeto en el bucket sin fila es un archivo huérfano que no rompe
 * nada y que se limpia.
 *
 * ⚠️ La ruta lleva el **id de la versión**, no el nombre del archivo: dos
 * revisiones del manual se llaman las dos `Manual de Calidad.docx`, y con el
 * nombre como ruta la segunda pisaría el original de la primera — que es
 * exactamente lo que no puede pasar en un expediente. El nombre de verdad se
 * guarda en `archivo_nombre` y es el que se enseña.
 */
export async function crearVersionConArchivo(
  documento: Documento,
  datos: DatosVersion,
  contenido: ArchivoDeVersion,
): Promise<VersionConFirmas> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error(
      'Subir el archivo de una versión necesita conexión: pesa megabytes y no pasa por la cola de salida. ' +
      'Lo que sí puedes hacer sin señal es escribir la versión a mano.',
    )
  }

  const supabase = createClient()
  const id = uuid()
  const extension = extensionDe(contenido.archivo.name) || 'bin'
  const ruta = `${documento.org_id}/${documento.id}/${id}.${extension}`

  const { error: falloSubida } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(ruta, contenido.archivo, {
      contentType: contenido.archivo.type || 'application/octet-stream',
      upsert: false,
    })

  if (falloSubida) {
    throw new Error(`No se pudo subir el archivo: ${mensajeDeError(falloSubida)}`)
  }

  const valores = {
    id,
    documento_id: documento.id,
    // La reemplaza el trigger `heredar_org_del_documento()`; va porque la
    // columna es NOT NULL y el tipo generado la exige.
    org_id: documento.org_id,
    ...datos,
    estado: 'borrador',
    archivo_ruta: ruta,
    archivo_nombre: contenido.archivo.name,
    archivo_tipo: contenido.archivo.type || null,
    archivo_tamano: contenido.archivo.size,
    markdown: contenido.markdown,
    origen_markdown: contenido.origen,
    avisos_conversion: contenido.avisos,
    creado_por: await idDeLaSesion(),
  }

  const { data, error } = await supabase
    .from('documento_versiones')
    .insert(valores)
    .select(EMBEBIDO_VERSION)

  if (error) throw error
  return exigirFilas(data, 'Versión nueva')[0] as unknown as VersionConFirmas
}

/**
 * Una versión nueva **escrita en la app**, sin archivo.
 *
 * Ésta sí pasa por la cola: es texto, no megabytes. Es también lo que pasa al
 * editar el Markdown de una versión aprobada — **editar crea la siguiente,
 * nunca modifica la aprobada**.
 */
export async function crearVersionEscrita(
  documento: Documento,
  datos: DatosVersion,
  markdown: string,
): Promise<ResultadoEscritura<VersionConFirmas>> {
  const id = uuid()
  const ahora = new Date().toISOString()

  const valores = {
    id,
    documento_id: documento.id,
    org_id: documento.org_id,
    ...datos,
    estado: 'borrador',
    markdown,
    origen_markdown: 'escrito',
    creado_por: await idDeLaSesion(),
  }

  return offlineWrite<VersionConFirmas>({
    tabla: 'documento_versiones',
    operacion: 'insert',
    etiqueta: `Versión ${datos.version} de ${documento.codigo}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('documento_versiones')
        .insert(valores)
        .select(EMBEBIDO_VERSION)
      if (error) throw error
      return exigirFilas(data, 'Versión nueva')[0] as unknown as VersionConFirmas
    },
    offline: {
      ...valores,
      archivo_ruta: null,
      archivo_nombre: null,
      archivo_tipo: null,
      archivo_tamano: null,
      avisos_conversion: [],
      aprobo_id: null,
      fecha_aprobacion: null,
      creado_en: ahora,
      actualizado_en: ahora,
      elaboro: null,
      reviso: null,
      aprobo: null,
    } as unknown as VersionConFirmas,
  })
}

/**
 * Guardar el Markdown de un **borrador**.
 *
 * ⚠️ Sólo de un borrador, y no por prudencia de la interfaz: el trigger
 * `proteger_version_aprobada()` rechaza cualquier cambio de contenido sobre una
 * versión aprobada. La pantalla no ofrece el botón para no acabar en un error
 * que ya está garantizado.
 */
export async function guardarMarkdown(
  version: VersionConFirmas,
  markdown: string,
): Promise<ResultadoEscritura<VersionConFirmas>> {
  const valores = { markdown }

  return offlineWrite<VersionConFirmas>({
    tabla: 'documento_versiones',
    operacion: 'update',
    etiqueta: `Texto de la versión ${version.version}`,
    valores,
    filtro: { id: version.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('documento_versiones')
        .update(valores)
        .eq('id', version.id)
        .select(EMBEBIDO_VERSION)
      if (error) throw error
      return exigirFilas(data, 'Texto de la versión')[0] as unknown as VersionConFirmas
    },
    offline: { ...version, ...valores },
  })
}

/**
 * Mover una versión por su ciclo de vida.
 *
 * ⚠️ **`aprobo_id` y `fecha_aprobacion` NO se mandan desde aquí.** Los escribe
 * `sellar_version_documento()` con `auth.uid()` y la fecha en la zona de la
 * firma. Y aprobar **jubila sola** a la versión anterior y apunta el documento a
 * ésta: son tres escrituras que tienen que pasar juntas, y por eso las hace un
 * trigger y no tres operaciones de la cola que sin señal pueden llegar
 * desparejadas. La fila optimista de aquí es una estimación de lo que va a
 * escribir el servidor; la verdad la trae la respuesta.
 */
export async function cambiarEstadoVersion(
  version: VersionConFirmas,
  estado: string,
  yo: Firmante | null,
): Promise<ResultadoEscritura<VersionConFirmas>> {
  const valores = { estado }
  const aprobando = estado === 'aprobado'

  return offlineWrite<VersionConFirmas>({
    tabla: 'documento_versiones',
    operacion: 'update',
    etiqueta: aprobando
      ? `Aprobar la versión ${version.version}`
      : `Mandar a revisión la versión ${version.version}`,
    valores,
    filtro: { id: version.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('documento_versiones')
        .update(valores)
        .eq('id', version.id)
        .select(EMBEBIDO_VERSION)
      if (error) throw error
      return exigirFilas(data, 'Estado de la versión')[0] as unknown as VersionConFirmas
    },
    offline: {
      ...version,
      estado,
      aprobo: aprobando ? yo : version.aprobo,
      aprobo_id: aprobando ? yo?.id ?? null : version.aprobo_id,
    },
  })
}

/** Borrar un borrador. Una versión aprobada no se borra: la base no la deja. */
export async function eliminarVersion(
  version: VersionDocumento,
): Promise<ResultadoEscritura<{ id: string }>> {
  const filtro = { id: version.id }

  return offlineWrite<{ id: string }>({
    tabla: 'documento_versiones',
    operacion: 'delete',
    etiqueta: `Borrar el borrador ${version.version}`,
    filtro,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('documento_versiones')
        .delete()
        .eq('id', version.id)
        .select('id')
      if (error) throw error
      return exigirFilas(data, 'Borrar el borrador')[0]
    },
    offline: filtro,
  })
}

// ═══════════════════════════════════════════════════════════════ cláusulas ══

/**
 * Qué cláusula cubre este documento.
 *
 * **Es lo que convierte «tenemos un procedimiento de compras» en «la 8.4 está
 * documentada»**: la matriz de requisitos [F02·B3] se apoya en esta tabla para
 * proponer el estado de cada cláusula.
 */
export async function vincularClausula(
  documento: Documento,
  clausula: ClausulaDelDocumento['clausula'],
): Promise<ResultadoEscritura<ClausulaDelDocumento>> {
  if (!clausula) throw new Error('Elige una cláusula.')

  const valores = {
    documento_id: documento.id,
    clausula_id: clausula.id,
    org_id: documento.org_id,
    creado_por: await idDeLaSesion(),
  }

  return offlineWrite<ClausulaDelDocumento>({
    tabla: 'documento_clausulas',
    operacion: 'insert',
    etiqueta: `${documento.codigo} cubre la cláusula ${clausula.numero}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('documento_clausulas')
        .insert(valores)
        .select('*, clausula:norma_clausulas(id, numero, titulo, auditable, norma:normas(id, clave, nombre))')
      if (error) throw error
      return exigirFilas(data, 'Vincular la cláusula')[0] as unknown as ClausulaDelDocumento
    },
    offline: { ...valores, creado_en: new Date().toISOString(), clausula } as unknown as ClausulaDelDocumento,
  })
}

export async function desvincularClausula(
  vinculo: ClausulaDelDocumento,
  codigo: string,
): Promise<ResultadoEscritura<{ documento_id: string; clausula_id: string }>> {
  const filtro = { documento_id: vinculo.documento_id, clausula_id: vinculo.clausula_id }

  return offlineWrite<{ documento_id: string; clausula_id: string }>({
    tabla: 'documento_clausulas',
    operacion: 'delete',
    etiqueta: `${codigo} deja de cubrir la cláusula ${vinculo.clausula?.numero ?? ''}`,
    filtro,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('documento_clausulas')
        .delete()
        .match(filtro)
        .select('documento_id, clausula_id')
      if (error) throw error
      return exigirFilas(data, 'Quitar la cláusula')[0]
    },
    offline: filtro,
  })
}
