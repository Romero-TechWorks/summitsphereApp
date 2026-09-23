'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { obtenerIdentidadFirma } from '@/lib/queries/firma'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import { describirPlazo, diasDelPlazo, leerPlazos, proponerFechaCompromiso } from './plazos'

/**
 * La fecha compromiso de un hallazgo, **propuesta por los plazos de la firma**
 * mientras nadie la toque [F06·B3].
 *
 * ⚠️ **La propuesta se DERIVA, no se copia a un `useState`.** El valor que se
 * enseña es `manual ?? propuesta`: cambiar el tipo de NC menor a NC mayor mueve
 * la fecha sola, y en cuanto el auditor la escribe a mano deja de moverse. Con
 * un efecto que copiara la propuesta al estado, el primer render saldría vacío
 * y un cambio de tipo pisaría una fecha negociada con el cliente.
 *
 * ⚠️ **Sin configuración en la caché no se propone nada**, en vez de caer a
 * los plazos de fábrica: la firma pudo cambiarlos, y proponer 30 días cuando la
 * firma dice 20 es peor que dejar el campo vacío. La consulta es la del membrete
 * (`firma.identidad()`), que ya baja la precarga de la auditoría.
 *
 * @param inicial   `undefined` en un hallazgo NUEVO: se propone. En uno que ya
 *                  existe, su fecha guardada —o `null`— cuenta como puesta a
 *                  mano: corregir la redacción de un hallazgo viejo no le
 *                  inventa una fecha compromiso que nadie acordó.
 * @param desde     Desde cuándo corre el plazo. Hoy, para un hallazgo nuevo.
 */
export function usePlazoPropuesto(tipo: string, inicial: string | null | undefined, desde: string = hoyISO()) {
  const { data: firma } = useQuery({
    queryKey: queryKeys.firma.identidad(),
    queryFn: obtenerIdentidadFirma,
  })

  const [manual, setManual] = useState<string | null>(inicial === undefined ? null : (inicial ?? ''))

  const plazos = firma ? leerPlazos(firma.plazos_default) : null
  const dias = plazos ? diasDelPlazo(tipo, plazos) : null
  const propuesta = plazos && dias !== null ? proponerFechaCompromiso(tipo, plazos, desde) : null

  const valor = manual ?? propuesta ?? ''

  const ayuda = plazos && dias !== null && propuesta
    ? `Plazo de la firma: ${describirPlazo(dias, plazos.unidad)} → ${formatDateOnly(propuesta)}.`
    : null

  return {
    /** Lo que va en el `<input type="date">` y lo que se guarda. */
    valor,
    /** La fecha que propone la firma para este tipo, o `null`. */
    propuesta,
    /** «Plazo de la firma: 30 días hábiles → 5 nov 2026.» */
    ayuda,
    /** Si el valor ya no es la propuesta: la escribió alguien. */
    movida: manual !== null && propuesta !== null && manual !== propuesta,
    /** El auditor escribe (o borra) la fecha: a partir de aquí manda él. */
    escribir: (fecha: string) => setManual(fecha),
    /** Volver a la fecha que propone la firma. */
    usarPropuesta: () => setManual(null),
  }
}
