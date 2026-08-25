'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'

/**
 * **Dictar una nota** [F03·B3].
 *
 * El auditor tiene el teléfono en una mano y la lista de verificación en la
 * otra: teclear tres renglones sobre un tablero eléctrico no pasa. Se dicta, se
 * guarda como audio, y **se transcribe cuando haya señal** [Fase 07] o se
 * escucha tal cual.
 *
 * ⚠️ **El audio NO tiene almacén propio: es un adjunto más.** `docs/03` §2 aún
 * anuncia un `src/lib/offline/dictados.ts`, y al escribir esto resultó ser una
 * capa de más. Un dictado es exactamente lo que ya sabe hacer la cola de
 * adjuntos —un binario que se encola en IndexedDB, sube **después** de los
 * datos y hereda su `org_id` del campo dominante—, y darle almacén propio
 * obligaría a subir `VERSION_BD` de `idb.ts` otra vez. Ese número, cuando se
 * olvida, **falla sólo en el teléfono del consultor** —donde la base ya
 * existía— y nunca en un equipo de desarrollo. Una capa duplicada a cambio de
 * ese riesgo no vale la pena.
 *
 * ⚠️ **`MediaRecorder` no existe fuera de contexto seguro**, igual que el
 * service worker y que `crypto.randomUUID()`: `https://` o `localhost`. Desde el
 * teléfono contra `http://192.168.x.x:3000` no hay grabadora, y no es un fallo
 * de la app. Por eso se comprueba y se dice, en vez de enseñar un botón que no
 * hace nada. En Vercel funciona.
 */
export default function GrabadoraNota({
  alGrabar,
  ocupada,
}: {
  /** Recibe el audio ya cerrado, listo para adjuntar. */
  alGrabar: (audio: File) => void | Promise<void>
  ocupada?: boolean
}) {
  const grabadora = useRef<MediaRecorder | null>(null)
  const trozos = useRef<Blob[]>([])
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // ⚠️ Soltar el micrófono al desmontar. Sin esto, salir de la pantalla a media
  // grabación deja el indicador del sistema encendido y la pista abierta — en un
  // teléfono, eso es batería y es una luz roja que el cliente ve.
  useEffect(() => {
    return () => {
      const activa = grabadora.current
      if (activa && activa.state !== 'inactive') activa.stop()
      activa?.stream.getTracks().forEach((pista) => pista.stop())
    }
  }, [])

  useEffect(() => {
    if (!grabando) return
    const reloj = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(reloj)
  }, [grabando])

  const haySoporte =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)

  async function empezar() {
    setError(null)
    setSegundos(0)

    try {
      const pista = await navigator.mediaDevices.getUserMedia({ audio: true })
      const nueva = new MediaRecorder(pista)
      trozos.current = []

      nueva.ondataavailable = (evento) => {
        if (evento.data.size > 0) trozos.current.push(evento.data)
      }

      nueva.onstop = async () => {
        pista.getTracks().forEach((p) => p.stop())
        const tipo = nueva.mimeType || 'audio/webm'
        const audio = new Blob(trozos.current, { type: tipo })
        trozos.current = []

        if (audio.size === 0) {
          setError('No se grabó nada. Mantén pulsado hasta terminar de hablar.')
          return
        }

        // El nombre lleva la hora del teléfono: es lo que el auditor reconoce al
        // repasar sus notas en el coche, y en el informe distingue una de otra.
        const marca = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const extension = tipo.includes('mp4') ? 'm4a' : 'webm'
        await alGrabar(new File([audio], `nota-${marca}.${extension}`, { type: tipo }))
      }

      nueva.start()
      grabadora.current = nueva
      setGrabando(true)
    } catch (problema) {
      setGrabando(false)
      setError(
        problema instanceof DOMException && problema.name === 'NotAllowedError'
          ? 'El navegador no dio permiso para el micrófono. Actívalo desde el candado de la barra de direcciones.'
          : 'No se pudo abrir el micrófono en este dispositivo.',
      )
    }
  }

  function parar() {
    const activa = grabadora.current
    if (activa && activa.state !== 'inactive') activa.stop()
    grabadora.current = null
    setGrabando(false)
  }

  if (!haySoporte) {
    return (
      <p style={{ fontSize: 12, color: 'var(--texto-dim)', lineHeight: 1.5 }}>
        Dictar no está disponible en este navegador. El micrófono sólo se abre en una conexión
        segura (<span className="mono">https</span>), así que desde la red local no aparece.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <Button
        variante={grabando ? 'primario' : 'secundario'}
        onClick={grabando ? parar : empezar}
        disabled={ocupada}
        // 44px de alto: el mínimo para acertarle con el pulgar sin mirar.
        style={{ minHeight: 44 }}
      >
        {grabando ? `Detener · ${segundos}s` : 'Dictar nota'}
      </Button>

      {grabando && (
        <span aria-live="polite" style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
          Grabando…
        </span>
      )}

      {error && (
        <span style={{ fontSize: 12, color: 'var(--error, #c0392b)' }}>{error}</span>
      )}
    </div>
  )
}
