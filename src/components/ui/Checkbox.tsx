'use client'

import { useId, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & {
  etiqueta: string
  /** La línea de debajo: qué implica marcarla. */
  ayuda?: string
  id?: string
}

/**
 * Una casilla con su etiqueta al lado.
 *
 * ⚠️ La etiqueta envuelve a la casilla en vez de apuntarla con `htmlFor`: así
 * **todo el renglón** es zona pulsable. Con el dedo, una casilla de 16px es un
 * blanco imposible; con el renglón entero, no hay que apuntar.
 *
 * `accentColor` es lo único que hace falta para teñirla: una casilla dibujada a
 * mano pierde el aspecto nativo que el sistema operativo ya sabe pintar, y en
 * iOS y Android eso se nota.
 */
export default function Checkbox({ etiqueta, ayuda, id, style, ...resto }: Props) {
  const generado = useId()
  const idCampo = id ?? generado

  return (
    <label
      htmlFor={idCampo}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '4px 0' }}
    >
      <input
        id={idCampo}
        type="checkbox"
        style={{
          width: 18,
          height: 18,
          marginTop: 1,
          accentColor: 'var(--verde-hondo)',
          cursor: 'pointer',
          flexShrink: 0,
          ...style,
        }}
        {...resto}
      />
      <span style={{ minWidth: 0 }}>
        <span style={{ fontSize: 14, color: 'var(--texto)' }}>{etiqueta}</span>
        {ayuda && (
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--texto-dim)' }}>{ayuda}</span>
        )}
      </span>
    </label>
  )
}
