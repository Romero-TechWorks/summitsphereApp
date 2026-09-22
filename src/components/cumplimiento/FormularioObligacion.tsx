'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { listarEquipo, type Sitio } from '@/lib/queries/cartera'
import { listarDocumentos } from '@/lib/queries/documentos'
import { listarNoms, listarTiposObligacion } from '@/lib/queries/noms'
import {
  listarAreas,
  type ContextoObligacion,
  type DatosObligacion,
  type ObligacionConContexto,
} from '@/lib/queries/obligaciones'
import { FRECUENCIAS, NATURALEZAS, proponerAplica } from '@/lib/cumplimiento/catalogos'
import Aviso from '@/components/ui/Aviso'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { SIN_SITIO } from './SelectorSitio'

type Decision = 'sin_decidir' | 'aplica' | 'no_aplica'

function decisionDe(aplica: boolean | null | undefined): Decision {
  if (aplica === true) return 'aplica'
  if (aplica === false) return 'no_aplica'
  return 'sin_decidir'
}

/**
 * Alta manual y edición de una obligación.
 *
 * ⚠️ **La app propone; la persona decide** (docs/13 §5.2). Cuando la obligación
 * nació de un elemento con rango de trabajadores, se pinta la propuesta —«el
 * sitio tiene 30, el requisito es de 16 a 50»— y un botón para tomarla, que
 * además deja el motivo como punto de partida de la justificación. Lo que se
 * guarda es lo que el consultor elige.
 *
 * ⚠️ **La justificación se exige en los dos sentidos**, igual que el CHECK de la
 * base. Se valida aquí para que el error salga en el campo y no como un 23514
 * media hora después, desde la cola.
 *
 * ⚠️ **Todos los desplegables salen de `useQuery`** con su clave (regla 3 del
 * offline): áreas, tipos, NOMs, equipo y documentos están en la precarga.
 */
export default function FormularioObligacion({
  id,
  orgId,
  sitios,
  sitioInicial,
  inicial,
  alEnviar,
}: {
  id: string
  orgId: string
  sitios: Sitio[]
  /** El sitio que está elegido en la pantalla, para un alta. */
  sitioInicial: string
  inicial?: ObligacionConContexto
  alEnviar: (datos: DatosObligacion, contexto: ContextoObligacion) => void
}) {
  const [obligacion, setObligacion] = useState(inicial?.obligacion ?? '')
  const [elemento, setElemento] = useState(inicial?.elemento ?? '')
  const [fuente, setFuente] = useState(inicial?.fuente ?? '')
  const [naturaleza, setNaturaleza] = useState<string[]>(inicial?.naturaleza ?? [])
  const [sitioId, setSitioId] = useState(
    inicial ? inicial.sitio_id ?? '' : sitioInicial === SIN_SITIO ? '' : sitioInicial,
  )
  const [areaId, setAreaId] = useState(inicial?.area_id ?? '')
  const [tipoId, setTipoId] = useState(inicial?.tipo_id ?? '')
  const [nomId, setNomId] = useState(inicial?.nom_id ?? '')
  const [decision, setDecision] = useState<Decision>(decisionDe(inicial?.aplica))
  const [justificacion, setJustificacion] = useState(inicial?.justificacion ?? '')
  const [responsableId, setResponsableId] = useState(inicial?.responsable_id ?? '')
  const [documentoId, setDocumentoId] = useState(inicial?.documento_id ?? '')
  const [evidencia, setEvidencia] = useState(inicial?.evidencia_esperada ?? '')
  const [frecuencia, setFrecuencia] = useState(inicial?.frecuencia_verificacion ?? '')
  const [errores, setErrores] = useState<Record<string, string>>({})

  const { data: areas = [] } = useQuery({
    queryKey: queryKeys.cumplimiento.areas(orgId),
    queryFn: () => listarAreas(orgId),
  })
  const { data: tipos = [] } = useQuery({
    queryKey: queryKeys.cumplimiento.tipos(),
    queryFn: listarTiposObligacion,
  })
  const { data: noms = [] } = useQuery({
    queryKey: queryKeys.cumplimiento.noms(),
    queryFn: listarNoms,
  })
  const { data: equipo = [] } = useQuery({
    queryKey: queryKeys.cartera.equipo(orgId),
    queryFn: () => listarEquipo(orgId),
  })
  const { data: documentos = [] } = useQuery({
    queryKey: queryKeys.sistemas.documentos(orgId),
    queryFn: () => listarDocumentos(orgId),
  })

  const areasDelSitio = areas.filter((a) => a.sitio_id === sitioId && (a.activa || a.id === areaId))
  const sitio = sitios.find((s) => s.id === sitioId) ?? null
  const propuesta = proponerAplica(inicial?.requisito ?? null, sitio?.num_trabajadores ?? null)
  const evaluada = Boolean(inicial && inicial.estado_cumplimiento !== 'sin_evaluar')

  function alternarNaturaleza(valor: string, marcada: boolean) {
    setNaturaleza((previo) =>
      marcada ? [...previo.filter((v) => v !== valor), valor] : previo.filter((v) => v !== valor),
    )
  }

  function tomarPropuesta() {
    if (propuesta.aplica === null) return
    setDecision(propuesta.aplica ? 'aplica' : 'no_aplica')
    if (justificacion.trim() === '') setJustificacion(propuesta.motivo)
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const nuevos: Record<string, string> = {}

    if (obligacion.trim() === '') nuevos.obligacion = 'Escribe el deber: «Contar con…», «Notificar…»'
    if (decision !== 'sin_decidir' && justificacion.trim() === '') {
      nuevos.justificacion =
        decision === 'aplica'
          ? 'Di por qué aplica aquí. Es lo que se defiende ante el cliente y ante la autoridad.'
          : 'Di por qué NO aplica. Un «no aplica» sin motivo es el primer hallazgo de un auditor externo.'
    }
    if (evaluada && decision !== 'aplica') {
      nuevos.decision =
        'Ya tiene veredicto. Para decir que no aplica, primero deshaz la evaluación en el recorrido.'
    }

    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return

    const tipo = tipos.find((t) => t.id === tipoId)
    const nom = noms.find((n) => n.id === nomId)
    const miembro = equipo.find((m) => m.usuario_id === responsableId)
    const documento = documentos.find((d) => d.id === documentoId)

    alEnviar(
      {
        sitio_id: sitioId || null,
        area_id: sitioId && areaId ? areaId : null,
        tipo_id: tipoId || null,
        nom_id: nomId || null,
        elemento: elemento.trim() || null,
        fuente: fuente.trim() || null,
        naturaleza,
        obligacion: obligacion.trim(),
        aplica: decision === 'sin_decidir' ? null : decision === 'aplica',
        justificacion: justificacion.trim() || null,
        responsable_id: responsableId || null,
        documento_id: documentoId || null,
        evidencia_esperada: evidencia.trim() || null,
        frecuencia_verificacion: frecuencia || null,
      },
      {
        nom: nom ? { id: nom.id, clave: nom.clave, nombre: nom.nombre } : null,
        // El requisito no se elige aquí: es de dónde nació la fila.
        requisito: inicial?.requisito ?? null,
        tipo: tipo ? { id: tipo.id, nombre: tipo.nombre } : null,
        responsable: miembro?.usuario ? { id: miembro.usuario.id, nombre: miembro.usuario.nombre } : null,
        documento: documento ? { id: documento.id, codigo: documento.codigo, titulo: documento.titulo } : null,
      },
    )
  }

  return (
    <form id={id} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Textarea
        etiqueta="Obligación"
        rows={2}
        ayuda="El deber, redactado como tal: «Contar con extintores…», «Atender solicitudes ARCO en 20 días hábiles»."
        required
        value={obligacion}
        error={errores.obligacion}
        onChange={(e) => setObligacion(e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <Input
          etiqueta="Elemento"
          ayuda="Lo que se revisa: «Extintores». Opcional en una obligación de compliance."
          value={elemento}
          onChange={(e) => setElemento(e.target.value)}
        />
        <Input
          etiqueta="Fuente"
          ayuda="La cita: «LFPDPPP arts. 26 y 27», «Contrato de servicios, cl. 8»."
          value={fuente}
          onChange={(e) => setFuente(e.target.value)}
        />
      </div>

      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto)', marginBottom: 4 }}>Naturaleza</legend>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {NATURALEZAS.map((n) => (
            <Checkbox
              key={n.valor}
              etiqueta={n.etiqueta}
              checked={naturaleza.includes(n.valor)}
              onChange={(e) => alternarNaturaleza(n.valor, e.target.checked)}
            />
          ))}
        </div>
      </fieldset>

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Select
          etiqueta="NOM"
          marcador="Ninguna (ley, contrato, voluntaria)"
          value={nomId}
          // Una obligación que nació de un elemento de la biblioteca ya tiene su
          // NOM: cambiarla la separaría del elemento y la base lo rechazaría.
          disabled={Boolean(inicial?.nom_requisito_id)}
          onChange={(e) => setNomId(e.target.value)}
        >
          {noms.filter((n) => n.vigente || n.id === nomId).map((n) => (
            <option key={n.id} value={n.id}>{n.clave}</option>
          ))}
        </Select>

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
      </div>

      {/* ── ¿Aplica? La decisión con su justificación ──────────────────────── */}
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto)', marginBottom: 6 }}>
          ¿Aplica a este cliente?
        </legend>

        {propuesta.motivo && (
          <div style={{ marginBottom: 8 }}>
            <Aviso tono="info">
              {propuesta.aplica === null ? (
                propuesta.motivo
              ) : (
                <>
                  La app propone: <strong>{propuesta.aplica ? 'aplica' : 'no aplica'}</strong>. {propuesta.motivo}{' '}
                  <Button variante="fantasma" tamano="sm" type="button" onClick={tomarPropuesta}>
                    Tomar la propuesta
                  </Button>
                </>
              )}
            </Aviso>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            ['aplica', 'Aplica'],
            ['no_aplica', 'No aplica'],
            ['sin_decidir', 'Sin decidir'],
          ] as [Decision, string][]).map(([valor, etiqueta]) => (
            <Button
              key={valor}
              type="button"
              variante={decision === valor ? 'primario' : 'secundario'}
              onClick={() => setDecision(valor)}
              style={{ minHeight: 40 }}
              aria-pressed={decision === valor}
            >
              {etiqueta}
            </Button>
          ))}
        </div>
        {errores.decision && (
          <p role="alert" style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--error)' }}>{errores.decision}</p>
        )}
      </fieldset>

      <Textarea
        etiqueta="Justificación"
        rows={2}
        ayuda="Por qué aplica o por qué no, en este cliente. Obligatoria en cuanto decides."
        value={justificacion}
        error={errores.justificacion}
        onChange={(e) => setJustificacion(e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Select
          etiqueta="Responsable"
          ayuda="De la firma, entre quienes llevan este cliente."
          marcador="Sin asignar"
          value={responsableId}
          onChange={(e) => setResponsableId(e.target.value)}
        >
          {equipo.filter((m) => m.usuario).map((m) => (
            <option key={m.usuario_id} value={m.usuario_id}>{m.usuario?.nombre}</option>
          ))}
          {inicial?.responsable && !equipo.some((m) => m.usuario_id === inicial.responsable_id) && (
            <option value={inicial.responsable.id}>{inicial.responsable.nombre}</option>
          )}
        </Select>

        <Select
          etiqueta="Frecuencia de verificación"
          ayuda="Una cadencia, no un vencimiento."
          marcador="Sin definir"
          value={frecuencia}
          onChange={(e) => setFrecuencia(e.target.value)}
        >
          {FRECUENCIAS.map((f) => (
            <option key={f.valor} value={f.valor}>{f.etiqueta}</option>
          ))}
        </Select>
      </div>

      <Select
        etiqueta="Control del SGI que la cubre"
        ayuda="El documento del sistema de gestión del cliente."
        marcador={documentos.length === 0 ? 'El cliente no tiene documentos capturados' : 'Ninguno'}
        value={documentoId}
        onChange={(e) => setDocumentoId(e.target.value)}
      >
        {documentos.map((d) => (
          <option key={d.id} value={d.id}>{d.codigo} · {d.titulo}</option>
        ))}
      </Select>

      <Textarea
        etiqueta="Evidencia esperada"
        rows={2}
        ayuda="Qué registro demuestra que se cumple."
        value={evidencia}
        onChange={(e) => setEvidencia(e.target.value)}
      />
    </form>
  )
}
