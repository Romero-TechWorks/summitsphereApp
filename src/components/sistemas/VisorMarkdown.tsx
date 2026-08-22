'use client'

import { useMemo, Fragment } from 'react'
import { analizarMarkdown, type Bloque, type Inline } from '@/lib/documentos/markdown'

/**
 * El documento, leído con formato dentro de la app [F02·B2].
 *
 * ⚠️ **Ni una línea de `dangerouslySetInnerHTML`.** Lo que se pinta aquí salió
 * del Word que mandó un cliente por correo; React escapa cada trozo de texto
 * porque son nodos, no HTML. Un `<img onerror=…>` escondido en un manual de
 * calidad se ve como lo que es: texto.
 *
 * Sin marco y sin superficie, como todo lo demás (docs/05 §4.3): el documento es
 * texto flotando sobre el fondo. La jerarquía la hacen la tipografía y el aire.
 */
export default function VisorMarkdown({ markdown }: { markdown: string }) {
  const bloques = useMemo(() => analizarMarkdown(markdown), [markdown])

  if (bloques.length === 0) {
    return (
      <p style={{ fontSize: 14, color: 'var(--texto-dim)' }}>
        Esta versión no tiene texto convertido. El archivo original sigue completo.
      </p>
    )
  }

  return (
    <div style={{ maxWidth: 760, fontSize: 15, lineHeight: 1.7, color: 'var(--texto)' }}>
      {bloques.map((bloque, i) => (
        <Fragment key={i}>{pintar(bloque)}</Fragment>
      ))}
    </div>
  )
}

function pintar(bloque: Bloque) {
  switch (bloque.tipo) {
    case 'titulo': {
      // La display nunca baja de 24px (docs/05 §3): un h4 de un procedimiento se
      // distingue con el peso y el color, no encogiendo la Cormorant.
      const grande = bloque.nivel <= 2
      const tamanos = [28, 24, 18, 16, 15, 15]
      return (
        <p
          className={grande ? 'display' : undefined}
          style={{
            fontSize: tamanos[bloque.nivel - 1] ?? 15,
            fontWeight: grande ? undefined : 600,
            color: 'var(--texto)',
            marginTop: 26,
            marginBottom: 8,
            lineHeight: 1.3,
          }}
        >
          <Texto contenido={bloque.contenido} />
        </p>
      )
    }

    case 'parrafo':
      return (
        <p style={{ margin: '0 0 14px' }}>
          <Texto contenido={bloque.contenido} />
        </p>
      )

    case 'lista': {
      const Etiqueta = bloque.ordenada ? 'ol' : 'ul'
      return (
        <Etiqueta style={{ margin: '0 0 14px', paddingLeft: 22 }}>
          {bloque.elementos.map((elemento, i) => (
            <li key={i} style={{ marginLeft: elemento.sangria * 18, marginBottom: 4 }}>
              <Texto contenido={elemento.contenido} />
            </li>
          ))}
        </Etiqueta>
      )
    }

    case 'cita':
      return (
        <blockquote
          style={{
            margin: '0 0 14px',
            paddingLeft: 14,
            borderLeft: '2px solid var(--verde)',
            color: 'var(--texto-dim)',
          }}
        >
          <Texto contenido={bloque.contenido} />
        </blockquote>
      )

    case 'tabla':
      return (
        // ⚠️ El scroll horizontal vive AQUÍ, no en la página: el armazón es fijo
        // y el documento no scrollea (CLAUDE.md regla 4). Una tabla ancha de un
        // procedimiento sin esto empuja el ancho de toda la pantalla.
        <div style={{ overflowX: 'auto', margin: '0 0 18px' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 14, minWidth: '100%' }}>
            <thead>
              <tr>
                {bloque.encabezado.map((celda, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px 8px 0',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      borderBottom: '2px solid rgba(61, 186, 78, .3)',
                    }}
                  >
                    <Texto contenido={celda} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloque.filas.map((fila, f) => (
                <tr key={f}>
                  {fila.map((celda, c) => (
                    <td
                      key={c}
                      style={{
                        padding: '8px 12px 8px 0',
                        verticalAlign: 'top',
                        borderBottom: '1px solid var(--borde)',
                      }}
                    >
                      <Texto contenido={celda} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'codigo':
      return (
        <pre
          className="mono"
          style={{
            margin: '0 0 14px',
            padding: 12,
            overflowX: 'auto',
            fontSize: 13,
            background: 'var(--superficie)',
            border: '1px solid var(--borde)',
            borderRadius: 6,
          }}
        >
          {bloque.texto}
        </pre>
      )

    case 'separador':
      return (
        <hr
          style={{
            margin: '22px 0',
            border: 'none',
            height: 2,
            borderRadius: 2,
            background: 'rgba(61, 186, 78, .16)',
          }}
        />
      )
  }
}

function Texto({ contenido }: { contenido: Inline[] }) {
  return (
    <>
      {contenido.map((parte, i) => {
        if (parte.tipo === 'fuerte') return <strong key={i}>{parte.texto}</strong>
        if (parte.tipo === 'enfasis') return <em key={i}>{parte.texto}</em>
        if (parte.tipo === 'codigo') {
          return (
            <code
              key={i}
              className="mono"
              style={{ fontSize: '.92em', color: 'var(--verde-tinta)' }}
            >
              {parte.texto}
            </code>
          )
        }
        return <Fragment key={i}>{parte.texto}</Fragment>
      })}
    </>
  )
}
