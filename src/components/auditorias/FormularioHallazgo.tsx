'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { queryKeys } from '@/lib/query/keys'
import { listarContactos, listarSitios } from '@/lib/queries/cartera'
import { listarNormasConClausulas } from '@/lib/queries/normas'
import { listarProcesos } from '@/lib/queries/procesos'
import { TIPOS_HALLAZGO, TIPOS_QUE_EXIGEN_ACCION, criterioDe } from '@/lib/auditorias/catalogos'
import type {
  ContextoHallazgo,
  DatosHallazgo,
  HallazgoConContexto,
} from '@/lib/queries/hallazgos'
import Aviso from '@/components/ui/Aviso'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

const esquema = z.object({
  // ⚠️ La cita es obligatoria aquí y NOT NULL en la base. Un hallazgo sin
  // cláusula no es un hallazgo, es una opinión.
  clausula_id: z.string().min(1, 'Cita la cláusula: sin ella no es un hallazgo, es una opinión'),
  tipo: z.string().min(1),
  descripcion: z.string().trim().min(1, 'Describe qué se incumple'),
  evidencia_objetiva: z
    .string()
    .trim()
    .min(1, 'Qué se vio, dónde y cuándo. Sin esto el hallazgo no se puede defender delante del cliente'),
  requisito_incumplido: z.string().trim(),
  proceso_id: z.string(),
  sitio_id: z.string(),
  responsable_contacto_id: z.string(),
  fecha_compromiso: z.string(),
  motivo: z.string().trim(),
})

type Campos = z.infer<typeof esquema>

/**
 * Levantar o corregir un hallazgo [F03·B4].
 *
 * ⚠️ **Todos los desplegables salen por `useQuery` con su clave**, y el de
 * cláusulas es literalmente el ejemplo que nombra la regla 3 del offline: sin
 * señal, un desplegable vacío deja el guardado muerto en la validación **antes**
 * de que `offlineWrite` pueda encolarlo — y el hallazgo no se encola, se pierde.
 * Por eso también van los cuatro en la precarga (§8.11).
 *
 * ⚠️ **La ayuda de clasificación se pinta al elegir el tipo**, no en un manual.
 * Es lo que hace que dos auditores clasifiquen igual, y por eso vive en la
 * pantalla en el momento de decidir. El texto de la firma llega con `D02`.
 */
export default function FormularioHallazgo({
  id,
  orgId,
  normasDelAlcance,
  inicial,
  clausulaSugerida,
  procesoSugerido,
  alEnviar,
}: {
  id: string
  orgId: string
  /** Los `norma_id` del alcance de la auditoría. */
  normasDelAlcance: readonly string[]
  inicial?: HallazgoConContexto
  /** Cuando nace de un punto del recorrido, viene con su cláusula puesta. */
  clausulaSugerida?: string | null
  procesoSugerido?: string | null
  alEnviar: (datos: DatosHallazgo, motivo: string | null, contexto: ContextoHallazgo) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    clausula_id: inicial?.clausula_id ?? clausulaSugerida ?? '',
    tipo: inicial?.tipo ?? 'nc_menor',
    descripcion: inicial?.descripcion ?? '',
    evidencia_objetiva: inicial?.evidencia_objetiva ?? '',
    requisito_incumplido: inicial?.requisito_incumplido ?? '',
    proceso_id: inicial?.proceso_id ?? procesoSugerido ?? '',
    sitio_id: inicial?.sitio_id ?? '',
    responsable_contacto_id: inicial?.responsable_contacto_id ?? '',
    fecha_compromiso: inicial?.fecha_compromiso ?? '',
    motivo: '',
  })
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})

  const { data: normas = [] } = useQuery({
    queryKey: queryKeys.normas.arbol(),
    queryFn: listarNormasConClausulas,
  })
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

  const dentro = useMemo(() => new Set(normasDelAlcance), [normasDelAlcance])
  // Sólo las normas del alcance: citar una que este cliente no está auditando
  // sería levantar un hallazgo fuera de alcance.
  const normasVisibles = normas.filter((n) => dentro.has(n.id))
  const reclasifica = Boolean(inicial) && campos.tipo !== inicial?.tipo

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

    const clausula = normasVisibles.flatMap((n) => n.clausulas).find((c) => c.id === v.clausula_id)
    const proceso = procesos.find((p) => p.id === v.proceso_id)
    const sitio = sitios.find((s) => s.id === v.sitio_id)
    const responsable = contactos.find((c) => c.id === v.responsable_contacto_id)

    alEnviar(
      {
        clausula_id: v.clausula_id,
        tipo: v.tipo,
        descripcion: v.descripcion,
        evidencia_objetiva: v.evidencia_objetiva,
        requisito_incumplido: v.requisito_incumplido || null,
        proceso_id: v.proceso_id || null,
        sitio_id: v.sitio_id || null,
        responsable_contacto_id: v.responsable_contacto_id || null,
        fecha_compromiso: v.fecha_compromiso || null,
      },
      v.motivo || null,
      {
        clausula: clausula
          ? { id: clausula.id, numero: clausula.numero, titulo: clausula.titulo, norma_id: clausula.norma_id }
          : null,
        proceso: proceso ? { id: proceso.id, nombre: proceso.nombre } : null,
        sitio: sitio ? { id: sitio.id, nombre: sitio.nombre } : null,
        responsable: responsable
          ? { id: responsable.id, nombre: responsable.nombre, puesto: responsable.puesto }
          : null,
      },
    )
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Select
        etiqueta="Tipo"
        required
        value={campos.tipo}
        error={errores.tipo}
        onChange={(e) => escribir('tipo', e.target.value)}
      >
        {TIPOS_HALLAZGO.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
        ))}
      </Select>

      {/* La ayuda que hace que dos auditores clasifiquen igual, en el momento de
          decidir. Nunca `undefined`: `criterioDe()` degrada a cadena vacía. */}
      {criterioDe(campos.tipo) && (
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--texto-dim)', margin: 0 }}>
          {criterioDe(campos.tipo)}
        </p>
      )}

      <Select
        etiqueta="Cláusula citada"
        required
        marcador="Elige la cláusula que se incumple"
        value={campos.clausula_id}
        error={errores.clausula_id}
        ayuda="Sólo las normas del alcance de esta auditoría."
        onChange={(e) => escribir('clausula_id', e.target.value)}
      >
        {normasVisibles.map((norma) => (
          <optgroup key={norma.id} label={`${norma.nombre}${norma.version ? ` : ${norma.version}` : ''}`}>
            {norma.clausulas.filter((c) => c.activa).map((clausula) => (
              <option key={clausula.id} value={clausula.id}>
                {clausula.numero} · {clausula.titulo}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>

      {normasVisibles.length === 0 && (
        <Aviso tono="advertencia">
          No hay cláusulas disponibles: esta auditoría no tiene normas en su alcance, o el catálogo
          no está en el teléfono. Márcalas en la pestaña Alcance, con señal.
        </Aviso>
      )}

      <Textarea
        etiqueta="Descripción"
        required
        rows={3}
        value={campos.descripcion}
        error={errores.descripcion}
        ayuda="Qué se incumple, en una frase que el cliente entienda sin el auditor delante."
        onChange={(e) => escribir('descripcion', e.target.value)}
      />

      <Textarea
        etiqueta="Evidencia objetiva"
        required
        rows={3}
        value={campos.evidencia_objetiva}
        error={errores.evidencia_objetiva}
        ayuda="Qué se vio, dónde y cuándo. «Se revisaron 5 registros de calibración del área de metrología el 10/03; 3 estaban vencidos.»"
        onChange={(e) => escribir('evidencia_objetiva', e.target.value)}
      />

      <Input
        etiqueta="Requisito incumplido"
        value={campos.requisito_incumplido}
        ayuda="El texto del requisito, del procedimiento del cliente o de la ley."
        onChange={(e) => escribir('requisito_incumplido', e.target.value)}
      />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <Select
            etiqueta="Proceso"
            marcador="Sin proceso"
            value={campos.proceso_id}
            onChange={(e) => escribir('proceso_id', e.target.value)}
          >
            {procesos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <Select
            etiqueta="Sitio"
            marcador="Sin sitio"
            value={campos.sitio_id}
            onChange={(e) => escribir('sitio_id', e.target.value)}
          >
            {sitios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <Select
            etiqueta="Responsable del cliente"
            marcador="Sin asignar"
            value={campos.responsable_contacto_id}
            ayuda="Quién del lado del cliente responde por esto."
            onChange={(e) => escribir('responsable_contacto_id', e.target.value)}
          >
            {contactos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <Input
            etiqueta="Fecha compromiso"
            type="date"
            value={campos.fecha_compromiso}
            ayuda={
              TIPOS_QUE_EXIGEN_ACCION.includes(campos.tipo)
                ? 'Una NC necesita fecha: es lo que se sigue el lunes siguiente.'
                : undefined
            }
            onChange={(e) => escribir('fecha_compromiso', e.target.value)}
          />
        </div>
      </div>

      {inicial && (
        <Textarea
          etiqueta={reclasifica ? 'Por qué se reclasifica' : 'Motivo del cambio'}
          rows={2}
          value={campos.motivo}
          ayuda={
            reclasifica
              ? `Va al historial junto al cambio de ${inicial.tipo} a ${campos.tipo}. Es lo que un certificador viene a leer.`
              : 'Queda en el historial, en la misma escritura que el cambio.'
          }
          onChange={(e) => escribir('motivo', e.target.value)}
        />
      )}
    </form>
  )
}
