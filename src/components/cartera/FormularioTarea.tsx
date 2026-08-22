'use client'

import { useState } from 'react'
import { z } from 'zod'
import Checkbox from '@/components/ui/Checkbox'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { ESTADOS_TAREA, ETAPAS_PROYECTO } from '@/lib/cartera/catalogos'
import type { MiembroEquipo } from '@/lib/queries/cartera'
import type { DatosTarea, Responsable, TareaConResponsable } from '@/lib/queries/tareas'

const FECHA = /^\d{4}-\d{2}-\d{2}$/

const esquema = z.object({
  titulo: z.string().trim().min(1, 'La tarea necesita un título'),
  detalle: z.string().trim(),
  etapa: z.string().min(1),
  estado: z.string().min(1),
  responsable_id: z.string(),
  fecha_compromiso: z.string().refine((v) => v === '' || FECHA.test(v), 'Fecha inválida'),
  exige_evidencia: z.boolean(),
})

type Campos = z.infer<typeof esquema>

/**
 * Alta y edición de una tarea de la metodología.
 *
 * ⚠️ El desplegable de responsable sale del **equipo asignado a la
 * organización** y llega por `props`, ya en la caché: quien es responsable de
 * una tarea tiene que poder ver el proyecto, y sin señal un `useEffect` lo
 * dejaría vacío (regla 3 del offline).
 */
export default function FormularioTarea({
  id,
  inicial,
  etapaPorDefecto,
  equipo,
  alEnviar,
}: {
  id: string
  inicial?: TareaConResponsable
  /** La etapa desde la que se pulsó «Agregar tarea». */
  etapaPorDefecto: string
  equipo: MiembroEquipo[]
  alEnviar: (datos: Omit<DatosTarea, 'orden'>, responsable: Responsable | null) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    titulo: inicial?.titulo ?? '',
    detalle: inicial?.detalle ?? '',
    etapa: inicial?.etapa ?? etapaPorDefecto,
    estado: inicial?.estado ?? 'pendiente',
    responsable_id: inicial?.responsable_id ?? '',
    fecha_compromiso: inicial?.fecha_compromiso ?? '',
    exige_evidencia: inicial?.exige_evidencia ?? false,
  })
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})

  function escribir(campo: keyof Campos, valor: string | boolean) {
    setCampos((previo) => ({ ...previo, [campo]: valor }))
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()

    const resultado = esquema.safeParse(campos)
    if (!resultado.success) {
      const porCampo = resultado.error.flatten().fieldErrors
      setErrores(
        Object.fromEntries(
          Object.entries(porCampo).map(([campo, mensajes]) => [campo, mensajes?.[0] ?? '']),
        ),
      )
      return
    }

    setErrores({})
    const d = resultado.data
    const miembro = equipo.find((m) => m.usuario_id === d.responsable_id)

    alEnviar(
      {
        titulo: d.titulo,
        detalle: d.detalle || null,
        etapa: d.etapa,
        estado: d.estado,
        responsable_id: d.responsable_id || null,
        fecha_compromiso: d.fecha_compromiso || null,
        exige_evidencia: d.exige_evidencia,
      },
      miembro?.usuario
        ? { id: miembro.usuario.id, nombre: miembro.usuario.nombre, correo: miembro.usuario.correo }
        : null,
    )
  }

  const asignables = equipo.filter((m) => m.usuario && m.usuario.activo)

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input
        etiqueta="Qué hay que hacer"
        required
        autoFocus
        value={campos.titulo}
        error={errores.titulo}
        onChange={(e) => escribir('titulo', e.target.value)}
      />

      <Textarea
        etiqueta="Detalle"
        rows={2}
        ayuda="Lo que haga falta para que otro lo pueda hacer sin preguntarte."
        value={campos.detalle}
        onChange={(e) => escribir('detalle', e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Select etiqueta="Etapa" value={campos.etapa} onChange={(e) => escribir('etapa', e.target.value)}>
          {ETAPAS_PROYECTO.map((o, i) => (
            <option key={o.valor} value={o.valor}>{i + 1}. {o.etiqueta}</option>
          ))}
        </Select>

        <Select etiqueta="Estado" value={campos.estado} onChange={(e) => escribir('estado', e.target.value)}>
          {ESTADOS_TAREA.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Select
          etiqueta="Responsable"
          marcador={asignables.length === 0 ? 'Nadie asignado a este cliente' : 'Sin responsable'}
          value={campos.responsable_id}
          onChange={(e) => escribir('responsable_id', e.target.value)}
        >
          {asignables.map((m) => (
            <option key={m.usuario_id} value={m.usuario_id}>{m.usuario?.nombre}</option>
          ))}
        </Select>

        <Input
          etiqueta="Fecha compromiso"
          type="date"
          value={campos.fecha_compromiso}
          error={errores.fecha_compromiso}
          onChange={(e) => escribir('fecha_compromiso', e.target.value)}
        />
      </div>

      {/* ⚠️ Esta casilla la hace verdadera la BASE: `sellar_tarea_hecha()`
          rechaza el paso a «hecha» si no hay ningún adjunto colgando de la
          tarea. Se marca en las que entregan algo —el acta firmada, la foto del
          extintor—, no en «llamar al cliente». */}
      <Checkbox
        etiqueta="Pedir evidencia para darla por hecha"
        ayuda="No se podrá marcar como hecha hasta que tenga al menos un archivo adjunto. Lo impide la base, no la pantalla."
        checked={campos.exige_evidencia}
        onChange={(e) => escribir('exige_evidencia', e.target.checked)}
      />
    </form>
  )
}
