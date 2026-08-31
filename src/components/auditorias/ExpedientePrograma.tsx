'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import {
  actualizarRenglonPrograma,
  crearRenglonPrograma,
  eliminarRenglonPrograma,
  listarProgramaProcesos,
  type DatosRenglonPrograma,
  type ProgramaEnLista,
  type RenglonPrograma,
} from '@/lib/queries/auditorias'
import { listarProcesos } from '@/lib/queries/procesos'
import { listarHallazgosDeLaCartera } from '@/lib/queries/hallazgos'
import { obtenerIdentidadFirma } from '@/lib/queries/firma'
import { nombreDeOrganizacion } from '@/lib/queries/cartera'
import {
  MESES_CORTOS,
  UMBRAL_PUNTOS,
  VALORES_PROCESO,
  alternarMes,
  auditoriasDe,
  contarNcPorProceso,
  mesesDe,
  puntosDe,
  valorSugerido,
  type MesPlaneado,
} from '@/lib/auditorias/programaAnual'
import { ESTADOS_PROGRAMA } from '@/lib/auditorias/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { programaAnualHtml, tituloDelProgramaAnual } from '@/lib/plantillas/programaAnual'
import { documentoImprimible, imprimirDocumento } from '@/lib/plantillas/impresion'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import type { Json } from '@/types/database'

/**
 * **El expediente del programa anual: la parrilla del F-SG-09** [F03·B6b + B6c].
 *
 * Se abre con `?programa=<id>` sobre la pestaña, igual que un proyecto con
 * `?proyecto=` y un documento con `?documento=`. Los dominios son páginas con
 * pestañas y las únicas rutas propias son las de detalle (docs/03 §2.1).
 *
 * ⚠️ **La parrilla no cabía en el modal de alta**: son once o doce procesos por
 * doce meses, y en un diálogo de 520 px eso es ilegible. Por eso el programa
 * estrena expediente en vez de crecerle el formulario.
 *
 * ⚠️ **Puntos y auditorías NO se capturan: se calculan.** La base los tiene como
 * columnas generadas; aquí se recalculan con la misma fórmula sólo para que el
 * número aparezca sin señal, mientras el cambio está en la cola. Y el resultado
 * **nunca pasa de dos** — es la hoja de la firma, no el texto del procedimiento
 * (ver `src/lib/auditorias/programaAnual.ts`).
 */
export default function ExpedientePrograma({
  programa,
  volverHref,
}: {
  programa: ProgramaEnLista
  volverHref: string
}) {
  const cliente = useQueryClient()
  const clave = queryKeys.auditorias.programaProcesos(programa.id)

  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [nuevoProceso, setNuevoProceso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [vistaPrevia, setVistaPrevia] = useState(false)

  const { data: renglones = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarProgramaProcesos(programa.id),
  })

  // ⚠️ El desplegable de procesos es un dato, así que va por `useQuery`: sin
  // señal, uno vacío deja el guardado muerto en la validación antes de poder
  // encolarse (CLAUDE.md · reglas del offline, 3).
  const { data: procesos = [] } = useQuery({
    queryKey: queryKeys.sistemas.procesos(programa.org_id),
    queryFn: () => listarProcesos(programa.org_id),
  })

  // ⚠️ La lista del tablero del lunes, que ya está en la caché: de aquí sale el
  // conteo de NC del año anterior **en memoria**, sin clave nueva.
  const { data: hallazgos = [] } = useQuery({
    queryKey: queryKeys.auditorias.hallazgosDeLaCartera(),
    queryFn: listarHallazgosDeLaCartera,
  })

  const { data: firma = null } = useQuery({
    queryKey: queryKeys.firma.identidad(),
    queryFn: obtenerIdentidadFirma,
  })

  const enBorrador = programa.estado === 'borrador'

  /** Los procesos del cliente que todavía no están en la parrilla. */
  const disponibles = useMemo(() => {
    const puestos = new Set(renglones.map((r) => r.proceso_id))
    return procesos.filter((p) => p.activo && !puestos.has(p.id))
  }, [procesos, renglones])

  /** Cuántas NC tuvo cada proceso el año anterior a éste. */
  const ncDelAnioAnterior = useMemo(
    () => contarNcPorProceso(hallazgos, programa.org_id, programa.anio - 1),
    [hallazgos, programa.org_id, programa.anio],
  )

  const html = useMemo(
    () => programaAnualHtml({ programa, renglones, firma }),
    [programa, renglones, firma],
  )

  function datosDe(renglon: RenglonPrograma): DatosRenglonPrograma {
    return {
      valor: renglon.valor,
      nc_previas: renglon.nc_previas,
      meses: renglon.meses,
      orden: renglon.orden,
      nota: renglon.nota,
    }
  }

  /** Devuelve si el cambio salió: `traerNc()` cuenta sobre eso, no sobre la intención. */
  async function guardar(
    renglon: RenglonPrograma,
    cambios: Partial<DatosRenglonPrograma>,
  ): Promise<boolean> {
    setError(null)
    setAviso(null)

    try {
      const { fila, encolado } = await actualizarRenglonPrograma(renglon, {
        ...datosDe(renglon),
        ...cambios,
      })
      aplicarEscritura<RenglonPrograma>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.map((r) => (r.id === fila.id ? fila : r)),
      })
      return true
    } catch (problema) {
      setError(mensajeDeError(problema))
      return false
    }
  }

  async function anadir() {
    const proceso = procesos.find((p) => p.id === nuevoProceso)
    if (!proceso) return

    setOcupado(true)
    setError(null)

    try {
      const { fila, encolado } = await crearRenglonPrograma(
        programa.id,
        programa.org_id,
        { id: proceso.id, nombre: proceso.nombre, tipo: proceso.tipo },
        {
          // Se PROPONE desde el tipo del proceso y desde los hallazgos del año
          // pasado; los dos se pueden cambiar en la parrilla.
          valor: valorSugerido(proceso.tipo),
          nc_previas: ncDelAnioAnterior.get(proceso.id) ?? 0,
          meses: [] as unknown as Json,
          orden: renglones.length,
          nota: null,
        },
      )
      aplicarEscritura<RenglonPrograma>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => [...previo, fila],
      })
      setNuevoProceso('')
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  async function quitar(renglon: RenglonPrograma) {
    setError(null)
    try {
      const { encolado } = await eliminarRenglonPrograma(renglon)
      aplicarEscritura<RenglonPrograma>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.filter((r) => r.id !== renglon.id),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  /**
   * Trae el conteo de NC del año anterior a todos los renglones.
   *
   * ⚠️ **Sólo toca los que cambian.** Reescribir los once renglones sin mirar
   * metería once operaciones idénticas en la cola, y en una planta sin señal esa
   * cola es lo que el consultor mira para saber qué le falta por subir.
   */
  async function traerNc() {
    setOcupado(true)
    setError(null)
    setAviso(null)

    try {
      const porCambiar = renglones.filter(
        (r) => (ncDelAnioAnterior.get(r.proceso_id) ?? 0) !== r.nc_previas,
      )

      let hechos = 0
      for (const renglon of porCambiar) {
        const salio = await guardar(renglon, {
          nc_previas: ncDelAnioAnterior.get(renglon.proceso_id) ?? 0,
        })
        if (salio) hechos += 1
      }

      // ⚠️ El aviso cuenta los que SALIERON, no los que se intentaron: si uno
      // falla, `guardar()` ya dejó el motivo en pantalla y decir «se
      // actualizaron 11» encima de un error rojo es peor que no decir nada.
      if (hechos < porCambiar.length) return

      setAviso(
        porCambiar.length === 0
          ? `Ningún proceso cambia: la parrilla ya coincide con las no conformidades de ${programa.anio - 1}.`
          : `Se actualizaron ${hechos} proceso${hechos === 1 ? '' : 's'} con las no conformidades de ${programa.anio - 1}.`,
      )
    } finally {
      setOcupado(false)
    }
  }

  function imprimir() {
    setError(null)
    const resultado = imprimirDocumento(tituloDelProgramaAnual(programa), html)
    if (!resultado.abierta) setError(resultado.motivo)
  }

  if (isPending) return <Skeleton alto={280} radio={4} />

  const celda: React.CSSProperties = {
    padding: '6px 8px',
    borderBottom: '1px solid var(--borde)',
    fontSize: 13,
    verticalAlign: 'middle',
  }
  const cabecera: React.CSSProperties = {
    padding: '6px 8px',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    color: 'var(--texto-dim)',
    fontWeight: 600,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  }

  return (
    <div>
      <Link
        href={volverHref}
        style={{ display: 'inline-block', marginBottom: 12, fontSize: 13, color: 'var(--texto-dim)', textDecoration: 'none' }}
      >
        ← Programa anual
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontSize: 15, color: 'var(--texto-dim)' }}>{programa.anio}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--texto)' }}>{programa.nombre}</span>
            <Badge tono={tonoDe(ESTADOS_PROGRAMA, programa.estado)}>
              {etiquetaDe(ESTADOS_PROGRAMA, programa.estado)}
            </Badge>
          </div>
          <div style={{ fontSize: 13, color: 'var(--texto-dim)', marginTop: 3 }}>
            {programa.organizacion ? nombreDeOrganizacion(programa.organizacion) : 'Sin cliente'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variante="secundario" onClick={() => setVistaPrevia(true)}>Ver el documento</Button>
          <Button variante="primario" onClick={imprimir}>Imprimir o guardar PDF</Button>
        </div>
      </div>

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
      {aviso && <div style={{ marginBottom: 12 }}><Aviso tono="exito">{aviso}</Aviso></div>}

      {!programa.alcance && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="advertencia">
            Este programa no tiene alcance escrito. El F-SG-09 lo imprime junto a los criterios y
            el objetivo; sin él, el documento sale con un hueco. Se captura editando el programa
            desde la lista.
          </Aviso>
        </div>
      )}

      {!enBorrador && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="info">
            El programa está {etiquetaDe(ESTADOS_PROGRAMA, programa.estado).toLowerCase()}. Sus
            procesos ya no se quitan: es un registro de ISO 9001 §9.2.2 y la justificación del
            número de auditorías del año tiene que poder consultarse después.
          </Aviso>
        </div>
      )}

      {renglones.length === 0 ? (
        <EstadoVacio
          titulo="El programa todavía no tiene procesos"
          descripcion={`De aquí sale la frecuencia: cada proceso vale 2 si es del servicio y 1 si es de soporte, y ese valor por las no conformidades del año anterior da los puntos. Hasta ${UMBRAL_PUNTOS} puntos, una auditoría al año; por encima, dos.`}
        />
      ) : (
        // ⚠️ El scroll horizontal vive AQUÍ, en su propio contenedor: la parrilla
        // son diecisiete columnas y en un teléfono no cabe, pero el armazón de la
        // app no scrollea (regla 4) y la página nunca debe moverse en horizontal.
        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr>
                <th style={cabecera}>Proceso</th>
                <th style={{ ...cabecera, width: 130 }}>Valor</th>
                <th style={{ ...cabecera, width: 92 }}>NC {programa.anio - 1}</th>
                <th style={{ ...cabecera, width: 62, textAlign: 'center' }}>Puntos</th>
                <th style={{ ...cabecera, width: 74, textAlign: 'center' }}>Auditorías</th>
                {MESES_CORTOS.map((mes) => (
                  <th key={mes} style={{ ...cabecera, width: 34, textAlign: 'center', padding: '6px 2px' }}>
                    {mes}
                  </th>
                ))}
                {enBorrador && <th style={{ ...cabecera, width: 62 }} />}
              </tr>
            </thead>
            <tbody>
              {renglones.map((renglon) => {
                const meses = mesesDe(renglon.meses)
                const puntos = puntosDe(renglon.valor, renglon.nc_previas)
                const auditorias = auditoriasDe(renglon.valor, renglon.nc_previas)

                return (
                  <tr key={renglon.id}>
                    <td style={celda}>{renglon.proceso?.nombre ?? 'Proceso dado de baja'}</td>
                    <td style={celda}>
                      <Select
                        etiqueta="Valor del proceso"
                        etiquetaOculta
                        value={String(renglon.valor)}
                        onChange={(e) => void guardar(renglon, { valor: Number(e.target.value) })}
                      >
                        {VALORES_PROCESO.map((opcion) => (
                          <option key={opcion.valor} value={opcion.valor}>
                            {opcion.valor} · {opcion.etiqueta}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td style={celda}>
                      <Input
                        etiqueta={`No conformidades de ${programa.anio - 1}`}
                        etiquetaOculta
                        type="number"
                        min={0}
                        value={String(renglon.nc_previas)}
                        onChange={(e) => {
                          const n = Number(e.target.value)
                          if (Number.isInteger(n) && n >= 0) void guardar(renglon, { nc_previas: n })
                        }}
                      />
                    </td>
                    <td style={{ ...celda, textAlign: 'center', color: 'var(--texto-dim)' }}>{puntos}</td>
                    <td style={{ ...celda, textAlign: 'center', fontWeight: 600 }}>{auditorias}</td>

                    {MESES_CORTOS.map((mes, indice) => {
                      const puesto = meses.find((m) => m.mes === indice + 1)
                      return (
                        <td key={mes} style={{ ...celda, padding: '6px 2px', textAlign: 'center' }}>
                          <CeldaMes
                            mes={indice + 1}
                            etiqueta={mes}
                            puesto={puesto}
                            proceso={renglon.proceso?.nombre ?? 'este proceso'}
                            alCambiar={(modalidad) =>
                              void guardar(renglon, {
                                meses: alternarMes(meses, indice + 1, modalidad) as unknown as Json,
                              })
                            }
                          />
                        </td>
                      )
                    })}

                    {enBorrador && (
                      <td style={celda}>
                        <Button
                          variante="fantasma"
                          tamano="sm"
                          onClick={() => quitar(renglon)}
                          title={`Quitar ${renglon.proceso?.nombre ?? 'el proceso'} del programa`}
                        >
                          Quitar
                        </Button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', maxWidth: 320 }}>
          <Select
            etiqueta="Añadir un proceso"
            marcador={disponibles.length === 0 ? 'No queda ninguno por añadir' : 'Elige un proceso'}
            value={nuevoProceso}
            disabled={disponibles.length === 0}
            ayuda="El valor y las no conformidades se proponen solos; los dos se cambian en la parrilla."
            onChange={(e) => setNuevoProceso(e.target.value)}
          >
            {disponibles.map((proceso) => (
              <option key={proceso.id} value={proceso.id}>{proceso.nombre}</option>
            ))}
          </Select>
        </div>
        <Button variante="secundario" onClick={anadir} disabled={!nuevoProceso} cargando={ocupado}>
          Añadir
        </Button>
        {renglones.length > 0 && (
          <Button variante="fantasma" onClick={traerNc} cargando={ocupado}>
            Traer las NC de {programa.anio - 1}
          </Button>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--texto-dim)', marginTop: 14, marginBottom: 0 }}>
        Puntos = valor × no conformidades del año anterior. Hasta {UMBRAL_PUNTOS} puntos, una
        auditoría al año; por encima, dos. Toca un mes para planearlo: una vez interna, otra
        externa, otra para quitarlo.
      </p>

      <Modal
        abierto={vistaPrevia}
        alCerrar={() => setVistaPrevia(false)}
        titulo="Programa anual de auditorías"
        ancho={900}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setVistaPrevia(false)}>Cerrar</Button>
            <Button variante="primario" onClick={imprimir}>Imprimir o guardar PDF</Button>
          </>
        }
      >
        {/* ⚠️ `sandbox` vacío, igual que la vista previa del informe: un solo
            renderizador para lo que se ve y lo que sale por la impresora, y el
            documento sin permisos. */}
        <iframe
          title="Vista previa del programa anual"
          srcDoc={documentoImprimible(tituloDelProgramaAnual(programa), html)}
          sandbox=""
          style={{
            width: '100%',
            height: 'min(calc(var(--vh-full) * 0.55), 720px)',
            border: '1px solid var(--borde)',
            borderRadius: 4,
            background: '#fff',
          }}
        />
      </Modal>
    </div>
  )
}

/**
 * Una celda de mes.
 *
 * ⚠️ **Tres estados en un solo toque**: vacío → interna → externa → vacío. Es la
 * parrilla de un papel que se rellena a mano; abrir un desplegable por celda
 * serían ciento treinta y dos desplegables.
 *
 * ⚠️ **El color no es la única señal** (WCAG 1.4.1): la letra `I`/`E` va dentro
 * y el `title` lo dice con palabras.
 */
function CeldaMes({
  mes,
  etiqueta,
  puesto,
  proceso,
  alCambiar,
}: {
  mes: number
  etiqueta: string
  puesto: MesPlaneado | undefined
  proceso: string
  alCambiar: (modalidad: 'interna' | 'externa') => void
}) {
  const siguiente: 'interna' | 'externa' = puesto?.modalidad === 'interna' ? 'externa' : 'interna'

  const descripcion = puesto
    ? `${etiqueta}: auditoría ${puesto.modalidad} de ${proceso}`
    : `${etiqueta}: sin auditoría planeada para ${proceso}`

  return (
    <button
      type="button"
      onClick={() => alCambiar(siguiente)}
      title={descripcion}
      aria-label={descripcion}
      style={{
        width: 28,
        height: 28,
        borderRadius: 4,
        border: `1px solid var(--borde)`,
        background: puesto ? 'var(--superficie)' : 'transparent',
        color: puesto?.modalidad === 'externa' ? 'var(--info)' : 'var(--verde)',
        fontWeight: 700,
        fontSize: 12,
        cursor: 'pointer',
        fontFamily: 'var(--fuente-texto), sans-serif',
      }}
    >
      {puesto ? (puesto.modalidad === 'interna' ? 'I' : 'E') : ''}
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {mes}
      </span>
    </button>
  )
}
