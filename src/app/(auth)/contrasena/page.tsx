'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/ui/Logo'
import Button from '@/components/ui/Button'
import FormularioContrasena from '@/components/cuenta/FormularioContrasena'

/**
 * `/contrasena` — **poner una contraseña propia** tras entrar con una temporal
 * [F06·B3].
 *
 * Quien llega aquí lo hace mandado por `src/proxy.ts`, que mira la marca
 * `debe_cambiar_contrasena` de `user_metadata`. Va **antes** que `/mfa`: quien
 * tenga que enrolar un segundo factor lo hace ya con su contraseña definitiva.
 *
 * ⚠️ Vive en `(auth)`, fuera del armazón, igual que `/mfa`: no se enseña la
 * navegación de una app en la que todavía no se termina de entrar. Y **no es
 * pública** —pide sesión—, así que no va en `RUTAS_PUBLICAS` ni fuera del
 * matcher.
 */
export default function PaginaContrasena() {
  const router = useRouter()

  function listo() {
    // `refresh()` antes de navegar, para que el guard vea al usuario sin la
    // marca y no lo devuelva aquí. Si le falta el segundo factor, el guard lo
    // manda ahora a `/mfa`.
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
            Tu contraseña
          </h1>
          <p style={{ fontSize: 13, color: 'var(--texto-dim)', textAlign: 'center' }}>
            Entraste con una contraseña temporal. Pon una que sólo tú conozcas.
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
          <FormularioContrasena alTerminar={listo} textoBoton="Guardar y entrar" />
        </div>

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <Button variante="fantasma" tamano="sm" onClick={salir}>Salir</Button>
        </div>
      </div>
    </div>
  )
}
