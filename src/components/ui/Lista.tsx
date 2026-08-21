'use client'

import Link from 'next/link'
import { useState, type ComponentType, type ReactNode } from 'react'

/**
 * LA LISTA — el patrón de contenido de toda la aplicación.
 *
 * ⚠️ **Aquí no hay tarjetas, y no es sólo en esta pantalla: es en todas**
 * (docs/05_SISTEMA_DE_DISENO.md §4.3). El tablero es la plantilla del resto de
 * la app: cada elemento es **texto flotando sobre el fondo**, reconocible por su
 * icono y **delimitado por debajo con el verde de Summit** — una hairline de
 * `rgba(61,186,78,.16)` de lado a lado, y encima un tramo en degradado que crece
 * cuando el elemento está enfocado o bajo el cursor.
 *
 * Por qué: una pantalla de esta app enseña treinta organizaciones, cuarenta
 * hallazgos o cien cláusulas. Encajonar cada una en su rectángulo blanco cuesta
 * 24px de aire por fila —en un teléfono, dos elementos menos por pantalla— y
 * convierte una lista en una cuadrícula de cajas donde no gana ninguna. La
 * jerarquía la hacen la tipografía, el aire y esa línea.
 *
 * Los `<input>` y `<select>` sí conservan su marco: son controles, no
 * contenedores. Ver `Campo.tsx`.
 */
export default function Lista({
  children,
  etiqueta,
}: {
  children: ReactNode
  /** Qué lista es, para quien la oye en vez de verla. */
  etiqueta?: string
}) {
  return (
    <ul aria-label={etiqueta} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {children}
    </ul>
  )
}

export function Fila({
  titulo,
  meta,
  derecha,
  href,
  onClick,
  Icono,
}: {
  titulo: ReactNode
  /** La segunda línea: lo que distingue a este de sus vecinos. */
  meta?: ReactNode
  /** Estado, fecha o cantidad. Como TEXTO en su color, no como relleno. */
  derecha?: ReactNode
  /** A dónde lleva. Un `<Link>` de verdad: se puede abrir en otra pestaña. */
  href?: string
  /** Si abre un modal en vez de navegar. Nunca los dos a la vez. */
  onClick?: () => void
  Icono?: ComponentType<{ size?: number }>
}) {
  const [realzado, setRealzado] = useState(false)

  const cuerpo = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      {Icono && (
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            color: 'var(--verde-tinta)',
            flexShrink: 0,
            transform: realzado ? 'translateY(-1px)' : 'none',
            transition: 'transform .15s ease',
          }}
        >
          <Icono size={18} />
        </span>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--texto)' }}>{titulo}</div>
        {meta && (
          <div
            style={{
              marginTop: 2,
              fontSize: 13,
              color: 'var(--texto-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {meta}
          </div>
        )}
      </div>

      {derecha && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {derecha}
        </div>
      )}
    </div>
  )

  // Estilo común de la zona pulsable. Sin fondo, sin borde, sin radio: lo que
  // marca el elemento es la línea de abajo, no una caja alrededor.
  const estiloInterior = {
    display: 'block',
    width: '100%',
    padding: '12px 2px',
    background: 'transparent',
    border: 'none',
    textAlign: 'left' as const,
    color: 'inherit',
    font: 'inherit',
    cursor: href || onClick ? 'pointer' : 'default',
  }

  const oyentes = {
    onMouseEnter: () => setRealzado(true),
    onMouseLeave: () => setRealzado(false),
    // El teclado también realza: quien navega con Tab tiene que ver dónde está,
    // y el anillo de foco solo no dice qué fila es.
    onFocus: () => setRealzado(true),
    onBlur: () => setRealzado(false),
  }

  return (
    <li>
      {href ? (
        <Link href={href} style={estiloInterior} {...oyentes}>
          {cuerpo}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} style={estiloInterior} {...oyentes}>
          {cuerpo}
        </button>
      ) : (
        <div style={estiloInterior}>{cuerpo}</div>
      )}

      {/* La delimitación: la misma del tablero. Cierra el elemento sin
          encajonarlo. */}
      <div
        aria-hidden
        style={{
          position: 'relative',
          height: 2,
          borderRadius: 2,
          background: 'rgba(61, 186, 78, .16)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '0 auto 0 0',
            width: realzado ? '100%' : '0%',
            borderRadius: 2,
            background:
              'linear-gradient(90deg, var(--verde-hondo) 0%, var(--verde) 55%, rgba(61,186,78,0) 100%)',
            transition: 'width .28s cubic-bezier(.22,.61,.36,1)',
          }}
        />
      </div>
    </li>
  )
}
