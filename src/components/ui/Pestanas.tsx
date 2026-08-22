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
export default function Pestanas({
  pestanas,
  conservar,
}: {
  pestanas: readonly Pestana[]
  /**
   * Qué parámetros del query string sobreviven al cambio de pestaña.
   *
   * ⚠️ Por defecto **ninguno**, y es lo correcto para casi todo: el `?proyecto=`
   * de la cartera no tiene sentido en la pestaña de contactos, y arrastrarlo
   * dejaría URLs que enseñan un detalle que ya no se está mirando.
   *
   * `/sistemas` sí pasa `['org']`: ahí el cliente elegido es el contexto de
   * cinco de las seis pestañas, y perderlo al cambiar de pestaña obligaría a
   * elegirlo otra vez cada vez — que es exactamente el gesto que el selector
   * existe para ahorrar.
   */
  conservar?: readonly string[]
}) {
  const ruta = usePathname()
  const params = useSearchParams()
  const activa = usePestana(pestanas)

  function href(clave: string): string {
    const siguientes = new URLSearchParams()
    siguientes.set('tab', clave)
    for (const nombre of conservar ?? []) {
      const valor = params.get(nombre)
      if (valor) siguientes.set(nombre, valor)
    }
    return `${ruta}?${siguientes.toString()}`
  }

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
          href={href(pestana.clave)}
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
