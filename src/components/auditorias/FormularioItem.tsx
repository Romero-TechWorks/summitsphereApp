'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { queryKeys } from '@/lib/query/keys'
import { listarNormasConClausulas } from '@/lib/queries/normas'
import { listarProcesos } from '@/lib/queries/procesos'
import type { DatosItem, ItemConContexto } from '@/lib/queries/verificacion'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

const esquema = z.object({
  pregunta: z.string().trim().min(1, 'Escribe qué se va a verificar'),
  clausula_id: z.string(),
  proceso_id: z.string(),
})

type Campos = z.infer<typeof esquema>

/**
 * Un punto de la lista de verificación: añadir o editar.
 *
 * ⚠️ **La cláusula es OPCIONAL aquí, y obligatoria en un hallazgo.** No es una
 * inconsistencia: el auditor añade preguntas propias que no cuelgan de ninguna
 * cláusula —«¿el extintor del pasillo 3 tiene la carga vigente?»— y eso es
 * trabajo legítimo. Lo que no puede existir es un hallazgo sin cláusula citada:
 * eso ya no es un hallazgo, es una opinión.
 *
 * ⚠️ El desplegable de cláusulas sale por `useQuery` con su clave, nunca con
 * `useEffect`. Es literalmente el ejemplo que la regla 3 del offline nombra: sin
 * señal, un desplegable vacío deja el guardado muerto en la validación **antes**
 * de que `offlineWrite` pueda encolarlo.
 *
 * ⚠️ Y sólo se ofrecen **las cláusulas de las normas del ALCANCE**. Ofrecer el
 * catálogo entero dejaría atar un punto a una norma que este cliente no está
 * auditando, y de ahí saldría un hallazgo fuera de alcance.
 */
export default function FormularioItem({
  id,
  orgId,
  normasDelAlcance,
  inicial,
  alEnviar,
}: {
  id: string
  orgId: string
  /** Los `norma_id` que la auditoría tiene en su alcance. */
  normasDelAlcance: readonly string[]
  inicial?: ItemConContexto
  alEnviar: (
    datos: Omit<DatosItem, 'orden'>,
    clausula: ItemConContexto['clausula'],
    proceso: ItemConContexto['proceso'],
  ) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    pregunta: inicial?.pregunta ?? '',
    clausula_id: inicial?.clausula_id ?? '',
    proceso_id: inicial?.proceso_id ?? '',
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

  const dentro = useMemo(() => new Set(normasDelAlcance), [normasDelAlcance])
  const normasVisibles = normas.filter((n) => dentro.has(n.id))

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

    const clausula = normasVisibles
      .flatMap((n) => n.clausulas)
      .find((c) => c.id === v.clausula_id)
    const proceso = procesos.find((p) => p.id === v.proceso_id)

    alEnviar(
      {
        pregunta: v.pregunta,
        clausula_id: v.clausula_id || null,
        proceso_id: v.proceso_id || null,
      },
      clausula
        ? {
            id: clausula.id,
            numero: clausula.numero,
            titulo: clausula.titulo,
            resumen: clausula.resumen,
            norma_id: clausula.norma_id,
          }
        : null,
      proceso ? { id: proceso.id, nombre: proceso.nombre } : null,
    )
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input
        etiqueta="Qué se verifica"
        required
        placeholder="¿Cómo se determina el contexto de la organización?"
        value={campos.pregunta}
        error={errores.pregunta}
        onChange={(e) => escribir('pregunta', e.target.value)}
      />

      <Select
        etiqueta="Cláusula"
        marcador="Pregunta propia, sin cláusula"
        value={campos.clausula_id}
        ayuda="Sólo las normas del alcance. Un punto sin cláusula es válido; un hallazgo sin ella, no."
        onChange={(e) => escribir('clausula_id', e.target.value)}
      >
        {normasVisibles.map((norma) => (
          <optgroup key={norma.id} label={`${norma.nombre}${norma.version ? ` : ${norma.version}` : ''}`}>
            {norma.clausulas
              .filter((c) => c.activa)
              .map((clausula) => (
                <option key={clausula.id} value={clausula.id}>
                  {clausula.numero} · {clausula.titulo}
                </option>
              ))}
          </optgroup>
        ))}
      </Select>

      <Select
        etiqueta="Proceso"
        marcador="Sin proceso"
        value={campos.proceso_id}
        ayuda="A qué proceso del cliente le toca esta pregunta. Ordena el recorrido por área."
        onChange={(e) => escribir('proceso_id', e.target.value)}
      >
        {procesos.map((proceso) => (
          <option key={proceso.id} value={proceso.id}>{proceso.nombre}</option>
        ))}
      </Select>
    </form>
  )
}
