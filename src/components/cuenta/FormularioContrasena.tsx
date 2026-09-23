'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mensajeDeError } from '@/lib/supabase/errores'
import Aviso from '@/components/ui/Aviso'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

/** Lo mínimo. Supabase pide 6 por omisión; una contraseña de la firma, más. */
export const LARGO_MINIMO = 10

/**
 * Poner una contraseña propia [F06·B3]. Lo comparten `/contrasena` —a donde
 * `src/proxy.ts` manda a quien entró con una temporal— y la pestaña
 * **Mi cuenta** de `/admin`, para cambiarla cuando uno quiera.
 *
 * ⚠️ **La contraseña y la marca se cambian en LA MISMA llamada**
 * (`updateUser({ password, data })`). En dos, un corte entre la primera y la
 * segunda dejaría a la persona con contraseña nueva y la app mandándola otra
 * vez a cambiarla — o, al revés, sin marca y con la temporal todavía puesta.
 *
 * ⚠️ **Sin cola**: cambiar la contraseña sin red no tiene sentido. Sin señal se
 * dice y no se intenta.
 */
export default function FormularioContrasena({
  alTerminar,
  textoBoton = 'Guardar contraseña',
}: {
  alTerminar: () => void
  textoBoton?: string
}) {
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    if (nueva.length < LARGO_MINIMO) {
      setError(`Tiene que tener al menos ${LARGO_MINIMO} caracteres.`)
      return
    }
    if (nueva !== repetida) {
      setError('Las dos no coinciden.')
      return
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Sin conexión. La contraseña se cambia con señal.')
      return
    }

    setGuardando(true)
    try {
      const { error: fallo } = await createClient().auth.updateUser({
        password: nueva,
        data: { debe_cambiar_contrasena: false },
      })
      if (fallo) {
        const motivo = mensajeDeError(fallo)
        setError(
          /same|different from the old/i.test(motivo)
            ? 'Tiene que ser distinta de la que tenías.'
            : /weak|pwned|leaked/i.test(motivo)
              ? 'Esa contraseña es demasiado débil o aparece en filtraciones conocidas. Elige otra.'
              : /reauthentication|recent/i.test(motivo)
                ? 'Por seguridad, cierra sesión y vuelve a entrar antes de cambiarla.'
                : motivo,
        )
        return
      }
      setNueva('')
      setRepetida('')
      alTerminar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Input
        etiqueta="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        required
        value={nueva}
        onChange={(e) => setNueva(e.target.value)}
        ayuda={`Al menos ${LARGO_MINIMO} caracteres. Una frase corta sirve mejor que una palabra con símbolos.`}
      />
      <Input
        etiqueta="Repítela"
        type="password"
        autoComplete="new-password"
        required
        value={repetida}
        onChange={(e) => setRepetida(e.target.value)}
      />
      {error && <Aviso tono="error">{error}</Aviso>}
      <Button type="submit" variante="primario" cargando={guardando} style={{ width: '100%' }}>
        {textoBoton}
      </Button>
    </form>
  )
}
