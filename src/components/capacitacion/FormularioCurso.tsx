'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { listarNoms } from '@/lib/queries/noms'
import { MODALIDADES, TIPOS_CURSO } from '@/lib/capacitacion/catalogos'
import type { Curso, DatosCurso } from '@/lib/queries/capacitacion'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

/**
 * Un curso de la biblioteca de la firma.
 *
 * ⚠️ **La biblioteca la construye el usuario** (decisión del dueño, 22 sep 2026):
 * nace vacía y se da de alta el curso que se está impartiendo, cuando se imparte.
 * La NOM sale de la biblioteca de cumplimiento — un curso de brigada contra
 * incendios responde a la NOM-002.
 */
export default function FormularioCurso({
  id,
  inicial,
  alEnviar,
}: {
  id: string
  inicial?: Curso
  alEnviar: (datos: DatosCurso) => void
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [clave, setClave] = useState(inicial?.clave ?? '')
  const [tipo, setTipo] = useState(inicial?.tipo ?? 'normatividad')
  const [nomId, setNomId] = useState(inicial?.nom_id ?? '')
  const [horas, setHoras] = useState(inicial?.duracion_horas == null ? '' : String(inicial.duracion_horas))
  const [modalidad, setModalidad] = useState(inicial?.modalidad ?? 'presencial')
  const [temario, setTemario] = useState(inicial?.temario ?? '')
  const [errores, setErrores] = useState<Record<string, string>>({})

  const { data: noms = [] } = useQuery({ queryKey: queryKeys.cumplimiento.noms(), queryFn: listarNoms })

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const nuevos: Record<string, string> = {}
    if (!nombre.trim()) nuevos.nombre = 'Cómo se llama el curso'
    const h = horas.trim().replace(',', '.')
    if (h !== '' && !(Number(h) > 0)) nuevos.horas = 'Horas, mayor que cero: 8 o 2.5'
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return

    alEnviar({
      nombre: nombre.trim(),
      clave: clave.trim() || null,
      tipo,
      nom_id: nomId || null,
      duracion_horas: h === '' ? null : Number(h),
      modalidad,
      temario: temario.trim() || null,
    })
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 14 }}>
        <Input
          etiqueta="Nombre"
          ayuda="Como aparece en la constancia: «Prevención y combate de incendios»."
          required
          autoFocus={!inicial}
          value={nombre}
          error={errores.nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <Input etiqueta="Clave" ayuda="Opcional." className="mono" value={clave} onChange={(e) => setClave(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <Select etiqueta="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS_CURSO.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
        </Select>
        <Select etiqueta="Modalidad" value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
          {MODALIDADES.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
        </Select>
        <Input
          etiqueta="Duración (horas)"
          inputMode="decimal"
          className="mono"
          value={horas}
          error={errores.horas}
          onChange={(e) => setHoras(e.target.value)}
        />
      </div>

      <Select
        etiqueta="NOM a la que responde"
        marcador={noms.length === 0 ? 'La biblioteca de NOMs está vacía' : 'Ninguna'}
        value={nomId}
        onChange={(e) => setNomId(e.target.value)}
      >
        {noms.filter((n) => n.vigente || n.id === nomId).map((n) => (
          <option key={n.id} value={n.id}>{n.clave} · {n.nombre}</option>
        ))}
      </Select>

      <Textarea
        etiqueta="Temario"
        rows={4}
        ayuda="Los temas, uno por línea. Es lo que se le manda al proveedor y lo que se le enseña al cliente."
        value={temario}
        onChange={(e) => setTemario(e.target.value)}
      />
    </form>
  )
}
