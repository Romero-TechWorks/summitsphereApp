import type { ReactNode } from 'react'

type Tono = 'error' | 'advertencia' | 'info' | 'exito'

const COLORES: Record<Tono, string> = {
  error: 'var(--error)',
  advertencia: 'var(--advertencia)',
  info: 'var(--info)',
  exito: 'var(--exito)',
}

/**
 * Un aviso en pantalla: un guardado que falló, una cola que no vació, una
 * advertencia sobre lo que está por hacerse.
 *
 * ⚠️ **Sin relleno de fondo**: una barra de 2px a la izquierda y el texto en su
 * color (docs/05 §4.3). Un rectángulo tintado es un contenedor, y en esta app
 * no hay contenedores — además, apilados en una pantalla densa compiten con el
 * contenido en vez de destacarse de él.
 *
 * ⚠️ **El motivo va dentro, completo.** «No se pudo guardar» a secas es un
 * `catch` vacío con mejor letra: quien lo lee no sabe si perdió el dato, si fue
 * un permiso o si basta con reintentar. Si la cola guardó un `motivo`, el
 * motivo se pinta (CLAUDE.md · trampas heredadas).
 */
export default function Aviso({
  tono = 'error',
  children,
}: {
  tono?: Tono
  children: ReactNode
}) {
  return (
    <p
      // Un error interrumpe; lo demás espera su turno en el lector de pantalla.
      role={tono === 'error' ? 'alert' : 'status'}
      style={{
        borderLeft: `2px solid ${COLORES[tono]}`,
        padding: '2px 0 2px 10px',
        fontSize: 13,
        lineHeight: 1.5,
        color: COLORES[tono],
      }}
    >
      {children}
    </p>
  )
}
