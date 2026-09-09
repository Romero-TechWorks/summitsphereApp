'use client'

import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import Pestanas, { usePestana, type Pestana } from '@/components/ui/Pestanas'
import Aviso from '@/components/ui/Aviso'
import PanelAvisos from './PanelAvisos'

/**
 * ⚠️ **Una sola pestaña de verdad, y las otras cinco llegan en la Fase 06.** La
 * barra se pinta igual: hace visible que el dominio va a crecer, y evita que
 * alguien concluya que «Admin» es sólo esto.
 */
const PESTANAS: readonly Pestana[] = [
  { clave: 'avisos', etiqueta: 'Avisos' },
]

/**
 * `/admin` — configuración de la firma.
 *
 * ⚠️ **Dejó de ser `PantallaPendiente` con `F04·B3`.** Los avisos al teléfono
 * necesitan un sitio donde activarse, y éste es donde una persona los busca: no
 * son de un cliente ni de una auditoría, son de su cuenta y de su aparato.
 *
 * Lo demás del dominio —metas, finanzas, facturación, usuarios, bitácora y
 * configuración— sigue siendo Fase 06, y se dice abajo en vez de esconderlo.
 */
export default function PantallaAdmin() {
  const activa = usePestana(PESTANAS)

  return (
    <div className="contenido-pagina">
      <EncabezadoPagina
        titulo="Admin"
        meta={<span>Tus avisos y, desde la Fase 06, la configuración de la firma</span>}
      />

      <Pestanas pestanas={PESTANAS} />

      {activa === 'avisos' && <PanelAvisos />}

      <div style={{ marginTop: 28 }}>
        <Aviso tono="info">
          <strong>Metas, finanzas, facturación, usuarios, bitácora y configuración</strong> llegan
          en la Fase 06. Mientras tanto, las cuentas se dan de alta desde el panel de Supabase —
          está en <span className="mono">docs/09</span> · A04.
        </Aviso>
      </div>
    </div>
  )
}
