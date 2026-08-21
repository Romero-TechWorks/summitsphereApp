'use client'

import { useState } from 'react'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import {
  ESTADOS_PROYECTO,
  ETAPAS_PROYECTO,
  TIPOS_PROYECTO,
} from '@/lib/cartera/catalogos'
import type { MiembroEquipo } from '@/lib/queries/cartera'
import type { DatosProyecto, ProyectoConLider } from '@/lib/queries/proyectos'

const FECHA = /^\d{4}-\d{2}-\d{2}$/

const esquema = z
  .object({
    nombre: z.string().trim().min(1, 'El proyecto necesita un nombre'),
    tipo: z.string().min(1),
    etapa: z.string().min(1),
    estado: z.string().min(1),
    lider_id: z.string(),
    fecha_inicio: z.string().refine((v) => v === '' || FECHA.test(v), 'Fecha inválida'),
    fecha_fin_estimada: z.string().refine((v) => v === '' || FECHA.test(v), 'Fecha inválida'),
    fecha_fin_real: z.string().refine((v) => v === '' || FECHA.test(v), 'Fecha inválida'),
    monto: z
      .string()
      .trim()
      .refine((v) => v === '' || (/^\d+(\.\d{1,2})?$/.test(v)), 'Un importe, con hasta dos decimales'),
    moneda: z.string().min(1),
    objetivo: z.string().trim(),
  })
  // ⚠️ Se comparan como TEXTO, no como `Date`. Dos fechas `YYYY-MM-DD` se
  // ordenan igual carácter por carácter que cronológicamente, y así no entra
  // ninguna zona horaria de por medio: `new Date('2026-08-21')` es medianoche
  // UTC y en México se lee como el día anterior (CLAUDE.md · trampas heredadas).
  .refine(
    (d) => !d.fecha_inicio || !d.fecha_fin_estimada || d.fecha_fin_estimada >= d.fecha_inicio,
    { message: 'La fecha de fin no puede ser anterior al inicio', path: ['fecha_fin_estimada'] },
  )

type Campos = z.infer<typeof esquema>

/**
 * Alta y edición de un proyecto — **el contrato con el cliente**.
 *
 * ⚠️ El desplegable de líder sale del **equipo asignado a esta organización**,
 * que llega por `props` ya cargado con `useQuery`. Dos motivos: sin señal un
 * `useEffect` lo dejaría vacío y el guardado moriría en la validación (regla 3
 * del offline), y ofrecer a toda la plantilla de la firma como líder de un
 * cliente que no tienen asignado contradiría el aislamiento — quien lidera un
 * proyecto tiene que poder verlo.
 */
export default function FormularioProyecto({
  id,
  inicial,
  equipo,
  alEnviar,
}: {
  id: string
  inicial?: ProyectoConLider
  /** El equipo de la organización, ya en la caché. */
  equipo: MiembroEquipo[]
  alEnviar: (datos: DatosProyecto, lider: { id: string; nombre: string; correo: string } | null) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    nombre: inicial?.nombre ?? '',
    tipo: inicial?.tipo ?? 'implementacion',
    etapa: inicial?.etapa ?? 'diagnostico',
    estado: inicial?.estado ?? 'propuesta',
    lider_id: inicial?.lider_id ?? '',
    fecha_inicio: inicial?.fecha_inicio ?? '',
    fecha_fin_estimada: inicial?.fecha_fin_estimada ?? '',
    fecha_fin_real: inicial?.fecha_fin_real ?? '',
    monto: inicial?.monto == null ? '' : String(inicial.monto),
    moneda: inicial?.moneda ?? 'MXN',
    objetivo: inicial?.objetivo ?? '',
  })
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})

  function escribir(campo: keyof Campos, valor: string) {
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
    const miembro = equipo.find((m) => m.usuario_id === d.lider_id)

    alEnviar(
      {
        nombre: d.nombre,
        tipo: d.tipo,
        etapa: d.etapa,
        estado: d.estado,
        lider_id: d.lider_id || null,
        fecha_inicio: d.fecha_inicio || null,
        fecha_fin_estimada: d.fecha_fin_estimada || null,
        fecha_fin_real: d.fecha_fin_real || null,
        monto: d.monto === '' ? null : Number(d.monto),
        moneda: d.moneda,
        objetivo: d.objetivo || null,
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
        etiqueta="Nombre del proyecto"
        ayuda="Cómo se le llama en la firma: «Implementación ISO 9001 + 45001»."
        required
        autoFocus
        value={campos.nombre}
        error={errores.nombre}
        onChange={(e) => escribir('nombre', e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Select etiqueta="Tipo" value={campos.tipo} onChange={(e) => escribir('tipo', e.target.value)}>
          {TIPOS_PROYECTO.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>

        <Select etiqueta="Estado" value={campos.estado} onChange={(e) => escribir('estado', e.target.value)}>
          {ESTADOS_PROYECTO.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>
      </div>

      <Select
        etiqueta="Etapa de la metodología"
        ayuda="Moverlo de etapa queda registrado solo en la bitácora del proyecto."
        value={campos.etapa}
        onChange={(e) => escribir('etapa', e.target.value)}
      >
        {ETAPAS_PROYECTO.map((o, i) => (
          <option key={o.valor} value={o.valor}>{i + 1}. {o.etiqueta}</option>
        ))}
      </Select>

      <Select
        etiqueta="Consultor líder"
        marcador={
          asignables.length === 0
            ? 'Nadie está asignado a este cliente todavía'
            : 'Sin líder asignado'
        }
        ayuda={
          asignables.length === 0
            ? 'El líder sale del equipo de la organización: asígnalo primero en la pestaña Equipo.'
            : undefined
        }
        value={campos.lider_id}
        onChange={(e) => escribir('lider_id', e.target.value)}
      >
        {asignables.map((m) => (
          <option key={m.usuario_id} value={m.usuario_id}>{m.usuario?.nombre}</option>
        ))}
      </Select>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
        <Input
          etiqueta="Inicio"
          type="date"
          value={campos.fecha_inicio}
          error={errores.fecha_inicio}
          onChange={(e) => escribir('fecha_inicio', e.target.value)}
        />
        <Input
          etiqueta="Fin estimado"
          type="date"
          value={campos.fecha_fin_estimada}
          error={errores.fecha_fin_estimada}
          onChange={(e) => escribir('fecha_fin_estimada', e.target.value)}
        />
      </div>

      {/* La fecha de cierre real sólo aparece cuando hay algo que cerrar: un
          campo que no aplica todavía es ruido en un formulario que ya es largo. */}
      {(campos.estado === 'cerrado' || campos.fecha_fin_real) && (
        <Input
          etiqueta="Cierre real"
          type="date"
          value={campos.fecha_fin_real}
          error={errores.fecha_fin_real}
          onChange={(e) => escribir('fecha_fin_real', e.target.value)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <Input
          etiqueta="Monto"
          inputMode="decimal"
          className="mono"
          placeholder="0.00"
          value={campos.monto}
          error={errores.monto}
          onChange={(e) => escribir('monto', e.target.value)}
        />
        <Select etiqueta="Moneda" value={campos.moneda} onChange={(e) => escribir('moneda', e.target.value)}>
          <option value="MXN">MXN</option>
          <option value="USD">USD</option>
        </Select>
      </div>

      <Textarea
        etiqueta="Objetivo"
        rows={3}
        ayuda="Qué se compromete la firma a dejar hecho."
        value={campos.objetivo}
        onChange={(e) => escribir('objetivo', e.target.value)}
      />
    </form>
  )
}
