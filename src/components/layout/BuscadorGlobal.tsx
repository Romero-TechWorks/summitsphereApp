'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { useEnLinea } from '@/lib/offline/estado'
import { buscarGlobal, LARGO_MINIMO_BUSQUEDA, type ResultadoBusqueda } from '@/lib/queries/busqueda'
import {
  buscarDestinos,
  buscarEnCache,
  enlaceDe,
  estadoLegible,
  ORDEN_TIPOS,
  tipoDe,
} from '@/lib/busqueda/buscador'
import { IconoBuscar, IconoCerrar } from '@/components/ui/Iconos'

/** Espera entre tecla y consulta: se teclea a ráfagas, no letra por letra. */
const PAUSA_MS = 250

type Renglon = {
  clave: string
  href: string
  titulo: string
  folio: string | null
  meta: string
  Icono: React.ComponentType<{ size?: number }>
}

/**
 * **El buscador global** [F06·B4], en la Navbar.
 *
 * En escritorio es un campo con su lista desplegable; en el teléfono, una lupa
 * que abre la búsqueda a pantalla completa —con el teclado abierto no cabe
 * otra cosa—. `Ctrl+K` o `/` lo enfocan desde cualquier pantalla.
 *
 * ⚠️ **Sin señal sigue buscando**, en lo que ya está en el aparato
 * (`buscarEnCache()`), y lo dice. Con señal enseña primero eso mismo —sale al
 * instante— y lo reemplaza cuando contesta el servidor, que ve la cartera
 * entera. Ver `src/lib/busqueda/buscador.ts`.
 *
 * ⚠️ **Las pantallas de la app también salen**: en el teléfono, Sistemas,
 * Capacitación y Admin no caben en la barra inferior (CLAUDE.md · Estructura).
 */
export default function BuscadorGlobal({ isMobile }: { isMobile: boolean }) {
  const router = useRouter()
  const cliente = useQueryClient()
  const enLinea = useEnLinea()
  const entrada = useRef<HTMLInputElement>(null)
  const caja = useRef<HTMLDivElement>(null)

  const [texto, setTexto] = useState('')
  const [consulta, setConsulta] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)

  // ⚠️ `useEffect` para la pausa y el atajo de teclado, no para cargar datos:
  // los datos van por `useQuery`.
  useEffect(() => {
    const t = window.setTimeout(() => setConsulta(texto.trim()), PAUSA_MS)
    return () => window.clearTimeout(t)
  }, [texto])

  useEffect(() => {
    function atajo(e: KeyboardEvent) {
      const escribiendo = e.target instanceof HTMLElement &&
        (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !escribiendo)) {
        e.preventDefault()
        setAbierto(true)
        // En móvil el campo aún no existe: se enfoca al montar (`autoFocus`).
        entrada.current?.focus()
      }
    }
    window.addEventListener('keydown', atajo)
    return () => window.removeEventListener('keydown', atajo)
  }, [])

  // Cerrar la lista al hacer clic fuera (escritorio).
  useEffect(() => {
    if (!abierto || isMobile) return
    function fuera(e: MouseEvent) {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto, isMobile])

  const suficiente = consulta.length >= LARGO_MINIMO_BUSQUEDA

  const servidor = useQuery({
    queryKey: queryKeys.busqueda.global(consulta),
    queryFn: () => buscarGlobal(consulta),
    enabled: suficiente && enLinea,
    staleTime: 30_000,
    gcTime: 60_000,
    retry: false,
  })

  const locales = useMemo(
    () => (suficiente && !servidor.data ? buscarEnCache(cliente, consulta) : []),
    [suficiente, servidor.data, cliente, consulta],
  )
  const resultados: ResultadoBusqueda[] = servidor.data ?? locales
  const deLaCache = suficiente && !servidor.data
  const destinos = useMemo(() => buscarDestinos(consulta), [consulta])

  const grupos = useMemo(() => {
    const salida: { titulo: string; renglones: Renglon[] }[] = []
    if (destinos.length > 0) {
      salida.push({
        titulo: 'Pantallas',
        renglones: destinos.map((d) => ({
          clave: `pantalla:${d.href}`, href: d.href, titulo: d.etiqueta, folio: null, meta: '', Icono: d.Icono,
        })),
      })
    }
    const tipos = [...ORDEN_TIPOS, ...new Set(resultados.map((r) => r.tipo).filter((t) => !ORDEN_TIPOS.includes(t)))]
    for (const tipo of tipos) {
      const del = resultados.filter((r) => r.tipo === tipo)
      if (del.length === 0) continue
      const t = tipoDe(tipo)
      salida.push({
        titulo: t.grupo,
        renglones: del.map((r) => ({
          clave: `${r.tipo}:${r.id}`,
          href: enlaceDe(r),
          titulo: r.titulo || '(sin título)',
          folio: r.folio || null,
          meta: [r.tipo === 'organizacion' ? null : r.organizacion, estadoLegible(r)].filter(Boolean).join(' · '),
          Icono: t.Icono,
        })),
      })
    }
    return salida
  }, [destinos, resultados])

  const planos = useMemo(() => grupos.flatMap((g) => g.renglones), [grupos])
  const indice = Math.min(activo, Math.max(planos.length - 1, 0))

  function ir(href: string) {
    setAbierto(false)
    setTexto('')
    setConsulta('')
    entrada.current?.blur()
    router.push(href)
  }

  function teclas(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setAbierto(false)
      entrada.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActivo((i) => Math.min(i + 1, planos.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && planos[indice]) {
      e.preventDefault()
      ir(planos[indice].href)
    }
  }

  const campo = (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <span
        aria-hidden
        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--nav-texto-dim)', display: 'flex' }}
      >
        <IconoBuscar size={16} />
      </span>
      <input
        ref={entrada}
        type="search"
        value={texto}
        autoFocus={isMobile}
        placeholder={isMobile ? 'Buscar en la cartera…' : 'Buscar… (Ctrl+K)'}
        aria-label="Buscar en toda la cartera"
        aria-expanded={abierto}
        aria-controls="resultados-busqueda"
        role="combobox"
        aria-autocomplete="list"
        onFocus={() => setAbierto(true)}
        onChange={(e) => { setTexto(e.target.value); setActivo(0); setAbierto(true) }}
        onKeyDown={teclas}
        style={{
          width: '100%',
          padding: '7px 10px 7px 32px',
          borderRadius: 6,
          border: '1px solid var(--navy-medio)',
          background: 'var(--nav-fondo-2)',
          color: 'var(--nav-texto)',
          fontSize: 16, // < 16 px y Safari de iOS hace zoom al enfocar.
          fontFamily: 'var(--fuente-texto), sans-serif',
          outline: 'none',
        }}
      />
    </div>
  )

  const lista = (
    <Resultados
      grupos={grupos}
      indice={indice}
      alElegir={ir}
      alPasar={(i) => setActivo(i)}
      texto={texto.trim()}
      suficiente={suficiente}
      deLaCache={deLaCache}
      enLinea={enLinea}
      cargando={servidor.isFetching}
      error={servidor.isError}
    />
  )

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Buscar"
          style={BOTON_NAV}
        >
          <IconoBuscar size={19} />
        </button>
        {abierto && (
          <div
            role="dialog"
            aria-label="Buscar"
            style={{
              position: 'fixed',
              inset: 0,
              height: 'var(--vh-full)',
              zIndex: 100,
              background: 'var(--fondo)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--nav-fondo)' }}>
              {campo}
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar búsqueda" style={BOTON_NAV}>
                <IconoCerrar size={19} />
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{lista}</div>
          </div>
        )}
      </>
    )
  }

  return (
    <div ref={caja} style={{ position: 'relative', width: 'min(360px, 40vw)' }}>
      {campo}
      {abierto && texto.trim() && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 'min(520px, 70vw)',
            maxHeight: 'calc(var(--vh-full) * 0.7)',
            overflowY: 'auto',
            background: 'var(--superficie)',
            border: '1px solid var(--borde)',
            borderRadius: 8,
            boxShadow: '0 12px 32px rgba(0,0,0,.25)',
            zIndex: 100,
          }}
        >
          {lista}
        </div>
      )}
    </div>
  )
}

function Resultados({
  grupos,
  indice,
  alElegir,
  alPasar,
  texto,
  suficiente,
  deLaCache,
  enLinea,
  cargando,
  error,
}: {
  grupos: { titulo: string; renglones: Renglon[] }[]
  indice: number
  alElegir: (href: string) => void
  alPasar: (i: number) => void
  texto: string
  suficiente: boolean
  deLaCache: boolean
  enLinea: boolean
  cargando: boolean
  error: boolean
}) {
  if (!texto) {
    return <p style={NOTA}>Clientes, proyectos, auditorías, hallazgos, acciones, documentos y obligaciones. También folios: «AUD-2026», «NC-2026-007».</p>
  }
  if (!suficiente) {
    return <p style={NOTA}>Sigue escribiendo…</p>
  }

  const vacio = grupos.length === 0
  // Dónde empieza cada grupo en la lista plana que recorren las flechas.
  const inicios = grupos.map((_, g) => grupos.slice(0, g).reduce((t, x) => t + x.renglones.length, 0))

  return (
    <div id="resultados-busqueda" role="listbox" style={{ padding: '6px 0' }}>
      {deLaCache && (!enLinea || error) && (
        <p style={{ ...NOTA, color: 'var(--advertencia)' }}>
          {enLinea ? 'El servidor no contestó.' : 'Sin señal.'} Buscando sólo en lo que ya está descargado en este
          aparato.
        </p>
      )}
      {deLaCache && enLinea && !error && cargando && (
        <p style={NOTA}>Buscando en toda la cartera…</p>
      )}

      {vacio && !cargando && (
        <p style={NOTA}>Nada con «{texto}».</p>
      )}

      {grupos.map((g, gi) => (
        <section key={g.titulo}>
          <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--texto-dim)', margin: '10px 14px 4px' }}>
            {g.titulo}
          </h3>
          {g.renglones.map((r, ri) => {
            const i = inicios[gi] + ri
            const marcado = i === indice
            return (
              <a
                key={r.clave}
                href={r.href}
                role="option"
                aria-selected={marcado}
                onMouseEnter={() => alPasar(i)}
                onClick={(e) => { e.preventDefault(); alElegir(r.href) }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 14px',
                  textDecoration: 'none',
                  color: 'var(--texto)',
                  background: marcado ? 'var(--superficie-2)' : 'transparent',
                  borderLeft: `2px solid ${marcado ? 'var(--verde)' : 'transparent'}`,
                }}
              >
                <span style={{ color: 'var(--texto-dim)', paddingTop: 2, display: 'flex' }}><r.Icono size={16} /></span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.folio && <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8, fontSize: 12 }}>{r.folio}</span>}
                    {r.titulo}
                  </span>
                  {r.meta && <span style={{ display: 'block', fontSize: 12, color: 'var(--texto-dim)' }}>{r.meta}</span>}
                </span>
              </a>
            )
          })}
        </section>
      ))}
    </div>
  )
}

const NOTA: React.CSSProperties = { fontSize: 13, color: 'var(--texto-dim)', margin: '10px 14px', lineHeight: 1.5 }

const BOTON_NAV: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 6,
  background: 'transparent',
  border: 0,
  borderRadius: 6,
  color: 'var(--nav-texto-dim)',
  cursor: 'pointer',
}
