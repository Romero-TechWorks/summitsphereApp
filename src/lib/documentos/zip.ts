/**
 * Un lector de ZIP mínimo, para sacar **un archivo** de un `.docx`.
 *
 * ⚠️ **Sin librería, y es una decisión, no una omisión** (docs/03 §8.8.1): un
 * `.docx` es un ZIP con un XML dentro, y lo único que hace falta es sacar
 * `word/document.xml`. `jszip` son 100 KB minificados que un auditor descarga
 * en una nave industrial con media barra de señal, y la mitad de ese peso es
 * *escribir* ZIPs, que aquí no se hace nunca. Son ochenta líneas y el formato no
 * ha cambiado desde 1989.
 *
 * ⚠️ La descompresión la hace `DecompressionStream('deflate-raw')`, que es del
 * navegador. Existe en Chrome 80+, Firefox 113+ y Safari 16.4+. Si no está, se
 * dice con esas palabras en vez de dejar una pantalla colgada.
 */

const FIRMA_FIN_DIRECTORIO = 0x06054b50
const FIRMA_ENTRADA = 0x02014b50

export type EntradaZip = {
  nombre: string
  metodo: number
  comprimido: number
  descomprimido: number
  desplazamientoLocal: number
}

/**
 * El directorio central: qué archivos hay y dónde empieza cada uno.
 *
 * Se lee por el final a propósito. Recorrer las cabeceras locales desde el
 * principio parece más simple, pero un ZIP escrito en streaming las deja con el
 * tamaño en cero y el dato real en un descriptor **posterior** — y entonces no
 * hay forma de saber dónde termina un archivo sin descomprimirlo.
 */
export function leerDirectorio(datos: Uint8Array): EntradaZip[] {
  const vista = new DataView(datos.buffer, datos.byteOffset, datos.byteLength)

  // El registro de fin lleva un comentario de longitud variable al final, así
  // que su posición no es fija: se busca su firma hacia atrás. El comentario no
  // puede pasar de 65 535 bytes, de ahí el tope de la búsqueda.
  const minimo = Math.max(0, datos.length - 22 - 0xffff)
  let fin = -1
  for (let i = datos.length - 22; i >= minimo; i--) {
    if (vista.getUint32(i, true) === FIRMA_FIN_DIRECTORIO) {
      fin = i
      break
    }
  }

  if (fin < 0) {
    throw new Error('Este archivo no es un .docx válido: no tiene la estructura de un ZIP.')
  }

  const total = vista.getUint16(fin + 10, true)
  let cursor = vista.getUint32(fin + 16, true)
  const entradas: EntradaZip[] = []

  for (let i = 0; i < total; i++) {
    if (cursor + 46 > datos.length || vista.getUint32(cursor, true) !== FIRMA_ENTRADA) break

    const metodo = vista.getUint16(cursor + 10, true)
    const comprimido = vista.getUint32(cursor + 20, true)
    const descomprimido = vista.getUint32(cursor + 24, true)
    const largoNombre = vista.getUint16(cursor + 28, true)
    const largoExtra = vista.getUint16(cursor + 30, true)
    const largoComentario = vista.getUint16(cursor + 32, true)
    const desplazamientoLocal = vista.getUint32(cursor + 42, true)

    const nombre = new TextDecoder('utf-8').decode(
      datos.subarray(cursor + 46, cursor + 46 + largoNombre),
    )

    entradas.push({ nombre, metodo, comprimido, descomprimido, desplazamientoLocal })
    cursor += 46 + largoNombre + largoExtra + largoComentario
  }

  return entradas
}

/**
 * El contenido de una entrada, ya descomprimido.
 *
 * ⚠️ Los largos de nombre y de «extra» se releen de la cabecera LOCAL, no se
 * reutilizan los del directorio: **no tienen por qué coincidir**. Word escribe
 * campos extra distintos en cada sitio, y dar por buenos los del directorio
 * desplaza el inicio de los datos unos bytes y devuelve basura.
 */
export async function extraer(datos: Uint8Array, entrada: EntradaZip): Promise<Uint8Array> {
  const vista = new DataView(datos.buffer, datos.byteOffset, datos.byteLength)
  const base = entrada.desplazamientoLocal
  const largoNombre = vista.getUint16(base + 26, true)
  const largoExtra = vista.getUint16(base + 28, true)
  const inicio = base + 30 + largoNombre + largoExtra

  const crudo = datos.subarray(inicio, inicio + entrada.comprimido)

  // 0 = guardado tal cual. Word lo usa para lo ya comprimido (las imágenes).
  if (entrada.metodo === 0) return crudo

  if (entrada.metodo !== 8) {
    throw new Error(
      `Este .docx usa un método de compresión que la app no lee (${entrada.metodo}). ` +
      'Vuelve a guardarlo desde Word y súbelo otra vez.',
    )
  }

  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'Este navegador no puede descomprimir el archivo de Word. ' +
      'Actualízalo, o sube el documento en PDF.',
    )
  }

  // `deflate-raw` y no `deflate`: dentro de un ZIP los datos van sin la
  // cabecera de zlib. Con `deflate` esto falla con un error de checksum que no
  // dice nada sobre lo que pasó de verdad.
  const flujo = new Blob([crudo as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))

  return new Uint8Array(await new Response(flujo).arrayBuffer())
}

/** El texto de una entrada por su nombre. `null` si no está en el ZIP. */
export async function leerTexto(datos: Uint8Array, nombre: string): Promise<string | null> {
  const entrada = leerDirectorio(datos).find((e) => e.nombre === nombre)
  if (!entrada) return null

  return new TextDecoder('utf-8').decode(await extraer(datos, entrada))
}
