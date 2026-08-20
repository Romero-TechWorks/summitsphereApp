/**
 * El middleware de sesión (docs/03_ARQUITECTURA.md §7.1).
 *
 * ⚠️ En Next.js 16 el archivo se llama `proxy.ts` y exporta `proxy`.
 * `middleware.ts` está deprecado: si renombras este archivo, deja de correr y
 * la app queda ABIERTA sin que nada falle ni avise.
 *
 * Hace tres cosas (docs/03_ARQUITECTURA.md §7.1):
 *   1. Refresca la sesión de Supabase en cada petición.
 *   2. Redirige a `/login` a quien no tenga sesión.
 *   3. Exige `aal2` —segundo factor— a los roles `socio` y `administracion`.
 *
 * ⚠️ El MFA se impone AQUÍ, no en la interfaz. Una pantalla que se esconde no
 * protege nada: los datos siguen a un `fetch` de distancia. Sin `aal2` en el
 * token, un socio no llega a ninguna ruta que no sea `/mfa`.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { exigeMfa } from '@/lib/auth/roles'
import type { Database } from '@/types/database'

/** Rutas que existen sin sesión. Si agregas una, va también en el matcher. */
const RUTAS_PUBLICAS = ['/login']

/**
 * La pantalla del segundo factor: pide sesión, pero está exenta de exigir
 * `aal2` — es donde se consigue. Sin esta excepción, quien tenga que enrolarse
 * queda en un bucle de redirecciones contra sí mismo.
 */
const RUTA_MFA = '/mfa'

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Sin credenciales no se puede comprobar ninguna sesión. Se cierra la puerta
  // —nunca se deja pasar— y se dice exactamente qué falta.
  //
  // Es el estado en el que queda un despliegue nuevo de Vercel antes de cargar
  // las variables: sin esto, `createServerClient` lanza dentro de la librería y
  // el navegador enseña un 500 genérico que no menciona ninguna variable.
  if (!url || !anonKey) {
    const faltan = [
      url ? null : 'NEXT_PUBLIC_SUPABASE_URL',
      anonKey ? null : 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ].filter(Boolean).join(', ')

    return new NextResponse(
      `SummitApp no está configurada todavía.\n\n` +
      `Faltan estas variables de entorno: ${faltan}\n\n` +
      `En Vercel: Settings → Environment Variables, marcando los tres entornos\n` +
      `(Production, Preview y Development).\n` +
      `En local: .env.local\n\n` +
      `Detalle: guias/05_VARIABLES_DE_ENTORNO.md\n`,
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    )
  }

  let respuesta = NextResponse.next({ request })

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        respuesta = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          respuesta.cookies.set(name, value, options),
        )
      },
    },
  })

  // ⚠️ `getUser()` y no `getSession()`. `getSession()` lee la cookie y confía en
  // ella; `getUser()` valida el token contra Supabase. En un guard de acceso la
  // diferencia es que uno se puede falsificar y el otro no.
  const { data: { user } } = await supabase.auth.getUser()
  const ruta = request.nextUrl.pathname
  const esPublica = RUTAS_PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`))

  if (!user && !esPublica) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/login'
    // Para devolverlo a donde iba después de entrar. Sólo rutas internas: un
    // `?siguiente=https://otro-sitio` convertiría el login en un redirector
    // abierto y en el anzuelo perfecto para un correo de phishing.
    destino.searchParams.set('siguiente', ruta)
    return NextResponse.redirect(destino)
  }

  if (user && esPublica) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/'
    destino.search = ''
    return NextResponse.redirect(destino)
  }

  if (user && ruta !== RUTA_MFA && await faltaSegundoFactor(supabase, user.id)) {
    const destino = request.nextUrl.clone()
    destino.pathname = RUTA_MFA
    destino.search = ''
    return NextResponse.redirect(destino)
  }

  return respuesta
}

/**
 * Si esta petición tiene que pasar antes por `/mfa`.
 *
 * Los dos niveles de Supabase dicen todo lo que hace falta saber, y sin tocar
 * la red: `currentLevel` es lo que trae el token de ESTA sesión, `nextLevel` es
 * hasta dónde podría llegar este usuario con los factores que ya tiene.
 *
 *   aal2 / aal2 → ya verificó en esta sesión. Pasa.
 *   aal1 / aal2 → tiene un factor y no lo ha usado todavía. A `/mfa`, sea cual
 *                 sea su rol: si te enrolaste, se te exige — también al
 *                 consultor que lo activó por su cuenta.
 *   aal1 / aal1 → no tiene ningún factor. Sólo aquí hace falta saber el rol.
 *
 * ⚠️ El orden importa por costo: la consulta a `usuarios` es lo último y sólo la
 * pagan las cuentas sin segundo factor. Ponerla arriba sería una consulta a la
 * base **en cada navegación de cada usuario**, y el proxy corre antes de pintar
 * un solo píxel.
 */
async function faltaSegundoFactor(
  supabase: ReturnType<typeof createServerClient<Database>>,
  usuarioId: string,
): Promise<boolean> {
  const { data: niveles } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (niveles?.currentLevel === 'aal2') return false
  if (niveles?.nextLevel === 'aal2') return true

  const { data: perfil, error } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', usuarioId)
    .maybeSingle()

  // Sin perfil todavía —o sin poder leerlo— no se inventa un rol. La cuenta
  // pasa, pero no ve nada: el RLS no le da ninguna organización mientras nadie
  // se la asigne. Cerrarle el paso aquí, en cambio, dejaría a un usuario recién
  // creado atrapado en `/mfa` sin nada que enrolar que le sirviera.
  if (error || !perfil) return false

  return exigeMfa(perfil.rol)
}

/**
 * Qué NO pasa por el guard de sesión.
 *
 * ⚠️ **Los archivos de la PWA tienen que quedar fuera.** Si `/sw.js` entra aquí,
 * un visitante sin sesión lo pide, el guard lo manda a `/login` y el navegador
 * recibe HTML donde esperaba JavaScript. Da dos errores que no se parecen en
 * nada a su causa:
 *
 *     SecurityError: ... script resource is behind a redirect, which is disallowed
 *     Uncaught SyntaxError: Unexpected token '<'
 *
 * El efecto real es que **el service worker no se registra en la pantalla de
 * login**: en un primer arranque la capa offline no existe hasta que el usuario
 * entra y la página vuelve a registrarlo. Lo mismo con `manifest.json`, que es
 * lo que el navegador lee para ofrecer instalar la app.
 *
 * ⚠️ Al agregar un archivo generado a `public/`, hay que sumarlo a esta lista.
 * `worker-*` y `swe-worker-*` van por separado a propósito: los dos patrones se
 * anclan al inicio de la ruta, así que `worker-.*` no cubre a `swe-worker-*`.
 *
 * `monitoring` es el túnel de Sentry: va sin sesión a propósito (ver
 * `next.config.mjs`). Los dos cambios se hacen juntos SIEMPRE.
 *
 * `api/cron` queda fuera porque lo dispara Vercel, no un navegador: llega sin
 * sesión y el guard lo mandaría a `/login`, así que la tarea nunca correría. Se
 * autentica sola con `CRON_SECRET`. El resto de `/api` sí pasa por aquí.
 *
 * `portal` es el portal del cliente [Fase 06]: es **público por definición** —lo
 * abre el responsable de calidad del cliente desde una liga que le llegó por
 * correo, sin cuenta en la app y sin intención de crearla—. Su seguridad no es
 * la sesión sino el token de la URL, que `portal_organizacion()` valida en la
 * base y que sólo abre esa organización.
 *
 * ⚠️ Toda ruta pública nueva se suma a esta lista **en el mismo commit que la
 * crea**, no después.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|monitoring|api/cron|portal|sw\\.js|workbox-.*\\.js|worker-.*\\.js|swe-worker-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js\\.map)$).*)',
  ],
}
