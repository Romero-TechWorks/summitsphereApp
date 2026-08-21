'use client'

import { useState } from 'react'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { TIPOS_SITIO } from '@/lib/cartera/catalogos'
import type { DatosSitio, Sitio } from '@/lib/queries/cartera'

const esquema = z.object({
  nombre: z.string().trim().min(1, 'El sitio necesita un nombre'),
  tipo: z.string().min(1),
  direccion: z.string().trim(),
  municipio: z.string().trim(),
  entidad: z.string().trim(),
  cp: z.string().trim().refine((v) => v === '' || /^\d{5}$/.test(v), 'El código postal son cinco dígitos'),
  num_trabajadores: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 100000), 'Un número de trabajadores, sin puntos ni comas'),
  notas: z.string().trim(),
})

type Campos = z.infer<typeof esquema>

/**
 * Alta y edición de un sitio.
 *
 * ⚠️ **`num_trabajadores` no es un dato administrativo.** De él depende qué NOMs
 * le aplican a este centro de trabajo [Fase 05] — la 030 cambia a partir de 100
 * trabajadores, la 035 tiene tres tramos—, y se pregunta por SITIO, no por
 * empresa: la planta de 300 y la oficina de 12 de la misma organización no
 * cumplen lo mismo.
 */
export default function FormularioSitio({
  id,
  inicial,
  alEnviar,
}: {
  id: string
  inicial?: Sitio
  alEnviar: (datos: DatosSitio) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    nombre: inicial?.nombre ?? '',
    tipo: inicial?.tipo ?? 'planta',
    direccion: inicial?.direccion ?? '',
    municipio: inicial?.municipio ?? '',
    entidad: inicial?.entidad ?? '',
    cp: inicial?.cp ?? '',
    num_trabajadores: inicial?.num_trabajadores == null ? '' : String(inicial.num_trabajadores),
    notas: inicial?.notas ?? '',
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

    alEnviar({
      nombre: d.nombre,
      tipo: d.tipo,
      direccion: d.direccion || null,
      municipio: d.municipio || null,
      entidad: d.entidad || null,
      cp: d.cp || null,
      num_trabajadores: d.num_trabajadores === '' ? null : Number(d.num_trabajadores),
      notas: d.notas || null,
    })
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input
        etiqueta="Nombre del sitio"
        ayuda="Cómo lo llaman en la empresa: «Planta Toluca»."
        required
        autoFocus
        value={campos.nombre}
        error={errores.nombre}
        onChange={(e) => escribir('nombre', e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Select
          etiqueta="Tipo"
          value={campos.tipo}
          onChange={(e) => escribir('tipo', e.target.value)}
        >
          {TIPOS_SITIO.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>

        <Input
          etiqueta="Trabajadores"
          ayuda="Determina qué NOMs le aplican."
          inputMode="numeric"
          className="mono"
          value={campos.num_trabajadores}
          error={errores.num_trabajadores}
          onChange={(e) => escribir('num_trabajadores', e.target.value)}
        />
      </div>

      <Input
        etiqueta="Dirección"
        value={campos.direccion}
        onChange={(e) => escribir('direccion', e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <Input
          etiqueta="Municipio"
          value={campos.municipio}
          onChange={(e) => escribir('municipio', e.target.value)}
        />
        <Input
          etiqueta="Entidad"
          value={campos.entidad}
          onChange={(e) => escribir('entidad', e.target.value)}
        />
        <Input
          etiqueta="C.P."
          inputMode="numeric"
          className="mono"
          value={campos.cp}
          error={errores.cp}
          onChange={(e) => escribir('cp', e.target.value)}
        />
      </div>

      <Textarea
        etiqueta="Notas"
        rows={2}
        ayuda="Accesos, horarios de entrada, a quién buscar en la caseta."
        value={campos.notas}
        onChange={(e) => escribir('notas', e.target.value)}
      />
    </form>
  )
}
