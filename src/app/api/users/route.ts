import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { mensajeDeError } from '@/lib/supabase/errores'
import { ROLES } from '@/lib/auth/roles'
import { anotar, contrasenaTemporal, error, MARCA_CAMBIO, socioQueLlama } from '@/lib/api/usuarios'

/**
 * `POST /api/users` — **alta de una cuenta con contraseña temporal** [F06·B3].
 *
 * Decisión del dueño (23 sep 2026): la cuenta la da de alta un socio, con una
 * contraseña temporal que se le entrega a la persona, y que ésta **tiene que
 * cambiar al entrar** (`src/proxy.ts` la manda a `/contrasena`). Sin invitación
 * por correo: no depende de que el SMTP de Supabase esté configurado ni de que
 * el correo no acabe en spam.
 *
 * ⚠️ **La contraseña la genera el servidor y se devuelve UNA vez.** No se
 * guarda en ningún sitio de la app ni va a la bitácora: si se pierde, se genera
 * otra (`/api/users/[id]/contrasena`).
 *
 * ⚠️ **El rol NO viaja en `user_metadata`.** `crear_perfil_usuario()` crea la
 * fila siempre como `cliente` —esa columna la puede escribir el propio usuario—
 * y aquí se asciende después con `service_role`, que es la única vía que
 * `proteger_rol_usuario()` deja pasar sin sesión de socio.
 */
export const dynamic = 'force-dynamic'

const esquema = z.object({
  nombre: z.string().trim().min(1, 'Falta el nombre.'),
  correo: z.string().trim().email('Ese correo no parece válido.'),
  rol: z.enum(ROLES),
  telefono: z.string().trim().optional(),
})

export async function POST(request: Request) {
  const quien = await socioQueLlama()
  if ('rechazo' in quien) return quien.rechazo
  const { llamante } = quien

  const cuerpo = esquema.safeParse(await request.json().catch(() => null))
  if (!cuerpo.success) {
    return error(400, cuerpo.error.issues[0]?.message ?? 'Datos incompletos.')
  }
  const { nombre, rol, telefono } = cuerpo.data
  // ⚠️ En minúsculas: `usuarios.correo` se copia tal cual de `auth.users.email`,
  // y una mayúscula ya costó un `update ... where correo = …` que tocó cero
  // filas (docs/09 · A10).
  const correo = cuerpo.data.correo.toLowerCase()

  try {
    const admin = createAdminClient()
    const contrasena = contrasenaTemporal()

    const { data: alta, error: falloAlta } = await admin.auth.admin.createUser({
      email: correo,
      password: contrasena,
      // Sin correo de confirmación: la cuenta la da de alta un socio que ya sabe
      // de quién es ese correo.
      email_confirm: true,
      user_metadata: { nombre, ...MARCA_CAMBIO },
    })

    if (falloAlta || !alta.user) {
      const motivo = falloAlta ? mensajeDeError(falloAlta) : 'Supabase no devolvió la cuenta.'
      return error(
        /already|registered|exists/i.test(motivo) ? 409 : 500,
        /already|registered|exists/i.test(motivo) ? `Ya existe una cuenta con ${correo}.` : motivo,
      )
    }

    const id = alta.user.id

    // El perfil ya lo creó el trigger, como `cliente`. Aquí se le pone lo que
    // eligió el socio — y la partición del socio: una cuenta que da de alta la
    // cuenta de pruebas nace de pruebas, o su propio creador no podría verla.
    const { error: falloPerfil } = await admin
      .from('usuarios')
      .update({ nombre, rol, telefono: telefono || null, es_dev: llamante.esDev })
      .eq('id', id)

    const avisos: string[] = []
    if (falloPerfil) {
      avisos.push(
        `La cuenta se creó, pero no se le pudo poner el rol (${falloPerfil.message}). ` +
        'Quedó como «cliente»: cámbiale el rol desde la lista.',
      )
    }

    const bitacora = await anotar(admin, llamante, id, 'INSERT', `Alta de ${correo} como ${rol}, con contraseña temporal`)
    if (bitacora) avisos.push(bitacora)

    return NextResponse.json({ ok: true, id, contrasena, avisos })
  } catch (fallo) {
    return error(500, mensajeDeError(fallo))
  }
}
