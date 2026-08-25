'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { queryKeys } from '@/lib/query/keys'
import { listarOrganizaciones, listarUsuariosDeLaFirma, nombreDeOrganizacion } from '@/lib/queries/cartera'
import { listarProyectosDe } from '@/lib/queries/proyectos'
import { listarProgramas, type AuditoriaEnLista, type DatosAuditoria } from '@/lib/queries/auditorias'
import { ESTADOS_AUDITORIA, TIPOS_AUDITORIA } from '@/lib/auditorias/catalogos'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

const esquema = z
  .object({
    org_id: z.string().min(1, 'Elige de qué cliente es la auditoría'),
    titulo: z.string().trim().min(1, 'La auditoría necesita un título'),
    tipo: z.string().min(1),
    estado: z.string().min(1),
    programa_id: z.string(),
    proyecto_id: z.string(),
    auditor_lider_id: z.string(),
    fecha_inicio: z.string(),
    fecha_fin: z.string(),
    alcance: z.string().trim(),
    criterios: z.string().trim(),
    metodologia: z.string().trim(),
  })
  // El mismo CHECK que la base (`auditorias_fechas_coherentes`), aquí para que
  // el error se vea al escribirlo y no media hora después al vaciar la cola.
  .refine((v) => !v.fecha_inicio || !v.fecha_fin || v.fecha_fin >= v.fecha_inicio, {
    path: ['fecha_fin'],
    message: 'La auditoría no puede terminar antes de empezar',
  })

type Campos = z.infer<typeof esquema>

/**
 * Alta y edición del plan de una auditoría [F03·B1].
 *
 * ⚠️ **El cliente no se cambia después del alta.** Una auditoría con hallazgos
 * que cambiara de organización se llevaría su evidencia al expediente
 * equivocado; la base lo impide de todos modos —el `org_id` de todo lo que
 * cuelga lo hereda `heredar_org_de_la_auditoria()`—, pero un desplegable que
 * ofrece algo que va a fallar es peor que uno que no lo ofrece.
 *
 * ⚠️ **Aquí no se captura el folio.** Lo asigna `asignar_folio_auditoria()` en
 * la base: es el consecutivo de la firma y se calcula fuera del RLS, porque
 * contar las auditorías que este consultor tiene en la caché daría un número ya
 * usado en un expediente que no puede ver.
 */
export default function FormularioAuditoria({
  id,
  inicial,
  alEnviar,
}: {
  id: string
  inicial?: AuditoriaEnLista
  alEnviar: (orgId: string, datos: DatosAuditoria) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    org_id: inicial?.org_id ?? '',
    titulo: inicial?.titulo ?? '',
    tipo: inicial?.tipo ?? 'interna',
    estado: inicial?.estado ?? 'planeada',
    programa_id: inicial?.programa_id ?? '',
    proyecto_id: inicial?.proyecto_id ?? '',
    auditor_lider_id: inicial?.auditor_lider_id ?? '',
    fecha_inicio: inicial?.fecha_inicio ?? '',
    fecha_fin: inicial?.fecha_fin ?? '',
    alcance: inicial?.alcance ?? '',
    criterios: inicial?.criterios ?? '',
    metodologia: inicial?.metodologia ?? '',
  })
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})

  const { data: organizaciones = [] } = useQuery({
    queryKey: queryKeys.cartera.organizaciones(),
    queryFn: listarOrganizaciones,
  })

  const { data: usuarios = [] } = useQuery({
    queryKey: queryKeys.cartera.usuariosFirma(),
    queryFn: listarUsuariosDeLaFirma,
  })

  const { data: programas = [] } = useQuery({
    queryKey: queryKeys.auditorias.programas(),
    queryFn: listarProgramas,
  })

  // Los proyectos del cliente elegido. Se pide sólo cuando hay cliente: sin él,
  // la consulta traería el expediente de nadie.
  const { data: proyectos = [] } = useQuery({
    queryKey: queryKeys.cartera.proyectosDe(campos.org_id),
    queryFn: () => listarProyectosDe(campos.org_id),
    enabled: Boolean(campos.org_id),
  })

  const programasDelCliente = programas.filter((p) => p.org_id === campos.org_id)

  function escribir(campo: keyof Campos, valor: string) {
    setCampos((previo) => {
      // Cambiar de cliente invalida el programa y el proyecto elegidos: son de
      // otro expediente y la base los rechazaría.
      if (campo === 'org_id') {
        return { ...previo, org_id: valor, programa_id: '', proyecto_id: '' }
      }
      return { ...previo, [campo]: valor }
    })
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
      titulo: v.titulo,
      tipo: v.tipo,
      estado: v.estado,
      programa_id: v.programa_id || null,
      proyecto_id: v.proyecto_id || null,
      auditor_lider_id: v.auditor_lider_id || null,
      fecha_inicio: v.fecha_inicio || null,
      fecha_fin: v.fecha_fin || null,
      alcance: v.alcance || null,
      criterios: v.criterios || null,
      metodologia: v.metodologia || null,
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
        ayuda={inicial ? 'El cliente de una auditoría ya creada no se cambia.' : undefined}
        onChange={(e) => escribir('org_id', e.target.value)}
      >
        {organizaciones.map((org) => (
          <option key={org.id} value={org.id}>{nombreDeOrganizacion(org)}</option>
        ))}
      </Select>

      <Input
        etiqueta="Título"
        required
        placeholder="Auditoría interna ISO 9001 · Planta Norte"
        value={campos.titulo}
        error={errores.titulo}
        ayuda="El folio (AUD-2026-014) lo pone la base al guardar. Esto es lo que se lee en la lista."
        onChange={(e) => escribir('titulo', e.target.value)}
      />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <Select
            etiqueta="Tipo"
            required
            value={campos.tipo}
            error={errores.tipo}
            onChange={(e) => escribir('tipo', e.target.value)}
          >
            {TIPOS_AUDITORIA.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </Select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <Select
            etiqueta="Estado"
            required
            value={campos.estado}
            error={errores.estado}
            onChange={(e) => escribir('estado', e.target.value)}
          >
            {ESTADOS_AUDITORIA.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </Select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <Input
            etiqueta="Del"
            type="date"
            value={campos.fecha_inicio}
            error={errores.fecha_inicio}
            onChange={(e) => escribir('fecha_inicio', e.target.value)}
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <Input
            etiqueta="Al"
            type="date"
            value={campos.fecha_fin}
            error={errores.fecha_fin}
            onChange={(e) => escribir('fecha_fin', e.target.value)}
          />
        </div>
      </div>

      <Select
        etiqueta="Auditor líder"
        marcador="Sin asignar todavía"
        value={campos.auditor_lider_id}
        ayuda="Sus certificaciones se imprimen en el informe. Salen de su ficha de usuario."
        onChange={(e) => escribir('auditor_lider_id', e.target.value)}
      >
        {usuarios.map((usuario) => (
          <option key={usuario.id} value={usuario.id}>{usuario.nombre}</option>
        ))}
      </Select>

      <Select
        etiqueta="Programa anual"
        marcador={campos.org_id ? 'Fuera de programa' : 'Elige antes un cliente'}
        value={campos.programa_id}
        disabled={!campos.org_id}
        ayuda="Una auditoría de seguimiento o a un proveedor puede no estar en el programa. Eso es válido."
        onChange={(e) => escribir('programa_id', e.target.value)}
      >
        {programasDelCliente.map((programa) => (
          <option key={programa.id} value={programa.id}>
            {programa.anio} · {programa.nombre}
          </option>
        ))}
      </Select>

      <Select
        etiqueta="Proyecto"
        marcador={campos.org_id ? 'Sin proyecto' : 'Elige antes un cliente'}
        value={campos.proyecto_id}
        disabled={!campos.org_id}
        ayuda="De qué contrato salió. La auditoría sobrevive al proyecto que la pagó."
        onChange={(e) => escribir('proyecto_id', e.target.value)}
      >
        {proyectos.map((proyecto) => (
          <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre}</option>
        ))}
      </Select>

      <Textarea
        etiqueta="Alcance"
        rows={3}
        value={campos.alcance}
        ayuda="En palabras, para el informe. Las normas, los sitios y los procesos concretos se marcan en la pestaña Alcance del expediente."
        onChange={(e) => escribir('alcance', e.target.value)}
      />

      <Textarea
        etiqueta="Criterios"
        rows={3}
        value={campos.criterios}
        ayuda="Contra qué se audita: la norma, la documentación del SGC del cliente y los requisitos legales aplicables."
        onChange={(e) => escribir('criterios', e.target.value)}
      />

      <Textarea
        etiqueta="Metodología"
        rows={2}
        value={campos.metodologia}
        ayuda="Entrevista, observación en sitio, revisión documental, muestreo."
        onChange={(e) => escribir('metodologia', e.target.value)}
      />
    </form>
  )
}
