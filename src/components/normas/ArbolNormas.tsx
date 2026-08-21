'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import { listarNormasConClausulas, type Clausula } from '@/lib/queries/normas'
import Badge from '@/components/ui/Badge'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Skeleton from '@/components/ui/Skeleton'
import { IconoSistemas } from '@/components/ui/Iconos'

/**
 * El catálogo cargado, para leerlo.
 *
 * Es donde se hace la tarea `C01` del dueño: revisar el resumen de cada
 * cláusula, que es el criterio técnico de Summit y va a aparecer en cada lista
 * de verificación y en cada hallazgo. Se corrige en el `.md` y se vuelve a
 * subir.
 */
export default function ArbolNormas() {
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set())

  const { data: normas = [], isPending, error } = useQuery({
    queryKey: queryKeys.normas.arbol(),
    queryFn: listarNormasConClausulas,
  })

  function alternar(id: string) {
    setAbiertas((previo) => {
      const copia = new Set(previo)
      if (copia.has(id)) copia.delete(id)
      else copia.add(id)
      return copia
    })
  }

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[0, 1].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  if (error) {
    return <EstadoVacio titulo="No se pudo leer el catálogo" descripcion={mensajeDeError(error)} />
  }

  if (normas.length === 0) {
    return (
      <EstadoVacio
        titulo="El catálogo todavía está vacío"
        descripcion="Sin normas cargadas no se puede definir el alcance de un proyecto, ni generar una lista de verificación más adelante. Sube el archivo del catálogo con el botón de arriba; si no lo tienes escrito, empieza por la plantilla."
      />
    )
  }

  return (
    <div>
      {normas.map((norma) => {
        const abierta = abiertas.has(norma.id)
        const auditables = norma.clausulas.filter((c) => c.activa && c.auditable).length

        return (
          <div key={norma.id}>
            <button
              type="button"
              onClick={() => alternar(norma.id)}
              aria-expanded={abierta}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '12px 2px',
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'inherit',
                font: 'inherit',
              }}
            >
              <span aria-hidden style={{ display: 'inline-flex', color: 'var(--verde-tinta)', flexShrink: 0 }}>
                <IconoSistemas size={18} />
              </span>

              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>
                  {norma.nombre}
                  {norma.version && <span className="mono">:{norma.version}</span>}
                </span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--texto-dim)', marginTop: 2 }}>
                  {norma.titulo ? `${norma.titulo} · ` : ''}
                  <span className="mono">{norma.clausulas.filter((c) => c.activa).length}</span>{' '}
                  cláusulas · <span className="mono">{auditables}</span> auditables
                </span>
              </span>

              <span aria-hidden style={{ fontSize: 13, color: 'var(--texto-dim)', flexShrink: 0 }}>
                {abierta ? 'Ocultar' : 'Ver'}
              </span>
            </button>

            <div aria-hidden style={{ height: 2, borderRadius: 2, background: 'rgba(61, 186, 78, .16)' }} />

            {abierta && (
              <div style={{ padding: '10px 0 18px' }}>
                {norma.clausulas.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--texto-dim)', padding: '8px 2px' }}>
                    Esta norma está cargada sin cláusulas todavía. El árbol entra con el catálogo
                    completo.
                  </p>
                ) : (
                  norma.clausulas.map((clausula) => <FilaClausula key={clausula.id} clausula={clausula} />)
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function FilaClausula({ clausula }: { clausula: Clausula }) {
  // La sangría sale del NÚMERO, no de un campo aparte: `8.5.1` es de tercer
  // nivel se mire como se mire.
  const profundidad = clausula.numero.split('.').length - 1

  return (
    <div
      style={{
        padding: '7px 2px 7px',
        paddingLeft: 2 + profundidad * 16,
        borderBottom: '1px solid var(--borde)',
        opacity: clausula.activa ? 1 : 0.55,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: 13, color: 'var(--verde-tinta)', fontWeight: 500 }}>
          {clausula.numero}
        </span>
        <span style={{ fontSize: 14, minWidth: 0 }}>{clausula.titulo}</span>
        {!clausula.auditable && <Badge tono="neutro">No auditable</Badge>}
        {!clausula.activa && <Badge tono="advertencia">De baja</Badge>}
      </div>

      {clausula.resumen && (
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', lineHeight: 1.55, marginTop: 3, whiteSpace: 'pre-wrap' }}>
          {clausula.resumen}
        </p>
      )}
    </div>
  )
}
