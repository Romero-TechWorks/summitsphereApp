'use client'

import { Fragment, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { normalizar } from '@/lib/utils/texto'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import {
  ESTADOS_VENCIMIENTO,
  diasEntre,
  esCritico,
  estadoVisible,
} from '@/lib/cumplimiento/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { listarAdjuntos } from '@/lib/queries/adjuntos'
import { listarAreas } from '@/lib/queries/obligaciones'
import {
  actualizarVencimiento,
  crearVencimiento,
  eliminarVencimiento,
  listarVencimientos,
  type ContextoVencimiento,
  type DatosVencimiento,
  type VencimientoConContexto,
} from '@/lib/queries/vencimientos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import { IconoCalendario } from '@/components/ui/Iconos'
import PanelAdjuntos from '@/components/adjuntos/PanelAdjuntos'
import FormularioVencimiento from './FormularioVencimiento'
import SelectorSitio, { enElSitio, useSitioSeleccionado } from './SelectorSitio'

const FORM = 'form-vencimiento'

type Filtro = 'criticos' | 'todos'
type Vista = 'lista' | 'mes'

/** Qué modal está abierto. */
type Dialogo =
  | { modo: 'alta' }
  | { modo: 'edicion'; vencimiento: VencimientoConContexto }
  | { modo: 'renovacion'; vencimiento: VencimientoConContexto }
  | null

/**
 * ⚠️ **La advertencia de datos personales** — decisión 6 del dueño (22 sep
 * 2026), hueco 42. Un examen médico o un expediente de la NOM-035 trae datos de
 * trabajadores. **Corta, en español llano, y no bloquea**: una advertencia larga
 * no se lee, y una que no se lee da falsa cobertura. La retención y la supresión
 * son deuda declarada, no olvido (docs/08).
 */
const AVISO_DATOS_PERSONALES =
  'Este expediente puede contener datos personales de trabajadores. Súbelo sólo si el cliente lo autorizó y no incluyas datos de salud si puedes evitarlo. PDF o foto, hasta 25 MB.'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const

/** `2027-03` → «Marzo 2027». Sobre el texto, sin `new Date()`. */
function nombreDeMes(clave: string): string {
  const [anio, mes] = clave.split('-')
  return `${MESES[Number(mes) - 1] ?? mes} ${anio}`
}

function textoDeDias(dias: number): string {
  if (dias === 0) return 'vence hoy'
  if (dias < 0) return `venció hace ${-dias} día${dias === -1 ? '' : 's'}`
  return `faltan ${dias} día${dias === 1 ? '' : 's'}`
}

/**
 * **Los vencimientos** [F05·B2]: lo que caduca, y cuándo.
 *
 * Es trabajo de **oficina** (docs/13 §5.5): no lleva precarga. Pero sigue las
 * reglas del offline igual —lectura por `useQuery`, escritura por la cola,
 * desplegables por su clave, filtros en memoria—.
 *
 * ⚠️ **El estado que se pinta se recalcula contra la fecha de hoy**
 * (`estadoVisible()`): el cron lo pone al día una vez al día, y una lista con
 * tres días en la caché diría «vigente» de algo que ya venció.
 *
 * ⚠️ **Por defecto enseña lo crítico** —vencido, por vencer y en trámite—: la
 * lista completa de un cliente con cuarenta estudios vigentes esconde los dos
 * que importan. Los renovados y los que no aplican, sólo si se piden.
 */
export default function PanelVencimientos({ orgId }: { orgId: string }) {
  const cliente = useQueryClient()
  const clave = queryKeys.cumplimiento.vencimientos()
  const { sitioId, sitios, elegir } = useSitioSeleccionado(orgId)

  const [filtro, setFiltro] = useState<Filtro>('criticos')
  const [vista, setVista] = useState<Vista>('lista')
  const [verHistoria, setVerHistoria] = useState(false)
  const [texto, setTexto] = useState('')
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: todos = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: listarVencimientos,
  })
  const { data: areas = [] } = useQuery({
    queryKey: queryKeys.cumplimiento.areas(orgId),
    queryFn: () => listarAreas(orgId),
  })

  const hoy = hoyISO()
  const delCliente = todos.filter((v) => v.org_id === orgId && enElSitio(v.sitio_id, sitioId))
  const conEstado = delCliente.map((v) => ({ v, estado: estadoVisible(v, hoy), dias: diasEntre(hoy, v.vence_en) }))
  const criticos = conEstado.filter((x) => esCritico(x.estado))
  const vencidos = conEstado.filter((x) => x.estado === 'vencido').length

  const aguja = normalizar(texto)
  const visibles = conEstado.filter(({ v, estado }) => {
    if (filtro === 'criticos' && !esCritico(estado)) return false
    if (!verHistoria && (estado === 'renovado' || estado === 'no_aplica')) return false
    if (!aguja) return true
    return [v.nombre, v.tipo?.nombre, v.obligacion?.elemento, v.notas]
      .some((t) => normalizar(t ?? '').includes(aguja))
  })

  // La vista por mes: agrupa por el texto `YYYY-MM` de la fecha, en orden.
  const porMes = new Map<string, typeof visibles>()
  for (const x of visibles) {
    const mes = x.v.vence_en.slice(0, 7)
    porMes.set(mes, [...(porMes.get(mes) ?? []), x])
  }

  const nombreDeSitio = (id: string | null) => (id ? sitios.find((s) => s.id === id)?.nombre ?? 'Sitio' : null)
  const nombreDeArea = (id: string | null) => (id ? areas.find((a) => a.id === id)?.nombre ?? null : null)

  function reemplazar(fila: VencimientoConContexto, encolado: boolean, ademas?: (p: VencimientoConContexto[]) => VencimientoConContexto[]) {
    aplicarEscritura<VencimientoConContexto>({
      cliente, clave, encolado,
      actualizar: (p) => {
        const con = p.some((x) => x.id === fila.id) ? p.map((x) => (x.id === fila.id ? fila : x)) : [...p, fila]
        return (ademas ? ademas(con) : con).sort((a, b) => a.vence_en.localeCompare(b.vence_en))
      },
    })
  }

  async function guardar(datos: DatosVencimiento, contexto: ContextoVencimiento) {
    if (!dialogo) return
    setGuardando(true)
    setError(null)
    try {
      if (dialogo.modo === 'edicion') {
        const { fila, encolado } = await actualizarVencimiento(dialogo.vencimiento, datos, contexto)
        reemplazar(fila, encolado)
      } else if (dialogo.modo === 'renovacion') {
        const anterior = dialogo.vencimiento
        const { fila, encolado } = await crearVencimiento(
          orgId,
          { ...datos, renueva_id: anterior.id },
          { ...contexto, organizacion: anterior.organizacion },
        )
        // La base marca la anterior como renovada en la misma escritura; la
        // caché lo refleja ya, para que sin señal no siga en rojo.
        reemplazar(fila, encolado, (p) => p.map((x) => (x.id === anterior.id ? { ...x, estado: 'renovado' } : x)))
      } else {
        const { fila, encolado } = await crearVencimiento(orgId, datos, contexto)
        reemplazar(fila, encolado)
      }
      setDialogo(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function quitar(v: VencimientoConContexto) {
    setGuardando(true)
    setError(null)
    try {
      const { encolado } = await eliminarVencimiento(v)
      aplicarEscritura<VencimientoConContexto>({
        cliente, clave, encolado,
        // Quitar una renovación devuelve la anterior a su ciclo (lo hace la base).
        actualizar: (p) => p
          .filter((x) => x.id !== v.id)
          .map((x) => (x.id === v.renueva_id && x.estado === 'renovado' ? { ...x, estado: 'vigente' } : x)),
      })
      setDialogo(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  const filas = (lista: typeof visibles) => (
    <Lista etiqueta="Vencimientos">
      {lista.map(({ v, estado, dias }) => {
        const donde = [nombreDeSitio(v.sitio_id), nombreDeArea(v.area_id)].filter(Boolean).join(' · ')
        return (
          <Fila
            key={v.id}
            Icono={IconoCalendario}
            titulo={v.nombre}
            meta={
              <>
                <span className="mono">{formatDateOnly(v.vence_en)}</span>
                {esCritico(estado) || estado === 'vigente' ? <span>{textoDeDias(dias)}</span> : null}
                {v.tipo && <span>{v.tipo.nombre}</span>}
                {donde && <span>{donde}</span>}
                <span>{v.responsable ? v.responsable.nombre : 'Sin responsable'}</span>
              </>
            }
            derecha={<Badge tono={tonoDe(ESTADOS_VENCIMIENTO, estado)}>{etiquetaDe(ESTADOS_VENCIMIENTO, estado)}</Badge>}
            onClick={() => { setError(null); setDialogo({ modo: 'edicion', vencimiento: v }) }}
          />
        )
      })}
    </Lista>
  )

  const editando = dialogo?.modo === 'edicion' ? dialogo.vencimiento : null

  return (
    <>
      <div style={{ maxWidth: 420, marginBottom: 14 }}>
        <SelectorSitio sitioId={sitioId} sitios={sitios} elegir={elegir} />
      </div>

      {vencidos > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="error">
            <strong>{vencidos} vencido{vencidos === 1 ? '' : 's'}.</strong> Ante la autoridad, esto es un
            incumplimiento hoy. Si la renovación ya está pedida, márcalo «En trámite»; si ya llegó, regístrala.
          </Aviso>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            ['criticos', `Críticos (${criticos.length})`],
            ['todos', `Todos (${conEstado.length})`],
          ] as [Filtro, string][]).map(([valor, etiqueta]) => (
            <Button key={valor} variante={filtro === valor ? 'primario' : 'fantasma'} tamano="sm" onClick={() => setFiltro(valor)} style={{ minHeight: 40 }}>
              {etiqueta}
            </Button>
          ))}
          <span aria-hidden style={{ width: 8 }} />
          {([
            ['lista', 'Lista'],
            ['mes', 'Por mes'],
          ] as [Vista, string][]).map(([valor, etiqueta]) => (
            <Button key={valor} variante={vista === valor ? 'secundario' : 'fantasma'} tamano="sm" onClick={() => setVista(valor)} style={{ minHeight: 40 }} aria-pressed={vista === valor}>
              {etiqueta}
            </Button>
          ))}
        </div>
        <Button variante="primario" onClick={() => { setError(null); setDialogo({ modo: 'alta' }) }}>
          Nuevo vencimiento
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ flex: '1 1 220px', maxWidth: 320 }}>
          <Input etiqueta="Buscar" etiquetaOculta placeholder="Nombre, tipo u obligación" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        <Checkbox etiqueta="Ver renovados y los que no aplican" checked={verHistoria} onChange={(e) => setVerHistoria(e.target.checked)} />
      </div>

      {error && !dialogo && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={
            delCliente.length === 0
              ? 'Nada registrado todavía'
              : filtro === 'criticos'
                ? 'Nada crítico'
                : 'Nada con ese filtro'
          }
          descripcion={
            delCliente.length === 0
              ? 'Registra aquí lo que caduca: estudios, dictámenes, licencias, recargas, exámenes médicos. Con la fecha de emisión y la vigencia, la app calcula cuándo vence y avisa al responsable a 90, 60, 30 y 7 días.'
              : filtro === 'criticos'
                ? 'Ningún vencimiento de este cliente está vencido, por vencer en 90 días o en trámite.'
                : 'Prueba con otro texto, o marca «Ver renovados».'
          }
          accion={delCliente.length === 0 ? <Button variante="primario" onClick={() => setDialogo({ modo: 'alta' })}>Registrar el primero</Button> : null}
        />
      ) : vista === 'lista' ? (
        filas(visibles)
      ) : (
        [...porMes.entries()].map(([mes, lista]) => (
          <Fragment key={mes}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: mes < hoy.slice(0, 7) ? 'var(--error)' : 'var(--texto-dim)', margin: '18px 0 2px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {nombreDeMes(mes)}
            </h3>
            {filas(lista)}
          </Fragment>
        ))
      )}

      <Modal
        abierto={dialogo !== null}
        alCerrar={() => setDialogo(null)}
        titulo={
          dialogo?.modo === 'edicion'
            ? dialogo.vencimiento.nombre
            : dialogo?.modo === 'renovacion'
              ? `Renovación · ${dialogo.vencimiento.nombre}`
              : 'Nuevo vencimiento'
        }
        ancho={640}
        pie={
          <>
            {editando && (
              <AccionesDeEdicion
                vencimiento={editando}
                ocupado={guardando}
                alQuitar={() => quitar(editando)}
                alRenovar={() => { setError(null); setDialogo({ modo: 'renovacion', vencimiento: editando }) }}
              />
            )}
            <Button variante="fantasma" onClick={() => setDialogo(null)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM} cargando={guardando}>
              {dialogo?.modo === 'edicion' ? 'Guardar' : dialogo?.modo === 'renovacion' ? 'Registrar renovación' : 'Registrar'}
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {dialogo?.modo === 'renovacion' && (
          <p style={{ fontSize: 13, color: 'var(--texto-dim)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Se da de alta la emisión nueva y la anterior —vence el {formatDateOnly(dialogo.vencimiento.vence_en)}— queda como
            <strong> renovada</strong>, con su PDF, para el historial. Los avisos empiezan de cero con la fecha nueva.
          </p>
        )}
        {editando?.estado === 'renovado' && (
          <p style={{ fontSize: 13, color: 'var(--texto-dim)', margin: '0 0 12px' }}>
            Esta emisión ya se renovó. Se conserva como historial y no genera avisos.
          </p>
        )}
        {dialogo && (
          <FormularioVencimiento
            key={dialogo.modo === 'alta' ? 'alta' : `${dialogo.modo}-${dialogo.vencimiento.id}`}
            id={FORM}
            orgId={orgId}
            sitios={sitios}
            sitioInicial={sitioId}
            inicial={dialogo.modo === 'edicion' ? dialogo.vencimiento : undefined}
            renuevaA={dialogo.modo === 'renovacion' ? dialogo.vencimiento : undefined}
            alEnviar={guardar}
          />
        )}
        {editando && (
          <div style={{ marginTop: 20 }}>
            <PanelAdjuntos
              orgId={orgId}
              destino={{ vencimiento_id: editando.id }}
              ayuda={AVISO_DATOS_PERSONALES}
            />
          </div>
        )}
      </Modal>
    </>
  )
}

/**
 * «Quitar» y «Registrar renovación», sólo cuando la base los va a aceptar.
 *
 * ⚠️ Un vencimiento **con adjunto no se quita** —el dictamen es evidencia, lo
 * impide la política— y ofrecer un botón que termina en cero filas es peor que
 * no ofrecerlo. Se pregunta con la misma clave que usa `PanelAdjuntos`, así que
 * no es una consulta de más.
 */
function AccionesDeEdicion({
  vencimiento,
  ocupado,
  alQuitar,
  alRenovar,
}: {
  vencimiento: VencimientoConContexto
  ocupado: boolean
  alQuitar: () => void
  alRenovar: () => void
}) {
  const { data: adjuntos = [], isPending } = useQuery({
    queryKey: queryKeys.adjuntos.de('vencimiento_id', vencimiento.id),
    queryFn: () => listarAdjuntos(vencimiento.org_id, { vencimiento_id: vencimiento.id }),
  })

  const puedeRenovar = vencimiento.estado !== 'renovado' && vencimiento.estado !== 'no_aplica'

  return (
    <span style={{ display: 'inline-flex', gap: 8, marginRight: 'auto', flexWrap: 'wrap' }}>
      {!isPending && adjuntos.length === 0 && (
        <Button variante="peligro" onClick={alQuitar} disabled={ocupado}>Quitar</Button>
      )}
      {puedeRenovar && (
        <Button variante="secundario" onClick={alRenovar} disabled={ocupado}>Registrar renovación</Button>
      )}
    </span>
  )
}
