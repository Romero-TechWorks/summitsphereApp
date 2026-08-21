'use client'

import { useId, type SelectHTMLAttributes } from 'react'
import Campo, { describedBy, estiloControl } from './Campo'

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  etiqueta: string
  ayuda?: string
  error?: string | null
  /** La etiqueta se oye pero no se ve. Para filas de filtros. */
  etiquetaOculta?: boolean
  /** La opción vacía de arriba: «Elige una norma». */
  marcador?: string
  id?: string
}

/**
 * Un desplegable.
 *
 * ⚠️ **REGLA DEL OFFLINE 3 — la que más caro sale.** Si lo que llena este
 * desplegable viene de la base, se carga con `useQuery` y una clave de
 * `lib/query/keys.ts`, **nunca** con `useEffect` + `useState`. Sin señal, un
 * `useEffect` deja la lista vacía, el usuario no puede elegir, y el guardado
 * muere en la validación *antes* de llegar a `offlineWrite`: el dato no se
 * encola, se pierde. En la Fase 03 eso es el selector de cláusula de un
 * hallazgo — y sin cláusula no hay hallazgo.
 *
 * Se deja el aspecto nativo del navegador: en un teléfono, el selector del
 * sistema es más rápido de usar con el pulgar que cualquier lista propia.
 */
export default function Select({
  etiqueta,
  ayuda,
  error,
  etiquetaOculta,
  marcador,
  id,
  required,
  children,
  style,
  ...resto
}: Props) {
  const generado = useId()
  const idCampo = id ?? generado

  return (
    <Campo id={idCampo} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={required} etiquetaOculta={etiquetaOculta}>
      <select
        id={idCampo}
        required={required}
        aria-describedby={describedBy(idCampo, ayuda, error)}
        aria-invalid={error ? true : undefined}
        style={{ ...estiloControl(Boolean(error)), cursor: 'pointer', ...style }}
        {...resto}
      >
        {marcador && <option value="">{marcador}</option>}
        {children}
      </select>
    </Campo>
  )
}
