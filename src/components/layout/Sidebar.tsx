'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DESTINOS, estaActivo } from '@/lib/navegacion'
import Logo from '@/components/ui/Logo'

export const ANCHO_SIDEBAR = 220

/**
 * Navegación de escritorio. En móvil no se monta: ahí la navegación es la
 * `BottomNav`, y un cajón lateral que hay que abrir con dos toques no compite
 * con cinco destinos siempre visibles.
 *
 * Va en navy, igual que la navegación de la web de Summit. El contenido va
 * claro. Es el mismo contraste que ya tiene la marca.
 */
export default function Sidebar() {
  const ruta = usePathname()

  return (
    <nav
      aria-label="Navegación principal"
      style={{
        width: ANCHO_SIDEBAR,
        height: '100%',
        background: 'var(--nav-fondo)',
        borderRight: '1px solid var(--navy-medio)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '18px 16px',
          textDecoration: 'none',
          borderBottom: '1px solid var(--navy-medio)',
        }}
      >
        <Logo size={30} sobre="navy" />
        <span
          className="display"
          style={{ fontSize: 24, color: 'var(--nav-texto)', lineHeight: 1 }}
        >
          Summit
        </span>
      </Link>

      <ul style={{ listStyle: 'none', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {DESTINOS.map(({ href, etiqueta, Icono }) => {
          const activo = estaActivo(href, ruta)
          return (
            <li key={href}>
              <Link
                href={href}
                // Lo que marca la página actual para un lector de pantalla. El
                // color no le dice nada a quien no ve la pantalla.
                aria-current={activo ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: activo ? 600 : 400,
                  color: activo ? 'var(--nav-activo)' : 'var(--nav-texto-dim)',
                  background: activo ? 'var(--nav-fondo-2)' : 'transparent',
                }}
              >
                <Icono size={18} />
                {etiqueta}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
