'use client'

/**
 * El porcentaje de avance, como barra y como número.
 *
 * ⚠️ **Sin marco y sin superficie** (docs/05 §4.3): es la misma hairline verde
 * que delimita una fila de `ui/Lista`, rellena hasta donde toca. Encajonarla en
 * un rectángulo la convertiría en el único elemento con caja de la pantalla.
 *
 * ⚠️ Lleva `role="progressbar"` con sus valores: quien lo oye en vez de verlo
 * necesita el número, y el número también va escrito al lado — un color no es
 * información accesible por sí solo.
 */
export default function BarraAvance({
  porcentaje,
  etiqueta,
  detalle,
}: {
  porcentaje: number
  etiqueta: string
  /** «12 de 47 cláusulas evaluadas». */
  detalle?: string
}) {
  const acotado = Math.max(0, Math.min(100, Math.round(porcentaje)))

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--texto)' }}>{etiqueta}</span>
        <span className="mono" style={{ fontSize: 14, color: 'var(--verde-tinta)' }}>{acotado}%</span>
      </div>

      {detalle && (
        <p style={{ margin: '2px 0 6px', fontSize: 12.5, color: 'var(--texto-dim)' }}>{detalle}</p>
      )}

      <div
        role="progressbar"
        aria-label={etiqueta}
        aria-valuenow={acotado}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          position: 'relative',
          height: 4,
          borderRadius: 2,
          background: 'rgba(61, 186, 78, .16)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '0 auto 0 0',
            width: `${acotado}%`,
            borderRadius: 2,
            background: 'linear-gradient(90deg, var(--verde-hondo) 0%, var(--verde) 100%)',
            transition: 'width .3s cubic-bezier(.22,.61,.36,1)',
          }}
        />
      </div>
    </div>
  )
}
