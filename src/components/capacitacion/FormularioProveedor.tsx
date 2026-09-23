'use client'

import { useState } from 'react'
import type { DatosProveedor, Proveedor } from '@/lib/queries/capacitacion'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'

/**
 * Un agente capacitador externo (respuesta 2 de Summit: un catálogo, porque
 * trabaja con más de uno).
 *
 * ⚠️ **El registro STPS es del PROVEEDOR**, no de Summit: Summit no emite DC-3.
 * Es el número que va impreso en cada constancia que este proveedor expide, y va
 * en la solicitud que la app le arma.
 */
export default function FormularioProveedor({
  id,
  inicial,
  alEnviar,
}: {
  id: string
  inicial?: Proveedor
  alEnviar: (datos: DatosProveedor) => void
}) {
  const [c, setC] = useState({
    nombre: inicial?.nombre ?? '',
    razon_social: inicial?.razon_social ?? '',
    rfc: inicial?.rfc ?? '',
    registro_stps: inicial?.registro_stps ?? '',
    contacto: inicial?.contacto ?? '',
    correo: inicial?.correo ?? '',
    telefono: inicial?.telefono ?? '',
    notas: inicial?.notas ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  function escribir(campo: keyof typeof c, valor: string) {
    setC((p) => ({ ...p, [campo]: valor }))
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!c.nombre.trim()) {
      setError('Cómo le dicen en la firma: «Capacita Bajío».')
      return
    }
    setError(null)
    const limpio = (v: string) => v.trim() || null
    alEnviar({
      nombre: c.nombre.trim(),
      razon_social: limpio(c.razon_social),
      rfc: limpio(c.rfc.toUpperCase()),
      registro_stps: limpio(c.registro_stps),
      contacto: limpio(c.contacto),
      correo: limpio(c.correo),
      telefono: limpio(c.telefono),
      notas: limpio(c.notas),
    })
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input
        etiqueta="Nombre"
        required
        autoFocus={!inicial}
        value={c.nombre}
        error={error}
        onChange={(e) => escribir('nombre', e.target.value)}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Input etiqueta="Razón social" value={c.razon_social} onChange={(e) => escribir('razon_social', e.target.value)} />
        <Input etiqueta="RFC" className="mono" value={c.rfc} onChange={(e) => escribir('rfc', e.target.value)} />
      </div>
      <Input
        etiqueta="Registro STPS como agente capacitador"
        ayuda="El número que va impreso en cada DC-3 que expide. Sin él, la constancia no vale ante un inspector."
        className="mono"
        value={c.registro_stps}
        onChange={(e) => escribir('registro_stps', e.target.value)}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <Input etiqueta="Contacto" value={c.contacto} onChange={(e) => escribir('contacto', e.target.value)} />
        <Input etiqueta="Correo" type="email" value={c.correo} onChange={(e) => escribir('correo', e.target.value)} />
        <Input etiqueta="Teléfono" type="tel" value={c.telefono} onChange={(e) => escribir('telefono', e.target.value)} />
      </div>
      <Textarea etiqueta="Notas" rows={2} value={c.notas} onChange={(e) => escribir('notas', e.target.value)} />
    </form>
  )
}
