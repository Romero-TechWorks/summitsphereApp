'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import type { Proyecto } from '@/lib/queries/proyectos'
import {
  actualizarEntrada,
  crearEntrada,
  listarBitacora,
  type DatosEntrada,
  type EntradaConAutor,
} from '@/lib/queries/bitacora'
import {
  TIPOS_BITACORA,
  TIPOS_BITACORA_MANUALES,
  etiquetaDe,
  tonoDe,
} from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Textarea from '@/components/ui/Textarea'

const FORM_ENTRADA = 'form-bitacora'

const esquema = z.object({
  tipo: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Hace falta una fecha'),
  titulo: z.string().trim().min(1, 'Di en una línea qué pasó'),
  detalle: z.string().trim(),
  participantes: z.string().trim(),
})

type Campos = z.infer<typeof esquema>
type EnEdicion = { modo: 'nueva' } | { modo: 'editar'; entrada: EntradaConAutor } | null

/**
 * La bitácora del proyecto [F01·B4].
 *
 * Lo que hoy vive en la memoria del consultor y en un hilo de correo: cuándo se
 * fue a la planta, qué se entregó, qué se acordó y qué salió mal. Es lo primero
 * que se abre antes de una reunión con el cliente.
 *
 * ⚠️ **Aquí no hay borrar.** Una entrada equivocada se corrige —sólo su autor o
 * un socio— o se aclara con otra entrada. Si una bitácora se pudiera vaciar, no
 * serviría para lo único que existe: contar lo que pasó.
 *
 * ⚠️ Las entradas de **cambio de etapa las escribe la base** y no se editan
 * desde aquí: son el reflejo de un hecho, no una nota de alguien.
 */
export default function PanelBitacora({
  proyecto,
  puedoEditar,
  esSocio,
}: {
  proyecto: Proyecto
  puedoEditar: boolean
  esSocio: boolean
}) {
  const cliente = useQueryClient()
  const [edicion, setEdicion] = useState<EnEdicion>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  const { data: entradas = [], isPending, error: fallo } = useQuery({
    queryKey: queryKeys.cartera.bitacora(proyecto.id),
    queryFn: () => listarBitacora(proyecto.id),
  })

  async function guardar(datos: DatosEntrada) {
    if (!edicion) return
    setGuardando(true)
    setError(null)

    try {
      const autor = usuario ? { id: usuario.id, nombre: usuario.nombre } : null

      const { fila, encolado } =
        edicion.modo === 'nueva'
          ? await crearEntrada(proyecto, datos, autor)
          : await actualizarEntrada(edicion.entrada, datos)

      aplicarEscritura<EntradaConAutor>({
        cliente,
        clave: queryKeys.cartera.bitacora(proyecto.id),
        encolado,
        actualizar: (previo) =>
          [...previo.filter((e) => e.id !== fila.id), fila].sort(ordenar),
      })

      setEdicion(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  if (isPending) return <Skeleton alto={120} radio={4} />
  if (fallo) return <Aviso tono="error">{mensajeDeError(fallo)}</Aviso>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', maxWidth: 520, lineHeight: 1.55 }}>
          Lo que ha pasado con este cliente, en orden. Los cambios de etapa se anotan solos.
        </p>
        {puedoEditar && (
          <Button variante="primario" onClick={() => { setError(null); setEdicion({ modo: 'nueva' }) }}>
            Anotar algo
          </Button>
        )}
      </div>

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {entradas.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', lineHeight: 1.55, maxWidth: 620 }}>
          Todavía no hay nada anotado. La primera visita, el acta de arranque, el compromiso que se
          hizo por teléfono: eso es lo que dentro de seis meses nadie va a recordar.
        </p>
      ) : (
        entradas.map((entrada) => {
          const automatica = entrada.tipo === 'cambio_etapa'
          const mia = entrada.creado_por === usuario?.id
          const editable = puedoEditar && !automatica && (mia || esSocio)

          return (
            <div key={entrada.id} style={{ padding: '11px 2px', borderBottom: '1px solid var(--borde)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontSize: 12.5, color: 'var(--texto-dim)', flexShrink: 0 }}>
                  {formatDateOnly(entrada.fecha)}
                </span>
                <Badge tono={tonoDe(TIPOS_BITACORA, entrada.tipo)}>
                  {etiquetaDe(TIPOS_BITACORA, entrada.tipo)}
                </Badge>
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>{entrada.titulo}</span>
                {editable && (
                  <Button
                    variante="fantasma"
                    tamano="sm"
                    onClick={() => { setError(null); setEdicion({ modo: 'editar', entrada }) }}
                  >
                    Corregir
                  </Button>
                )}
              </div>

              {entrada.detalle && (
                <p style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                  {entrada.detalle}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4, fontSize: 12.5, color: 'var(--texto-dim)' }}>
                {entrada.participantes.length > 0 && <span>Con: {entrada.participantes.join(', ')}</span>}
                <span>{automatica ? 'Anotado por el sistema' : entrada.autor?.nombre ?? 'Alguien de la firma'}</span>
              </div>
            </div>
          )
        })
      )}

      <Modal
        abierto={edicion !== null}
        alCerrar={() => setEdicion(null)}
        titulo={edicion?.modo === 'editar' ? 'Corregir la entrada' : 'Anotar en la bitácora'}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setEdicion(null)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_ENTRADA} cargando={guardando}>
              Guardar
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 14 }}><Aviso tono="error">{error}</Aviso></div>}
        {edicion && (
          <Formulario
            key={edicion.modo === 'editar' ? edicion.entrada.id : 'nueva'}
            inicial={edicion.modo === 'editar' ? edicion.entrada : undefined}
            alEnviar={guardar}
          />
        )}
      </Modal>
    </div>
  )
}

function Formulario({
  inicial,
  alEnviar,
}: {
  inicial?: EntradaConAutor
  alEnviar: (datos: DatosEntrada) => void
}) {
  const [campos, setCampos] = useState<Campos>({
    tipo: inicial?.tipo ?? 'visita',
    // Por defecto, hoy: casi siempre se anota el mismo día, y `hoyISO()` da la
    // fecha local — `new Date().toISOString()` daría la de mañana a las 18:00.
    fecha: inicial?.fecha ?? hoyISO(),
    titulo: inicial?.titulo ?? '',
    detalle: inicial?.detalle ?? '',
    participantes: inicial?.participantes.join(', ') ?? '',
  })
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})

  function escribir(campo: keyof Campos, valor: string) {
    setCampos((previo) => ({ ...previo, [campo]: valor }))
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()

    const resultado = esquema.safeParse(campos)
    if (!resultado.success) {
      const porCampo = resultado.error.flatten().fieldErrors
      setErrores(
        Object.fromEntries(
          Object.entries(porCampo).map(([campo, mensajes]) => [campo, mensajes?.[0] ?? '']),
        ),
      )
      return
    }

    setErrores({})
    const d = resultado.data

    alEnviar({
      tipo: d.tipo,
      fecha: d.fecha,
      titulo: d.titulo,
      detalle: d.detalle || null,
      participantes: d.participantes
        .split(',')
        .map((nombre) => nombre.trim())
        .filter(Boolean),
    })
  }

  return (
    <form id={FORM_ENTRADA} onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <Select etiqueta="Qué fue" value={campos.tipo} onChange={(e) => escribir('tipo', e.target.value)}>
          {/* Sin «cambio de etapa»: ésas las escribe la base cuando alguien
              mueve el proyecto. */}
          {TIPOS_BITACORA_MANUALES.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>

        <Input
          etiqueta="Cuándo"
          type="date"
          required
          value={campos.fecha}
          error={errores.fecha}
          onChange={(e) => escribir('fecha', e.target.value)}
        />
      </div>

      <Input
        etiqueta="En una línea"
        ayuda="«Visita de arranque en Planta Toluca»."
        required
        autoFocus
        value={campos.titulo}
        error={errores.titulo}
        onChange={(e) => escribir('titulo', e.target.value)}
      />

      <Textarea
        etiqueta="Detalle"
        rows={4}
        ayuda="Lo que se acordó, con quién y para cuándo. Esto es lo que se relee antes de la siguiente reunión."
        value={campos.detalle}
        onChange={(e) => escribir('detalle', e.target.value)}
      />

      <Input
        etiqueta="Participantes"
        ayuda="Separados por comas."
        value={campos.participantes}
        onChange={(e) => escribir('participantes', e.target.value)}
      />
    </form>
  )
}

/** Lo más reciente arriba; a igual fecha, lo último capturado. */
function ordenar(a: EntradaConAutor, b: EntradaConAutor): number {
  if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha)
  return b.creado_en.localeCompare(a.creado_en)
}
