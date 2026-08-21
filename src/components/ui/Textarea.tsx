'use client'

import { useId, type TextareaHTMLAttributes } from 'react'
import Campo, { describedBy, estiloControl } from './Campo'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  etiqueta: string
  ayuda?: string
  error?: string | null
  id?: string
}

/**
 * Texto largo: notas de una visita, el objetivo de un proyecto, la descripción
 * de un hallazgo.
 *
 * `resize: 'vertical'` a propósito: en horizontal desbordaría el contenedor
 * recortado del armazón y la parte de la derecha quedaría inalcanzable.
 */
export default function Textarea({
  etiqueta,
  ayuda,
  error,
  id,
  required,
  rows = 4,
  style,
  ...resto
}: Props) {
  const generado = useId()
  const idCampo = id ?? generado

  return (
    <Campo id={idCampo} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={required}>
      <textarea
        id={idCampo}
        rows={rows}
        required={required}
        aria-describedby={describedBy(idCampo, ayuda, error)}
        aria-invalid={error ? true : undefined}
        style={{
          ...estiloControl(Boolean(error)),
          resize: 'vertical',
          lineHeight: 1.5,
          ...style,
        }}
        {...resto}
      />
    </Campo>
  )
}
