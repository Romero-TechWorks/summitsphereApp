'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { queryKeys } from '@/lib/query/keys'
import { listarContactos } from '@/lib/queries/cartera'
import { TIPOS_PROCESO } from '@/lib/sistemas/catalogos'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import type { DatosProceso, ProcesoConDueno } from '@/lib/queries/procesos'

const esquema = z.object({
  codigo: z.string().trim(),
  nombre: z.string().trim().min(1, 'El proceso necesita un nombre'),
  tipo: z.string().min(1),
  dueno_contacto_id: z.string(),
  objetivo: z.string().trim(),
  entradas: z.string().trim(),
  salidas: z.string().trim(),
  orden: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{1,3}$/.test(v), 'Un número de hasta tres cifras'),
})

type Campos = z.infer<typeof esquema>

/**
 * Alta y edición de un proceso del mapa.
 *
 * ⚠️ **El dueño del proceso es gente DEL CLIENTE**, no de la firma: es a quien
 * el auditor le pregunta en el piso y quien firma la evidencia. Por eso el
 * desplegable sale de `contactos` y no de `usuarios`.
 *
 * ⚠️ Y sale por `useQuery` con su clave, nunca con `useEffect`: sin señal, un
 * desplegable vacío deja el guardado muerto en la validación *antes* de que
 * `offlineWrite` pueda encolarlo (CLAUDE.md · reglas del offline, 3).
 */
export default function FormularioProceso({
  id,
  orgId,
  inicial,
  alEnviar,
}: {
  id: string
  orgId: string
  inicial?: ProcesoConDueno
  alEnviar: (datos: DatosProceso, dueno: { id: string; nombre: string; puesto: string | null } | null) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    codigo: inicial?.codigo ?? '',
    nombre: inicial?.nombre ?? '',
    tipo: inicial?.tipo ?? 'operativo',
    dueno_contacto_id: inicial?.dueno_contacto_id ?? '',
    objetivo: inicial?.objetivo ?? '',
    entradas: inicial?.entradas ?? '',
    salidas: inicial?.salidas ?? '',
    orden: inicial?.orden == null ? '' : String(inicial.orden),
  })
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})

  const { data: contactos = [] } = useQuery({
    queryKey: queryKeys.cartera.contactos(orgId),
    queryFn: () => listarContactos(orgId),
    enabled: Boolean(orgId),
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
          Object.entries(porCampo).map(([campo, mensajes]) => [campo, mensajes?.[0] ?? '']),
        ),
      )
      return
    }

    setErrores({})
    const d = resultado.data
    const contacto = contactos.find((c) => c.id === d.dueno_contacto_id)

    alEnviar(
      {
        codigo: d.codigo || null,
        nombre: d.nombre,
        tipo: d.tipo,
        dueno_contacto_id: d.dueno_contacto_id || null,
        objetivo: d.objetivo || null,
        entradas: d.entradas || null,
        salidas: d.salidas || null,
        orden: d.orden === '' ? 0 : Number(d.orden),
      },
      contacto ? { id: contacto.id, nombre: contacto.nombre, puesto: contacto.puesto } : null,
    )
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input
        etiqueta="Nombre del proceso"
        ayuda="Como lo llaman en la empresa: «Compras», «Producción», «Atención a clientes»."
        required
        autoFocus
        value={campos.nombre}
        error={errores.nombre}
        onChange={(e) => escribir('nombre', e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <Select
          etiqueta="Tipo"
          ayuda="Las tres familias del mapa."
          value={campos.tipo}
          onChange={(e) => escribir('tipo', e.target.value)}
        >
          {TIPOS_PROCESO.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>

        <Input
          etiqueta="Código"
          ayuda="Opcional: «P-COM»."
          className="mono"
          value={campos.codigo}
          onChange={(e) => escribir('codigo', e.target.value)}
        />

        <Input
          etiqueta="Orden"
          ayuda="En qué lugar del mapa va."
          inputMode="numeric"
          className="mono"
          value={campos.orden}
          error={errores.orden}
          onChange={(e) => escribir('orden', e.target.value)}
        />
      </div>

      <Select
        etiqueta="Dueño del proceso"
        ayuda="Del lado del cliente: a quien el auditor le va a preguntar en el piso."
        marcador={contactos.length === 0 ? 'Este cliente no tiene contactos capturados' : 'Sin asignar'}
        value={campos.dueno_contacto_id}
        onChange={(e) => escribir('dueno_contacto_id', e.target.value)}
      >
        {contactos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}{c.puesto ? ` · ${c.puesto}` : ''}
          </option>
        ))}
      </Select>

      <Textarea
        etiqueta="Objetivo"
        rows={2}
        ayuda="Para qué existe este proceso. Sale en el manual."
        value={campos.objetivo}
        onChange={(e) => escribir('objetivo', e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <Textarea
          etiqueta="Entradas"
          rows={2}
          ayuda="Qué recibe, y de quién."
          value={campos.entradas}
          onChange={(e) => escribir('entradas', e.target.value)}
        />
        <Textarea
          etiqueta="Salidas"
          rows={2}
          ayuda="Qué entrega, y a quién."
          value={campos.salidas}
          onChange={(e) => escribir('salidas', e.target.value)}
        />
      </div>
    </form>
  )
}
