'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/ui/Logo'
import Button from '@/components/ui/Button'

/**
 * Entrada a la aplicación.
 *
 * Lo que TODAVÍA NO tiene, y por qué está anotado aquí en vez de dejarlo a la
 * memoria de alguien:
 *
 *  - **Turnstile** [F00·B3]. Supabase limita intentos por su cuenta, pero eso
 *    protege al servidor, no a una cuenta concreta contra un ataque de
 *    diccionario. Va antes de que la app tenga datos de clientes reales.
 *  - **Segundo factor** [F00·B3+B5]. Los roles `socio` y `administracion` deben
 *    exigir `aal2`: son quienes ven la cartera completa y los datos fiscales.
 *    Depende de la tabla `usuarios`, que llega en F00·B5.
 *
 * Mientras tanto, los usuarios se crean a mano desde el panel de Supabase
 * (Authentication → Users). El alta pública está apagada a propósito: nadie se
 * registra solo en la aplicación de una firma de auditoría.
 */
export default function PaginaLogin() {
  const router = useRouter()

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)
    setEntrando(true)

    try {
      const supabase = createClient()
      const { error: fallo } = await supabase.auth.signInWithPassword({
        email: correo.trim(),
        password: contrasena,
      })

      if (fallo) {
        // ⚠️ El mensaje NO distingue entre "ese correo no existe" y "la
        // contraseña está mal". Distinguirlos convierte el login en una forma
        // de averiguar quién trabaja en la firma.
        setError(
          fallo.message === 'Invalid login credentials'
            ? 'Correo o contraseña incorrectos.'
            : 'No se pudo entrar. Inténtalo de nuevo en un momento.',
        )
        setEntrando(false)
        return
      }

      // ⚠️ El parámetro se lee de `window.location`, no con
      // `useSearchParams()`. Ese hook obliga a envolver la pantalla en un
      // `<Suspense>`, y entonces el formulario **deja de venir en el HTML del
      // servidor**: el usuario ve una pantalla en blanco hasta que descarga y
      // ejecuta el bundle. En un teléfono con media barra de señal a la entrada
      // de una planta, eso son varios segundos de nada. Aquí sólo hace falta al
      // enviar el formulario, que ya es código de cliente.
      //
      // ⚠️ Y sólo rutas internas: un `?siguiente=https://otro-sitio` convertiría
      // esta pantalla en un redirector abierto, el anzuelo perfecto para un
      // correo que parece venir de la firma.
      const siguiente = new URLSearchParams(window.location.search).get('siguiente')
      const destino = siguiente?.startsWith('/') && !siguiente.startsWith('//')
        ? siguiente
        : '/'

      // `refresh()` antes de navegar: el guard de `src/proxy.ts` corre en el
      // servidor y necesita ver la cookie de sesión recién puesta.
      router.refresh()
      router.replace(destino)
    } catch (fallo) {
      // Falta de red, o Supabase sin configurar. El mensaje del error de
      // configuración es útil y se enseña; el resto se resume.
      setError(
        fallo instanceof Error && fallo.message.startsWith('Falta configurar')
          ? fallo.message
          : 'No hay conexión con el servidor.',
      )
      setEntrando(false)
    }
  }

  return (
    <div
      style={{
        minHeight: 'var(--vh-full)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--fondo)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <Logo size={52} sobre="claro" />
          <h1 className="display" style={{ fontSize: 32, color: 'var(--texto)' }}>
            SummitApp
          </h1>
          <p style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
            Sistemas de gestión y cumplimiento
          </p>
        </div>

        <form
          onSubmit={entrar}
          style={{
            background: 'var(--superficie)',
            border: '1px solid var(--borde)',
            borderRadius: 8,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <Campo
            id="correo"
            etiqueta="Correo"
            tipo="email"
            valor={correo}
            alCambiar={setCorreo}
            autoComplete="username"
          />
          <Campo
            id="contrasena"
            etiqueta="Contraseña"
            tipo="password"
            valor={contrasena}
            alCambiar={setContrasena}
            autoComplete="current-password"
          />

          {error && (
            // `role="alert"` para que un lector de pantalla lo anuncie sin que
            // el usuario tenga que ir a buscarlo.
            <p
              role="alert"
              style={{
                fontSize: 13,
                color: 'var(--error)',
                background: 'rgba(185, 28, 28, .08)',
                borderLeft: '2px solid var(--error)',
                padding: '8px 10px',
              }}
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            variante="primario"
            cargando={entrando}
            style={{ width: '100%', marginTop: 4 }}
          >
            Entrar
          </Button>
        </form>

        <p style={{ marginTop: 18, fontSize: 12, color: 'var(--texto-dim)', textAlign: 'center' }}>
          ¿Sin acceso? Pídeselo a la administración de la firma.
        </p>
      </div>
    </div>
  )
}

function Campo({
  id,
  etiqueta,
  tipo,
  valor,
  alCambiar,
  autoComplete,
}: {
  id: string
  etiqueta: string
  tipo: 'email' | 'password'
  valor: string
  alCambiar: (v: string) => void
  autoComplete: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* `<label htmlFor>` real, no un placeholder haciendo de etiqueta: un
          placeholder desaparece al escribir y deja el campo sin nombre. */}
      <label
        htmlFor={id}
        style={{ fontSize: 13, fontWeight: 500, color: 'var(--texto-dim)', letterSpacing: '.04em' }}
      >
        {etiqueta}
      </label>
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        required
        autoComplete={autoComplete}
        style={{
          padding: '10px 12px',
          fontSize: 15,
          fontFamily: 'var(--fuente-texto), sans-serif',
          color: 'var(--texto)',
          background: 'var(--superficie-2)',
          // ⚠️ `--borde-fuerte`, no `--borde`. WCAG 1.4.11 pide 3:1 para el
          // marco de un control; `--borde` da 1.2:1 y sirve para separar, no
          // para delimitar un campo.
          border: '1px solid var(--borde-fuerte)',
          borderRadius: 6,
          width: '100%',
        }}
      />
    </div>
  )
}
