'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { getAppScroller } from '@/lib/utils/appScroll'
import { useEsMovil } from '@/lib/utils/useEsMovil'
import { IconoCerrar } from './Iconos'

/** Lo que puede recibir el foco dentro del diálogo. */
const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * El diálogo: dar de alta un sitio, editar un contacto, confirmar una anulación.
 *
 * En escritorio va centrado; en el teléfono sube desde abajo como hoja, que es
 * donde alcanza el pulgar.
 *
 * ⚠️ **Un modal SÍ lleva superficie, y no contradice "sin contenedores"**: es
 * una capa por encima de la pantalla, no una caja dentro de ella. Lo que hay
 * dentro sigue las reglas de siempre — nada de tarjetas anidadas.
 *
 * Cuatro cosas del armazón fijo que aquí se rompen solas si no se cuidan
 * (CLAUDE.md regla 4):
 *
 *  1. **`calc(var(--vh-full) * 0.9)`, nunca `90vh`.** Con el armazón, la barra
 *     del navegador móvil ya nunca se pliega, así que `100vh` es
 *     permanentemente más alto que lo que se ve y el pie del modal queda
 *     debajo del borde de la pantalla.
 *  2. **`minHeight: 0` en el cuerpo**, o el `overflow` no llega a activarse y
 *     un formulario largo desborda el diálogo entero.
 *  3. **El fondo que se bloquea es el scroller de la app**, no `document.body`:
 *     el documento no scrollea nunca aquí (`appScroll.ts`).
 *  4. **El área segura del teléfono** en el pie, o el botón de guardar queda
 *     debajo de la barra de gestos.
 */
export default function Modal({
  abierto,
  alCerrar,
  titulo,
  children,
  pie,
  ancho = 520,
}: {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  children: ReactNode
  /** Los botones de abajo. Se quedan fijos mientras el cuerpo scrollea. */
  pie?: ReactNode
  ancho?: number
}) {
  const esMovil = useEsMovil()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return

    // A dónde vuelve el foco al cerrar: al botón que abrió el diálogo. Sin
    // esto, quien navega con teclado vuelve al principio de la página.
    const veniaDe = document.activeElement as HTMLElement | null
    panel.current?.focus()

    const scroller = getAppScroller()
    const overflowPrevio = scroller?.style.overflow ?? ''
    if (scroller) scroller.style.overflow = 'hidden'

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.stopPropagation()
        alCerrar()
        return
      }

      // El foco no se sale del diálogo: sin esto, tabular lleva al formulario de
      // atrás, que está tapado y sigue siendo editable.
      if (evento.key !== 'Tab' || !panel.current) return

      const enfocables = Array.from(panel.current.querySelectorAll<HTMLElement>(ENFOCABLES))
      if (enfocables.length === 0) return

      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alTeclear)

    return () => {
      document.removeEventListener('keydown', alTeclear)
      if (scroller) scroller.style.overflow = overflowPrevio
      veniaDe?.focus?.()
    }
  }, [abierto, alCerrar])

  if (!abierto) return null

  return (
    <div
      // `onMouseDown` y no `onClick`: un arrastre que empieza dentro del panel
      // —seleccionando texto— y termina fuera cerraría el diálogo a media
      // captura y con ella lo escrito.
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) alCerrar()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(13, 31, 53, .45)',
        display: 'flex',
        alignItems: esMovil ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: esMovil ? 0 : 24,
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        style={{
          width: esMovil ? '100%' : Math.min(ancho, 720),
          maxWidth: '100%',
          maxHeight: 'calc(var(--vh-full) * 0.9)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--superficie)',
          borderRadius: esMovil ? '14px 14px 0 0' : 10,
          boxShadow: '0 18px 48px rgba(13, 31, 53, .28)',
          outline: 'none',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid var(--borde)',
          }}
        >
          <h3 style={{ fontSize: 20, fontWeight: 600, minWidth: 0 }}>{titulo}</h3>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              marginRight: -6,
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              color: 'var(--texto-dim)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <IconoCerrar size={18} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }}>{children}</div>

        {pie && (
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '12px 16px',
              paddingBottom: esMovil ? 'calc(12px + env(safe-area-inset-bottom, 0px))' : 12,
              borderTop: '1px solid var(--borde)',
            }}
          >
            {pie}
          </div>
        )}
      </div>
    </div>
  )
}
