'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { listarSitios } from '@/lib/queries/cartera'
import { listarCursos, type DatosDnc, type RenglonDnc } from '@/lib/queries/capacitacion'
import { nombreDeMes } from '@/lib/capacitacion/catalogos'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

/** Un renglón del programa anual: este curso, este mes, para tantas personas. */
export default function FormularioDnc({
  id,
  orgId,
  anio,
  inicial,
  cursoFijo = false,
  alEnviar,
}: {
  id: string
  orgId: string
  anio: number
  inicial?: RenglonDnc
  /**
   * ⚠️ Un renglón que ya tiene sesión no cambia de curso: la base valida que la
   * sesión sea del curso del renglón al escribir la SESIÓN, no al escribir el
   * renglón, así que cambiarlo aquí dejaría «impartido» pintado en el curso
   * equivocado.
   */
  cursoFijo?: boolean
  alEnviar: (datos: DatosDnc) => void
}) {
  const [cursoId, setCursoId] = useState(inicial?.curso_id ?? '')
  const [mes, setMes] = useState(String(inicial?.mes ?? new Date().getMonth() + 1))
  const [participantes, setParticipantes] = useState(inicial?.participantes == null ? '' : String(inicial.participantes))
  const [sitioId, setSitioId] = useState(inicial?.sitio_id ?? '')
  const [notas, setNotas] = useState(inicial?.notas ?? '')
  const [errores, setErrores] = useState<Record<string, string>>({})

  const { data: cursos = [] } = useQuery({ queryKey: queryKeys.capacitacion.cursos(), queryFn: listarCursos })
  const { data: sitios = [] } = useQuery({ queryKey: queryKeys.cartera.sitios(orgId), queryFn: () => listarSitios(orgId) })

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const nuevos: Record<string, string> = {}
    if (!cursoId) nuevos.curso = 'Elige el curso'
    if (participantes.trim() !== '' && !/^\d{1,5}$/.test(participantes.trim())) nuevos.participantes = 'Un número entero'
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return
    alEnviar({
      anio: inicial?.anio ?? anio,
      mes: Number(mes),
      curso_id: cursoId,
      participantes: participantes.trim() === '' ? null : Number(participantes),
      sitio_id: sitioId || null,
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
        disabled={cursoFijo}
        ayuda={cursoFijo ? 'Ya tiene sesión: el curso no cambia.' : undefined}
        onChange={(e) => setCursoId(e.target.value)}
      >
        {cursos.filter((c) => c.activo || c.id === cursoId).map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </Select>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <Select etiqueta={`Mes de ${inicial?.anio ?? anio}`} value={mes} onChange={(e) => setMes(e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{nombreDeMes(m)}</option>
          ))}
        </Select>
        <Input
          etiqueta="Participantes"
          inputMode="numeric"
          className="mono"
          value={participantes}
          error={errores.participantes}
          onChange={(e) => setParticipantes(e.target.value)}
        />
        <Select etiqueta="Sitio" marcador="Ninguno" value={sitioId} onChange={(e) => setSitioId(e.target.value)}>
          {sitios.filter((s) => s.activo || s.id === sitioId).map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Select>
      </div>
      <Textarea etiqueta="Notas" rows={2} ayuda="A quién va dirigido, por qué hace falta." value={notas} onChange={(e) => setNotas(e.target.value)} />
    </form>
  )
}
