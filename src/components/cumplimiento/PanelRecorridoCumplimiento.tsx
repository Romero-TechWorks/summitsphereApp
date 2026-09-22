'use client'

import { useId, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { useEnLinea, useResumenCola, useSubidasPendientes } from '@/lib/offline/estado'
import { sincronizarAdjuntos } from '@/lib/offline/adjuntos'
import { normalizar } from '@/lib/utils/texto'
import { formatDate } from '@/lib/utils/dates'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import { adjuntar, type Adjunto } from '@/lib/queries/adjuntos'
import {
  copiarAlArea,
  listarAdjuntosDeObligaciones,
  listarAreas,
  listarObligaciones,
  registrarEvaluacion,
  type ObligacionConContexto,
  type SitioArea,
} from '@/lib/queries/obligaciones'
import {
  ESTADOS_CUMPLIMIENTO,
  VEREDICTOS_DE_CAMPO,
  criterioDe,
} from '@/lib/cumplimiento/catalogos'
import {
  faltaPorPrecargarRecorrido,
  piezasDelRecorrido,
  precargarRecorrido,
} from '@/lib/cumplimiento/precarga'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'
import Textarea from '@/components/ui/Textarea'
import SelectorSitio, { SIN_SITIO, enElSitio, useSitioSeleccionado } from './SelectorSitio'

/** 25 MB — el tope del bucket `evidencias`. */
const TAMANO_MAXIMO = 25 * 1024 * 1024

/** Qué parte del sitio se está caminando. */
const TODO_EL_SITIO = ''

type Filtro = 'pendientes' | 'incumplimientos' | 'todas'

/**
 * **El recorrido de cumplimiento** [F05·B1] — la pantalla de campo.
 *
 * ⚠️ **`B1` es trabajo de campo, no de escritorio** (docs/13 §3.4): el formato
 * real de Summit no evalúa numerales, evalúa ELEMENTOS —«Extintores»,
 * «Carpeta normativa»— caminando el sitio área por área. Es la misma escena que
 * el recorrido de una auditoría, y hereda sus cuatro reglas:
 *
 * 1. **Se precarga antes de salir.** Sin eso, en modo avión sale vacía.
 * 2. **Un pulgar, sin mirar**: veredictos de 44px en fila, no un desplegable.
 * 3. **El contador de pendientes es PERMANENTE aquí**, al revés que la Navbar.
 * 4. **Nada de `useState` con los datos**: sitio, área y filtro son filtros en
 *    memoria sobre la caché.
 *
 * ⚠️ **Sólo se caminan las obligaciones que APLICAN.** Lo que no se ha decidido
 * no se puede evaluar —la base lo rechaza—, y eso se decide en la Matriz, con
 * justificación, en la oficina.
 */
export default function PanelRecorridoCumplimiento({ orgId }: { orgId: string }) {
  const cliente = useQueryClient()
  const enLinea = useEnLinea()
  const cola = useResumenCola()
  const subidas = useSubidasPendientes()
  const { sitioId, sitios, elegir } = useSitioSeleccionado(orgId)

  const [areaId, setAreaId] = useState(TODO_EL_SITIO)
  const [filtro, setFiltro] = useState<Filtro>('pendientes')
  const [texto, setTexto] = useState('')
  const [abierta, setAbierta] = useState<string | null>(null)
  const [ocupadas, setOcupadas] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [precargando, setPrecargando] = useState(false)
  const [pasoPrecarga, setPasoPrecarga] = useState('')
  /** Por qué falló la última descarga. Si está lista se pregunta a la caché. */
  const [fallos, setFallos] = useState<{ etiqueta: string; motivo: string }[]>([])

  const clave = queryKeys.cumplimiento.obligaciones(orgId)
  const claveAdjuntos = queryKeys.cumplimiento.adjuntos(orgId)

  const { data: obligaciones = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarObligaciones(orgId),
  })
  const { data: areas = [] } = useQuery({
    queryKey: queryKeys.cumplimiento.areas(orgId),
    queryFn: () => listarAreas(orgId),
  })
  const { data: adjuntos = [] } = useQuery({
    queryKey: claveAdjuntos,
    queryFn: () => listarAdjuntosDeObligaciones(orgId),
  })
  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  const total = piezasDelRecorrido(orgId).length
  // Se recalcula en cada render: es una lectura de la caché, no una consulta.
  const faltan = faltaPorPrecargarRecorrido(cliente, orgId)
  const listaParaCampo = faltan.length === 0

  const areasDelSitio = areas.filter((a) => a.sitio_id === sitioId && a.activa)
  const area = areasDelSitio.find((a) => a.id === areaId) ?? null
  // Un área que ya no está (se cambió de sitio, se dio de baja) cae en «todo».
  const areaEfectiva = area ? area.id : TODO_EL_SITIO

  const delSitio = obligaciones.filter((o) => sitioId !== '' && enElSitio(o.sitio_id, sitioId))
  const aplicables = delSitio.filter((o) => o.aplica === true)
  const sinDecidir = delSitio.filter((o) => o.aplica === null).length

  /**
   * Lo que se camina en esta parada.
   *
   * En un área: sus obligaciones, más las de todo el sitio que **todavía no
   * tienen copia en esta área** — son las que el consultor puede decidir evaluar
   * aquí con «Evaluar en esta área». En «todo el sitio»: todas.
   */
  const copiadas = new Set(
    area
      ? aplicables.filter((o) => o.area_id === area.id && o.nom_requisito_id).map((o) => o.nom_requisito_id)
      : [],
  )
  const deLaParada = !area
    ? aplicables
    : aplicables.filter(
        (o) =>
          o.area_id === area.id ||
          (o.area_id === null && !(o.nom_requisito_id && copiadas.has(o.nom_requisito_id))),
      )

  const evaluadas = deLaParada.filter((o) => o.estado_cumplimiento !== 'sin_evaluar').length
  const incumplimientos = deLaParada.filter(
    (o) => o.estado_cumplimiento === 'no_cumple' || o.estado_cumplimiento === 'parcial',
  ).length

  const aguja = normalizar(texto)
  const visibles = deLaParada.filter((o) => {
    if (filtro === 'pendientes' && o.estado_cumplimiento !== 'sin_evaluar') return false
    if (filtro === 'incumplimientos' && o.estado_cumplimiento !== 'no_cumple' && o.estado_cumplimiento !== 'parcial') return false
    if (!aguja) return true
    return [o.elemento, o.obligacion, o.nom?.clave, o.requisito?.numeral]
      .some((v) => normalizar(v ?? '').includes(aguja))
  })

  function marcarOcupada(id: string, valor: boolean) {
    setOcupadas((previo) => {
      const copia = new Set(previo)
      if (valor) copia.add(id)
      else copia.delete(id)
      return copia
    })
  }

  function reemplazar(fila: ObligacionConContexto, encolado: boolean) {
    aplicarEscritura<ObligacionConContexto>({
      cliente, clave, encolado,
      actualizar: (p) => (p.some((o) => o.id === fila.id) ? p.map((o) => (o.id === fila.id ? fila : o)) : [...p, fila]),
    })
  }

  async function precargar() {
    setPrecargando(true)
    setError(null)
    try {
      const resultado = await precargarRecorrido(cliente, orgId, setPasoPrecarga)
      setFallos(resultado.fallos)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setPrecargando(false)
      setPasoPrecarga('')
    }
  }

  async function evaluar(o: ObligacionConContexto, estado: string, observacion: string | null) {
    marcarOcupada(o.id, true)
    setError(null)
    try {
      const { fila, encolado } = await registrarEvaluacion(o, { estado, observacion }, usuario?.id ?? null)
      reemplazar(fila, encolado)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      marcarOcupada(o.id, false)
    }
  }

  async function evaluarAqui(o: ObligacionConContexto, destino: SitioArea) {
    marcarOcupada(o.id, true)
    setError(null)
    try {
      const { fila, encolado } = await copiarAlArea(o, destino)
      reemplazar(fila, encolado)
      setAbierta(fila.id)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      marcarOcupada(o.id, false)
    }
  }

  async function tomarFoto(o: ObligacionConContexto, archivo: File) {
    if (archivo.size > TAMANO_MAXIMO) {
      setError(
        `«${archivo.name}» pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el tope son 25 MB. ` +
        'Bájale la resolución a la cámara y vuelve a tomarla.',
      )
      return
    }
    marcarOcupada(o.id, true)
    setError(null)
    try {
      const { fila, encolado } = await adjuntar({
        orgId,
        destino: { obligacion_id: o.id },
        archivo,
        titulo: null,
      })
      aplicarEscritura<Adjunto>({
        cliente,
        clave: claveAdjuntos,
        encolado,
        actualizar: (p) => [fila, ...p.filter((a) => a.id !== fila.id)],
      })
      // ⚠️ Se ESPERA: refrescar antes de que suba es el «hay que subirla dos
      // veces» (docs/03 §8.8). Sin señal ni se intenta; sube al salir.
      if (enLinea) await sincronizarAdjuntos()
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      marcarOcupada(o.id, false)
    }
  }

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} alto={56} radio={4} />)}
      </div>
    )
  }

  return (
    <div>
      {/* ── La precarga: lo que se pulsa en el estacionamiento ───────────── */}
      <div style={{ marginBottom: 16 }}>
        {listaParaCampo ? (
          <Aviso tono="exito">
            <strong>Listo para trabajar sin señal.</strong> Las {total} piezas de este cliente están en el
            teléfono: la matriz de todos sus sitios, las áreas, la biblioteca y la evidencia previa. Ya puedes poner
            el modo avión.
          </Aviso>
        ) : (
          <Aviso tono={fallos.length > 0 ? 'advertencia' : 'info'}>
            <strong>
              {fallos.length > 0
                ? `Bajaron ${total - faltan.length} de ${total}. No entres todavía.`
                : 'Antes de entrar, descarga el cliente.'}
            </strong>{' '}
            {fallos.length > 0
              ? `Falta${faltan.length === 1 ? '' : 'n'} ${faltan.map((f) => f.toLowerCase()).join(', ')}.`
              : `Con señal se baja todo al teléfono —${total} piezas— y a partir de ahí el recorrido funciona en modo avión. Sin este paso, en la planta la pantalla sale vacía.`}
            {fallos.length > 0 && (
              <>
                <br />
                <span style={{ fontSize: 12 }}>{fallos[0].motivo}</span>
              </>
            )}
          </Aviso>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <Button
            variante={listaParaCampo ? 'secundario' : 'primario'}
            onClick={precargar}
            cargando={precargando}
            disabled={!enLinea}
            style={{ minHeight: 44 }}
          >
            {listaParaCampo ? 'Volver a descargar' : 'Descargar para trabajar sin señal'}
          </Button>
          {precargando && pasoPrecarga && (
            <span aria-live="polite" style={{ fontSize: 13, color: 'var(--texto-dim)' }}>{pasoPrecarga}…</span>
          )}
          {!enLinea && !listaParaCampo && (
            <span style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
              Sin señal no se puede descargar. Si ya lo hiciste antes de salir, sigue trabajando.
            </span>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 420, marginBottom: 12 }}>
        <SelectorSitio
          sitioId={sitioId}
          sitios={sitios}
          elegir={(id) => { elegir(id); setAreaId(TODO_EL_SITIO) }}
          permitirTodos={false}
        />
      </div>

      {sitioId === '' ? (
        <EstadoVacio
          titulo="Elige dónde vas a caminar"
          descripcion="El recorrido se hace sitio por sitio y área por área. Elige el sitio arriba."
        />
      ) : (
        <>
          {/* ── Las áreas: botones del tamaño del pulgar ─────────────────── */}
          {sitioId !== SIN_SITIO && areasDelSitio.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }} role="group" aria-label="Área">
              <Button
                variante={areaEfectiva === TODO_EL_SITIO ? 'primario' : 'secundario'}
                tamano="sm"
                onClick={() => setAreaId(TODO_EL_SITIO)}
                style={{ minHeight: 40 }}
                aria-pressed={areaEfectiva === TODO_EL_SITIO}
              >
                Todo el sitio
              </Button>
              {areasDelSitio.map((a) => (
                <Button
                  key={a.id}
                  variante={areaEfectiva === a.id ? 'primario' : 'secundario'}
                  tamano="sm"
                  onClick={() => setAreaId(a.id)}
                  style={{ minHeight: 40 }}
                  aria-pressed={areaEfectiva === a.id}
                >
                  {a.nombre}
                </Button>
              ))}
            </div>
          )}

          {/* ── El contador. Permanente aquí ─────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              padding: '10px 0',
              borderBottom: '2px solid rgba(61, 186, 78, .16)',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--texto)' }}>
              {evaluadas} de {deLaParada.length} evaluadas
              {incumplimientos > 0 && (
                <span style={{ fontWeight: 500, color: 'var(--texto-dim)' }}>
                  {' '}· {incumplimientos} con incumplimiento
                </span>
              )}
            </span>
            <span style={{ fontSize: 13, color: 'var(--texto-dim)' }} aria-live="polite">
              {enLinea ? 'Con señal' : 'Sin señal'}
              {cola.pendientes > 0 && ` · ${cola.pendientes} cambio${cola.pendientes === 1 ? '' : 's'} esperando`}
              {subidas.length > 0 && ` · ${subidas.length} archivo${subidas.length === 1 ? '' : 's'} por subir`}
              {cola.fallidos > 0 && ` · ${cola.fallidos} rechazado${cola.fallidos === 1 ? '' : 's'}`}
              {cola.pendientes === 0 && subidas.length === 0 && cola.fallidos === 0 && ' · todo guardado'}
            </span>
          </div>

          {sinDecidir > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Aviso tono="advertencia">
                {sinDecidir} obligacion{sinDecidir === 1 ? '' : 'es'} de este sitio sin decidir si aplica{sinDecidir === 1 ? '' : 'n'}.
                No salen aquí: se deciden en la pestaña Matriz, con su justificación.
              </Aviso>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {([
              ['pendientes', `Me faltan (${deLaParada.length - evaluadas})`],
              ['incumplimientos', `Con incumplimiento (${incumplimientos})`],
              ['todas', `Todas (${deLaParada.length})`],
            ] as [Filtro, string][]).map(([valor, etiqueta]) => (
              <Button
                key={valor}
                variante={filtro === valor ? 'primario' : 'fantasma'}
                tamano="sm"
                onClick={() => setFiltro(valor)}
                style={{ minHeight: 40 }}
              >
                {etiqueta}
              </Button>
            ))}
          </div>

          <div style={{ marginBottom: 12, maxWidth: 360 }}>
            <Input
              etiqueta="Buscar"
              etiquetaOculta
              placeholder="Elemento, NOM o numeral"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>

          {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

          {visibles.length === 0 ? (
            <EstadoVacio
              titulo={
                deLaParada.length === 0
                  ? 'Nada que evaluar aquí'
                  : filtro === 'pendientes'
                    ? 'No te falta ninguna'
                    : 'Nada con ese filtro'
              }
              descripcion={
                deLaParada.length === 0
                  ? 'Este sitio no tiene obligaciones que apliquen. Se generan y se deciden en la pestaña Matriz, con señal, antes de venir.'
                  : filtro === 'pendientes'
                    ? 'Recorriste todo lo de esta parada. Revisa lo que tiene incumplimiento antes de irte.'
                    : 'Prueba con otro filtro o con otro texto.'
              }
            />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {visibles.map((o) => (
                <ElementoDelRecorrido
                  key={o.id}
                  obligacion={o}
                  area={area}
                  nombreArea={o.area_id ? areas.find((a) => a.id === o.area_id)?.nombre ?? null : null}
                  adjuntos={adjuntos.filter((a) => a.obligacion_id === o.id)}
                  abierta={abierta === o.id}
                  ocupada={ocupadas.has(o.id)}
                  alAbrir={() => setAbierta(abierta === o.id ? null : o.id)}
                  alEvaluar={(estado, observacion) => evaluar(o, estado, observacion)}
                  alEvaluarAqui={(destino) => evaluarAqui(o, destino)}
                  alTomarFoto={(archivo) => tomarFoto(o, archivo)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Un elemento del recorrido.
 *
 * ⚠️ El texto de la observación vive en un `useState` local y no contradice la
 * regla 2 del offline: es lo que se está tecleando, no el dato. Lo guardado
 * vuelve a salir de la caché.
 *
 * ⚠️ **«Parcial» no se guarda sin observación**, y aquí se resuelve antes de que
 * la base lo rechace: pulsarlo con la observación vacía pide el motivo en vez de
 * mandar una escritura que la cola marcaría como rechazada media hora después.
 */
function ElementoDelRecorrido({
  obligacion: o,
  area,
  nombreArea,
  adjuntos,
  abierta,
  ocupada,
  alAbrir,
  alEvaluar,
  alEvaluarAqui,
  alTomarFoto,
}: {
  obligacion: ObligacionConContexto
  /** El área que se está caminando, si es una. */
  area: SitioArea | null
  nombreArea: string | null
  adjuntos: Adjunto[]
  abierta: boolean
  ocupada: boolean
  alAbrir: () => void
  alEvaluar: (estado: string, observacion: string | null) => void
  alEvaluarAqui: (destino: SitioArea) => void
  alTomarFoto: (archivo: File) => void
}) {
  const camara = useRef<HTMLInputElement>(null)
  const idObservacion = useId()
  const subidas = useSubidasPendientes()
  const [borrador, setBorrador] = useState(o.observacion ?? '')
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false)
  /** El veredicto cuya ayuda se enseña: el que se acaba de pulsar o el que tiene. */
  const [consultado, setConsultado] = useState<string | null>(null)

  const deTodoElSitio = area !== null && o.area_id === null
  const pendientes = adjuntos.filter((a) => subidas.some((s) => s.id === a.id)).length
  const criterio = criterioDe(consultado ?? o.estado_cumplimiento)

  function pulsar(estado: string) {
    setConsultado(estado)
    const limpia = borrador.trim()
    if (estado === 'parcial' && limpia === '') {
      setPidiendoMotivo(true)
      document.getElementById(idObservacion)?.focus()
      return
    }
    setPidiendoMotivo(false)
    alEvaluar(estado, limpia === '' ? null : borrador)
  }

  function guardarObservacion() {
    const limpia = borrador.trim()
    if (pidiendoMotivo) {
      if (limpia === '') return
      setPidiendoMotivo(false)
      alEvaluar('parcial', borrador)
      return
    }
    // ⚠️ Sin veredicto todavía, la observación NO se manda al salir del campo:
    // viaja con el veredicto. Si se mandara aquí, el `blur` dispararía una
    // escritura justo antes del toque en el botón, lo deshabilitaría y el toque
    // se perdería — y es el orden natural en el piso: escribir, luego juzgar.
    if (o.estado_cumplimiento === 'sin_evaluar') return
    const nueva = limpia === '' ? null : borrador
    if (nueva === o.observacion) return
    // Un parcial no se queda sin motivo: borrar la observación no se manda.
    if (o.estado_cumplimiento === 'parcial' && nueva === null) return
    alEvaluar(o.estado_cumplimiento, nueva)
  }

  return (
    <li style={{ borderBottom: '2px solid rgba(61, 186, 78, .16)' }}>
      <button
        type="button"
        onClick={alAbrir}
        aria-expanded={abierta}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          minHeight: 56,
          padding: '10px 2px',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          font: 'inherit',
          color: 'inherit',
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--texto)' }}>
            {o.elemento || o.obligacion}
          </span>
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2, fontSize: 13, color: 'var(--texto-dim)' }}>
            {o.nom && (
              <span className="mono">
                {o.nom.clave}{o.requisito?.numeral ? ` ${o.requisito.numeral}` : ''}
              </span>
            )}
            {!o.nom && o.fuente && <span>{o.fuente}</span>}
            {nombreArea ? <span>{nombreArea}</span> : deTodoElSitio ? <span>De todo el sitio</span> : null}
            {o.observacion && <span>Con observación</span>}
            {adjuntos.length > 0 && <span>{adjuntos.length} foto{adjuntos.length === 1 ? '' : 's'}</span>}
          </span>
        </span>
        {o.estado_cumplimiento !== 'sin_evaluar' && (
          <Badge tono={tonoDe(ESTADOS_CUMPLIMIENTO, o.estado_cumplimiento)}>
            {etiquetaDe(ESTADOS_CUMPLIMIENTO, o.estado_cumplimiento)}
          </Badge>
        )}
      </button>

      {abierta && (
        <div style={{ padding: '4px 2px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--texto)', margin: 0 }}>{o.obligacion}</p>
          {o.evidencia_esperada && (
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--texto-dim)', margin: 0 }}>
              <strong>Evidencia:</strong> {o.evidencia_esperada}
            </p>
          )}

          {deTodoElSitio && area && (
            <Aviso tono="info">
              Este elemento es de todo el sitio. Si lo vas a revisar aquí —un extintor por área—, evalúalo en{' '}
              {area.nombre}: queda como un renglón propio y el de todo el sitio no se toca.{' '}
              <Button variante="secundario" tamano="sm" onClick={() => alEvaluarAqui(area)} disabled={ocupada}>
                Evaluar en {area.nombre}
              </Button>
            </Aviso>
          )}

          {/* Los cuatro veredictos, en fila y de 44px. */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {VEREDICTOS_DE_CAMPO.map((v) => (
              <Button
                key={v.valor}
                variante={o.estado_cumplimiento === v.valor ? 'primario' : 'secundario'}
                onClick={() => pulsar(v.valor)}
                disabled={ocupada}
                style={{ minHeight: 44, flex: '1 1 120px' }}
                aria-pressed={o.estado_cumplimiento === v.valor}
              >
                {v.etiqueta}
              </Button>
            ))}
            {o.estado_cumplimiento !== 'sin_evaluar' && (
              <Button
                variante="fantasma"
                onClick={() => { setConsultado(null); setPidiendoMotivo(false); alEvaluar('sin_evaluar', o.observacion) }}
                disabled={ocupada}
                style={{ minHeight: 44 }}
              >
                Deshacer
              </Button>
            )}
          </div>

          {/* ⚠️ La ayuda se pinta al elegir, no en un manual: es lo que hace que
              dos consultores evalúen igual. */}
          {criterio && (
            <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--texto-dim)', margin: 0 }}>{criterio}</p>
          )}

          <Textarea
            id={idObservacion}
            etiqueta="Observación"
            rows={3}
            value={borrador}
            error={pidiendoMotivo ? 'Escribe qué falta. Al salir del campo se guarda como «parcial».' : null}
            onChange={(e) => setBorrador(e.target.value)}
            onBlur={guardarObservacion}
            ayuda={
              o.estado_cumplimiento === 'sin_evaluar'
                ? 'Qué se vio y dónde. Se guarda junto con el veredicto.'
                : 'Qué se vio y dónde. Se guarda al salir del campo.'
            }
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input
              ref={camara}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(evento) => {
                const archivo = evento.target.files?.[0]
                if (camara.current) camara.current.value = ''
                if (archivo) alTomarFoto(archivo)
              }}
            />
            <Button variante="secundario" onClick={() => camara.current?.click()} disabled={ocupada} style={{ minHeight: 44 }}>
              Tomar foto
            </Button>
            <span style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
              {adjuntos.length === 0 ? 'Sin evidencia todavía' : `${adjuntos.length} archivo${adjuntos.length === 1 ? '' : 's'}`}
              {pendientes > 0 && ` · ${pendientes} en el teléfono, sube al salir`}
            </span>
          </div>

          {o.evaluado_en && (
            <p style={{ fontSize: 12, color: 'var(--texto-dim)', margin: 0 }}>
              Evaluada el {formatDate(o.evaluado_en)} — la hora del teléfono, no la de sincronizar.
            </p>
          )}
        </div>
      )}
    </li>
  )
}
