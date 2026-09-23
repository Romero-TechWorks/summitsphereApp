'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { nombreDeMes } from '@/lib/capacitacion/catalogos'
import {
  actualizarDnc,
  crearDnc,
  crearSesion,
  eliminarDnc,
  listarCursos,
  listarDnc,
  listarSesiones,
  type DatosDnc,
  type DatosSesion,
  type RenglonDnc,
  type Sesion,
} from '@/lib/queries/capacitacion'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Textarea from '@/components/ui/Textarea'
import { IconoCalendario } from '@/components/ui/Iconos'
import FormularioDnc from './FormularioDnc'
import FormularioSesion from './FormularioSesion'

const FORM_DNC = 'form-dnc'
const FORM_SESION = 'form-sesion-desde-dnc'

type Dialogo =
  | { modo: 'alta' }
  | { modo: 'edicion'; renglon: RenglonDnc }
  | { modo: 'programar'; renglon: RenglonDnc }
  | { modo: 'cancelar'; renglon: RenglonDnc }
  | null

/** Lo que se pinta de un renglón. «Impartido» se DERIVA de las sesiones. */
function situacion(r: RenglonDnc, sesiones: Sesion[]): { texto: string; tono: 'exito' | 'info' | 'neutro' | 'advertencia' } {
  if (r.cancelada) return { texto: 'Cancelado', tono: 'neutro' }
  const suyas = sesiones.filter((s) => s.dnc_id === r.id && s.estado !== 'cancelada')
  if (suyas.some((s) => s.estado === 'impartida')) return { texto: 'Impartido', tono: 'exito' }
  if (suyas.length > 0) return { texto: 'Programado', tono: 'info' }
  return { texto: 'Pendiente', tono: 'advertencia' }
}

/**
 * **El programa anual de capacitación** (DNC) de un cliente.
 *
 * ⚠️ **«Impartido» no se guarda: se deriva** de que exista una sesión impartida
 * que cite el renglón. Guardarlo serían dos escrituras de la cola —la sesión y
 * el renglón— que sin señal podrían llegar desparejadas.
 *
 * ⚠️ Un renglón **que ya tiene sesión no se quita, se cancela**, con motivo: es
 * lo que el cliente planeó ante la STPS, y el hueco tiene que poder explicarse.
 */
export default function PanelPrograma({ orgId }: { orgId: string }) {
  const cliente = useQueryClient()
  const clave = queryKeys.capacitacion.dnc(orgId)
  const anioActual = new Date().getFullYear()
  const [anio, setAnio] = useState(anioActual)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: renglones = [], isPending } = useQuery({ queryKey: clave, queryFn: () => listarDnc(orgId) })
  const { data: sesiones = [] } = useQuery({
    queryKey: queryKeys.capacitacion.sesiones(orgId),
    queryFn: () => listarSesiones(orgId),
  })
  const { data: cursos = [] } = useQuery({ queryKey: queryKeys.capacitacion.cursos(), queryFn: listarCursos })

  const nombreCurso = (id: string) => cursos.find((c) => c.id === id)?.nombre ?? 'Curso'
  const delAnio = renglones.filter((r) => r.anio === anio)
  const anios = [...new Set([anioActual - 1, anioActual, anioActual + 1, ...renglones.map((r) => r.anio)])].sort()
  const tieneSesion = (r: RenglonDnc) => sesiones.some((s) => s.dnc_id === r.id)

  function poner(fila: RenglonDnc, encolado: boolean) {
    aplicarEscritura<RenglonDnc>({
      cliente, clave, encolado,
      actualizar: (p) => (p.some((x) => x.id === fila.id) ? p.map((x) => (x.id === fila.id ? fila : x)) : [...p, fila])
        .sort((a, b) => a.anio - b.anio || a.mes - b.mes),
    })
  }

  async function correr(accion: () => Promise<void>) {
    setGuardando(true)
    setError(null)
    try {
      await accion()
      setDialogo(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  const guardar = (datos: DatosDnc) => correr(async () => {
    const { fila, encolado } = dialogo?.modo === 'edicion'
      ? await actualizarDnc(dialogo.renglon, datos, nombreCurso(datos.curso_id))
      : await crearDnc(orgId, datos, nombreCurso(datos.curso_id))
    poner(fila, encolado)
  })

  const programar = (datos: DatosSesion) => correr(async () => {
    const { fila, encolado } = await crearSesion(orgId, datos, nombreCurso(datos.curso_id))
    aplicarEscritura<Sesion>({
      cliente, clave: queryKeys.capacitacion.sesiones(orgId), encolado,
      actualizar: (p) => [fila, ...p].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)),
    })
  })

  const cancelar = () => correr(async () => {
    if (dialogo?.modo !== 'cancelar') return
    if (!motivo.trim()) throw new Error('Di por qué no se va a impartir: es lo que se le explica al cliente y a la STPS.')
    const { fila, encolado } = await actualizarDnc(
      dialogo.renglon, { cancelada: true, motivo_cancelacion: motivo.trim() }, nombreCurso(dialogo.renglon.curso_id),
    )
    poner(fila, encolado)
  })

  const quitar = (r: RenglonDnc) => correr(async () => {
    const { encolado } = await eliminarDnc(r, nombreCurso(r.curso_id))
    aplicarEscritura<RenglonDnc>({ cliente, clave, encolado, actualizar: (p) => p.filter((x) => x.id !== r.id) })
  })

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  const impartidos = delAnio.filter((r) => situacion(r, sesiones).texto === 'Impartido').length
  const vivos = delAnio.filter((r) => !r.cancelada).length
  const editado = dialogo?.modo === 'edicion' ? dialogo.renglon : null

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ width: 140 }}>
          <Select etiqueta="Año" value={String(anio)} onChange={(e) => setAnio(Number(e.target.value))}>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </div>
        <Button variante="primario" onClick={() => { setError(null); setDialogo({ modo: 'alta' }) }}>Agregar al programa</Button>
      </div>

      {vivos > 0 && (
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--texto)', margin: '0 0 10px' }}>
          {impartidos} de {vivos} impartidos en {anio}
        </p>
      )}

      {error && !dialogo && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {delAnio.length === 0 ? (
        <EstadoVacio
          titulo={`Sin programa para ${anio}`}
          descripcion="El programa anual es la detección de necesidades del cliente: qué curso, en qué mes, para cuántas personas. De cada renglón se programa su sesión."
        />
      ) : (
        <Lista etiqueta={`Programa ${anio}`}>
          {delAnio.map((r) => {
            const s = situacion(r, sesiones)
            return (
              <Fila
                key={r.id}
                Icono={IconoCalendario}
                titulo={<span style={{ opacity: r.cancelada ? 0.55 : 1 }}>{nombreCurso(r.curso_id)}</span>}
                meta={
                  <>
                    <span>{nombreDeMes(r.mes)}</span>
                    {r.participantes != null && <span>{r.participantes} participantes</span>}
                    {r.cancelada && r.motivo_cancelacion && <span>{r.motivo_cancelacion}</span>}
                  </>
                }
                // ⚠️ Sin `onClick` en la fila: con botones dentro, un toque en
                // «Programar sesión» subiría también a la fila y abriría otro
                // modal — y un botón dentro de otro no es HTML válido.
                derecha={
                  <>
                    {!r.cancelada && (
                      <Button variante="fantasma" tamano="sm" onClick={() => { setError(null); setDialogo({ modo: 'edicion', renglon: r }) }}>
                        Editar
                      </Button>
                    )}
                    {s.texto === 'Pendiente' && (
                      <Button variante="secundario" tamano="sm" onClick={() => { setError(null); setDialogo({ modo: 'programar', renglon: r }) }}>
                        Programar sesión
                      </Button>
                    )}
                    <Badge tono={s.tono}>{s.texto}</Badge>
                  </>
                }
              />
            )
          })}
        </Lista>
      )}

      <Modal
        abierto={dialogo?.modo === 'alta' || dialogo?.modo === 'edicion'}
        alCerrar={() => setDialogo(null)}
        titulo={editado ? nombreCurso(editado.curso_id) : `Agregar al programa ${anio}`}
        pie={
          <>
            {editado && !tieneSesion(editado) && (
              <Button variante="peligro" onClick={() => quitar(editado)} disabled={guardando} style={{ marginRight: 'auto' }}>Quitar</Button>
            )}
            {editado && (
              <Button variante="fantasma" onClick={() => { setMotivo(''); setDialogo({ modo: 'cancelar', renglon: editado }) }}>
                Cancelar el renglón
              </Button>
            )}
            <Button variante="fantasma" onClick={() => setDialogo(null)}>Cerrar</Button>
            <Button variante="primario" type="submit" form={FORM_DNC} cargando={guardando}>{editado ? 'Guardar' : 'Agregar'}</Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {(dialogo?.modo === 'alta' || dialogo?.modo === 'edicion') && (
          <FormularioDnc
            key={editado?.id ?? 'nuevo'}
            id={FORM_DNC}
            orgId={orgId}
            anio={anio}
            inicial={editado ?? undefined}
            cursoFijo={editado ? tieneSesion(editado) : false}
            alEnviar={guardar}
          />
        )}
      </Modal>

      <Modal
        abierto={dialogo?.modo === 'programar'}
        alCerrar={() => setDialogo(null)}
        titulo={dialogo?.modo === 'programar' ? `Programar · ${nombreCurso(dialogo.renglon.curso_id)}` : ''}
        ancho={600}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setDialogo(null)}>Cerrar</Button>
            <Button variante="primario" type="submit" form={FORM_SESION} cargando={guardando}>Programar</Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {dialogo?.modo === 'programar' && (
          <FormularioSesion
            id={FORM_SESION}
            orgId={orgId}
            sugerida={{ curso_id: dialogo.renglon.curso_id, dnc_id: dialogo.renglon.id, sitio_id: dialogo.renglon.sitio_id }}
            alEnviar={programar}
          />
        )}
      </Modal>

      <Modal
        abierto={dialogo?.modo === 'cancelar'}
        alCerrar={() => setDialogo(null)}
        titulo="Cancelar el renglón"
        pie={
          <>
            <Button variante="fantasma" onClick={() => setDialogo(null)}>Volver</Button>
            <Button variante="peligro" onClick={cancelar} cargando={guardando}>Cancelar el renglón</Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        <Textarea
          etiqueta="Motivo"
          rows={3}
          ayuda="Un curso planeado que no se da es un hueco que el cliente tiene que poder explicar."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </Modal>
    </>
  )
}
