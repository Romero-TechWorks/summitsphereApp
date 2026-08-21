/**
 * El analizador del catálogo de normas [F01·B2b].
 *
 * **El catálogo de Summit no vive en este repositorio.** Se escribe en un
 * archivo `.md`, se sube desde la aplicación y se indexa en `normas` y
 * `norma_clausulas`. Dos razones, y las dos pesan:
 *
 * 1. **Regla 12 de CLAUDE.md.** El resumen de cada cláusula es el criterio
 *    técnico de la firma —y el texto de la norma es obra protegida—. Que el
 *    catálogo entre por un archivo que el dueño sube, y no por un `INSERT` del
 *    código, es lo que mantiene todo eso fuera de Git.
 * 2. **Corregir una errata no puede exigir un despliegue.** El socio edita su
 *    `.md`, lo vuelve a subir, y el importador hace `upsert`: no duplica nada.
 *
 * ⚠️ Sin dependencias y **determinista**: el mismo archivo produce siempre el
 * mismo resultado. Nada de heurísticas — si una línea no encaja en el formato,
 * se avisa y se sigue; no se adivina.
 */

/** Una cláusula tal como venía escrita en el archivo. */
export type ClausulaAnalizada = {
  numero: string
  titulo: string
  /** El resumen redactado por Summit. ⚠️ NUNCA el texto de la norma. */
  resumen: string | null
  auditable: boolean
  /** El orden en que aparece en el archivo: `10.3` no va después de `2.1`. */
  orden: number
  /** El número de la cláusula padre, si el árbol lo tiene. `8.5.1` → `8.5`. */
  padre: string | null
}

export type NormaAnalizada = {
  /** Se deriva del nombre: `ISO 9001` → `iso_9001`. Es la identidad de la fila. */
  clave: string
  nombre: string
  version: string | null
  titulo: string | null
  clausulas: ClausulaAnalizada[]
}

export type Analisis = {
  normas: NormaAnalizada[]
  /** Lo que se ignoró y por qué. Se enseña, no se esconde. */
  avisos: string[]
  /** Lo que impide importar. Con uno solo, no se escribe nada. */
  errores: string[]
}

/** Separador entre el nombre y el título de una norma: guion largo, corto o medio. */
const SEPARADOR = /\s+[—–-]\s+/
const ENCABEZADO = /^(#{1,6})\s+(.*)$/
const NUMERO_CLAUSULA = /^(\d+(?:\.\d+)*)\s+(.+)$/
const MARCA_NO_AUDITABLE = /\[\s*no\s+auditable\s*\]/i
const COMENTARIO_UNA_LINEA = /^<!--.*-->$/
const ABRE_COMENTARIO = /<!--/
const CIERRA_COMENTARIO = /-->/

/**
 * La clave de una norma, derivada de su nombre.
 *
 * ⚠️ **El nombre es la identidad.** `ISO 9001` → `iso_9001`, y ese es el valor
 * por el que el importador reconoce que la norma ya existe. Cambiar el *título*
 * en el archivo actualiza la fila; cambiar el *nombre* crea una norma nueva y
 * deja la vieja donde estaba. Está escrito así a propósito: es preferible una
 * norma duplicada y visible a que un cambio de nombre reescriba en silencio la
 * norma que ya citan cien hallazgos.
 */
export function claveDeNorma(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** El padre de un número de cláusula: `8.5.1` → `8.5`; `8` → `null`. */
function padreDe(numero: string): string | null {
  const partes = numero.split('.')
  if (partes.length <= 1) return null
  return partes.slice(0, -1).join('.')
}

/**
 * Lee el archivo del catálogo.
 *
 * Formato, y no hay más:
 *
 * ```md
 * # ISO 9001:2015 — Sistemas de gestión de la calidad
 *
 * ## 4 Contexto de la organización
 * El resumen de Summit sobre este capítulo.
 *
 * ### 4.1 Comprensión de la organización y de su contexto
 * El resumen de Summit sobre esta cláusula.
 *
 * ## 2 Referencias normativas [no auditable]
 * ```
 *
 * - `#` abre una norma. `##` en adelante, una cláusula.
 * - **El árbol lo arma el NÚMERO, no la profundidad del encabezado**: el padre
 *   de `8.5.1` es `8.5` aunque estén los dos en `##`. Es lo que hace que un
 *   archivo escrito a mano, con niveles inconsistentes, siga saliendo bien.
 * - El texto suelto bajo un encabezado es su resumen.
 * - `[no auditable]` en el título marca lo que no se audita —los capítulos 1, 2
 *   y 3 de una ISO— y no se puede citar en un hallazgo.
 */
export function analizarCatalogo(texto: string): Analisis {
  const normas: NormaAnalizada[] = []
  const avisos: string[] = []
  const errores: string[] = []

  let normaActual: NormaAnalizada | null = null
  let clausulaActual: ClausulaAnalizada | null = null
  let resumen: string[] = []
  let numeros = new Set<string>()
  let orden = 0
  let dentroDeComentario = false
  // Un preámbulo de veinte líneas no son veinte avisos: se avisa una vez por
  // bloque. Un aviso repetido deja de leerse, igual que un indicador que
  // parpadea siempre.
  let yaAvisadoDeTextoSuelto = false

  /**
   * Cierra el resumen que se venía acumulando y lo pega en su cláusula.
   *
   * ⚠️ Un párrafo suelto **bajo una norma** (no bajo una cláusula) no se guarda
   * en ningún sitio: `normas` sólo tiene `titulo`, y meterle ahí tres párrafos
   * de introducción daría una fila con un título de mil caracteres que después
   * aparece en cada selector de alcance. Se avisa y se ignora.
   */
  function cerrarResumen(numeroLinea: number) {
    const texto = resumen.join('\n').trim()
    resumen = []
    if (!texto) return

    if (clausulaActual) {
      clausulaActual.resumen = texto
      return
    }

    if (normaActual) {
      avisos.push(
        `Línea ${numeroLinea}: texto bajo «${normaActual.nombre}» sin cláusula, ignorado. ` +
        `El título de la norma va en la misma línea, después del guion largo.`,
      )
    }
  }

  const lineas = texto.replace(/\r\n?/g, '\n').split('\n')

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i]
    const numeroLinea = i + 1

    const recortada = linea.trim()

    // ⚠️ Los comentarios de varias líneas se saltan enteros. La propia plantilla
    // que reparte esta pantalla empieza con uno, así que sin esto el archivo de
    // ejemplo llegaba con siete avisos de "texto fuera de toda norma" — y un
    // importador que se queja de su propia plantilla enseña a ignorar los
    // avisos, que son justo lo que hay que leer.
    if (dentroDeComentario) {
      if (CIERRA_COMENTARIO.test(recortada)) dentroDeComentario = false
      continue
    }
    if (COMENTARIO_UNA_LINEA.test(recortada)) continue
    if (ABRE_COMENTARIO.test(recortada) && !CIERRA_COMENTARIO.test(recortada)) {
      dentroDeComentario = true
      continue
    }

    const encabezado = ENCABEZADO.exec(linea)

    if (!encabezado) {
      if (!normaActual) {
        // Texto antes de la primera norma: la portada del archivo, o una nota.
        if (recortada && !yaAvisadoDeTextoSuelto) {
          avisos.push(`Línea ${numeroLinea}: texto antes de la primera norma, ignorado.`)
          yaAvisadoDeTextoSuelto = true
        }
        continue
      }
      resumen.push(linea)
      continue
    }

    yaAvisadoDeTextoSuelto = false

    cerrarResumen(numeroLinea)

    const nivel = encabezado[1].length
    const contenido = encabezado[2].trim()

    if (nivel === 1) {
      const [izquierda, ...resto] = contenido.split(SEPARADOR)
      const titulo = resto.join(' — ').trim()
      const [nombreCrudo, versionCruda] = izquierda.split(':')
      const nombre = (nombreCrudo ?? '').trim()

      if (!nombre) {
        errores.push(`Línea ${numeroLinea}: una norma sin nombre.`)
        normaActual = null
        clausulaActual = null
        continue
      }

      const clave = claveDeNorma(nombre)
      if (normas.some((n) => n.clave === clave)) {
        errores.push(
          `Línea ${numeroLinea}: «${nombre}» aparece dos veces en el archivo. ` +
          `Las dos escribirían la misma fila y una se comería a la otra.`,
        )
      }

      normaActual = {
        clave,
        nombre,
        version: versionCruda?.trim() || null,
        titulo: titulo || null,
        clausulas: [],
      }
      normas.push(normaActual)
      clausulaActual = null
      numeros = new Set()
      orden = 0
      continue
    }

    // Cláusula.
    if (!normaActual) {
      avisos.push(`Línea ${numeroLinea}: cláusula antes de la primera norma, ignorada.`)
      continue
    }

    const auditable = !MARCA_NO_AUDITABLE.test(contenido)
    const limpio = contenido.replace(MARCA_NO_AUDITABLE, '').trim()
    const partes = NUMERO_CLAUSULA.exec(limpio)

    if (!partes) {
      avisos.push(
        `Línea ${numeroLinea}: «${limpio}» no empieza con un número de cláusula, ignorada.`,
      )
      clausulaActual = null
      continue
    }

    const [, numero, titulo] = partes

    if (numeros.has(numero)) {
      errores.push(
        `Línea ${numeroLinea}: la cláusula ${numero} de ${normaActual.nombre} está repetida.`,
      )
      clausulaActual = null
      continue
    }
    numeros.add(numero)

    clausulaActual = {
      numero,
      titulo: titulo.trim(),
      resumen: null,
      auditable,
      orden: orden++,
      padre: padreDe(numero),
    }
    normaActual.clausulas.push(clausulaActual)
  }

  cerrarResumen(lineas.length)

  if (normas.length === 0 && errores.length === 0) {
    errores.push(
      'El archivo no tiene ninguna norma. Cada norma empieza con una línea ' +
      '«# ISO 9001:2015 — Título».',
    )
  }

  // ⚠️ Un padre que no está en el archivo NO es un error: se cuelga de la raíz.
  // Un catálogo puede traer sólo `8.5.1` sin traer `8.5`, y romper la
  // importación entera por eso sería peor que dejar la cláusula en el primer
  // nivel — donde además se ve, y se corrige.
  for (const norma of normas) {
    const presentes = new Set(norma.clausulas.map((c) => c.numero))
    for (const clausula of norma.clausulas) {
      if (clausula.padre && !presentes.has(clausula.padre)) {
        avisos.push(
          `${norma.nombre}: la cláusula ${clausula.numero} no tiene a ${clausula.padre} ` +
          `en el archivo; queda en el primer nivel.`,
        )
        clausula.padre = null
      }
    }
  }

  return { normas, avisos, errores }
}

/**
 * La plantilla que se descarga desde la pantalla.
 *
 * ⚠️ **Sin una sola línea del texto de ninguna norma.** Los resúmenes de aquí
 * son instrucciones para quien la llene, no contenido normativo (regla 12).
 */
export const PLANTILLA_MD = `<!--
  Catálogo de normas de Summit-Sphere.

  Este archivo NO va al repositorio: se sube desde la aplicación, en Sistemas.
  Súbelo las veces que haga falta — corregir es volver a subirlo, no se duplica.

  ⚠️ El resumen de cada cláusula lo redacta Summit. NO se copia el texto de la
  norma: es obra protegida y la firma la tiene bajo licencia.
-->

# ISO 9001:2015 — Sistemas de gestión de la calidad

## 1 Objeto y campo de aplicación [no auditable]

## 2 Referencias normativas [no auditable]

## 3 Términos y definiciones [no auditable]

## 4 Contexto de la organización
Aquí va el resumen de Summit sobre el capítulo: qué pide, en el lenguaje con el
que la firma se lo explica a un cliente.

### 4.1 Comprensión de la organización y de su contexto
El resumen de esta cláusula. Una o dos frases bastan: es lo que va a aparecer en
cada lista de verificación y en cada hallazgo que la cite.

### 4.2 Comprensión de las necesidades y expectativas de las partes interesadas

# ISO 45001:2018 — Sistemas de gestión de la seguridad y salud en el trabajo

## 4 Contexto de la organización
`
