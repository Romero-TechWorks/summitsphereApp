'use client'

import type { ButtonHTMLAttributes, CSSProperties } from 'react'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'
type Tamano = 'sm' | 'md'

/**
 * ⚠️ El texto sobre un relleno de acento va SIEMPRE en `--sobre-acento` (navy),
 * nunca blanco. El verde de marca con texto blanco da 2.52:1 y el cyan 2.62:1:
 * los dos fallan AA. Con navy encima dan 6.53:1 y 6.29:1.
 * docs/05_SISTEMA_DE_DISENO.md §2.2.
 */
const RELLENOS: Record<Variante, CSSProperties> = {
  primario: {
    background: 'var(--verde)',
    color: 'var(--sobre-acento)',
    border: '1px solid var(--verde-hondo)',
  },
  secundario: {
    background: 'var(--superficie)',
    color: 'var(--texto)',
    border: '1px solid var(--borde-fuerte)',
  },
  fantasma: {
    background: 'transparent',
    color: 'var(--texto-dim)',
    border: '1px solid transparent',
  },
  peligro: {
    background: 'var(--superficie)',
    color: 'var(--error)',
    border: '1px solid var(--error)',
  },
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  tamano?: Tamano
  cargando?: boolean
}

export default function Button({
  variante = 'secundario',
  tamano = 'md',
  cargando = false,
  disabled,
  children,
  style,
  ...resto
}: Props) {
  const inactivo = disabled || cargando

  return (
    <button
      // ⚠️ Sin esto, un botón dentro de un <form> lo envía. Ha costado
      // formularios enviados a medias por tocar "Agregar sitio".
      type={resto.type ?? 'button'}
      disabled={inactivo}
      // Un botón deshabilitado no anuncia por qué. `aria-busy` al menos dice que
      // está trabajando y no que se rompió.
      aria-busy={cargando || undefined}
      style={{
        ...RELLENOS[variante],
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: tamano === 'sm' ? '6px 12px' : '9px 16px',
        fontSize: tamano === 'sm' ? 13 : 14,
        fontFamily: 'var(--fuente-texto), sans-serif',
        fontWeight: 500,
        borderRadius: 6,
        cursor: inactivo ? 'not-allowed' : 'pointer',
        opacity: inactivo ? 0.55 : 1,
        transition: 'opacity .12s, background .12s',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...resto}
    >
      {cargando ? 'Un momento…' : children}
    </button>
  )
}
