'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { queryKeys } from '@/lib/query/keys'
import { listarOrganizaciones, nombreDeOrganizacion } from '@/lib/queries/cartera'
import { ESTADOS_PROGRAMA, aniosDelPrograma } from '@/lib/auditorias/catalogos'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import type { DatosPrograma, ProgramaEnLista } from '@/lib/queries/auditorias'

const esquema = z.object({
  org_id: z.string().min(1, 'Elige de qué cliente es el programa'),
  anio: z.string().refine((v) => /^\d{4}$/.test(v), 'Un año de cuatro cifras'),
  nombre: z.string().trim().min(1, 'El programa necesita un nombre'),
  objetivo: z.string().trim(),
  criterios: z.string().trim(),
  estado: z.string().min(1),
})

type Campos = z.infer<typeof esquema>

/**
 * Alta y edición del programa anual de auditorías.
 *
 * ISO 9001 §9.2.2 pide el programa **por escrito**, con su objetivo, sus
 * criterios y su aprobación. No es burocracia de la app: es literalmente lo
 * primero que un organismo certificador pide ver de la auditoría interna.
 *
 * ⚠️ **El cliente sólo se elige al dar de alta.** Mover un programa aprobado de
 * organización dejaría sus auditorías colgando de un expediente que ya no es el
 * suyo, y la base lo rechazaría de todos modos —`validar_contexto_de_la_
 * auditoria()`— con el cambio ya en la cola y el usuario mirando a otro lado.
 *
 * ⚠️ La lista de clientes sale por `useQuery`, nunca con `useEffect`: sin señal
 * un desplegable vacío deja el guardado muerto en la validación **antes** de que
 * `offlineWrite` pueda encolarlo (CLAUDE.md · reglas del offline, 3).
 */
export default function FormularioPrograma({
  id,
  inicial,
  alEnviar,
}: {
  id: string
  inicial?: ProgramaEnLista
  alEnviar: (orgId: string, datos: DatosPrograma) => void
}) {
  const anios = aniosDelPrograma()

  const [campos, setCampos] = useState<Campos>({
    org_id: inicial?.org_id ?? '',
    anio: String(inicial?.anio ?? anios[1]),
    nombre: inicial?.nombre ?? `Programa anual de auditorías ${anios[1]}`,
    objetivo: inicial?.objetivo ?? '',
    criterios: inicial?.criterios ?? '',
    estado: inicial?.estado ?? 'borrador',
  })
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})

  const { data: organizaciones = [] } = useQuery({
    queryKey: queryKeys.cartera.organizaciones(),
    queryFn: listarOrganizaciones,
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

    alEnviar(v.org_id, {
      anio: Number(v.anio),
      nombre: v.nombre,
      objetivo: v.objetivo || null,
      criterios: v.criterios || null,
      estado: v.estado,
    })
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Select
        etiqueta="Cliente"
        required
        marcador="Elige un cliente"
        value={campos.org_id}
        error={errores.org_id}
        disabled={Boolean(inicial)}
        ayuda={inicial ? 'El cliente de un programa ya creado no se cambia.' : undefined}
        onChange={(e) => escribir('org_id', e.target.value)}
      >
        {organizaciones.map((org) => (
          <option key={org.id} value={org.id}>{nombreDeOrganizacion(org)}</option>
        ))}
      </Select>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 140px' }}>
          <Select
            etiqueta="Año"
            required
            value={campos.anio}
            error={errores.anio}
            onChange={(e) => escribir('anio', e.target.value)}
          >
            {anios.map((anio) => (
              <option key={anio} value={String(anio)}>{anio}</option>
            ))}
          </Select>
        </div>
        <div style={{ flex: '1 1 220px' }}>
          <Select
            etiqueta="Estado"
            required
            value={campos.estado}
            error={errores.estado}
            ayuda="Aprobarlo sella quién y cuándo. Lo escribe la base, no esta pantalla."
            onChange={(e) => escribir('estado', e.target.value)}
          >
            {ESTADOS_PROGRAMA.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </Select>
        </div>
      </div>

      <Input
        etiqueta="Nombre"
        required
        value={campos.nombre}
        error={errores.nombre}
        onChange={(e) => escribir('nombre', e.target.value)}
      />

      <Textarea
        etiqueta="Objetivo"
        rows={3}
        value={campos.objetivo}
        ayuda="Para qué se audita este año. Va tal cual en el programa que firma la dirección."
        onChange={(e) => escribir('objetivo', e.target.value)}
      />

      <Textarea
        etiqueta="Criterios"
        rows={3}
        value={campos.criterios}
        ayuda="Contra qué se audita: las normas del alcance, la documentación del SGC y los requisitos legales aplicables."
        onChange={(e) => escribir('criterios', e.target.value)}
      />
    </form>
  )
}
