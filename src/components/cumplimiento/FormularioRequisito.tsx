'use client'

import { useState } from 'react'
import { z } from 'zod'
import type { DatosRequisito, NomRequisito } from '@/lib/queries/noms'
import Checkbox from '@/components/ui/Checkbox'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'

const entero = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d{1,5}$/.test(v), 'Un número entero')

const esquema = z
  .object({
    numeral: z.string().trim(),
    elemento: z.string().trim().min(1, 'Qué se revisa: «Extintores», «Carpeta normativa»'),
    descripcion: z.string().trim().min(1, 'El deber, con las palabras de la firma'),
    evidencia_esperada: z.string().trim(),
    aplica_si: z.string().trim(),
    min_trabajadores: entero,
    max_trabajadores: entero,
    orden: entero,
    activa: z.boolean(),
  })
  .refine(
    (d) => d.min_trabajadores === '' || d.max_trabajadores === '' ||
      Number(d.min_trabajadores) <= Number(d.max_trabajadores),
    { message: 'El mínimo no puede ser mayor que el máximo', path: ['max_trabajadores'] },
  )

type Campos = z.infer<typeof esquema>

/**
 * Un elemento verificable de una NOM.
 *
 * ⚠️ **El elemento es lo que se camina** —«Extintores», «Carpeta normativa»—,
 * no el numeral (docs/13 §3.4). El numeral queda como referencia para citarlo
 * en el informe.
 *
 * ⚠️ **La descripción es de Summit** (regla 12): el deber redactado con las
 * palabras de la firma, no el párrafo de la NOM copiado. Es su criterio técnico
 * y su defensa cuando un cliente discuta un veredicto.
 */
export default function FormularioRequisito({
  id,
  inicial,
  ordenSugerido,
  alEnviar,
}: {
  id: string
  inicial?: NomRequisito
  ordenSugerido: number
  alEnviar: (datos: DatosRequisito) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    numeral: inicial?.numeral ?? '',
    elemento: inicial?.elemento ?? '',
    descripcion: inicial?.descripcion ?? '',
    evidencia_esperada: inicial?.evidencia_esperada ?? '',
    aplica_si: inicial?.aplica_si ?? '',
    min_trabajadores: inicial?.min_trabajadores == null ? '' : String(inicial.min_trabajadores),
    max_trabajadores: inicial?.max_trabajadores == null ? '' : String(inicial.max_trabajadores),
    orden: String(inicial?.orden ?? ordenSugerido),
    activa: inicial?.activa ?? true,
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
      numeral: d.numeral || null,
      elemento: d.elemento,
      descripcion: d.descripcion,
      evidencia_esperada: d.evidencia_esperada || null,
      aplica_si: d.aplica_si || null,
      min_trabajadores: d.min_trabajadores === '' ? null : Number(d.min_trabajadores),
      max_trabajadores: d.max_trabajadores === '' ? null : Number(d.max_trabajadores),
      orden: d.orden === '' ? 0 : Number(d.orden),
      activa: d.activa,
    })
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 14 }}>
        <Input
          etiqueta="Elemento"
          ayuda="Lo que se revisa caminando o en la carpeta."
          required
          autoFocus={!inicial}
          value={campos.elemento}
          error={errores.elemento}
          onChange={(e) => escribir('elemento', e.target.value)}
        />
        <Input
          etiqueta="Numeral"
          ayuda="Referencia: 5.3, 7.1 a)."
          className="mono"
          value={campos.numeral}
          onChange={(e) => escribir('numeral', e.target.value)}
        />
      </div>

      <Textarea
        etiqueta="Qué exige"
        rows={3}
        ayuda="El deber con las palabras de la firma: «Contar con extintores de acuerdo con la clase de fuego…». No copies el texto íntegro de la NOM."
        required
        value={campos.descripcion}
        error={errores.descripcion}
        onChange={(e) => escribir('descripcion', e.target.value)}
      />

      <Textarea
        etiqueta="Evidencia esperada"
        rows={2}
        ayuda="Qué documento o registro lo demuestra."
        value={campos.evidencia_esperada}
        onChange={(e) => escribir('evidencia_esperada', e.target.value)}
      />

      <Input
        etiqueta="Cuándo aplica"
        ayuda="La condición en prosa: «centros de trabajo de 16 a 50 trabajadores»."
        value={campos.aplica_si}
        onChange={(e) => escribir('aplica_si', e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        <Input
          etiqueta="Desde (trabajadores)"
          inputMode="numeric"
          className="mono"
          value={campos.min_trabajadores}
          error={errores.min_trabajadores}
          onChange={(e) => escribir('min_trabajadores', e.target.value)}
        />
        <Input
          etiqueta="Hasta (trabajadores)"
          inputMode="numeric"
          className="mono"
          value={campos.max_trabajadores}
          error={errores.max_trabajadores}
          onChange={(e) => escribir('max_trabajadores', e.target.value)}
        />
        <Input
          etiqueta="Orden"
          inputMode="numeric"
          className="mono"
          value={campos.orden}
          error={errores.orden}
          onChange={(e) => escribir('orden', e.target.value)}
        />
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--texto-dim)', lineHeight: 1.5 }}>
        Los dos números sólo sirven para que la app <strong>proponga</strong> si aplica, comparándolos con los
        trabajadores del sitio. Quien decide es el consultor, con su justificación.
      </p>

      {inicial && (
        <Checkbox
          etiqueta="Activo"
          ayuda="Apágalo si ya no se revisa. No se borra: hay obligaciones que nacieron de él."
          checked={campos.activa}
          onChange={(e) => escribir('activa', e.target.checked)}
        />
      )}
    </form>
  )
}
