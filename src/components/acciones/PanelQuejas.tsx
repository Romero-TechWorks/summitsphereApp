'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import { normalizar } from '@/lib/utils/texto'
import { listarOrganizaciones, listarContactos, nombreDeOrganizacion } from '@/lib/queries/cartera'
import { listarProcesos } from '@/lib/queries/procesos'
import {
  actualizarQueja,
  crearQueja,
  enlazarSalida,
  listarQuejas,
  quienLaPuso,
  triarQueja,
  type DatosQueja,
  type QuejaEnCartera,
} from '@/lib/queries/quejas'
import { listarCambiosSgc, listarPlanesMejora } from '@/lib/queries/mejora'
import { TIPOS_QUEJA } from '@/lib/acciones/catalogos'
import { etiquetaDe } from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Textarea from '@/components/ui/Textarea'
import { IconoAlerta } from '@/components/ui/Iconos'
import LevantarNCDeQueja from './LevantarNCDeQueja'

/**
 * **Quejas y sugerencias** [F04·B1] — la hoja `F-SG-08` del cliente.
 *
 * ⚠️ **Dos ramas y dos destinos, y la pantalla tiene que enseñarlo.** Una queja
 * procedente **genera una no conformidad**; una sugerencia procedente **no** — va
 * a un cambio de SGC o a un plan de mejora (`P-SG-07` §5.5). Ofrecer el mismo
 * botón para las dos sería enseñar un camino que la base rechaza.
 *
 * ⚠️ **Improcedente se cierra, no se borra.** Que alguien se quejara y se le
 * contestara que no procede es parte del expediente: es lo que un certificador
 * pregunta cuando revisa satisfacción del cliente.
 *
 * ⚠️ **Es la puerta por la que una NC nace sin auditoría**, que era el punto
 * entero de `F04·B0`.
 */
export default function PanelQuejas() {
  const cliente = useQueryClient()
  const clave = queryKeys.acciones.quejas()

  const [texto, setTexto] = useState('')
  const [orgFiltro, setOrgFiltro] = useState('')
  const [verCerradas, setVerCerradas] = useState(false)
  const [creando, setCreando] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [levantando, setLevantando] = useState<QuejaEnCartera | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El formulario de alta.
  const [orgId, setOrgId] = useState('')
  const [tipo, setTipo] = useState('queja')
  const [fecha, setFecha] = useState(hoyISO())
  const [descripcion, setDescripcion] = useState('')
  const [contactoId, setContactoId] = useState('')
  const [nombreSuelto, setNombreSuelto] = useState('')
  const [procesoId, setProcesoId] = useState('')

  const { data: quejas = [], isPending } = useQuery({ queryKey: clave, queryFn: listarQuejas })

  const { data: organizaciones = [] } = useQuery({
    queryKey: queryKeys.cartera.organizaciones(),
    queryFn: listarOrganizaciones,
  })

  // ⚠️ Los desplegables también son datos: por `useQuery`, o sin señal llegan
  // vacíos y el guardado muere en la validación antes de encolarse.
  const { data: contactos = [] } = useQuery({
    queryKey: queryKeys.cartera.contactos(orgId),
    queryFn: () => listarContactos(orgId),
    enabled: Boolean(orgId),
  })

  const { data: procesos = [] } = useQuery({
    queryKey: queryKeys.sistemas.procesos(orgId),
    queryFn: () => listarProcesos(orgId),
    enabled: Boolean(orgId),
  })

  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    return quejas.filter((q) => {
      if (!verCerradas && q.estado === 'cerrada') return false
      if (orgFiltro && q.org_id !== orgFiltro) return false
      if (!aguja) return true
      return (
        normalizar(q.descripcion).includes(aguja) ||
        normalizar(q.folio).includes(aguja) ||
        normalizar(quienLaPuso(q)).includes(aguja) ||
        normalizar(q.organizacion ? nombreDeOrganizacion(q.organizacion) : '').includes(aguja)
      )
    })
  }, [quejas, texto, orgFiltro, verCerradas])

  const sinTriar = visibles.filter((q) => q.procede === null).length
  const cerradas = quejas.filter((q) => q.estado === 'cerrada').length

  async function guardar() {
    setOcupado(true)
    setError(null)
    try {
      const datos: DatosQueja = {
        tipo,
        fecha,
        descripcion: descripcion.trim(),
        contacto_id: contactoId || null,
        cliente_nombre: contactoId ? null : nombreSuelto.trim() || null,
        proceso_id: procesoId || null,
        observaciones: null,
      }

      const { fila, encolado } = await crearQueja({
        orgId,
        datos,
        contexto: {
          contacto: contactos.find((c) => c.id === contactoId)
            ? { id: contactoId, nombre: contactos.find((c) => c.id === contactoId)!.nombre, puesto: contactos.find((c) => c.id === contactoId)!.puesto }
            : null,
          proceso: procesos.find((p) => p.id === procesoId)
            ? { id: procesoId, nombre: procesos.find((p) => p.id === procesoId)!.nombre }
            : null,
        },
      })

      const org = organizaciones.find((o) => o.id === orgId) ?? null
      aplicarEscritura<QuejaEnCartera>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => [{ ...fila, organizacion: org }, ...previo],
      })

      setCreando(false)
      setDescripcion('')
      setNombreSuelto('')
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  async function ejecutar(hacer: () => Promise<{ fila: unknown; encolado: boolean }>) {
    setOcupado(true)
    setError(null)
    try {
      const { fila, encolado } = await hacer()
      const actualizada = fila as QuejaEnCartera
      aplicarEscritura<QuejaEnCartera>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) =>
          previo.map((q) => (q.id === actualizada.id ? { ...q, ...actualizada } : q)),
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
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px', maxWidth: 280 }}>
          <Input
            etiqueta="Buscar"
            etiquetaOculta
            placeholder="Folio, cliente o descripción"
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
        {!creando && (
          <Button tamano="sm" onClick={() => { setError(null); setCreando(true) }}>
            Registrar
          </Button>
        )}
        {cerradas > 0 && (
          <Button variante="fantasma" tamano="sm" onClick={() => setVerCerradas((v) => !v)}>
            {verCerradas ? 'Ocultar cerradas' : `Ver cerradas (${cerradas})`}
          </Button>
        )}
      </div>

      {sinTriar > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="advertencia">
            <strong>{sinTriar} sin decidir si {sinTriar === 1 ? 'procede' : 'proceden'}.</strong>{' '}
            Es la bifurcación del procedimiento: una queja procedente genera no conformidad;
            una improcedente se cierra con su explicación, y esa explicación es lo que se le
            contesta al cliente.
          </Aviso>
        </div>
      )}

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

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
                onChange={(e) => { setOrgId(e.target.value); setContactoId(''); setProcesoId('') }}
              >
                {organizaciones.map((org) => (
                  <option key={org.id} value={org.id}>{nombreDeOrganizacion(org)}</option>
                ))}
              </Select>
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <Select
                etiqueta="Tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                ayuda={
                  tipo === 'queja'
                    ? 'Si procede, genera una no conformidad.'
                    : 'Si procede, NO genera no conformidad: va a un cambio de SGC o a un plan de mejora.'
                }
              >
                {TIPOS_QUEJA.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                ))}
              </Select>
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <Input etiqueta="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          <Textarea
            etiqueta="Qué dijo el cliente"
            required
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px' }}>
              <Select
                etiqueta="Contacto"
                marcador="No está dado de alta"
                value={contactoId}
                onChange={(e) => setContactoId(e.target.value)}
                disabled={!orgId}
              >
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </Select>
            </div>
            {!contactoId && (
              <div style={{ flex: '1 1 180px' }}>
                <Input
                  etiqueta="Quién llamó"
                  value={nombreSuelto}
                  onChange={(e) => setNombreSuelto(e.target.value)}
                  ayuda="Cuando no está en el expediente, que es lo normal."
                />
              </div>
            )}
            <div style={{ flex: '1 1 180px' }}>
              <Select
                etiqueta="Proceso"
                marcador="Sin proceso"
                value={procesoId}
                onChange={(e) => setProcesoId(e.target.value)}
                disabled={!orgId}
              >
                {procesos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              tamano="sm"
              onClick={guardar}
              disabled={ocupado || !orgId || descripcion.trim() === ''}
            >
              {ocupado ? 'Guardando…' : 'Registrar'}
            </Button>
            <Button tamano="sm" variante="fantasma" onClick={() => setCreando(false)} disabled={ocupado}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={quejas.length === 0 ? 'Sin quejas ni sugerencias' : 'Nada con estos filtros'}
          descripcion={
            quejas.length === 0
              ? 'Se registran aquí las que llegan por teléfono, correo o en persona. Si una queja procede, de aquí sale su no conformidad.'
              : 'Prueba a quitar el filtro de cliente o el texto de búsqueda.'
          }
        />
      ) : (
        <Lista etiqueta="Quejas y sugerencias">
          {visibles.map((queja) => (
            <Fila
              key={queja.id}
              Icono={IconoAlerta}
              onClick={() => setAbierta(abierta === queja.id ? null : queja.id)}
              titulo={
                <>
                  <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                    {queja.folio || 'sin folio'}
                  </span>
                  {queja.descripcion}
                </>
              }
              meta={
                <>
                  {queja.organizacion && <span>{nombreDeOrganizacion(queja.organizacion)}</span>}
                  <span>{quienLaPuso(queja)}</span>
                  {queja.proceso && <span>{queja.proceso.nombre}</span>}
                  <span>{formatDateOnly(queja.fecha)}</span>
                  {queja.hallazgo && <span>NC {queja.hallazgo.folio}</span>}
                </>
              }
              derecha={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Badge>{etiquetaDe(TIPOS_QUEJA, queja.tipo)}</Badge>
                  <Badge
                    tono={
                      queja.procede === null ? 'advertencia'
                        : queja.procede ? 'info' : 'neutro'
                    }
                  >
                    {queja.procede === null ? 'Sin triar' : queja.procede ? 'Procede' : 'No procede'}
                  </Badge>
                </span>
              }
            />
          ))}
        </Lista>
      )}

      {abierta && (
        <DetalleQueja
          queja={visibles.find((q) => q.id === abierta) ?? null}
          ocupado={ocupado}
          alTriar={(procede, obs) => ejecutar(() => triarQueja(visibles.find((q) => q.id === abierta)!, procede, obs))}
          alActualizar={(datos) => ejecutar(() => actualizarQueja(visibles.find((q) => q.id === abierta)!, datos))}
          alLevantarNC={() => setLevantando(visibles.find((q) => q.id === abierta) ?? null)}
          alEnlazarSalida={(salida) =>
            ejecutar(() => enlazarSalida(visibles.find((q) => q.id === abierta)!, salida))
          }
        />
      )}

      {levantando && (
        <LevantarNCDeQueja
          queja={levantando}
          alCerrar={() => setLevantando(null)}
        />
      )}
    </>
  )
}

/** El expediente corto de una queja: triaje, avance y la salida que le toca. */
function DetalleQueja({
  queja,
  ocupado,
  alTriar,
  alActualizar,
  alLevantarNC,
  alEnlazarSalida,
}: {
  queja: QuejaEnCartera | null
  ocupado: boolean
  alTriar: (procede: boolean, observaciones: string) => void
  alActualizar: (datos: { avance_pct: number; estado: string; observaciones: string | null }) => void
  alLevantarNC: () => void
  alEnlazarSalida: (salida: { clase: 'cambio' | 'plan'; id: string }) => void
}) {
  const [motivo, setMotivo] = useState('')
  const [avance, setAvance] = useState(queja?.avance_pct ?? 0)
  const [salida, setSalida] = useState('')

  const { data: planes = [] } = useQuery({
    queryKey: queryKeys.acciones.planes(),
    queryFn: listarPlanesMejora,
  })

  const { data: cambios = [] } = useQuery({
    queryKey: queryKeys.acciones.cambios(),
    queryFn: listarCambiosSgc,
  })

  const salidas = useMemo(() => {
    if (!queja) return []
    return [
      ...cambios
        .filter((c) => c.org_id === queja.org_id && c.estado !== 'rechazado')
        .map((c) => ({ valor: `cambio:${c.id}`, etiqueta: `Cambio al SGC · ${c.nombre}` })),
      ...planes
        .filter((p) => p.org_id === queja.org_id)
        .map((p) => ({ valor: `plan:${p.id}`, etiqueta: `Plan de mejora · ${p.programa_de ?? p.anio}` })),
    ]
  }, [queja, cambios, planes])

  if (!queja) return null

  return (
    <section
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--verde-tinta)',
      }}
    >
      <h4 style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', margin: 0 }}>
        {queja.folio || 'Sin folio'} · {etiquetaDe(TIPOS_QUEJA, queja.tipo)}
      </h4>

      {queja.procede === null ? (
        <>
          <Textarea
            etiqueta="Observaciones"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            ayuda="Obligatorias si NO procede: es lo que se le contesta al cliente, y queda en el expediente."
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button tamano="sm" onClick={() => alTriar(true, motivo)} disabled={ocupado}>
              Procede
            </Button>
            <Button tamano="sm" variante="fantasma" onClick={() => alTriar(false, motivo)} disabled={ocupado}>
              No procede
            </Button>
          </div>
        </>
      ) : !queja.procede ? (
        <Aviso tono="info">
          <strong>No procede, y quedó cerrada.</strong>{' '}
          {queja.observaciones ?? 'Sin explicación registrada.'}
        </Aviso>
      ) : (
        <>
          {queja.tipo === 'queja' ? (
            queja.hallazgo ? (
              <Aviso tono="info">
                <strong>No conformidad {queja.hallazgo.folio}.</strong> {queja.hallazgo.descripcion}
              </Aviso>
            ) : (
              <>
                <Aviso tono="advertencia">
                  Una queja procedente <strong>genera una no conformidad</strong> y se trata por
                  el procedimiento de acciones correctivas (P-SG-05).
                </Aviso>
                <div>
                  <Button tamano="sm" onClick={alLevantarNC} disabled={ocupado}>
                    Levantar la no conformidad
                  </Button>
                </div>
              </>
            )
          ) : queja.cambio_sgc_id || queja.plan_mejora_id ? (
            <Aviso tono="info">
              <strong>Sugerencia atendida.</strong> Está enlazada con{' '}
              {queja.cambio_sgc_id ? 'un cambio al SGC' : 'un plan de mejora'}.
            </Aviso>
          ) : (
            <>
              <Aviso tono="info">
                Una <strong>sugerencia</strong> procedente no genera no conformidad: va a un
                cambio de SGC (F-SG-24) o a un plan de mejora (F-SG-16), según su alcance.
              </Aviso>
              {salidas.length === 0 ? (
                <p style={{ margin: 0, font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
                  Este cliente todavía no tiene ninguno de los dos. Créalo en su pestaña y vuelve
                  aquí para enlazarlo.
                </p>
              ) : (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 240px' }}>
                    <Select
                      etiqueta="Atender con"
                      marcador="Elige a dónde va"
                      value={salida}
                      onChange={(e) => setSalida(e.target.value)}
                    >
                      {salidas.map((s) => (
                        <option key={s.valor} value={s.valor}>{s.etiqueta}</option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    tamano="sm"
                    disabled={ocupado || salida === ''}
                    onClick={() => {
                      const [clase, id] = salida.split(':')
                      alEnlazarSalida({ clase: clase as 'cambio' | 'plan', id })
                    }}
                  >
                    Enlazar
                  </Button>
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '0 1 140px' }}>
              <Input
                etiqueta="Avance"
                type="number"
                min={0}
                max={100}
                value={String(avance)}
                onChange={(e) => setAvance(Number(e.target.value))}
              />
            </div>
            <Button
              tamano="sm"
              variante="fantasma"
              onClick={() => alActualizar({ avance_pct: avance, estado: queja.estado, observaciones: queja.observaciones })}
              disabled={ocupado}
            >
              Guardar avance
            </Button>
            {queja.estado !== 'cerrada' && (
              <Button
                tamano="sm"
                variante="fantasma"
                onClick={() => alActualizar({ avance_pct: 100, estado: 'cerrada', observaciones: queja.observaciones })}
                disabled={ocupado}
              >
                Cerrar
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
