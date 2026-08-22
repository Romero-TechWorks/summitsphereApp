'use client'

import { useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { conteo } from '@/lib/queries/cartera'
import { formatDateOnly } from '@/lib/utils/dates'
import {
  crearDocumento,
  listarDocumentos,
  type DatosDocumento,
  type DocumentoEnLista,
} from '@/lib/queries/documentos'
import { ESTADOS_DOCUMENTO, ESTADOS_VERSION, TIPOS_DOCUMENTO } from '@/lib/sistemas/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { normalizar } from '@/lib/utils/texto'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import { IconoDocumento } from '@/components/ui/Iconos'
import ExpedienteDocumento from './ExpedienteDocumento'
import FormularioDocumento from './FormularioDocumento'

const FORM = 'form-alta-documento'

/**
 * **La lista maestra de documentos** [F02·B2] — un entregable en sí mismo.
 *
 * Lista y expediente en la misma pestaña: el detalle se abre con
 * `?documento=<id>`, igual que un proyecto se abre con `?proyecto=<id>` sobre su
 * pestaña. Los dominios son páginas con pestañas y las únicas rutas propias son
 * las de detalle de la cartera (docs/03 §2.1).
 */
export default function PanelDocumentos({ orgId }: { orgId: string }) {
  const cliente = useQueryClient()
  const ruta = usePathname()
  const params = useSearchParams()
  const abierto = params.get('documento')
  const clave = queryKeys.sistemas.documentos(orgId)

  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState('')
  const [estado, setEstado] = useState('')
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: documentos = [], isPending, error: fallo } = useQuery({
    queryKey: clave,
    queryFn: () => listarDocumentos(orgId),
    enabled: Boolean(orgId),
  })

  // ⚠️ Ninguno de los tres filtros entra en la clave de caché: la biblioteca se
  // descarga una vez y se filtra en memoria (CLAUDE.md · reglas del offline, 7).
  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    return documentos.filter((d) => {
      if (tipo && d.tipo !== tipo) return false
      if (estado && d.estado !== estado) return false
      if (!aguja) return true
      return (
        normalizar(d.codigo).includes(aguja) ||
        normalizar(d.titulo).includes(aguja) ||
        normalizar(d.proceso?.nombre ?? '').includes(aguja)
      )
    })
  }, [documentos, texto, tipo, estado])

  const volverHref = `${ruta}?tab=documentos&org=${orgId}`

  async function guardarNuevo(datos: DatosDocumento) {
    setGuardando(true)
    setError(null)

    try {
      const { fila, encolado } = await crearDocumento(orgId, datos)

      aplicarEscritura<DocumentoEnLista>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => [fila, ...previo.filter((d) => d.id !== fila.id)],
      })

      setModal(false)
    } catch (problema) {
      // ⚠️ Aquí sale el código repetido: un 23505 del índice único. El motivo se
      // pinta tal cual, porque «no se pudo guardar» a secas es un catch vacío
      // con mejor letra.
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  if (abierto) {
    if (isPending) return <Skeleton alto={240} radio={4} />

    const documento = documentos.find((d) => d.id === abierto)
    if (!documento) {
      return (
        <EstadoVacio
          titulo="Ese documento no está en esta biblioteca"
          descripcion="O se movió, o el enlace es de otro cliente. Vuelve a la lista y ábrelo desde ahí."
        />
      )
    }

    return <ExpedienteDocumento documento={documento} orgId={orgId} volverHref={volverHref} />
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div style={{ flex: '1 1 200px', maxWidth: 280 }}>
          <Input
            etiqueta="Buscar"
            etiquetaOculta
            placeholder="Buscar por código, título o proceso"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <div style={{ width: 170 }}>
          <Select
            etiqueta="Tipo"
            etiquetaOculta
            marcador="Todos los tipos"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS_DOCUMENTO.map((o) => (
              <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
            ))}
          </Select>
        </div>

        <div style={{ width: 170 }}>
          <Select
            etiqueta="Estado"
            etiquetaOculta
            marcador="Todos los estados"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            {ESTADOS_DOCUMENTO.map((o) => (
              <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
            ))}
          </Select>
        </div>

        <Button variante="primario" onClick={() => { setError(null); setModal(true) }}>
          Nuevo documento
        </Button>
      </div>

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {isPending ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
        </div>
      ) : fallo ? (
        <EstadoVacio titulo="No se pudo leer la biblioteca" descripcion={mensajeDeError(fallo)} />
      ) : visibles.length === 0 ? (
        <EstadoVacio
          titulo={documentos.length === 0 ? 'La biblioteca de este cliente está vacía' : 'Nada con esos filtros'}
          descripcion={
            documentos.length === 0
              ? 'El control documental es lo que un cliente cree que está comprando cuando contrata una implementación. Da de alta el documento, sube su Word o su PDF, y la app lo convierte a texto para leerlo y editarlo aquí.'
              : 'Prueba con otro texto, o quita el filtro de tipo o de estado.'
          }
          accion={documentos.length === 0 ? <Button variante="primario" onClick={() => setModal(true)}>Dar de alta el primero</Button> : null}
        />
      ) : (
        <Lista etiqueta="Lista maestra de documentos">
          {visibles.map((documento) => (
            <Fila
              key={documento.id}
              href={`${ruta}?tab=documentos&org=${orgId}&documento=${documento.id}`}
              Icono={IconoDocumento}
              titulo={
                <>
                  <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                    {documento.codigo}
                  </span>
                  {documento.titulo}
                </>
              }
              meta={
                <>
                  <span>{etiquetaDe(TIPOS_DOCUMENTO, documento.tipo)}</span>
                  {documento.proceso && <span>{documento.proceso.nombre}</span>}
                  <span>
                    {conteo(documento.versiones)} {conteo(documento.versiones) === 1 ? 'versión' : 'versiones'}
                  </span>
                  {conteo(documento.clausulas) > 0 && (
                    <span>{conteo(documento.clausulas)} cláusulas cubiertas</span>
                  )}
                  {documento.vigente?.fecha_aprobacion && (
                    <span>Aprobada el {formatDateOnly(documento.vigente.fecha_aprobacion)}</span>
                  )}
                </>
              }
              derecha={
                <>
                  {documento.vigente && (
                    <Badge tono={tonoDe(ESTADOS_VERSION, documento.vigente.estado)}>
                      v{documento.vigente.version}
                    </Badge>
                  )}
                  <Badge tono={tonoDe(ESTADOS_DOCUMENTO, documento.estado)}>
                    {etiquetaDe(ESTADOS_DOCUMENTO, documento.estado)}
                  </Badge>
                </>
              }
            />
          ))}
        </Lista>
      )}

      <Modal
        abierto={modal}
        alCerrar={() => setModal(false)}
        titulo="Nuevo documento"
        pie={
          <>
            <Button variante="fantasma" onClick={() => setModal(false)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM} cargando={guardando}>
              Dar de alta
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        <FormularioDocumento id={FORM} orgId={orgId} alEnviar={guardarNuevo} />
      </Modal>
    </>
  )
}
