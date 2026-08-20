/**
 * La esfera de Summit-Sphere.
 *
 * SVG en línea, sin dependencias y sin petición de red: el logotipo tiene que
 * dibujarse en la pantalla de carga de una app que abre sin señal.
 *
 * Sobre navy va tal cual. Sobre fondo claro el anillo exterior baja de `--cyan`
 * a `--cyan-tinta`, porque el cyan de marca sobre cream da 2.46:1 y el anillo
 * simplemente desaparece.
 */

export default function Logo({
  size = 40,
  sobre = 'navy',
}: {
  size?: number
  /** Sobre qué fondo se dibuja. Cambia el anillo exterior, nada más. */
  sobre?: 'navy' | 'claro'
}) {
  const anillo = sobre === 'navy' ? '#29abe2' : '#0f6d94'
  const opacidadAnillo = sobre === 'navy' ? 0.6 : 0.75

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="Summit-Sphere"
    >
      <circle cx="20" cy="20" r="18" stroke={anillo} strokeWidth="1.2" opacity={opacidadAnillo} />
      <ellipse cx="20" cy="20" rx="11" ry="18" stroke="#3dba4e" strokeWidth="2"
               transform="rotate(-25 20 20)" />
      <ellipse cx="20" cy="20" rx="18" ry="8" stroke="#3dba4e" strokeWidth="1.5"
               transform="rotate(-15 20 20)" opacity="0.5" />
      <circle cx="20" cy="20" r="3.5" fill="#3dba4e" />
      <circle cx="30" cy="16" r="2" fill="#3dba4e" />
      <circle cx="11" cy="25" r="1.5" fill={anillo} />
    </svg>
  )
}
