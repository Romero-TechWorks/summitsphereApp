'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { listarOrganizaciones, nombreDeOrganizacion } from '@/lib/queries/cartera'
import {
  diasParaVencer,
  estaVencida,
  listarAcciones,
  type AccionEnCartera,
} from '@/lib/queries/acciones'
import {
  ESTADOS_ABIERTOS_ACCION,
  ESTADOS_ACCION,
  TIPOS_ACCION,
  folioDeAccion,
} from '@/lib/acciones/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { formatDateOnly } from '@/lib/utils/dates'
import { normalizar } from '@/lib/utils/texto'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import { IconoAcciones } from '@/components/ui/Iconos'
import FichaAccion from './FichaAccion'

type Agrupar = 'vencimiento' | 'cliente' | 'tipo'

/**
 * Los tramos de vencimiento, del más urgente al menos.
 *
 * ⚠️ **«Vencidas» va primero y no es un tramo de días**: una acción vencida no es
 * «hace mucho», es un incumplimiento que la firma tiene que poder enseñar
 * resuelto. Es lo primero que el Coordinador del SGC mira el lunes.
 */
const TRAMOS = [
  { clave: 'vencidas',  etiqueta: 'Vencidas',            hasta: -1 },
  { clave: 'semana',    etiqueta: 'Vencen esta semana',  hasta: 7 },
  { clave: 'mes',       etiqueta: 'Vencen este mes',     hasta: 30 },
  { clave: 'despues',   etiqueta: 'Más adelante',        hasta: Infinity },
] as const

/**
 * **La hoja «Control de Acciones» del `F-SG-17`** [F04·B1].
 *
 * Las acciones abiertas de **toda la cartera**, agrupadas por vencimiento, por
 * cliente o por tipo. No son las de una no conformidad: ésas viven en su ficha.
 *
 * ⚠️ **Sin vista de la base**, igual que el tablero del lunes y los widgets: una
 * vista es otra clave que puede faltar en la caché, y esta pantalla se abre con
 * media barra de señal. El vencimiento se calcula en memoria sobre la lista ya
 * bajada, y los filtros **no entran en la clave** (CLAUDE.md · offline, 7).
 *
 * ⚠️ **El contador ABIERTA / CERRADA va arriba, y es deliberado**: en la hoja del
 * cliente son las dos primeras celdas del encabezado, lo primero que se mira. La
 * app no lo iba a esconder detrás de un filtro.
 */
export default function TableroAcciones() {
  const [texto, setTexto] = useState('')
  const [agrupar, setAgrupar] = useState<Agrupar>('vencimiento')
  const [orgFiltro, setOrgFiltro] = useState('')
  const [verCerradas, setVerCerradas] = useState(false)
  const [abierta, setAbierta] = useState<AccionEnCartera | null>(null)
  // `?accion=<id>` abre su ficha: es a donde lleva el buscador global [F06·B4].
  const pedida = useSearchParams().get('accion')
  const [descartada, setDescartada] = useState<string | null>(null)
  const idAbierta = abierta?.id ?? (pedida && pedida !== descartada ? pedida : null)

  const { data: acciones = [], isPending } = useQuery({
    queryKey: queryKeys.acciones.lista(),
    queryFn: listarAcciones,
  })

  const { data: organizaciones = [] } = useQuery({
    queryKey: queryKeys.cartera.organizaciones(),
    queryFn: listarOrganizaciones,
  })

  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    return acciones.filter((a) => {
      if (!verCerradas && !ESTADOS_ABIERTOS_ACCION.includes(a.estado)) return false
      if (orgFiltro && a.org_id !== orgFiltro) return false
      if (!aguja) return true
      return (
        normalizar(a.descripcion).includes(aguja) ||
        normalizar(folioDeAccion(a)).includes(aguja) ||
        normalizar(a.hallazgo?.folio ?? '').includes(aguja) ||
        normalizar(a.proceso?.nombre ?? '').includes(aguja) ||
        normalizar(a.organizacion ? nombreDeOrganizacion(a.organizacion) : '').includes(aguja)
      )
    })
  }, [acciones, texto, orgFiltro, verCerradas])

  const grupos = useMemo(() => {
    const mapa = new Map<string, AccionEnCartera[]>()

    for (const accion of visibles) {
      const clave =
        agrupar === 'cliente'
          ? accion.organizacion ? nombreDeOrganizacion(accion.organizacion) : 'Sin cliente'
          : agrupar === 'tipo'
            ? etiquetaDe(TIPOS_ACCION, accion.tipo)
            : (TRAMOS.find((t) => diasParaVencer(accion) <= t.hasta) ?? TRAMOS[TRAMOS.length - 1]).etiqueta

      const lista = mapa.get(clave) ?? []
      lista.push(accion)
      mapa.set(clave, lista)
    }

    // Por vencimiento manda el orden de los tramos, no el alfabético: «Vencidas»
    // tiene que salir arriba aunque empiece por V.
    return agrupar === 'vencimiento'
      ? TRAMOS.map((t) => [t.etiqueta, mapa.get(t.etiqueta) ?? []] as const).filter(([, l]) => l.length > 0)
      : [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [visibles, agrupar])

  const totalAbiertas = acciones.filter((a) => ESTADOS_ABIERTOS_ACCION.includes(a.estado)).length
  const totalCerradas = acciones.length - totalAbiertas
  const vencidas = visibles.filter(estaVencida).length

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  return (
    <>
      {/* El encabezado del F-SG-17: dos celdas y nada más. */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
        <Contador etiqueta="Abiertas" valor={totalAbiertas} />
        <Contador etiqueta="Cerradas" valor={totalCerradas} />
        {vencidas > 0 && <Contador etiqueta="Vencidas" valor={vencidas} alerta />}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 200px', maxWidth: 280 }}>
          <Input
            etiqueta="Buscar"
            etiquetaOculta
            placeholder="Folio, proceso, cliente o descripción"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <div style={{ flex: '1 1 180px', maxWidth: 240 }}>
          <Select
            etiqueta="Cliente"
            etiquetaOculta
            marcador="Todos los clientes"
            value={orgFiltro}
            onChange={(e) => setOrgFiltro(e.target.value)}
          >
            {organizaciones.map((org) => (
              <option key={org.id} value={org.id}>{nombreDeOrganizacion(org)}</option>
            ))}
          </Select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {([
          ['vencimiento', 'Por vencimiento'],
          ['cliente', 'Por cliente'],
          ['tipo', 'Por tipo'],
        ] as [Agrupar, string][]).map(([valor, etiqueta]) => (
          <Button
            key={valor}
            variante={agrupar === valor ? 'primario' : 'fantasma'}
            tamano="sm"
            onClick={() => setAgrupar(valor)}
          >
            {etiqueta}
          </Button>
        ))}
        {totalCerradas > 0 && (
          <Button variante="fantasma" tamano="sm" onClick={() => setVerCerradas((v) => !v)}>
            {verCerradas ? 'Ocultar cerradas' : `Ver cerradas (${totalCerradas})`}
          </Button>
        )}
      </div>

      {grupos.length === 0 ? (
        <EstadoVacio
          titulo={acciones.length === 0 ? 'Todavía no hay acciones' : 'Nada que mostrar con estos filtros'}
          descripcion={
            acciones.length === 0
              ? 'Una acción nace de una no conformidad, de una queja o sola, como mejora. Se levanta desde la ficha del hallazgo.'
              : 'Prueba a quitar el filtro de cliente o el texto de búsqueda.'
          }
        />
      ) : (
        grupos.map(([grupo, suyas]) => (
          <section key={grupo} style={{ marginBottom: 22 }}>
            <h3 style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', margin: '0 0 6px' }}>
              {grupo}
              <span style={{ marginLeft: 8, color: 'var(--texto-dim)' }}>{suyas.length}</span>
            </h3>

            <Lista etiqueta={`Acciones de ${grupo}`}>
              {suyas.map((accion) => {
                const dias = diasParaVencer(accion)
                const vencida = estaVencida(accion)

                return (
                  <Fila
                    key={accion.id}
                    Icono={IconoAcciones}
                    onClick={() => setAbierta(accion)}
                    titulo={
                      <>
                        <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                          {folioDeAccion(accion)}
                        </span>
                        {accion.descripcion}
                      </>
                    }
                    meta={
                      <>
                        {agrupar !== 'cliente' && accion.organizacion && (
                          <span>{nombreDeOrganizacion(accion.organizacion)}</span>
                        )}
                        {agrupar !== 'tipo' && <span>{etiquetaDe(TIPOS_ACCION, accion.tipo)}</span>}
                        {accion.proceso && <span>{accion.proceso.nombre}</span>}
                        {accion.hallazgo && <span>{accion.hallazgo.folio}</span>}
                        <span style={vencida ? { color: 'var(--error, #c0392b)' } : undefined}>
                          {vencida
                            ? `Venció el ${formatDateOnly(accion.fecha_compromiso)}`
                            : ESTADOS_ABIERTOS_ACCION.includes(accion.estado)
                              ? `Vence en ${dias} día${dias === 1 ? '' : 's'}`
                              : `Compromiso ${formatDateOnly(accion.fecha_compromiso)}`}
                        </span>
                      </>
                    }
                    derecha={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {/* El % de avance del F-SG-17 col. M, como texto y no como
                            barra: en una lista de cuarenta, cuarenta barras son
                            ruido y el número se compara de un vistazo. */}
                        {ESTADOS_ABIERTOS_ACCION.includes(accion.estado) && (
                          <span className="mono" style={{ color: 'var(--texto-dim)' }}>
                            {accion.avance_pct} %
                          </span>
                        )}
                        <Badge tono={tonoDe(ESTADOS_ACCION, accion.estado)}>
                          {etiquetaDe(ESTADOS_ACCION, accion.estado)}
                        </Badge>
                      </span>
                    }
                  />
                )
              })}
            </Lista>
          </section>
        ))
      )}

      {idAbierta && (
        <FichaAccion
          accionId={idAbierta}
          alCerrar={() => { setAbierta(null); setDescartada(pedida) }}
        />
      )}
    </>
  )
}

function Contador({ etiqueta, valor, alerta = false }: { etiqueta: string; valor: number; alerta?: boolean }) {
  return (
    <div>
      <div
        className="mono"
        style={{
          font: 'var(--txt-cifra, 600 26px/1.1 system-ui)',
          color: alerta ? 'var(--error, #c0392b)' : 'var(--texto)',
        }}
      >
        {valor}
      </div>
      <div style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>{etiqueta}</div>
    </div>
  )
}
