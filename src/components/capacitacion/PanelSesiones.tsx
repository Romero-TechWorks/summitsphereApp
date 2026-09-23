'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly } from '@/lib/utils/dates'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { ESTADOS_SESION, estadoDc3 } from '@/lib/capacitacion/catalogos'
import {
  crearSesion,
  listarAsistentes,
  listarCursos,
  listarProveedores,
  listarSesiones,
  type DatosSesion,
  type Sesion,
} from '@/lib/queries/capacitacion'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import { IconoCapacitacion } from '@/components/ui/Iconos'
import FichaSesion from './FichaSesion'
import FormularioSesion from './FormularioSesion'

const FORM = 'form-sesion-nueva'

type Filtro = 'todas' | 'pendientes' | 'programadas'

/**
 * **Las sesiones de un cliente** [F05·B3].
 *
 * ⚠️ **La ficha de una sesión NO tiene ruta propia**: se abre con `?sesion=<id>`
 * sobre esta pestaña, igual que `?proyecto=` en la cartera y `?documento=` en
 * `/sistemas` (§2.1). Así se manda por correo y el botón de atrás funciona.
 *
 * ⚠️ **Los DC-3 pendientes se cuentan en memoria** sobre la lista de asistentes
 * del cliente, que baja entera en una consulta: el filtro «Con DC-3 pendientes»
 * es lo que la firma abre cuando el proveedor tarda.
 */
export default function PanelSesiones({ orgId }: { orgId: string }) {
  const cliente = useQueryClient()
  const router = useRouter()
  const ruta = usePathname()
  const params = useSearchParams()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: sesiones = [], isPending } = useQuery({
    queryKey: queryKeys.capacitacion.sesiones(orgId),
    queryFn: () => listarSesiones(orgId),
  })
  const { data: asistentes = [] } = useQuery({
    queryKey: queryKeys.capacitacion.asistentes(orgId),
    queryFn: () => listarAsistentes(orgId),
  })
  const { data: cursos = [] } = useQuery({ queryKey: queryKeys.capacitacion.cursos(), queryFn: listarCursos })
  const { data: proveedores = [] } = useQuery({ queryKey: queryKeys.capacitacion.proveedores(), queryFn: listarProveedores })

  function abrir(id: string | null) {
    const siguientes = new URLSearchParams(params.toString())
    if (id) siguientes.set('sesion', id)
    else siguientes.delete('sesion')
    router.replace(`${ruta}?${siguientes.toString()}`, { scroll: false })
  }

  const pedida = params.get('sesion')
  // Una sesión que ya no está —enlace viejo, otro cliente— cae en la lista.
  const abierta = sesiones.find((s) => s.id === pedida) ?? null

  const nombreCurso = (id: string) => cursos.find((c) => c.id === id)?.nombre ?? 'Curso'

  async function crear(datos: DatosSesion) {
    setGuardando(true)
    setError(null)
    try {
      const { fila, encolado } = await crearSesion(orgId, datos, nombreCurso(datos.curso_id))
      aplicarEscritura<Sesion>({
        cliente, clave: queryKeys.capacitacion.sesiones(orgId), encolado,
        actualizar: (p) => [fila, ...p].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)),
      })
      setCreando(false)
      abrir(fila.id)
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

  if (abierta) {
    return <FichaSesion orgId={orgId} sesion={abierta} alVolver={() => abrir(null)} />
  }

  const resumen = sesiones.map((s) => {
    const suyos = asistentes.filter((a) => a.sesion_id === s.id)
    return { s, total: suyos.length, pendientes: suyos.filter((a) => estadoDc3(a) === 'pendiente').length }
  })
  const conPendientes = resumen.filter((r) => r.s.estado === 'impartida' && r.pendientes > 0)
  const visibles = resumen.filter((r) =>
    filtro === 'pendientes' ? r.s.estado === 'impartida' && r.pendientes > 0
      : filtro === 'programadas' ? r.s.estado === 'programada'
        : true)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            ['todas', `Todas (${sesiones.length})`],
            ['programadas', `Programadas (${sesiones.filter((s) => s.estado === 'programada').length})`],
            ['pendientes', `Con DC-3 pendientes (${conPendientes.length})`],
          ] as [Filtro, string][]).map(([valor, etiqueta]) => (
            <Button key={valor} variante={filtro === valor ? 'primario' : 'fantasma'} tamano="sm" onClick={() => setFiltro(valor)} style={{ minHeight: 40 }}>
              {etiqueta}
            </Button>
          ))}
        </div>
        <Button variante="primario" onClick={() => { setError(null); setCreando(true) }}>Nueva sesión</Button>
      </div>

      {error && !creando && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={sesiones.length === 0 ? 'Sin sesiones todavía' : 'Nada con ese filtro'}
          descripcion={sesiones.length === 0
            ? 'Una sesión es un curso impartido: el proveedor, el instructor, las fechas y la lista de asistencia. Programa la primera, o hazlo desde el Programa anual.'
            : 'Prueba con otro filtro.'}
        />
      ) : (
        <Lista etiqueta="Sesiones">
          {visibles.map(({ s, total, pendientes }) => (
            <Fila
              key={s.id}
              Icono={IconoCapacitacion}
              titulo={nombreCurso(s.curso_id)}
              meta={
                <>
                  <span className="mono">
                    {formatDateOnly(s.fecha_inicio)}{s.fecha_fin !== s.fecha_inicio ? ` – ${formatDateOnly(s.fecha_fin)}` : ''}
                  </span>
                  <span>{proveedores.find((p) => p.id === s.proveedor_id)?.nombre ?? 'Sin proveedor'}</span>
                  <span>{total} asistente{total === 1 ? '' : 's'}</span>
                  {s.estado === 'impartida' && pendientes > 0 && (
                    <span style={{ color: 'var(--advertencia)' }}>{pendientes} DC-3 pendiente{pendientes === 1 ? '' : 's'}</span>
                  )}
                </>
              }
              derecha={<Badge tono={tonoDe(ESTADOS_SESION, s.estado)}>{etiquetaDe(ESTADOS_SESION, s.estado)}</Badge>}
              onClick={() => abrir(s.id)}
            />
          ))}
        </Lista>
      )}

      <Modal
        abierto={creando}
        alCerrar={() => setCreando(false)}
        titulo="Nueva sesión"
        ancho={600}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setCreando(false)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM} cargando={guardando}>Programar</Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {creando && <FormularioSesion id={FORM} orgId={orgId} alEnviar={crear} />}
      </Modal>
    </>
  )
}
