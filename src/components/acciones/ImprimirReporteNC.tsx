'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { obtenerIdentidadFirma } from '@/lib/queries/firma'
import { listarOrganizaciones, nombreDeOrganizacion } from '@/lib/queries/cartera'
import { listarAccionesDelHallazgo } from '@/lib/queries/acciones'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import type { HallazgoConContexto } from '@/lib/queries/hallazgos'
import { documentoImprimible, imprimirDocumento } from '@/lib/plantillas/impresion'
import { reporteNoConformidad, tituloReporteNC } from '@/lib/plantillas/reporteNoConformidad'
import Aviso from '@/components/ui/Aviso'
import Button from '@/components/ui/Button'

/**
 * Imprime el **`F-SG-06` y el `F-SG-07` en pareja** [F04·B1].
 *
 * ⚠️ **Los dos juntos y no uno cada vez.** `P-SG-05` §5.5 y el diagrama de flujo
 * del procedimiento los citan siempre así, y el `F-SG-06` tiene un campo que
 * apunta al otro por su código. Entregar el reporte sin el análisis deja al
 * responsable del proceso con la pregunta y sin el método.
 *
 * ⚠️ **No estrena ni una clave de caché.** La identidad de la firma y la lista de
 * organizaciones ya las bajan el informe y el tablero; las acciones, la propia
 * ficha. Es la misma regla que decidió si `B5` servía: esto se imprime en la
 * reunión de cierre, y una clave que falte ahí es un documento que no sale.
 */
export default function ImprimirReporteNC({
  hallazgo,
  folioAuditoria,
}: {
  hallazgo: HallazgoConContexto
  /** El folio de la auditoría, si la NC salió de una. */
  folioAuditoria: string | null
}) {
  const [verPrevia, setVerPrevia] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acciones = useQuery({
    queryKey: queryKeys.acciones.delHallazgo(hallazgo.id),
    queryFn: () => listarAccionesDelHallazgo(hallazgo.id),
  })

  const firma = useQuery({
    queryKey: queryKeys.firma.identidad(),
    queryFn: obtenerIdentidadFirma,
  })

  const organizaciones = useQuery({
    queryKey: queryKeys.cartera.organizaciones(),
    queryFn: listarOrganizaciones,
  })

  const yo = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  const cargando =
    acciones.isPending || firma.isPending || organizaciones.isPending || yo.isPending

  // ⚠️ `useMemo` y no `useState`: la caché es la fuente de verdad (regla 2 del
  // offline). Copiar el documento a un estado lo dejaría congelado en cuanto
  // alguien levante una acción más desde la sección de abajo.
  const html = useMemo(() => {
    if (cargando) return ''

    const org = (organizaciones.data ?? []).find((o) => o.id === hallazgo.org_id)

    return reporteNoConformidad({
      hallazgo,
      acciones: acciones.data ?? [],
      cliente: org ? nombreDeOrganizacion(org) : 'la organización auditada',
      firma: firma.data ?? null,
      folioAuditoria,
      // «Detecta» es el único bloque de firma que es de NUESTRO lado: las otras
      // tres son del cliente (F-SG-07 §7). El puesto es el papel en la auditoría,
      // que es lo que el documento quiere decir — «Auditor», no «Consultor senior».
      detectaNombre: yo.data?.nombre ?? '',
      detectaPuesto: folioAuditoria ? 'Auditor' : 'Coordinador del SGC',
    })
  }, [cargando, hallazgo, acciones.data, firma.data, organizaciones.data, yo.data, folioAuditoria])

  function imprimir() {
    setError(null)
    const resultado = imprimirDocumento(tituloReporteNC(hallazgo), html)
    if (!resultado.abierta) setError(resultado.motivo)
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h4
        style={{
          font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', margin: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}
      >
        <span>Reporte de no conformidad</span>
        <span style={{ display: 'inline-flex', gap: 8 }}>
          <Button tamano="sm" variante="fantasma" onClick={() => setVerPrevia((v) => !v)} disabled={cargando}>
            {verPrevia ? 'Ocultar' : 'Ver'}
          </Button>
          <Button tamano="sm" onClick={imprimir} disabled={cargando || html === ''}>
            Imprimir
          </Button>
        </span>
      </h4>

      <p style={{ margin: 0, font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
        F-SG-06 y F-SG-07, uno detrás del otro. El procedimiento los cita en pareja.
        Las casillas salen <strong>marcadas</strong>: lo que se imprime en blanco lo
        llena alguien con pluma, y ese dato ya no vuelve.
      </p>

      {error && <Aviso tono="error">{error}</Aviso>}

      {verPrevia && !cargando && (
        // ⚠️ `srcDoc` y no `src`: el documento vive en memoria. `sandbox` vacío lo
        // deja sin permisos, que es lo que corresponde a un documento armado con
        // texto que escribieron personas. Un solo renderizador: lo que se ve aquí
        // es exactamente lo que sale por la impresora.
        <iframe
          title="Vista previa del reporte de no conformidad"
          srcDoc={documentoImprimible(tituloReporteNC(hallazgo), html)}
          sandbox=""
          style={{
            width: '100%',
            height: 'min(calc(var(--vh-full) * 0.7), 900px)',
            border: '1px solid var(--borde)',
            borderRadius: 4,
            background: '#fff',
          }}
        />
      )}
    </section>
  )
}
