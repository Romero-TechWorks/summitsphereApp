'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { listarEquipo, type Sitio } from '@/lib/queries/cartera'
import { listarDocumentos } from '@/lib/queries/documentos'
import { listarTiposObligacion } from '@/lib/queries/noms'
import { listarAreas, listarObligaciones } from '@/lib/queries/obligaciones'
import type {
  ContextoVencimiento,
  DatosVencimiento,
  VencimientoConContexto,
} from '@/lib/queries/vencimientos'
import { sumarMeses } from '@/lib/cumplimiento/catalogos'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { SIN_SITIO } from './SelectorSitio'

/** Lo que decide una persona. `vigente` = «que lo diga la fecha». */
const SITUACIONES = [
  { valor: 'vigente', etiqueta: 'Según la fecha' },
  { valor: 'en_tramite', etiqueta: 'En trámite (la renovación está pedida)' },
  { valor: 'no_aplica', etiqueta: 'No aplica' },
] as const

const FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Alta, edición y **renovación** de un vencimiento.
 *
 * ⚠️ **`vence_en` se calcula** cuando hay emisión y vigencia —«emitido el 10 de
 * marzo, 24 meses»— con `sumarMeses()`, que recorta al fin de mes como Postgres.
 * Sin emisión se captura a mano: una licencia que ya venía no siempre trae la
 * fecha en que se expidió (docs/13 §5.4).
 *
 * ⚠️ **Renovar es dar de alta otra emisión**, no editar ésta: el formulario
 * llega prellenado con lo que se repite (nombre, tipo, obligación, sitio,
 * vigencia, responsable) y la fecha de emisión de hoy. La base marca la
 * anterior como renovada.
 */
export default function FormularioVencimiento({
  id,
  orgId,
  sitios,
  sitioInicial,
  inicial,
  renuevaA,
  alEnviar,
}: {
  id: string
  orgId: string
  sitios: Sitio[]
  sitioInicial: string
  inicial?: VencimientoConContexto
  /** Si se está registrando la renovación de éste. */
  renuevaA?: VencimientoConContexto
  alEnviar: (datos: DatosVencimiento, contexto: ContextoVencimiento) => void
}) {
  const base = inicial ?? renuevaA
  const esRenovado = inicial?.estado === 'renovado'

  const [nombre, setNombre] = useState(base?.nombre ?? '')
  const [tipoId, setTipoId] = useState(base?.tipo_id ?? '')
  const [obligacionId, setObligacionId] = useState(base?.obligacion_id ?? '')
  const [sitioId, setSitioId] = useState(
    base ? base.sitio_id ?? '' : sitioInicial === SIN_SITIO ? '' : sitioInicial,
  )
  const [areaId, setAreaId] = useState(base?.area_id ?? '')
  const [emitido, setEmitido] = useState(renuevaA ? hoyISO() : inicial?.emitido_en ?? '')
  const [vigencia, setVigencia] = useState(base?.vigencia_meses == null ? '' : String(base.vigencia_meses))
  const [venceManual, setVenceManual] = useState(renuevaA ? '' : inicial?.vence_en ?? '')
  const [situacion, setSituacion] = useState(
    inicial && (inicial.estado === 'en_tramite' || inicial.estado === 'no_aplica') ? inicial.estado : 'vigente',
  )
  const [responsableId, setResponsableId] = useState(base?.responsable_id ?? '')
  const [documentoId, setDocumentoId] = useState(renuevaA ? '' : inicial?.documento_id ?? '')
  const [notas, setNotas] = useState(renuevaA ? '' : inicial?.notas ?? '')
  const [errores, setErrores] = useState<Record<string, string>>({})

  const { data: tipos = [] } = useQuery({
    queryKey: queryKeys.cumplimiento.tipos(),
    queryFn: listarTiposObligacion,
  })
  const { data: obligaciones = [] } = useQuery({
    queryKey: queryKeys.cumplimiento.obligaciones(orgId),
    queryFn: () => listarObligaciones(orgId),
  })
  const { data: areas = [] } = useQuery({
    queryKey: queryKeys.cumplimiento.areas(orgId),
    queryFn: () => listarAreas(orgId),
  })
  const { data: equipo = [] } = useQuery({
    queryKey: queryKeys.cartera.equipo(orgId),
    queryFn: () => listarEquipo(orgId),
  })
  const { data: documentos = [] } = useQuery({
    queryKey: queryKeys.sistemas.documentos(orgId),
    queryFn: () => listarDocumentos(orgId),
  })

  const meses = /^\d{1,3}$/.test(vigencia.trim()) && Number(vigencia) > 0 ? Number(vigencia) : null
  const calculada = FECHA.test(emitido) && meses ? sumarMeses(emitido, meses) : null
  const venceEn = calculada ?? venceManual

  // Las obligaciones que pueden tener algo que vence: las que no se decidió que
  // no aplican. La actual se conserva aunque ya no cumpla el filtro.
  const opcionesObligacion = obligaciones.filter((o) => o.aplica !== false || o.id === obligacionId)
  const areasDelSitio = areas.filter((a) => a.sitio_id === sitioId && (a.activa || a.id === areaId))

  function elegirObligacion(idElegida: string) {
    setObligacionId(idElegida)
    // Si la obligación es de un sitio, el vencimiento casi siempre también:
    // se propone, no se impone.
    const o = obligaciones.find((x) => x.id === idElegida)
    if (o && !sitioId && o.sitio_id) {
      setSitioId(o.sitio_id)
      setAreaId(o.area_id ?? '')
    }
    if (o && !tipoId && o.tipo_id) setTipoId(o.tipo_id)
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const nuevos: Record<string, string> = {}

    if (nombre.trim() === '') nuevos.nombre = 'Qué vence: «Estudio de ruido NOM-011», «Dictamen eléctrico».'
    if (vigencia.trim() !== '' && meses === null) nuevos.vigencia = 'Un número de meses, mayor que cero.'
    if (!FECHA.test(venceEn)) {
      nuevos.vence = calculada === null && emitido && !meses
        ? 'Con la emisión, pon la vigencia en meses — o escribe la fecha de vencimiento a mano.'
        : 'Pon la fecha de vencimiento: es lo que vigila la app.'
    }

    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return

    const tipo = tipos.find((t) => t.id === tipoId)
    const obligacion = obligaciones.find((o) => o.id === obligacionId)
    const miembro = equipo.find((m) => m.usuario_id === responsableId)
    const documento = documentos.find((d) => d.id === documentoId)

    alEnviar(
      {
        obligacion_id: obligacionId || null,
        sitio_id: sitioId || null,
        area_id: sitioId && areaId ? areaId : null,
        tipo_id: tipoId || null,
        nombre: nombre.trim(),
        emitido_en: FECHA.test(emitido) ? emitido : null,
        vigencia_meses: meses,
        vence_en: venceEn,
        responsable_id: responsableId || null,
        documento_id: documentoId || null,
        // Un renglón ya renovado es historia: no vuelve al ciclo por editarle la nota.
        estado: esRenovado ? 'renovado' : situacion,
        notas: notas.trim() || null,
      },
      {
        organizacion: base?.organizacion ?? null,
        obligacion: obligacion ? { id: obligacion.id, elemento: obligacion.elemento, obligacion: obligacion.obligacion } : null,
        tipo: tipo ? { id: tipo.id, nombre: tipo.nombre } : null,
        responsable: miembro?.usuario ? { id: miembro.usuario.id, nombre: miembro.usuario.nombre } : null,
        documento: documento ? { id: documento.id, codigo: documento.codigo, titulo: documento.titulo } : null,
      },
    )
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input
        etiqueta="Qué vence"
        ayuda="«Estudio de ruido NOM-011», «Recarga de extintores», «Poder notarial de R. López»."
        required
        autoFocus={!inicial}
        value={nombre}
        error={errores.nombre}
        onChange={(e) => setNombre(e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Select
          etiqueta="Tipo"
          marcador={tipos.length === 0 ? 'La firma no tiene tipos todavía' : 'Sin tipo'}
          value={tipoId}
          onChange={(e) => setTipoId(e.target.value)}
        >
          {tipos.filter((t) => t.activo || t.id === tipoId).map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </Select>

        <Select
          etiqueta="Obligación que satisface"
          marcador={opcionesObligacion.length === 0 ? 'La matriz de este cliente está vacía' : 'Ninguna'}
          value={obligacionId}
          onChange={(e) => elegirObligacion(e.target.value)}
        >
          {opcionesObligacion.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nom ? `${o.nom.clave} · ` : ''}{o.elemento || o.obligacion}
            </option>
          ))}
        </Select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Select
          etiqueta="Sitio"
          marcador="De la organización (sin sitio)"
          value={sitioId}
          onChange={(e) => { setSitioId(e.target.value); setAreaId('') }}
        >
          {sitios.filter((s) => s.activo || s.id === sitioId).map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Select>
        <Select
          etiqueta="Área"
          marcador={!sitioId ? 'Elige antes el sitio' : areasDelSitio.length === 0 ? 'El sitio no tiene áreas' : 'Todo el sitio'}
          value={areaId}
          disabled={!sitioId}
          onChange={(e) => setAreaId(e.target.value)}
        >
          {areasDelSitio.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </Select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <Input
          etiqueta="Emitido el"
          type="date"
          value={emitido}
          onChange={(e) => setEmitido(e.target.value)}
        />
        <Input
          etiqueta="Vigencia (meses)"
          inputMode="numeric"
          className="mono"
          placeholder="24"
          value={vigencia}
          error={errores.vigencia}
          onChange={(e) => setVigencia(e.target.value)}
        />
        {calculada ? (
          <div>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--texto)', marginBottom: 6 }}>
              Vence el
            </span>
            <span className="mono" style={{ fontSize: 15, color: 'var(--texto)' }}>{formatDateOnly(calculada)}</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--texto-dim)', marginTop: 2 }}>
              Calculado: emisión + vigencia.
            </span>
          </div>
        ) : (
          <Input
            etiqueta="Vence el"
            type="date"
            required
            ayuda="Sin emisión y vigencia, escríbela a mano."
            value={venceManual}
            error={errores.vence}
            onChange={(e) => setVenceManual(e.target.value)}
          />
        )}
      </div>
      {calculada && errores.vence && (
        <p role="alert" style={{ margin: 0, fontSize: 12.5, color: 'var(--error)' }}>{errores.vence}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {!esRenovado && (
          <Select
            etiqueta="Situación"
            ayuda="«Según la fecha» deja que la app diga vigente, por vencer o vencido."
            value={situacion}
            onChange={(e) => setSituacion(e.target.value)}
          >
            {SITUACIONES.map((s) => (
              <option key={s.valor} value={s.valor}>{s.etiqueta}</option>
            ))}
          </Select>
        )}
        <Select
          etiqueta="Responsable"
          ayuda="A quien le llegan los avisos de 90, 60, 30 y 7 días."
          marcador="Sin asignar — nadie recibe aviso"
          value={responsableId}
          onChange={(e) => setResponsableId(e.target.value)}
        >
          {equipo.filter((m) => m.usuario).map((m) => (
            <option key={m.usuario_id} value={m.usuario_id}>{m.usuario?.nombre}</option>
          ))}
          {base?.responsable && !equipo.some((m) => m.usuario_id === base.responsable_id) && (
            <option value={base.responsable.id}>{base.responsable.nombre}</option>
          )}
        </Select>
      </div>

      <Select
        etiqueta="Documento del SGI"
        ayuda="Si el dictamen o el estudio está en la biblioteca documental del cliente. El PDF también se puede adjuntar aquí mismo, después de guardar."
        marcador={documentos.length === 0 ? 'El cliente no tiene documentos capturados' : 'Ninguno'}
        value={documentoId}
        onChange={(e) => setDocumentoId(e.target.value)}
      >
        {documentos.map((d) => (
          <option key={d.id} value={d.id}>{d.codigo} · {d.titulo}</option>
        ))}
      </Select>

      <Textarea
        etiqueta="Notas"
        rows={2}
        ayuda="Laboratorio, número de folio, con quién se tramita."
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
      />
    </form>
  )
}
