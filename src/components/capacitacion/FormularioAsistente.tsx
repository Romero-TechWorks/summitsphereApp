'use client'

import { useState } from 'react'
import { FORMATO_CURP, UMBRAL_APROBACION, normalizarCurp } from '@/lib/capacitacion/catalogos'
import type { Asistente, DatosAsistente } from '@/lib/queries/capacitacion'
import Checkbox from '@/components/ui/Checkbox'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'

const FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Un asistente: sus datos, su asistencia, su calificación y **su DC-3**.
 *
 * ⚠️ **La calificación la CAPTURA el instructor**, no la calcula la app: el
 * examen tiene preguntas abiertas. Y quien no llega al 80 % no reprueba: va a
 * reforzamiento, y mientras no se le pide DC-3.
 *
 * ⚠️ **El DC-3 se REGISTRA**: folio y fecha de lo que mandó el proveedor. El PDF
 * se adjunta debajo del formulario.
 */
export default function FormularioAsistente({
  id,
  inicial,
  alEnviar,
}: {
  id: string
  inicial: Asistente
  alEnviar: (datos: DatosAsistente) => void
}) {
  const [nombre, setNombre] = useState(inicial.nombre)
  const [curp, setCurp] = useState(inicial.curp ?? '')
  const [puesto, setPuesto] = useState(inicial.puesto ?? '')
  const [ocupacion, setOcupacion] = useState(inicial.ocupacion ?? '')
  const [asistio, setAsistio] = useState(inicial.asistio)
  const [calificacion, setCalificacion] = useState(inicial.calificacion == null ? '' : String(inicial.calificacion))
  const [folio, setFolio] = useState(inicial.folio_dc3 ?? '')
  const [recibido, setRecibido] = useState(inicial.dc3_recibido_en ?? '')
  const [notas, setNotas] = useState(inicial.notas ?? '')
  const [errores, setErrores] = useState<Record<string, string>>({})

  const cal = calificacion.trim().replace(',', '.')
  const reforzamiento = cal !== '' && Number(cal) < UMBRAL_APROBACION

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const nuevos: Record<string, string> = {}
    const c = normalizarCurp(curp)
    if (!nombre.trim()) nuevos.nombre = 'El nombre como va en la constancia'
    if (c && !FORMATO_CURP.test(c)) nuevos.curp = 'No tiene el formato de una CURP (18 caracteres). Revísala: una CURP mal escrita es un DC-3 que el proveedor devuelve.'
    if (cal !== '' && !(Number(cal) >= 0 && Number(cal) <= 100)) nuevos.calificacion = 'De 0 a 100'
    if (folio.trim() && !asistio) nuevos.folio = 'Quien no asistió no tiene DC-3'
    if (recibido && !folio.trim()) nuevos.recibido = 'Escribe primero el folio del DC-3'
    if (recibido && !FECHA.test(recibido)) nuevos.recibido = 'Una fecha'
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return

    alEnviar({
      nombre: nombre.trim(),
      curp: c || null,
      puesto: puesto.trim() || null,
      ocupacion: ocupacion.trim() || null,
      asistio,
      calificacion: cal === '' ? null : Number(cal),
      folio_dc3: folio.trim() || null,
      dc3_recibido_en: recibido || null,
      notas: notas.trim() || null,
    })
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input etiqueta="Nombre" required value={nombre} error={errores.nombre} onChange={(e) => setNombre(e.target.value)} />
      <Input
        etiqueta="CURP"
        className="mono"
        value={curp}
        error={errores.curp}
        onChange={(e) => setCurp(normalizarCurp(e.target.value))}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Input etiqueta="Puesto" value={puesto} onChange={(e) => setPuesto(e.target.value)} />
        <Input etiqueta="Ocupación específica" ayuda="La que pide el DC-3." value={ocupacion} onChange={(e) => setOcupacion(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, alignItems: 'end' }}>
        <Checkbox etiqueta="Asistió" checked={asistio} onChange={(e) => setAsistio(e.target.checked)} />
        <Input
          etiqueta="Calificación"
          inputMode="decimal"
          className="mono"
          ayuda={reforzamiento ? `Menos de ${UMBRAL_APROBACION}: va a reforzamiento, no reprueba.` : 'La que da el instructor, de 0 a 100.'}
          value={calificacion}
          error={errores.calificacion}
          onChange={(e) => setCalificacion(e.target.value)}
        />
      </div>

      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto)', marginBottom: 4 }}>El DC-3 que mandó el proveedor</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          <Input etiqueta="Folio" className="mono" value={folio} error={errores.folio} onChange={(e) => setFolio(e.target.value)} />
          <Input etiqueta="Recibido el" type="date" value={recibido} error={errores.recibido} onChange={(e) => setRecibido(e.target.value)} />
        </div>
      </fieldset>

      <Textarea etiqueta="Notas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
    </form>
  )
}
