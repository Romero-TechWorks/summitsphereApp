'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import {
  cambiarEstadoVersion,
  crearVersionConArchivo,
  crearVersionEscrita,
  eliminarVersion,
  guardarMarkdown,
  obtenerDocumento,
  siguienteVersion,
  urlDelArchivo,
  type DocumentoEnLista,
  type VersionConFirmas,
} from '@/lib/queries/documentos'
import { ESTADOS_VERSION, ORIGENES_MARKDOWN, TIPOS_DOCUMENTO, siguienteEstadoVersion } from '@/lib/sistemas/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import type { ResultadoConversion } from '@/lib/documentos/convertir'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import { type Pestana } from '@/components/ui/Pestanas'
import Skeleton from '@/components/ui/Skeleton'
import Textarea from '@/components/ui/Textarea'
import { IconoDocumento } from '@/components/ui/Iconos'
import PanelAdjuntos from '@/components/adjuntos/PanelAdjuntos'
import ClausulasDelDocumento from './ClausulasDelDocumento'
import SubirVersion from './SubirVersion'
import VisorMarkdown from './VisorMarkdown'

const SECCIONES: readonly Pestana[] = [
  { clave: 'texto', etiqueta: 'Texto' },
  { clave: 'versiones', etiqueta: 'Versiones' },
  { clave: 'clausulas', etiqueta: 'Cláusulas' },
  { clave: 'evidencia', etiqueta: 'Evidencia' },
]

/**
 * El expediente de un documento: su texto, su historial de versiones y las
 * cláusulas que cubre [F02·B2].
 *
 * ⚠️ **Nunca se sobrescribe una versión aprobada.** Aquí eso se ve en que el
 * botón de editar sólo aparece sobre un borrador, y en que «Nueva versión»
 * existe siempre. Quien lo impone de verdad es el trigger
 * `proteger_version_aprobada()` de la base: esta pantalla sólo evita ofrecer un
 * botón que ya está garantizado que termina en error.
 *
 * ⚠️ Las secciones NO son `<Pestanas>` de query string aquí porque la pestaña de
 * la página ya está ocupada por el dominio: se usa estado local. Es la misma
 * decisión que en `DetalleProyecto`.
 */
export default function ExpedienteDocumento({
  documento,
  orgId,
  volverHref,
}: {
  documento: DocumentoEnLista
  orgId: string
  volverHref: string
}) {
  const cliente = useQueryClient()
  const clave = queryKeys.sistemas.documento(documento.id)

  const [seccion, setSeccion] = useState('texto')
  /**
   * Qué versión se está leyendo.
   *
   * ⚠️ Por defecto **la vigente**, que es lo que alguien quiere ver al abrir un
   * documento. Pero sin esta elección explícita el texto de un borrador recién
   * creado sería inalcanzable: `version_vigente_id` sigue apuntando a la
   * aprobada, así que el consultor crearía la v2, abriría «Texto» y vería la v1
   * sin entender por qué.
   */
  const [versionElegida, setVersionElegida] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [editandoTexto, setEditandoTexto] = useState(false)
  const [borrador, setBorrador] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const { data: expediente, isPending, error: fallo } = useQuery({
    queryKey: clave,
    queryFn: () => obtenerDocumento(documento.id),
  })

  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  const versiones = expediente?.versiones ?? []
  // La que se lee: la elegida a mano, si no la vigente del documento, y si no la
  // más reciente. Nunca `undefined` sin decirlo: un documento recién dado de
  // alta no tiene ninguna, y esa pantalla tiene su propio texto.
  const actual =
    versiones.find((v) => v.id === versionElegida) ??
    versiones.find((v) => v.id === documento.version_vigente_id) ??
    versiones[0] ??
    null

  function refrescar() {
    void cliente.invalidateQueries({ queryKey: clave })
    void cliente.invalidateQueries({ queryKey: queryKeys.sistemas.documentos(orgId) })
    // ⚠️ `porAprobar()` NO cuelga de `documentos(orgId)`: son ramas hermanas, así
    // que invalidar la del cliente no la toca. Sin esta línea, aprobar una
    // versión la deja en el widget del tablero hasta que caduque sola.
    void cliente.invalidateQueries({ queryKey: queryKeys.sistemas.porAprobar() })
  }

  async function abrirOriginal(version: VersionConFirmas) {
    setError(null)
    if (!version.archivo_ruta) return

    try {
      // ⚠️ Se firma al abrir y caduca en cinco minutos. Sin señal esto falla, y
      // el motivo se dice: el bucket es privado y firmar es una llamada al
      // servidor (docs/03 §8.8, regla 1).
      window.open(await urlDelArchivo(version.archivo_ruta), '_blank', 'noopener')
    } catch (problema) {
      setError(
        `No se pudo abrir el archivo original: ${mensajeDeError(problema)}. ` +
        'Los archivos del bucket privado se firman al abrirlos, así que necesitan conexión.',
      )
    }
  }

  async function moverEstado(version: VersionConFirmas) {
    const siguiente = siguienteEstadoVersion(version.estado)
    if (!siguiente) return

    setTrabajando(true)
    setError(null)
    setAviso(null)

    try {
      const { encolado } = await cambiarEstadoVersion(
        version,
        siguiente.valor,
        usuario ? { id: usuario.id, nombre: usuario.nombre } : null,
      )

      if (encolado) {
        setAviso(
          `«${siguiente.verbo}» quedó en la cola: se manda solo al recuperar la señal. ` +
          'Quién aprobó y cuándo lo escribe el servidor, así que la firma llegará con la hora real.',
        )
      }
      refrescar()
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setTrabajando(false)
    }
  }

  async function guardarTexto() {
    if (!actual) return

    setTrabajando(true)
    setError(null)

    try {
      await guardarMarkdown(actual, borrador)
      setEditandoTexto(false)
      refrescar()
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setTrabajando(false)
    }
  }

  async function borrarBorrador(version: VersionConFirmas) {
    setTrabajando(true)
    setError(null)

    try {
      await eliminarVersion(version)
      refrescar()
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <div>
      <Link
        href={volverHref}
        style={{ display: 'inline-block', marginBottom: 12, fontSize: 13, color: 'var(--texto-dim)', textDecoration: 'none' }}
      >
        ← Documentos
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="display" style={{ fontSize: 26, marginBottom: 4 }}>
            {documento.titulo}
          </h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13, color: 'var(--texto-dim)' }}>
            <span className="mono">{documento.codigo}</span>
            <span>{etiquetaDe(TIPOS_DOCUMENTO, documento.tipo)}</span>
            {documento.proceso && <span>{documento.proceso.nombre}</span>}
            {documento.proyecto && <span>{documento.proyecto.nombre}</span>}
          </div>
        </div>

        <Button variante="primario" onClick={() => { setError(null); setSubiendo(true) }}>
          Nueva versión
        </Button>
      </div>

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
      {aviso && <div style={{ marginBottom: 12 }}><Aviso tono="info">{aviso}</Aviso></div>}

      <Secciones activa={seccion} elegir={setSeccion} />

      {isPending ? (
        <Skeleton alto={200} radio={4} />
      ) : fallo ? (
        <EstadoVacio titulo="No se pudo leer el documento" descripcion={mensajeDeError(fallo)} />
      ) : !actual ? (
        <EstadoVacio
          titulo="Este documento todavía no tiene versiones"
          descripcion="Sube el Word o el PDF del cliente y la app lo convierte a texto, o escribe la primera versión aquí mismo. El archivo original nunca se tira: es lo que un auditor externo pide."
          accion={<Button variante="primario" onClick={() => setSubiendo(true)}>Crear la versión 1</Button>}
        />
      ) : (
        <>
          {seccion === 'texto' && (
            <SeccionTexto
              version={actual}
              esVigente={actual.id === documento.version_vigente_id}
              editando={editandoTexto}
              borrador={borrador}
              trabajando={trabajando}
              alEditar={() => { setBorrador(actual.markdown ?? ''); setEditandoTexto(true) }}
              alCancelar={() => setEditandoTexto(false)}
              alEscribir={setBorrador}
              alGuardar={guardarTexto}
              alAbrirOriginal={() => abrirOriginal(actual)}
            />
          )}

          {seccion === 'versiones' && (
            <Lista etiqueta="Versiones del documento">
              {versiones.map((version) => {
                const siguiente = siguienteEstadoVersion(version.estado)
                return (
                  <Fila
                    key={version.id}
                    Icono={IconoDocumento}
                    titulo={`Versión ${version.version}`}
                    meta={
                      <>
                        {version.archivo_nombre && <span>{version.archivo_nombre}</span>}
                        <span>{etiquetaDe(ORIGENES_MARKDOWN, version.origen_markdown)}</span>
                        {version.elaboro && <span>Elaboró {version.elaboro.nombre}</span>}
                        {version.aprobo && (
                          <span>
                            Aprobó {version.aprobo.nombre}
                            {version.fecha_aprobacion ? ` el ${formatDateOnly(version.fecha_aprobacion)}` : ''}
                          </span>
                        )}
                        {version.control_cambios && <span>{version.control_cambios}</span>}
                      </>
                    }
                    derecha={
                      <>
                        <Badge tono={tonoDe(ESTADOS_VERSION, version.estado)}>
                          {etiquetaDe(ESTADOS_VERSION, version.estado)}
                        </Badge>
                        {version.markdown && (
                          <Button
                            variante="fantasma"
                            tamano="sm"
                            onClick={() => { setVersionElegida(version.id); setSeccion('texto') }}
                            title={`Leer el texto de la versión ${version.version}`}
                          >
                            Leer
                          </Button>
                        )}
                        {version.archivo_ruta && (
                          <Button variante="fantasma" tamano="sm" onClick={() => abrirOriginal(version)}>
                            Original
                          </Button>
                        )}
                        {siguiente && (
                          <Button
                            variante="secundario"
                            tamano="sm"
                            cargando={trabajando}
                            onClick={() => moverEstado(version)}
                          >
                            {siguiente.verbo}
                          </Button>
                        )}
                        {version.estado === 'borrador' && (
                          <Button
                            variante="peligro"
                            tamano="sm"
                            onClick={() => borrarBorrador(version)}
                            title={`Borrar el borrador ${version.version}`}
                          >
                            Borrar
                          </Button>
                        )}
                      </>
                    }
                  />
                )
              })}
            </Lista>
          )}

          {seccion === 'clausulas' && (
            <ClausulasDelDocumento
              documento={documento}
              vinculos={expediente?.clausulas ?? []}
              alCambiar={refrescar}
            />
          )}

          {/* ⚠️ Esto NO es el archivo original de la versión —ése vive en el
              bucket `documentos` y se abre desde la pestaña Texto—, sino lo que
              respalda al documento: el acta de la reunión donde se aprobó, la
              minuta de la revisión, la evidencia de la difusión [F02·B2b]. */}
          {seccion === 'evidencia' && (
            <PanelAdjuntos
              orgId={orgId}
              destino={{ documento_id: documento.id }}
              esSocio={usuario?.rol === 'socio'}
              ayuda="Lo que respalda al documento: el acta de aprobación, la lista de difusión, la minuta de la revisión. El archivo original de cada versión se abre desde la pestaña Texto."
            />
          )}
        </>
      )}

      <ModalNuevaVersion
        abierto={subiendo}
        alCerrar={() => setSubiendo(false)}
        documento={documento}
        versiones={versiones}
        alGuardado={(idNuevo) => {
          setSubiendo(false)
          // Se abre la versión recién creada, no la vigente: quien acaba de
          // subir un Word quiere ver cómo quedó la conversión.
          setVersionElegida(idNuevo)
          setSeccion('texto')
          refrescar()
        }}
      />
    </div>
  )
}

/**
 * Las tres secciones del expediente.
 *
 * ⚠️ En estado local y no en el query string: la URL ya lleva la pestaña del
 * dominio (`?tab=documentos`) y el documento abierto (`?documento=`). Una
 * tercera dimensión ahí dentro haría enlaces que nadie va a compartir y un botón
 * de atrás que se recorre las tres secciones antes de salir del documento.
 */
function Secciones({ activa, elegir }: { activa: string; elegir: (clave: string) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        marginBottom: 18,
        borderBottom: '2px solid rgba(61, 186, 78, .16)',
      }}
    >
      {SECCIONES.map((seccion) => (
        <button
          key={seccion.clave}
          type="button"
          onClick={() => elegir(seccion.clave)}
          aria-current={seccion.clave === activa ? 'true' : undefined}
          style={{
            position: 'relative',
            padding: '9px 2px',
            marginBottom: -2,
            fontSize: 14,
            fontWeight: seccion.clave === activa ? 600 : 500,
            color: seccion.clave === activa ? 'var(--texto)' : 'var(--texto-dim)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {seccion.etiqueta}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 2,
              borderRadius: 2,
              background:
                seccion.clave === activa
                  ? 'linear-gradient(90deg, var(--verde-hondo) 0%, var(--verde) 100%)'
                  : 'transparent',
            }}
          />
        </button>
      ))}
    </div>
  )
}

function SeccionTexto({
  version,
  esVigente,
  editando,
  borrador,
  trabajando,
  alEditar,
  alCancelar,
  alEscribir,
  alGuardar,
  alAbrirOriginal,
}: {
  version: VersionConFirmas
  /** Si es la que el documento tiene por vigente. Si no, se dice. */
  esVigente: boolean
  editando: boolean
  borrador: string
  trabajando: boolean
  alEditar: () => void
  alCancelar: () => void
  alEscribir: (texto: string) => void
  alGuardar: () => void
  alAbrirOriginal: () => void
}) {
  const editable = version.estado === 'borrador'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <Badge tono={tonoDe(ESTADOS_VERSION, version.estado)}>
          v{version.version} · {etiquetaDe(ESTADOS_VERSION, version.estado)}
        </Badge>
        <span style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
          {etiquetaDe(ORIGENES_MARKDOWN, version.origen_markdown)}
        </span>
        {/* Leer una versión que no es la vigente es legítimo —para eso se
            conserva el histórico—, pero tiene que decirlo: confundirla con la
            que está en uso es exactamente el error que el control documental
            existe para evitar. */}
        {!esVigente && (
          <span style={{ fontSize: 13, color: 'var(--advertencia)' }}>
            No es la versión vigente
          </span>
        )}

        <span style={{ flex: 1 }} />

        {version.archivo_ruta && (
          <Button variante="secundario" tamano="sm" onClick={alAbrirOriginal}>
            Abrir el original
          </Button>
        )}

        {editable && !editando && (
          <Button variante="secundario" tamano="sm" onClick={alEditar}>Editar el texto</Button>
        )}
      </div>

      {version.avisos_conversion.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <Aviso tono="advertencia">
            <strong>Lo que no sobrevivió la conversión de esta versión:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {version.avisos_conversion.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </Aviso>
        </div>
      )}

      {!editable && (
        <div style={{ marginBottom: 14 }}>
          <Aviso tono="info">
            Esta versión está {etiquetaDe(ESTADOS_VERSION, version.estado).toLowerCase()}: su texto
            ya no se toca. Para cambiar el contenido, crea la versión siguiente — la anterior queda
            consultable con su archivo original.
          </Aviso>
        </div>
      )}

      {editando ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Textarea
            etiqueta="Texto del documento"
            ayuda="Markdown: «# Título», «- viñeta», «**negrita**». El archivo original no se toca."
            rows={20}
            className="mono"
            value={borrador}
            onChange={(e) => alEscribir(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variante="fantasma" onClick={alCancelar}>Cancelar</Button>
            <Button variante="primario" cargando={trabajando} onClick={alGuardar}>Guardar el texto</Button>
          </div>
        </div>
      ) : version.markdown ? (
        <VisorMarkdown markdown={version.markdown} />
      ) : (
        <EstadoVacio
          titulo="Esta versión no tiene texto"
          descripcion="Se subió sólo el archivo original, o la conversión no encontró nada legible. El original sigue completo y se abre con el botón de arriba."
        />
      )}
    </div>
  )
}

function ModalNuevaVersion({
  abierto,
  alCerrar,
  documento,
  versiones,
  alGuardado,
}: {
  abierto: boolean
  alCerrar: () => void
  documento: DocumentoEnLista
  versiones: VersionConFirmas[]
  alGuardado: (idNuevo: string | null) => void
}) {
  const [version, setVersion] = useState('')
  const [control, setControl] = useState('')
  const [texto, setTexto] = useState('')
  const [elegido, setElegido] = useState<{ archivo: File; conversion: ResultadoConversion } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sinConexion = typeof navigator !== 'undefined' && !navigator.onLine
  const propuesta = version || siguienteVersion(versiones)

  async function guardar() {
    setGuardando(true)
    setError(null)

    const datos = {
      version: propuesta,
      control_cambios: control.trim() || null,
      fecha_elaboracion: hoyISO(),
      fecha_vigencia: null,
      elaboro_id: null,
      reviso_id: null,
    }

    try {
      let idNueva: string | null = null

      if (elegido) {
        const fila = await crearVersionConArchivo(documento, datos, {
          archivo: elegido.archivo,
          markdown: elegido.conversion.markdown,
          avisos: elegido.conversion.avisos,
          origen: elegido.conversion.origen,
        })
        idNueva = fila.id
      } else if (texto.trim().length > 0) {
        const { fila } = await crearVersionEscrita(documento, datos, texto)
        idNueva = fila.id
      } else {
        setError('Elige un archivo o escribe el texto de la versión.')
        setGuardando(false)
        return
      }

      setVersion('')
      setControl('')
      setTexto('')
      setElegido(null)
      alGuardado(idNueva)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Nueva versión de ${documento.codigo}`}
      ancho={640}
      pie={
        <>
          <Button variante="fantasma" onClick={alCerrar}>Cancelar</Button>
          <Button variante="primario" cargando={guardando} onClick={guardar}>Crear la versión</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Aviso tono="error">{error}</Aviso>}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1fr) 2fr', gap: 14 }}>
          <Input
            etiqueta="Versión"
            className="mono"
            ayuda="Se propone la siguiente."
            value={propuesta}
            onChange={(e) => setVersion(e.target.value)}
          />
          <Input
            etiqueta="Control de cambios"
            ayuda="Qué cambió respecto a la anterior. Un auditor lo pide."
            value={control}
            onChange={(e) => setControl(e.target.value)}
          />
        </div>

        <SubirVersion sinConexion={sinConexion} alConvertir={setElegido} />

        {!elegido && (
          <Textarea
            etiqueta="…o escribe el texto aquí"
            ayuda="Markdown. Sin archivo original: para un documento que nace dentro de la app."
            rows={8}
            className="mono"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        )}
      </div>
    </Modal>
  )
}
