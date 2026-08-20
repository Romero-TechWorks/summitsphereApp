import type { ReactNode } from 'react'

/**
 * ⚠️ Nunca una pantalla en blanco.
 *
 * Cada lista vacía dice **qué falta y cómo empezar**. Es la diferencia entre una
 * app que se adopta y una que se abandona la primera semana: un consultor que
 * abre «Requisitos» y ve un rectángulo gris asume que la herramienta está rota.
 *
 * docs/05_SISTEMA_DE_DISENO.md §4.5.
 */
export default function EstadoVacio({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string
  /** Qué falta y por qué. En el lenguaje de la firma, no del programador. */
  descripcion: string
  /** El botón que resuelve lo que falta, si hay uno. */
  accion?: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--texto)' }}>{titulo}</p>
      <p style={{ fontSize: 14, color: 'var(--texto-dim)', maxWidth: 420 }}>
        {descripcion}
      </p>
      {accion ? <div style={{ marginTop: 8 }}>{accion}</div> : null}
    </div>
  )
}
