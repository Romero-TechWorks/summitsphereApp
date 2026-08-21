'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import { listarProyectosDe } from '@/lib/queries/proyectos'
import {
  actualizarContacto,
  actualizarOrganizacion,
  actualizarSitio,
  cambiarActivoContacto,
  cambiarActivoSitio,
  crearContacto,
  crearSitio,
  eliminarOrganizacion,
  listarContactos,
  listarEquipo,
  listarSitios,
  obtenerOrganizacion,
  type Contacto,
  type DatosContacto,
  type DatosOrganizacion,
  type DatosSitio,
  type Organizacion,
  type Sitio,
} from '@/lib/queries/cartera'
import {
  ESTADOS_ORGANIZACION,
  PAPELES_CONTACTO,
  TAMANOS_ORGANIZACION,
  TIPOS_SITIO,
  etiquetaDe,
  tonoDe,
} from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import ConfirmarBorrado from '@/components/ui/ConfirmarBorrado'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Pestanas, { usePestana, type Pestana } from '@/components/ui/Pestanas'
import Skeleton from '@/components/ui/Skeleton'
import { IconoCartera, IconoEquipo } from '@/components/ui/Iconos'
import FormularioContacto from './FormularioContacto'
import FormularioOrganizacion from './FormularioOrganizacion'
import FormularioSitio from './FormularioSitio'
import PanelEquipo from './PanelEquipo'
import PanelProyectos from './PanelProyectos'

/** ⚠️ «Bitácora» entra aquí en F01·B4. */
const PESTANAS: readonly Pestana[] = [
  { clave: 'resumen', etiqueta: 'Resumen' },
  { clave: 'proyectos', etiqueta: 'Proyectos' },
  { clave: 'sitios', etiqueta: 'Sitios' },
  { clave: 'contactos', etiqueta: 'Contactos' },
  { clave: 'equipo', etiqueta: 'Equipo' },
]

const FORM_ORG = 'form-editar-organizacion'
const FORM_SITIO = 'form-sitio'
const FORM_CONTACTO = 'form-contacto'

/** Qué se está editando: uno nuevo, uno existente, o nada. */
type EnEdicion<T> = { modo: 'nuevo' } | { modo: 'editar'; fila: T } | null

/**
 * El expediente de un cliente.
 *
 * Es la única ruta propia de la cartera: **los dominios son pestañas y sólo el
 * detalle tiene su `[id]`** (docs/03_ARQUITECTURA.md §2.1). Dentro, las
 * secciones vuelven a ser pestañas — en un teléfono, cuatro secciones apiladas
 * son cuatro pantallas de scroll para llegar al equipo.
 */
export default function ExpedienteOrganizacion({ id }: { id: string }) {
  const cliente = useQueryClient()
  const router = useRouter()
  const activa = usePestana(PESTANAS)

  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [editandoOrg, setEditandoOrg] = useState(false)
  const [sitioEnEdicion, setSitioEnEdicion] = useState<EnEdicion<Sitio>>(null)
  const [contactoEnEdicion, setContactoEnEdicion] = useState<EnEdicion<Contacto>>(null)

  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  const {
    data: organizacion,
    isPending,
    error: falloOrg,
  } = useQuery({
    queryKey: queryKeys.cartera.organizacion(id),
    queryFn: () => obtenerOrganizacion(id),
  })

  const { data: sitios = [] } = useQuery({
    queryKey: queryKeys.cartera.sitios(id),
    queryFn: () => listarSitios(id),
  })

  const { data: contactos = [] } = useQuery({
    queryKey: queryKeys.cartera.contactos(id),
    queryFn: () => listarContactos(id),
  })

  const { data: equipo = [] } = useQuery({
    queryKey: queryKeys.cartera.equipo(id),
    queryFn: () => listarEquipo(id),
  })

  // ⚠️ Se carga aquí aunque la pestaña de proyectos la pinte otro componente, y
  // no es duplicado: React Query comparte la misma clave, así que es UNA sola
  // petición. Sirve para el conteo del resumen y, sobre todo, para que abrir el
  // expediente **con señal** deje los proyectos en la caché — cuando el
  // consultor llegue a la planta ya no habrá red que valga (docs/03 §8.11).
  const { data: proyectos = [] } = useQuery({
    queryKey: queryKeys.cartera.proyectosDe(id),
    queryFn: () => listarProyectosDe(id),
  })

  const esSocio = usuario?.rol === 'socio'
  // El mismo criterio que `puedo_editar_org()` en la base. Se repite aquí para
  // no ofrecer botones que van a terminar en un 42501 — pero **quien manda es
  // la política**, no esta línea.
  const puedoEditar =
    esSocio || equipo.some((m) => m.usuario_id === usuario?.id && m.papel !== 'lectura')

  const nombre = organizacion?.nombre_comercial || organizacion?.razon_social || 'Organización'

  /** Las claves que dependen de los sitios y contactos: los conteos de la lista. */
  const claveCartera = queryKeys.cartera.organizaciones()

  async function guardarOrganizacion(datos: DatosOrganizacion) {
    if (!organizacion) return
    setGuardando(true)
    setError(null)

    try {
      const { fila, encolado } = await actualizarOrganizacion(organizacion, datos)

      // Una fila suelta, no una lista: se escribe directo en su clave.
      cliente.setQueryData(queryKeys.cartera.organizacion(id), fila)
      if (!encolado) void cliente.invalidateQueries({ queryKey: claveCartera })

      setEditandoOrg(false)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  /**
   * Eliminar el cliente entero.
   *
   * ⚠️ Sólo el socio, y lo impone la política `organizaciones_delete` de la base
   * —no este botón—. Existe porque la alternativa real es una cartera llena de
   * datos de prueba que nadie puede quitar (CLAUDE.md regla 13, el matiz).
   */
  async function borrar() {
    if (!organizacion) return
    setGuardando(true)
    setError(null)

    try {
      const { encolado } = await eliminarOrganizacion(organizacion)

      aplicarEscritura<{ id: string }>({
        cliente,
        clave: claveCartera,
        encolado,
        actualizar: (previo) => previo.filter((o) => o.id !== organizacion.id),
        ademasInvalidar: [queryKeys.cartera.contactosTodos(), queryKeys.cartera.proyectos()],
      })

      cliente.removeQueries({ queryKey: queryKeys.cartera.organizacion(id) })
      router.push('/cartera')
    } catch (problema) {
      setError(mensajeDeError(problema))
      setBorrando(false)
    } finally {
      setGuardando(false)
    }
  }

  async function guardarSitio(datos: DatosSitio) {
    if (!sitioEnEdicion) return
    setGuardando(true)
    setError(null)

    try {
      const { fila, encolado } =
        sitioEnEdicion.modo === 'nuevo'
          ? await crearSitio(id, datos)
          : await actualizarSitio(sitioEnEdicion.fila, datos)

      aplicarEscritura<Sitio>({
        cliente,
        clave: queryKeys.cartera.sitios(id),
        encolado,
        // Sustituye si ya estaba, agrega si es nuevo. Una sola rama para los dos
        // casos evita que el optimista se duplique al reintentar.
        actualizar: (previo) =>
          [...previo.filter((s) => s.id !== fila.id), fila].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, 'es'),
          ),
        ademasInvalidar: [claveCartera],
      })

      setSitioEnEdicion(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function alternarSitio(sitio: Sitio) {
    setError(null)
    try {
      const { fila, encolado } = await cambiarActivoSitio(sitio, !sitio.activo)
      aplicarEscritura<Sitio>({
        cliente,
        clave: queryKeys.cartera.sitios(id),
        encolado,
        actualizar: (previo) => previo.map((s) => (s.id === fila.id ? fila : s)),
      })
      setSitioEnEdicion(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  async function guardarContacto(datos: DatosContacto) {
    if (!contactoEnEdicion) return
    setGuardando(true)
    setError(null)

    try {
      const { fila, encolado } =
        contactoEnEdicion.modo === 'nuevo'
          ? await crearContacto(id, datos)
          : await actualizarContacto(contactoEnEdicion.fila, datos)

      aplicarEscritura<Contacto>({
        cliente,
        clave: queryKeys.cartera.contactos(id),
        encolado,
        actualizar: (previo) => [...previo.filter((c) => c.id !== fila.id), fila],
        ademasInvalidar: [claveCartera, queryKeys.cartera.contactosTodos()],
      })

      setContactoEnEdicion(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function alternarContacto(contacto: Contacto) {
    setError(null)
    try {
      const { fila, encolado } = await cambiarActivoContacto(contacto, !contacto.activo)
      aplicarEscritura<Contacto>({
        cliente,
        clave: queryKeys.cartera.contactos(id),
        encolado,
        actualizar: (previo) => previo.map((c) => (c.id === fila.id ? fila : c)),
        ademasInvalidar: [queryKeys.cartera.contactosTodos()],
      })
      setContactoEnEdicion(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  if (isPending) {
    return (
      <div className="contenido-pagina" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Skeleton alto={36} ancho="60%" />
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  // ⚠️ Sin fila puede significar dos cosas y sólo una es un error: que el id no
  // exista, o que **el RLS no deje verla**. Para el usuario son lo mismo —no la
  // tiene asignada— y decírselo así evita la pregunta "¿por qué no encuentro al
  // cliente que sí existe?".
  if (falloOrg || !organizacion) {
    return (
      <div className="contenido-pagina">
        <EnlaceVolver />
        <EstadoVacio
          titulo="Esta organización no está en tu cartera"
          descripcion={
            falloOrg
              ? mensajeDeError(falloOrg)
              : 'O no existe, o no está asignada a tu cuenta. Un socio de la firma decide quién atiende a cada cliente.'
          }
        />
      </div>
    )
  }

  return (
    <div className="contenido-pagina">
      <EnlaceVolver />

      <EncabezadoPagina
        titulo={nombre}
        meta={
          <>
            {organizacion.nombre_comercial && <span>{organizacion.razon_social}</span>}
            {organizacion.rfc && <span className="mono">{organizacion.rfc}</span>}
            <Badge tono={tonoDe(ESTADOS_ORGANIZACION, organizacion.estado)}>
              {etiquetaDe(ESTADOS_ORGANIZACION, organizacion.estado)}
            </Badge>
          </>
        }
        acciones={
          puedoEditar && activa === 'resumen' ? (
            <Button onClick={() => { setError(null); setEditandoOrg(true) }}>Editar datos</Button>
          ) : activa === 'sitios' && puedoEditar ? (
            <Button variante="primario" onClick={() => { setError(null); setSitioEnEdicion({ modo: 'nuevo' }) }}>
              Agregar sitio
            </Button>
          ) : activa === 'contactos' && puedoEditar ? (
            <Button variante="primario" onClick={() => { setError(null); setContactoEnEdicion({ modo: 'nuevo' }) }}>
              Agregar contacto
            </Button>
          ) : null
        }
      />

      <Pestanas pestanas={PESTANAS} />

      {error && (
        <div style={{ marginBottom: 14 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      {activa === 'resumen' && (
        <Resumen
          organizacion={organizacion}
          sitios={sitios.length}
          contactos={contactos.length}
          proyectos={proyectos.length}
        />
      )}

      {activa === 'resumen' && esSocio && (
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--borde)' }}>
          <Button variante="peligro" onClick={() => { setError(null); setBorrando(true) }}>
            Eliminar esta organización
          </Button>
          <p style={{ fontSize: 12.5, color: 'var(--texto-dim)', marginTop: 8, maxWidth: 560, lineHeight: 1.55 }}>
            Para un cliente que ya no se atiende, lo normal es <strong>cerrarlo</strong> —cambiar su
            estado a «cerrado»—: desaparece de los listados y su expediente se conserva. Esto otro es
            para lo que nunca debió existir.
          </p>
        </div>
      )}

      <ConfirmarBorrado
        abierto={borrando}
        alCerrar={() => setBorrando(false)}
        titulo="Eliminar la organización"
        nombre={organizacion.razon_social}
        queSeLleva={[
          `${sitios.length} ${sitios.length === 1 ? 'sitio' : 'sitios'}`,
          `${contactos.length} ${contactos.length === 1 ? 'contacto' : 'contactos'}`,
          `${proyectos.length} ${proyectos.length === 1 ? 'proyecto' : 'proyectos'}, con sus tareas, su alcance y su bitácora`,
          `${equipo.length} ${equipo.length === 1 ? 'asignación' : 'asignaciones'} de equipo`,
        ]}
        error={error}
        trabajando={guardando}
        alConfirmar={borrar}
      />

      {activa === 'proyectos' && (
        <PanelProyectos
          orgId={id}
          sitios={sitios}
          equipo={equipo}
          puedoEditar={puedoEditar}
          esSocio={Boolean(esSocio)}
        />
      )}

      {activa === 'sitios' && (
        sitios.length === 0 ? (
          <EstadoVacio
            titulo="Todavía no hay sitios"
            descripcion="Un sitio es un centro de trabajo: la planta, la oficina, el almacén. El alcance de un certificado puede cubrir uno y no otro, y qué NOM aplica depende de los trabajadores de cada uno."
            accion={puedoEditar ? <Button variante="primario" onClick={() => setSitioEnEdicion({ modo: 'nuevo' })}>Agregar el primero</Button> : null}
          />
        ) : (
          <Lista etiqueta={`Sitios de ${nombre}`}>
            {sitios.map((sitio) => (
              <Fila
                key={sitio.id}
                Icono={IconoCartera}
                onClick={puedoEditar ? () => { setError(null); setSitioEnEdicion({ modo: 'editar', fila: sitio }) } : undefined}
                titulo={sitio.nombre}
                meta={
                  <>
                    <span>{etiquetaDe(TIPOS_SITIO, sitio.tipo)}</span>
                    {(sitio.municipio || sitio.entidad) && (
                      <span>{[sitio.municipio, sitio.entidad].filter(Boolean).join(', ')}</span>
                    )}
                    {sitio.num_trabajadores != null && (
                      <span className="mono">{sitio.num_trabajadores} trabajadores</span>
                    )}
                  </>
                }
                derecha={!sitio.activo ? <Badge tono="neutro">De baja</Badge> : null}
              />
            ))}
          </Lista>
        )
      )}

      {activa === 'contactos' && (
        contactos.length === 0 ? (
          <EstadoVacio
            titulo="Todavía no hay contactos"
            descripcion="Quién firma el acta de apertura, quién coordina el sistema de gestión y a quién se le pide la evidencia. Es lo que se busca con prisa el día de una auditoría."
            accion={puedoEditar ? <Button variante="primario" onClick={() => setContactoEnEdicion({ modo: 'nuevo' })}>Agregar el primero</Button> : null}
          />
        ) : (
          <Lista etiqueta={`Contactos de ${nombre}`}>
            {contactos.map((contacto) => (
              <Fila
                key={contacto.id}
                Icono={IconoEquipo}
                onClick={puedoEditar ? () => { setError(null); setContactoEnEdicion({ modo: 'editar', fila: contacto }) } : undefined}
                titulo={contacto.nombre}
                meta={
                  <>
                    {contacto.puesto && <span>{contacto.puesto}</span>}
                    <span>{etiquetaDe(PAPELES_CONTACTO, contacto.papel)}</span>
                    {contacto.sitio_id && (
                      <span>{sitios.find((s) => s.id === contacto.sitio_id)?.nombre ?? 'Sitio'}</span>
                    )}
                  </>
                }
                derecha={
                  <>
                    {contacto.principal && <Badge tono="exito">Principal</Badge>}
                    {!contacto.activo && <Badge tono="neutro">De baja</Badge>}
                    {contacto.telefono && (
                      <span className="mono" style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
                        {contacto.telefono}
                      </span>
                    )}
                  </>
                }
              />
            ))}
          </Lista>
        )
      )}

      {activa === 'equipo' && (
        <PanelEquipo orgId={id} organizacion={nombre} equipo={equipo} esSocio={Boolean(esSocio)} />
      )}

      {/* ── Modales ─────────────────────────────────────────────────────── */}

      <Modal
        abierto={editandoOrg}
        alCerrar={() => setEditandoOrg(false)}
        titulo="Editar la organización"
        pie={
          <>
            <Button variante="fantasma" onClick={() => setEditandoOrg(false)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_ORG} cargando={guardando}>Guardar</Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 14 }}><Aviso tono="error">{error}</Aviso></div>}
        <FormularioOrganizacion id={FORM_ORG} inicial={organizacion} alEnviar={guardarOrganizacion} />
      </Modal>

      <Modal
        abierto={sitioEnEdicion !== null}
        alCerrar={() => setSitioEnEdicion(null)}
        titulo={sitioEnEdicion?.modo === 'editar' ? 'Editar el sitio' : 'Agregar un sitio'}
        pie={
          <>
            {/* Dar de baja vive aquí, con su texto y separado: en esta app casi
                nada se elimina, y lo que se puede hacer se dice con palabras.
                docs/05 §4.4. */}
            {sitioEnEdicion?.modo === 'editar' && (
              <Button
                variante={sitioEnEdicion.fila.activo ? 'peligro' : 'secundario'}
                style={{ marginRight: 'auto' }}
                onClick={() => alternarSitio(sitioEnEdicion.fila)}
              >
                {sitioEnEdicion.fila.activo ? 'Dar de baja' : 'Reactivar'}
              </Button>
            )}
            <Button variante="fantasma" onClick={() => setSitioEnEdicion(null)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_SITIO} cargando={guardando}>Guardar</Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 14 }}><Aviso tono="error">{error}</Aviso></div>}
        {sitioEnEdicion && (
          <FormularioSitio
            // ⚠️ `key` distinto por fila: sin él, React reutiliza el formulario
            // anterior con su estado dentro y al abrir el segundo sitio se ven
            // los datos del primero.
            key={sitioEnEdicion.modo === 'editar' ? sitioEnEdicion.fila.id : 'nuevo'}
            id={FORM_SITIO}
            inicial={sitioEnEdicion.modo === 'editar' ? sitioEnEdicion.fila : undefined}
            alEnviar={guardarSitio}
          />
        )}
      </Modal>

      <Modal
        abierto={contactoEnEdicion !== null}
        alCerrar={() => setContactoEnEdicion(null)}
        titulo={contactoEnEdicion?.modo === 'editar' ? 'Editar el contacto' : 'Agregar un contacto'}
        pie={
          <>
            {contactoEnEdicion?.modo === 'editar' && (
              <Button
                variante={contactoEnEdicion.fila.activo ? 'peligro' : 'secundario'}
                style={{ marginRight: 'auto' }}
                onClick={() => alternarContacto(contactoEnEdicion.fila)}
              >
                {contactoEnEdicion.fila.activo ? 'Dar de baja' : 'Reactivar'}
              </Button>
            )}
            <Button variante="fantasma" onClick={() => setContactoEnEdicion(null)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_CONTACTO} cargando={guardando}>Guardar</Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 14 }}><Aviso tono="error">{error}</Aviso></div>}
        {contactoEnEdicion && (
          <FormularioContacto
            key={contactoEnEdicion.modo === 'editar' ? contactoEnEdicion.fila.id : 'nuevo'}
            id={FORM_CONTACTO}
            inicial={contactoEnEdicion.modo === 'editar' ? contactoEnEdicion.fila : undefined}
            sitios={sitios}
            alEnviar={guardarContacto}
          />
        )}
      </Modal>
    </div>
  )
}

function EnlaceVolver() {
  return (
    <Link
      href="/cartera"
      style={{
        display: 'inline-block',
        marginBottom: 10,
        fontSize: 13,
        color: 'var(--texto-dim)',
        textDecoration: 'none',
      }}
    >
      ← Cartera
    </Link>
  )
}

/** Los datos del cliente, sin recuadro: etiqueta arriba, dato debajo. */
function Resumen({
  organizacion,
  sitios,
  contactos,
  proyectos,
}: {
  organizacion: Organizacion
  sitios: number
  contactos: number
  proyectos: number
}) {
  const datos: { etiqueta: string; valor: string; mono?: boolean }[] = [
    { etiqueta: 'Razón social', valor: organizacion.razon_social },
    { etiqueta: 'RFC', valor: organizacion.rfc || '—', mono: true },
    { etiqueta: 'Giro', valor: organizacion.giro || '—' },
    { etiqueta: 'Tamaño', valor: etiquetaDe(TAMANOS_ORGANIZACION, organizacion.tamano) },
    { etiqueta: 'Proyectos', valor: String(proyectos), mono: true },
    { etiqueta: 'Sitios', valor: String(sitios), mono: true },
    { etiqueta: 'Contactos', valor: String(contactos), mono: true },
  ]

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '18px 24px',
          paddingBottom: 18,
          borderBottom: '2px solid rgba(61, 186, 78, .16)',
        }}
      >
        {datos.map((dato) => (
          <div key={dato.etiqueta}>
            <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '.04em', color: 'var(--texto-dim)' }}>
              {dato.etiqueta}
            </div>
            <div className={dato.mono ? 'mono' : undefined} style={{ fontSize: 15, marginTop: 2 }}>
              {dato.valor}
            </div>
          </div>
        ))}
      </div>

      {organizacion.notas && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '.04em', color: 'var(--texto-dim)', marginBottom: 4 }}>
            Notas
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{organizacion.notas}</p>
        </div>
      )}
    </div>
  )
}
