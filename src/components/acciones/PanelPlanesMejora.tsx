'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { listarOrganizaciones, nombreDeOrganizacion } from '@/lib/queries/cartera'
import {
  cambiarEstadoPlan,
  crearPlanMejora,
  cumplimiento,
  leerCalendario,
  listarPlanesMejora,
  type PlanEnCartera,
} from '@/lib/queries/mejora'
import { listarAccionesDelPlan, marcarMeses, type AccionConContexto } from '@/lib/queries/acciones'
import { ESTADOS_PLAN_MEJORA, folioDeAccion } from '@/lib/acciones/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Textarea from '@/components/ui/Textarea'
import { IconoCalendario } from '@/components/ui/Iconos'

const MESES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const

/**
 * **Planes de mejora** [F04·B1] — el `F-SG-16` del cliente.
 *
 * ⚠️ **NO es «acciones con tipo = mejora»**, que es lo que el índice del catálogo
 * supuso hasta que llegó el formato. Es un **contenedor** de varias acciones con
 * calendario anual **programado / real**, y es **condicional**: `P-SG-05` §5.5 lo
 * pide sólo cuando las acciones correctivas requieren «una planeación de mayor
 * complejidad para su entendimiento y cierre efectivo».
 *
 * ⚠️ **La parrilla es la misma del `F-SG-09`, con una fila más.** Allá hay una
 * línea de meses; aquí hay dos, `P` y `R`. Y como en `D06`, **los doce meses van
 * en un `jsonb` y viajan en una sola escritura**: marcar seis serían seis
 * operaciones de la cola, y sin señal podrían llegar desparejadas.
 */
export default function PanelPlanesMejora() {
  const cliente = useQueryClient()
  const clave = queryKeys.acciones.planes()

  const [creando, setCreando] = useState(false)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [orgId, setOrgId] = useState('')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [programaDe, setProgramaDe] = useState('')
  const [alcance, setAlcance] = useState('')
  const [objetivo, setObjetivo] = useState('')

  const { data: planes = [], isPending } = useQuery({ queryKey: clave, queryFn: listarPlanesMejora })

  const { data: organizaciones = [] } = useQuery({
    queryKey: queryKeys.cartera.organizaciones(),
    queryFn: listarOrganizaciones,
  })

  async function guardar() {
    setOcupado(true)
    setError(null)
    try {
      const { fila, encolado } = await crearPlanMejora({
        orgId,
        datos: {
          anio,
          programa_de: programaDe.trim() || null,
          alcance: alcance.trim() || null,
          objetivo: objetivo.trim() || null,
        },
      })
      const org = organizaciones.find((o) => o.id === orgId) ?? null
      aplicarEscritura<PlanEnCartera>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => [{ ...fila, organizacion: org }, ...previo],
      })
      setCreando(false)
      setProgramaDe('')
      setAlcance('')
      setObjetivo('')
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  async function moverEstado(plan: PlanEnCartera, estado: string) {
    setOcupado(true)
    setError(null)
    try {
      const { fila, encolado } = await cambiarEstadoPlan(plan, estado)
      aplicarEscritura<PlanEnCartera>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.map((p) => (p.id === fila.id ? fila : p)),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Aviso tono="info">
          Un plan de mejora <strong>no es una acción más</strong>: agrupa varias con un
          calendario a doce meses. P-SG-05 §5.5 lo pide sólo cuando las acciones correctivas
          necesitan una planeación que no cabe en una fecha compromiso.
        </Aviso>
      </div>

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {!creando && (
        <div style={{ marginBottom: 14 }}>
          <Button tamano="sm" onClick={() => { setError(null); setCreando(true) }}>
            Nuevo plan
          </Button>
        </div>
      )}

      {creando && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18,
            paddingBottom: 14, borderBottom: '1px solid var(--verde-tinta)',
          }}
        >
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <Select
                etiqueta="Cliente"
                required
                marcador="Elige el cliente"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                {organizaciones.map((org) => (
                  <option key={org.id} value={org.id}>{nombreDeOrganizacion(org)}</option>
                ))}
              </Select>
            </div>
            <div style={{ flex: '0 1 120px' }}>
              <Input
                etiqueta="Año"
                type="number"
                min={2000}
                max={2100}
                value={String(anio)}
                onChange={(e) => setAnio(Number(e.target.value))}
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <Input
                etiqueta="Programa de"
                value={programaDe}
                onChange={(e) => setProgramaDe(e.target.value)}
                ayuda="Cómo lo llama el cliente en su hoja."
              />
            </div>
          </div>
          <Textarea etiqueta="Alcance" value={alcance} onChange={(e) => setAlcance(e.target.value)} />
          <Textarea etiqueta="Objetivo" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button tamano="sm" onClick={guardar} disabled={ocupado || !orgId}>
              {ocupado ? 'Guardando…' : 'Crear'}
            </Button>
            <Button tamano="sm" variante="fantasma" onClick={() => setCreando(false)} disabled={ocupado}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {planes.length === 0 ? (
        <EstadoVacio
          titulo="Sin planes de mejora"
          descripcion="Se crea uno cuando un conjunto de acciones necesita calendario propio. No es obligatorio: la mayoría de las no conformidades se cierran sin él."
        />
      ) : (
        <Lista etiqueta="Planes de mejora">
          {planes.map((plan) => (
            <Fila
              key={plan.id}
              Icono={IconoCalendario}
              onClick={() => setAbierto(abierto === plan.id ? null : plan.id)}
              titulo={plan.programa_de ?? `Plan de mejora ${plan.anio}`}
              meta={
                <>
                  {plan.organizacion && <span>{nombreDeOrganizacion(plan.organizacion)}</span>}
                  <span>{plan.anio}</span>
                  {plan.objetivo && <span>{plan.objetivo}</span>}
                </>
              }
              derecha={
                <Badge tono={tonoDe(ESTADOS_PLAN_MEJORA, plan.estado)}>
                  {etiquetaDe(ESTADOS_PLAN_MEJORA, plan.estado)}
                </Badge>
              }
            />
          ))}
        </Lista>
      )}

      {abierto && (
        <Parrilla
          plan={planes.find((p) => p.id === abierto)!}
          ocupado={ocupado}
          alMoverEstado={moverEstado}
        />
      )}
    </>
  )
}

/** La parrilla anual del `F-SG-16`: un renglón por acción, dos líneas P y R. */
function Parrilla({
  plan,
  ocupado,
  alMoverEstado,
}: {
  plan: PlanEnCartera
  ocupado: boolean
  alMoverEstado: (plan: PlanEnCartera, estado: string) => void
}) {
  const cliente = useQueryClient()
  const clave = queryKeys.acciones.delPlan(plan.id)
  const [error, setError] = useState<string | null>(null)

  const { data: acciones = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarAccionesDelPlan(plan.id),
  })

  const calendarios = useMemo(
    () => new Map(acciones.map((a) => [a.id, leerCalendario(a.meses)])),
    [acciones],
  )

  async function alternar(accion: AccionConContexto, linea: 'p' | 'r', mes: number) {
    const actual = calendarios.get(accion.id) ?? leerCalendario(null)
    const siguiente = {
      p: [...actual.p],
      r: [...actual.r],
    }
    siguiente[linea][mes] = !siguiente[linea][mes]

    setError(null)
    try {
      const { fila, encolado } = await marcarMeses(accion, siguiente)
      aplicarEscritura<AccionConContexto>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.map((a) => (a.id === fila.id ? fila : a)),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  const editable = plan.estado === 'borrador'

  return (
    <section
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--verde-tinta)',
      }}
    >
      <h4
        style={{
          font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', margin: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}
      >
        <span>{plan.programa_de ?? `Plan ${plan.anio}`} · calendario</span>
        <span style={{ display: 'inline-flex', gap: 8 }}>
          {plan.estado === 'borrador' && (
            <Button tamano="sm" variante="fantasma" onClick={() => alMoverEstado(plan, 'aprobado')} disabled={ocupado}>
              Aprobar
            </Button>
          )}
          {plan.estado === 'aprobado' && (
            <Button tamano="sm" variante="fantasma" onClick={() => alMoverEstado(plan, 'cerrado')} disabled={ocupado}>
              Cerrar
            </Button>
          )}
        </span>
      </h4>

      {error && <Aviso tono="error">{error}</Aviso>}

      {!editable && (
        <Aviso tono="info">
          El plan está <strong>{etiquetaDe(ESTADOS_PLAN_MEJORA, plan.estado).toLowerCase()}</strong>:
          el calendario ya no se edita. Es un entregable con firmas al pie.
        </Aviso>
      )}

      {isPending ? (
        <Skeleton alto={80} radio={4} />
      ) : acciones.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--texto-dim)' }}>
          Todavía no hay acciones en este plan. Se añaden desde la ficha de una no conformidad,
          eligiendo este plan como contenedor.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', padding: '4px 8px 4px 0' }}>
                  Acción
                </th>
                <th style={{ width: 22 }}></th>
                {MESES.map((m, i) => (
                  <th key={i} style={{ width: 22, font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>{m}</th>
                ))}
                <th style={{ width: 54, font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', textAlign: 'right' }}>
                  Avance
                </th>
              </tr>
            </thead>
            <tbody>
              {acciones.map((accion) => {
                const cal = calendarios.get(accion.id) ?? leerCalendario(null)
                const pct = cumplimiento(cal)

                return (['p', 'r'] as const).map((linea) => (
                  <tr key={`${accion.id}-${linea}`}>
                    {linea === 'p' && (
                      <td rowSpan={2} style={{ padding: '4px 8px 4px 0', verticalAlign: 'top' }}>
                        <div>{accion.descripcion}</div>
                        <div className="mono" style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
                          {folioDeAccion(accion)}
                          {accion.contacto && ` · ${accion.contacto.nombre}`}
                        </div>
                      </td>
                    )}
                    <td style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
                      {linea === 'p' ? 'P' : 'R'}
                    </td>
                    {MESES.map((_, mes) => (
                      <td key={mes} style={{ textAlign: 'center', padding: 1 }}>
                        <button
                          type="button"
                          aria-label={`${linea === 'p' ? 'Programado' : 'Real'} · mes ${mes + 1} de ${accion.descripcion}`}
                          aria-pressed={cal[linea][mes]}
                          disabled={!editable}
                          onClick={() => alternar(accion, linea, mes)}
                          style={{
                            width: 18, height: 18, borderRadius: 3, padding: 0,
                            border: '1px solid var(--borde-fuerte)',
                            background: cal[linea][mes]
                              ? (linea === 'p' ? 'var(--verde-tinta)' : 'var(--exito)')
                              : 'transparent',
                            cursor: editable ? 'pointer' : 'default',
                          }}
                        />
                      </td>
                    ))}
                    {linea === 'p' && (
                      <td rowSpan={2} className="mono" style={{ textAlign: 'right', color: 'var(--texto-dim)' }}>
                        {pct === null ? '—' : `${pct} %`}
                      </td>
                    )}
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ margin: 0, font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
        <strong>P</strong> es lo programado y <strong>R</strong> lo realmente hecho. El avance
        cuenta los meses reales sobre los programados, que es como lo lee la hoja del cliente.
      </p>
    </section>
  )
}
