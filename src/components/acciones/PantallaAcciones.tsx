'use client'

import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import Pestanas, { usePestana, type Pestana } from '@/components/ui/Pestanas'
import TableroAcciones from './TableroAcciones'
import PanelQuejas from './PanelQuejas'
import PanelPlanesMejora from './PanelPlanesMejora'
import PanelCambiosSgc from './PanelCambiosSgc'

/**
 * Las vistas del dominio. Agregar una sección es una entrada más aquí, **no una
 * ruta nueva** (docs/03_ARQUITECTURA.md §2.1).
 *
 * ⚠️ **«Acciones» va primero porque es lo que se abre a diario.** Las quejas
 * llegan de vez en cuando, los planes de mejora se arman una vez al año y los
 * cambios de SGC son excepcionales — pero las acciones vencen todas las semanas.
 */
const PESTANAS: readonly Pestana[] = [
  { clave: 'acciones', etiqueta: 'Acciones' },
  { clave: 'quejas', etiqueta: 'Quejas y sugerencias' },
  { clave: 'planes', etiqueta: 'Planes de mejora' },
  { clave: 'cambios', etiqueta: 'Cambios al SGC' },
]

/**
 * `/acciones` — **el ciclo que cierra una no conformidad** [F04·B1].
 *
 * ⚠️ **No pide elegir cliente, igual que `/auditorias` y al revés que
 * `/sistemas`.** El Coordinador del SGC abre «qué vence esta semana», no «qué
 * tiene Planta Norte»: las cuatro listas cruzan la cartera y el filtro por
 * cliente se aplica en memoria, que es además lo único que sobrevive sin señal
 * (CLAUDE.md · reglas del offline, 7).
 *
 * ⚠️ **Y las cuatro pestañas son las cuatro bocas del mismo ciclo**, no cuatro
 * módulos: una queja procedente entra por la segunda y sale como no conformidad;
 * una sugerencia procedente sale por la tercera o la cuarta. Partirlas en rutas
 * distintas escondería que son el mismo recorrido.
 */
export default function PantallaAcciones() {
  const activa = usePestana(PESTANAS)

  return (
    <div className="contenido-pagina">
      <EncabezadoPagina
        titulo="Acciones"
        meta={<span>Lo que cierra una no conformidad: la corrección, la acción correctiva y su verificación de eficacia</span>}
      />

      <Pestanas pestanas={PESTANAS} />

      {activa === 'acciones' && <TableroAcciones />}
      {activa === 'quejas' && <PanelQuejas />}
      {activa === 'planes' && <PanelPlanesMejora />}
      {activa === 'cambios' && <PanelCambiosSgc />}
    </div>
  )
}
