'use client'

import { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly } from '@/lib/utils/dates'
import type { MiembroEquipo, Sitio } from '@/lib/queries/cartera'
import {
  crearProyecto,
  listarProyectosDe,
  type DatosProyecto,
  type Lider,
  type ProyectoConLider,
} from '@/lib/queries/proyectos'
import {
  ESTADOS_PROYECTO,
  ETAPAS_PROYECTO,
  TIPOS_PROYECTO,
  etiquetaDe,
  numeroDeEtapa,
  tonoDe,
} from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import { IconoEmbudo } from '@/components/ui/Iconos'
import DetalleProyecto from './DetalleProyecto'
import FormularioProyecto from './FormularioProyecto'

const FORM_PROYECTO = 'form-alta-proyecto'

/**
 * Los proyectos de un cliente, dentro de su expediente [F01·B2].
 *
 * Lista y detalle en la misma pestaña: el detalle se abre con `?proyecto=<id>`,
 * así que el enlace se puede compartir y el botón de atrás vuelve a la lista sin
 * inventar una ruta nueva.
 */
export default function PanelProyectos({
  orgId,
  sitios,
  equipo,
  puedoEditar,
}: {
  orgId: string
  sitios: Sitio[]
  equipo: MiembroEquipo[]
  puedoEditar: boolean
}) {
  const cliente = useQueryClient()
  const ruta = usePathname()
  const params = useSearchParams()
  const abierto = params.get('proyecto')

  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: proyectos = [], isPending, error: fallo } = useQuery({
    queryKey: queryKeys.cartera.proyectosDe(orgId),
    queryFn: () => listarProyectosDe(orgId),
  })

  const volverHref = `${ruta}?tab=proyectos`

  async function guardarNuevo(datos: DatosProyecto, lider: Lider | null) {
    setGuardando(true)
    setError(null)

    try {
      const { fila, encolado } = await crearProyecto(orgId, datos, lider)

      aplicarEscritura<ProyectoConLider>({
        cliente,
        clave: queryKeys.cartera.proyectosDe(orgId),
        encolado,
        // Al principio de la lista: se ordena por alta, y el recién creado es el
        // que se va a abrir enseguida.
        actualizar: (previo) => [fila, ...previo.filter((p) => p.id !== fila.id)],
        ademasInvalidar: [queryKeys.cartera.proyectos()],
      })

      setModal(false)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  if (abierto) {
    const proyecto = proyectos.find((p) => p.id === abierto)

    if (isPending) return <Skeleton alto={200} radio={4} />

    if (!proyecto) {
      return (
        <EstadoVacio
          titulo="Ese proyecto no está en este expediente"
          descripcion="O se movió, o el enlace es de otro cliente. Vuelve a la lista y ábrelo desde ahí."
        />
      )
    }

    return (
      <DetalleProyecto
        proyecto={proyecto}
        sitios={sitios}
        equipo={equipo}
        puedoEditar={puedoEditar}
        volverHref={volverHref}
      />
    )
  }

  return (
    <>
      {/* La acción vive dentro del panel, no en el encabezado de la página:
          el modal y su estado son de aquí, igual que en `PanelEquipo`. */}
      {puedoEditar && proyectos.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button variante="primario" onClick={() => { setError(null); setModal(true) }}>
            Nuevo proyecto
          </Button>
        </div>
      )}

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {isPending ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[0, 1].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
        </div>
      ) : fallo ? (
        <EstadoVacio titulo="No se pudieron leer los proyectos" descripcion={mensajeDeError(fallo)} />
      ) : proyectos.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay proyectos"
          descripcion="Un proyecto es el contrato: sus normas, sus sitios en alcance, su líder y la etapa de la metodología en la que va. De su alcance saldrán la matriz de requisitos y las listas de verificación de las auditorías."
          accion={puedoEditar ? <Button variante="primario" onClick={() => setModal(true)}>Abrir el primero</Button> : null}
        />
      ) : (
        <Lista etiqueta="Proyectos del cliente">
          {proyectos.map((proyecto) => (
            <Fila
              key={proyecto.id}
              href={`${ruta}?tab=proyectos&proyecto=${proyecto.id}`}
              Icono={IconoEmbudo}
              titulo={proyecto.nombre}
              meta={
                <>
                  <span>{etiquetaDe(TIPOS_PROYECTO, proyecto.tipo)}</span>
                  <span>
                    Etapa <span className="mono">{numeroDeEtapa(proyecto.etapa)}</span>/
                    <span className="mono">{ETAPAS_PROYECTO.length}</span> ·{' '}
                    {etiquetaDe(ETAPAS_PROYECTO, proyecto.etapa)}
                  </span>
                  {proyecto.lider?.nombre && <span>{proyecto.lider.nombre}</span>}
                  {proyecto.fecha_fin_estimada && (
                    <span className="mono">{formatDateOnly(proyecto.fecha_fin_estimada)}</span>
                  )}
                </>
              }
              derecha={
                <Badge tono={tonoDe(ESTADOS_PROYECTO, proyecto.estado)}>
                  {etiquetaDe(ESTADOS_PROYECTO, proyecto.estado)}
                </Badge>
              }
            />
          ))}
        </Lista>
      )}

      <Modal
        abierto={modal}
        alCerrar={() => setModal(false)}
        titulo="Nuevo proyecto"
        pie={
          <>
            <Button variante="fantasma" onClick={() => setModal(false)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_PROYECTO} cargando={guardando}>
              Guardar
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 14 }}><Aviso tono="error">{error}</Aviso></div>}
        <FormularioProyecto id={FORM_PROYECTO} equipo={equipo} alEnviar={guardarNuevo} />
      </Modal>
    </>
  )
}
