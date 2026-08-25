'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { useEnLinea } from '@/lib/offline/estado'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import { listarNormasConClausulas } from '@/lib/queries/normas'
import { listarAlcanceNormas } from '@/lib/queries/auditorias'
import {
  actualizarItem,
  aplicarPlantilla,
  crearItem,
  eliminarItem,
  generarDesdeElAlcance,
  guardarComoPlantilla,
  intercambiarOrden,
  leerPlantillaVerificacion,
  listarItems,
  puntosDeLaPlantilla,
  type DatosItem,
  type ItemConContexto,
} from '@/lib/queries/verificacion'
import { VEREDICTOS_ITEM } from '@/lib/auditorias/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { normalizar } from '@/lib/utils/texto'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import { IconoMatriz } from '@/components/ui/Iconos'
import FormularioItem from './FormularioItem'

const FORM = 'form-item-verificacion'

/** Qué se está editando: uno nuevo, uno existente, o nada. */
type EnEdicion = { modo: 'nuevo' } | { modo: 'editar'; item: ItemConContexto } | null

/**
 * **La lista de verificación** [F03·B2].
 *
 * Tres gestos, y en este orden:
 *
 * 1. **Generar del alcance.** La base recorre las normas de la auditoría y crea
 *    un punto por cláusula hoja auditable. Es idempotente: ampliar el alcance y
 *    volver a generar añade lo que falta sin tocar lo ya evaluado.
 * 2. **Usar la plantilla.** La firma le pone SU redacción a esos puntos y suma
 *    sus preguntas propias. La base decide *qué* se audita; la plantilla, *cómo*
 *    se pregunta.
 * 3. **Editar.** Añadir, quitar y reordenar antes de entrar a planta.
 *
 * ⚠️ **Generar pide señal y la pantalla lo dice.** Es una RPC que escribe
 * cientos de filas de golpe, y sobre todo es lo que se hace en la oficina antes
 * de salir: el día que haga falta sin señal, ya es tarde. Lo demás —editar,
 * reordenar, añadir— pasa por la cola como todo.
 */
export default function PanelVerificacion({
  auditoriaId,
  orgId,
  giro,
}: {
  auditoriaId: string
  orgId: string
  /** `organizaciones.giro`: elige el bucket de la plantilla. */
  giro: string | null
}) {
  const cliente = useQueryClient()
  const enLinea = useEnLinea()
  const clave = queryKeys.auditorias.items(auditoriaId)

  const [texto, setTexto] = useState('')
  const [edicion, setEdicion] = useState<EnEdicion>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const { data: items = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarItems(auditoriaId),
  })

  const { data: alcance = [] } = useQuery({
    queryKey: queryKeys.auditorias.alcanceNormas(auditoriaId),
    queryFn: () => listarAlcanceNormas(auditoriaId),
  })

  const { data: normas = [] } = useQuery({
    queryKey: queryKeys.normas.arbol(),
    queryFn: listarNormasConClausulas,
  })

  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })
  const esSocio = usuario?.rol === 'socio'

  // ⚠️ De qué lado de la partición se lee la plantilla de la firma. Va también
  // en la clave de caché: `src/lib/auth/particion.ts`.
  const esDev = usuario?.es_dev === true

  const { data: plantilla = {} } = useQuery({
    queryKey: queryKeys.auditorias.plantillaVerificacion(esDev),
    queryFn: () => leerPlantillaVerificacion(esDev),
    // Hasta saber quién pregunta no se sabe de qué rama del jsonb leer.
    enabled: usuario !== undefined,
  })

  const normasDelAlcance = useMemo(() => alcance.map((a) => a.norma_id), [alcance])
  const clavesDelAlcance = useMemo(
    () => alcance.map((a) => a.norma?.clave).filter((c): c is string => Boolean(c)),
    [alcance],
  )

  /**
   * De qué norma es una cláusula, por su `clave`. La plantilla se guarda por
   * clave de norma —`iso_9001`— y no por `norma_id`, para que sea legible.
   */
  const normaDeLaClausula = useMemo(() => {
    const porId = new Map<string, string>()
    for (const norma of normas) {
      for (const clausula of norma.clausulas) porId.set(clausula.id, norma.clave)
    }
    return (clausulaId: string) => porId.get(clausulaId) ?? null
  }, [normas])

  const deLaPlantilla = useMemo(
    () => puntosDeLaPlantilla(plantilla, clavesDelAlcance, giro),
    [plantilla, clavesDelAlcance, giro],
  )
  const hayPlantilla = deLaPlantilla.length > 0

  // ⚠️ El buscador filtra EN MEMORIA y no entra en la clave de caché. Con una
  // consulta por búsqueda, en la planta la lista se vacía al teclear la primera
  // letra (CLAUDE.md · reglas del offline, 7).
  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    if (!aguja) return items
    return items.filter(
      (i) =>
        normalizar(i.pregunta).includes(aguja) ||
        normalizar(i.clausula?.numero ?? '').includes(aguja) ||
        normalizar(i.clausula?.titulo ?? '').includes(aguja) ||
        normalizar(i.proceso?.nombre ?? '').includes(aguja),
    )
  }, [items, texto])

  const evaluados = items.filter((i) => i.veredicto !== 'pendiente').length

  async function generar() {
    setGuardando(true)
    setError(null)
    setAviso(null)

    try {
      const creados = await generarDesdeElAlcance(auditoriaId)
      await cliente.invalidateQueries({ queryKey: clave })
      setAviso(
        creados === 0
          ? 'No se creó ningún punto: o la lista ya está completa, o el alcance no tiene normas con cláusulas auditables.'
          : `Se crearon ${creados} punto${creados === 1 ? '' : 's'} desde el alcance.`,
      )
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function usarPlantilla() {
    setGuardando(true)
    setError(null)
    setAviso(null)

    try {
      const { reescritos, agregados, omitidos, respetados, encolado } = await aplicarPlantilla({
        auditoriaId,
        orgId,
        items,
        porNorma: deLaPlantilla,
        normaDeLaClausula,
      })

      aplicarEscritura<ItemConContexto>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => {
          const reescrito = new Map(reescritos.map((i) => [i.id, i]))
          return [...previo.map((i) => reescrito.get(i.id) ?? i), ...agregados].sort(
            (a, b) => a.orden - b.orden,
          )
        },
      })

      const partes: string[] = []
      if (reescritos.length) partes.push(`${reescritos.length} con la redacción de la firma`)
      if (agregados.length) partes.push(`${agregados.length} pregunta${agregados.length === 1 ? '' : 's'} propia${agregados.length === 1 ? '' : 's'}`)
      if (respetados) {
        partes.push(
          `${respetados} punto${respetados === 1 ? '' : 's'} ya evaluado${respetados === 1 ? '' : 's'} se dejó${respetados === 1 ? '' : 'aron'} como está${respetados === 1 ? '' : 'n'}`,
        )
      }
      if (omitidos.length) {
        partes.push(
          `${omitidos.length} cláusula${omitidos.length === 1 ? '' : 's'} de la plantilla no está${omitidos.length === 1 ? '' : 'n'} en el alcance y se omitió${omitidos.length === 1 ? '' : 'eron'} (${omitidos.slice(0, 4).join(', ')}${omitidos.length > 4 ? '…' : ''})`,
        )
      }
      setAviso(partes.length ? partes.join(' · ') : 'La lista ya coincidía con la plantilla.')
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function guardarPlantilla() {
    setGuardando(true)
    setError(null)
    setAviso(null)

    try {
      const { encolado } = await guardarComoPlantilla(
        items,
        normaDeLaClausula,
        clavesDelAlcance,
        giro,
        esDev,
      )
      if (!encolado) {
        void cliente.invalidateQueries({
          queryKey: queryKeys.auditorias.plantillaVerificacion(esDev),
        })
      }
      setAviso('Guardada como plantilla de la firma para estas normas y este giro.')
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function guardar(
    datos: Omit<DatosItem, 'orden'>,
    clausula: ItemConContexto['clausula'],
    proceso: ItemConContexto['proceso'],
  ) {
    setGuardando(true)
    setError(null)

    try {
      if (edicion?.modo === 'editar') {
        const { fila, encolado } = await actualizarItem(
          edicion.item,
          { ...datos, orden: edicion.item.orden },
          clausula,
          proceso,
        )
        aplicarEscritura<ItemConContexto>({
          cliente,
          clave,
          encolado,
          actualizar: (previo) => previo.map((i) => (i.id === fila.id ? fila : i)),
        })
      } else {
        const orden = items.reduce((mayor, i) => Math.max(mayor, i.orden), 0) + 1
        const { fila, encolado } = await crearItem(
          auditoriaId,
          orgId,
          { ...datos, orden },
          clausula,
          proceso,
        )
        aplicarEscritura<ItemConContexto>({
          cliente,
          clave,
          encolado,
          actualizar: (previo) => [...previo, fila].sort((a, b) => a.orden - b.orden),
        })
      }

      setEdicion(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function mover(item: ItemConContexto, hacia: -1 | 1) {
    const enOrden = [...items].sort((a, b) => a.orden - b.orden)
    const indice = enOrden.findIndex((i) => i.id === item.id)
    const vecino = enOrden[indice + hacia]
    if (!vecino) return

    setError(null)

    try {
      const { encolado } = await intercambiarOrden(item, vecino)
      aplicarEscritura<ItemConContexto>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) =>
          previo
            .map((i) => {
              if (i.id === item.id) return { ...i, orden: vecino.orden }
              if (i.id === vecino.id) return { ...i, orden: item.orden }
              return i
            })
            .sort((a, b) => a.orden - b.orden),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  async function quitar(item: ItemConContexto) {
    setError(null)

    try {
      const { encolado } = await eliminarItem(item)
      aplicarEscritura<ItemConContexto>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.filter((i) => i.id !== item.id),
      })
    } catch (problema) {
      // ⚠️ Aquí cae el «cero filas» de la política: un punto que ya produjo un
      // hallazgo no se quita. `exigirFilas` lo convierte en un error de verdad
      // en vez de dejarlo desaparecer y reaparecer al refrescar.
      setError(mensajeDeError(problema))
    }
  }

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  const enOrden = [...items].sort((a, b) => a.orden - b.orden)

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div style={{ flex: '1 1 200px', maxWidth: 300 }}>
          <Input
            etiqueta="Buscar"
            etiquetaOculta
            placeholder="Cláusula, pregunta o proceso"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button onClick={generar} cargando={guardando} disabled={!enLinea}>
            Generar del alcance
          </Button>
          {hayPlantilla && (
            <Button onClick={usarPlantilla} cargando={guardando}>Usar la plantilla</Button>
          )}
          {items.length > 0 && esSocio && (
            <Button variante="fantasma" onClick={guardarPlantilla} cargando={guardando}>
              Guardar como plantilla
            </Button>
          )}
          <Button variante="primario" onClick={() => { setError(null); setEdicion({ modo: 'nuevo' }) }}>
            Añadir punto
          </Button>
        </div>
      </div>

      {!enLinea && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="advertencia">
            Sin conexión no se puede <strong>generar</strong> la lista: eso lo hace el servidor
            recorriendo las cláusulas del alcance. Añadir, editar y reordenar sí funcionan y suben
            al recuperar la señal.
          </Aviso>
        </div>
      )}

      {alcance.length === 0 && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="advertencia">
            Esta auditoría no tiene normas en su alcance, así que no hay de dónde generar la lista.
            Márcalas en la pestaña <strong>Alcance</strong>.
          </Aviso>
        </div>
      )}

      {aviso && <div style={{ marginBottom: 12 }}><Aviso tono="info">{aviso}</Aviso></div>}
      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {items.length > 0 && (
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', marginBottom: 12 }}>
          {items.length} punto{items.length === 1 ? '' : 's'} · {evaluados} evaluado
          {evaluados === 1 ? '' : 's'}
        </p>
      )}

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={items.length === 0 ? 'La lista todavía no existe' : 'Nada con ese texto'}
          descripcion={
            items.length === 0
              ? 'Se genera sola desde las normas del alcance: un punto por cada cláusula auditable. Después la editas —añades, quitas y reordenas— y entras a planta con ella.'
              : 'Prueba con el número de cláusula, con una palabra de la pregunta o con el proceso.'
          }
          accion={
            items.length === 0 && alcance.length > 0
              ? (
                <Button variante="primario" onClick={generar} cargando={guardando} disabled={!enLinea}>
                  Generar del alcance
                </Button>
              )
              : null
          }
        />
      ) : (
        <Lista etiqueta="Lista de verificación">
          {visibles.map((item) => {
            const indice = enOrden.findIndex((i) => i.id === item.id)
            return (
              <Fila
                key={item.id}
                Icono={IconoMatriz}
                titulo={
                  <>
                    {item.clausula && (
                      <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                        {item.clausula.numero}
                      </span>
                    )}
                    {item.pregunta}
                  </>
                }
                meta={
                  <>
                    {item.clausula
                      ? <span>{item.clausula.titulo}</span>
                      : <span>Pregunta propia</span>}
                    {item.proceso && <span>{item.proceso.nombre}</span>}
                    {item.nota && <span>{item.nota}</span>}
                  </>
                }
                onClick={() => { setError(null); setEdicion({ modo: 'editar', item }) }}
                derecha={
                  <>
                    {item.veredicto !== 'pendiente' && (
                      <Badge tono={tonoDe(VEREDICTOS_ITEM, item.veredicto)}>
                        {etiquetaDe(VEREDICTOS_ITEM, item.veredicto)}
                      </Badge>
                    )}
                    <Button
                      variante="fantasma"
                      tamano="sm"
                      onClick={() => mover(item, -1)}
                      disabled={indice <= 0}
                      title="Subir"
                    >
                      ↑
                    </Button>
                    <Button
                      variante="fantasma"
                      tamano="sm"
                      onClick={() => mover(item, 1)}
                      disabled={indice < 0 || indice >= enOrden.length - 1}
                      title="Bajar"
                    >
                      ↓
                    </Button>
                    <Button
                      variante="fantasma"
                      tamano="sm"
                      onClick={() => quitar(item)}
                      title={`Quitar «${item.pregunta}»`}
                    >
                      Quitar
                    </Button>
                  </>
                }
              />
            )
          })}
        </Lista>
      )}

      <Modal
        abierto={edicion !== null}
        alCerrar={() => setEdicion(null)}
        titulo={edicion?.modo === 'editar' ? 'Punto de verificación' : 'Nuevo punto'}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setEdicion(null)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM} cargando={guardando}>
              {edicion?.modo === 'editar' ? 'Guardar' : 'Añadir'}
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        <FormularioItem
          id={FORM}
          orgId={orgId}
          normasDelAlcance={normasDelAlcance}
          inicial={edicion?.modo === 'editar' ? edicion.item : undefined}
          alEnviar={guardar}
        />
      </Modal>
    </>
  )
}
