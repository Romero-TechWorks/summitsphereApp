/**
 * El contenedor con scroll de la aplicación (docs/03_ARQUITECTURA.md §8).
 *
 * Desde el armazón fijo, **el documento no scrollea nunca**: el marco —sidebar,
 * navbar y barra inferior— mide exactamente la ventana y quien se mueve es un
 * `div` intermedio. Eso es lo que impide que el navegador móvil recoja y
 * despliegue su propia barra de URL, que era la causa de que el header y la
 * barra inferior "se metieran a la mitad" al scrollear.
 *
 * ⚠️ La consecuencia es que **todo lo que hablaría con `window` tiene que hablar
 * con este elemento**: devolver el scroll arriba al navegar, bloquear el fondo
 * mientras hay un modal abierto, o llevar la vista a un ancla. Si algo llama a
 * `window.scrollTo()` dentro del dashboard, no hace nada — y no avisa.
 */

/** `id` del contenedor con scroll. Lo pone `app/(dashboard)/layout.tsx`. */
export const APP_SCROLL_ID = 'app-scroll'

/**
 * El contenedor con scroll, o `null` fuera del dashboard —login y portal del
 * cliente son documentos normales y sí scrollean solos— y en el servidor.
 */
export function getAppScroller(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById(APP_SCROLL_ID)
}

/** Lleva el scroll de la app al inicio. Sustituye a `window.scrollTo(0, 0)`. */
export function scrollAlInicio(comportamiento: ScrollBehavior = 'auto'): void {
  getAppScroller()?.scrollTo({ top: 0, behavior: comportamiento })
}

/**
 * Lleva a la vista un elemento dentro del scroller de la app.
 *
 * `element.scrollIntoView()` funciona, pero en un contenedor recortado el
 * navegador también mueve el documento si encuentra un ancestro scrollable —y
 * el documento no debe moverse—. Esto calcula el desplazamiento a mano.
 *
 * @param margen Píxeles de aire por encima del elemento. Por defecto deja el
 *               alto de la navbar para que el objetivo no quede debajo de ella.
 */
export function scrollHasta(elemento: HTMLElement | null, margen = 72): void {
  const scroller = getAppScroller()
  if (!elemento || !scroller) return

  const destino =
    elemento.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop -
    margen

  scroller.scrollTo({ top: Math.max(0, destino), behavior: 'smooth' })
}
