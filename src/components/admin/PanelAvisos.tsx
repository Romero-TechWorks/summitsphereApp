'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDate } from '@/lib/utils/dates'
import {
  desuscribirEsteAparato,
  endpointDeEsteAparato,
  estadoDePush,
  suscribirEsteAparato,
  type EstadoPush,
} from '@/lib/push/cliente'
import {
  cambiarPreferencia,
  guardarSuscripcion,
  listarSuscripciones,
  obtenerPreferencias,
  olvidarSuscripcion,
} from '@/lib/queries/avisos'
import { CATEGORIAS_AVISO, CATEGORIAS_VIVAS, estaEncendida } from '@/lib/avisos/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import Lista, { Fila } from '@/components/ui/Lista'
import Skeleton from '@/components/ui/Skeleton'
import { IconoAlerta } from '@/components/ui/Iconos'

/**
 * **Avisos al teléfono** [F04·B3] — dónde se activan y qué llega.
 *
 * ⚠️ **Se suscribe el APARATO, no la persona.** Un consultor trae el teléfono en
 * la planta y la laptop en la oficina, y el aviso de «vence en 3» tiene que
 * llegarle al que lleva encima. Por eso hay una lista de aparatos y no una
 * casilla: activar en el teléfono no activa la laptop, y decirlo evita el
 * «lo activé y no me llega nada».
 *
 * ⚠️ **Lo que nadie apagó está ENCENDIDO**, aquí y en `quiere_aviso()` de la
 * base. El silencio por omisión es lo que hace inútil un sistema de avisos.
 *
 * ⚠️ **Sólo se ofrecen las categorías que ya tienen quien las dispare.** Las
 * demás se enseñan apagadas y con su fase, en vez de dejar que alguien encienda
 * un interruptor que no está conectado a nada (regla 11).
 */
export default function PanelAvisos() {
  const cliente = useQueryClient()

  const [estado, setEstado] = useState<EstadoPush | null>(null)
  const [esteEndpoint, setEsteEndpoint] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ⚠️ `useEffect` aquí SÍ: no es una carga de datos —eso va por `useQuery`—,
  // es preguntarle al navegador por un permiso, que no es una consulta ni se
  // puede cachear. La lista de aparatos, que sí es un dato, va por `useQuery`.
  useEffect(() => {
    let vivo = true
    void (async () => {
      const [e, ep] = await Promise.all([estadoDePush(), endpointDeEsteAparato()])
      if (!vivo) return
      setEstado(e)
      setEsteEndpoint(ep)
    })()
    return () => { vivo = false }
  }, [])

  const suscripciones = useQuery({
    queryKey: queryKeys.avisos.suscripciones(),
    queryFn: listarSuscripciones,
  })

  const preferencias = useQuery({
    queryKey: queryKeys.avisos.preferencias(),
    queryFn: obtenerPreferencias,
  })

  async function activar() {
    setOcupado(true)
    setError(null)
    try {
      const datos = await suscribirEsteAparato()
      await guardarSuscripcion(datos)
      setEstado('activo')
      setEsteEndpoint(datos.endpoint)
      void cliente.invalidateQueries({ queryKey: queryKeys.avisos.suscripciones() })
    } catch (problema) {
      setError(mensajeDeError(problema))
      setEstado(await estadoDePush())
    } finally {
      setOcupado(false)
    }
  }

  async function desactivar(endpoint: string) {
    setOcupado(true)
    setError(null)
    try {
      // Si es este aparato, además hay que cancelar en el navegador: borrar la
      // fila sin desuscribir deja el permiso dado y una suscripción huérfana que
      // volvería a aparecer al recargar.
      if (endpoint === esteEndpoint) {
        await desuscribirEsteAparato()
        setEstado('sin_permiso')
        setEsteEndpoint(null)
      }
      await olvidarSuscripcion(endpoint)
      void cliente.invalidateQueries({ queryKey: queryKeys.avisos.suscripciones() })
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  async function alternar(categoria: string, encendida: boolean) {
    setError(null)
    try {
      const siguientes = await cambiarPreferencia(categoria, encendida)
      cliente.setQueryData(queryKeys.avisos.preferencias(), siguientes)
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {error && <Aviso tono="error">{error}</Aviso>}

      {/* ── Este aparato ──────────────────────────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', margin: 0 }}>
          Este aparato
        </h3>

        {estado === null ? (
          <Skeleton alto={40} radio={4} />
        ) : estado === 'sin_soporte' ? (
          <Aviso tono="advertencia">
            <strong>Este navegador no puede recibir avisos.</strong> Hace falta HTTPS: desde una
            dirección de red local (192.168…) no funciona ni en Chrome, y en desarrollo el
            service worker está apagado. Pruébalo contra la dirección de Vercel.
          </Aviso>
        ) : estado === 'bloqueado' ? (
          <Aviso tono="advertencia">
            <strong>Bloqueaste los avisos para este sitio.</strong> Se vuelve a permitir desde el
            candado de la barra de direcciones — desde aquí ya no se puede preguntar.
          </Aviso>
        ) : estado === 'activo' ? (
          <Aviso tono="exito">
            <strong>Los avisos están activos en este aparato.</strong>
          </Aviso>
        ) : (
          <>
            <p style={{ margin: 0 }}>
              Los avisos llegan <strong>al aparato</strong>, no a tu cuenta. Actívalo en cada uno
              donde quieras recibirlos: el teléfono que llevas a planta y la computadora de la
              oficina son dos permisos distintos.
            </p>
            <div>
              <Button onClick={activar} disabled={ocupado}>
                {ocupado ? 'Activando…' : 'Activar en este aparato'}
              </Button>
            </div>
          </>
        )}
      </section>

      {/* ── Los aparatos ──────────────────────────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', margin: 0 }}>
          Aparatos que reciben tus avisos
        </h3>

        {suscripciones.isPending ? (
          <Skeleton alto={44} radio={4} />
        ) : suscripciones.data && suscripciones.data.length > 0 ? (
          <Lista etiqueta="Aparatos suscritos">
            {suscripciones.data.map((s) => (
              <Fila
                key={s.id}
                Icono={IconoAlerta}
                titulo={s.descripcion ?? 'Aparato sin nombre'}
                meta={
                  <>
                    {s.endpoint === esteEndpoint && <span>Éste</span>}
                    <span>Desde {formatDate(s.creado_en)}</span>
                    {s.ultimo_envio_en && <span>Último aviso {formatDate(s.ultimo_envio_en)}</span>}
                  </>
                }
                derecha={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {!s.activa && <Badge tono="neutro">Sin responder</Badge>}
                    <Button
                      tamano="sm"
                      variante="fantasma"
                      onClick={() => desactivar(s.endpoint)}
                      disabled={ocupado}
                    >
                      Quitar
                    </Button>
                  </span>
                }
              />
            ))}
          </Lista>
        ) : (
          <p style={{ margin: 0, color: 'var(--texto-dim)' }}>
            Ninguno todavía. Sin al menos un aparato activo no llega ningún aviso, por muchas
            categorías que tengas encendidas.
          </p>
        )}

        {suscripciones.data?.some((s) => !s.activa) && (
          <Aviso tono="info">
            Un aparato marcado <strong>«sin responder»</strong> dejó de aceptar avisos —se
            desinstaló el navegador o se revocó el permiso—. Se conserva para que quede claro por
            qué dejó de llegarte, y se puede quitar.
          </Aviso>
        )}
      </section>

      {/* ── Qué te llega ──────────────────────────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', margin: 0 }}>
          Qué te llega
        </h3>

        {preferencias.isPending ? (
          <Skeleton alto={80} radio={4} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CATEGORIAS_VIVAS.map((c) => (
              <div key={c.valor}>
                <Checkbox
                  etiqueta={`${c.etiqueta} · ${c.cadencia}`}
                  ayuda={c.ayuda}
                  checked={estaEncendida(preferencias.data ?? {}, c.valor)}
                  onChange={(e) => alternar(c.valor, e.target.checked)}
                />
              </div>
            ))}
          </div>
        )}

        {/* ⚠️ Las que todavía no tienen quien las dispare se ENSEÑAN, apagadas y
            con su motivo. Ofrecerlas encendidas sería un interruptor muerto
            (regla 11); esconderlas dejaría creer que la matriz del cliente no
            está contemplada. */}
        <details>
          <summary style={{ cursor: 'pointer', font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
            Categorías que llegan en fases siguientes
          </summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--texto-dim)', fontSize: 13 }}>
            {CATEGORIAS_AVISO.filter((c) => !c.activa).map((c) => (
              <li key={c.valor} style={{ marginBottom: 4 }}>
                <strong>{c.etiqueta}</strong> · {c.cadencia} — {c.ayuda}
              </li>
            ))}
          </ul>
        </details>

        <p style={{ margin: 0, font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
          Las que dicen «lo pide el cliente» salen de la matriz de comunicación de su
          procedimiento P-SG-08; las demás son criterio de Summit.
        </p>
      </section>
    </div>
  )
}
