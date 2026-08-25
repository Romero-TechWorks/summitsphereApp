'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import { DESTINOS, estaActivo } from '@/lib/navegacion'
import EstadoConexion from '@/components/layout/EstadoConexion'
import Logo from '@/components/ui/Logo'
import { IconoSalir } from '@/components/ui/Iconos'

/**
 * La barra superior.
 *
 * ⚠️ Aquí van a vivir el buscador global [Fase 06] y el 🤖 del asistente
 * [Fase 07]. Todavía no están, y no se dejan puestos apagados: un botón que no
 * hace nada se toca dos veces, se da por roto, y enseña al usuario a
 * desconfiar del resto de la interfaz.
 *
 * El indicador de conexión [F00·B4] sí está, y sigue la misma regla al revés:
 * sólo aparece cuando tiene algo que decir.
 *
 * ⚠️ **El distintivo de la partición de pruebas rompe esa regla a propósito, y
 * es la única cosa de la barra que lo hace.** Un indicador permanente se deja de
 * mirar —por eso `EstadoConexion` se esconde en verde—, pero aquí no hay nada
 * más que distinga las dos particiones: las dos carteras se ven idénticas, con
 * los mismos nombres de cliente y las mismas pantallas. Sin este distintivo, la
 * pregunta «¿esto que estoy borrando es del cliente o es de mentira?» no tiene
 * respuesta en pantalla. Y como la partición real NO pinta nada, el que se
 * acostumbra a verlo es sólo quien tiene la cuenta de pruebas.
 */
export default function Navbar({ isMobile }: { isMobile: boolean }) {
  const ruta = usePathname()
  const router = useRouter()
  const [saliendo, setSaliendo] = useState(false)

  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  const destino = DESTINOS.find((d) => estaActivo(d.href, ruta))

  async function salir() {
    setSaliendo(true)
    try {
      await createClient().auth.signOut()
      // `refresh()` antes de `replace()`: sin él, el App Router puede servir la
      // pantalla anterior desde su caché de router y parece que no cerró sesión.
      router.refresh()
      router.replace('/login')
    } catch (error) {
      // Si falla el cierre de sesión el usuario tiene que enterarse: creer que
      // saliste de una sesión que sigue abierta es peor que no salir.
      setSaliendo(false)
      console.error('No se pudo cerrar la sesión', error)
    }
  }

  return (
    <header
      style={{
        flexShrink: 0,
        height: 56,
        background: 'var(--nav-fondo)',
        borderBottom: '1px solid var(--navy-medio)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '0 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {isMobile ? (
          <>
            <Logo size={26} sobre="navy" />
            <span className="display" style={{ fontSize: 24, color: 'var(--nav-texto)', lineHeight: 1 }}>
              Summit
            </span>
          </>
        ) : (
          <h1
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--nav-texto)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {destino?.etiqueta ?? 'SummitApp'}
          </h1>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {usuario?.es_dev === true && (
        <span
          title="Cuenta de pruebas: esta sesión sólo ve los datos de demostración. Nada de lo que hagas aquí toca la cartera del cliente."
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            borderRadius: 4,
            border: '1px solid var(--nav-alerta)',
            color: 'var(--nav-alerta)',
            fontFamily: 'var(--fuente-mono), monospace',
            fontSize: 11,
            letterSpacing: '0.06em',
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
          }}
        >
          DEV
          {!isMobile && <span style={{ letterSpacing: 0 }}>· datos de prueba</span>}
        </span>
      )}

      <EstadoConexion compacto={isMobile} />

      <button
        type="button"
        onClick={salir}
        disabled={saliendo}
        aria-label="Cerrar sesión"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 10px',
          background: 'transparent',
          border: '1px solid transparent',
          borderRadius: 6,
          color: 'var(--nav-texto-dim)',
          fontSize: 13,
          fontFamily: 'var(--fuente-texto), sans-serif',
          cursor: saliendo ? 'wait' : 'pointer',
        }}
      >
        <IconoSalir size={17} />
        {!isMobile && <span>Salir</span>}
      </button>
      </div>
    </header>
  )
}
