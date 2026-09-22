'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { normalizar } from '@/lib/utils/texto'
import { AREAS_SUGERIDAS } from '@/lib/cumplimiento/catalogos'
import {
  cambiarActivaArea,
  crearArea,
  eliminarArea,
  listarAreas,
  type SitioArea,
} from '@/lib/queries/obligaciones'
import type { Sitio } from '@/lib/queries/cartera'
import Aviso from '@/components/ui/Aviso'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

/**
 * **Las áreas de un sitio** — decisión 2 del dueño.
 *
 * El recorrido va por áreas —recepción, comedor, site— porque un extintor falta
 * en un área, no en el domicilio. Se capturan aquí, junto a la matriz, que es
 * donde se prepara el recorrido.
 *
 * ⚠️ **Un área con obligaciones no se quita**: lo impide la política de DELETE,
 * porque el cascade se llevaría las evaluaciones y sus fotos saltándose el RLS.
 * Se da de baja. Por eso «Quitar» sólo se ofrece a las que están vacías — un
 * botón que termina en cero filas es peor que no ofrecerlo.
 */
export default function PanelAreas({
  orgId,
  sitio,
  enUso,
}: {
  orgId: string
  sitio: Sitio
  /** Las áreas que ya tienen obligaciones colgando. */
  enUso: ReadonlySet<string>
}) {
  const cliente = useQueryClient()
  const clave = queryKeys.cumplimiento.areas(orgId)
  const [nombre, setNombre] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: todas = [] } = useQuery({
    queryKey: clave,
    queryFn: () => listarAreas(orgId),
  })

  const areas = todas.filter((a) => a.sitio_id === sitio.id)
  const nombres = new Set(areas.map((a) => normalizar(a.nombre)))
  const sugeridas = AREAS_SUGERIDAS.filter((s) => !nombres.has(normalizar(s)))

  async function alta(texto: string) {
    const limpio = texto.trim()
    if (!limpio) return
    if (nombres.has(normalizar(limpio))) {
      setError(`«${limpio}» ya es un área de ${sitio.nombre}.`)
      return
    }
    setTrabajando(true)
    setError(null)
    try {
      const orden = areas.reduce((m, a) => Math.max(m, a.orden), 0) + 1
      const { fila, encolado } = await crearArea(orgId, sitio.id, limpio, orden)
      aplicarEscritura<SitioArea>({ cliente, clave, encolado, actualizar: (p) => [...p, fila] })
      setNombre('')
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setTrabajando(false)
    }
  }

  async function alternar(area: SitioArea) {
    setError(null)
    try {
      const { fila, encolado } = await cambiarActivaArea(area, !area.activa)
      aplicarEscritura<SitioArea>({
        cliente,
        clave,
        encolado,
        actualizar: (p) => p.map((a) => (a.id === fila.id ? fila : a)),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  async function quitar(area: SitioArea) {
    setError(null)
    try {
      const { encolado } = await eliminarArea(area)
      aplicarEscritura<SitioArea>({
        cliente,
        clave,
        encolado,
        actualizar: (p) => p.filter((a) => a.id !== area.id),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  return (
    <section style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px' }}>
        Áreas de {sitio.nombre}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--texto-dim)', margin: '0 0 10px', lineHeight: 1.5 }}>
        Por donde se camina el recorrido. Una obligación puede ser de todo el sitio o de un área.
      </p>

      {error && <div style={{ marginBottom: 10 }}><Aviso tono="error">{error}</Aviso></div>}

      {areas.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '0 0 10px', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {areas.map((a) => (
            <li
              key={a.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                padding: '2px 2px 2px 10px',
                borderBottom: '2px solid rgba(61, 186, 78, .16)',
                opacity: a.activa ? 1 : 0.55,
              }}
            >
              <span style={{ fontSize: 14, color: 'var(--texto)' }}>
                {a.nombre}{a.activa ? '' : ' · baja'}
              </span>
              {enUso.has(a.id) ? (
                <Button variante="fantasma" tamano="sm" onClick={() => alternar(a)}>
                  {a.activa ? 'Baja' : 'Reactivar'}
                </Button>
              ) : (
                <Button variante="fantasma" tamano="sm" onClick={() => quitar(a)} title={`Quitar ${a.nombre}`}>
                  Quitar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); void alta(nombre) }}
        style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', maxWidth: 480 }}
      >
        <div style={{ flex: '1 1 220px' }}>
          <Input
            etiqueta="Nueva área"
            etiquetaOculta
            placeholder="Nueva área: «Almacén de químicos»"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <Button variante="secundario" type="submit" cargando={trabajando} disabled={!nombre.trim()}>
          Agregar
        </Button>
      </form>

      {sugeridas.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--texto-dim)' }}>Del levantamiento real:</span>
          {sugeridas.map((s) => (
            <Button key={s} variante="fantasma" tamano="sm" onClick={() => alta(s)} disabled={trabajando}>
              + {s}
            </Button>
          ))}
        </div>
      )}
    </section>
  )
}
