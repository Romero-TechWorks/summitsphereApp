'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * El widget de Cloudflare Turnstile del login (F00·B3).
 *
 * ⚠️ **La comprobación NO se hace aquí, ni en una ruta de la app.** El token que
 * este componente produce se le pasa a Supabase en `signInWithPassword` como
 * `options.captchaToken`, y es **Supabase** quien lo valida contra Cloudflare
 * con la llave secreta antes de mirar siquiera la contraseña.
 *
 * La alternativa —verificar el token en un `/api/turnstile` propio y luego
 * llamar al login— es decorativa: un atacante que quiera probar diez mil
 * contraseñas no abre esta pantalla, le pega directo al endpoint de Supabase,
 * que es público. Saltarse una comprobación que vive en el navegador es no
 * hacerla. Por eso la llave secreta va en el panel de Supabase
 * (Authentication → Attack Protection) y no en este repositorio.
 *
 * Consecuencia que hay que tener presente: **las dos mitades se encienden
 * juntas**. Con el widget puesto y la protección apagada en Supabase, el token
 * se ignora; con la protección encendida y sin widget, nadie entra. Ver
 * `docs/09_TAREAS_DEL_DUENO.md` · A08.
 */

const URL_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type OpcionesTurnstile = {
  sitekey: string
  callback: (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
  theme: 'light' | 'dark' | 'auto'
  language: string
  appearance: 'always' | 'execute' | 'interaction-only'
}

declare global {
  interface Window {
    turnstile?: {
      render: (elemento: HTMLElement, opciones: OpcionesTurnstile) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

/** Una sola descarga del script por pestaña, la pidan los componentes que la pidan. */
let promesaScript: Promise<void> | null = null

function cargarScript(): Promise<void> {
  if (promesaScript) return promesaScript

  promesaScript = new Promise((resolver, rechazar) => {
    if (window.turnstile) {
      resolver()
      return
    }

    const guion = document.createElement('script')
    guion.src = URL_SCRIPT
    guion.async = true
    guion.defer = true
    guion.onload = () => resolver()
    guion.onerror = () => {
      // Que se pueda volver a intentar: si no, un corte de red en el primer
      // arranque deja la promesa rechazada para siempre y el login inservible
      // aunque la conexión vuelva.
      promesaScript = null
      rechazar(new Error('No se pudo cargar la comprobación de seguridad.'))
    }
    document.head.appendChild(guion)
  })

  return promesaScript
}

export default function Turnstile({
  alCambiarToken,
  reinicio = 0,
}: {
  /**
   * El token, o `null` cuando caduca o falla. Es de un solo uso.
   *
   * ⚠️ Tiene que ser una función **estable** —el `setX` de un `useState` lo
   * es—: está en las dependencias del efecto que monta el widget, así que una
   * función nueva en cada render lo destruiría y lo volvería a crear con cada
   * tecla que se escribe en la contraseña.
   */
  alCambiarToken: (token: string | null) => void
  /** Cambia este número para pedir un token nuevo tras un intento fallido. */
  reinicio?: number
}) {
  const llaveSitio = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const contenedor = useRef<HTMLDivElement>(null)
  const idWidget = useRef<string | null>(null)
  // Sin llave configurada el widget no existe y el login sigue funcionando. Es
  // deliberado: un despliegue al que se le olvidó la variable tiene que quedar
  // sin captcha, no sin puerta de entrada.
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'roto'>('cargando')

  useEffect(() => {
    if (!llaveSitio) return

    let vivo = true

    cargarScript()
      .then(() => {
        if (!vivo || !contenedor.current || !window.turnstile) return

        idWidget.current = window.turnstile.render(contenedor.current, {
          sitekey: llaveSitio,
          callback: (token) => alCambiarToken(token),
          'error-callback': () => alCambiarToken(null),
          'expired-callback': () => alCambiarToken(null),
          theme: 'light',
          language: 'es',
          appearance: 'always',
        })

        setEstado('listo')
      })
      .catch(() => {
        if (!vivo) return
        alCambiarToken(null)
        setEstado('roto')
      })

    return () => {
      vivo = false
      if (idWidget.current && window.turnstile) {
        window.turnstile.remove(idWidget.current)
        idWidget.current = null
      }
    }
  }, [llaveSitio, alCambiarToken])

  // Un token de Turnstile sirve UNA vez. Tras un intento fallido hay que pedir
  // otro, o el segundo intento lo rechaza Cloudflare por token repetido y el
  // usuario ve "correo o contraseña incorrectos" aunque los haya escrito bien.
  useEffect(() => {
    if (reinicio === 0 || !idWidget.current || !window.turnstile) return
    window.turnstile.reset(idWidget.current)
  }, [reinicio])

  if (!llaveSitio) return null

  return (
    <div>
      <div ref={contenedor} style={{ display: 'flex', justifyContent: 'center' }} />

      {estado === 'roto' && (
        <p style={{ fontSize: 12.5, color: 'var(--advertencia)', textAlign: 'center', marginTop: 4 }}>
          No se pudo cargar la comprobación de seguridad. Revisa tu conexión y
          recarga la página.
        </p>
      )}
    </div>
  )
}
