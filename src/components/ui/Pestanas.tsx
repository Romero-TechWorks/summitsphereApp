'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export type Pestana = {
  /** Lo que va en `?tab=`. En español y sin acentos: `organizaciones`. */
  clave: string
  etiqueta: string
}

/**
 * Las pestañas de un dominio.
 *
 * **Los siete dominios son páginas con pestañas, no carpetas por entidad**
 * (docs/03_ARQUITECTURA.md §2.1): se navega con query string
 * —`/cartera?tab=proyectos`— y agregar una sección es una pestaña más aquí, no
 * una ruta nueva.
 *
 * ⚠️ Son `<Link>` de verdad, no botones: la pestaña queda en la URL, se puede
 * mandar por correo, abrir en otra pestaña del navegador y volver con el botón
 * de atrás. `ScrollReset` ya devuelve el scroll arriba al cambiar el query
 * string, así que va con `scroll={false}` — en esta app quien scrollea no es el
 * documento.
 *
 * ⚠️ **Quien use `usePestana` o este componente tiene que estar dentro de un
 * `<Suspense>`**: los dos leen `useSearchParams()`, y sin un límite de suspense
 * Next no puede prerenderizar la ruta y **el build falla**. Es el mismo motivo
 * por el que `ScrollReset` va envuelto en el layout.
 */
export default function Pestanas({ pestanas }: { pestanas: readonly Pestana[] }) {
  const ruta = usePathname()
  const activa = usePestana(pestanas)

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        gap: 20,
        overflowX: 'auto',
        marginBottom: 18,
        // La misma hairline del tablero, corriendo por debajo de todas.
        borderBottom: '2px solid rgba(61, 186, 78, .16)',
      }}
    >
      {pestanas.map((pestana) => (
        <Enlace
          key={pestana.clave}
          href={`${ruta}?tab=${pestana.clave}`}
          etiqueta={pestana.etiqueta}
          activa={pestana.clave === activa}
        />
      ))}
    </div>
  )
}

function Enlace({
  href,
  etiqueta,
  activa,
}: {
  href: string
  etiqueta: string
  activa: boolean
}) {
  const [encima, setEncima] = useState(false)

  return (
    <Link
      href={href}
      scroll={false}
      aria-current={activa ? 'page' : undefined}
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      style={{
        position: 'relative',
        flexShrink: 0,
        padding: '9px 2px',
        marginBottom: -2,
        fontSize: 14,
        fontWeight: activa ? 600 : 500,
        color: activa ? 'var(--texto)' : 'var(--texto-dim)',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {etiqueta}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          borderRadius: 2,
          background: activa
            ? 'linear-gradient(90deg, var(--verde-hondo) 0%, var(--verde) 100%)'
            : encima
              ? 'rgba(61, 186, 78, .45)'
              : 'transparent',
          transition: 'background .18s ease',
        }}
      />
    </Link>
  )
}

/**
 * Qué pestaña está abierta.
 *
 * ⚠️ Una clave que no existe en el catálogo —un enlace viejo, un favorito de
 * antes de que la pestaña se renombrara— **cae en la primera, nunca en una
 * pantalla en blanco**. Es la misma regla de los catálogos indexados por un
 * valor que viene de fuera: nunca `undefined` (CLAUDE.md · trampas heredadas).
 */
export function usePestana(pestanas: readonly Pestana[]): string {
  const params = useSearchParams()
  const pedida = params.get('tab')

  if (pedida && pestanas.some((p) => p.clave === pedida)) return pedida
  return pestanas[0]?.clave ?? ''
}
