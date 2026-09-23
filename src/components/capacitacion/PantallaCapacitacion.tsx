'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import { nombreDeOrganizacion } from '@/lib/queries/cartera'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Pestanas, { usePestana, type Pestana } from '@/components/ui/Pestanas'
import SelectorOrganizacion, { useOrganizacionSeleccionada } from '@/components/sistemas/SelectorOrganizacion'
import PanelSesiones from './PanelSesiones'
import PanelPrograma from './PanelPrograma'
import PanelCatalogoCapacitacion from './PanelCatalogoCapacitacion'

/**
 * Las pestañas del dominio. El catálogo va al final: es de la firma, no del
 * cliente, igual que «Normas» en `/sistemas` y «Catálogo de NOMs» en
 * `/cumplimiento`.
 */
const PESTANAS: readonly Pestana[] = [
  { clave: 'sesiones', etiqueta: 'Sesiones' },
  { clave: 'programa', etiqueta: 'Programa anual' },
  { clave: 'catalogo', etiqueta: 'Cursos y proveedores' },
]

const PIDEN_CLIENTE = new Set(['sesiones', 'programa'])

/**
 * `/capacitacion` — **la capacitación de cada cliente** [F05·B3].
 *
 * ⚠️ **Summit NO emite DC-3** (`F03`, 23 sep 2026): los expide el agente
 * capacitador externo que imparte el curso. Esta pantalla programa las sesiones,
 * lleva la lista de asistencia, arma la solicitud para el proveedor y
 * **registra** los DC-3 que llegan.
 *
 * ⚠️ Pide cliente en la URL (`?org=`), como `/sistemas` y `/cumplimiento`.
 */
export default function PantallaCapacitacion() {
  const activa = usePestana(PESTANAS)
  const { orgId, organizaciones, cargando, elegir } = useOrganizacionSeleccionada()
  const { data: usuario } = useQuery({ queryKey: queryKeys.usuario.actual(), queryFn: obtenerUsuarioActual })

  const esSocio = usuario?.rol === 'socio'
  const organizacion = organizaciones.find((o) => o.id === orgId)
  const pideCliente = PIDEN_CLIENTE.has(activa)

  return (
    <div className="contenido-pagina">
      <EncabezadoPagina
        titulo="Capacitación"
        meta={
          organizacion && pideCliente
            ? <span>{nombreDeOrganizacion(organizacion)}</span>
            : <span>Programa, sesiones y constancias DC-3 de cada cliente</span>
        }
      />

      <Pestanas pestanas={PESTANAS} conservar={['org']} />

      {pideCliente && (
        <SelectorOrganizacion
          orgId={orgId}
          organizaciones={organizaciones}
          elegir={elegir}
          ayuda="La capacitación es de un cliente. Elige de cuál."
        />
      )}

      {pideCliente && !orgId ? (
        <EstadoVacio
          titulo={cargando ? 'Cargando la cartera…' : 'Elige un cliente'}
          descripcion={cargando
            ? 'Un momento.'
            : organizaciones.length === 0
              ? 'Todavía no tienes ninguna organización asignada. Un socio de la firma reparte los expedientes desde la pestaña Equipo de cada cliente.'
              : 'Las sesiones y el programa anual son de una organización concreta. Elígela arriba.'}
        />
      ) : (
        <>
          {activa === 'sesiones' && <PanelSesiones orgId={orgId} />}
          {activa === 'programa' && <PanelPrograma orgId={orgId} />}
          {activa === 'catalogo' && <PanelCatalogoCapacitacion esSocio={esSocio} />}
        </>
      )}
    </div>
  )
}
