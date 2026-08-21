'use client'

import { useState } from 'react'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { ESTADOS_ORGANIZACION, TAMANOS_ORGANIZACION } from '@/lib/cartera/catalogos'
import type { DatosOrganizacion, Organizacion } from '@/lib/queries/cartera'

/**
 * El RFC, comprobado con la mano abierta.
 *
 * ⚠️ A propósito **no** es el patrón estricto del SAT. Un cliente nuevo se da de
 * alta con lo que hay a mano, y una validación dura aquí sólo consigue que el
 * consultor invente un RFC para poder guardar — que es peor que dejarlo vacío,
 * porque un hueco se ve y un dato inventado no. Se comprueba la forma general;
 * el dato fiscal de verdad se valida cuando haya que facturar [Fase 06].
 */
const RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/i

const esquema = z.object({
  razon_social: z.string().trim().min(1, 'La razón social es obligatoria'),
  nombre_comercial: z.string().trim(),
  rfc: z.string().trim().refine((v) => v === '' || RFC.test(v), 'Ese RFC no tiene la forma esperada'),
  giro: z.string().trim(),
  tamano: z.string(),
  estado: z.string().min(1),
  notas: z.string().trim(),
})

type Campos = z.infer<typeof esquema>

/**
 * Alta y edición de una organización.
 *
 * El botón de guardar **no vive aquí**: vive en el pie del `Modal` y se enlaza
 * con `form={id}`, para que se quede fijo mientras el formulario scrollea. En un
 * teléfono, un formulario de siete campos deja el botón fuera de la pantalla.
 */
export default function FormularioOrganizacion({
  id,
  inicial,
  alEnviar,
}: {
  /** El `id` del `<form>`, el mismo que lleva el botón del pie del modal. */
  id: string
  inicial?: Organizacion
  alEnviar: (datos: DatosOrganizacion) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    razon_social: inicial?.razon_social ?? '',
    nombre_comercial: inicial?.nombre_comercial ?? '',
    rfc: inicial?.rfc ?? '',
    giro: inicial?.giro ?? '',
    tamano: inicial?.tamano ?? '',
    estado: inicial?.estado ?? 'prospecto',
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
      // El primer error de cada campo. `flatten()` da uno por campo, que es lo
      // que se pinta al lado de cada uno.
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

    // Un campo vacío se guarda como NULL, no como cadena vacía: si no, la base
    // acaba con dos formas de decir "no hay dato" y toda consulta tiene que
    // preguntar por las dos.
    alEnviar({
      razon_social: d.razon_social,
      nombre_comercial: d.nombre_comercial || null,
      rfc: d.rfc ? d.rfc.toUpperCase() : null,
      giro: d.giro || null,
      tamano: d.tamano || null,
      estado: d.estado,
      notas: d.notas || null,
    })
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input
        etiqueta="Razón social"
        required
        autoFocus
        value={campos.razon_social}
        error={errores.razon_social}
        onChange={(e) => escribir('razon_social', e.target.value)}
      />

      <Input
        etiqueta="Nombre comercial"
        ayuda="Cómo se le dice en la firma."
        value={campos.nombre_comercial}
        onChange={(e) => escribir('nombre_comercial', e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Input
          etiqueta="RFC"
          value={campos.rfc}
          error={errores.rfc}
          // El RFC se lee y se dicta: va en monoespaciada como todo folio.
          className="mono"
          style={{ textTransform: 'uppercase' }}
          onChange={(e) => escribir('rfc', e.target.value)}
        />

        <Input
          etiqueta="Giro"
          ayuda="Manufactura, servicios, salud…"
          value={campos.giro}
          onChange={(e) => escribir('giro', e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Select
          etiqueta="Tamaño"
          marcador="Sin definir"
          value={campos.tamano}
          onChange={(e) => escribir('tamano', e.target.value)}
        >
          {TAMANOS_ORGANIZACION.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>

        <Select
          etiqueta="Estado"
          value={campos.estado}
          onChange={(e) => escribir('estado', e.target.value)}
        >
          {ESTADOS_ORGANIZACION.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>
      </div>

      <Textarea
        etiqueta="Notas"
        rows={3}
        value={campos.notas}
        onChange={(e) => escribir('notas', e.target.value)}
      />
    </form>
  )
}
