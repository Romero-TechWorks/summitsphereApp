import type { CSSProperties, ReactNode } from 'react'

/**
 * La tarjeta: **una tarjeta es una cosa** — una organización, un hallazgo, una
 * acción, una obligación.
 *
 * ⚠️ Dos pantallas NO llevan tarjetas y es deliberado: `/asistente`, que enseña
 * documentos y medidas en vez de cosas, y la ejecución de auditoría en campo,
 * donde cada tarjeta cuesta 24px de aire que en un teléfono son dos ítems menos
 * por pantalla. docs/05_SISTEMA_DE_DISENO.md §4.3.
 */
export default function Card({
  children,
  padding = 16,
  style,
}: {
  children: ReactNode
  padding?: number
  style?: CSSProperties
}) {
  return (
    <article
      style={{
        background: 'var(--superficie)',
        border: '1px solid var(--borde)',
        borderRadius: 6,
        padding,
        ...style,
      }}
    >
      {children}
    </article>
  )
}
