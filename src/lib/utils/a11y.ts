/**
 * Helpers de accesibilidad.
 *
 * Para casi todo, un `<button>` real. Esto es para el caso en que un contenedor
 * hace de botón pero anida otros controles dentro —un acordeón con un menú de
 * acciones adentro—, donde un `<button>` sería HTML inválido y el navegador
 * dejaría de responder al control interno.
 */

import type { KeyboardEvent } from 'react'

/**
 * Convierte un `div` en algo operable con teclado y anunciable por un lector de
 * pantalla. Devuelve las props que hay que esparcir sobre el elemento.
 *
 * @param alActivar  Qué hacer al clic, Enter o Espacio.
 * @param etiqueta   Texto que anuncia el lector de pantalla. Obligatorio: un
 *                   control sin nombre accesible es un control invisible.
 * @param expandido  Para acordeones y desplegables. Omitir si no aplica.
 */
export function clickableProps(
  alActivar: () => void,
  etiqueta: string,
  expandido?: boolean,
) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': etiqueta,
    ...(expandido === undefined ? {} : { 'aria-expanded': expandido }),
    onClick: alActivar,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      // Espacio scrollea la página por defecto; Enter envía formularios.
      e.preventDefault()
      // Sin esto, activar el contenedor también activa al padre si hay dos
      // anidados — pasa en las listas de ítems de auditoría.
      e.stopPropagation()
      alActivar()
    },
  }
}
