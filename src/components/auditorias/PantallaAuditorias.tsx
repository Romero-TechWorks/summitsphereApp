'use client'

import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import Pestanas, { usePestana, type Pestana } from '@/components/ui/Pestanas'
import PanelPrograma from './PanelPrograma'
import PanelAuditorias from './PanelAuditorias'
import TableroHallazgos from './TableroHallazgos'

/**
 * Las vistas del dominio. Agregar una sección es una entrada más aquí, **no una
 * ruta nueva** (docs/03_ARQUITECTURA.md §2.1). La única ruta propia de las
 * auditorías es `/auditorias/[id]`, el expediente de una.
 *
 * ⚠️ «Auditorías» va primero y «Programa» al final, al revés de como se planea en
 * la realidad. El programa se captura una vez al año; las auditorías se abren
 * todas las semanas, y la pantalla tiene que abrirse en lo que se usa.
 *
 * **Hallazgos** es el tablero del lunes: los de toda la cartera, no los de una
 * auditoría. Los de una concreta viven en su expediente.
 */
const PESTANAS: readonly Pestana[] = [
  { clave: 'auditorias', etiqueta: 'Auditorías' },
  { clave: 'hallazgos', etiqueta: 'Hallazgos' },
  { clave: 'programa', etiqueta: 'Programa anual' },
]

/**
 * `/auditorias` — **el núcleo del producto** [Fase 03].
 *
 * ⚠️ **No pide elegir un cliente, y esa es la diferencia con `/sistemas`.** Allá
 * cinco de seis pestañas son el expediente de *una* organización; aquí la semana
 * de un auditor cruza la cartera —el lunes abre «qué tengo esta semana», no «qué
 * tiene Planta Norte»—. Se descarga la lista visible una vez y el filtro por
 * cliente se aplica en memoria, que es además lo único que sobrevive a una
 * planta sin señal (CLAUDE.md · reglas del offline, 7).
 */
export default function PantallaAuditorias() {
  const activa = usePestana(PESTANAS)

  return (
    <div className="contenido-pagina">
      <EncabezadoPagina
        titulo="Auditorías"
        meta={<span>El programa anual, el plan de cada auditoría y los hallazgos abiertos</span>}
      />

      <Pestanas pestanas={PESTANAS} />

      {activa === 'auditorias' && <PanelAuditorias />}
      {activa === 'hallazgos' && <TableroHallazgos />}
      {activa === 'programa' && <PanelPrograma />}
    </div>
  )
}
