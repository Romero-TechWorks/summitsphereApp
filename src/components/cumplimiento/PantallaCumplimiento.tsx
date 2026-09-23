'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import { nombreDeOrganizacion } from '@/lib/queries/cartera'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Pestanas, { usePestana, type Pestana } from '@/components/ui/Pestanas'
import SelectorOrganizacion, { useOrganizacionSeleccionada } from '@/components/sistemas/SelectorOrganizacion'
import PanelMatriz from './PanelMatriz'
import PanelRecorridoCumplimiento from './PanelRecorridoCumplimiento'
import PanelSemaforo from './PanelSemaforo'
import PanelBiblioteca from './PanelBiblioteca'
import PanelVencimientos from './PanelVencimientos'

/**
 * Las pestañas del dominio (docs/13 §8). Agregar una sección es una entrada
 * aquí, no una ruta nueva.
 *
 * «Vencimientos» entró con `F05·B2`. Va después del semáforo: la matriz, el
 * recorrido y el semáforo son el ciclo de una visita; los vencimientos son el
 * seguimiento de oficina del resto del año.
 *
 * ⚠️ La biblioteca va al final, igual que «Normas» en `/sistemas`: es de la
 * firma y casi nadie la toca a diario.
 */
const PESTANAS: readonly Pestana[] = [
  { clave: 'matriz', etiqueta: 'Matriz' },
  { clave: 'recorrido', etiqueta: 'Recorrido' },
  { clave: 'semaforo', etiqueta: 'Semáforo' },
  { clave: 'vencimientos', etiqueta: 'Vencimientos' },
  { clave: 'noms', etiqueta: 'Catálogo de NOMs' },
]

/** Las que son el expediente de un cliente. La biblioteca no. */
const PIDEN_CLIENTE = new Set(['matriz', 'recorrido', 'semaforo', 'vencimientos'])

/**
 * `/cumplimiento` — **el cumplimiento normativo de cada cliente** [F05·B1].
 *
 * ⚠️ **Pide cliente en la URL (`?org=`), como `/sistemas` y al revés que
 * `/auditorias`** (docs/13 §8): cuatro de sus cinco pestañas son el expediente de
 * una organización. Una `org` que ya no está cae en «ninguna», nunca en una
 * pantalla consultando con un id fantasma — de eso se encarga
 * `useOrganizacionSeleccionada()`.
 */
export default function PantallaCumplimiento() {
  const activa = usePestana(PESTANAS)
  const { orgId, organizaciones, cargando, elegir } = useOrganizacionSeleccionada()

  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  // La biblioteca sólo la escribe un socio: la base tampoco deja a nadie más, y
  // ofrecer botones que terminan en 42501 es peor que no ofrecerlos.
  const esSocio = usuario?.rol === 'socio'
  const organizacion = organizaciones.find((o) => o.id === orgId)
  const pideCliente = PIDEN_CLIENTE.has(activa)

  return (
    <div className="contenido-pagina">
      <EncabezadoPagina
        titulo="Cumplimiento"
        meta={
          organizacion && pideCliente ? (
            <span>{nombreDeOrganizacion(organizacion)}</span>
          ) : (
            <span>Obligaciones legales, normativas y contractuales de cada cliente</span>
          )
        }
      />

      {/* Cambiar de pestaña no tira ni al cliente ni al sitio elegidos. */}
      <Pestanas pestanas={PESTANAS} conservar={['org', 'sitio']} />

      {pideCliente && (
        <SelectorOrganizacion
          orgId={orgId}
          organizaciones={organizaciones}
          elegir={elegir}
          ayuda="La matriz de obligaciones es de un cliente. Elige de cuál."
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
                : 'La matriz, el recorrido, el semáforo y los vencimientos son de una organización concreta. Elígela arriba.'
          }
        />
      ) : (
        <>
          {activa === 'matriz' && <PanelMatriz orgId={orgId} />}
          {activa === 'recorrido' && <PanelRecorridoCumplimiento orgId={orgId} />}
          {activa === 'semaforo' && <PanelSemaforo orgId={orgId} />}
          {activa === 'vencimientos' && <PanelVencimientos orgId={orgId} />}
          {activa === 'noms' && <PanelBiblioteca esSocio={esSocio} />}
        </>
      )}
    </div>
  )
}
