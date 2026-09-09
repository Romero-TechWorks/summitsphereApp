'use client'

import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import TableroAcciones from './TableroAcciones'

/**
 * `/acciones` — **el ciclo que cierra una no conformidad** [F04·B1].
 *
 * ⚠️ **No pide elegir cliente, igual que `/auditorias` y al revés que
 * `/sistemas`.** El Coordinador del SGC abre «qué vence esta semana», no «qué
 * tiene Planta Norte»: la lista cruza la cartera y el filtro por cliente se
 * aplica en memoria, que es además lo único que sobrevive sin señal.
 *
 * ⚠️ **Una sola vista, sin pestañas todavía.** Los planes de mejora
 * (`F-SG-16`), los cambios de SGC (`F-SG-24`) y las quejas (`F-SG-08`) ya tienen
 * esquema, pero **no pantalla**: una pestaña vacía es peor que ninguna. Entran
 * cuando se construyan, cada una como una entrada más aquí — nunca como una ruta
 * nueva (docs/03 §2.1).
 */
export default function PantallaAcciones() {
  return (
    <div className="contenido-pagina">
      <EncabezadoPagina
        titulo="Acciones"
        meta={<span>Lo que cierra una no conformidad: la corrección, la acción correctiva y su verificación de eficacia</span>}
      />

      <TableroAcciones />
    </div>
  )
}
