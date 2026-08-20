'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DESTINOS_BARRA_INFERIOR, estaActivo } from '@/lib/navegacion'

/**
 * Navegación del teléfono. **Cinco destinos, y no hay un sexto.**
 *
 * El buscador global y el asistente viven en la Navbar, no aquí. Los dominios
 * que no caben —Sistemas, Capacitación, Admin— se alcanzan desde el buscador.
 *
 * ⚠️ El alto sale de `--bottom-nav-total`, que incluye el área segura del notch
 * o de la barra de gestos. Poner `height: 64px` y encima
 * `padding-bottom: env(safe-area-inset-bottom)` deja el contenido en 30px en un
 * teléfono con indicador de gestos y los iconos salen cortados por la mitad.
 * Es un bug que ya ocurrió.
 */
export default function BottomNav() {
  const ruta = usePathname()

  return (
    <nav
      aria-label="Navegación principal"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        height: 'var(--bottom-nav-total)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'var(--nav-fondo)',
        borderTop: '1px solid var(--navy-medio)',
        display: 'flex',
      }}
    >
      {DESTINOS_BARRA_INFERIOR.map(({ href, etiquetaCorta, etiqueta, Icono }) => {
        const activo = estaActivo(href, ruta)
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? 'page' : undefined}
            // La etiqueta visible se recorta a ~7 caracteres para que quepa;
            // el nombre accesible es el completo.
            aria-label={etiqueta}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              color: activo ? 'var(--nav-activo)' : 'var(--nav-texto-dim)',
            }}
          >
            <Icono size={21} />
            <span style={{ fontSize: 10.5, fontWeight: activo ? 600 : 500, letterSpacing: '.02em' }}>
              {etiquetaCorta}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
