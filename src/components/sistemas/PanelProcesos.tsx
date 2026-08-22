'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import {
  actualizarProceso,
  cambiarActivoProceso,
  crearProceso,
  listarProcesos,
  type DatosProceso,
  type DuenoProceso,
  type ProcesoConDueno,
} from '@/lib/queries/procesos'
import { TIPOS_PROCESO } from '@/lib/sistemas/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { normalizar } from '@/lib/utils/texto'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import { IconoProceso } from '@/components/ui/Iconos'
import FormularioProceso from './FormularioProceso'

const FORM = 'form-proceso'

/**
 * **El mapa de procesos** [F02·B4].
 *
 * Es la tabla más pequeña de la fase y la que sostiene a las otras tres: el
 * proceso dueño de un documento, el proceso de un riesgo y el que mide un
 * indicador salen de aquí.
 */
export default function PanelProcesos({ orgId }: { orgId: string }) {
  const cliente = useQueryClient()
  const clave = queryKeys.sistemas.procesos(orgId)

  const [texto, setTexto] = useState('')
  const [verBajas, setVerBajas] = useState(false)
  const [editando, setEditando] = useState<ProcesoConDueno | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: procesos = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarProcesos(orgId),
    enabled: Boolean(orgId),
  })

  // ⚠️ El buscador filtra EN MEMORIA y no entra en la clave de caché
  // (CLAUDE.md · reglas del offline, 7). Con una consulta por búsqueda, sin
  // señal la lista se vacía al teclear la primera letra.
  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    return procesos.filter((p) => {
      if (!verBajas && !p.activo) return false
      if (!aguja) return true
      return (
        normalizar(p.nombre).includes(aguja) ||
        normalizar(p.codigo ?? '').includes(aguja) ||
        normalizar(p.dueno?.nombre ?? '').includes(aguja)
      )
    })
  }, [procesos, texto, verBajas])

  const dadosDeBaja = procesos.filter((p) => !p.activo).length

  function abrirAlta() {
    setEditando(null)
    setError(null)
    setAbierto(true)
  }

  function abrirEdicion(proceso: ProcesoConDueno) {
    setEditando(proceso)
    setError(null)
    setAbierto(true)
  }

  async function guardar(datos: DatosProceso, dueno: DuenoProceso | null) {
    setGuardando(true)
    setError(null)

    try {
      if (editando) {
        const { fila, encolado } = await actualizarProceso(editando, datos, dueno)
        aplicarEscritura<ProcesoConDueno>({
          cliente,
          clave,
          encolado,
          actualizar: (previo) => previo.map((p) => (p.id === fila.id ? fila : p)),
        })
      } else {
        const { fila, encolado } = await crearProceso(orgId, datos, dueno)
        aplicarEscritura<ProcesoConDueno>({
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

  async function cambiarActivo(proceso: ProcesoConDueno) {
    setError(null)

    try {
      const { fila, encolado } = await cambiarActivoProceso(proceso, !proceso.activo)
      aplicarEscritura<ProcesoConDueno>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.map((p) => (p.id === fila.id ? fila : p)),
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
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div style={{ flex: '1 1 220px', maxWidth: 320 }}>
          <Input
            etiqueta="Buscar"
            etiquetaOculta
            placeholder="Buscar un proceso"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <Button variante="primario" onClick={abrirAlta}>Nuevo proceso</Button>
      </div>

      {dadosDeBaja > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Checkbox
            etiqueta={`Ver los ${dadosDeBaja} dados de baja`}
            checked={verBajas}
            onChange={(e) => setVerBajas(e.target.checked)}
          />
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={procesos.length === 0 ? 'Este cliente no tiene mapa de procesos' : 'Nada con ese texto'}
          descripcion={
            procesos.length === 0
              ? 'El mapa de procesos es lo primero que se levanta en un diagnóstico, y de él cuelgan los documentos, los riesgos y los indicadores. Empieza por los operativos: los que tocan al producto o al servicio.'
              : 'Prueba con otro nombre, con el código o con el dueño del proceso.'
          }
          accion={procesos.length === 0 ? <Button variante="primario" onClick={abrirAlta}>Dar de alta el primero</Button> : null}
        />
      ) : (
        <Lista etiqueta="Mapa de procesos">
          {visibles.map((proceso) => (
            <Fila
              key={proceso.id}
              Icono={IconoProceso}
              titulo={
                <>
                  {proceso.codigo && (
                    <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                      {proceso.codigo}
                    </span>
                  )}
                  {proceso.nombre}
                </>
              }
              meta={
                <>
                  <span>{proceso.dueno?.nombre ?? 'Sin dueño asignado'}</span>
                  {proceso.dueno?.puesto && <span>{proceso.dueno.puesto}</span>}
                  {!proceso.activo && <span>Dado de baja</span>}
                </>
              }
              onClick={() => abrirEdicion(proceso)}
              derecha={
                <>
                  <Badge tono={tonoDe(TIPOS_PROCESO, proceso.tipo)}>
                    {etiquetaDe(TIPOS_PROCESO, proceso.tipo)}
                  </Badge>
                  <Button
                    variante="fantasma"
                    tamano="sm"
                    onClick={() => cambiarActivo(proceso)}
                    title={proceso.activo ? `Dar de baja ${proceso.nombre}` : `Reactivar ${proceso.nombre}`}
                  >
                    {proceso.activo ? 'Baja' : 'Reactivar'}
                  </Button>
                </>
              }
            />
          ))}
        </Lista>
      )}

      <Modal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo={editando ? `Proceso ${editando.nombre}` : 'Nuevo proceso'}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM} cargando={guardando}>
              {editando ? 'Guardar' : 'Dar de alta'}
            </Button>
          </>
        }
      >
        {error && (
          <div style={{ marginBottom: 12 }}>
            <Aviso tono="error">{error}</Aviso>
          </div>
        )}
        <FormularioProceso
          id={FORM}
          orgId={orgId}
          inicial={editando ?? undefined}
          alEnviar={guardar}
        />
      </Modal>
    </>
  )
}
