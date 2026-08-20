/**
 * Hueco de carga. La clase `.skeleton` y sus keyframes viven en `globals.css`
 * porque una animación no se puede declarar en un estilo inline.
 */
export default function Skeleton({
  alto = 16,
  ancho = '100%',
  radio = 4,
}: {
  alto?: number | string
  ancho?: number | string
  radio?: number
}) {
  return (
    <div
      className="skeleton"
      style={{ height: alto, width: ancho, borderRadius: radio }}
      // Un skeleton anunciado por un lector de pantalla es ruido: lo que
      // importa es el contenido cuando llegue.
      aria-hidden="true"
    />
  )
}
