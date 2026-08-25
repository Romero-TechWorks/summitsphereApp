'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { listarSitios } from '@/lib/queries/cartera'
import { listarNormas } from '@/lib/queries/proyectos'
import { listarProcesos } from '@/lib/queries/procesos'
import {
  agregarNormaAlAlcance,
  agregarProcesoAlAlcance,
  agregarSitioAlAlcance,
  listarAlcanceNormas,
  listarAlcanceProcesos,
  listarAlcanceSitios,
  quitarNormaDelAlcance,
  quitarProcesoDelAlcance,
  quitarSitioDelAlcance,
  type AuditoriaNorma,
  type AuditoriaProceso,
  type AuditoriaSitio,
} from '@/lib/queries/auditorias'
import Aviso from '@/components/ui/Aviso'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Lista, { Fila } from '@/components/ui/Lista'
import Skeleton from '@/components/ui/Skeleton'
import { IconoDocumento, IconoCartera, IconoProceso } from '@/components/ui/Iconos'

/**
 * **El alcance de la auditoría** [F03·B1] — y no es papeleo.
 *
 * De estas tres listas sale la **lista de verificación** [F03·B2]: elegidas las
 * normas, `generar_lista_verificacion()` crea un punto por cada cláusula hoja
 * auditable. Sin alcance no hay lista, y sin lista el auditor entra a planta con
 * una pantalla vacía.
 *
 * ⚠️ Los tres catálogos se cargan con `useQuery`, nunca con `useEffect`: son
 * desplegables que vienen de la base, y sin señal un desplegable vacío deja el
 * guardado muerto antes de llegar a la cola (CLAUDE.md · reglas del offline, 3).
 */
export default function PanelAlcanceAuditoria({
  auditoriaId,
  orgId,
}: {
  auditoriaId: string
  orgId: string
}) {
  const cliente = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const claveNormas = queryKeys.auditorias.alcanceNormas(auditoriaId)
  const claveSitios = queryKeys.auditorias.alcanceSitios(auditoriaId)
  const claveProcesos = queryKeys.auditorias.alcanceProcesos(auditoriaId)

  const { data: alcanceNormas = [], isPending: cargandoNormas } = useQuery({
    queryKey: claveNormas,
    queryFn: () => listarAlcanceNormas(auditoriaId),
  })
  const { data: alcanceSitios = [] } = useQuery({
    queryKey: claveSitios,
    queryFn: () => listarAlcanceSitios(auditoriaId),
  })
  const { data: alcanceProcesos = [] } = useQuery({
    queryKey: claveProcesos,
    queryFn: () => listarAlcanceProcesos(auditoriaId),
  })

  const { data: normas = [] } = useQuery({
    queryKey: queryKeys.normas.catalogo(),
    queryFn: listarNormas,
  })
  const { data: sitios = [] } = useQuery({
    queryKey: queryKeys.cartera.sitios(orgId),
    queryFn: () => listarSitios(orgId),
    enabled: Boolean(orgId),
  })
  const { data: procesos = [] } = useQuery({
    queryKey: queryKeys.sistemas.procesos(orgId),
    queryFn: () => listarProcesos(orgId),
    enabled: Boolean(orgId),
  })

  const normasDentro = new Set(alcanceNormas.map((n) => n.norma_id))
  const sitiosDentro = new Set(alcanceSitios.map((s) => s.sitio_id))
  const procesosDentro = new Set(alcanceProcesos.map((p) => p.proceso_id))

  async function alternarNorma(norma: (typeof normas)[number], dentro: boolean) {
    setError(null)
    try {
      if (dentro) {
        const { encolado } = await quitarNormaDelAlcance(auditoriaId, norma)
        aplicarEscritura<AuditoriaNorma>({
          cliente,
          clave: claveNormas,
          encolado,
          actualizar: (previo) => previo.filter((n) => n.norma_id !== norma.id),
        })
      } else {
        const { fila, encolado } = await agregarNormaAlAlcance(auditoriaId, orgId, norma)
        aplicarEscritura<AuditoriaNorma>({
          cliente,
          clave: claveNormas,
          encolado,
          actualizar: (previo) => [...previo, fila],
        })
      }
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  async function alternarSitio(sitio: (typeof sitios)[number], dentro: boolean) {
    setError(null)
    try {
      if (dentro) {
        const { encolado } = await quitarSitioDelAlcance(auditoriaId, sitio)
        aplicarEscritura<AuditoriaSitio>({
          cliente,
          clave: claveSitios,
          encolado,
          actualizar: (previo) => previo.filter((s) => s.sitio_id !== sitio.id),
        })
      } else {
        const { fila, encolado } = await agregarSitioAlAlcance(auditoriaId, orgId, sitio)
        aplicarEscritura<AuditoriaSitio>({
          cliente,
          clave: claveSitios,
          encolado,
          actualizar: (previo) => [...previo, fila],
        })
      }
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  async function alternarProceso(proceso: (typeof procesos)[number], dentro: boolean) {
    setError(null)
    try {
      if (dentro) {
        const { encolado } = await quitarProcesoDelAlcance(auditoriaId, proceso)
        aplicarEscritura<AuditoriaProceso>({
          cliente,
          clave: claveProcesos,
          encolado,
          actualizar: (previo) => previo.filter((p) => p.proceso_id !== proceso.id),
        })
      } else {
        const { fila, encolado } = await agregarProcesoAlAlcance(auditoriaId, orgId, proceso)
        aplicarEscritura<AuditoriaProceso>({
          cliente,
          clave: claveProcesos,
          encolado,
          actualizar: (previo) => [...previo, fila],
        })
      }
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  if (cargandoNormas) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {error && <Aviso tono="error">{error}</Aviso>}

      <Aviso tono="info">
        De las <strong>normas</strong> marcadas aquí sale la lista de verificación: un punto por
        cada cláusula auditable. Los sitios y los procesos acotan dónde y a quién se audita.
      </Aviso>

      <Seccion titulo="Normas" cuantas={alcanceNormas.length}>
        {normas.length === 0 ? (
          <EstadoVacio
            titulo="El catálogo de normas está vacío"
            descripcion="Las normas se suben desde Sistemas → Normas con el archivo de la firma. Sin catálogo no hay cláusulas, y sin cláusulas no hay lista de verificación."
          />
        ) : (
          <Lista etiqueta="Normas del alcance">
            {normas.map((norma) => {
              const dentro = normasDentro.has(norma.id)
              return (
                <Fila
                  key={norma.id}
                  Icono={IconoDocumento}
                  titulo={`${norma.nombre}${norma.version ? ` : ${norma.version}` : ''}`}
                  meta={norma.titulo ?? undefined}
                  derecha={
                    <Button
                      variante={dentro ? 'fantasma' : 'secundario'}
                      tamano="sm"
                      onClick={() => alternarNorma(norma, dentro)}
                    >
                      {dentro ? 'Quitar' : 'Añadir'}
                    </Button>
                  }
                />
              )
            })}
          </Lista>
        )}
      </Seccion>

      <Seccion titulo="Sitios" cuantas={alcanceSitios.length}>
        {sitios.length === 0 ? (
          <EstadoVacio
            titulo="Este cliente no tiene sitios dados de alta"
            descripcion="Se capturan en su expediente de la cartera. Sin sitio, un hallazgo no dice dónde se vio."
          />
        ) : (
          <Lista etiqueta="Sitios del alcance">
            {sitios.map((sitio) => {
              const dentro = sitiosDentro.has(sitio.id)
              return (
                <Fila
                  key={sitio.id}
                  Icono={IconoCartera}
                  titulo={sitio.nombre}
                  meta={sitio.municipio ?? sitio.entidad ?? undefined}
                  derecha={
                    <Button
                      variante={dentro ? 'fantasma' : 'secundario'}
                      tamano="sm"
                      onClick={() => alternarSitio(sitio, dentro)}
                    >
                      {dentro ? 'Quitar' : 'Añadir'}
                    </Button>
                  }
                />
              )
            })}
          </Lista>
        )}
      </Seccion>

      <Seccion titulo="Procesos" cuantas={alcanceProcesos.length}>
        {procesos.length === 0 ? (
          <EstadoVacio
            titulo="Este cliente no tiene mapa de procesos"
            descripcion="Se levanta en Sistemas → Procesos. La agenda de la visita se arma proceso por proceso."
          />
        ) : (
          <Lista etiqueta="Procesos del alcance">
            {procesos.map((proceso) => {
              const dentro = procesosDentro.has(proceso.id)
              return (
                <Fila
                  key={proceso.id}
                  Icono={IconoProceso}
                  titulo={proceso.nombre}
                  meta={proceso.dueno?.nombre ?? 'Sin dueño asignado'}
                  derecha={
                    <Button
                      variante={dentro ? 'fantasma' : 'secundario'}
                      tamano="sm"
                      onClick={() => alternarProceso(proceso, dentro)}
                    >
                      {dentro ? 'Quitar' : 'Añadir'}
                    </Button>
                  }
                />
              )
            })}
          </Lista>
        )}
      </Seccion>
    </div>
  )
}

/** Un bloque del alcance: título, cuántos van dentro y la lista. Sin marco. */
function Seccion({
  titulo,
  cuantas,
  children,
}: {
  titulo: string
  cuantas: number
  children: React.ReactNode
}) {
  return (
    <section>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          color: 'var(--texto-dim)',
          marginBottom: 8,
        }}
      >
        {titulo}
        <span style={{ marginLeft: 8, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
          {cuantas === 0 ? 'ninguno en el alcance' : `${cuantas} en el alcance`}
        </span>
      </h3>
      {children}
    </section>
  )
}
