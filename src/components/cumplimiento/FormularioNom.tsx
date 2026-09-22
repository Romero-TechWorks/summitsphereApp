'use client'

import { useState } from 'react'
import { z } from 'zod'
import { AUTORIDADES_NOM, TIPOS_NOM } from '@/lib/cumplimiento/catalogos'
import type { DatosNom, NomConRequisitos } from '@/lib/queries/noms'
import Checkbox from '@/components/ui/Checkbox'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

/**
 * ⚠️ **La clave lleva el año**, y el formulario lo exige: `NOM-035-STPS-2018`.
 * Sin el año, el día que salga la versión nueva no habría forma de darla de alta
 * como otra NOM sin reescribir la que citan las obligaciones ya evaluadas.
 */
const CLAVE_CON_ANIO = /-(19|20)\d{2}$/

const esquema = z.object({
  clave: z
    .string()
    .trim()
    .min(1, 'La NOM necesita su clave')
    .refine((v) => CLAVE_CON_ANIO.test(v), 'Termina la clave con el año: NOM-035-STPS-2018'),
  nombre: z.string().trim().min(1, 'Escribe de qué trata'),
  autoridad: z.string().min(1),
  tipo: z.string(),
  periodicidad: z.string().trim(),
  vigente: z.boolean(),
})

type Campos = z.infer<typeof esquema>

export default function FormularioNom({
  id,
  inicial,
  alEnviar,
}: {
  id: string
  inicial?: NomConRequisitos
  alEnviar: (datos: DatosNom) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    clave: inicial?.clave ?? '',
    nombre: inicial?.nombre ?? '',
    autoridad: inicial?.autoridad ?? 'stps',
    tipo: inicial?.tipo ?? '',
    periodicidad: inicial?.periodicidad ?? '',
    vigente: inicial?.vigente ?? true,
  })
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})

  function escribir<K extends keyof Campos>(campo: K, valor: Campos[K]) {
    setCampos((previo) => ({ ...previo, [campo]: valor }))
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const resultado = esquema.safeParse(campos)
    if (!resultado.success) {
      const porCampo = resultado.error.flatten().fieldErrors
      setErrores(
        Object.fromEntries(Object.entries(porCampo).map(([c, m]) => [c, m?.[0] ?? ''])),
      )
      return
    }
    setErrores({})
    const d = resultado.data
    alEnviar({
      clave: d.clave.toUpperCase(),
      nombre: d.nombre,
      autoridad: d.autoridad,
      tipo: d.tipo || null,
      periodicidad: d.periodicidad || null,
      vigente: d.vigente,
    })
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input
        etiqueta="Clave"
        ayuda={
          inicial
            ? '⚠️ Si salió una versión nueva de la NOM, no cambies la clave: da de alta otra y marca ésta como sustituida. Las obligaciones ya evaluadas la siguen citando.'
            : 'Con el año al final, tal como sale en el DOF: NOM-002-STPS-2010.'
        }
        className="mono"
        required
        autoFocus={!inicial}
        value={campos.clave}
        error={errores.clave}
        onChange={(e) => escribir('clave', e.target.value)}
      />

      <Input
        etiqueta="Nombre"
        ayuda="Como la llama la firma: «Prevención y protección contra incendios»."
        required
        value={campos.nombre}
        error={errores.nombre}
        onChange={(e) => escribir('nombre', e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <Select
          etiqueta="Autoridad"
          value={campos.autoridad}
          onChange={(e) => escribir('autoridad', e.target.value)}
        >
          {AUTORIDADES_NOM.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>

        <Select
          etiqueta="Tipo"
          marcador="Sin clasificar"
          value={campos.tipo}
          onChange={(e) => escribir('tipo', e.target.value)}
        >
          {TIPOS_NOM.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>

        <Input
          etiqueta="Periodicidad"
          ayuda="Lo que dice la NOM: «anual», «por evento»."
          value={campos.periodicidad}
          onChange={(e) => escribir('periodicidad', e.target.value)}
        />
      </div>

      {inicial && (
        <Checkbox
          etiqueta="Vigente"
          ayuda="Desmárcala cuando una versión nueva la sustituya. No se borra: hay obligaciones que la citan."
          checked={campos.vigente}
          onChange={(e) => escribir('vigente', e.target.checked)}
        />
      )}
    </form>
  )
}
