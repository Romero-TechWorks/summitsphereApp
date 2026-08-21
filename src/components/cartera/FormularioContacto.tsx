'use client'

import { useState } from 'react'
import { z } from 'zod'
import Checkbox from '@/components/ui/Checkbox'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { PAPELES_CONTACTO } from '@/lib/cartera/catalogos'
import type { Contacto, DatosContacto, Sitio } from '@/lib/queries/cartera'

const esquema = z.object({
  nombre: z.string().trim().min(1, 'El contacto necesita un nombre'),
  puesto: z.string().trim(),
  correo: z.string().trim().refine(
    (v) => v === '' || z.string().email().safeParse(v).success,
    'Ese correo no parece un correo',
  ),
  telefono: z.string().trim(),
  papel: z.string().min(1),
  sitio_id: z.string(),
  principal: z.boolean(),
  notas: z.string().trim(),
})

type Campos = z.infer<typeof esquema>

/**
 * Alta y edición de un contacto del cliente.
 *
 * ⚠️ **El desplegable de sitios llega por `props`, ya cargado con `useQuery`**
 * por la pantalla que abre este modal — nunca se consulta desde aquí dentro.
 * Es la regla 3 del offline y la que más caro sale: un desplegable que se llena
 * con un `useEffect` aparece **vacío** sin señal, el usuario no puede elegir, y
 * el guardado muere en la validación *antes* de que `offlineWrite` alcance a
 * encolarlo. El dato no se retrasa: se pierde.
 */
export default function FormularioContacto({
  id,
  inicial,
  sitios,
  alEnviar,
}: {
  id: string
  inicial?: Contacto
  /** Los sitios de esta organización, ya en la caché. */
  sitios: Sitio[]
  alEnviar: (datos: DatosContacto) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    nombre: inicial?.nombre ?? '',
    puesto: inicial?.puesto ?? '',
    correo: inicial?.correo ?? '',
    telefono: inicial?.telefono ?? '',
    papel: inicial?.papel ?? 'otro',
    sitio_id: inicial?.sitio_id ?? '',
    principal: inicial?.principal ?? false,
    notas: inicial?.notas ?? '',
  })
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})

  function escribir<C extends keyof Campos>(campo: C, valor: Campos[C]) {
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
      puesto: d.puesto || null,
      correo: d.correo || null,
      telefono: d.telefono || null,
      papel: d.papel,
      sitio_id: d.sitio_id || null,
      principal: d.principal,
      notas: d.notas || null,
    })
  }

  const activos = sitios.filter((s) => s.activo || s.id === inicial?.sitio_id)

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input
        etiqueta="Nombre"
        required
        autoFocus
        value={campos.nombre}
        error={errores.nombre}
        onChange={(e) => escribir('nombre', e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Input
          etiqueta="Puesto"
          value={campos.puesto}
          onChange={(e) => escribir('puesto', e.target.value)}
        />

        <Select
          etiqueta="Papel"
          ayuda="Quién firma y a quién se le pide la evidencia."
          value={campos.papel}
          onChange={(e) => escribir('papel', e.target.value)}
        >
          {PAPELES_CONTACTO.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Input
          etiqueta="Correo"
          type="email"
          inputMode="email"
          value={campos.correo}
          error={errores.correo}
          onChange={(e) => escribir('correo', e.target.value)}
        />
        <Input
          etiqueta="Teléfono"
          type="tel"
          inputMode="tel"
          className="mono"
          value={campos.telefono}
          onChange={(e) => escribir('telefono', e.target.value)}
        />
      </div>

      <Select
        etiqueta="Sitio"
        marcador={activos.length === 0 ? 'Esta organización todavía no tiene sitios' : 'Toda la organización'}
        value={campos.sitio_id}
        onChange={(e) => escribir('sitio_id', e.target.value)}
      >
        {activos.map((s) => (
          <option key={s.id} value={s.id}>{s.nombre}</option>
        ))}
      </Select>

      <Checkbox
        etiqueta="Es el contacto principal"
        ayuda="Con quién se habla primero. Aparece en la lista de la cartera."
        checked={campos.principal}
        onChange={(e) => escribir('principal', e.target.checked)}
      />

      <Textarea
        etiqueta="Notas"
        rows={2}
        value={campos.notas}
        onChange={(e) => escribir('notas', e.target.value)}
      />
    </form>
  )
}
