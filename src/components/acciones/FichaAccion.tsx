'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDate, formatDateOnly, hoyISO } from '@/lib/utils/dates'
import {
  cancelarAccion,
  diasParaVencer,
  estaVencida,
  listarAcciones,
  marcarAvance,
  programarVerificacion,
  reprogramarAccion,
  verificarEficacia,
  type AccionEnCartera,
} from '@/lib/queries/acciones'
import {
  ESTADOS_ABIERTOS_ACCION,
  ESTADOS_ACCION,
  RESULTADOS_EFICACIA,
  TIPOS_ACCION,
  folioDeAccion,
} from '@/lib/acciones/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import PanelAdjuntos from '@/components/adjuntos/PanelAdjuntos'

type Formulario = 'ninguno' | 'avance' | 'reprogramar' | 'verificar' | 'cancelar'

/**
 * El expediente de una acción [F04·B1] — la mitad derecha del `F-SG-17`.
 *
 * ⚠️ **NO HAY BOTÓN DE CERRAR SUELTO, Y ES EL PUNTO DE TODA LA FASE.** Una acción
 * se cierra **verificando su eficacia**, nunca marcándola cerrada: lo impone
 * `acciones_cierre_con_eficacia` en la base, y aquí la interfaz no ofrece el
 * atajo. Cerrar sin verificar es el error más común en los SGC reales, y una app
 * que ofrece el botón lo institucionaliza.
 *
 * ⚠️ **Ni botón de borrar.** Una acción que se decidió no ejecutar explica por
 * qué la NC sigue abierta: se **cancela con motivo** (regla 13).
 *
 * ⚠️ **Reprogramar es su propio formulario, no un campo de fecha editable.**
 * `P-SG-05` §5.6 exige justificar cada demora ante el Coordinador SGC —y ante la
 * Dirección si hay reincidencia o queja de cliente—, y la base rechaza el cambio
 * si el motivo falta o repite el de la vez pasada.
 */
export default function FichaAccion({
  accionId,
  alCerrar,
}: {
  accionId: string
  alCerrar: () => void
}) {
  const cliente = useQueryClient()
  const clave = queryKeys.acciones.lista()

  const [formulario, setFormulario] = useState<Formulario>('ninguno')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [avance, setAvance] = useState(0)
  const [monitoreo, setMonitoreo] = useState('')
  const [fechaNueva, setFechaNueva] = useState('')
  const [motivo, setMotivo] = useState('')
  const [fechaEficacia, setFechaEficacia] = useState(hoyISO())
  const [resultado, setResultado] = useState('eficaz')
  const [evidencia, setEvidencia] = useState('')

  const { data: acciones = [] } = useQuery({
    queryKey: clave,
    queryFn: listarAcciones,
  })

  // ⚠️ Se lee de la CACHÉ y no de un `useState` propio: la caché es lo único que
  // se persiste, así que copiar la fila a un estado local haría reaparecer la
  // versión vieja al remontar aunque el cambio siguiera en la cola
  // (CLAUDE.md · reglas del offline, 2).
  const accion = useMemo(
    () => acciones.find((a) => a.id === accionId) ?? null,
    [acciones, accionId],
  )

  if (!accion) return null

  const abierta = ESTADOS_ABIERTOS_ACCION.includes(accion.estado)
  const vencida = estaVencida(accion)
  const dias = diasParaVencer(accion)

  function abrir(cual: Formulario) {
    setError(null)
    setFormulario(cual)
    if (!accion) return
    if (cual === 'avance') {
      setAvance(accion.avance_pct)
      setMonitoreo(accion.monitoreo ?? '')
    }
    if (cual === 'reprogramar') {
      setFechaNueva(accion.fecha_compromiso)
      setMotivo('')
    }
    if (cual === 'cancelar') setMotivo('')
    if (cual === 'verificar') {
      setFechaEficacia(hoyISO())
      setResultado('eficaz')
      setEvidencia(accion.eficacia_evidencia ?? '')
    }
  }

  async function ejecutar(accionar: () => Promise<{ fila: AccionEnCartera | unknown; encolado: boolean }>) {
    setOcupado(true)
    setError(null)
    try {
      const { fila, encolado } = await accionar()
      const actualizada = fila as AccionEnCartera
      aplicarEscritura<AccionEnCartera>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) =>
          previo.map((a) => (a.id === actualizada.id ? { ...a, ...actualizada } : a)),
      })
      if (!encolado && accion) {
        void cliente.invalidateQueries({
          queryKey: queryKeys.acciones.delHallazgo(accion.hallazgo_id ?? ''),
        })
      }
      setFormulario('ninguno')
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Modal abierto alCerrar={alCerrar} titulo={folioDeAccion(accion)} ancho={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Encabezado ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge tono={tonoDe(ESTADOS_ACCION, accion.estado)}>
            {etiquetaDe(ESTADOS_ACCION, accion.estado)}
          </Badge>
          <Badge>{etiquetaDe(TIPOS_ACCION, accion.tipo)}</Badge>
          {vencida && <Badge tono="error">Vencida</Badge>}
          {/* ⚠️ Los dos folios conviven: el del cliente es el que su Coordinador
              busca en su hoja, el nuestro identifica la fila en el expediente. */}
          {accion.folio_cliente && (
            <span className="mono" style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
              {accion.folio}
            </span>
          )}
        </div>

        <p style={{ margin: 0 }}>{accion.descripcion}</p>

        <Datos
          filas={[
            ['Proceso', accion.proceso?.nombre ?? '—'],
            ['Responsable', accion.contacto?.nombre ?? accion.responsable?.nombre ?? '—'],
            [
              'Fecha compromiso',
              accion.fecha_compromiso_original
                ? `${formatDateOnly(accion.fecha_compromiso)} · reprogramada desde ${formatDateOnly(accion.fecha_compromiso_original)}`
                : formatDateOnly(accion.fecha_compromiso),
            ],
            ...(abierta ? [['Vence', vencida ? `hace ${-dias} días` : `en ${dias} días`] as [string, string]] : []),
            ['Avance', `${accion.avance_pct} %`],
            ...(accion.hallazgo ? [['No conformidad', `${accion.hallazgo.folio} — ${accion.hallazgo.descripcion}`] as [string, string]] : []),
          ]}
        />

        {/* ⚠️ La justificación de la última demora se PINTA. Es lo que el
            Coordinador SGC tiene que poder leer sin abrir la bitácora, y lo que
            escala a Dirección si se repite (P-SG-05 §5.6). */}
        {accion.motivo_reprogramacion && (
          <Aviso tono="advertencia">
            <strong>Reprogramada.</strong> {accion.motivo_reprogramacion}
          </Aviso>
        )}

        {accion.monitoreo && (
          <div>
            <h4 style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', margin: '0 0 4px' }}>
              Seguimiento
            </h4>
            <p style={{ margin: 0 }}>{accion.monitoreo}</p>
          </div>
        )}

        {/* ── La verificación de eficacia ─────────────────────────────── */}
        {accion.eficacia_verificada_en ? (
          <Aviso tono={accion.eficacia_resultado === 'eficaz' ? 'exito' : 'advertencia'}>
            <strong>Eficacia: {etiquetaDe(RESULTADOS_EFICACIA, accion.eficacia_resultado)}.</strong>
            <span style={{ display: 'block', margin: '4px 0' }}>{accion.eficacia_evidencia}</span>
            <span style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
              Verificada el {formatDateOnly(accion.eficacia_verificada_en)}
              {accion.cerrada_en && ` · cerrada el ${formatDate(accion.cerrada_en)}`}
            </span>
            {accion.eficacia_resultado === 'no_eficaz' && (
              <p style={{ margin: '8px 0 0' }}>
                Las acciones no fueron efectivas. <strong>No se reabre ésta</strong>: se levanta
                una no conformidad nueva enlazada a la anterior (P-SG-05 §5.7).
              </p>
            )}
          </Aviso>
        ) : accion.eficacia_fecha_programada ? (
          <Aviso tono="info">
            <strong>Verificación programada.</strong> Se comprobará el{' '}
            {formatDateOnly(accion.eficacia_fecha_programada)}.
          </Aviso>
        ) : abierta ? (
          <Aviso tono="info">
            <strong>Sin verificar.</strong> Esta acción no se puede cerrar hasta comprobar que
            sirvió. Es lo que un organismo certificador revisa, y la base no deja saltárselo.
          </Aviso>
        ) : null}

        {/* ── Los formularios ────────────────────────────────────────── */}
        {error && <Aviso tono="error">{error}</Aviso>}

        {formulario === 'avance' && (
          <Cuadro titulo="Registrar avance">
            <Input
              etiqueta="Avance"
              type="number"
              min={0}
              max={100}
              value={String(avance)}
              onChange={(e) => setAvance(Number(e.target.value))}
              ayuda="El porcentaje que el F-SG-17 lleva en su columna M."
            />
            <Textarea
              etiqueta="Seguimiento"
              value={monitoreo}
              onChange={(e) => setMonitoreo(e.target.value)}
              ayuda="Qué se ha hecho desde la última revisión. Es la nota del Coordinador, distinta de la evidencia de cierre."
            />
            <Botones
              ocupado={ocupado}
              alCancelar={() => setFormulario('ninguno')}
              alAceptar={() => ejecutar(() => marcarAvance(accion, avance, monitoreo.trim() || null))}
            />
          </Cuadro>
        )}

        {formulario === 'reprogramar' && (
          <Cuadro titulo="Mover la fecha compromiso">
            <Input
              etiqueta="Nueva fecha"
              type="date"
              value={fechaNueva}
              onChange={(e) => setFechaNueva(e.target.value)}
            />
            <Textarea
              etiqueta="Justificación de la demora"
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              ayuda="P-SG-05 §5.6 la exige, y tiene que ser distinta de la anterior. Si hay reincidencia o queja de cliente, escala a Dirección."
            />
            <Botones
              ocupado={ocupado}
              alCancelar={() => setFormulario('ninguno')}
              alAceptar={() => ejecutar(() => reprogramarAccion(accion, fechaNueva, motivo))}
            />
          </Cuadro>
        )}

        {formulario === 'verificar' && (
          <Cuadro titulo="Verificar la eficacia">
            <Input
              etiqueta="Fecha de verificación"
              type="date"
              value={fechaEficacia}
              onChange={(e) => setFechaEficacia(e.target.value)}
            />
            <Select
              etiqueta="¿Fue efectiva?"
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
            >
              {RESULTADOS_EFICACIA.map((o) => (
                <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
              ))}
            </Select>
            <Textarea
              etiqueta="Qué se comprobó"
              required
              value={evidencia}
              onChange={(e) => setEvidencia(e.target.value)}
              ayuda="La evidencia objetiva de que el problema no volvió. Es lo que se le enseña al certificador."
            />
            {resultado !== 'eficaz' && (
              <Aviso tono="advertencia">
                <strong>Esto no cierra la acción.</strong> Sólo un resultado «eficaz» la cierra:
                con «parcial» sigue abierta, y con «no eficaz» hay que levantar una no
                conformidad nueva.
              </Aviso>
            )}
            <Botones
              ocupado={ocupado}
              alCancelar={() => setFormulario('ninguno')}
              alAceptar={() =>
                ejecutar(() =>
                  verificarEficacia(accion, { fecha: fechaEficacia, resultado, evidencia }),
                )
              }
            />
          </Cuadro>
        )}

        {formulario === 'cancelar' && (
          <Cuadro titulo="Cancelar la acción">
            <Textarea
              etiqueta="Por qué no se va a ejecutar"
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              ayuda="Cancelar sin motivo es borrar con otro nombre. La acción se queda con su explicación, y la no conformidad sigue abierta."
            />
            <Botones
              ocupado={ocupado}
              alCancelar={() => setFormulario('ninguno')}
              alAceptar={() => ejecutar(() => cancelarAccion(accion, motivo))}
            />
          </Cuadro>
        )}

        {formulario === 'ninguno' && abierta && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button tamano="sm" onClick={() => abrir('avance')}>Registrar avance</Button>
            <Button tamano="sm" variante="fantasma" onClick={() => abrir('reprogramar')}>
              Reprogramar
            </Button>
            <Button tamano="sm" variante="fantasma" onClick={() => abrir('verificar')}>
              Verificar eficacia
            </Button>
            {!accion.eficacia_fecha_programada && (
              <Button
                tamano="sm"
                variante="fantasma"
                onClick={() =>
                  ejecutar(() =>
                    programarVerificacion(accion, accion.fecha_compromiso),
                  )
                }
              >
                Programar verificación
              </Button>
            )}
            <Button tamano="sm" variante="fantasma" onClick={() => abrir('cancelar')}>
              Cancelar acción
            </Button>
          </div>
        )}

        {/* La evidencia del F-SG-06 «Evidencia de la acción realizada». */}
        <PanelAdjuntos destino={{ accion_id: accion.id }} orgId={accion.org_id} />
      </div>
    </Modal>
  )
}

function Datos({ filas }: { filas: [string, string][] }) {
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 14px', margin: 0 }}>
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta} style={{ display: 'contents' }}>
          <dt style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>{etiqueta}</dt>
          <dd style={{ margin: 0 }}>{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function Cuadro({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        paddingTop: 12,
        borderTop: '1px solid var(--verde-tinta)',
      }}
    >
      <h4 style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', margin: 0 }}>{titulo}</h4>
      {children}
    </section>
  )
}

function Botones({
  ocupado,
  alCancelar,
  alAceptar,
}: {
  ocupado: boolean
  alCancelar: () => void
  alAceptar: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button tamano="sm" onClick={alAceptar} disabled={ocupado}>
        {ocupado ? 'Guardando…' : 'Guardar'}
      </Button>
      <Button tamano="sm" variante="fantasma" onClick={alCancelar} disabled={ocupado}>
        Cancelar
      </Button>
    </div>
  )
}
