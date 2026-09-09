'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly } from '@/lib/utils/dates'
import {
  crearAccion,
  estaVencida,
  listarAccionesDelHallazgo,
  type AccionConContexto,
  type DatosAccion,
} from '@/lib/queries/acciones'
import { listarProcesos } from '@/lib/queries/procesos'
import { listarContactos } from '@/lib/queries/cartera'
import {
  CRITERIO_ACCION,
  ESTADOS_ACCION,
  TIPOS_ACCION,
  avancePromedio,
  folioDeAccion,
} from '@/lib/acciones/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import type { HallazgoConContexto } from '@/lib/queries/hallazgos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { IconoAcciones } from '@/components/ui/Iconos'

/**
 * Las acciones de una no conformidad — **la mitad de abajo del `F-SG-06`**.
 *
 * ⚠️ **El papel tiene cuatro renglones y eso NO es un límite**: es lo que cabe en
 * una hoja. `acciones` es una tabla y admite las que hagan falta; al imprimir se
 * continúa en una segunda página.
 *
 * ⚠️ **El avance de la NC es el PROMEDIO del de sus acciones** (`F-SG-17`), y se
 * calcula en memoria sobre la lista ya bajada — no hay vista en la base, por lo
 * mismo que el tablero del lunes.
 */
export default function AccionesDelHallazgo({
  hallazgo,
}: {
  hallazgo: HallazgoConContexto
}) {
  const cliente = useQueryClient()
  const clave = queryKeys.acciones.delHallazgo(hallazgo.id)

  const [creando, setCreando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tipo, setTipo] = useState('accion_correctiva')
  const [descripcion, setDescripcion] = useState('')
  const [procesoId, setProcesoId] = useState(hallazgo.proceso_id ?? '')
  const [contactoId, setContactoId] = useState(hallazgo.responsable_contacto_id ?? '')
  const [fecha, setFecha] = useState('')

  const { data: acciones = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarAccionesDelHallazgo(hallazgo.id),
  })

  // ⚠️ Los desplegables también son datos: por `useQuery`. Sin señal, un `fetch`
  // suelto los deja vacíos y el guardado muere en la validación *antes* de
  // encolarse (CLAUDE.md · reglas del offline, 3).
  const { data: procesos = [] } = useQuery({
    queryKey: queryKeys.sistemas.procesos(hallazgo.org_id),
    queryFn: () => listarProcesos(hallazgo.org_id),
  })

  const { data: contactos = [] } = useQuery({
    queryKey: queryKeys.cartera.contactos(hallazgo.org_id),
    queryFn: () => listarContactos(hallazgo.org_id),
  })

  const promedio = avancePromedio(acciones)

  async function guardar() {
    setOcupado(true)
    setError(null)
    try {
      const datos: DatosAccion = {
        tipo,
        descripcion: descripcion.trim(),
        proceso_id: procesoId || null,
        responsable_id: null,
        responsable_contacto_id: contactoId || null,
        fecha_compromiso: fecha,
        monitoreo: null,
      }

      const { fila, encolado } = await crearAccion({
        hallazgoId: hallazgo.id,
        orgId: hallazgo.org_id,
        datos,
        contexto: {
          proceso: procesos.find((p) => p.id === procesoId)
            ? { id: procesoId, nombre: procesos.find((p) => p.id === procesoId)!.nombre, codigo: procesos.find((p) => p.id === procesoId)!.codigo }
            : null,
          responsable: null,
          contacto: contactos.find((c) => c.id === contactoId)
            ? { id: contactoId, nombre: contactos.find((c) => c.id === contactoId)!.nombre, puesto: contactos.find((c) => c.id === contactoId)!.puesto }
            : null,
        },
      })

      aplicarEscritura<AccionConContexto>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => [...previo, fila],
        // El tablero de acciones enseña estas mismas filas.
        ademasInvalidar: [queryKeys.acciones.lista()],
      })

      setCreando(false)
      setDescripcion('')
      setFecha('')
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h4
        style={{
          font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', margin: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}
      >
        <span>
          Acciones
          {promedio !== null && (
            <span className="mono" style={{ marginLeft: 8 }}>{promedio} % de avance</span>
          )}
        </span>
        {!creando && (
          <Button tamano="sm" variante="fantasma" onClick={() => { setError(null); setCreando(true) }}>
            Levantar acción
          </Button>
        )}
      </h4>

      {/* La compuerta del F-SG-07 §4: si el análisis dijo que no hacen falta, se
          dice, en vez de dejar la sección vacía sin explicación. */}
      {!hallazgo.requiere_acciones && acciones.length === 0 && (
        <Aviso tono="info">
          El análisis de causa concluyó que <strong>no se requieren acciones correctivas</strong>.
          La corrección puntual bastó.
        </Aviso>
      )}

      {error && <Aviso tono="error">{error}</Aviso>}

      {creando && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            paddingTop: 10, borderTop: '1px solid var(--verde-tinta)',
          }}
        >
          <Select etiqueta="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} ayuda={CRITERIO_ACCION[tipo]}>
            {TIPOS_ACCION.map((o) => (
              <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
            ))}
          </Select>

          <Textarea
            etiqueta="Qué se va a hacer"
            required
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px' }}>
              <Select
                etiqueta="Proceso"
                marcador="Sin proceso"
                value={procesoId}
                onChange={(e) => setProcesoId(e.target.value)}
                ayuda="El folio del cliente (AC-FA-01-25) se cuenta por proceso."
              >
                {procesos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Select>
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <Select
                etiqueta="Responsable"
                marcador="Sin asignar"
                value={contactoId}
                onChange={(e) => setContactoId(e.target.value)}
              >
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </Select>
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <Input
                etiqueta="Fecha compromiso"
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              tamano="sm"
              onClick={guardar}
              disabled={ocupado || descripcion.trim() === '' || fecha === ''}
            >
              {ocupado ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button tamano="sm" variante="fantasma" onClick={() => setCreando(false)} disabled={ocupado}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {!isPending && acciones.length === 0 && !creando && hallazgo.requiere_acciones && (
        <EstadoVacio
          titulo="Sin acciones todavía"
          descripcion="La corrección inmediata contiene el problema; la acción correctiva ataca la causa. Las dos van aquí."
        />
      )}

      {acciones.length > 0 && (
        <Lista etiqueta={`Acciones de ${hallazgo.folio}`}>
          {acciones.map((accion) => (
            <Fila
              key={accion.id}
              Icono={IconoAcciones}
              titulo={
                <>
                  <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                    {folioDeAccion(accion)}
                  </span>
                  {accion.descripcion}
                </>
              }
              meta={
                <>
                  <span>{etiquetaDe(TIPOS_ACCION, accion.tipo)}</span>
                  {accion.contacto && <span>{accion.contacto.nombre}</span>}
                  <span style={estaVencida(accion) ? { color: 'var(--error, #c0392b)' } : undefined}>
                    {estaVencida(accion) ? 'Venció el ' : 'Compromiso '}
                    {formatDateOnly(accion.fecha_compromiso)}
                  </span>
                </>
              }
              derecha={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ color: 'var(--texto-dim)' }}>{accion.avance_pct} %</span>
                  <Badge tono={tonoDe(ESTADOS_ACCION, accion.estado)}>
                    {etiquetaDe(ESTADOS_ACCION, accion.estado)}
                  </Badge>
                </span>
              }
            />
          ))}
        </Lista>
      )}
    </section>
  )
}
