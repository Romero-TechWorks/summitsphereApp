'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { listarOrganizaciones, nombreDeOrganizacion } from '@/lib/queries/cartera'
import {
  actualizarPrograma,
  crearPrograma,
  listarProgramas,
  type DatosPrograma,
  type ProgramaEnLista,
} from '@/lib/queries/auditorias'
import { ESTADOS_PROGRAMA } from '@/lib/auditorias/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { formatDate } from '@/lib/utils/dates'
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
import { IconoCalendario } from '@/components/ui/Iconos'
import FormularioPrograma from './FormularioPrograma'

const FORM = 'form-programa'

/**
 * **El programa anual de auditorías** [F03·B1].
 *
 * Una fila por cliente y año: qué se audita, con qué objetivo y bajo qué
 * criterio. De aquí cuelgan las auditorías concretas.
 *
 * ⚠️ El filtro por cliente y por año va **en memoria**: no entra en la clave de
 * caché. Con una consulta por filtro, sin señal la lista se vaciaría al elegir
 * un cliente —esa clave no está en la caché— y quien lo viera concluiría que la
 * app perdió el programa (CLAUDE.md · reglas del offline, 7).
 */
export default function PanelPrograma() {
  const cliente = useQueryClient()
  const clave = queryKeys.auditorias.programas()

  const [texto, setTexto] = useState('')
  const [orgFiltro, setOrgFiltro] = useState('')
  const [editando, setEditando] = useState<ProgramaEnLista | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: programas = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: listarProgramas,
  })

  const { data: organizaciones = [] } = useQuery({
    queryKey: queryKeys.cartera.organizaciones(),
    queryFn: listarOrganizaciones,
  })

  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    return programas.filter((p) => {
      if (orgFiltro && p.org_id !== orgFiltro) return false
      if (!aguja) return true
      return (
        normalizar(p.nombre).includes(aguja) ||
        normalizar(String(p.anio)).includes(aguja) ||
        normalizar(p.organizacion ? nombreDeOrganizacion(p.organizacion) : '').includes(aguja)
      )
    })
  }, [programas, texto, orgFiltro])

  function abrirAlta() {
    setEditando(null)
    setError(null)
    setAbierto(true)
  }

  function abrirEdicion(programa: ProgramaEnLista) {
    setEditando(programa)
    setError(null)
    setAbierto(true)
  }

  async function guardar(orgId: string, datos: DatosPrograma) {
    setGuardando(true)
    setError(null)

    try {
      if (editando) {
        const { fila, encolado } = await actualizarPrograma(editando, datos)
        aplicarEscritura<ProgramaEnLista>({
          cliente,
          clave,
          encolado,
          actualizar: (previo) => previo.map((p) => (p.id === fila.id ? fila : p)),
        })
      } else {
        const organizacion = organizaciones.find((o) => o.id === orgId) ?? null
        const { fila, encolado } = await crearPrograma(
          orgId,
          datos,
          organizacion
            ? {
                id: organizacion.id,
                razon_social: organizacion.razon_social,
                nombre_comercial: organizacion.nombre_comercial,
                giro: organizacion.giro,
              }
            : null,
        )
        aplicarEscritura<ProgramaEnLista>({
          cliente,
          clave,
          encolado,
          actualizar: (previo) => [fila, ...previo],
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: '1 1 320px' }}>
          <div style={{ flex: '1 1 180px', maxWidth: 260 }}>
            <Input
              etiqueta="Buscar"
              etiquetaOculta
              placeholder="Buscar un programa"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <div style={{ flex: '1 1 180px', maxWidth: 260 }}>
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
        </div>
        <Button variante="primario" onClick={abrirAlta}>Nuevo programa</Button>
      </div>

      {error && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={programas.length === 0 ? 'Todavía no hay ningún programa' : 'Nada con ese filtro'}
          descripcion={
            programas.length === 0
              ? 'ISO 9001 §9.2.2 pide el programa de auditorías por escrito: qué se audita en el año, con qué frecuencia, con qué objetivo y bajo qué criterio. Es lo primero que un organismo certificador pide ver de la auditoría interna.'
              : 'Prueba con otro cliente, con el año o con el nombre del programa.'
          }
          accion={
            programas.length === 0
              ? <Button variante="primario" onClick={abrirAlta}>Levantar el primero</Button>
              : null
          }
        />
      ) : (
        <Lista etiqueta="Programas anuales de auditoría">
          {visibles.map((programa) => (
            <Fila
              key={programa.id}
              Icono={IconoCalendario}
              titulo={
                <>
                  <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                    {programa.anio}
                  </span>
                  {programa.nombre}
                </>
              }
              meta={
                <>
                  <span>
                    {programa.organizacion
                      ? nombreDeOrganizacion(programa.organizacion)
                      : 'Sin cliente'}
                  </span>
                  {programa.aprobado_en && (
                    <span>Aprobado el {formatDate(programa.aprobado_en)}</span>
                  )}
                </>
              }
              onClick={() => abrirEdicion(programa)}
              derecha={
                <Badge tono={tonoDe(ESTADOS_PROGRAMA, programa.estado)}>
                  {etiquetaDe(ESTADOS_PROGRAMA, programa.estado)}
                </Badge>
              }
            />
          ))}
        </Lista>
      )}

      <Modal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo={editando ? `Programa ${editando.anio}` : 'Nuevo programa anual'}
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
        <FormularioPrograma id={FORM} inicial={editando ?? undefined} alEnviar={guardar} />
      </Modal>
    </>
  )
}
