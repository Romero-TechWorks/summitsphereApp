import type { ReactNode } from 'react'

/**
 * El encabezado de una pantalla: título, una línea de contexto y las acciones.
 *
 * ⚠️ El título en Cormorant a 32px — la display **nunca baja de 24px**
 * (docs/05 §3): con trazos finos, por debajo de eso deja de leerse. Lo de al
 * lado va en DM Sans.
 *
 * Sin marco y sin línea inferior: quien separa el encabezado del contenido es
 * el aire, igual que en el tablero.
 */
export default function EncabezadoPagina({
  titulo,
  meta,
  acciones,
}: {
  titulo: string
  /** La línea de debajo: «14 organizaciones · 3 en prospecto». */
  meta?: ReactNode
  /** Lo que se puede hacer aquí. A la derecha en escritorio, debajo en móvil. */
  acciones?: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 20,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h2 className="display" style={{ fontSize: 32, marginBottom: 4 }}>
          {titulo}
        </h2>
        {meta && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              fontSize: 13,
              color: 'var(--texto-dim)',
            }}
          >
            {meta}
          </div>
        )}
      </div>

      {acciones && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {acciones}
        </div>
      )}
    </div>
  )
}
