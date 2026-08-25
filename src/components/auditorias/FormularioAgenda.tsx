'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { queryKeys } from '@/lib/query/keys'
import { listarContactos, listarSitios, listarUsuariosDeLaFirma } from '@/lib/queries/cartera'
import { listarProcesos } from '@/lib/queries/procesos'
import type { DatosAgenda, RenglonAgenda } from '@/lib/queries/auditorias'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

const esquema = z
  .object({
    fecha: z.string().min(1, 'La agenda va por día'),
    hora_inicio: z.string(),
    hora_fin: z.string(),
    tema: z.string().trim().min(1, 'Di qué se audita en esta hora'),
    proceso_id: z.string(),
    sitio_id: z.string(),
    auditado: z.string().trim(),
    contacto_id: z.string(),
    auditor_id: z.string(),
    nota: z.string().trim(),
  })
  // El mismo CHECK que `auditoria_agenda_horas_coherentes` en la base.
  .refine((v) => !v.hora_inicio || !v.hora_fin || v.hora_fin >= v.hora_inicio, {
    path: ['hora_fin'],
    message: 'Termina antes de empezar',
  })

type Campos = z.infer<typeof esquema>

/**
 * Un punto de la agenda de la visita [F03·B1].
 *
 * **Esto es lo que se le manda al cliente antes de ir**, y por eso vive en filas
 * y no en un párrafo: se reordena, se imprime y después se marca lo que de
 * verdad se cumplió, que es lo que va al informe.
 *
 * ⚠️ `auditado` es texto libre a propósito. La agenda se manda semanas antes,
 * cuando todavía no se sabe quién va a estar: dice «Jefe de Almacén». El
 * contacto concreto se ata después, si se sabe — y sale de `contactos` del
 * cliente, no de `usuarios`, porque el auditado es gente de la planta.
 */
export default function FormularioAgenda({
  id,
  orgId,
  inicial,
  ordenSugerido,
  alEnviar,
}: {
  id: string
  orgId: string
  inicial?: RenglonAgenda
  ordenSugerido: number
  alEnviar: (datos: DatosAgenda) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    fecha: inicial?.fecha ?? '',
    hora_inicio: inicial?.hora_inicio?.slice(0, 5) ?? '',
    hora_fin: inicial?.hora_fin?.slice(0, 5) ?? '',
    tema: inicial?.tema ?? '',
    proceso_id: inicial?.proceso_id ?? '',
    sitio_id: inicial?.sitio_id ?? '',
    auditado: inicial?.auditado ?? '',
    contacto_id: inicial?.contacto_id ?? '',
    auditor_id: inicial?.auditor_id ?? '',
    nota: inicial?.nota ?? '',
  })
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})

  const { data: procesos = [] } = useQuery({
    queryKey: queryKeys.sistemas.procesos(orgId),
    queryFn: () => listarProcesos(orgId),
    enabled: Boolean(orgId),
  })
  const { data: sitios = [] } = useQuery({
    queryKey: queryKeys.cartera.sitios(orgId),
    queryFn: () => listarSitios(orgId),
    enabled: Boolean(orgId),
  })
  const { data: contactos = [] } = useQuery({
    queryKey: queryKeys.cartera.contactos(orgId),
    queryFn: () => listarContactos(orgId),
    enabled: Boolean(orgId),
  })
  const { data: usuarios = [] } = useQuery({
    queryKey: queryKeys.cartera.usuariosFirma(),
    queryFn: listarUsuariosDeLaFirma,
  })

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
          Object.entries(porCampo).map(([clave, mensajes]) => [clave, mensajes?.[0] ?? '']),
        ),
      )
      return
    }

    setErrores({})
    const v = resultado.data

    alEnviar({
      fecha: v.fecha,
      hora_inicio: v.hora_inicio || null,
      hora_fin: v.hora_fin || null,
      tema: v.tema,
      proceso_id: v.proceso_id || null,
      sitio_id: v.sitio_id || null,
      auditado: v.auditado || null,
      contacto_id: v.contacto_id || null,
      auditor_id: v.auditor_id || null,
      orden: inicial?.orden ?? ordenSugerido,
      nota: v.nota || null,
    })
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 160px' }}>
          <Input
            etiqueta="Día"
            type="date"
            required
            value={campos.fecha}
            error={errores.fecha}
            onChange={(e) => escribir('fecha', e.target.value)}
          />
        </div>
        <div style={{ flex: '0 1 130px' }}>
          <Input
            etiqueta="De"
            type="time"
            value={campos.hora_inicio}
            onChange={(e) => escribir('hora_inicio', e.target.value)}
          />
        </div>
        <div style={{ flex: '0 1 130px' }}>
          <Input
            etiqueta="A"
            type="time"
            value={campos.hora_fin}
            error={errores.hora_fin}
            onChange={(e) => escribir('hora_fin', e.target.value)}
          />
        </div>
      </div>

      <Input
        etiqueta="Tema"
        required
        placeholder="Reunión de apertura · Compras · Recorrido por almacén"
        value={campos.tema}
        error={errores.tema}
        onChange={(e) => escribir('tema', e.target.value)}
      />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <Select
            etiqueta="Proceso"
            marcador="Sin proceso"
            value={campos.proceso_id}
            onChange={(e) => escribir('proceso_id', e.target.value)}
          >
            {procesos.map((proceso) => (
              <option key={proceso.id} value={proceso.id}>{proceso.nombre}</option>
            ))}
          </Select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <Select
            etiqueta="Sitio"
            marcador="Sin sitio"
            value={campos.sitio_id}
            onChange={(e) => escribir('sitio_id', e.target.value)}
          >
            {sitios.map((sitio) => (
              <option key={sitio.id} value={sitio.id}>{sitio.nombre}</option>
            ))}
          </Select>
        </div>
      </div>

      <Input
        etiqueta="Auditado"
        placeholder="Jefe de Almacén"
        value={campos.auditado}
        ayuda="El puesto vale: la agenda se manda antes de saber quién va a estar."
        onChange={(e) => escribir('auditado', e.target.value)}
      />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <Select
            etiqueta="Contacto del cliente"
            marcador="Sin atar a un contacto"
            value={campos.contacto_id}
            onChange={(e) => escribir('contacto_id', e.target.value)}
          >
            {contactos.map((contacto) => (
              <option key={contacto.id} value={contacto.id}>{contacto.nombre}</option>
            ))}
          </Select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <Select
            etiqueta="Auditor"
            marcador="Sin asignar"
            value={campos.auditor_id}
            onChange={(e) => escribir('auditor_id', e.target.value)}
          >
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>{usuario.nombre}</option>
            ))}
          </Select>
        </div>
      </div>

      <Textarea
        etiqueta="Nota"
        rows={2}
        value={campos.nota}
        ayuda="Lo que pasó de verdad en ese punto, para el apartado «agenda cumplida» del informe."
        onChange={(e) => escribir('nota', e.target.value)}
      />
    </form>
  )
}
