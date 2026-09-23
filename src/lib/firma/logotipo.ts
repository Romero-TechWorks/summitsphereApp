/**
 * El logotipo de la firma, INCRUSTADO en `config_firma.logotipo_url` [F06·B3].
 *
 * ⚠️ **Por qué una imagen incrustada y no un archivo en Storage.** El membrete
 * se imprime en la reunión de cierre, en la planta y sin señal. Un enlace a un
 * bucket no carga sin red —y los buckets de la app son privados, así que además
 * habría que firmarlo, y un enlace firmado caduca—. Un `data:` viaja dentro de
 * la fila que ya baja la precarga (`firma.identidad()`), y el informe sale con
 * logo en el sótano. Decisión del dueño, 23 sep 2026.
 *
 * El precio es el peso, y por eso se **reduce en el navegador** antes de
 * guardarlo: se imprime a 34 px de alto, así que 160 px bastan para que salga
 * nítido en papel, y el resultado se limita a `LIMITE_BYTES`. La fila la baja
 * cada teléfono de la firma.
 *
 * Todo se rasteriza a PNG —también un SVG—: un solo formato de salida, con
 * transparencia, y ningún SVG con sorpresas dentro de un documento imprimible.
 */

const ALTO_MAXIMO = 160
const ANCHO_MAXIMO = 640
/** ~200 KB de texto en base64. Un logotipo razonable a 160 px queda en 10–40. */
export const LIMITE_BYTES = 200_000

const TIPOS_ACEPTADOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export const ACEPTA_LOGOTIPO = TIPOS_ACEPTADOS.join(',')

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const img = new Image()
    img.onload = () => resolver(img)
    img.onerror = () => rechazar(new Error('El navegador no pudo leer esa imagen.'))
    img.src = url
  })
}

/**
 * Un `File` → `data:image/png;base64,…`, reducido.
 *
 * Lanza un `Error` con el motivo en español si el archivo no sirve: la pantalla
 * lo pinta tal cual.
 */
export async function logotipoIncrustado(archivo: File): Promise<string> {
  if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
    throw new Error('El logotipo tiene que ser PNG, JPG, WebP o SVG.')
  }

  const url = URL.createObjectURL(archivo)
  try {
    const img = await cargarImagen(url)
    const ancho0 = img.naturalWidth || img.width
    const alto0 = img.naturalHeight || img.height
    if (!ancho0 || !alto0) {
      throw new Error('La imagen no dice cuánto mide. Si es un SVG, expórtalo como PNG.')
    }

    const escala = Math.min(1, ALTO_MAXIMO / alto0, ANCHO_MAXIMO / ancho0)
    const ancho = Math.max(1, Math.round(ancho0 * escala))
    const alto = Math.max(1, Math.round(alto0 * escala))

    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const ctx = lienzo.getContext('2d')
    if (!ctx) throw new Error('Este navegador no deja procesar imágenes.')
    ctx.drawImage(img, 0, 0, ancho, alto)

    const datos = lienzo.toDataURL('image/png')
    if (datos.length > LIMITE_BYTES) {
      throw new Error(
        'El logotipo sigue pesando demasiado después de reducirlo. ' +
        'Prueba con una versión más simple o con menos colores.',
      )
    }
    return datos
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Si `logotipo_url` es una imagen incrustada (y no un enlace viejo). */
export function esIncrustado(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && valor.startsWith('data:image/')
}
