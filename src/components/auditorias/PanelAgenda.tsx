'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import {
  actualizarRenglonAgenda,
  cambiarCumplidoAgenda,
  crearRenglonAgenda,
  eliminarRenglonAgenda,
  listarAgenda,
  listarAlcanceNormas,
  listarAlcanceProcesos,
  listarAlcanceSitios,
  listarEquipoAuditor,
  type AuditoriaEnLista,
  type DatosAgenda,
  type RenglonAgenda,
} from '@/lib/queries/auditorias'
import { obtenerIdentidadFirma } from '@/lib/queries/firma'
import {
  listaDeAsistenciaHtml,
  tituloDeListaAsistencia,
} from '@/lib/plantillas/listaAsistencia'
import {
  planeacionAgendaHtml,
  tituloDeLaPlaneacion,
} from '@/lib/plantillas/planeacionAgenda'
import { documentoImprimible, imprimirDocumento } from '@/lib/plantillas/impresion'
import { formatDateOnly } from '@/lib/utils/dates'
import Aviso from '@/components/ui/Aviso'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import { IconoCalendario } from '@/components/ui/Iconos'
import FormularioAgenda from './FormularioAgenda'

const FORM = 'form-agenda'

/**
 * **La agenda hora por hora** [F03·B1].
 *
 * Es el entregable que se le manda al cliente antes de la visita, y después el
 * registro de lo que se cumplió — que es un apartado del informe [F03·B5].
 *
 * ⚠️ Marcar «cumplido» se hace **en planta**, y pasa por la cola como todo lo
 * demás. Sin señal se marca igual y sube al salir.
 *
 * ⚠️ **De aquí sale también la lista de asistencia** (`F-SG-03`, F03·B6d): cada
 * renglón puede imprimir la suya, porque cada renglón es un evento con gente
 * sentada enfrente. La reunión de apertura y la de clausura son las dos que
 * `P-SG-03` §5.4.1 exige por escrito, pero el botón no distingue: el `tema` es
 * texto libre y un catálogo de tipos de reunión sería un interruptor que sólo
 * sirve para dos de los cuatro usos del formato (regla 11).
 */
export default function PanelAgenda({ auditoria }: { auditoria: AuditoriaEnLista }) {
  const cliente = useQueryClient()
  const auditoriaId = auditoria.id
  const orgId = auditoria.org_id
  const clave = queryKeys.auditorias.agenda(auditoriaId)

  const [editando, setEditando] = useState<RenglonAgenda | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /**
   * Qué documento se está mirando. `null` = ninguno.
   *
   * Los dos salen de esta pestaña porque los dos son la agenda vista de otra
   * manera: el `F-SG-11` es el plan que se manda **antes**, y el `F-SG-03` es la
   * hoja de firmas de una de sus reuniones.
   */
  const [documento, setDocumento] = useState<
    { tipo: 'planeacion' } | { tipo: 'asistencia'; renglon: RenglonAgenda } | null
  >(null)

  const { data: agenda = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarAgenda(auditoriaId),
  })

  // ── lo que hace falta para la lista de asistencia ──────────────────────────
  //
  // ⚠️ **Las tres son claves que la precarga YA baja** (`piezasDeLaPrecarga()`),
  // así que esto no añade ni una consulta nueva. Es la misma regla que gobernó
  // el informe en B5: el documento se genera en la planta, y una clave que nadie
  // precargó es un documento en blanco el día que se usa.
  const equipo = useQuery({
    queryKey: queryKeys.auditorias.equipo(auditoriaId),
    queryFn: () => listarEquipoAuditor(auditoriaId),
  })
  const sitios = useQuery({
    queryKey: queryKeys.auditorias.alcanceSitios(auditoriaId),
    queryFn: () => listarAlcanceSitios(auditoriaId),
  })
  const normas = useQuery({
    queryKey: queryKeys.auditorias.alcanceNormas(auditoriaId),
    queryFn: () => listarAlcanceNormas(auditoriaId),
  })
  const procesos = useQuery({
    queryKey: queryKeys.auditorias.alcanceProcesos(auditoriaId),
    queryFn: () => listarAlcanceProcesos(auditoriaId),
  })
  const firma = useQuery({
    queryKey: queryKeys.firma.identidad(),
    queryFn: obtenerIdentidadFirma,
  })

  const listaLista =
    !equipo.isPending &&
    !sitios.isPending &&
    !normas.isPending &&
    !procesos.isPending &&
    !firma.isPending

  /**
   * El documento abierto, ya armado.
   *
   * ⚠️ `useMemo` y no `useState`: la caché es la fuente de verdad (regla 2 del
   * offline). Copiarlo a un estado lo dejaría congelado en cuanto alguien
   * añadiera un punto más a la agenda.
   */
  const impreso = useMemo(() => {
    if (!documento || !listaLista) return { titulo: '', html: '' }

    if (documento.tipo === 'asistencia') {
      return {
        titulo: tituloDeListaAsistencia(auditoria, documento.renglon),
        html: listaDeAsistenciaHtml({
          auditoria,
          renglon: documento.renglon,
          agenda,
          equipo: equipo.data ?? [],
          sitios: sitios.data ?? [],
          firma: firma.data ?? null,
        }),
      }
    }

    return {
      titulo: tituloDeLaPlaneacion(auditoria),
      html: planeacionAgendaHtml({
        auditoria,
        normas: normas.data ?? [],
        sitios: sitios.data ?? [],
        procesos: procesos.data ?? [],
        equipo: equipo.data ?? [],
        agenda,
        firma: firma.data ?? null,
      }),
    }
  }, [
    documento,
    listaLista,
    auditoria,
    agenda,
    equipo.data,
    sitios.data,
    normas.data,
    procesos.data,
    firma.data,
  ])

  function imprimir() {
    if (!documento) return
    setError(null)
    const resultado = imprimirDocumento(impreso.titulo, impreso.html)
    if (!resultado.abierta) setError(resultado.motivo)
  }

  /** Agrupada por día: es como se lee y como se imprime. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, RenglonAgenda[]>()
    for (const renglon of agenda) {
      const dia = mapa.get(renglon.fecha) ?? []
      dia.push(renglon)
      mapa.set(renglon.fecha, dia)
    }
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [agenda])

  const cumplidos = agenda.filter((r) => r.cumplido).length

  function abrirAlta() {
    setEditando(null)
    setError(null)
    setAbierto(true)
  }

  function abrirEdicion(renglon: RenglonAgenda) {
    setEditando(renglon)
    setError(null)
    setAbierto(true)
  }

  async function guardar(datos: DatosAgenda) {
    setGuardando(true)
    setError(null)

    try {
      if (editando) {
        const { fila, encolado } = await actualizarRenglonAgenda(editando, datos)
        aplicarEscritura<RenglonAgenda>({
          cliente,
          clave,
          encolado,
          actualizar: (previo) => previo.map((r) => (r.id === fila.id ? fila : r)),
        })
      } else {
        const { fila, encolado } = await crearRenglonAgenda(auditoriaId, orgId, datos)
        aplicarEscritura<RenglonAgenda>({
          cliente,
          clave,
          encolado,
          actualizar: (previo) => [...previo, fila],
        })
      }

      setAbierto(false)
      setEditando(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function alternarCumplido(renglon: RenglonAgenda) {
    setError(null)
    try {
      const { fila, encolado } = await cambiarCumplidoAgenda(renglon, !renglon.cumplido)
      aplicarEscritura<RenglonAgenda>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.map((r) => (r.id === fila.id ? fila : r)),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  async function quitar(renglon: RenglonAgenda) {
    setError(null)
    try {
      const { encolado } = await eliminarRenglonAgenda(renglon)
      aplicarEscritura<RenglonAgenda>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.filter((r) => r.id !== renglon.id),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
          {agenda.length === 0
            ? 'Sin agenda todavía'
            : `${agenda.length} punto${agenda.length === 1 ? '' : 's'} · ${cumplidos} cumplido${cumplidos === 1 ? '' : 's'}`}
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {agenda.length > 0 && (
            <Button
              variante="secundario"
              onClick={() => setDocumento({ tipo: 'planeacion' })}
              title="Planeación y agenda (F-SG-11): lo que se le manda al cliente antes de la visita"
            >
              Imprimir la agenda
            </Button>
          )}
          <Button variante="primario" onClick={abrirAlta}>Añadir un punto</Button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      {agenda.length === 0 ? (
        <EstadoVacio
          titulo="La visita no tiene agenda"
          descripcion="El plan hora por hora es lo que se le manda al cliente antes de ir: apertura, procesos, recorridos y reunión de cierre. Después se marca lo que se cumplió, y eso va al informe."
          accion={<Button variante="primario" onClick={abrirAlta}>Armar la agenda</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {porDia.map(([dia, renglones]) => (
            <section key={dia}>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  color: 'var(--texto-dim)',
                  marginBottom: 8,
                }}
              >
                {/* ⚠️ `formatDateOnly`, no `new Date()`: una columna `date`
                    formateada con el constructor corre un día en México. */}
                {formatDateOnly(dia)}
              </h3>

              <Lista etiqueta={`Agenda del ${dia}`}>
                {renglones.map((renglon) => (
                  <Fila
                    key={renglon.id}
                    Icono={IconoCalendario}
                    titulo={
                      <>
                        {renglon.hora_inicio && (
                          <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                            {renglon.hora_inicio.slice(0, 5)}
                            {renglon.hora_fin ? `–${renglon.hora_fin.slice(0, 5)}` : ''}
                          </span>
                        )}
                        {renglon.tema}
                      </>
                    }
                    meta={
                      <>
                        {renglon.auditado && <span>{renglon.auditado}</span>}
                        {renglon.nota && <span>{renglon.nota}</span>}
                      </>
                    }
                    onClick={() => abrirEdicion(renglon)}
                    derecha={
                      <>
                        <Checkbox
                          etiqueta="Cumplido"
                          checked={renglon.cumplido}
                          onChange={() => alternarCumplido(renglon)}
                        />
                        <Button
                          variante="fantasma"
                          tamano="sm"
                          onClick={() => setDocumento({ tipo: 'asistencia', renglon })}
                          title={`Lista de asistencia de «${renglon.tema}» (F-SG-03)`}
                        >
                          Asistencia
                        </Button>
                        <Button
                          variante="fantasma"
                          tamano="sm"
                          onClick={() => quitar(renglon)}
                          title={`Quitar «${renglon.tema}» de la agenda`}
                        >
                          Quitar
                        </Button>
                      </>
                    }
                  />
                ))}
              </Lista>
            </section>
          ))}
        </div>
      )}

      <Modal
        abierto={documento !== null}
        alCerrar={() => setDocumento(null)}
        titulo={documento?.tipo === 'planeacion' ? 'Planeación y agenda' : 'Lista de asistencia'}
        ancho={880}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setDocumento(null)}>Cerrar</Button>
            <Button variante="primario" onClick={imprimir} disabled={!listaLista}>
              Imprimir o guardar PDF
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 12, color: 'var(--texto-dim)', margin: '0 0 10px' }}>
          {documento?.tipo === 'planeacion'
            ? 'El plan que se le manda al cliente antes de la visita, con copia a los jefes inmediatos. Un renglón sin auditor asignado se imprime con las iniciales del equipo completo.'
            : 'Así se imprime, con el evento, el objetivo, la fecha, el lugar y los puestos ya puestos. Sólo la columna de firma va en blanco.'}{' '}
          Se arma con lo que ya está descargado, así que funciona sin señal.
        </p>

        {!listaLista ? (
          <Skeleton alto={360} radio={4} />
        ) : (
          /* ⚠️ `srcDoc` y `sandbox` vacío, igual que la vista previa del informe:
             un solo renderizador para lo que se ve y lo que se imprime, y el
             documento sin permisos. Aquí no protege React —la plantilla escapa
             cada interpolación— y el tema de un renglón lo escribió una persona. */
          <iframe
            title="Vista previa del documento"
            srcDoc={documentoImprimible(impreso.titulo || 'Documento', impreso.html)}
            sandbox=""
            style={{
              width: '100%',
              // ⚠️ `var(--vh-full)`, nunca `vh` crudo (regla 4b).
              height: 'min(calc(var(--vh-full) * 0.55), 720px)',
              border: '1px solid var(--borde)',
              borderRadius: 4,
              background: '#fff',
            }}
          />
        )}
      </Modal>

      <Modal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo={editando ? 'Punto de la agenda' : 'Nuevo punto de la agenda'}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM} cargando={guardando}>
              {editando ? 'Guardar' : 'Añadir'}
            </Button>
          </>
        }
      >
        {error && (
          <div style={{ marginBottom: 12 }}>
            <Aviso tono="error">{error}</Aviso>
          </div>
        )}
        <FormularioAgenda
          id={FORM}
          orgId={orgId}
          inicial={editando ?? undefined}
          ordenSugerido={agenda.length}
          alEnviar={guardar}
        />
      </Modal>
    </>
  )
}
