'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { listarOrganizaciones, listarUsuariosDeLaFirma, nombreDeOrganizacion } from '@/lib/queries/cartera'
import {
  crearAuditoria,
  folioVisible,
  listarAuditorias,
  type AuditoriaEnLista,
  type DatosAuditoria,
} from '@/lib/queries/auditorias'
import {
  ESTADOS_ARCHIVADOS_AUDITORIA,
  ESTADOS_AUDITORIA,
  TIPOS_AUDITORIA,
} from '@/lib/auditorias/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { formatDateOnly } from '@/lib/utils/dates'
import { normalizar } from '@/lib/utils/texto'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import { IconoAuditorias } from '@/components/ui/Iconos'
import FormularioAuditoria from './FormularioAuditoria'

const FORM = 'form-auditoria'

/**
 * **El listado de auditorías de toda la cartera** [F03·B1].
 *
 * Es «qué tengo esta semana», y por eso cruza clientes: la semana de un auditor
 * no se organiza por expediente. Cada fila lleva al expediente de su auditoría,
 * donde viven el alcance, el equipo y la agenda.
 *
 * ⚠️ Los filtros —texto, cliente, estado— se aplican **en memoria**. No entran
 * en la clave de caché: con una consulta por filtro, en una planta sin señal la
 * lista se vacía en cuanto se teclea la primera letra y el auditor concluye que
 * la app perdió su trabajo (CLAUDE.md · reglas del offline, 7).
 */
export default function PanelAuditorias() {
  const cliente = useQueryClient()
  const clave = queryKeys.auditorias.lista()

  const [texto, setTexto] = useState('')
  const [orgFiltro, setOrgFiltro] = useState('')
  const [verCerradas, setVerCerradas] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: auditorias = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: listarAuditorias,
  })

  const { data: organizaciones = [] } = useQuery({
    queryKey: queryKeys.cartera.organizaciones(),
    queryFn: listarOrganizaciones,
  })

  const { data: usuarios = [] } = useQuery({
    queryKey: queryKeys.cartera.usuariosFirma(),
    queryFn: listarUsuariosDeLaFirma,
  })

  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    return auditorias.filter((a) => {
      if (!verCerradas && ESTADOS_ARCHIVADOS_AUDITORIA.includes(a.estado)) return false
      if (orgFiltro && a.org_id !== orgFiltro) return false
      if (!aguja) return true
      return (
        normalizar(a.titulo).includes(aguja) ||
        normalizar(a.folio ?? '').includes(aguja) ||
        normalizar(a.organizacion ? nombreDeOrganizacion(a.organizacion) : '').includes(aguja) ||
        normalizar(a.lider?.nombre ?? '').includes(aguja)
      )
    })
  }, [auditorias, texto, orgFiltro, verCerradas])

  const archivadas = auditorias.filter((a) => ESTADOS_ARCHIVADOS_AUDITORIA.includes(a.estado)).length

  async function guardar(orgId: string, datos: DatosAuditoria) {
    setGuardando(true)
    setError(null)

    try {
      const organizacion = organizaciones.find((o) => o.id === orgId) ?? null
      const lider = usuarios.find((u) => u.id === datos.auditor_lider_id) ?? null

      const { fila, encolado } = await crearAuditoria(
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
        lider ? { id: lider.id, nombre: lider.nombre } : null,
      )

      aplicarEscritura<AuditoriaEnLista>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => [fila, ...previo],
      })

      setAbierto(false)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
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
              placeholder="Folio, título, cliente o líder"
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
        <Button variante="primario" onClick={() => { setError(null); setAbierto(true) }}>
          Planear auditoría
        </Button>
      </div>

      {archivadas > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Checkbox
            etiqueta={`Ver las ${archivadas} cerradas y canceladas`}
            checked={verCerradas}
            onChange={(e) => setVerCerradas(e.target.checked)}
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
          titulo={auditorias.length === 0 ? 'Todavía no hay ninguna auditoría' : 'Nada con ese filtro'}
          descripcion={
            auditorias.length === 0
              ? 'Una auditoría se planea aquí, con señal: cliente, tipo, fechas, equipo y alcance. Lo que se hace en planta —la lista de verificación y los hallazgos— sale de ese alcance y funciona sin señal.'
              : 'Prueba con otro cliente, o marca la casilla para ver también las cerradas.'
          }
          accion={
            auditorias.length === 0
              ? <Button variante="primario" onClick={() => setAbierto(true)}>Planear la primera</Button>
              : null
          }
        />
      ) : (
        <Lista etiqueta="Auditorías">
          {visibles.map((auditoria) => (
            <Fila
              key={auditoria.id}
              Icono={IconoAuditorias}
              href={`/auditorias/${auditoria.id}`}
              titulo={
                <>
                  <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                    {folioVisible(auditoria)}
                  </span>
                  {auditoria.titulo}
                </>
              }
              meta={
                <>
                  <span>
                    {auditoria.organizacion
                      ? nombreDeOrganizacion(auditoria.organizacion)
                      : 'Sin cliente'}
                  </span>
                  <span>{etiquetaDe(TIPOS_AUDITORIA, auditoria.tipo)}</span>
                  {auditoria.fecha_inicio && (
                    <span>{formatDateOnly(auditoria.fecha_inicio)}</span>
                  )}
                  <span>{auditoria.lider?.nombre ?? 'Sin auditor líder'}</span>
                </>
              }
              derecha={
                <Badge tono={tonoDe(ESTADOS_AUDITORIA, auditoria.estado)}>
                  {etiquetaDe(ESTADOS_AUDITORIA, auditoria.estado)}
                </Badge>
              }
            />
          ))}
        </Lista>
      )}

      <Modal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo="Planear una auditoría"
        pie={
          <>
            <Button variante="fantasma" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM} cargando={guardando}>
              Planear
            </Button>
          </>
        }
      >
        {error && (
          <div style={{ marginBottom: 12 }}>
            <Aviso tono="error">{error}</Aviso>
          </div>
        )}
        <FormularioAuditoria id={FORM} alEnviar={guardar} />
      </Modal>
    </>
  )
}
