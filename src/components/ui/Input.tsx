'use client'

import { useId, type InputHTMLAttributes } from 'react'
import Campo, { describedBy, estiloControl } from './Campo'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  etiqueta: string
  ayuda?: string
  error?: string | null
  /** La etiqueta se oye pero no se ve. Para filas de filtros. */
  etiquetaOculta?: boolean
  /** Sólo si hace falta enlazarlo desde fuera; normalmente se genera solo. */
  id?: string
}

/**
 * Un campo de texto con su etiqueta y su error.
 *
 * ⚠️ El error se **pinta**, siempre, y con su motivo. «No se pudo guardar» a
 * secas es un `catch` vacío con mejor letra (CLAUDE.md · trampas heredadas):
 * quien lo lee no sabe si perdió el dato o si basta con reintentar.
 *
 * ⚠️ Para fechas, `type="date"` y el valor en `YYYY-MM-DD` — el mismo formato
 * que la columna `date`. Nada de convertirlo con `new Date()` por el camino.
 */
export default function Input({
  etiqueta,
  ayuda,
  error,
  etiquetaOculta,
  id,
  required,
  style,
  ...resto
}: Props) {
  const generado = useId()
  const idCampo = id ?? generado

  return (
    <Campo id={idCampo} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={required} etiquetaOculta={etiquetaOculta}>
      <input
        id={idCampo}
        required={required}
        aria-describedby={describedBy(idCampo, ayuda, error)}
        aria-invalid={error ? true : undefined}
        style={{ ...estiloControl(Boolean(error)), ...style }}
        {...resto}
      />
    </Campo>
  )
}
