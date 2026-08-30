'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import {
  listarAgenda,
  listarAlcanceNormas,
  listarAlcanceProcesos,
  listarAlcanceSitios,
  listarEquipoAuditor,
  marcarInformeEmitido,
  type AuditoriaEnLista,
} from '@/lib/queries/auditorias'
import { listarItems } from '@/lib/queries/verificacion'
import { listarHallazgos } from '@/lib/queries/hallazgos'
import { obtenerIdentidadFirma } from '@/lib/queries/firma'
import { armarInforme } from '@/lib/auditorias/informe'
import { informeDeAuditoriaHtml, tituloDelInforme } from '@/lib/plantillas/informeAuditoria'
import { documentoImprimible, imprimirDocumento } from '@/lib/plantillas/impresion'
import { formatDate } from '@/lib/utils/dates'
import Aviso from '@/components/ui/Aviso'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'

/**
 * **El informe de auditoría** [F03·B5] — la octava y última pestaña del expediente.
 *
 * Reproduce el `F-SG-12` de la firma; su estructura y el mapeo campo por campo
 * están en `docs/formatos_informeAuditorias/F-SG-12_reporte_final.md`.
 *
 * ⚠️ **Todo sale de la caché, y de las MISMAS claves que baja la precarga.** El
 * criterio de cierre de la Fase 03 dice que el auditor genera el informe
 * preliminar «en el sitio» tras tres horas en modo avión y se lo enseña al
 * cliente en la reunión de cierre: una clave nueva aquí sería un documento en
 * blanco en el único momento en que el entregable se mira delante de quien lo
 * paga. Por eso las nueve consultas de abajo son literalmente las de
 * `piezasDeLaPrecarga()`, y por eso la identidad de la firma se sumó allí como
 * undécima pieza.
 *
 * ⚠️ **El documento se pinta en un `<iframe>`, no en el árbol de React**, y no es
 * un rodeo: la plantilla es una cadena de HTML con colores literales porque la
 * ventana de impresión no hereda `globals.css` (docs/05 §6). Metiéndola en un
 * iframe se ve **exactamente** lo que va a salir por la impresora, con un solo
 * renderizador. Va con `sandbox` vacío —sin `allow-scripts`, sin
 * `allow-same-origin`— así que aunque la plantilla ya escapa todo lo que
 * interpola, ni un `<script>` colado en la descripción de un hallazgo podría
 * ejecutarse. Es la misma cautela que el visor de documentos de la Fase 02.
 */
export default function PanelInforme({ auditoria }: { auditoria: AuditoriaEnLista }) {
  const cliente = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const id = auditoria.id

  const items = useQuery({
    queryKey: queryKeys.auditorias.items(id),
    queryFn: () => listarItems(id),
  })
  const agenda = useQuery({
    queryKey: queryKeys.auditorias.agenda(id),
    queryFn: () => listarAgenda(id),
  })
  const equipo = useQuery({
    queryKey: queryKeys.auditorias.equipo(id),
    queryFn: () => listarEquipoAuditor(id),
  })
  const normas = useQuery({
    queryKey: queryKeys.auditorias.alcanceNormas(id),
    queryFn: () => listarAlcanceNormas(id),
  })
  const sitios = useQuery({
    queryKey: queryKeys.auditorias.alcanceSitios(id),
    queryFn: () => listarAlcanceSitios(id),
  })
  const procesos = useQuery({
    queryKey: queryKeys.auditorias.alcanceProcesos(id),
    queryFn: () => listarAlcanceProcesos(id),
  })
  const hallazgos = useQuery({
    queryKey: queryKeys.auditorias.hallazgos(id),
    queryFn: () => listarHallazgos(id),
  })
  const firma = useQuery({
    queryKey: queryKeys.firma.identidad(),
    queryFn: obtenerIdentidadFirma,
  })

  const cargando =
    items.isPending ||
    agenda.isPending ||
    equipo.isPending ||
    normas.isPending ||
    sitios.isPending ||
    procesos.isPending ||
    hallazgos.isPending ||
    firma.isPending

  // ⚠️ `useMemo` y no `useState`: la caché es la fuente de verdad (regla 2 del
  // offline). Copiar el informe a un estado del componente lo dejaría congelado
  // en cuanto el auditor levante un hallazgo más desde el recorrido.
  const html = useMemo(() => {
    if (cargando) return ''

    const resumen = armarInforme({
      items: items.data ?? [],
      agenda: agenda.data ?? [],
      equipo: equipo.data ?? [],
      normas: normas.data ?? [],
      hallazgos: hallazgos.data ?? [],
    })

    return informeDeAuditoriaHtml({
      auditoria,
      firma: firma.data ?? null,
      normas: normas.data ?? [],
      sitios: sitios.data ?? [],
      procesos: procesos.data ?? [],
      equipo: equipo.data ?? [],
      resumen,
    })
  }, [
    cargando,
    auditoria,
    items.data,
    agenda.data,
    equipo.data,
    normas.data,
    sitios.data,
    procesos.data,
    hallazgos.data,
    firma.data,
  ])

  /**
   * Lo que le falta al informe para estar completo.
   *
   * ⚠️ Se dice **antes** de imprimir y no se impide imprimir: un preliminar
   * incompleto en la reunión de cierre sigue siendo mejor que ningún documento,
   * y quien decide es el auditor. Lo que no puede pasar es que se entregue sin
   * que nadie se haya dado cuenta de que falta la conclusión.
   */
  const faltantes = useMemo(() => {
    if (cargando) return []
    const lista: string[] = []
    if (!auditoria.objetivo) lista.push('el objetivo')
    if (!auditoria.alcance) lista.push('el alcance')
    if (!auditoria.criterios) lista.push('los criterios')
    if (!auditoria.conclusiones) lista.push('la conclusión')
    if ((equipo.data ?? []).length === 0) lista.push('el equipo auditor')
    if (!firma.data) lista.push('los datos de la firma (membrete)')
    return lista
  }, [cargando, auditoria, equipo.data, firma.data])

  function imprimir() {
    setError(null)
    setAviso(null)
    const resultado = imprimirDocumento(tituloDelInforme(auditoria), html)
    if (!resultado.abierta) setError(resultado.motivo)
  }

  async function cambiarEmision(emitido: boolean) {
    setGuardando(true)
    setError(null)
    setAviso(null)

    try {
      const { fila, encolado } = await marcarInformeEmitido(auditoria, emitido)
      cliente.setQueryData(queryKeys.auditorias.auditoria(id), fila)
      // Sólo se invalida el listado si el cambio VIAJÓ: encolado, releer del
      // servidor traería los datos de antes y borraría la fila optimista.
      if (!encolado) void cliente.invalidateQueries({ queryKey: queryKeys.auditorias.lista() })
      else setAviso('Sin señal: la emisión quedó en la cola y el servidor la fechará al sincronizar.')
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton alto={32} ancho="45%" />
        <Skeleton alto={420} radio={4} />
      </div>
    )
  }

  const emitido = Boolean(auditoria.informe_emitido_en)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--texto)' }}>
            Reporte final de auditoría interna
          </div>
          <div style={{ fontSize: 13, color: 'var(--texto-dim)', marginTop: 2 }}>
            {emitido
              ? `Emitido el ${formatDate(auditoria.informe_emitido_en)}`
              : 'Preliminar · todavía sin emitir'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variante="primario" onClick={imprimir}>
            Imprimir o guardar PDF
          </Button>
          <Button
            variante="secundario"
            cargando={guardando}
            onClick={() => cambiarEmision(!emitido)}
          >
            {emitido ? 'Retractar la emisión' : 'Marcar como emitido'}
          </Button>
        </div>
      </div>

      {error && <Aviso tono="error">{error}</Aviso>}
      {aviso && <Aviso tono="advertencia">{aviso}</Aviso>}

      {faltantes.length > 0 && (
        <Aviso tono="advertencia">
          El informe se puede imprimir así, pero le falta {faltantes.join(', ')}. Se completa en la
          pestaña Plan y en Equipo.
        </Aviso>
      )}

      {!auditoria.folio && (
        <Aviso tono="advertencia">
          Esta auditoría todavía no tiene folio —lo asigna el servidor al sincronizar—, así que el
          informe sale identificado sólo por su título.
        </Aviso>
      )}

      <p style={{ fontSize: 12, color: 'var(--texto-dim)', margin: 0 }}>
        Así se imprime. El documento se arma con lo que ya está descargado, así que funciona sin
        señal.
      </p>

      {/* ⚠️ `srcDoc` y no `src`: el documento vive en memoria, no en una URL.
          `sandbox` vacío lo deja sin permisos —ni scripts, ni acceso al padre—,
          que es lo que corresponde a un documento armado con texto que
          escribieron personas. Y `minHeight: 0` no hace falta aquí porque el
          alto es fijo, pero el contenedor sí scrollea por dentro. */}
      <iframe
        title="Vista previa del informe"
        srcDoc={documentoImprimible(tituloDelInforme(auditoria), html)}
        sandbox=""
        style={{
          width: '100%',
          // ⚠️ `var(--vh-full)`, nunca `vh` crudo (CLAUDE.md regla 4b): con el
          // armazón fijo la barra del navegador ya no se pliega, así que `70vh`
          // sería permanentemente más alto que lo visible.
          height: 'min(calc(var(--vh-full) * 0.7), 900px)',
          border: `1px solid var(--borde)`,
          borderRadius: 4,
          background: '#fff',
        }}
      />
    </div>
  )
}
