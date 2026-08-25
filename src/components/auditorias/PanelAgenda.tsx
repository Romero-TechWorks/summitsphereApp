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
  type DatosAgenda,
  type RenglonAgenda,
} from '@/lib/queries/auditorias'
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
 */
export default function PanelAgenda({
  auditoriaId,
  orgId,
}: {
  auditoriaId: string
  orgId: string
}) {
  const cliente = useQueryClient()
  const clave = queryKeys.auditorias.agenda(auditoriaId)

  const [editando, setEditando] = useState<RenglonAgenda | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: agenda = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarAgenda(auditoriaId),
  })

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
        <Button variante="primario" onClick={abrirAlta}>Añadir un punto</Button>
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
