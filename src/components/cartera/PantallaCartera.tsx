'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import {
  conteo,
  crearOrganizacion,
  listarOrganizaciones,
  type DatosOrganizacion,
  type OrganizacionEnLista,
} from '@/lib/queries/cartera'
import {
  ESTADOS_ARCHIVADOS_ORGANIZACION,
  ESTADOS_ORGANIZACION,
  etiquetaDe,
  tonoDe,
} from '@/lib/cartera/catalogos'
import { normalizar } from '@/lib/utils/texto'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Pestanas, { usePestana, type Pestana } from '@/components/ui/Pestanas'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import { IconoCartera } from '@/components/ui/Iconos'
import DirectorioContactos from './DirectorioContactos'
import FormularioOrganizacion from './FormularioOrganizacion'
import ListaProyectosCartera from './ListaProyectosCartera'

/**
 * Las tres vistas de la cartera. Agregar una sección es una entrada más en esta
 * lista, **no una ruta nueva**: los dominios son páginas con pestañas
 * (docs/03_ARQUITECTURA.md §2.1).
 */
const PESTANAS: readonly Pestana[] = [
  { clave: 'organizaciones', etiqueta: 'Organizaciones' },
  { clave: 'proyectos', etiqueta: 'Proyectos' },
  { clave: 'contactos', etiqueta: 'Contactos' },
]

const FORM_ORG = 'form-alta-organizacion'

/**
 * La cartera: el expediente de quién es cliente de la firma.
 *
 * ⚠️ Lo que se ve aquí **lo decide el RLS, no este componente**. La consulta pide
 * "todas las organizaciones" y la base devuelve sólo las asignadas a esta
 * cuenta —o todas, si quien pregunta es socio—. Es el criterio de cierre de la
 * fase: *un consultor no asignado busca la organización y no aparece*.
 */
export default function PantallaCartera() {
  const cliente = useQueryClient()
  const activa = usePestana(PESTANAS)

  // Estado de la PANTALLA, no del dato: filtros y modal. Lo que se pinta sale
  // siempre de la caché de React Query (CLAUDE.md · reglas del offline, 2).
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState('')
  const [verCerradas, setVerCerradas] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })
  // El alta de organizaciones es del socio, y lo impone la base. Se esconde el
  // botón para no ofrecer algo que va a terminar en un 42501.
  const esSocio = usuario?.rol === 'socio'

  const {
    data: organizaciones = [],
    isPending,
    error: fallo,
  } = useQuery({
    queryKey: queryKeys.cartera.organizaciones(),
    queryFn: listarOrganizaciones,
  })

  // El filtro corre EN MEMORIA sobre lo que ya está descargado: sin señal, una
  // consulta por cada letra tecleada devolvería una lista vacía y parecería que
  // la app perdió la cartera (ver `keys.ts`).
  const visibles = useMemo(() => {
    const busqueda = normalizar(texto)

    return organizaciones.filter((org) => {
      if (estado) {
        // Un estado elegido a mano manda sobre el escondite: si alguien pide
        // «cerrado», es que quiere ver los cerrados.
        if (org.estado !== estado) return false
      } else if (!verCerradas && ESTADOS_ARCHIVADOS_ORGANIZACION.includes(org.estado)) {
        return false
      }

      if (!busqueda) return true

      return [org.razon_social, org.nombre_comercial, org.rfc, org.giro]
        .filter(Boolean)
        .some((campo) => normalizar(String(campo)).includes(busqueda))
    })
  }, [organizaciones, texto, estado, verCerradas])

  async function guardarNueva(datos: DatosOrganizacion) {
    setGuardando(true)
    setError(null)

    try {
      const { fila, encolado } = await crearOrganizacion(datos)

      aplicarEscritura<OrganizacionEnLista>({
        cliente,
        clave: queryKeys.cartera.organizaciones(),
        encolado,
        actualizar: (previo) =>
          [...previo, { ...fila, sitios: [{ count: 0 }], contactos: [{ count: 0 }] }].sort((a, b) =>
            a.razon_social.localeCompare(b.razon_social, 'es'),
          ),
      })

      setModalAbierto(false)
    } catch (problema) {
      // ⚠️ `mensajeDeError`, nunca `String(problema)`: un rechazo de PostgREST
      // llega como objeto plano y `String()` lo convierte en "[object Object]".
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="contenido-pagina">
      <EncabezadoPagina
        titulo="Cartera"
        meta={
          <span>
            {organizaciones.length === 1
              ? '1 organización'
              : `${organizaciones.length} organizaciones`}
            {esSocio ? ' · toda la firma' : ' · las que tienes asignadas'}
          </span>
        }
        acciones={
          esSocio && activa === 'organizaciones' ? (
            <Button variante="primario" onClick={() => { setError(null); setModalAbierto(true) }}>
              Nueva organización
            </Button>
          ) : null
        }
      />

      <Pestanas pestanas={PESTANAS} />

      {activa === 'contactos' ? (
        <DirectorioContactos />
      ) : activa === 'proyectos' ? (
        <ListaProyectosCartera />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input
                etiqueta="Buscar organización"
                etiquetaOculta
                type="search"
                placeholder="Buscar por nombre, RFC o giro…"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
            </div>
            <div style={{ width: 180 }}>
              <Select
                etiqueta="Filtrar por estado"
                etiquetaOculta
                marcador="Todos los estados"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                {ESTADOS_ORGANIZACION.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                ))}
              </Select>
            </div>
            <div style={{ paddingTop: 8 }}>
              <Checkbox
                etiqueta="Ver cerradas"
                checked={verCerradas}
                onChange={(e) => setVerCerradas(e.target.checked)}
              />
            </div>
          </div>

          {isPending ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
            </div>
          ) : fallo ? (
            <EstadoVacio titulo="No se pudo leer la cartera" descripcion={mensajeDeError(fallo)} />
          ) : organizaciones.length === 0 ? (
            <EstadoVacio
              titulo="Todavía no hay organizaciones"
              descripcion={
                esSocio
                  ? 'Da de alta a tu primer cliente con sus plantas y sus contactos. Empieza por los cinco más activos, no por los cincuenta históricos.'
                  : 'Ninguna organización está asignada a tu cuenta todavía. Un socio de la firma decide quién ve qué expediente, y hasta que lo haga esta pantalla se queda vacía — no está rota.'
              }
              accion={
                esSocio ? (
                  <Button variante="primario" onClick={() => setModalAbierto(true)}>
                    Nueva organización
                  </Button>
                ) : null
              }
            />
          ) : visibles.length === 0 ? (
            <EstadoVacio
              titulo="Sin resultados"
              descripcion={`Ninguna organización de tu cartera coincide con lo que buscas${texto ? ` («${texto}»)` : ''}.`}
              accion={
                <Button onClick={() => { setTexto(''); setEstado('') }}>Quitar los filtros</Button>
              }
            />
          ) : (
            <Lista etiqueta="Organizaciones de la cartera">
              {visibles.map((org) => (
                <Fila
                  key={org.id}
                  href={`/cartera/${org.id}`}
                  Icono={IconoCartera}
                  titulo={org.nombre_comercial || org.razon_social}
                  meta={
                    <>
                      {org.nombre_comercial && <span>{org.razon_social}</span>}
                      {org.giro && <span>{org.giro}</span>}
                      <span>
                        {conteo(org.sitios)} {conteo(org.sitios) === 1 ? 'sitio' : 'sitios'} ·{' '}
                        {conteo(org.contactos)}{' '}
                        {conteo(org.contactos) === 1 ? 'contacto' : 'contactos'}
                      </span>
                    </>
                  }
                  derecha={
                    <Badge tono={tonoDe(ESTADOS_ORGANIZACION, org.estado)}>
                      {etiquetaDe(ESTADOS_ORGANIZACION, org.estado)}
                    </Badge>
                  }
                />
              ))}
            </Lista>
          )}
        </>
      )}

      <Modal
        abierto={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
        titulo="Nueva organización"
        pie={
          <>
            <Button variante="fantasma" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            {/* `form={FORM_ORG}`: el botón vive en el pie fijo del modal y envía
                el formulario que scrollea arriba. */}
            <Button variante="primario" type="submit" form={FORM_ORG} cargando={guardando}>
              Guardar
            </Button>
          </>
        }
      >
        {error && (
          <div style={{ marginBottom: 14 }}>
            <Aviso tono="error">{error}</Aviso>
          </div>
        )}
        <FormularioOrganizacion id={FORM_ORG} alEnviar={guardarNueva} />
      </Modal>
    </div>
  )
}
