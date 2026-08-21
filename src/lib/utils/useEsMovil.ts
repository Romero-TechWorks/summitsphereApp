'use client'

import { useEffect, useState } from 'react'

/** El corte entre teléfono y escritorio. El mismo que usa `globals.css`. */
export const CORTE_MOVIL = 768

/**
 * Si la ventana es de teléfono.
 *
 * **Responsive por estado de React, no por media queries** (CLAUDE.md regla 4):
 * el armazón monta componentes distintos —Sidebar o BottomNav—, no los mismos
 * con otro CSS, y eso una media query no lo puede decidir.
 *
 * ⚠️ Arranca en `true` a propósito, igual que el layout: el servidor no conoce
 * el ancho de la ventana, así que el primer render tiene que ser idéntico en
 * los dos lados o React marca un error de hidratación. Se asume móvil porque es
 * donde trabaja el auditor.
 *
 * ⚠️ Vive aquí y no repetido en cada componente porque el corte tiene que ser
 * uno solo: el día que 768 se mueva, el layout y el modal tienen que moverse a
 * la vez o el modal se abre como hoja inferior con la barra de abajo montada.
 */
export function useEsMovil(): boolean {
  const [esMovil, setEsMovil] = useState(true)

  useEffect(() => {
    function medir() {
      setEsMovil(window.innerWidth < CORTE_MOVIL)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  return esMovil
}
