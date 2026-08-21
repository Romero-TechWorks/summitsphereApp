'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import type { Sitio } from '@/lib/queries/cartera'
import {
  agregarNormaAlAlcance,
  agregarSitioAlAlcance,
  listarAlcanceNormas,
  listarAlcanceSitios,
  listarNormas,
  quitarNormaDelAlcance,
  quitarSitioDelAlcance,
  type AlcanceNorma,
  type AlcanceSitio,
  type Norma,
  type Proyecto,
} from '@/lib/queries/proyectos'
import Aviso from '@/components/ui/Aviso'
import Checkbox from '@/components/ui/Checkbox'
import Skeleton from '@/components/ui/Skeleton'

/**
 * El alcance de un proyecto: **qué normas cubre y en qué sitios**.
 *
 * ⚠️ Esto no es un campo administrativo, es la entrada de las tres fases
 * siguientes. De estas dos listas salen la matriz de requisitos [Fase 02], la
 * lista de verificación de una auditoría [Fase 03] y, con ellas, los hallazgos.
 * Por eso son tablas y no una cadena de texto: con las normas escritas en un
 * `text`, generar una lista de verificación obligaría a adivinarlas con un LIKE.
 *
 * ⚠️ Cada casilla escribe **al momento**, sin botón de guardar: es una fila que
 * se agrega o se quita, no un formulario. Y como toda escritura de la app, pasa
 * por `offlineWrite` — marcar una norma sin señal la deja en la cola con su
 * etiqueta legible, no la pierde.
 */
export default function PanelAlcance({
  proyecto,
  sitios,
  puedoEditar,
}: {
  proyecto: Proyecto
  /** Los sitios de la organización, ya cargados por el expediente. */
  sitios: Sitio[]
  puedoEditar: boolean
}) {
  const cliente = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  // Qué casillas están escribiendo ahora mismo, para no dispararlas dos veces.
  const [ocupados, setOcupados] = useState<Set<string>>(new Set())

  // ⚠️ El catálogo de normas es un DATO y se carga con `useQuery`, no dentro de
  // un `useEffect`: sin señal tiene que salir de la caché o el selector aparece
  // vacío y no se puede definir el alcance (regla 3 del offline).
  const { data: catalogo = [], isPending: cargandoNormas } = useQuery({
    queryKey: queryKeys.normas.catalogo(),
    queryFn: listarNormas,
  })

  const { data: alcanceNormas = [] } = useQuery({
    queryKey: queryKeys.cartera.alcanceNormas(proyecto.id),
    queryFn: () => listarAlcanceNormas(proyecto.id),
  })

  const { data: alcanceSitios = [] } = useQuery({
    queryKey: queryKeys.cartera.alcanceSitios(proyecto.id),
    queryFn: () => listarAlcanceSitios(proyecto.id),
  })

  const normasElegidas = new Set(alcanceNormas.map((a) => a.norma_id))
  const sitiosElegidos = new Set(alcanceSitios.map((a) => a.sitio_id))

  function marcarOcupado(clave: string, ocupado: boolean) {
    setOcupados((previo) => {
      const copia = new Set(previo)
      if (ocupado) copia.add(clave)
      else copia.delete(clave)
      return copia
    })
  }

  async function alternarNorma(norma: Norma, incluir: boolean) {
    const clave = `norma:${norma.id}`
    marcarOcupado(clave, true)
    setError(null)

    try {
      if (incluir) {
        const { fila, encolado } = await agregarNormaAlAlcance(proyecto, norma)
        aplicarEscritura<AlcanceNorma>({
          cliente,
          clave: queryKeys.cartera.alcanceNormas(proyecto.id),
          encolado,
          actualizar: (previo) => [...previo.filter((a) => a.norma_id !== norma.id), fila],
        })
      } else {
        const { encolado } = await quitarNormaDelAlcance(proyecto, norma)
        aplicarEscritura<AlcanceNorma>({
          cliente,
          clave: queryKeys.cartera.alcanceNormas(proyecto.id),
          encolado,
          actualizar: (previo) => previo.filter((a) => a.norma_id !== norma.id),
        })
      }
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      marcarOcupado(clave, false)
    }
  }

  async function alternarSitio(sitio: Sitio, incluir: boolean) {
    const clave = `sitio:${sitio.id}`
    marcarOcupado(clave, true)
    setError(null)

    try {
      if (incluir) {
        const { fila, encolado } = await agregarSitioAlAlcance(proyecto, sitio)
        aplicarEscritura<AlcanceSitio>({
          cliente,
          clave: queryKeys.cartera.alcanceSitios(proyecto.id),
          encolado,
          actualizar: (previo) => [...previo.filter((a) => a.sitio_id !== sitio.id), fila],
        })
      } else {
        const { encolado } = await quitarSitioDelAlcance(proyecto, sitio)
        aplicarEscritura<AlcanceSitio>({
          cliente,
          clave: queryKeys.cartera.alcanceSitios(proyecto.id),
          encolado,
          actualizar: (previo) => previo.filter((a) => a.sitio_id !== sitio.id),
        })
      }
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      marcarOcupado(clave, false)
    }
  }

  const sitiosActivos = sitios.filter((s) => s.activo || sitiosElegidos.has(s.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {error && <Aviso tono="error">{error}</Aviso>}

      <section>
        <Titulo>Normas contratadas</Titulo>

        {cargandoNormas ? (
          <Skeleton alto={60} radio={4} />
        ) : catalogo.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-dim)', lineHeight: 1.55 }}>
            El catálogo de normas todavía está vacío. Lo carga un socio subiendo el archivo
            del catálogo de Summit desde <strong>Sistemas</strong>; hasta entonces no se puede
            definir qué norma cubre este contrato.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {catalogo.map((norma) => (
              <Checkbox
                key={norma.id}
                etiqueta={`${norma.nombre}${norma.version ? `:${norma.version}` : ''}`}
                ayuda={norma.titulo ?? undefined}
                checked={normasElegidas.has(norma.id)}
                disabled={!puedoEditar || ocupados.has(`norma:${norma.id}`)}
                onChange={(e) => alternarNorma(norma, e.target.checked)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <Titulo>Sitios en alcance</Titulo>

        {sitiosActivos.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-dim)', lineHeight: 1.55 }}>
            Esta organización todavía no tiene sitios. Agrégalos en la pestaña <strong>Sitios</strong>{' '}
            del expediente: el alcance de un certificado se define por centro de trabajo, y una
            planta puede quedar dentro y otra fuera.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sitiosActivos.map((sitio) => (
              <Checkbox
                key={sitio.id}
                etiqueta={sitio.nombre}
                ayuda={
                  [
                    sitio.municipio,
                    sitio.num_trabajadores != null ? `${sitio.num_trabajadores} trabajadores` : null,
                    sitio.activo ? null : 'dado de baja',
                  ]
                    .filter(Boolean)
                    .join(' · ') || undefined
                }
                checked={sitiosElegidos.has(sitio.id)}
                disabled={!puedoEditar || ocupados.has(`sitio:${sitio.id}`)}
                onChange={(e) => alternarSitio(sitio, e.target.checked)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h4
      style={{
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '.04em',
        textTransform: 'uppercase',
        color: 'var(--texto-dim)',
        marginBottom: 8,
      }}
    >
      {children}
    </h4>
  )
}
