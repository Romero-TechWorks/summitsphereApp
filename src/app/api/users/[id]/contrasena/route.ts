import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mensajeDeError } from '@/lib/supabase/errores'
import {
  anotar,
  contrasenaTemporal,
  error,
  MARCA_CAMBIO,
  puedeAdministrar,
  socioQueLlama,
} from '@/lib/api/usuarios'

/**
 * `POST /api/users/[id]/contrasena` — **una contraseña temporal nueva** para
 * quien olvidó la suya [F06·B3].
 *
 * Vuelve a encender la marca de cambio: la persona entra con la temporal y la
 * app la manda a ponerse una propia. La contraseña se devuelve una vez y no
 * se guarda.
 *
 * ⚠️ **No sobre la cuenta propia**: para eso está `/contrasena`, que pide la
 * sesión de quien la cambia. Resetearse a uno mismo por aquí sería cambiar la
 * contraseña sin pasar por el segundo factor de esa sesión.
 */
export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quien = await socioQueLlama()
  if ('rechazo' in quien) return quien.rechazo
  const { llamante } = quien
  const { id } = await params

  if (id === llamante.id) {
    return error(400, 'Tu propia contraseña se cambia desde Admin → Mi cuenta.')
  }

  try {
    const admin = createAdminClient()

    const { data: destino, error: falloDestino } = await admin
      .from('usuarios')
      .select('id, correo, es_dev')
      .eq('id', id)
      .maybeSingle()
    if (falloDestino) return error(500, falloDestino.message)
    if (!destino || !puedeAdministrar(llamante, destino)) return error(404, 'Esa cuenta no existe.')

    const contrasena = contrasenaTemporal()
    const { error: fallo } = await admin.auth.admin.updateUserById(id, {
      password: contrasena,
      // Se MEZCLA con lo que ya tiene `user_metadata`; no borra el nombre.
      user_metadata: MARCA_CAMBIO,
    })
    if (fallo) return error(500, mensajeDeError(fallo))

    const bitacora = await anotar(admin, llamante, id, 'UPDATE', `Contraseña temporal nueva para ${destino.correo}`)

    return NextResponse.json({ ok: true, contrasena, avisos: bitacora ? [bitacora] : [] })
  } catch (fallo) {
    return error(500, mensajeDeError(fallo))
  }
}
