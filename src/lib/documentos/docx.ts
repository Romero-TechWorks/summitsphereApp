/**
 * `.docx` → Markdown [F02·B2].
 *
 * ⚠️ **Con RegEx sobre `word/document.xml`, sin `pandoc` ni `docx.js`.** Es la
 * misma decisión que ya estaba tomada para la ida (docs/07 §Módulo B): en un
 * `.docx` real de un procedimiento hay párrafos, títulos, listas y alguna tabla,
 * y eso son doscientas líneas. Un parser de OpenXML completo son megabytes que
 * se descargan en una planta con media barra de señal — y la app tiene que
 * seguir siendo instalable.
 *
 * ⚠️ **La conversión pierde cosas, y por eso devuelve avisos.** Las tablas
 * complejas —celdas combinadas, tablas anidadas—, las imágenes y la numeración
 * automática no sobreviven. Se avisa AL SUBIR, en la pantalla; descubrirlo en el
 * entregable que ya se le mandó al cliente es otra cosa (docs/03 §8.8.1).
 *
 * ⚠️ **El original nunca se tira.** Esto produce una representación para leer en
 * el teléfono, editar sin Word y dársela al asistente [Fase 07]. Lo que firmó el
 * cliente es el `.docx`, y es el que un auditor pide.
 */

import { leerTexto } from './zip'

export type Conversion = {
  markdown: string
  /** Qué no sobrevivió. En español y para quien no sabe qué es OpenXML. */
  avisos: string[]
}

/** Convierte un `.docx` completo. */
export async function docxAMarkdown(archivo: ArrayBuffer): Promise<Conversion> {
  const xml = await leerTexto(new Uint8Array(archivo), 'word/document.xml')

  if (xml === null) {
    throw new Error(
      'El archivo no trae `word/document.xml`: no es un .docx de Word. ' +
      'Si es un `.doc` antiguo, ábrelo en Word y guárdalo como .docx.',
    )
  }

  return xmlAMarkdown(xml)
}

/**
 * El cuerpo del documento a Markdown.
 *
 * Se exporta suelta para poder probarla con un XML a mano, sin fabricar un ZIP.
 */
export function xmlAMarkdown(xml: string): Conversion {
  const avisos = new Set<string>()

  const cuerpo = xml.match(/<w:body[^>]*>([\s\S]*)<\/w:body>/)?.[1] ?? xml
  const bloques: string[] = []

  // Recorre el cuerpo quedándose con los bloques de PRIMER nivel: un párrafo o
  // una tabla. Los párrafos de dentro de una tabla los consume el bloque de la
  // tabla, que es lo que se quiere — si se leyeran también sueltos, cada celda
  // saldría además como su propio párrafo.
  const escaner = /<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>|<w:p(?:\s[^>]*)?\/>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g

  for (const [bruto] of cuerpo.matchAll(escaner)) {
    if (bruto.startsWith('<w:tbl')) {
      // Una tabla dentro de otra rompe el `[\s\S]*?` de arriba: el cierre que
      // encuentra es el de la interior. Se avisa en vez de entregar media tabla
      // en silencio.
      if (/<w:tbl[\s>]/.test(bruto.slice(5))) {
        avisos.add('El documento tiene tablas anidadas: se convirtieron a medias. Revísalas contra el original.')
      }
      const tabla = tablaAMarkdown(bruto, avisos)
      if (tabla) bloques.push(tabla)
      continue
    }

    const parrafo = parrafoAMarkdown(bruto, avisos)
    if (parrafo !== null) bloques.push(parrafo)
  }

  if (/<w:drawing[\s>]|<w:pict[\s>]|<w:object[\s>]/.test(cuerpo)) {
    avisos.add('El documento tiene imágenes: no pasan al Markdown. Siguen en el archivo original.')
  }
  if (/<w:numPr[\s>]/.test(cuerpo)) {
    avisos.add('La numeración automática de las listas se convirtió a viñetas: Word la calcula al abrir el archivo y no está escrita en él.')
  }
  if (/<w:footnoteReference|<w:endnoteReference/.test(cuerpo)) {
    avisos.add('Las notas al pie no pasan al Markdown.')
  }
  if (/<w:sdt[\s>]/.test(cuerpo)) {
    avisos.add('El documento tiene controles de contenido (campos de formulario): se convirtió su texto, no el control.')
  }

  const markdown = bloques
    .join('\n\n')
    // Tres o más saltos seguidos son párrafos vacíos del original. En Markdown
    // no significan nada y ensucian la edición.
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (markdown.length === 0) {
    avisos.add('No se encontró texto en el documento. Puede estar todo en imágenes o en cuadros de texto.')
  }

  return { markdown, avisos: [...avisos] }
}

// ═══════════════════════════════════════════════════════════════ párrafos ══

function parrafoAMarkdown(xml: string, avisos: Set<string>): string | null {
  const texto = textoDeCorridas(xml, avisos)

  const propiedades = xml.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/)?.[1] ?? ''
  const nivel = nivelDeTitulo(propiedades)
  const enLista = /<w:numPr[\s>]/.test(propiedades)

  if (texto.trim().length === 0) {
    // Un párrafo vacío que además es un título no existe; uno normal es un
    // salto, y ya lo pone el `join` de arriba.
    return null
  }

  if (nivel > 0) return `${'#'.repeat(Math.min(nivel, 6))} ${texto.trim()}`

  if (enLista) {
    const sangria = Number(propiedades.match(/<w:ilvl\s+w:val="(\d+)"/)?.[1] ?? '0')
    return `${'  '.repeat(Math.min(sangria, 5))}- ${texto.trim()}`
  }

  return texto.trim()
}

/**
 * De qué nivel es un título.
 *
 * ⚠️ Se mira el estilo **y** el `outlineLvl`, y se aceptan los tres nombres que
 * aparecen en la práctica: `Heading1` (Word en inglés), `Ttulo1` (Word en
 * español, que se come el acento al generar el id) y `Titulo1`. Un manual de
 * calidad hecho en un Word en español entra por el segundo, y mirar sólo
 * `Heading` lo dejaría entero como texto plano — que es exactamente el
 * documento que peor se lee después.
 */
function nivelDeTitulo(propiedades: string): number {
  const estilo = propiedades.match(/<w:pStyle\s+w:val="([^"]+)"/)?.[1] ?? ''
  const porEstilo = estilo.match(/^(?:Heading|Ttulo|Titulo|heading)\s?(\d)$/i)?.[1]
  if (porEstilo) return Number(porEstilo)

  if (/^(?:Title|Ttulo|Titulo)$/i.test(estilo)) return 1

  const contorno = propiedades.match(/<w:outlineLvl\s+w:val="(\d+)"/)?.[1]
  if (contorno !== undefined) return Number(contorno) + 1

  return 0
}

/** El texto de un párrafo o de una celda, con su negrita y su cursiva. */
function textoDeCorridas(xml: string, avisos: Set<string>): string {
  let salida = ''

  for (const [corrida] of xml.matchAll(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g)) {
    const propiedades = corrida.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? ''
    // `<w:b/>` enciende; `<w:b w:val="0"/>` apaga. Sin la segunda mitad, un
    // documento con la negrita desactivada explícitamente sale entero en negrita.
    const negrita = /<w:b\s*\/>|<w:b\s+w:val="(?:1|true|on)"/.test(propiedades)
    const cursiva = /<w:i\s*\/>|<w:i\s+w:val="(?:1|true|on)"/.test(propiedades)

    let trozo = ''
    for (const [, contenido] of corrida.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) {
      trozo += desescapar(contenido)
    }

    // Un tabulador dentro de un párrafo es sangría visual, no estructura.
    trozo = trozo.replace(/<w:tab\s*\/>/g, ' ')

    if (/<w:br\s*\/>/.test(corrida)) trozo += '  \n'

    if (trozo.length === 0) continue

    // El marcado no se aplica a los espacios de los bordes: `** texto **` no es
    // negrita en Markdown, es un asterisco literal.
    const izquierda = trozo.match(/^\s*/)?.[0] ?? ''
    const derecha = trozo.match(/\s*$/)?.[0] ?? ''
    const nucleo = trozo.slice(izquierda.length, trozo.length - derecha.length)

    if (nucleo.length === 0) {
      salida += trozo
      continue
    }

    let marcado = escapar(nucleo)
    if (cursiva) marcado = `*${marcado}*`
    if (negrita) marcado = `**${marcado}**`

    salida += izquierda + marcado + derecha
  }

  if (/<w:hyperlink[\s>]/.test(xml)) {
    avisos.add('Los hipervínculos se convirtieron a texto: el destino se queda en el archivo original.')
  }

  return salida
}

// ═════════════════════════════════════════════════════════════════ tablas ══

function tablaAMarkdown(xml: string, avisos: Set<string>): string | null {
  const filas: string[][] = []

  for (const [fila] of xml.matchAll(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g)) {
    const celdas: string[] = []
    for (const [celda] of fila.matchAll(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g)) {
      // La barra vertical parte una celda de Markdown en dos. Los saltos de
      // línea dentro de una celda tampoco existen en una tabla de Markdown.
      celdas.push(
        textoDeCorridas(celda, avisos).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim(),
      )
    }
    if (celdas.length > 0) filas.push(celdas)
  }

  if (filas.length === 0) return null

  if (/<w:gridSpan[\s>]|<w:vMerge[\s>]/.test(xml)) {
    avisos.add('Alguna tabla tiene celdas combinadas: en Markdown no existen y se separaron. Compara con el original antes de entregar.')
  }

  const columnas = Math.max(...filas.map((f) => f.length))
  const rellenar = (fila: string[]) =>
    `| ${[...fila, ...Array(columnas - fila.length).fill('')].join(' | ')} |`

  const [encabezado, ...resto] = filas

  return [
    rellenar(encabezado),
    `|${' --- |'.repeat(columnas)}`,
    ...resto.map(rellenar),
  ].join('\n')
}

// ═════════════════════════════════════════════════════════════════ texto ══

/** Las cinco entidades de XML, más las numéricas. */
function desescapar(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // El `&amp;` va al final: si fuera primero, `&amp;lt;` acabaría siendo `<`.
    .replace(/&amp;/g, '&')
}

/**
 * Lo que en Markdown significaría otra cosa.
 *
 * ⚠️ Deliberadamente corto. Escapar los doce caracteres del estándar deja un
 * texto lleno de barras invertidas que es peor de editar que el problema que
 * resuelve. Se escapan los tres que aparecen de verdad en un procedimiento:
 * asteriscos, guiones bajos y la barra invertida misma.
 */
function escapar(texto: string): string {
  return texto.replace(/([\\*_])/g, '\\$1')
}
