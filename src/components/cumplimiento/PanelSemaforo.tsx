'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { listarObligaciones, type ObligacionConContexto } from '@/lib/queries/obligaciones'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Skeleton from '@/components/ui/Skeleton'
import BarraAvance from '@/components/sistemas/BarraAvance'
import SelectorSitio, { enElSitio, useSitioSeleccionado } from './SelectorSitio'

type Conteo = {
  clave: string
  titulo: string
  aplican: number
  cumple: number
  parcial: number
  noCumple: number
  enProceso: number
  sinEvaluar: number
}

function contar(filas: ObligacionConContexto[], agrupar: (o: ObligacionConContexto) => [string, string]): Conteo[] {
  const grupos = new Map<string, Conteo>()
  for (const o of filas) {
    const [clave, titulo] = agrupar(o)
    const g = grupos.get(clave) ?? {
      clave, titulo, aplican: 0, cumple: 0, parcial: 0, noCumple: 0, enProceso: 0, sinEvaluar: 0,
    }
    g.aplican += 1
    if (o.estado_cumplimiento === 'cumple') g.cumple += 1
    else if (o.estado_cumplimiento === 'parcial') g.parcial += 1
    else if (o.estado_cumplimiento === 'no_cumple') g.noCumple += 1
    else if (o.estado_cumplimiento === 'en_proceso') g.enProceso += 1
    else g.sinEvaluar += 1
    grupos.set(clave, g)
  }
  return [...grupos.values()].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'))
}

/**
 * **El semáforo** [F05·B1]: cuánto cumple el cliente, por NOM y por sitio.
 *
 * ⚠️ **Sin vista en la base**, igual que los widgets del tablero: se cuenta en
 * memoria sobre la matriz que ya está en la caché. Una vista sería otra clave
 * que puede faltar sin señal, y ésta es la pantalla que se enseña al cliente al
 * terminar el recorrido.
 *
 * ⚠️ **Sólo cuenta lo que APLICA.** Un «no aplica» no es un cumplimiento: meterlo
 * en el denominador inflaría el porcentaje que ve la Dirección del cliente.
 *
 * ⚠️ **El porcentaje es de «cumple» sobre lo que aplica**, no sobre lo evaluado:
 * un recorrido a medias no puede salir al 100 % sólo porque lo poco que se miró
 * estaba bien. Lo que falta por evaluar se dice aparte.
 */
export default function PanelSemaforo({ orgId }: { orgId: string }) {
  const { sitioId, sitios, elegir } = useSitioSeleccionado(orgId)

  const { data: obligaciones = [], isPending } = useQuery({
    queryKey: queryKeys.cumplimiento.obligaciones(orgId),
    queryFn: () => listarObligaciones(orgId),
  })

  const aplicables = useMemo(
    () => obligaciones.filter((o) => o.aplica === true && enElSitio(o.sitio_id, sitioId)),
    [obligaciones, sitioId],
  )

  const porNom = useMemo(
    () => contar(aplicables, (o) =>
      o.nom ? [o.nom.id, `${o.nom.clave} · ${o.nom.nombre}`] : ['_sin_nom', 'Leyes, contratos y compromisos voluntarios'],
    ),
    [aplicables],
  )

  const porSitio = useMemo(
    () => contar(aplicables, (o) => {
      if (!o.sitio_id) return ['_org', 'De la organización']
      return [o.sitio_id, sitios.find((s) => s.id === o.sitio_id)?.nombre ?? 'Sitio']
    }),
    [aplicables, sitios],
  )

  const [total] = contar(aplicables, () => ['total', 'Total'])

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  return (
    <>
      <div style={{ maxWidth: 420, marginBottom: 16 }}>
        <SelectorSitio sitioId={sitioId} sitios={sitios} elegir={elegir} />
      </div>

      {!total ? (
        <EstadoVacio
          titulo="Todavía no hay nada que contar"
          descripcion="El semáforo cuenta las obligaciones que aplican. Genera la matriz, decide qué aplica y recórrela: aquí sale el resultado."
        />
      ) : (
        <>
          <Bloque conteo={total} destacado />

          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto)', margin: '24px 0 10px' }}>Por NOM</h3>
          {porNom.map((c) => <Bloque key={c.clave} conteo={c} />)}

          {porSitio.length > 1 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto)', margin: '24px 0 10px' }}>Por sitio</h3>
              {porSitio.map((c) => <Bloque key={c.clave} conteo={c} />)}
            </>
          )}
        </>
      )}
    </>
  )
}

function Bloque({ conteo: c, destacado = false }: { conteo: Conteo; destacado?: boolean }) {
  const evaluadas = c.aplican - c.sinEvaluar
  const partes = [
    `${c.cumple} cumple${c.cumple === 1 ? '' : 'n'}`,
    c.parcial > 0 ? `${c.parcial} parcial${c.parcial === 1 ? '' : 'es'}` : null,
    c.noCumple > 0 ? `${c.noCumple} no cumple${c.noCumple === 1 ? '' : 'n'}` : null,
    c.enProceso > 0 ? `${c.enProceso} en proceso` : null,
    c.sinEvaluar > 0 ? `${c.sinEvaluar} sin evaluar` : null,
  ].filter(Boolean)

  return (
    <div style={destacado ? { marginBottom: 8 } : undefined}>
      <BarraAvance
        porcentaje={c.aplican === 0 ? 0 : (c.cumple / c.aplican) * 100}
        etiqueta={destacado ? `Cumplimiento general · ${evaluadas} de ${c.aplican} evaluadas` : c.titulo}
        detalle={partes.join(' · ')}
      />
    </div>
  )
}
