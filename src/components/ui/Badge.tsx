import type { ReactNode } from 'react'

type Tono = 'neutro' | 'exito' | 'info' | 'advertencia' | 'error'

const TONOS: Record<Tono, { color: string; fondo: string }> = {
  neutro:      { color: 'var(--texto-dim)',   fondo: 'var(--superficie-3)' },
  exito:       { color: 'var(--exito)',       fondo: 'rgba(30, 107, 40, .10)' },
  info:        { color: 'var(--info)',        fondo: 'rgba(29, 78, 216, .10)' },
  advertencia: { color: 'var(--advertencia)', fondo: 'rgba(165, 90, 0, .10)' },
  error:       { color: 'var(--error)',       fondo: 'rgba(185, 28, 28, .10)' },
}

/**
 * ⚠️ El color NUNCA es la única señal — WCAG 1.4.1. El badge lleva siempre su
 * etiqueta en texto («NC mayor»), no sólo su tono. Un auditor daltónico es un
 * auditor perfectamente capaz.
 */
export default function Badge({
  children,
  tono = 'neutro',
}: {
  children: ReactNode
  tono?: Tono
}) {
  const { color, fondo } = TONOS[tono]

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: 4,
        background: fondo,
        color,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
