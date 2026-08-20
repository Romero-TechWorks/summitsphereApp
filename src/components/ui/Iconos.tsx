/**
 * Iconos de la app.
 *
 * SVG de trazo, 1.5px, del mismo repertorio que la web de Summit. Sin librería
 * de iconos: son unos treinta, no tres mil, y una dependencia de 300 KB para
 * eso es peso que un auditor descarga en una nave industrial con media barra
 * de señal.
 *
 * Heredan el color con `currentColor` y el tamaño por `props`.
 */

type PropsIcono = {
  size?: number
  strokeWidth?: number
}

function Svg({
  size = 20,
  strokeWidth = 1.5,
  children,
}: PropsIcono & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Los iconos son decorativos: el nombre accesible lo pone siempre el
      // control que los envuelve. Un lector de pantalla que anuncia "gráfico"
      // antes de cada etiqueta es ruido.
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function IconoInicio(p: PropsIcono) {
  return (
    <Svg {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M9.5 20v-6h5v6" />
    </Svg>
  )
}

export function IconoCartera(p: PropsIcono) {
  return (
    <Svg {...p}>
      <path d="M3 20V8l6-4 6 4v12" />
      <path d="M15 20V11h6v9" />
      <path d="M3 20h18" />
      <path d="M7 11h2M7 15h2M12 11h1M12 15h1M18 15h1" />
    </Svg>
  )
}

export function IconoSistemas(p: PropsIcono) {
  return (
    <Svg {...p}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h4" />
    </Svg>
  )
}

export function IconoAuditorias(p: PropsIcono) {
  return (
    <Svg {...p}>
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z" />
      <path d="m9.5 10 1.8 1.8L15 8" />
    </Svg>
  )
}

export function IconoCumplimiento(p: PropsIcono) {
  return (
    <Svg {...p}>
      <path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 8.5-4.1-.9-7-4.3-7-8.5V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  )
}

export function IconoCapacitacion(p: PropsIcono) {
  return (
    <Svg {...p}>
      <path d="M12 4 2.5 8.5 12 13l9.5-4.5L12 4Z" />
      <path d="M6.5 10.7V15c0 1.4 2.5 2.7 5.5 2.7s5.5-1.3 5.5-2.7v-4.3" />
      <path d="M21.5 8.5V14" />
    </Svg>
  )
}

export function IconoAcciones(p: PropsIcono) {
  return (
    <Svg {...p}>
      <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" />
    </Svg>
  )
}

export function IconoAdmin(p: PropsIcono) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 18.3a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.7 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </Svg>
  )
}

export function IconoBuscar(p: PropsIcono) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  )
}

export function IconoAsistente(p: PropsIcono) {
  return (
    <Svg {...p}>
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <path d="M12 8V4.5M9 14h.01M15 14h.01" />
      <path d="M9.5 17h5" />
      <circle cx="12" cy="3.5" r="1.2" />
    </Svg>
  )
}

export function IconoSalir(p: PropsIcono) {
  return (
    <Svg {...p}>
      <path d="M14 20H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h8" />
      <path d="m17 15 3-3-3-3M20 12H10" />
    </Svg>
  )
}

/** Asa de arrastre de los widgets del tablero. Dos columnas de tres puntos. */
export function IconoArrastrar(p: PropsIcono) {
  return (
    <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
      <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" />
    </Svg>
  )
}
