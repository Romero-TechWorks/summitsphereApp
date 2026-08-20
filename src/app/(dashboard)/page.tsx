'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { esRol } from '@/lib/auth/roles'
import { queryKeys } from '@/lib/query/keys'
import { guardarOrdenTablero, obtenerOrdenTablero } from '@/lib/queries/tablero'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import { widgetsOrdenados } from '@/lib/tablero/widgets'
import RejillaTablero from '@/components/tablero/RejillaTablero'
import Badge from '@/components/ui/Badge'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Skeleton from '@/components/ui/Skeleton'

/**
 * El tablero (F00·B6).
 *
 * Casi todos sus widgets todavía dicen "sin datos" — y aun así esta pantalla es
 * la prueba de que la Fase 00 está entera: lee el perfil pasando por el RLS,
 * lee y escribe preferencias por `useQuery` y `offlineWrite`, y sobrevive a
 * quedarse sin señal porque lo que pinta sale de la caché en IndexedDB.
 *
 * ⚠️ Todo lo que se ve aquí sale de la caché de React Query, **nunca de un
 * `useState`**. El único estado local es el mensaje de error, que es de la
 * pantalla y no del dato.
 */
export default function Tablero() {
  const cliente = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const {
    data: usuario,
    isPending: cargandoPerfil,
    error: falloPerfil,
  } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  const usuarioId = usuario?.id ?? ''

  const { data: orden = [] } = useQuery({
    queryKey: queryKeys.tablero.preferencias(usuarioId),
    queryFn: () => obtenerOrdenTablero(usuarioId),
    enabled: usuarioId.length > 0,
  })

  // ⚠️ TRAMPA HEREDADA — CLAUDE.md. `rol` es `text` + CHECK en la base, así que
  // para TypeScript es un `string` cualquiera. Si algún día aparece un valor que
  // el código no conoce, el tablero lo dice y sigue en pie; lo que no hace es
  // indexar un catálogo con él y llevarse la pantalla entera por delante.
  const rolCrudo = usuario?.rol
  const rol = esRol(rolCrudo) ? rolCrudo : null

  const widgets = rol ? widgetsOrdenados(rol, orden) : []

  async function reordenar(ids: string[]) {
    if (!usuario) return

    const clave = queryKeys.tablero.preferencias(usuario.id)
    const anterior = cliente.getQueryData<string[]>(clave) ?? []

    // La caché es la fuente de verdad: el orden nuevo se escribe ahí.
    cliente.setQueryData(clave, ids)
    setError(null)

    try {
      await guardarOrdenTablero(usuario.id, ids)
    } catch (fallo) {
      // Sin señal esto NO pasa —`offlineWrite` lo encola y devuelve bien—, así
      // que llegar aquí significa que el servidor lo rechazó. Se deshace el
      // cambio y se dice por qué: un tablero que se reacomoda solo al refrescar,
      // sin explicación, es peor que uno que no se deja mover.
      cliente.setQueryData(clave, anterior)
      setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar el orden del tablero.')
    }
  }

  return (
    <div className="contenido-pagina">
      <h2 className="display" style={{ fontSize: 32, marginBottom: 4 }}>
        Inicio
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 14, color: 'var(--texto-dim)' }}>
          {usuario ? `Hola, ${usuario.nombre.split(' ')[0]}.` : 'Tu tablero.'}
        </p>
        {rol && <Badge tono="neutro">{rol}</Badge>}
      </div>

      {error && (
        <p
          role="alert"
          style={{
            fontSize: 13,
            color: 'var(--error)',
            background: 'rgba(185, 28, 28, .08)',
            borderLeft: '2px solid var(--error)',
            padding: '8px 10px',
            marginBottom: 14,
          }}
        >
          {error}
        </p>
      )}

      {cargandoPerfil ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} alto={132} radio={6} />
          ))}
        </div>
      ) : falloPerfil ? (
        <Recuadro>
          <EstadoVacio
            titulo="No se pudo leer tu perfil"
            descripcion={
              falloPerfil instanceof Error
                ? falloPerfil.message
                : 'Intenta de nuevo cuando vuelva la conexión.'
            }
          />
        </Recuadro>
      ) : !rol ? (
        <Recuadro>
          <EstadoVacio
            titulo="Tu cuenta todavía no tiene un rol reconocido"
            descripcion={
              `Un socio de la firma tiene que asignártelo desde la administración` +
              (rolCrudo ? ` (el guardado es «${rolCrudo}»).` : '.')
            }
          />
        </Recuadro>
      ) : widgets.length === 0 ? (
        <Recuadro>
          <EstadoVacio
            titulo="Sin widgets para tu rol"
            descripcion="El acceso de los clientes es el portal, que se abre con una liga y no necesita cuenta."
          />
        </Recuadro>
      ) : (
        <RejillaTablero widgets={widgets} alReordenar={reordenar} />
      )}
    </div>
  )
}

function Recuadro({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 6 }}>
      {children}
    </div>
  )
}
