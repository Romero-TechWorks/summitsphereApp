'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { listarSitios } from '@/lib/queries/cartera'
import { listarCursos, listarProveedores, type DatosSesion, type Sesion } from '@/lib/queries/capacitacion'
import { ESTADOS_SESION } from '@/lib/capacitacion/catalogos'
import { hoyISO } from '@/lib/utils/dates'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

const FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Alta y edición de una sesión.
 *
 * ⚠️ **El instructor es TEXTO** (respuesta 1 de Summit): es del proveedor, no de
 * la firma. Y el proveedor puede quedar vacío al programar —todavía no se
 * contrata—; la solicitud de DC-3 es la que lo exige.
 *
 * ⚠️ Los desplegables salen de `useQuery` con su clave (regla 3 del offline):
 * una lista de asistencia se captura en la sala de capacitación de la planta.
 */
export default function FormularioSesion({
  id,
  orgId,
  inicial,
  sugerida,
  alEnviar,
}: {
  id: string
  orgId: string
  inicial?: Sesion
  /** Al programar desde un renglón del programa anual: curso y renglón puestos. */
  sugerida?: { curso_id: string; dnc_id: string; sitio_id: string | null }
  alEnviar: (datos: DatosSesion) => void
}) {
  const [cursoId, setCursoId] = useState(inicial?.curso_id ?? sugerida?.curso_id ?? '')
  const [proveedorId, setProveedorId] = useState(inicial?.proveedor_id ?? '')
  const [instructor, setInstructor] = useState(inicial?.instructor ?? '')
  const [inicio, setInicio] = useState(inicial?.fecha_inicio ?? hoyISO())
  const [fin, setFin] = useState(inicial?.fecha_fin ?? '')
  const [horas, setHoras] = useState(inicial?.duracion_horas == null ? '' : String(inicial.duracion_horas))
  const [sede, setSede] = useState(inicial?.sede ?? '')
  const [sitioId, setSitioId] = useState(inicial?.sitio_id ?? sugerida?.sitio_id ?? '')
  const [estado, setEstado] = useState(inicial?.estado ?? 'programada')
  const [motivo, setMotivo] = useState(inicial?.motivo_cancelacion ?? '')
  const [notas, setNotas] = useState(inicial?.notas ?? '')
  const [errores, setErrores] = useState<Record<string, string>>({})

  const { data: cursos = [] } = useQuery({ queryKey: queryKeys.capacitacion.cursos(), queryFn: listarCursos })
  const { data: proveedores = [] } = useQuery({ queryKey: queryKeys.capacitacion.proveedores(), queryFn: listarProveedores })
  const { data: sitios = [] } = useQuery({ queryKey: queryKeys.cartera.sitios(orgId), queryFn: () => listarSitios(orgId) })

  const curso = cursos.find((c) => c.id === cursoId)
  // El renglón del programa sólo se conserva si el curso sigue siendo el suyo:
  // la base rechaza una sesión de otro curso colgada de ese renglón.
  const dncId = inicial?.dnc_id ?? sugerida?.dnc_id ?? null
  const cursoDelPrograma = sugerida?.curso_id ?? (inicial?.dnc_id ? inicial.curso_id : null)

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const nuevos: Record<string, string> = {}
    const finReal = fin || inicio
    const h = horas.trim().replace(',', '.')
    if (!cursoId) nuevos.curso = 'Elige el curso'
    if (!FECHA.test(inicio)) nuevos.inicio = 'La fecha en que empieza'
    if (FECHA.test(inicio) && FECHA.test(finReal) && finReal < inicio) nuevos.fin = 'Termina antes de empezar'
    if (h !== '' && !(Number(h) > 0)) nuevos.horas = 'Horas, mayor que cero'
    if (estado === 'cancelada' && !motivo.trim()) nuevos.motivo = 'Di por qué se canceló'
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return

    alEnviar({
      curso_id: cursoId,
      dnc_id: dncId && cursoId === cursoDelPrograma ? dncId : null,
      proveedor_id: proveedorId || null,
      instructor: instructor.trim() || null,
      fecha_inicio: inicio,
      fecha_fin: finReal,
      duracion_horas: h === '' ? (curso?.duracion_horas ?? null) : Number(h),
      sede: sede.trim() || null,
      sitio_id: sitioId || null,
      estado,
      motivo_cancelacion: estado === 'cancelada' ? motivo.trim() : null,
      notas: notas.trim() || null,
    })
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Select
        etiqueta="Curso"
        required
        marcador={cursos.length === 0 ? 'La biblioteca de cursos está vacía' : 'Elige el curso'}
        value={cursoId}
        error={errores.curso}
        onChange={(e) => setCursoId(e.target.value)}
      >
        {cursos.filter((c) => c.activo || c.id === cursoId).map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </Select>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Select
          etiqueta="Proveedor"
          ayuda="El agente capacitador que imparte y expide los DC-3."
          marcador={proveedores.length === 0 ? 'No hay proveedores en el catálogo' : 'Todavía no se contrata'}
          value={proveedorId}
          onChange={(e) => setProveedorId(e.target.value)}
        >
          {proveedores.filter((p) => p.activo || p.id === proveedorId).map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </Select>
        <Input
          etiqueta="Instructor"
          ayuda="Del proveedor: nombre como va en la constancia."
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        <Input etiqueta="Inicio" type="date" required value={inicio} error={errores.inicio} onChange={(e) => setInicio(e.target.value)} />
        <Input etiqueta="Término" type="date" ayuda="Vacío = el mismo día." value={fin} error={errores.fin} onChange={(e) => setFin(e.target.value)} />
        <Input
          etiqueta="Horas"
          inputMode="decimal"
          className="mono"
          placeholder={curso?.duracion_horas != null ? String(curso.duracion_horas) : ''}
          ayuda={curso?.duracion_horas != null ? 'Vacío = las del curso.' : undefined}
          value={horas}
          error={errores.horas}
          onChange={(e) => setHoras(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Select etiqueta="Sitio" marcador="Ninguno" value={sitioId} onChange={(e) => setSitioId(e.target.value)}>
          {sitios.filter((s) => s.activo || s.id === sitioId).map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Select>
        <Input etiqueta="Sede" ayuda="Dónde: «Sala de juntas, planta Toluca»." value={sede} onChange={(e) => setSede(e.target.value)} />
      </div>

      {inicial && (
        <Select etiqueta="Estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
          {ESTADOS_SESION.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
        </Select>
      )}
      {estado === 'cancelada' && (
        <Textarea etiqueta="Motivo de la cancelación" rows={2} required value={motivo} error={errores.motivo} onChange={(e) => setMotivo(e.target.value)} />
      )}

      <Textarea etiqueta="Notas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
    </form>
  )
}
