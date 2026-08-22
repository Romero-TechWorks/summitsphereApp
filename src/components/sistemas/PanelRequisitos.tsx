'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDate } from '@/lib/utils/dates'
import { listarProyectosDe, type ProyectoConLider } from '@/lib/queries/proyectos'
import { listarCoberturaDeClausulas } from '@/lib/queries/documentos'
import {
  evaluarRequisito,
  listarClausulasDelAlcance,
  listarRequisitos,
  type ClausulaEvaluable,
  type Requisito,
} from '@/lib/queries/requisitos'
import { ESTADOS_REQUISITO, avanceDeRequisitos } from '@/lib/sistemas/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { normalizar } from '@/lib/utils/texto'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Textarea from '@/components/ui/Textarea'
import { IconoMatriz } from '@/components/ui/Iconos'
import BarraAvance from './BarraAvance'

/**
 * **La matriz de requisitos** [F02·B3].
 *
 * Cuelga de un PROYECTO, no de la organización: el alcance —qué normas y qué
 * sitios— es del contrato, y una misma planta puede estar implementando 9001
 * este año y 45001 el que viene. Por eso hay un segundo selector.
 *
 * ⚠️ Las cláusulas del alcance y las evaluaciones son **dos consultas
 * separadas** que se cruzan en memoria. Una vista que las uniera en la base
 * devolvería sólo lo evaluado o exigiría un `LEFT JOIN` con una vista más que
 * mantener; así, una cláusula sin fila vale `no_iniciado` y la matriz sale
 * completa desde el primer día.
 */
export default function PanelRequisitos({ orgId }: { orgId: string }) {
  const cliente = useQueryClient()

  const [proyectoId, setProyectoId] = useState('')
  const [texto, setTexto] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [editando, setEditando] = useState<ClausulaEvaluable | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: proyectos = [], isPending: cargandoProyectos } = useQuery({
    queryKey: queryKeys.cartera.proyectosDe(orgId),
    queryFn: () => listarProyectosDe(orgId),
    enabled: Boolean(orgId),
  })

  const proyecto: ProyectoConLider | undefined = proyectos.find((p) => p.id === proyectoId)

  const { data: clausulas = [], isPending: cargandoClausulas } = useQuery({
    queryKey: queryKeys.sistemas.clausulasDelAlcance(proyectoId),
    queryFn: () => listarClausulasDelAlcance(proyectoId),
    enabled: Boolean(proyectoId),
  })

  const claveRequisitos = queryKeys.sistemas.requisitos(proyectoId)
  const { data: requisitos = [] } = useQuery({
    queryKey: claveRequisitos,
    queryFn: () => listarRequisitos(proyectoId),
    enabled: Boolean(proyectoId),
  })

  // Con qué documento se respalda cada cláusula. Sin esto, «documentado» es una
  // afirmación sin nada detrás — y lo primero que pide un auditor de
  // certificación es justamente el papel.
  const { data: cobertura = [] } = useQuery({
    queryKey: queryKeys.sistemas.cobertura(orgId),
    queryFn: () => listarCoberturaDeClausulas(orgId),
    enabled: Boolean(orgId),
  })

  const documentosPorClausula = useMemo(() => {
    const mapa = new Map<string, { id: string; codigo: string; titulo: string }[]>()
    for (const fila of cobertura) {
      if (!fila.documento) continue
      const lista = mapa.get(fila.clausula_id) ?? []
      lista.push(fila.documento)
      mapa.set(fila.clausula_id, lista)
    }
    return mapa
  }, [cobertura])

  const porClausula = useMemo(
    () => new Map(requisitos.map((r) => [r.clausula_id, r])),
    [requisitos],
  )

  /**
   * El estado de una cláusula. **Nunca `undefined`**: una cláusula sin fila en
   * `requisitos` vale `no_iniciado`, que es lo que de verdad significa. Con un
   * `undefined` suelto, la matriz saldría con huecos el primer día de un
   * diagnóstico — que es justo el día en que se usa.
   *
   * ⚠️ `useCallback` para que los `useMemo` de abajo puedan declararla como
   * dependencia sin recalcularse en cada render.
   */
  const estadoDe = useCallback(
    (clausulaId: string) => porClausula.get(clausulaId)?.estado ?? 'no_iniciado',
    [porClausula],
  )

  // El avance por norma, que es lo que el cliente pregunta.
  const avances = useMemo(() => {
    const porNorma = new Map<string, { nombre: string; estados: string[] }>()

    for (const clausula of clausulas) {
      const previo = porNorma.get(clausula.normaId) ?? { nombre: clausula.normaNombre, estados: [] }
      previo.estados.push(estadoDe(clausula.id))
      porNorma.set(clausula.normaId, previo)
    }

    return [...porNorma.entries()].map(([id, { nombre, estados }]) => ({
      id,
      nombre,
      porcentaje: avanceDeRequisitos(estados),
      total: estados.length,
      evaluadas: estados.filter((e) => e !== 'no_iniciado').length,
    }))
  }, [clausulas, estadoDe])

  // ⚠️ Los dos filtros son de pantalla y viven en memoria: no entran en la clave
  // de caché (CLAUDE.md · reglas del offline, 7).
  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    return clausulas.filter((c) => {
      if (estadoFiltro && estadoDe(c.id) !== estadoFiltro) return false
      if (!aguja) return true
      return (
        normalizar(c.numero).includes(aguja) ||
        normalizar(c.titulo).includes(aguja) ||
        normalizar(c.normaNombre).includes(aguja)
      )
    })
  }, [clausulas, texto, estadoFiltro, estadoDe])

  async function guardar(
    clausula: ClausulaEvaluable,
    datos: { estado: string; justificacion: string | null; observaciones: string | null },
  ) {
    if (!proyecto) return
    setError(null)

    try {
      const { fila, encolado } = await evaluarRequisito(
        proyecto,
        clausula,
        porClausula.get(clausula.id),
        { ...datos, responsable_id: null },
      )

      aplicarEscritura<Requisito>({
        cliente,
        clave: claveRequisitos,
        encolado,
        actualizar: (previo) => [...previo.filter((r) => r.clausula_id !== fila.clausula_id), fila],
      })

      setEditando(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  if (cargandoProyectos) return <Skeleton alto={120} radio={4} />

  if (proyectos.length === 0) {
    return (
      <EstadoVacio
        titulo="Este cliente no tiene proyectos"
        descripcion="La matriz de requisitos cuelga del alcance de un contrato: qué normas cubre y en qué sitios. Abre un proyecto en la cartera y define su alcance."
      />
    )
  }

  return (
    <>
      <div style={{ maxWidth: 420, marginBottom: 18 }}>
        <Select
          etiqueta="Proyecto"
          ayuda="El alcance —qué normas se están implementando— es del contrato."
          marcador="Elige un proyecto"
          value={proyectoId}
          onChange={(e) => setProyectoId(e.target.value)}
        >
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </Select>
      </div>

      {!proyectoId ? (
        <EstadoVacio
          titulo="Elige un proyecto"
          descripcion="La matriz enseña una fila por cada cláusula auditable de las normas en alcance, y calcula el porcentaje de avance por norma."
        />
      ) : cargandoClausulas ? (
        <Skeleton alto={200} radio={4} />
      ) : clausulas.length === 0 ? (
        <EstadoVacio
          titulo="Este proyecto no tiene normas en alcance"
          descripcion="Sin normas no hay cláusulas que evaluar. El alcance se define en el expediente del cliente, dentro del proyecto: pestaña Alcance. Si las normas están puestas y aun así no aparece nada, el catálogo de cláusulas está vacío y lo sube un socio desde la pestaña Normas."
        />
      ) : (
        <>
          {avances.map((avance) => (
            <BarraAvance
              key={avance.id}
              etiqueta={avance.nombre}
              porcentaje={avance.porcentaje}
              detalle={`${avance.evaluadas} de ${avance.total} cláusulas evaluadas`}
            />
          ))}

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', margin: '18px 0 14px' }}>
            <div style={{ flex: '1 1 200px', maxWidth: 300 }}>
              <Input
                etiqueta="Buscar"
                etiquetaOculta
                placeholder="Buscar por número, título o norma"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
            </div>
            <div style={{ width: 190 }}>
              <Select
                etiqueta="Estado"
                etiquetaOculta
                marcador="Todos los estados"
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
              >
                {ESTADOS_REQUISITO.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                ))}
              </Select>
            </div>
          </div>

          {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

          {visibles.length === 0 ? (
            <EstadoVacio
              titulo="Nada con esos filtros"
              descripcion="Prueba con otro texto o quita el filtro de estado."
            />
          ) : (
            <Lista etiqueta="Matriz de requisitos">
              {visibles.map((clausula) => {
                const requisito = porClausula.get(clausula.id)
                const estado = requisito?.estado ?? 'no_iniciado'

                return (
                  <Fila
                    key={clausula.id}
                    Icono={IconoMatriz}
                    onClick={() => { setError(null); setEditando(clausula) }}
                    titulo={
                      <>
                        <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                          {clausula.numero}
                        </span>
                        {clausula.titulo}
                      </>
                    }
                    meta={
                      <>
                        <span>{clausula.normaNombre}</span>
                        {/* Con qué se demuestra. Un «documentado» sin documento
                            se ve aquí, que es donde se puede arreglar. */}
                        {documentosPorClausula.get(clausula.id)?.map((d) => (
                          <span key={d.id} className="mono">{d.codigo}</span>
                        ))}
                        {requisito?.justificacion && <span>{requisito.justificacion}</span>}
                        {requisito?.evaluado_en && (
                          <span>Evaluado el {formatDate(requisito.evaluado_en)}</span>
                        )}
                      </>
                    }
                    derecha={
                      <Badge tono={tonoDe(ESTADOS_REQUISITO, estado)}>
                        {etiquetaDe(ESTADOS_REQUISITO, estado)}
                      </Badge>
                    }
                  />
                )
              })}
            </Lista>
          )}
        </>
      )}

      {editando && (
        <ModalEvaluar
          clausula={editando}
          requisito={porClausula.get(editando.id)}
          documentos={documentosPorClausula.get(editando.id) ?? []}
          alCerrar={() => setEditando(null)}
          alGuardar={(datos) => guardar(editando, datos)}
        />
      )}
    </>
  )
}

function ModalEvaluar({
  clausula,
  requisito,
  documentos,
  alCerrar,
  alGuardar,
}: {
  clausula: ClausulaEvaluable
  requisito: Requisito | undefined
  /** Los documentos que declaran cubrir esta cláusula. */
  documentos: { id: string; codigo: string; titulo: string }[]
  alCerrar: () => void
  alGuardar: (datos: { estado: string; justificacion: string | null; observaciones: string | null }) => void
}) {
  const [estado, setEstado] = useState(requisito?.estado ?? 'no_iniciado')
  const [justificacion, setJustificacion] = useState(requisito?.justificacion ?? '')
  const [observaciones, setObservaciones] = useState(requisito?.observaciones ?? '')
  const [guardando, setGuardando] = useState(false)

  const exigeJustificacion = estado === 'no_aplica'

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={`${clausula.numero} — ${clausula.titulo}`}
      ancho={580}
      pie={
        <>
          <Button variante="fantasma" onClick={alCerrar}>Cancelar</Button>
          <Button
            variante="primario"
            cargando={guardando}
            onClick={() => {
              setGuardando(true)
              alGuardar({
                estado,
                justificacion: justificacion.trim() || null,
                observaciones: observaciones.trim() || null,
              })
              setGuardando(false)
            }}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--texto-dim)' }}>{clausula.normaNombre}</p>

        {/* ⚠️ El resumen es el criterio técnico de Summit, redactado por la firma
            — nunca el texto de la norma, que es obra protegida (regla 12). */}
        {clausula.resumen && (
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--texto)' }}>{clausula.resumen}</p>
        )}

        <Select
          etiqueta="Estado"
          ayuda="Documentado: existe el papel. Implementado: se hace. Evidenciado: hay con qué demostrarlo."
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          {ESTADOS_REQUISITO.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>

        {/* ⚠️ El vínculo se hace desde el DOCUMENTO, no desde aquí: un
            documento cubre varias cláusulas y se declara una vez, en su
            expediente. Aquí se enseña el resultado — y sobre todo se ve cuándo
            NO hay nada, que es lo que un auditor va a encontrar. */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '.04em', color: 'var(--texto-dim)', marginBottom: 4 }}>
            Con qué se documenta
          </p>
          {documentos.length === 0 ? (
            <p style={{ fontSize: 13, color: estado === 'no_iniciado' || estado === 'no_aplica' ? 'var(--texto-dim)' : 'var(--advertencia)' }}>
              Ningún documento declara cubrir esta cláusula. Se vincula desde el expediente del
              documento, en su pestaña Cláusulas.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {documentos.map((d) => (
                <li key={d.id} style={{ fontSize: 13.5 }}>
                  <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>{d.codigo}</span>
                  {d.titulo}
                </li>
              ))}
            </ul>
          )}
        </div>

        {exigeJustificacion && (
          <Textarea
            etiqueta="Justificación del «no aplica»"
            required
            rows={3}
            ayuda="Obligatoria, y la exige la base. Es el primer punto que revisa un auditor de certificación."
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
          />
        )}

        <Textarea
          etiqueta="Observaciones"
          rows={3}
          ayuda="Qué falta, con qué se demuestra, a quién hay que pedírselo."
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>
    </Modal>
  )
}
