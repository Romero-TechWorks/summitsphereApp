'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { normalizar } from '@/lib/utils/texto'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import { listarOrganizaciones, nombreDeOrganizacion } from '@/lib/queries/cartera'
import {
  cambiarEstadoCambio,
  crearCambioSgc,
  listarCambiosSgc,
  type CambioEnCartera,
} from '@/lib/queries/mejora'
import { ESTADOS_CAMBIO_SGC } from '@/lib/acciones/catalogos'
import { etiquetaDe, tonoDe, type Opcion } from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Textarea from '@/components/ui/Textarea'
import { IconoDocumento } from '@/components/ui/Iconos'

/** Las tres casillas del §II del formato. */
const AMBITOS: readonly Opcion[] = [
  { valor: 'sgc',      etiqueta: 'SGC' },
  { valor: 'procesos', etiqueta: 'Procesos' },
  { valor: 'otro',     etiqueta: 'Otro' },
]

/**
 * ⚠️ **Tres disparadores, no uno**, y sólo el primero es de la Fase 04. Se
 * enseñan al capturar porque deciden quién revisa el cambio y contra qué
 * procedimiento se defiende.
 */
const ORIGENES: readonly Opcion[] = [
  { valor: 'accion_correctiva',   etiqueta: 'Acción correctiva (P-SG-05 §5.5)' },
  { valor: 'solicitud_documento', etiqueta: 'Solicitud de cambio de un documento (P-SG-01 §5.7)' },
  { valor: 'sugerencia_cliente',  etiqueta: 'Sugerencia de cliente (P-SG-07 §5.5.2)' },
  { valor: 'otro',                etiqueta: 'Otro' },
]

/**
 * **Cambios al SGC y a los procesos** [F04·B1] — el `F-SG-24` del cliente.
 *
 * ⚠️ **Es de la Fase 04 sólo a medias, y por eso vive aquí entero.** El
 * disparador de `P-SG-05` §5.5 sí es de esta fase; el de `P-SG-01` §5.7 es
 * control documental (Fase 02) y el de `P-SG-07` §5.5.2 es satisfacción del
 * cliente. **Las tres bocas escriben en la misma tabla**, así que partirlo por
 * fases habría costado tres pantallas para una estructura.
 *
 * ⚠️ **Aquí convergen las dos preguntas de impacto del `F-SG-06`.** El §III del
 * formato es «Riesgos Identificados»: para el cliente, el cambio al SGC y la
 * actualización de riesgos no son dos ramas separadas — son el mismo documento.
 */
export default function PanelCambiosSgc() {
  const cliente = useQueryClient()
  const clave = queryKeys.acciones.cambios()

  const [texto, setTexto] = useState('')
  const [orgFiltro, setOrgFiltro] = useState('')
  const [creando, setCreando] = useState(false)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [orgId, setOrgId] = useState('')
  const [nombre, setNombre] = useState('')
  const [numero, setNumero] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [ambito, setAmbito] = useState('sgc')
  const [origen, setOrigen] = useState('accion_correctiva')
  const [descripcion, setDescripcion] = useState('')
  const [alcance, setAlcance] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [riesgos, setRiesgos] = useState('')
  const [recursos, setRecursos] = useState('')

  const { data: cambios = [], isPending } = useQuery({ queryKey: clave, queryFn: listarCambiosSgc })

  const { data: organizaciones = [] } = useQuery({
    queryKey: queryKeys.cartera.organizaciones(),
    queryFn: listarOrganizaciones,
  })

  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    return cambios.filter((c) => {
      if (orgFiltro && c.org_id !== orgFiltro) return false
      if (!aguja) return true
      return (
        normalizar(c.nombre).includes(aguja) ||
        normalizar(c.numero ?? '').includes(aguja) ||
        normalizar(c.organizacion ? nombreDeOrganizacion(c.organizacion) : '').includes(aguja)
      )
    })
  }, [cambios, texto, orgFiltro])

  async function guardar() {
    setOcupado(true)
    setError(null)
    try {
      const { fila, encolado } = await crearCambioSgc({
        orgId,
        datos: {
          nombre: nombre.trim(),
          numero: numero.trim() || null,
          fecha: fecha || null,
          ambito,
          origen,
          descripcion: descripcion.trim() || null,
          alcance: alcance.trim() || null,
          justificacion: justificacion.trim() || null,
          riesgos: riesgos.trim() || null,
          recursos: recursos.trim() || null,
        },
      })
      const org = organizaciones.find((o) => o.id === orgId) ?? null
      aplicarEscritura<CambioEnCartera>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => [{ ...fila, organizacion: org, proyecto: null }, ...previo],
      })
      setCreando(false)
      setNombre('')
      setDescripcion('')
      setJustificacion('')
      setRiesgos('')
      setRecursos('')
      setAlcance('')
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  async function moverEstado(cambio: CambioEnCartera, estado: string) {
    setOcupado(true)
    setError(null)
    try {
      const { fila, encolado } = await cambiarEstadoCambio(cambio, estado)
      aplicarEscritura<CambioEnCartera>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.map((c) => (c.id === fila.id ? fila : c)),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  const enPantalla = visibles.find((c) => c.id === abierto) ?? null

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Aviso tono="info">
          Un cambio al SGC nace de <strong>tres sitios</strong>: una acción correctiva que lo
          pide, una solicitud de cambio a un documento publicado, o una sugerencia de cliente
          que procede. Los tres se documentan aquí.
        </Aviso>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px', maxWidth: 280 }}>
          <Input
            etiqueta="Buscar"
            etiquetaOculta
            placeholder="Nombre, número o cliente"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <div style={{ flex: '1 1 180px', maxWidth: 240 }}>
          <Select
            etiqueta="Cliente"
            etiquetaOculta
            marcador="Todos los clientes"
            value={orgFiltro}
            onChange={(e) => setOrgFiltro(e.target.value)}
          >
            {organizaciones.map((org) => (
              <option key={org.id} value={org.id}>{nombreDeOrganizacion(org)}</option>
            ))}
          </Select>
        </div>
        {!creando && (
          <Button tamano="sm" onClick={() => { setError(null); setCreando(true) }}>
            Nuevo cambio
          </Button>
        )}
      </div>

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {creando && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18,
            paddingBottom: 14, borderBottom: '1px solid var(--verde-tinta)',
          }}
        >
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <Select
                etiqueta="Cliente"
                required
                marcador="Elige el cliente"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                {organizaciones.map((org) => (
                  <option key={org.id} value={org.id}>{nombreDeOrganizacion(org)}</option>
                ))}
              </Select>
            </div>
            <div style={{ flex: '0 1 140px' }}>
              <Input
                etiqueta="No. de proyecto"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                ayuda="El del cliente, si lo tiene."
              />
            </div>
            <div style={{ flex: '0 1 150px' }}>
              <Input etiqueta="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          <Input
            etiqueta="Nombre del cambio"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Textarea etiqueta="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          <Textarea
            etiqueta="Alcance y principales cambios"
            value={alcance}
            onChange={(e) => setAlcance(e.target.value)}
          />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px' }}>
              <Select etiqueta="Ámbito" value={ambito} onChange={(e) => setAmbito(e.target.value)}>
                {AMBITOS.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                ))}
              </Select>
            </div>
            <div style={{ flex: '1 1 260px' }}>
              <Select etiqueta="Origen" value={origen} onChange={(e) => setOrigen(e.target.value)}>
                {ORIGENES.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                ))}
              </Select>
            </div>
          </div>

          <Textarea
            etiqueta="Justificación"
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
          />
          <Textarea
            etiqueta="Riesgos identificados"
            value={riesgos}
            onChange={(e) => setRiesgos(e.target.value)}
            ayuda="Aquí convergen las dos preguntas de impacto del F-SG-06: para el cliente, cambiar el SGC y actualizar los riesgos son el mismo documento."
          />
          <Textarea etiqueta="Recursos" value={recursos} onChange={(e) => setRecursos(e.target.value)} />

          <div style={{ display: 'flex', gap: 8 }}>
            <Button tamano="sm" onClick={guardar} disabled={ocupado || !orgId || nombre.trim() === ''}>
              {ocupado ? 'Guardando…' : 'Crear'}
            </Button>
            <Button tamano="sm" variante="fantasma" onClick={() => setCreando(false)} disabled={ocupado}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={cambios.length === 0 ? 'Sin cambios registrados' : 'Nada con estos filtros'}
          descripcion={
            cambios.length === 0
              ? 'Un cambio al SGC se documenta cuando una acción correctiva, una solicitud documental o una sugerencia de cliente obligan a tocar el sistema.'
              : 'Prueba a quitar el filtro de cliente o el texto de búsqueda.'
          }
        />
      ) : (
        <Lista etiqueta="Cambios al SGC">
          {visibles.map((cambio) => (
            <Fila
              key={cambio.id}
              Icono={IconoDocumento}
              onClick={() => setAbierto(abierto === cambio.id ? null : cambio.id)}
              titulo={cambio.nombre}
              meta={
                <>
                  {cambio.organizacion && <span>{nombreDeOrganizacion(cambio.organizacion)}</span>}
                  <span>{etiquetaDe(AMBITOS, cambio.ambito)}</span>
                  {cambio.numero && <span>{cambio.numero}</span>}
                  {cambio.fecha && <span>{formatDateOnly(cambio.fecha)}</span>}
                </>
              }
              derecha={
                <Badge tono={tonoDe(ESTADOS_CAMBIO_SGC, cambio.estado)}>
                  {etiquetaDe(ESTADOS_CAMBIO_SGC, cambio.estado)}
                </Badge>
              }
            />
          ))}
        </Lista>
      )}

      {enPantalla && (
        <section
          style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--verde-tinta)',
          }}
        >
          <h4 style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', margin: 0 }}>
            {enPantalla.nombre}
          </h4>

          <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 14px', margin: 0 }}>
            {([
              ['Origen', etiquetaDe(ORIGENES, enPantalla.origen)],
              ['Alcance', enPantalla.alcance ?? '—'],
              ['Justificación', enPantalla.justificacion ?? '—'],
              ['Riesgos identificados', enPantalla.riesgos ?? '—'],
              ['Recursos', enPantalla.recursos ?? '—'],
            ] as [string, string][]).map(([etiqueta, valor]) => (
              <div key={etiqueta} style={{ display: 'contents' }}>
                <dt style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>{etiqueta}</dt>
                <dd style={{ margin: 0 }}>{valor}</dd>
              </div>
            ))}
          </dl>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {enPantalla.estado === 'borrador' && (
              <Button tamano="sm" variante="fantasma" onClick={() => moverEstado(enPantalla, 'en_revision')} disabled={ocupado}>
                Mandar a revisión
              </Button>
            )}
            {enPantalla.estado === 'en_revision' && (
              <>
                <Button tamano="sm" onClick={() => moverEstado(enPantalla, 'autorizado')} disabled={ocupado}>
                  Autorizar
                </Button>
                <Button tamano="sm" variante="fantasma" onClick={() => moverEstado(enPantalla, 'rechazado')} disabled={ocupado}>
                  Rechazar
                </Button>
              </>
            )}
            {enPantalla.estado === 'autorizado' && (
              <Button tamano="sm" variante="fantasma" onClick={() => moverEstado(enPantalla, 'cerrado')} disabled={ocupado}>
                Cerrar
              </Button>
            )}
          </div>

          <p style={{ margin: 0, font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
            Las «actividades» del §VI del formato son <strong>acciones</strong>: se levantan desde
            la ficha de la no conformidad eligiendo este cambio como contenedor.
          </p>
        </section>
      )}
    </>
  )
}
