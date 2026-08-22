/**
 * De un archivo subido a Markdown: quién convierte qué [F02·B2].
 *
 * Un solo sitio decide, para que la pantalla no tenga que saber de formatos.
 */

import { docxAMarkdown, type Conversion } from './docx'
import { pdfAMarkdown } from './pdf'

export type { Conversion }

/** `documento_versiones.origen_markdown` */
export type OrigenMarkdown = 'docx' | 'pdf' | 'escrito'

export type ResultadoConversion = Conversion & { origen: OrigenMarkdown }

/** 50 MB — el tope del bucket `documentos`. */
export const TAMANO_MAXIMO = 50 * 1024 * 1024

const TIPOS_DOCX = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

/**
 * Qué se puede subir, dicho para el `accept` de un `<input type="file">`.
 *
 * ⚠️ El `.doc` antiguo NO está: es un formato binario propietario de 1997 que no
 * es un ZIP y no se lee con nada de esto. Se dice al elegir el archivo, no
 * después de subirlo.
 */
export const FORMATOS_ACEPTADOS =
  '.docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf'

export function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf('.')
  return punto < 0 ? '' : nombre.slice(punto + 1).toLowerCase()
}

/**
 * Convierte lo que se acaba de elegir.
 *
 * ⚠️ **Se decide por la extensión, no sólo por el `type` del `File`.** En
 * Windows, un `.docx` copiado de una unidad de red llega muchas veces con
 * `type: ''`, y confiar sólo en el MIME rechazaría el archivo con un
 * "formato no soportado" delante de un consultor que está mirando un Word
 * perfectamente normal.
 */
export async function convertirAMarkdown(archivo: File): Promise<ResultadoConversion> {
  if (archivo.size > TAMANO_MAXIMO) {
    throw new Error(
      `El archivo pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el tope son 50 MB. ` +
      'Si son fotos escaneadas, guárdalo en Word o comprime el PDF.',
    )
  }

  const extension = extensionDe(archivo.name)
  const datos = await archivo.arrayBuffer()

  if (extension === 'docx' || TIPOS_DOCX.has(archivo.type)) {
    return { ...(await docxAMarkdown(datos)), origen: 'docx' }
  }

  if (extension === 'pdf' || archivo.type === 'application/pdf') {
    return { ...(await pdfAMarkdown(datos)), origen: 'pdf' }
  }

  if (extension === 'doc') {
    throw new Error(
      'El `.doc` es el formato viejo de Word y la app no lo lee. ' +
      'Ábrelo en Word y guárdalo como `.docx` (Archivo → Guardar como → Documento de Word).',
    )
  }

  throw new Error(
    `No se puede convertir un archivo «.${extension || '?'}». ` +
    'La app lee Word (.docx) y PDF.',
  )
}
