import type { CSSProperties, ReactNode } from 'react'

/**
 * La envoltura de un control: etiqueta, ayuda y error.
 *
 * ⚠️ **Los campos son la excepción de "sin contenedores"** (docs/05 §4.3). En
 * esta app ningún bloque de contenido lleva marco, pero un `<input>` sin marco
 * no se ve pulsable: es un control, no un contenedor. Por eso el borde de un
 * campo va en `--borde-fuerte` (3.59:1) y no en `--borde` (1.2:1) — WCAG 1.4.11
 * pide 3:1 para que se distinga dónde termina un campo.
 *
 * `Input`, `Select` y `Textarea` la usan por dentro. Se exporta suelta para lo
 * que no es un control único —un grupo de casillas, el selector de alcance de
 * un proyecto—, que también necesita etiqueta y error.
 */
export default function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  requerido = false,
  etiquetaOculta = false,
  children,
}: {
  /** El mismo `id` que lleva el control, para que la etiqueta lo enfoque. */
  id: string
  etiqueta: string
  /** Qué se espera aquí. En el lenguaje de la firma. */
  ayuda?: string
  /** Qué está mal. Se anuncia solo: va con `role="alert"`. */
  error?: string | null
  requerido?: boolean
  /**
   * La etiqueta se oye pero no se ve. Para una fila de filtros, donde el
   * marcador ya dice qué es y una etiqueta encima de cada control rompería la
   * línea.
   *
   * ⚠️ **Oculta, nunca ausente**: sin `<label>` un lector de pantalla anuncia
   * "cuadro de edición" y nada más, y quien navega así se queda sin saber qué
   * se escribe ahí.
   */
  etiquetaOculta?: boolean
  children: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={id}
        className={etiquetaOculta ? 'sr-only' : undefined}
        style={{
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '.04em',
          color: 'var(--texto-dim)',
        }}
      >
        {etiqueta}
        {requerido && (
          <span aria-hidden style={{ color: 'var(--error)', marginLeft: 3 }}>
            *
          </span>
        )}
        {requerido && <span className="sr-only"> (obligatorio)</span>}
      </label>

      {children}

      {ayuda && (
        <p id={`${id}-ayuda`} style={{ fontSize: 12.5, color: 'var(--texto-dim)' }}>
          {ayuda}
        </p>
      )}

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          style={{ fontSize: 12.5, color: 'var(--error)', fontWeight: 500 }}
        >
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * El aspecto de un control, compartido por los tres.
 *
 * ⚠️ `fontSize: 16` y no los 15 del cuerpo, y no es un descuido: **Safari en
 * iOS amplía la página al enfocar un campo de menos de 16px**. Con el armazón
 * fijo ese zoom no se deshace solo —el documento no scrollea, así que el
 * usuario no puede "salir" de él— y el header y la barra inferior quedan
 * descolocados el resto de la sesión.
 */
export function estiloControl(invalido = false): CSSProperties {
  return {
    width: '100%',
    padding: '9px 11px',
    fontSize: 16,
    fontFamily: 'var(--fuente-texto), sans-serif',
    color: 'var(--texto)',
    background: 'var(--superficie)',
    border: `1px solid ${invalido ? 'var(--error)' : 'var(--borde-fuerte)'}`,
    borderRadius: 6,
  }
}

/** Los `aria-describedby` que le tocan a un control según lo que lo acompaña. */
export function describedBy(
  id: string,
  ayuda?: string,
  error?: string | null,
): string | undefined {
  const partes = [ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null].filter(Boolean)
  return partes.length > 0 ? partes.join(' ') : undefined
}
