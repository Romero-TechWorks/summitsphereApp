'use client'

import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDate } from '@/lib/utils/dates'
import { campoDominante, sincronizarAdjuntos, type DestinoAdjunto } from '@/lib/offline/adjuntos'
import { useEnLinea, useSubidasPendientes } from '@/lib/offline/estado'
import {
  adjuntar,
  listarAdjuntos,
  quitarAdjunto,
  urlDelAdjunto,
  type Adjunto,
} from '@/lib/queries/adjuntos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import Lista, { Fila } from '@/components/ui/Lista'
import Skeleton from '@/components/ui/Skeleton'
import { IconoAdjunto } from '@/components/ui/Iconos'

/** 25 MB — el tope del bucket `evidencias`. */
const TAMANO_MAXIMO = 25 * 1024 * 1024

/**
 * **Evidencia adjunta** [F02·B2b]: la foto del extintor, el acta firmada, el
 * correo del cliente.
 *
 * ⚠️ **Tres cosas que esta pantalla tiene que DECIR, no esconder:**
 *
 *   1. **Lo ya subido no se ve sin señal.** El bucket es privado y se lee con
 *      URL firmada, que es una llamada al servidor. Tomar la foto y adjuntarla,
 *      sí. Un botón «Abrir» que no hace nada en la planta es peor que un botón
 *      que explica por qué.
 *   2. **Adjuntar no es subir.** El archivo queda en el teléfono y sube después
 *      de los datos. Mientras tanto se enseña como pendiente, con su nombre.
 *   3. **`sincronizarAdjuntos()` se ESPERA.** Refrescar sin esperar es el «hay
 *      que subirla dos veces» de JDM Built (docs/03 §8.8, regla 4).
 */
export default function PanelAdjuntos({
  orgId,
  destino,
  puedoEditar = true,
  esSocio = false,
  ayuda,
}: {
  orgId: string
  /** De quién cuelga. Se filtra por el campo dominante, nunca con un OR. */
  destino: DestinoAdjunto
  puedoEditar?: boolean
  /** Sólo un socio puede quitar evidencia, y lo impone la base. */
  esSocio?: boolean
  ayuda?: string
}) {
  const cliente = useQueryClient()
  const enLinea = useEnLinea()
  const subidas = useSubidasPendientes()
  const entrada = useRef<HTMLInputElement>(null)

  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dominante = campoDominante(destino)
  const clave = queryKeys.adjuntos.de(dominante?.campo ?? 'organizacion', dominante?.id ?? orgId)

  const { data: adjuntos = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarAdjuntos(orgId, destino),
    enabled: Boolean(orgId),
  })

  const pendientes = new Set(subidas.map((s) => s.id))

  async function elegir(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    if (!archivo) return

    if (entrada.current) entrada.current.value = ''

    if (archivo.size > TAMANO_MAXIMO) {
      setError(
        `«${archivo.name}» pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el tope son 25 MB. ` +
        'Si es un video, graba uno más corto; si es una foto, bájale la resolución en la cámara.',
      )
      return
    }

    setTrabajando(true)
    setError(null)

    try {
      const { fila, encolado } = await adjuntar({
        orgId,
        destino,
        archivo,
        titulo: null,
      })

      aplicarEscritura<Adjunto>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => [fila, ...previo.filter((a) => a.id !== fila.id)],
      })

      // ⚠️ **Y aquí se espera.** `adjuntar()` sólo encoló el binario; quien lo
      // sube es esto, y refrescar antes de que termine deja la lista sin el
      // archivo y al usuario adjuntándolo otra vez.
      if (enLinea) await sincronizarAdjuntos()
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setTrabajando(false)
    }
  }

  async function abrir(adjunto: Adjunto) {
    setError(null)

    if (pendientes.has(adjunto.id)) {
      setError(
        `«${adjunto.nombre}» todavía está en el teléfono: sube en cuanto haya señal. ` +
        'Tu trabajo está a salvo.',
      )
      return
    }

    try {
      window.open(await urlDelAdjunto(adjunto.ruta), '_blank', 'noopener')
    } catch (problema) {
      setError(
        `No se pudo abrir el adjunto: ${mensajeDeError(problema)}. ` +
        'El bucket es privado y los archivos se firman al abrirlos, así que esto necesita conexión.',
      )
    }
  }

  async function quitar(adjunto: Adjunto) {
    setError(null)

    try {
      const { encolado } = await quitarAdjunto(adjunto)
      aplicarEscritura<Adjunto>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.filter((a) => a.id !== adjunto.id),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  return (
    <div>
      {puedoEditar && (
        <Campo
          id={`adjuntar-${dominante?.id ?? orgId}`}
          etiqueta="Adjuntar evidencia"
          ayuda={ayuda ?? 'Foto, PDF o archivo, hasta 25 MB. Sin señal se queda en el teléfono y sube al volver la conexión.'}
        >
          <input
            id={`adjuntar-${dominante?.id ?? orgId}`}
            ref={entrada}
            type="file"
            // `capture` no se pone a propósito: forzar la cámara le quita al
            // auditor la opción de elegir una foto que ya tomó, que es la mitad
            // de las veces.
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            disabled={trabajando}
            onChange={elegir}
            style={{ fontSize: 14, color: 'var(--texto)' }}
          />
        </Campo>
      )}

      {error && <div style={{ margin: '12px 0' }}><Aviso tono="error">{error}</Aviso></div>}

      {!enLinea && adjuntos.length > 0 && (
        <div style={{ margin: '12px 0' }}>
          <Aviso tono="info">
            Sin conexión no se pueden abrir los archivos ya subidos: viven en un bucket privado y se
            firman al abrirlos. Adjuntar uno nuevo sí funciona.
          </Aviso>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {isPending ? (
          <Skeleton alto={44} radio={4} />
        ) : adjuntos.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-dim)' }}>Sin evidencia adjunta todavía.</p>
        ) : (
          <Lista etiqueta="Evidencia adjunta">
            {adjuntos.map((adjunto) => (
              <Fila
                key={adjunto.id}
                Icono={IconoAdjunto}
                titulo={adjunto.titulo || adjunto.nombre}
                onClick={() => abrir(adjunto)}
                meta={
                  <>
                    {adjunto.tamano !== null && (
                      <span className="mono">{(adjunto.tamano / 1024).toFixed(0)} KB</span>
                    )}
                    <span>{formatDate(adjunto.creado_en)}</span>
                  </>
                }
                derecha={
                  <>
                    {pendientes.has(adjunto.id) && <Badge tono="advertencia">Por subir</Badge>}
                    {esSocio && (
                      <Button
                        variante="fantasma"
                        tamano="sm"
                        onClick={() => quitar(adjunto)}
                        title={`Quitar ${adjunto.nombre}`}
                      >
                        Quitar
                      </Button>
                    )}
                  </>
                }
              />
            ))}
          </Lista>
        )}
      </div>
    </div>
  )
}
