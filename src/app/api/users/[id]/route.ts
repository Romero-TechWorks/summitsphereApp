import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { mensajeDeError } from '@/lib/supabase/errores'
import { anotar, error, puedeAdministrar, socioQueLlama } from '@/lib/api/usuarios'

/**
 * `PATCH /api/users/[id]` — **dar de baja o reactivar una cuenta** [F06·B3].
 *
 * ⚠️ **Por qué no es un `update` de `usuarios.activo` por la cola, como el
 * rol.** `activo = false` le quita a alguien ser socio (`es_socio()` lo mira),
 * pero **no le cierra la puerta**: `mis_organizaciones()` no mira `activo`, así
 * que un consultor dado de baja seguiría entrando y viendo los expedientes que
 * tenía asignados. La baja de verdad es **bloquear la cuenta en `auth`**
 * (`ban_duration`), y eso sólo lo hace `service_role`. Las dos cosas van juntas,
 * aquí.
 *
 * ⚠️ **Nada se borra.** Una cuenta que firmó hallazgos y aprobó documentos es
 * evidencia (regla 13): se bloquea y deja de aparecer en los desplegables.
 */
export const dynamic = 'force-dynamic'

const esquema = z.object({ activo: z.boolean() })

/** «Para siempre», en el formato de GoTrue: cien años. `none` levanta el bloqueo. */
const BLOQUEO = '876000h'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quien = await socioQueLlama()
  if ('rechazo' in quien) return quien.rechazo
  const { llamante } = quien
  const { id } = await params

  const cuerpo = esquema.safeParse(await request.json().catch(() => null))
  if (!cuerpo.success) return error(400, 'Falta decir si la cuenta queda activa.')
  const { activo } = cuerpo.data

  // Un socio que se da de baja a sí mismo se queda fuera, y si era el único,
  // la firma se queda sin nadie que pueda volver a darlo de alta.
  if (id === llamante.id) return error(400, 'No puedes darte de baja a ti mismo.')

  try {
    const admin = createAdminClient()

    const { data: destino, error: falloDestino } = await admin
      .from('usuarios')
      .select('id, correo, es_dev')
      .eq('id', id)
      .maybeSingle()
    if (falloDestino) return error(500, falloDestino.message)
    if (!destino || !puedeAdministrar(llamante, destino)) return error(404, 'Esa cuenta no existe.')

    const { error: falloAuth } = await admin.auth.admin.updateUserById(id, {
      ban_duration: activo ? 'none' : BLOQUEO,
    })
    if (falloAuth) return error(500, mensajeDeError(falloAuth))

    const { data: fila, error: falloPerfil } = await admin
      .from('usuarios')
      .update({ activo })
      .eq('id', id)
      .select()
      .single()
    if (falloPerfil) {
      return error(
        500,
        `La cuenta quedó ${activo ? 'desbloqueada' : 'bloqueada'}, pero su perfil no se actualizó: ${falloPerfil.message}`,
      )
    }

    const bitacora = await anotar(
      admin, llamante, id, 'UPDATE',
      activo ? `Reactivación de ${destino.correo}` : `Baja de ${destino.correo} (cuenta bloqueada)`,
    )

    return NextResponse.json({ ok: true, usuario: fila, avisos: bitacora ? [bitacora] : [] })
  } catch (fallo) {
    return error(500, mensajeDeError(fallo))
  }
}
