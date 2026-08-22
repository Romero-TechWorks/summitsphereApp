'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import { listarNormasConClausulas } from '@/lib/queries/normas'
import {
  desvincularClausula,
  vincularClausula,
  type ClausulaDelDocumento,
  type DocumentoEnLista,
} from '@/lib/queries/documentos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { IconoMatriz } from '@/components/ui/Iconos'

/**
 * **Qué cláusulas cubre este documento.**
 *
 * Es la tabla que convierte *«tenemos un procedimiento de compras»* en *«la 8.4
 * está documentada»*: la matriz de requisitos [F02·B3] mira estos vínculos para
 * saber qué cláusula tiene documento y cuál no.
 *
 * ⚠️ El catálogo entero sale por `useQuery` con su clave —la misma que ya usa la
 * pestaña de Normas—, así que sin señal sigue estando (CLAUDE.md · reglas del
 * offline, 3). Es exactamente el caso que la regla nombra: un desplegable de
 * cláusulas vacío deja el guardado muerto antes de encolarse.
 */
export default function ClausulasDelDocumento({
  documento,
  vinculos,
  alCambiar,
}: {
  documento: DocumentoEnLista
  vinculos: ClausulaDelDocumento[]
  alCambiar: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [normaId, setNormaId] = useState('')
  const [clausulaId, setClausulaId] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: normas = [] } = useQuery({
    queryKey: queryKeys.normas.arbol(),
    queryFn: listarNormasConClausulas,
  })

  const disponibles = useMemo(() => {
    const norma = normas.find((n) => n.id === normaId)
    if (!norma) return []

    // El `Set` se construye AQUÍ dentro: fuera sería un objeto nuevo en cada
    // render y el `useMemo` no memorizaría nada.
    const yaVinculadas = new Set(vinculos.map((v) => v.clausula_id))

    // Sólo las auditables: los capítulos 0 a 3 de una ISO son objeto, alcance y
    // términos, y no se cubren con un procedimiento.
    return norma.clausulas.filter((c) => c.activa && c.auditable && !yaVinculadas.has(c.id))
  }, [normas, normaId, vinculos])

  async function vincular() {
    const norma = normas.find((n) => n.id === normaId)
    const clausula = norma?.clausulas.find((c) => c.id === clausulaId)

    if (!norma || !clausula) {
      setError('Elige una norma y una cláusula.')
      return
    }

    setTrabajando(true)
    setError(null)

    try {
      await vincularClausula(documento, {
        id: clausula.id,
        numero: clausula.numero,
        titulo: clausula.titulo,
        auditable: clausula.auditable,
        norma: { id: norma.id, clave: norma.clave, nombre: norma.nombre },
      })

      setClausulaId('')
      setAbierto(false)
      alCambiar()
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setTrabajando(false)
    }
  }

  async function quitar(vinculo: ClausulaDelDocumento) {
    setError(null)

    try {
      await desvincularClausula(vinculo, documento.codigo)
      alCambiar()
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', maxWidth: 560, lineHeight: 1.55 }}>
          Cada cláusula que este documento cubre. De aquí sale la respuesta a
          «¿con qué demostramos la 8.4?», y con eso se llena la matriz de requisitos.
        </p>
        <Button onClick={() => { setError(null); setAbierto(true) }}>Vincular cláusula</Button>
      </div>

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {vinculos.length === 0 ? (
        <EstadoVacio
          titulo="Este documento no cubre ninguna cláusula todavía"
          descripcion={
            normas.length === 0
              ? 'El catálogo de normas está vacío: un socio lo sube desde la pestaña Normas.'
              : 'Vincula las cláusulas que este documento responde. Es lo que hace que el avance de la certificación se calcule solo en vez de a mano en una hoja de cálculo.'
          }
          accion={normas.length > 0 ? <Button variante="primario" onClick={() => setAbierto(true)}>Vincular la primera</Button> : null}
        />
      ) : (
        <Lista etiqueta="Cláusulas que cubre el documento">
          {vinculos.map((vinculo) => (
            <Fila
              key={vinculo.clausula_id}
              Icono={IconoMatriz}
              titulo={
                <>
                  <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>
                    {vinculo.clausula?.numero ?? '—'}
                  </span>
                  {vinculo.clausula?.titulo ?? 'Cláusula dada de baja del catálogo'}
                </>
              }
              meta={vinculo.clausula?.norma ? <span>{vinculo.clausula.norma.nombre}</span> : null}
              derecha={
                <>
                  {vinculo.clausula?.norma && <Badge>{vinculo.clausula.norma.clave}</Badge>}
                  <Button
                    variante="fantasma"
                    tamano="sm"
                    onClick={() => quitar(vinculo)}
                    title={`Quitar la cláusula ${vinculo.clausula?.numero ?? ''}`}
                  >
                    Quitar
                  </Button>
                </>
              }
            />
          ))}
        </Lista>
      )}

      <Modal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo={`Vincular una cláusula a ${documento.codigo}`}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button variante="primario" cargando={trabajando} onClick={vincular}>Vincular</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <Aviso tono="error">{error}</Aviso>}

          <Select
            etiqueta="Norma"
            marcador={normas.length === 0 ? 'El catálogo está vacío' : 'Elige una norma'}
            value={normaId}
            onChange={(e) => { setNormaId(e.target.value); setClausulaId('') }}
          >
            {normas.filter((n) => n.activa).map((n) => (
              <option key={n.id} value={n.id}>{n.nombre} {n.version}</option>
            ))}
          </Select>

          <Select
            etiqueta="Cláusula"
            ayuda="Sólo las auditables: los capítulos de objeto, alcance y términos no se cubren con un documento."
            marcador={
              !normaId
                ? 'Elige primero la norma'
                : disponibles.length === 0
                  ? 'No queda ninguna por vincular'
                  : 'Elige una cláusula'
            }
            value={clausulaId}
            onChange={(e) => setClausulaId(e.target.value)}
          >
            {disponibles.map((c) => (
              <option key={c.id} value={c.id}>{c.numero} — {c.titulo}</option>
            ))}
          </Select>
        </div>
      </Modal>
    </>
  )
}
