'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import type { MiembroEquipo } from '@/lib/queries/cartera'
import type { ProyectoConLider } from '@/lib/queries/proyectos'
import {
  actualizarTarea,
  cambiarEstadoTarea,
  crearTarea,
  eliminarTarea,
  guardarComoPlantilla,
  instanciarPlantilla,
  leerPlantillaTareas,
  listarTareas,
  type DatosTarea,
  type Responsable,
  type TareaConResponsable,
} from '@/lib/queries/tareas'
import {
  ESTADOS_TAREA,
  ETAPAS_PROYECTO,
  etiquetaDe,
  numeroDeEtapa,
  tonoDe,
} from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import PanelAdjuntos from '@/components/adjuntos/PanelAdjuntos'
import FormularioTarea from './FormularioTarea'

const FORM_TAREA = 'form-tarea'

type EnEdicion =
  | { modo: 'nueva'; etapa: string }
  | { modo: 'editar'; tarea: TareaConResponsable }
  | null

/**
 * **El checklist de la metodología dentro de un proyecto** [F01·B5].
 *
 * Seis secciones, una por etapa, cada una con su avance. Es lo que un consultor
 * abre todos los días: qué toca hacer en este cliente, hoy.
 *
 * ⚠️ **Completar una etapa NO mueve el proyecto de etapa.** Cuando no queda nada
 * pendiente, la app lo *propone* con un botón; avanzar lo decide el consultor y
 * queda en la bitácora del proyecto con su nombre y la fecha. Que la app moviera
 * el embudo de la firma sola convertiría el tablero del socio en algo que nadie
 * decidió — y el embudo es cómo la firma sabe en qué está trabajando.
 */
export default function PanelTareas({
  proyecto,
  equipo,
  puedoEditar,
  esSocio,
  alAvanzarEtapa,
}: {
  proyecto: ProyectoConLider
  equipo: MiembroEquipo[]
  puedoEditar: boolean
  esSocio: boolean
  /** Lo ejecuta el detalle del proyecto, que es quien sabe escribir el proyecto. */
  alAvanzarEtapa: (etapa: string) => Promise<void>
}) {
  const cliente = useQueryClient()

  // La etapa en la que va el proyecto arranca abierta; las demás, cerradas. En
  // un teléfono, seis secciones desplegadas son cuatro pantallas de scroll para
  // llegar a lo de hoy.
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set([proyecto.etapa]))
  const [edicion, setEdicion] = useState<EnEdicion>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [ocupadas, setOcupadas] = useState<Set<string>>(new Set())

  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  // ⚠️ De qué lado de la partición se lee la plantilla de la firma. Va también
  // en la clave de caché: `src/lib/auth/particion.ts`.
  const esDev = usuario?.es_dev === true

  const { data: tareas = [], isPending, error: fallo } = useQuery({
    queryKey: queryKeys.cartera.tareas(proyecto.id),
    queryFn: () => listarTareas(proyecto.id),
  })

  // La plantilla de la firma. Es una fila de configuración, no una consulta cara.
  const { data: plantilla = {} } = useQuery({
    queryKey: queryKeys.cartera.plantillaTareas(esDev),
    queryFn: () => leerPlantillaTareas(esDev),
    // Hasta saber quién pregunta no se sabe de qué rama del jsonb leer, y
    // arrancar en `false` traería la plantilla de la firma a una cuenta de
    // pruebas durante el primer render.
    enabled: puedoEditar && usuario !== undefined,
  })

  const yo: Responsable | null = usuario
    ? { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo }
    : null

  const clave = queryKeys.cartera.tareas(proyecto.id)
  // La plantilla de un tipo es `{ etapa: tarea[] }`: hay plantilla si tiene al
  // menos una etapa con tareas.
  const hayPlantilla = Object.keys(plantilla[proyecto.tipo] ?? {}).length > 0

  function marcarOcupada(id: string, ocupada: boolean) {
    setOcupadas((previo) => {
      const copia = new Set(previo)
      if (ocupada) copia.add(id)
      else copia.delete(id)
      return copia
    })
  }

  async function alternar(tarea: TareaConResponsable, hecha: boolean) {
    marcarOcupada(tarea.id, true)
    setError(null)

    try {
      const { fila, encolado } = await cambiarEstadoTarea(tarea, hecha ? 'hecha' : 'pendiente', yo)
      aplicarEscritura<TareaConResponsable>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.map((t) => (t.id === fila.id ? fila : t)),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      marcarOcupada(tarea.id, false)
    }
  }

  async function guardar(datos: Omit<DatosTarea, 'orden'>, responsable: Responsable | null) {
    if (!edicion) return
    setGuardando(true)
    setError(null)

    try {
      const { fila, encolado } =
        edicion.modo === 'nueva'
          ? await crearTarea(proyecto, { ...datos, orden: siguienteOrden(tareas) }, responsable)
          : await actualizarTarea(edicion.tarea, { ...datos, orden: edicion.tarea.orden }, responsable)

      aplicarEscritura<TareaConResponsable>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => [...previo.filter((t) => t.id !== fila.id), fila].sort((a, b) => a.orden - b.orden),
      })

      // La etapa de la tarea recién tocada se abre: si no, se guarda y no se ve.
      setAbiertas((previo) => new Set(previo).add(fila.etapa))
      setEdicion(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function quitar(tarea: TareaConResponsable) {
    setGuardando(true)
    setError(null)

    try {
      const { encolado } = await eliminarTarea(tarea)
      aplicarEscritura<TareaConResponsable>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.filter((t) => t.id !== tarea.id),
      })
      setEdicion(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function usarPlantilla() {
    setGuardando(true)
    setError(null)

    try {
      const { creadas, encolado } = await instanciarPlantilla(proyecto, plantilla, siguienteOrden(tareas))

      if (creadas.length === 0) {
        setError('La plantilla de este tipo de proyecto está vacía.')
        return
      }

      aplicarEscritura<TareaConResponsable>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => [...previo, ...creadas].sort((a, b) => a.orden - b.orden),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function guardarPlantilla() {
    setGuardando(true)
    setError(null)

    try {
      const { encolado } = await guardarComoPlantilla(proyecto.tipo, tareas, esDev)
      if (!encolado) {
        void cliente.invalidateQueries({ queryKey: queryKeys.cartera.plantillaTareas(esDev) })
      }
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  if (isPending) return <Skeleton alto={160} radio={4} />
  if (fallo) return <Aviso tono="error">{mensajeDeError(fallo)}</Aviso>

  const etapaActual = proyecto.etapa
  const siguiente = ETAPAS_PROYECTO[numeroDeEtapa(etapaActual)] ?? null
  const resumenActual = contar(tareas.filter((t) => t.etapa === etapaActual))
  const puedeProponerAvance =
    puedoEditar && siguiente !== null && resumenActual.total > 0 && resumenActual.pendientes === 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
          Lo que la metodología manda hacer en cada etapa de este proyecto.
        </p>

        {puedoEditar && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tareas.length === 0 && hayPlantilla && (
              <Button onClick={usarPlantilla} cargando={guardando}>Usar la plantilla</Button>
            )}
            {tareas.length > 0 && esSocio && (
              <Button variante="fantasma" onClick={guardarPlantilla} cargando={guardando}>
                Guardar como plantilla
              </Button>
            )}
            <Button variante="primario" onClick={() => { setError(null); setEdicion({ modo: 'nueva', etapa: etapaActual }) }}>
              Agregar tarea
            </Button>
          </div>
        )}
      </div>

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {puedeProponerAvance && siguiente && (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Aviso tono="exito">
            Todas las tareas de {etiquetaDe(ETAPAS_PROYECTO, etapaActual).toLowerCase()} están
            cerradas.
          </Aviso>
          <Button onClick={() => alAvanzarEtapa(siguiente.valor)}>
            Mover a {siguiente.etiqueta}
          </Button>
        </div>
      )}

      {tareas.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', lineHeight: 1.55, padding: '10px 0 16px', maxWidth: 620 }}>
          Este proyecto todavía no tiene tareas.{' '}
          {hayPlantilla
            ? 'Puedes traer las de la plantilla de este tipo de proyecto y ajustarlas después: ningún cliente es igual a la plantilla.'
            : 'Ve agregándolas por etapa; cuando una quede bien, un socio puede guardarla como plantilla para los siguientes clientes.'}
        </p>
      )}

      {ETAPAS_PROYECTO.map((etapa, indice) => {
        const suyas = tareas.filter((t) => t.etapa === etapa.valor)
        const resumen = contar(suyas)
        const abierta = abiertas.has(etapa.valor)
        const completa = resumen.total > 0 && resumen.pendientes === 0

        return (
          <div key={etapa.valor}>
            <button
              type="button"
              aria-expanded={abierta}
              onClick={() =>
                setAbiertas((previo) => {
                  const copia = new Set(previo)
                  if (copia.has(etapa.valor)) copia.delete(etapa.valor)
                  else copia.add(etapa.valor)
                  return copia
                })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '11px 2px',
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'inherit',
                font: 'inherit',
              }}
            >
              <span
                aria-hidden
                className="mono"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: completa ? 'var(--exito)' : 'var(--texto-dim)',
                  flexShrink: 0,
                }}
              >
                {completa ? '✓' : indice + 1}
              </span>

              <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>
                {etapa.etiqueta}
                {etapa.valor === etapaActual && (
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--verde-tinta)' }}>
                    · etapa actual
                  </span>
                )}
              </span>

              <span className="mono" style={{ fontSize: 13, color: 'var(--texto-dim)', flexShrink: 0 }}>
                {resumen.total === 0 ? '—' : `${resumen.hechas}/${resumen.contables}`}
              </span>
            </button>

            {/* La misma delimitación de siempre, en verde lleno cuando la etapa
                está cerrada: es la señal que se lee de un vistazo. */}
            <div
              aria-hidden
              style={{
                height: 2,
                borderRadius: 2,
                background: completa
                  ? 'linear-gradient(90deg, var(--verde-hondo), var(--verde))'
                  : 'rgba(61, 186, 78, .16)',
              }}
            />

            {abierta && (
              <div style={{ padding: '6px 0 16px' }}>
                {suyas.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--texto-dim)', padding: '10px 2px' }}>
                    Sin tareas en esta etapa.
                  </p>
                ) : (
                  suyas.map((tarea) => (
                    <FilaTarea
                      key={tarea.id}
                      tarea={tarea}
                      puedoEditar={puedoEditar}
                      ocupada={ocupadas.has(tarea.id)}
                      alAlternar={(hecha) => alternar(tarea, hecha)}
                      alAbrir={() => { setError(null); setEdicion({ modo: 'editar', tarea }) }}
                    />
                  ))
                )}

                {puedoEditar && (
                  <Button
                    variante="fantasma"
                    tamano="sm"
                    onClick={() => { setError(null); setEdicion({ modo: 'nueva', etapa: etapa.valor }) }}
                    style={{ marginTop: 6 }}
                  >
                    + Agregar a {etapa.etiqueta.toLowerCase()}
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}

      <Modal
        abierto={edicion !== null}
        alCerrar={() => setEdicion(null)}
        titulo={edicion?.modo === 'editar' ? 'Editar la tarea' : 'Agregar una tarea'}
        pie={
          <>
            {edicion?.modo === 'editar' && (
              <Button
                variante="peligro"
                style={{ marginRight: 'auto' }}
                onClick={() => quitar(edicion.tarea)}
              >
                Quitar
              </Button>
            )}
            <Button variante="fantasma" onClick={() => setEdicion(null)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_TAREA} cargando={guardando}>
              Guardar
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 14 }}><Aviso tono="error">{error}</Aviso></div>}
        {edicion && (
          <FormularioTarea
            key={edicion.modo === 'editar' ? edicion.tarea.id : `nueva-${edicion.etapa}`}
            id={FORM_TAREA}
            inicial={edicion.modo === 'editar' ? edicion.tarea : undefined}
            etapaPorDefecto={edicion.modo === 'nueva' ? edicion.etapa : edicion.tarea.etapa}
            equipo={equipo}
            alEnviar={guardar}
          />
        )}

        {/* ⚠️ La evidencia sólo aparece al EDITAR, nunca al crear: un adjunto
            cuelga de una tarea que ya existe, y encolarlo contra una fila que
            todavía no se ha escrito dejaría el archivo apuntando a nada
            [F02·B2b]. */}
        {edicion?.modo === 'editar' && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--borde)' }}>
            <PanelAdjuntos
              orgId={proyecto.org_id}
              destino={{ tarea_etapa_id: edicion.tarea.id }}
              puedoEditar={puedoEditar}
              esSocio={esSocio}
              ayuda={
                edicion.tarea.exige_evidencia
                  ? 'Esta tarea pide evidencia: no se puede marcar como hecha hasta que tenga al menos un archivo.'
                  : undefined
              }
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

function FilaTarea({
  tarea,
  puedoEditar,
  ocupada,
  alAlternar,
  alAbrir,
}: {
  tarea: TareaConResponsable
  puedoEditar: boolean
  ocupada: boolean
  alAlternar: (hecha: boolean) => void
  alAbrir: () => void
}) {
  const hecha = tarea.estado === 'hecha'
  const noAplica = tarea.estado === 'no_aplica'
  // ⚠️ Comparación de textos `YYYY-MM-DD`, no de `Date`: se ordenan igual y no
  // entra ninguna zona horaria (CLAUDE.md · trampas heredadas).
  const vencida = Boolean(tarea.fecha_compromiso && !hecha && !noAplica && tarea.fecha_compromiso < hoyISO())

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 2px', borderBottom: '1px solid var(--borde)' }}>
      <div style={{ flex: 1, minWidth: 0, opacity: noAplica ? 0.6 : 1 }}>
        <Checkbox
          etiqueta={tarea.titulo}
          checked={hecha}
          disabled={!puedoEditar || ocupada || noAplica}
          onChange={(e) => alAlternar(e.target.checked)}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingLeft: 28, paddingBottom: 4 }}>
          {tarea.responsable?.nombre && (
            <span style={{ fontSize: 12.5, color: 'var(--texto-dim)' }}>{tarea.responsable.nombre}</span>
          )}
          {tarea.fecha_compromiso && (
            <span
              className="mono"
              style={{ fontSize: 12.5, color: vencida ? 'var(--error)' : 'var(--texto-dim)' }}
            >
              {vencida ? 'venció ' : ''}{formatDateOnly(tarea.fecha_compromiso)}
            </span>
          )}
          {(tarea.estado === 'en_curso' || noAplica) && (
            <Badge tono={tonoDe(ESTADOS_TAREA, tarea.estado)}>
              {etiquetaDe(ESTADOS_TAREA, tarea.estado)}
            </Badge>
          )}
          {/* Se dice ANTES de intentar marcarla: si no, el auditor toca la
              casilla en la planta y recibe un rechazo del servidor sin saber
              por qué [F02·B2b]. */}
          {tarea.exige_evidencia && !hecha && (
            <Badge tono="advertencia">Pide evidencia</Badge>
          )}
        </div>
      </div>

      {puedoEditar && (
        <Button variante="fantasma" tamano="sm" onClick={alAbrir} title={`Editar «${tarea.titulo}»`}>
          Editar
        </Button>
      )}
    </div>
  )
}

/**
 * El avance de una etapa.
 *
 * ⚠️ `no_aplica` **no cuenta ni a favor ni en contra**: en un cliente que no
 * fabrica, media etapa sobra, y contarla como pendiente dejaría esa etapa
 * eternamente incompleta — o como hecha, regalaría un avance que nadie hizo.
 */
function contar(tareas: TareaConResponsable[]) {
  const contables = tareas.filter((t) => t.estado !== 'no_aplica')
  const hechas = contables.filter((t) => t.estado === 'hecha').length

  return {
    total: tareas.length,
    contables: contables.length,
    hechas,
    pendientes: contables.length - hechas,
  }
}

function siguienteOrden(tareas: TareaConResponsable[]): number {
  return tareas.reduce((mayor, t) => Math.max(mayor, t.orden), -1) + 1
}
