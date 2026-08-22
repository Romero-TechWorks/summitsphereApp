/**
 * Markdown → bloques, para leerlo con formato dentro de la app [F02·B2].
 *
 * ⚠️ **Devuelve estructura, no HTML, y eso es una decisión de seguridad.** Este
 * texto viene del documento de un cliente: de un `.docx` que mandó por correo,
 * de un PDF que alguien descargó. Un conversor que produjera una cadena de HTML
 * obligaría a pintarla con `dangerouslySetInnerHTML`, y bastaría un
 * `<img onerror=…>` dentro del manual de calidad de un cliente para ejecutar
 * código en la sesión de un consultor que ve los expedientes de *todos* los
 * clientes. Lo que sale de aquí lo pinta React como texto (§8.6, docs/08).
 *
 * ⚠️ Es un subconjunto a propósito: títulos, párrafos, listas, tablas, citas,
 * separadores y bloques de código, con negrita, cursiva y `code` en línea. Es lo
 * que produce el conversor de `.docx` y lo que un consultor escribe a mano. No
 * pretende ser CommonMark.
 */

export type Inline =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'fuerte'; texto: string }
  | { tipo: 'enfasis'; texto: string }
  | { tipo: 'codigo'; texto: string }

export type Bloque =
  | { tipo: 'titulo'; nivel: number; contenido: Inline[] }
  | { tipo: 'parrafo'; contenido: Inline[] }
  | { tipo: 'lista'; ordenada: boolean; elementos: { sangria: number; contenido: Inline[] }[] }
  | { tipo: 'cita'; contenido: Inline[] }
  | { tipo: 'tabla'; encabezado: Inline[][]; filas: Inline[][][] }
  | { tipo: 'codigo'; texto: string }
  | { tipo: 'separador' }

export function analizarMarkdown(fuente: string): Bloque[] {
  const lineas = fuente.replace(/\r\n?/g, '\n').split('\n')
  const bloques: Bloque[] = []
  let i = 0

  while (i < lineas.length) {
    const linea = lineas[i]

    if (linea.trim().length === 0) {
      i++
      continue
    }

    // ``` … ``` — el contenido va tal cual, sin analizar nada de dentro.
    if (/^\s*```/.test(linea)) {
      const cuerpo: string[] = []
      i++
      while (i < lineas.length && !/^\s*```/.test(lineas[i])) {
        cuerpo.push(lineas[i])
        i++
      }
      i++
      bloques.push({ tipo: 'codigo', texto: cuerpo.join('\n') })
      continue
    }

    if (/^\s*(?:---|\*\*\*|___)\s*$/.test(linea)) {
      bloques.push({ tipo: 'separador' })
      i++
      continue
    }

    const titulo = linea.match(/^(#{1,6})\s+(.*)$/)
    if (titulo) {
      bloques.push({
        tipo: 'titulo',
        nivel: titulo[1].length,
        contenido: analizarLinea(titulo[2].trim()),
      })
      i++
      continue
    }

    // Una tabla necesita su fila de guiones debajo; sin ella, esa línea es un
    // párrafo que empieza con una barra.
    if (linea.trim().startsWith('|') && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lineas[i + 1] ?? '')) {
      const encabezado = celdas(linea)
      const filas: Inline[][][] = []
      i += 2
      while (i < lineas.length && lineas[i].trim().startsWith('|')) {
        filas.push(celdas(lineas[i]))
        i++
      }
      bloques.push({ tipo: 'tabla', encabezado, filas })
      continue
    }

    if (/^\s*>\s?/.test(linea)) {
      const cuerpo: string[] = []
      while (i < lineas.length && /^\s*>\s?/.test(lineas[i])) {
        cuerpo.push(lineas[i].replace(/^\s*>\s?/, ''))
        i++
      }
      bloques.push({ tipo: 'cita', contenido: analizarLinea(cuerpo.join(' ')) })
      continue
    }

    const elemento = linea.match(/^(\s*)(?:([-*+])|(\d+)[.)])\s+(.*)$/)
    if (elemento) {
      const ordenada = elemento[2] === undefined
      const elementos: { sangria: number; contenido: Inline[] }[] = []

      while (i < lineas.length) {
        const siguiente = lineas[i].match(/^(\s*)(?:([-*+])|(\d+)[.)])\s+(.*)$/)
        // Una lista numerada y una de viñetas seguidas son dos listas, no una:
        // se corta al cambiar el tipo de marca.
        if (!siguiente || (siguiente[2] === undefined) !== ordenada) break

        elementos.push({
          sangria: Math.floor(siguiente[1].length / 2),
          contenido: analizarLinea(siguiente[4].trim()),
        })
        i++
      }

      bloques.push({ tipo: 'lista', ordenada, elementos })
      continue
    }

    // Un párrafo: hasta la línea en blanco o hasta lo que empiece otro bloque.
    const cuerpo: string[] = []
    while (i < lineas.length && lineas[i].trim().length > 0) {
      if (/^(#{1,6})\s|^\s*>|^\s*```|^\s*(?:---|\*\*\*|___)\s*$/.test(lineas[i])) break
      if (/^(\s*)(?:[-*+]|\d+[.)])\s+/.test(lineas[i]) && cuerpo.length > 0) break
      cuerpo.push(lineas[i].trim())
      i++
    }

    if (cuerpo.length > 0) {
      bloques.push({ tipo: 'parrafo', contenido: analizarLinea(cuerpo.join(' ')) })
    } else {
      // Salvaguarda: sin esto, una línea que casa un inicio de bloque y no lo
      // consume dejaría el `while` de fuera girando para siempre y colgaría la
      // pestaña con el documento del cliente en pantalla.
      i++
    }
  }

  return bloques
}

function celdas(linea: string): Inline[][] {
  return linea
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    // La barra escapada es contenido de la celda, no un separador.
    .split(/(?<!\\)\|/)
    .map((celda) => analizarLinea(celda.replace(/\\\|/g, '|').trim()))
}

/**
 * Negrita, cursiva y código dentro de una línea.
 *
 * Un solo recorrido con una alternancia: `**` antes que `*` para que la negrita
 * gane, y el código en `` ` `` primero de todos porque dentro no se marca nada.
 */
export function analizarLinea(texto: string): Inline[] {
  const partes: Inline[] = []
  const patron = /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/g
  let ultimo = 0

  for (const coincidencia of texto.matchAll(patron)) {
    const indice = coincidencia.index ?? 0
    if (indice > ultimo) {
      partes.push({ tipo: 'texto', texto: desescapar(texto.slice(ultimo, indice)) })
    }

    if (coincidencia[1] !== undefined) partes.push({ tipo: 'codigo', texto: coincidencia[1] })
    else if (coincidencia[2] !== undefined) partes.push({ tipo: 'fuerte', texto: desescapar(coincidencia[2]) })
    else if (coincidencia[3] !== undefined) partes.push({ tipo: 'fuerte', texto: desescapar(coincidencia[3]) })
    else if (coincidencia[4] !== undefined) partes.push({ tipo: 'enfasis', texto: desescapar(coincidencia[4]) })
    else if (coincidencia[5] !== undefined) partes.push({ tipo: 'enfasis', texto: desescapar(coincidencia[5]) })

    ultimo = indice + coincidencia[0].length
  }

  if (ultimo < texto.length) {
    partes.push({ tipo: 'texto', texto: desescapar(texto.slice(ultimo)) })
  }

  return partes
}

/** Deshace lo que escapó el conversor de `.docx`. */
function desescapar(texto: string): string {
  return texto.replace(/\\([\\*_|`#[\]])/g, '$1')
}

/**
 * Un resumen de una línea, para la ficha de una versión en la lista.
 *
 * Se queda con el primer párrafo de verdad: un documento que empieza con su
 * título en `#` diría lo mismo que la columna de al lado.
 */
export function primeraLinea(markdown: string | null, largo = 120): string | null {
  if (!markdown) return null

  for (const linea of markdown.split('\n')) {
    const limpia = linea.replace(/^[#>\-*\s]+/, '').trim()
    if (limpia.length > 0) {
      return limpia.length > largo ? `${limpia.slice(0, largo)}…` : limpia
    }
  }

  return null
}
