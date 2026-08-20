'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/ui/Logo'
import Button from '@/components/ui/Button'

/**
 * El segundo factor (F00·B3 · docs/08_SEGURIDAD_Y_RLS.md §1).
 *
 * Quien llega aquí lo hace mandado por `src/proxy.ts`, que es donde se impone
 * la regla — esta pantalla sólo es el trámite. Cubre los tres estados en los
 * que puede estar una cuenta, y decide sola cuál es:
 *
 *   · sin ningún factor  → enrolar: código QR, y a escanearlo.
 *   · con factor sin usar en esta sesión → reto: los seis dígitos.
 *   · ya con `aal2`      → nada que hacer, se pasa de largo.
 *
 * ⚠️ Vive en `(auth)`, fuera del armazón del dashboard, a propósito: quien
 * todavía no verificó no debería ver la navegación de una aplicación en la que
 * aún no ha terminado de entrar.
 *
 * ⚠️ Aquí sí se usa `useEffect`, y no contradice la regla del offline: lo que se
 * carga no son datos de un cliente sino el estado de la propia sesión, que no
 * se cachea, no se sincroniza y no existe sin señal — sin red no hay segundo
 * factor que verificar porque tampoco hubo inicio de sesión.
 */

type Modo = 'cargando' | 'enrolar' | 'reto' | 'listo' | 'roto'

export default function PaginaMfa() {
  const router = useRouter()

  const [modo, setModo] = useState<Modo>('cargando')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [secreto, setSecreto] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)

  const preparar = useCallback(async () => {
    // ⚠️ El cliente se crea DENTRO de la función, no en el cuerpo del
    // componente. `useMemo` corre también al prerenderizar en el servidor, y
    // ahí no hay variables de entorno: `next build` reventaba en `/mfa` con
    // "Falta configurar Supabase" en cualquier máquina sin `.env.local`,
    // incluido el runner de CI —que compila sin credenciales a propósito—.
    // Dentro de un manejador o de un efecto, sólo corre en el navegador.
    const supabase = createClient()

    try {
      const { data: niveles } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (niveles?.currentLevel === 'aal2') {
        setModo('listo')
        return
      }

      const { data: factores, error: falloLista } = await supabase.auth.mfa.listFactors()
      if (falloLista) throw falloLista

      const verificado = factores.totp.find((f) => f.status === 'verified')
      if (verificado) {
        setFactorId(verificado.id)
        setModo('reto')
        return
      }

      // Un enrolamiento a medias de un intento anterior —la persona cerró la
      // pestaña antes de escanear— deja un factor sin verificar que hace fallar
      // el siguiente `enroll` por nombre repetido. Se limpia antes de empezar.
      for (const f of factores.all) {
        if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
      }

      const { data: alta, error: falloAlta } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'SummitApp',
        issuer: 'Summit-Sphere',
      })
      if (falloAlta) throw falloAlta

      setFactorId(alta.id)
      setQr(alta.totp.qr_code)
      setSecreto(alta.totp.secret)
      setModo('enrolar')
    } catch (fallo) {
      // ⚠️ Nada de `catch` vacío: si esto falla, la persona no entra a la app y
      // tiene que poder decir por qué. El caso frecuente tiene nombre propio y
      // no es un error del código, es una casilla sin marcar en Supabase.
      const mensaje = fallo instanceof Error ? fallo.message : ''
      setError(
        /disabled|not enabled|unsupported/i.test(mensaje)
          ? 'El segundo factor no está habilitado en Supabase todavía: ' +
            'Authentication → Multi-Factor Authentication → TOTP (guias/02_SUPABASE.md §3).'
          : mensaje || 'No se pudo preparar el segundo factor.',
      )
      setModo('roto')
    }
  }, [])

  useEffect(() => {
    // El compilador de React marca cualquier `setState` que salga de un efecto,
    // y con razón en el caso normal. Aquí no hay renderizado en cascada: la
    // primera línea de `preparar` es un `await` contra Supabase, así que nada de
    // lo que pone estado corre en el mismo turno del efecto. Es una consulta a
    // un sistema externo al montar, que es justo el caso que un efecto sí es.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void preparar()
  }, [preparar])

  async function verificar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!factorId) return

    setError(null)
    setVerificando(true)

    const supabase = createClient()
    const { error: fallo } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: codigo.replace(/\s/g, ''),
    })

    if (fallo) {
      setError(
        /invalid|incorrect/i.test(fallo.message)
          ? 'El código no coincide. Escribe los seis dígitos que se ven en este momento: cambian cada 30 segundos.'
          : fallo.message,
      )
      setVerificando(false)
      return
    }

    // El token de la sesión sube a `aal2`. `refresh()` antes de navegar para que
    // el guard del servidor vea la cookie nueva y no la de hace un segundo.
    router.refresh()
    router.replace('/')
  }

  async function salir() {
    await createClient().auth.signOut()
    router.refresh()
    router.replace('/login')
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Logo size={52} sobre="claro" />
          <h1 className="display" style={{ fontSize: 30, color: 'var(--texto)', textAlign: 'center' }}>
            Segundo factor
          </h1>
          <p style={{ fontSize: 13, color: 'var(--texto-dim)', textAlign: 'center' }}>
            {modo === 'enrolar'
              ? 'Tu rol ve la cartera completa: hace falta una segunda llave.'
              : modo === 'reto'
                ? 'Escribe el código de tu aplicación de autenticación.'
                : 'Verificación de identidad'}
          </p>
        </div>

        <div
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
          {modo === 'cargando' && (
            <p style={{ fontSize: 13, color: 'var(--texto-dim)', textAlign: 'center' }}>
              Preparando…
            </p>
          )}

          {modo === 'listo' && (
            <>
              <p style={{ fontSize: 14, color: 'var(--texto)' }}>
                Tu segundo factor ya está verificado en esta sesión.
              </p>
              <Button variante="primario" onClick={() => router.replace('/')} style={{ width: '100%' }}>
                Continuar
              </Button>
            </>
          )}

          {modo === 'enrolar' && (
            <>
              <ol style={{ fontSize: 13, color: 'var(--texto-dim)', paddingLeft: 18, margin: 0, lineHeight: 1.6 }}>
                <li>Abre Google Authenticator, Microsoft Authenticator o tu gestor de contraseñas.</li>
                <li>Escanea este código.</li>
                <li>Escribe abajo los seis dígitos que aparezcan.</li>
              </ol>

              {qr && (
                // `qr_code` viene de Supabase como un SVG en un `data:` URI, así
                // que no hace falta ninguna librería de códigos QR.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr}
                  alt="Código QR para enrolar el segundo factor"
                  style={{
                    width: 180,
                    height: 180,
                    alignSelf: 'center',
                    background: '#fff',
                    border: '1px solid var(--borde)',
                    borderRadius: 6,
                    padding: 8,
                  }}
                />
              )}

              {secreto && (
                <details style={{ fontSize: 12, color: 'var(--texto-dim)' }}>
                  <summary style={{ cursor: 'pointer' }}>No puedo escanear el código</summary>
                  <p style={{ marginTop: 8 }}>
                    Escribe esta clave a mano en tu aplicación, y{' '}
                    <strong style={{ color: 'var(--texto)' }}>guárdala en tu gestor de contraseñas</strong>:
                    es lo único que te devuelve el acceso si pierdes el teléfono.
                  </p>
                  <code
                    style={{
                      display: 'block',
                      marginTop: 8,
                      padding: '8px 10px',
                      fontFamily: 'var(--fuente-mono), monospace',
                      fontSize: 13,
                      color: 'var(--texto)',
                      background: 'var(--superficie-2)',
                      border: '1px solid var(--borde)',
                      borderRadius: 6,
                      wordBreak: 'break-all',
                    }}
                  >
                    {secreto}
                  </code>
                </details>
              )}
            </>
          )}

          {(modo === 'enrolar' || modo === 'reto') && (
            <form onSubmit={verificar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label
                  htmlFor="codigo"
                  style={{ fontSize: 13, fontWeight: 500, color: 'var(--texto-dim)', letterSpacing: '.04em' }}
                >
                  Código de seis dígitos
                </label>
                <input
                  id="codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  required
                  autoFocus
                  // `one-time-code` es lo que hace que el teléfono ofrezca el
                  // código sin salir de la app, e `inputMode` levanta el teclado
                  // numérico: se escribe con una mano, de pie, en una planta.
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  style={{
                    padding: '10px 12px',
                    fontSize: 22,
                    letterSpacing: '.35em',
                    textAlign: 'center',
                    fontFamily: 'var(--fuente-mono), monospace',
                    color: 'var(--texto)',
                    background: 'var(--superficie-2)',
                    border: '1px solid var(--borde-fuerte)',
                    borderRadius: 6,
                    width: '100%',
                  }}
                />
              </div>

              <Button type="submit" variante="primario" cargando={verificando} style={{ width: '100%' }}>
                {modo === 'enrolar' ? 'Activar' : 'Verificar'}
              </Button>
            </form>
          )}

          {error && (
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

          {modo === 'roto' && (
            <Button variante="secundario" onClick={() => { setError(null); setModo('cargando'); void preparar() }}>
              Reintentar
            </Button>
          )}
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button variante="fantasma" tamano="sm" onClick={salir}>
            Salir de la cuenta
          </Button>
        </div>
      </div>
    </div>
  )
}
