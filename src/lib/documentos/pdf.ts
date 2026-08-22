/**
 * PDF → Markdown [F02·B2].
 *
 * Con `pdfjs-dist`, que **ya es dependencia del proyecto**: no se añade peso, se
 * usa lo que hay.
 *
 * ⚠️ **Un PDF escaneado no tiene texto que extraer.** Es una foto de una hoja
 * metida en un contenedor PDF: `getTextContent()` devuelve vacío o cuatro
 * caracteres sueltos de la portada. Eso es OCR, y el OCR es el Módulo C
 * multimodal [F07·T6]. Aquí se **detecta y se dice** —tres caracteres por página
 * lo delatan—, porque guardar un documento con el Markdown en blanco es peor:
 * el consultor cree que ya está y lo descubre el día que el cliente lo abre.
 *
 * ⚠️ Un PDF no tiene párrafos ni títulos: tiene trozos de texto con coordenadas.
 * Lo que sale de aquí son **líneas y bloques**, reconstruidos por la posición
 * vertical. Es legible y buscable; no es la estructura del documento. Por eso
 * `origen_markdown = 'pdf'` se pinta en la ficha con su aviso.
 */

import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import type { Conversion } from './docx'

/** Menos de esto por página y es un escaneo, no un documento. */
const CARACTERES_MINIMOS_POR_PAGINA = 3

export async function pdfAMarkdown(archivo: ArrayBuffer): Promise<Conversion> {
  const pdfjs = await import('pdfjs-dist')

  // ⚠️ El worker se resuelve con `new URL(..., import.meta.url)`, que webpack
  // reconoce y emite como asset propio. Sin esto pdf.js intenta bajarlo de un
  // CDN, y en una planta sin señal —o detrás del proxy de un cliente— la
  // conversión se queda colgada sin decir por qué.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const documento = await pdfjs.getDocument({ data: new Uint8Array(archivo) }).promise
  const avisos = new Set<string>()
  const paginas: string[] = []

  try {
    for (let numero = 1; numero <= documento.numPages; numero++) {
      const pagina = await documento.getPage(numero)
      const contenido = await pagina.getTextContent()
      // ⚠️ `items` mezcla texto con marcas de contenido estructural
      // (`TextMarkedContent`), que no tienen ni `str` ni coordenadas. Sin este
      // filtro, un PDF etiquetado —los que exporta Word— revienta al leer
      // `transform` de una marca.
      const trozos = contenido.items.filter((item): item is TextItem => 'str' in item)
      paginas.push(bloquesDeLaPagina(trozos))
      pagina.cleanup()
    }
  } finally {
    // Sin esto el worker se queda vivo por cada PDF que se abra en la sesión, y
    // el consultor que sube quince documentos acaba con quince workers.
    await documento.destroy()
  }

  const markdown = paginas.filter((p) => p.length > 0).join('\n\n').trim()
  const porPagina = markdown.length / Math.max(documento.numPages, 1)

  if (porPagina < CARACTERES_MINIMOS_POR_PAGINA) {
    throw new Error(
      'Este PDF no tiene texto: es un escaneo, una foto de las hojas metida en un PDF. ' +
      'Leerlo necesita reconocimiento óptico, que todavía no está en la app. ' +
      'Sube el documento en Word, o el PDF original de donde salió el escaneo.',
    )
  }

  avisos.add('Un PDF no guarda su estructura: los títulos, las listas y las tablas salen como texto corrido. Revisa el Markdown antes de darlo por bueno.')

  if (documento.numPages > 1) {
    avisos.add(`Se juntaron las ${documento.numPages} páginas en un solo texto: los encabezados y pies de página pueden aparecer repetidos.`)
  }

  return { markdown, avisos: [...avisos] }
}

/**
 * Los trozos de una página, reagrupados en líneas y párrafos.
 *
 * ⚠️ `transform[5]` es la coordenada vertical del trozo y `transform[4]` la
 * horizontal — un PDF no tiene líneas, tiene texto colocado. Los trozos con la
 * misma `y` (dentro de un margen, porque casi nunca es idéntica) son una línea;
 * un salto vertical mayor que el alto de una línea es un párrafo nuevo.
 */
function bloquesDeLaPagina(trozos: TextItem[]): string {
  if (trozos.length === 0) return ''

  const lineas: { y: number; x: number; texto: string }[] = []

  for (const trozo of trozos) {
    if (trozo.str.trim().length === 0) continue

    const y = trozo.transform[5]
    const x = trozo.transform[4]
    const anterior = lineas[lineas.length - 1]

    // 2pt de tolerancia: los acentos y los superíndices bajan o suben unas
    // décimas y no son líneas nuevas.
    if (anterior && Math.abs(anterior.y - y) < 2) {
      // Un hueco horizontal grande entre dos trozos de la misma línea es un
      // espacio que el PDF no escribió (columnas, tabulación).
      const separador = x - anterior.x > 12 ? ' ' : ''
      anterior.texto += separador + trozo.str
      anterior.x = x
    } else {
      lineas.push({ y, x, texto: trozo.str })
    }
  }

  const bloques: string[] = []
  let actual: string[] = []
  let yPrevia: number | null = null

  for (const linea of lineas) {
    const texto = linea.texto.replace(/\s+/g, ' ').trim()
    if (texto.length === 0) continue

    const salto = yPrevia === null ? 0 : yPrevia - linea.y

    // Un salto de más de 18pt entre líneas es aire entre párrafos, no el
    // interlineado normal de un cuerpo de 10-12pt.
    if (salto > 18 && actual.length > 0) {
      bloques.push(actual.join(' '))
      actual = []
    }

    actual.push(texto)
    yPrevia = linea.y
  }

  if (actual.length > 0) bloques.push(actual.join(' '))

  return bloques.join('\n\n')
}
