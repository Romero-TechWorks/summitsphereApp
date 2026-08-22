'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import { nombreDeOrganizacion } from '@/lib/queries/cartera'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Pestanas, { usePestana, type Pestana } from '@/components/ui/Pestanas'
import ArbolNormas from '@/components/normas/ArbolNormas'
import ImportadorNormas from '@/components/normas/ImportadorNormas'
import SelectorOrganizacion, { useOrganizacionSeleccionada } from './SelectorOrganizacion'
import PanelDocumentos from './PanelDocumentos'
import PanelProcesos from './PanelProcesos'
import PanelRequisitos from './PanelRequisitos'
import PanelRiesgos from './PanelRiesgos'
import PanelIndicadores from './PanelIndicadores'

/**
 * Las seis vistas del dominio. Agregar una sección es una entrada más aquí,
 * **no una ruta nueva** (docs/03_ARQUITECTURA.md §2.1).
 *
 * ⚠️ «Normas» va al final aunque fuera lo primero que existió: es el **catálogo
 * de la firma**, global y sin cliente, mientras que las otras cinco son el
 * expediente de un cliente concreto. Poner el catálogo de primero haría que la
 * pantalla se abriera todos los días en lo que casi nadie toca.
 */
const PESTANAS: readonly Pestana[] = [
  { clave: 'documentos', etiqueta: 'Documentos' },
  { clave: 'requisitos', etiqueta: 'Requisitos' },
  { clave: 'procesos', etiqueta: 'Procesos' },
  { clave: 'riesgos', etiqueta: 'Riesgos' },
  { clave: 'indicadores', etiqueta: 'Indicadores' },
  { clave: 'normas', etiqueta: 'Normas' },
]

/** Las que necesitan saber de qué cliente se habla. El catálogo no. */
const PIDEN_CLIENTE = new Set(['documentos', 'requisitos', 'procesos', 'riesgos', 'indicadores'])

/**
 * `/sistemas` — **el sistema de gestión de cada cliente** [Fase 02].
 *
 * Aquí la app deja de ser un CRM. Lo que se ve depende del RLS, no de este
 * componente: la consulta pide los documentos de una organización y la base
 * decide si esta cuenta puede verlos.
 */
export default function PantallaSistemas() {
  const activa = usePestana(PESTANAS)
  const { orgId, organizaciones, cargando, elegir } = useOrganizacionSeleccionada()

  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  // El importador del catálogo sólo lo ve un socio: la base tampoco deja
  // escribir a nadie más, y ofrecer un botón que termina en 42501 es peor que
  // no ofrecerlo.
  const esSocio = usuario?.rol === 'socio'
  const organizacion = organizaciones.find((o) => o.id === orgId)
  const pideCliente = PIDEN_CLIENTE.has(activa)

  return (
    <div className="contenido-pagina">
      <EncabezadoPagina
        titulo="Sistemas de gestión"
        meta={
          organizacion && pideCliente ? (
            <span>{nombreDeOrganizacion(organizacion)}</span>
          ) : (
            <span>Documentos, requisitos, procesos, riesgos e indicadores</span>
          )
        }
      />

      {/* ⚠️ `conservar={['org']}`: sin esto, cambiar de pestaña tira el cliente
          elegido y hay que volver a elegirlo cada vez. */}
      <Pestanas pestanas={PESTANAS} conservar={['org']} />

      {pideCliente && (
        <SelectorOrganizacion
          orgId={orgId}
          organizaciones={organizaciones}
          elegir={elegir}
          ayuda="El sistema de gestión es de un cliente. Elige de cuál."
        />
      )}

      {pideCliente && !orgId ? (
        <EstadoVacio
          titulo={cargando ? 'Cargando la cartera…' : 'Elige un cliente'}
          descripcion={
            cargando
              ? 'Un momento.'
              : organizaciones.length === 0
                ? 'Todavía no tienes ninguna organización asignada. Un socio de la firma reparte los expedientes desde la pestaña Equipo de cada cliente.'
                : 'Los documentos, los procesos y la matriz de requisitos son de una organización concreta. Elígela arriba y aparecerán aquí.'
          }
        />
      ) : (
        <>
          {activa === 'documentos' && <PanelDocumentos orgId={orgId} />}
          {activa === 'requisitos' && <PanelRequisitos orgId={orgId} />}
          {activa === 'procesos' && <PanelProcesos orgId={orgId} />}
          {activa === 'riesgos' && <PanelRiesgos orgId={orgId} />}
          {activa === 'indicadores' && <PanelIndicadores orgId={orgId} />}
          {activa === 'normas' && (
            <>
              {esSocio && (
                <div style={{ marginBottom: 24 }}>
                  <ImportadorNormas />
                </div>
              )}
              <ArbolNormas />
            </>
          )}
        </>
      )}
    </div>
  )
}
