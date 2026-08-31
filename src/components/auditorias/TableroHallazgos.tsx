'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { nombreDeOrganizacion, listarOrganizaciones } from '@/lib/queries/cartera'
import { listarNormasConClausulas } from '@/lib/queries/normas'
import {
  diasAbierto,
  folioDeHallazgo,
  listarHallazgosDeLaCartera,
  type HallazgoEnCartera,
} from '@/lib/queries/hallazgos'
import {
  ESTADOS_ABIERTOS_HALLAZGO,
  ESTADOS_HALLAZGO,
  TIPOS_HALLAZGO,
  TRAMOS_ANTIGUEDAD,
} from '@/lib/auditorias/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import { normalizar } from '@/lib/utils/texto'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import { IconoAlerta } from '@/components/ui/Iconos'

type Agrupar = 'cliente' | 'norma' | 'antiguedad'

/**
 * **El tablero que el consultor abre cada lunes** [F03·B4].
 *
 * Hallazgos abiertos de **toda la cartera**, agrupados por cliente, por norma o
 * por antigüedad. No es la lista de una auditoría: es «qué le debo a quién».
 *
 * ⚠️ **No hay vista de la base detrás, y es la misma decisión que la de los
 * widgets del tablero** [F01·B3]. El modelo de datos apunta una
 * `hallazgos_abiertos` con `security_invoker`; se aplaza porque **una vista es
 * otra clave que puede faltar en la caché**, y esta pantalla se abre el lunes por
 * la mañana con media barra de señal. La antigüedad y el vencimiento se calculan
 * en memoria sobre la lista que ya está bajada. Se moverá el día que una firma
 * tenga decenas de miles de hallazgos.
 *
 * ⚠️ Y por eso los filtros tampoco entran en la clave de caché: se descarga una
 * vez y se agrupa en memoria (CLAUDE.md · reglas del offline, 7).
 */
export default function TableroHallazgos() {
  const [texto, setTexto] = useState('')
  const [agrupar, setAgrupar] = useState<Agrupar>('cliente')
  const [orgFiltro, setOrgFiltro] = useState('')
  const [verCerrados, setVerCerrados] = useState(false)

  const { data: hallazgos = [], isPending } = useQuery({
    queryKey: queryKeys.auditorias.hallazgosDeLaCartera(),
    queryFn: listarHallazgosDeLaCartera,
  })

  const { data: organizaciones = [] } = useQuery({
    queryKey: queryKeys.cartera.organizaciones(),
    queryFn: listarOrganizaciones,
  })

  const { data: normas = [] } = useQuery({
    queryKey: queryKeys.normas.arbol(),
    queryFn: listarNormasConClausulas,
  })

  /** De qué norma es cada cláusula, para poder agrupar por norma. */
  const nombreDeNorma = useMemo(() => {
    const porClausula = new Map<string, string>()
    for (const norma of normas) {
      const etiqueta = `${norma.nombre}${norma.version ? ` : ${norma.version}` : ''}`
      for (const clausula of norma.clausulas) porClausula.set(clausula.id, etiqueta)
    }
    return (clausulaId: string | null) =>
      (clausulaId ? porClausula.get(clausulaId) : null) ?? 'Sin norma identificada'
  }, [normas])

  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    return hallazgos.filter((h) => {
      if (!verCerrados && !ESTADOS_ABIERTOS_HALLAZGO.includes(h.estado)) return false
      if (orgFiltro && h.org_id !== orgFiltro) return false
      if (!aguja) return true
      return (
        normalizar(h.descripcion).includes(aguja) ||
        normalizar(h.folio).includes(aguja) ||
        normalizar(h.clausula?.numero ?? '').includes(aguja) ||
        normalizar(h.organizacion ? nombreDeOrganizacion(h.organizacion) : '').includes(aguja)
      )
    })
  }, [hallazgos, texto, orgFiltro, verCerrados])

  const grupos = useMemo(() => {
    const mapa = new Map<string, HallazgoEnCartera[]>()

    for (const hallazgo of visibles) {
      const clave =
        agrupar === 'cliente'
          ? hallazgo.organizacion
            ? nombreDeOrganizacion(hallazgo.organizacion)
            : 'Sin cliente'
          : agrupar === 'norma'
            ? nombreDeNorma(hallazgo.clausula_id)
            : (TRAMOS_ANTIGUEDAD.find((t) => diasAbierto(hallazgo) < t.hasta) ?? TRAMOS_ANTIGUEDAD[TRAMOS_ANTIGUEDAD.length - 1]).etiqueta

      const lista = mapa.get(clave) ?? []
      lista.push(hallazgo)
      mapa.set(clave, lista)
    }

    const entradas = [...mapa.entries()]
    // Por antigüedad manda el orden de los tramos, no el alfabético: «Más de 180
    // días» tiene que salir al final aunque empiece por M.
    return agrupar === 'antiguedad'
      ? TRAMOS_ANTIGUEDAD.map((t) => [t.etiqueta, mapa.get(t.etiqueta) ?? []] as const).filter(([, l]) => l.length > 0)
      : entradas.sort(([a], [b]) => a.localeCompare(b))
  }, [visibles, agrupar, nombreDeNorma])

  const hoy = hoyISO()
  const vencidos = visibles.filter(
    (h) => ESTADOS_ABIERTOS_HALLAZGO.includes(h.estado) && h.fecha_compromiso !== null && h.fecha_compromiso < hoy,
  ).length
  const cerrados = hallazgos.filter((h) => !ESTADOS_ABIERTOS_HALLAZGO.includes(h.estado)).length

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 200px', maxWidth: 280 }}>
          <Input
            etiqueta="Buscar"
            etiquetaOculta
            placeholder="Folio, cláusula, cliente o descripción"
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
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {([
          ['cliente', 'Por cliente'],
          ['norma', 'Por norma'],
          ['antiguedad', 'Por antigüedad'],
        ] as [Agrupar, string][]).map(([valor, etiqueta]) => (
          <Button
            key={valor}
            variante={agrupar === valor ? 'primario' : 'fantasma'}
            tamano="sm"
            onClick={() => setAgrupar(valor)}
          >
            {etiqueta}
          </Button>
        ))}
        {cerrados > 0 && (
          <Button
            variante={verCerrados ? 'secundario' : 'fantasma'}
            tamano="sm"
            onClick={() => setVerCerrados(!verCerrados)}
          >
            {verCerrados ? 'Ocultar cerrados' : `Ver los ${cerrados} cerrados`}
          </Button>
        )}
      </div>

      <p style={{ fontSize: 13, color: 'var(--texto-dim)', marginBottom: 14 }}>
        {visibles.length} hallazgo{visibles.length === 1 ? '' : 's'}
        {vencidos > 0 && (
          <span style={{ color: 'var(--error, #c0392b)' }}>
            {' '}· {vencidos} con la fecha de compromiso vencida
          </span>
        )}
      </p>

      {grupos.length === 0 ? (
        <EstadoVacio
          titulo={hallazgos.length === 0 ? 'La cartera no tiene hallazgos' : 'Nada con ese filtro'}
          descripcion={
            hallazgos.length === 0
              ? 'Los hallazgos se levantan durante una auditoría. Cuando los haya, esta pantalla es la que se abre el lunes: qué está abierto, de quién y desde cuándo.'
              : 'Prueba con otro cliente, con otro texto, o mira también los cerrados.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {grupos.map(([grupo, suyos]) => (
            <section key={grupo}>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  color: 'var(--texto-dim)',
                  marginBottom: 8,
                }}
              >
                {grupo}
                <span style={{ marginLeft: 8, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                  {suyos.length}
                </span>
              </h3>

              <Lista etiqueta={`Hallazgos de ${grupo}`}>
                {suyos.map((hallazgo) => {
                  const dias = diasAbierto(hallazgo)
                  const vencido =
                    ESTADOS_ABIERTOS_HALLAZGO.includes(hallazgo.estado) &&
                    hallazgo.fecha_compromiso !== null &&
                    hallazgo.fecha_compromiso < hoy

                  return (
                    <Fila
                      key={hallazgo.id}
                      Icono={IconoAlerta}
                      // Lleva a su auditoría: el expediente del hallazgo vive ahí.
                      href={`/auditorias/${hallazgo.auditoria_id}?tab=hallazgos`}
                      titulo={
                        <>
                          <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                            {folioDeHallazgo(hallazgo)}
                          </span>
                          {hallazgo.descripcion}
                        </>
                      }
                      meta={
                        <>
                          {agrupar !== 'cliente' && hallazgo.organizacion && (
                            <span>{nombreDeOrganizacion(hallazgo.organizacion)}</span>
                          )}
                          {hallazgo.clausula && <span>{hallazgo.clausula.numero}</span>}
                          <span>{dias} día{dias === 1 ? '' : 's'}</span>
                          {hallazgo.fecha_compromiso && (
                            <span style={vencido ? { color: 'var(--error, #c0392b)' } : undefined}>
                              {vencido ? 'Venció el ' : 'Vence el '}
                              {formatDateOnly(hallazgo.fecha_compromiso)}
                            </span>
                          )}
                        </>
                      }
                      derecha={
                        <>
                          <Badge tono={tonoDe(TIPOS_HALLAZGO, hallazgo.tipo)}>
                            {etiquetaDe(TIPOS_HALLAZGO, hallazgo.tipo)}
                          </Badge>
                          <Badge tono={tonoDe(ESTADOS_HALLAZGO, hallazgo.estado)}>
                            {etiquetaDe(ESTADOS_HALLAZGO, hallazgo.estado)}
                          </Badge>
                        </>
                      }
                    />
                  )
                })}
              </Lista>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
