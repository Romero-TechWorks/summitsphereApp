'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { queryKeys } from '@/lib/query/keys'
import { listarProcesos } from '@/lib/queries/procesos'
import { listarProyectosDe } from '@/lib/queries/proyectos'
import { TIPOS_DOCUMENTO } from '@/lib/sistemas/catalogos'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import type { DatosDocumento, DocumentoEnLista } from '@/lib/queries/documentos'

const esquema = z.object({
  codigo: z.string().trim().min(1, 'El documento necesita un código'),
  titulo: z.string().trim().min(1, 'El documento necesita un título'),
  tipo: z.string().min(1),
  proceso_id: z.string(),
  proyecto_id: z.string(),
})

type Campos = z.infer<typeof esquema>

/**
 * Alta y edición de un documento.
 *
 * ⚠️ **El código es único dentro del cliente**, sin importar mayúsculas, y lo
 * impone la base (`documentos_codigo_idx` sobre `lower(codigo)`). Dos
 * `PR-CAL-001` en el mismo SGC es exactamente el hallazgo que la firma le
 * levanta a sus clientes. Si se repite, el INSERT devuelve un 23505 y la
 * pantalla lo pinta con su motivo.
 *
 * ⚠️ Los dos desplegables salen por `useQuery` con su clave, nunca de un
 * `useEffect` (CLAUDE.md · reglas del offline, 3).
 */
export default function FormularioDocumento({
  id,
  orgId,
  inicial,
  alEnviar,
}: {
  id: string
  orgId: string
  inicial?: DocumentoEnLista
  alEnviar: (datos: DatosDocumento) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    codigo: inicial?.codigo ?? '',
    titulo: inicial?.titulo ?? '',
    tipo: inicial?.tipo ?? 'procedimiento',
    proceso_id: inicial?.proceso_id ?? '',
    proyecto_id: inicial?.proyecto_id ?? '',
  })
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})

  const { data: procesos = [] } = useQuery({
    queryKey: queryKeys.sistemas.procesos(orgId),
    queryFn: () => listarProcesos(orgId),
    enabled: Boolean(orgId),
  })

  const { data: proyectos = [] } = useQuery({
    queryKey: queryKeys.cartera.proyectosDe(orgId),
    queryFn: () => listarProyectosDe(orgId),
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

    alEnviar({
      codigo: d.codigo,
      titulo: d.titulo,
      tipo: d.tipo,
      proceso_id: d.proceso_id || null,
      proyecto_id: d.proyecto_id || null,
    })
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 2fr', gap: 14 }}>
        <Input
          etiqueta="Código"
          ayuda="«PR-CAL-001»."
          required
          autoFocus
          className="mono"
          value={campos.codigo}
          error={errores.codigo}
          onChange={(e) => escribir('codigo', e.target.value)}
        />
        <Input
          etiqueta="Título"
          required
          value={campos.titulo}
          error={errores.titulo}
          onChange={(e) => escribir('titulo', e.target.value)}
        />
      </div>

      <Select
        etiqueta="Tipo"
        ayuda="La pirámide documental: el manual arriba, los registros abajo."
        value={campos.tipo}
        onChange={(e) => escribir('tipo', e.target.value)}
      >
        {TIPOS_DOCUMENTO.map((o) => (
          <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
        ))}
      </Select>

      <Select
        etiqueta="Proceso dueño"
        ayuda={
          procesos.length === 0
            ? 'Este cliente todavía no tiene mapa de procesos: se levanta en la pestaña Procesos.'
            : 'Quién es responsable de mantenerlo.'
        }
        marcador="Sin proceso"
        value={campos.proceso_id}
        onChange={(e) => escribir('proceso_id', e.target.value)}
      >
        {procesos.filter((p) => p.activo || p.id === campos.proceso_id).map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </Select>

      <Select
        etiqueta="Proyecto que lo produjo"
        ayuda="Opcional. El documento es del cliente y sobrevive al contrato; esto dice qué contrato lo pagó."
        marcador="Sin proyecto"
        value={campos.proyecto_id}
        onChange={(e) => escribir('proyecto_id', e.target.value)}
      >
        {proyectos.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </Select>
    </form>
  )
}
