'use client'

import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { useEnLinea, useResumenCola, useSubidasPendientes } from '@/lib/offline/estado'
import { sincronizarAdjuntos } from '@/lib/offline/adjuntos'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import { listarAlcanceNormas, type AuditoriaEnLista } from '@/lib/queries/auditorias'
import {
  crearHallazgo,
  listarHallazgos,
  siguienteConsecutivo,
  type ContextoHallazgo,
  type DatosHallazgo,
  type HallazgoConContexto,
} from '@/lib/queries/hallazgos'
import { adjuntar, listarAdjuntos, type Adjunto } from '@/lib/queries/adjuntos'
import {
  listarItems,
  registrarEvaluacion,
  type ItemConContexto,
} from '@/lib/queries/verificacion'
import { faltaPorPrecargar, precargarAuditoria, piezasDeLaPrecarga } from '@/lib/auditorias/precarga'
import { VEREDICTOS_ITEM } from '@/lib/auditorias/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { normalizar } from '@/lib/utils/texto'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'
import Textarea from '@/components/ui/Textarea'
import Modal from '@/components/ui/Modal'
import GrabadoraNota from './GrabadoraNota'
import FormularioHallazgo from './FormularioHallazgo'

/** 25 MB — el tope del bucket `evidencias`. */
const TAMANO_MAXIMO = 25 * 1024 * 1024

/** Los cuatro que se pulsan en el piso. `pendiente` es volver atrás, no un juicio. */
const VEREDICTOS_DE_CAMPO = VEREDICTOS_ITEM.filter((v) => v.valor !== 'pendiente')

type Filtro = 'pendientes' | 'todos' | 'hallazgos'

/**
 * **El recorrido en planta** [F03·B3] — el bloque donde el proyecto se gana o se
 * pierde.
 *
 * Todo lo de esta pantalla está decidido por una escena concreta: un auditor
 * caminando por un almacén **sin señal**, con el teléfono en una mano y la lista
 * de verificación en la otra. De ahí salen las cuatro reglas que la gobiernan:
 *
 * 1. **Se precarga antes de salir.** La caché sólo tiene lo que alguien ya
 *    abrió; sin el botón de arriba, en modo avión esta pantalla sale vacía y no
 *    es que se hayan perdido los datos, es que nunca se bajaron (§8.11).
 * 2. **Un pulgar, sin mirar.** Los veredictos son botones de 44px en una fila,
 *    no un desplegable. Un `<select>` en un teléfono abre la rueda del sistema y
 *    obliga a la segunda mano.
 * 3. **El contador de pendientes es PERMANENTE aquí.** En la Navbar el indicador
 *    sólo aparece cuando tiene algo que decir —uno permanente se deja de mirar—,
 *    pero en el recorrido es al revés: es la única prueba de que las tres horas
 *    de trabajo siguen ahí, y el auditor lo mira cada pocos minutos.
 * 4. **Nada de `useState` con los datos.** La caché es la fuente de verdad; lo
 *    único que vive en estado local es qué fila está abierta y el texto que se
 *    está tecleando ahora mismo.
 */
export default function PanelRecorrido({ auditoria }: { auditoria: AuditoriaEnLista }) {
  const auditoriaId = auditoria.id
  const orgId = auditoria.org_id

  const cliente = useQueryClient()
  const enLinea = useEnLinea()
  const cola = useResumenCola()
  const subidas = useSubidasPendientes()

  const [filtro, setFiltro] = useState<Filtro>('pendientes')
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [ocupados, setOcupados] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  /** Desde qué punto se está levantando un hallazgo, si se está levantando uno. */
  const [levantando, setLevantando] = useState<ItemConContexto | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [levantado, setLevantado] = useState<string | null>(null)

  const [precargando, setPrecargando] = useState(false)
  const [pasoPrecarga, setPasoPrecarga] = useState('')
  /**
   * ⚠️ Esto guarda **por qué falló** la última descarga, no si está lista. Lo
   * segundo se pregunta a la caché (`faltaPorPrecargar`), que es lo único que se
   * persiste: con un booleano aquí, salir de la pestaña y volver diría «descarga
   * antes de entrar» con todo bajado.
   */
  const [fallos, setFallos] = useState<{ etiqueta: string; motivo: string }[]>([])

  const clave = queryKeys.auditorias.items(auditoriaId)

  const { data: items = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarItems(auditoriaId),
  })

  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  // Se leen de la caché —los precargó el botón de arriba— para poder componer el
  // consecutivo del siguiente hallazgo sin preguntarle a nadie.
  const { data: hallazgos = [] } = useQuery({
    queryKey: queryKeys.auditorias.hallazgos(auditoriaId),
    queryFn: () => listarHallazgos(auditoriaId),
  })

  const { data: alcance = [] } = useQuery({
    queryKey: queryKeys.auditorias.alcanceNormas(auditoriaId),
    queryFn: () => listarAlcanceNormas(auditoriaId),
  })

  const total = piezasDeLaPrecarga(auditoriaId, orgId).length
  // Se recalcula en cada render a propósito: es una lectura de la caché, no una
  // consulta, y tiene que reflejar lo que haya AHORA — no lo que había al montar.
  const faltan = faltaPorPrecargar(cliente, auditoriaId, orgId)
  const listaParaCampo = faltan.length === 0
  const evaluados = items.filter((i) => i.veredicto !== 'pendiente').length
  const conHallazgo = items.filter(
    (i) => i.veredicto === 'no_conforme' || i.veredicto === 'observacion',
  ).length

  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    return items.filter((i) => {
      if (filtro === 'pendientes' && i.veredicto !== 'pendiente') return false
      if (filtro === 'hallazgos' && i.veredicto !== 'no_conforme' && i.veredicto !== 'observacion') return false
      if (!aguja) return true
      return (
        normalizar(i.pregunta).includes(aguja) ||
        normalizar(i.clausula?.numero ?? '').includes(aguja) ||
        normalizar(i.proceso?.nombre ?? '').includes(aguja)
      )
    })
  }, [items, filtro, texto])

  function marcarOcupado(id: string, valor: boolean) {
    setOcupados((previo) => {
      const copia = new Set(previo)
      if (valor) copia.add(id)
      else copia.delete(id)
      return copia
    })
  }

  async function precargar() {
    setPrecargando(true)
    setError(null)

    try {
      const resultado = await precargarAuditoria(
        cliente,
        auditoriaId,
        orgId,
        (etiqueta) => setPasoPrecarga(etiqueta),
      )
      setFallos(resultado.fallos)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setPrecargando(false)
      setPasoPrecarga('')
    }
  }

  async function evaluar(item: ItemConContexto, veredicto: string) {
    marcarOcupado(item.id, true)
    setError(null)

    try {
      const { fila, encolado } = await registrarEvaluacion(
        item,
        { veredicto, nota: item.nota },
        usuario?.id ?? null,
      )
      aplicarEscritura<ItemConContexto>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.map((i) => (i.id === fila.id ? fila : i)),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      marcarOcupado(item.id, false)
    }
  }

  async function guardarNota(item: ItemConContexto, nota: string) {
    const limpia = nota.trim() === '' ? null : nota
    if (limpia === item.nota) return

    marcarOcupado(item.id, true)
    setError(null)

    try {
      const { fila, encolado } = await registrarEvaluacion(
        item,
        { veredicto: item.veredicto, nota: limpia },
        usuario?.id ?? null,
      )
      aplicarEscritura<ItemConContexto>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.map((i) => (i.id === fila.id ? fila : i)),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      marcarOcupado(item.id, false)
    }
  }

  async function adjuntarAlPunto(item: ItemConContexto, archivo: File) {
    if (archivo.size > TAMANO_MAXIMO) {
      setError(
        `«${archivo.name}» pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el tope son 25 MB. ` +
        'Bájale la resolución a la cámara y vuelve a tomarla.',
      )
      return
    }

    marcarOcupado(item.id, true)
    setError(null)

    try {
      const { fila, encolado } = await adjuntar({
        orgId,
        destino: { item_id: item.id },
        archivo,
        titulo: null,
      })

      aplicarEscritura<Adjunto>({
        cliente,
        clave: queryKeys.adjuntos.de('item_id', item.id),
        encolado,
        actualizar: (previo) => [fila, ...previo.filter((a) => a.id !== fila.id)],
      })

      // ⚠️ **Se ESPERA.** `adjuntar()` sólo encoló el binario; quien lo sube es
      // esto, y refrescar antes de que termine es el «hay que subirla dos veces»
      // de JDM Built (docs/03 §8.8, regla 4). Sin señal ni se intenta: la foto
      // está a salvo en el teléfono y sube al salir de la planta.
      if (enLinea) await sincronizarAdjuntos()
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      marcarOcupado(item.id, false)
    }
  }

  /**
   * Levantar un hallazgo desde el punto que se está mirando.
   *
   * ⚠️ **Se hace aquí y no en la pestaña de hallazgos**, y no es duplicación por
   * pereza: el auditor está a media nave, con el pulgar en esta lista. Mandarlo a
   * otra pestaña le hace perder el sitio del recorrido y volver a buscarlo entre
   * sesenta puntos. Al guardar se queda donde está y se le dice el folio.
   */
  async function levantarHallazgo(
    datos: DatosHallazgo,
    _motivo: string | null,
    contexto: ContextoHallazgo,
  ) {
    if (!levantando) return

    setGuardando(true)
    setError(null)

    try {
      const { fila, encolado } = await crearHallazgo({
        auditoriaId,
        orgId,
        itemId: levantando.id,
        // Sobre la caché: en la planta no hay a quién preguntarle el número. Si
        // otro auditor ya lo usó, la base renumera al llegar.
        consecutivo: siguienteConsecutivo(hallazgos),
        folioAuditoria: auditoria.folio,
        datos,
        contexto,
      })

      aplicarEscritura<HallazgoConContexto>({
        cliente,
        clave: queryKeys.auditorias.hallazgos(auditoriaId),
        encolado,
        actualizar: (previo) => [...previo, fila].sort((a, b) => a.consecutivo - b.consecutivo),
      })
      if (!encolado) {
        void cliente.invalidateQueries({ queryKey: queryKeys.auditorias.hallazgosDeLaCartera() })
      }

      setLevantado(fila.folio || `H-${fila.consecutivo}`)
      setLevantando(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
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
            <strong>Lista para trabajar sin señal.</strong> Las {total} piezas de esta auditoría
            están en el teléfono: la lista, la agenda, las cláusulas, los procesos y los documentos
            del cliente. Ya puedes poner el modo avión.
          </Aviso>
        ) : (
          <Aviso tono={fallos.length > 0 ? 'advertencia' : 'info'}>
            <strong>
              {fallos.length > 0
                ? `Bajaron ${total - faltan.length} de ${total}. No entres a la planta todavía.`
                : 'Antes de entrar, descarga la auditoría.'}
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
            <span aria-live="polite" style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
              {pasoPrecarga}…
            </span>
          )}

          {!enLinea && !listaParaCampo && (
            <span style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
              Sin señal no se puede descargar. Si ya lo hiciste antes de salir, sigue trabajando.
            </span>
          )}
        </div>
      </div>

      {/* ── El contador. Permanente aquí, a diferencia de la Navbar ──────── */}
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
          {evaluados} de {items.length} evaluados
          {conHallazgo > 0 && (
            <span style={{ fontWeight: 500, color: 'var(--texto-dim)' }}>
              {' '}· {conHallazgo} con algo que levantar
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

      {/* ── Filtros: tres, y del tamaño del pulgar ───────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {([
          ['pendientes', `Me faltan (${items.length - evaluados})`],
          ['hallazgos', `Con hallazgo (${conHallazgo})`],
          ['todos', `Todos (${items.length})`],
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
          placeholder="Cláusula, pregunta o proceso"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>

      {levantado && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="exito">
            Hallazgo <strong>{levantado}</strong> levantado. Sigue en la lista donde estabas.
          </Aviso>
        </div>
      )}

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={
            items.length === 0
              ? 'Esta auditoría no tiene lista de verificación'
              : filtro === 'pendientes'
                ? 'No te falta ninguno'
                : 'Nada con ese filtro'
          }
          descripcion={
            items.length === 0
              ? 'Se genera desde las normas del alcance, en la pestaña Lista de verificación. Hazlo con señal, antes de venir.'
              : filtro === 'pendientes'
                ? 'Recorriste la lista entera. Revisa los que tienen algo que levantar antes de la reunión de cierre.'
                : 'Prueba con otro filtro o con otro texto.'
          }
        />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {visibles.map((item) => (
            <PuntoDelRecorrido
              key={item.id}
              item={item}
              orgId={orgId}
              abierto={abierto === item.id}
              ocupado={ocupados.has(item.id)}
              alAbrir={() => setAbierto(abierto === item.id ? null : item.id)}
              alEvaluar={(veredicto) => evaluar(item, veredicto)}
              alGuardarNota={(nota) => guardarNota(item, nota)}
              alAdjuntar={(archivo) => adjuntarAlPunto(item, archivo)}
              hallazgosDelPunto={hallazgos.filter((h) => h.item_id === item.id).length}
              alLevantar={() => { setError(null); setLevantado(null); setLevantando(item) }}
            />
          ))}
        </ul>
      )}

      <Modal
        abierto={levantando !== null}
        alCerrar={() => setLevantando(null)}
        titulo={levantando ? `Hallazgo sobre ${levantando.clausula?.numero ?? 'este punto'}` : ''}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setLevantando(null)}>Cancelar</Button>
            <Button variante="primario" type="submit" form="form-hallazgo-campo" cargando={guardando}>
              Levantar
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {levantando && (
          <FormularioHallazgo
            id="form-hallazgo-campo"
            orgId={orgId}
            normasDelAlcance={alcance.map((a) => a.norma_id)}
            // Nace del punto que se está mirando: llega con su cláusula y su
            // proceso puestos. Es medio formulario menos con el pulgar.
            clausulaSugerida={levantando.clausula_id}
            procesoSugerido={levantando.proceso_id}
            alEnviar={levantarHallazgo}
          />
        )}
      </Modal>
    </div>
  )
}

/**
 * Una fila del recorrido.
 *
 * ⚠️ El texto de la nota **sí** vive en un `useState` local, y no contradice la
 * regla 2 del offline: no es el dato, es lo que se está tecleando. Se guarda al
 * salir del campo, y lo guardado vuelve a salir de la caché. Copiar `item.nota`
 * al estado y quedarse con esa copia sería lo prohibido.
 */
function PuntoDelRecorrido({
  item,
  orgId,
  abierto,
  ocupado,
  hallazgosDelPunto,
  alAbrir,
  alEvaluar,
  alGuardarNota,
  alAdjuntar,
  alLevantar,
}: {
  item: ItemConContexto
  orgId: string
  abierto: boolean
  ocupado: boolean
  hallazgosDelPunto: number
  alAbrir: () => void
  alEvaluar: (veredicto: string) => void
  alGuardarNota: (nota: string) => void
  alAdjuntar: (archivo: File) => void
  alLevantar: () => void
}) {
  const camara = useRef<HTMLInputElement>(null)
  const [borrador, setBorrador] = useState(item.nota ?? '')
  const subidas = useSubidasPendientes()

  const { data: adjuntos = [] } = useQuery({
    queryKey: queryKeys.adjuntos.de('item_id', item.id),
    queryFn: () => listarAdjuntos(orgId, { item_id: item.id }),
    enabled: abierto,
  })

  const pendientes = adjuntos.filter((a) => subidas.some((s) => s.id === a.id)).length

  return (
    <li style={{ borderBottom: '2px solid rgba(61, 186, 78, .16)' }}>
      <button
        type="button"
        onClick={alAbrir}
        aria-expanded={abierto}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          // 56px: una fila que se acierta con el pulgar caminando.
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
            {item.clausula && (
              <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                {item.clausula.numero}
              </span>
            )}
            {item.pregunta}
          </span>
          <span
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginTop: 2,
              fontSize: 13,
              color: 'var(--texto-dim)',
            }}
          >
            {item.proceso && <span>{item.proceso.nombre}</span>}
            {item.nota && <span>Con nota</span>}
            {hallazgosDelPunto > 0 && (
              <span>{hallazgosDelPunto} hallazgo{hallazgosDelPunto === 1 ? '' : 's'}</span>
            )}
          </span>
        </span>

        {item.veredicto !== 'pendiente' && (
          <Badge tono={tonoDe(VEREDICTOS_ITEM, item.veredicto)}>
            {etiquetaDe(VEREDICTOS_ITEM, item.veredicto)}
          </Badge>
        )}
      </button>

      {abierto && (
        <div style={{ padding: '4px 2px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {item.clausula?.resumen && (
            <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--texto-dim)', margin: 0 }}>
              {item.clausula.resumen}
            </p>
          )}

          {/* Los cuatro veredictos, en una fila y de 44px. Sin desplegable: en un
              teléfono abre la rueda del sistema y pide la segunda mano. */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {VEREDICTOS_DE_CAMPO.map((opcion) => (
              <Button
                key={opcion.valor}
                variante={item.veredicto === opcion.valor ? 'primario' : 'secundario'}
                onClick={() => alEvaluar(opcion.valor)}
                disabled={ocupado}
                style={{ minHeight: 44, flex: '1 1 120px' }}
              >
                {opcion.etiqueta}
              </Button>
            ))}
            {item.veredicto !== 'pendiente' && (
              <Button
                variante="fantasma"
                onClick={() => alEvaluar('pendiente')}
                disabled={ocupado}
                style={{ minHeight: 44 }}
              >
                Deshacer
              </Button>
            )}
          </div>

          <Textarea
            etiqueta="Nota"
            rows={3}
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            onBlur={() => alGuardarNota(borrador)}
            ayuda="Qué se vio, dónde y cuándo. Se guarda al salir del campo."
          />

          <GrabadoraNota alGrabar={alAdjuntar} ocupada={ocupado} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input
              ref={camara}
              type="file"
              accept="image/*"
              // `capture` abre la cámara trasera directamente en el teléfono, sin
              // pasar por el carrete. En escritorio el navegador lo ignora.
              capture="environment"
              style={{ display: 'none' }}
              onChange={(evento) => {
                const archivo = evento.target.files?.[0]
                if (camara.current) camara.current.value = ''
                if (archivo) alAdjuntar(archivo)
              }}
            />
            <Button
              variante="secundario"
              onClick={() => camara.current?.click()}
              disabled={ocupado}
              style={{ minHeight: 44 }}
            >
              Tomar foto
            </Button>

            {/* ⚠️ Se ofrece SIEMPRE, no sólo tras marcar «no conforme». En el
                piso el orden real es al revés más veces de las que parece: se ve
                algo, se levanta, y el veredicto del punto se ajusta después. */}
            <Button
              variante={
                item.veredicto === 'no_conforme' || item.veredicto === 'observacion'
                  ? 'primario'
                  : 'fantasma'
              }
              onClick={alLevantar}
              disabled={ocupado}
              style={{ minHeight: 44 }}
            >
              Levantar hallazgo
            </Button>

            <span style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
              {adjuntos.length === 0
                ? 'Sin evidencia todavía'
                : `${adjuntos.length} archivo${adjuntos.length === 1 ? '' : 's'}`}
              {pendientes > 0 && ` · ${pendientes} en el teléfono, sube al salir`}
            </span>
          </div>

          {adjuntos.length > 0 && (
            // ⚠️ Se enseña el nombre y NO se ofrece abrirlos: el bucket es
            // privado y la URL se firma en el servidor, así que en la planta ese
            // botón no haría nada. Decirlo es mejor que un botón muerto.
            <p style={{ fontSize: 12, color: 'var(--texto-dim)', margin: 0, lineHeight: 1.5 }}>
              {adjuntos.map((a) => a.nombre).join(' · ')}
              <br />
              Las fotos ya subidas se ven desde la pestaña del hallazgo, con señal.
            </p>
          )}
        </div>
      )}
    </li>
  )
}
