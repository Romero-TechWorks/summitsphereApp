'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly } from '@/lib/utils/dates'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import {
  AVISO_CURP,
  ESTADOS_DC3,
  ESTADOS_SESION,
  FORMATO_CURP,
  descargarTexto,
  estadoDc3,
  normalizarCurp,
  solicitudCsv,
} from '@/lib/capacitacion/catalogos'
import { listarOrganizaciones, listarSitios } from '@/lib/queries/cartera'
import { listarAdjuntos } from '@/lib/queries/adjuntos'
import {
  actualizarAsistente,
  actualizarSesion,
  crearAsistente,
  eliminarAsistente,
  eliminarSesion,
  listarAsistentes,
  listarCursos,
  listarProveedores,
  type Asistente,
  type DatosAsistente,
  type DatosSesion,
  type Sesion,
} from '@/lib/queries/capacitacion'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import PanelAdjuntos from '@/components/adjuntos/PanelAdjuntos'
import FormularioAsistente from './FormularioAsistente'
import FormularioSesion from './FormularioSesion'

const FORM_SESION = 'form-sesion'
const FORM_ASISTENTE = 'form-asistente'

/**
 * **La ficha de una sesión**: sus datos, la lista de asistencia, el DC-3 de cada
 * quien y la solicitud al proveedor.
 *
 * ⚠️ **La captura rápida de asistentes es una fila, no un formulario**: se
 * capturan veinte personas seguidas en la sala de capacitación, y un modal por
 * persona son veinte aperturas. Lo demás —asistencia, calificación, DC-3— se
 * completa después, abriendo a cada quien.
 *
 * ⚠️ **La solicitud de DC-3 se arma en el navegador** (CSV) con los asistentes
 * cuyo DC-3 está pendiente: asistieron, no van a reforzamiento y no tienen folio
 * todavía. Sale igual sin señal.
 */
export default function FichaSesion({
  orgId,
  sesion,
  alVolver,
}: {
  orgId: string
  sesion: Sesion
  alVolver: () => void
}) {
  const cliente = useQueryClient()
  const claveSesiones = queryKeys.capacitacion.sesiones(orgId)
  const claveAsistentes = queryKeys.capacitacion.asistentes(orgId)

  const [editandoSesion, setEditandoSesion] = useState(false)
  const [editando, setEditando] = useState<Asistente | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState({ nombre: '', curp: '', puesto: '', ocupacion: '' })
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null)

  const { data: todos = [] } = useQuery({ queryKey: claveAsistentes, queryFn: () => listarAsistentes(orgId) })
  const { data: cursos = [] } = useQuery({ queryKey: queryKeys.capacitacion.cursos(), queryFn: listarCursos })
  const { data: proveedores = [] } = useQuery({ queryKey: queryKeys.capacitacion.proveedores(), queryFn: listarProveedores })
  const { data: sitios = [] } = useQuery({ queryKey: queryKeys.cartera.sitios(orgId), queryFn: () => listarSitios(orgId) })
  const { data: organizaciones = [] } = useQuery({ queryKey: queryKeys.cartera.organizaciones(), queryFn: listarOrganizaciones })
  // La misma clave que usa `PanelAdjuntos` de la sesión: no es una consulta de más.
  const { data: evidencia = [], isPending: cargandoEvidencia } = useQuery({
    queryKey: queryKeys.adjuntos.de('sesion_id', sesion.id),
    queryFn: () => listarAdjuntos(orgId, { sesion_id: sesion.id }),
  })

  const asistentes = todos.filter((a) => a.sesion_id === sesion.id)
  const curso = cursos.find((c) => c.id === sesion.curso_id)
  const proveedor = proveedores.find((p) => p.id === sesion.proveedor_id)
  const organizacion = organizaciones.find((o) => o.id === orgId)
  const sitio = sitios.find((s) => s.id === sesion.sitio_id)
  const nombreCurso = curso?.nombre ?? 'Curso'

  const pendientes = asistentes.filter((a) => estadoDc3(a) === 'pendiente')
  const sinCurp = pendientes.filter((a) => !a.curp).length
  const puedeQuitarse = sesion.estado !== 'impartida' && asistentes.length === 0 && !cargandoEvidencia && evidencia.length === 0

  function ponerAsistente(fila: Asistente, encolado: boolean) {
    aplicarEscritura<Asistente>({
      cliente, clave: claveAsistentes, encolado,
      actualizar: (p) => (p.some((x) => x.id === fila.id) ? p.map((x) => (x.id === fila.id ? fila : x)) : [...p, fila])
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    })
  }
  function ponerSesion(fila: Sesion, encolado: boolean) {
    aplicarEscritura<Sesion>({
      cliente, clave: claveSesiones, encolado,
      // El programa anual deriva «impartido» de ESTA misma lista en memoria:
      // no hay otra clave que invalidar.
      actualizar: (p) => p.map((x) => (x.id === fila.id ? fila : x)),
    })
  }

  async function correr(accion: () => Promise<void>) {
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      await accion()
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  const guardarSesion = (datos: DatosSesion) => correr(async () => {
    const { fila, encolado } = await actualizarSesion(sesion, datos, nombreCurso)
    ponerSesion(fila, encolado)
    setEditandoSesion(false)
  })

  const marcarImpartida = () => correr(async () => {
    const { fila, encolado } = await actualizarSesion(sesion, { estado: 'impartida' }, nombreCurso)
    ponerSesion(fila, encolado)
  })

  const quitarSesion = () => correr(async () => {
    const { encolado } = await eliminarSesion(sesion, nombreCurso)
    aplicarEscritura<Sesion>({ cliente, clave: claveSesiones, encolado, actualizar: (p) => p.filter((x) => x.id !== sesion.id) })
    alVolver()
  })

  async function agregar(evento: React.FormEvent) {
    evento.preventDefault()
    const curp = normalizarCurp(nuevo.curp)
    if (!nuevo.nombre.trim()) return setErrorNuevo('Escribe el nombre como va en la constancia.')
    if (curp && !FORMATO_CURP.test(curp)) return setErrorNuevo(`«${curp}» no tiene el formato de una CURP. Revísala o déjala vacía y complétala después.`)
    // Dos veces la misma persona son dos DC-3 pedidos al proveedor.
    if (curp && asistentes.some((a) => a.curp === curp)) return setErrorNuevo('Esa CURP ya está en la lista.')
    setErrorNuevo(null)
    const datos: DatosAsistente = {
      nombre: nuevo.nombre.trim(), curp: curp || null, puesto: nuevo.puesto.trim() || null,
      ocupacion: nuevo.ocupacion.trim() || null, asistio: true, calificacion: null,
      folio_dc3: null, dc3_recibido_en: null, notas: null,
    }
    await correr(async () => {
      const { fila, encolado } = await crearAsistente(orgId, sesion.id, datos)
      ponerAsistente(fila, encolado)
      // Se conservan puesto y ocupación: en una brigada casi todos comparten.
      setNuevo((p) => ({ ...p, nombre: '', curp: '' }))
    })
  }

  const guardarAsistente = (datos: DatosAsistente) => correr(async () => {
    if (!editando) return
    const { fila, encolado } = await actualizarAsistente(editando, datos)
    ponerAsistente(fila, encolado)
    setEditando(null)
  })

  const quitarAsistente = (a: Asistente) => correr(async () => {
    const { encolado } = await eliminarAsistente(a)
    aplicarEscritura<Asistente>({ cliente, clave: claveAsistentes, encolado, actualizar: (p) => p.filter((x) => x.id !== a.id) })
    setEditando(null)
  })

  function descargarSolicitud() {
    const csv = solicitudCsv(
      {
        empresa: organizacion?.razon_social ?? '',
        rfcEmpresa: organizacion?.rfc ?? null,
        curso: nombreCurso,
        duracionHoras: sesion.duracion_horas ?? curso?.duracion_horas ?? null,
        fechaInicio: sesion.fecha_inicio,
        fechaFin: sesion.fecha_fin,
        instructor: sesion.instructor,
        proveedor: proveedor?.razon_social || proveedor?.nombre || null,
        registroStps: proveedor?.registro_stps ?? null,
      },
      pendientes.map((a) => ({ nombre: a.nombre, curp: a.curp, puesto: a.puesto, ocupacion: a.ocupacion, calificacion: a.calificacion })),
    )
    descargarTexto(`solicitud-dc3-${sesion.fecha_inicio}-${nombreCurso.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.csv`, csv)
    setAviso(`Se descargó la solicitud con ${pendientes.length} persona${pendientes.length === 1 ? '' : 's'}. Mándala a ${proveedor?.nombre ?? 'el proveedor'}; cuando lleguen los DC-3, registra el folio y el PDF de cada uno.`)
  }

  const dato = (etiqueta: string, valor: React.ReactNode) => (
    <div>
      <div style={{ fontSize: 12, color: 'var(--texto-dim)' }}>{etiqueta}</div>
      <div style={{ fontSize: 14, color: 'var(--texto)' }}>{valor}</div>
    </div>
  )

  return (
    <div>
      <Button variante="fantasma" tamano="sm" onClick={alVolver} style={{ marginBottom: 8 }}>← Sesiones</Button>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--texto)', margin: 0 }}>{nombreCurso}</h2>
        <Badge tono={tonoDe(ESTADOS_SESION, sesion.estado)}>{etiquetaDe(ESTADOS_SESION, sesion.estado)}</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, margin: '14px 0' }}>
        {dato('Fechas', <span className="mono">{formatDateOnly(sesion.fecha_inicio)}{sesion.fecha_fin !== sesion.fecha_inicio ? ` – ${formatDateOnly(sesion.fecha_fin)}` : ''}</span>)}
        {dato('Horas', sesion.duracion_horas ?? curso?.duracion_horas ?? '—')}
        {dato('Proveedor', proveedor ? <>{proveedor.nombre}{proveedor.registro_stps && <span className="mono" style={{ color: 'var(--texto-dim)' }}> · STPS {proveedor.registro_stps}</span>}</> : 'Sin proveedor')}
        {dato('Instructor', sesion.instructor ?? '—')}
        {dato('Dónde', [sitio?.nombre, sesion.sede].filter(Boolean).join(' · ') || '—')}
      </div>
      {sesion.estado === 'cancelada' && sesion.motivo_cancelacion && (
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', margin: '0 0 12px' }}>Cancelada: {sesion.motivo_cancelacion}</p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <Button variante="secundario" onClick={() => { setError(null); setEditandoSesion(true) }}>Editar</Button>
        {sesion.estado === 'programada' && (
          <Button variante="primario" onClick={marcarImpartida} cargando={guardando}>Marcar impartida</Button>
        )}
        {puedeQuitarse && <Button variante="peligro" onClick={quitarSesion} disabled={guardando}>Quitar</Button>}
      </div>

      {error && !editando && !editandoSesion && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
      {aviso && <div style={{ marginBottom: 12 }}><Aviso tono="exito">{aviso}</Aviso></div>}

      {/* ── El DC-3: lo que se le pide al proveedor ───────────────────────── */}
      <section style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--texto)', margin: '0 0 6px' }}>DC-3</h3>
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', margin: '0 0 10px', lineHeight: 1.5 }}>
          Los expide el proveedor, no Summit. La solicitud lleva a quien asistió, no va a reforzamiento y no tiene
          todavía su folio: <strong>{pendientes.length}</strong> de {asistentes.length}.
        </p>
        {sinCurp > 0 && (
          <div style={{ marginBottom: 10 }}>
            <Aviso tono="advertencia">
              {sinCurp} sin CURP. El proveedor no puede expedir un DC-3 sin ella: complétala antes de mandar la solicitud.
            </Aviso>
          </div>
        )}
        <Button
          variante="secundario"
          onClick={descargarSolicitud}
          disabled={sesion.estado !== 'impartida' || !proveedor || pendientes.length === 0}
        >
          Descargar solicitud de DC-3 (CSV)
        </Button>
        <p style={{ fontSize: 12, color: 'var(--texto-dim)', margin: '6px 0 0' }}>
          {sesion.estado !== 'impartida'
            ? 'Se pide cuando la sesión ya se impartió.'
            : !proveedor
              ? 'Falta el proveedor: edita la sesión.'
              : pendientes.length === 0
                ? 'No queda ningún DC-3 por pedir.'
                : 'Se abre en Excel; los datos de la empresa, el curso y el agente van en cada renglón.'}
        </p>
      </section>

      {/* ── La lista de asistencia ────────────────────────────────────────── */}
      <section style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--texto)', margin: '0 0 6px' }}>
          Asistentes ({asistentes.length})
        </h3>

        <form onSubmit={agregar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, alignItems: 'end', marginBottom: 6 }}>
          <Input etiqueta="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo((p) => ({ ...p, nombre: e.target.value }))} />
          <Input etiqueta="CURP" className="mono" value={nuevo.curp} onChange={(e) => setNuevo((p) => ({ ...p, curp: normalizarCurp(e.target.value) }))} />
          <Input etiqueta="Puesto" value={nuevo.puesto} onChange={(e) => setNuevo((p) => ({ ...p, puesto: e.target.value }))} />
          <Input etiqueta="Ocupación" value={nuevo.ocupacion} onChange={(e) => setNuevo((p) => ({ ...p, ocupacion: e.target.value }))} />
          <Button variante="primario" type="submit" cargando={guardando} disabled={!nuevo.nombre.trim()} style={{ minHeight: 40 }}>
            Agregar
          </Button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--texto-dim)', margin: '0 0 10px', lineHeight: 1.5 }}>{AVISO_CURP}</p>
        {errorNuevo && <div style={{ marginBottom: 10 }}><Aviso tono="error">{errorNuevo}</Aviso></div>}

        {asistentes.length > 0 && (
          <Lista etiqueta="Asistentes">
            {asistentes.map((a) => {
              const estado = estadoDc3(a)
              return (
                <Fila
                  key={a.id}
                  titulo={a.nombre}
                  meta={
                    <>
                      <span className="mono">{a.curp ?? 'Sin CURP'}</span>
                      {a.puesto && <span>{a.puesto}</span>}
                      {a.calificacion != null && <span>Calificación {a.calificacion}</span>}
                      {a.folio_dc3 && <span className="mono">Folio {a.folio_dc3}</span>}
                    </>
                  }
                  derecha={<Badge tono={tonoDe(ESTADOS_DC3, estado)}>{etiquetaDe(ESTADOS_DC3, estado)}</Badge>}
                  onClick={() => { setError(null); setEditando(a) }}
                />
              )
            })}
          </Lista>
        )}
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--texto)', margin: '0 0 6px' }}>Evidencia de la sesión</h3>
        <PanelAdjuntos
          orgId={orgId}
          destino={{ sesion_id: sesion.id }}
          ayuda="Fotos de la sesión y la lista de asistencia firmada. Hasta 25 MB."
        />
      </section>

      <Modal
        abierto={editandoSesion}
        alCerrar={() => setEditandoSesion(false)}
        titulo={nombreCurso}
        ancho={600}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setEditandoSesion(false)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_SESION} cargando={guardando}>Guardar</Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {editandoSesion && <FormularioSesion id={FORM_SESION} orgId={orgId} inicial={sesion} alEnviar={guardarSesion} />}
      </Modal>

      <Modal
        abierto={editando !== null}
        alCerrar={() => setEditando(null)}
        titulo={editando?.nombre ?? ''}
        ancho={600}
        pie={
          <>
            {editando && <QuitarAsistente asistente={editando} ocupado={guardando} alQuitar={() => quitarAsistente(editando)} />}
            <Button variante="fantasma" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_ASISTENTE} cargando={guardando}>Guardar</Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {editando && (
          <>
            <FormularioAsistente key={editando.id} id={FORM_ASISTENTE} inicial={editando} alEnviar={guardarAsistente} />
            <div style={{ marginTop: 18 }}>
              <PanelAdjuntos
                orgId={orgId}
                destino={{ asistente_id: editando.id }}
                ayuda="El PDF del DC-3 que mandó el proveedor. Lleva CURP: súbelo sólo al expediente de este cliente."
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

/**
 * «Quitar» sólo si la base lo va a aceptar: sin folio de DC-3 y sin PDF. Se
 * pregunta con la misma clave que usa `PanelAdjuntos`.
 */
function QuitarAsistente({ asistente, ocupado, alQuitar }: { asistente: Asistente; ocupado: boolean; alQuitar: () => void }) {
  const { data: adjuntos = [], isPending } = useQuery({
    queryKey: queryKeys.adjuntos.de('asistente_id', asistente.id),
    queryFn: () => listarAdjuntos(asistente.org_id, { asistente_id: asistente.id }),
  })
  if (asistente.folio_dc3 || isPending || adjuntos.length > 0) return null
  return (
    <Button variante="peligro" onClick={alQuitar} disabled={ocupado} style={{ marginRight: 'auto' }}>
      Quitar de la lista
    </Button>
  )
}
