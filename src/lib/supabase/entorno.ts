/**
 * Lectura de las variables de Supabase, en un solo sitio.
 *
 * ⚠️ Se leen DENTRO de una función, nunca en el cuerpo del módulo. Si se leyeran
 * al importar, `next build` fallaría en cualquier máquina que no tenga el
 * `.env.local` — incluidos los runners de CI, que compilan a propósito sin
 * credenciales reales.
 *
 * ⚠️ Y no llevan `!`. `process.env.X!` le miente al compilador: promete un
 * string y entrega `undefined`, y el error acaba saliendo cuatro capas más
 * abajo, dentro de la librería de Supabase, con un mensaje que no menciona
 * ninguna variable de entorno. Mejor fallar aquí y decir cuál falta.
 */

export type ConfigSupabase = {
  url: string
  anonKey: string
}

/** Devuelve la config, o `null` si falta alguna variable. */
export function leerConfigSupabase(): ConfigSupabase | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return { url, anonKey }
}

/** Devuelve la config o lanza diciendo exactamente qué falta y dónde ponerlo. */
export function exigirConfigSupabase(): ConfigSupabase {
  const config = leerConfigSupabase()
  if (config) return config

  const faltan = [
    process.env.NEXT_PUBLIC_SUPABASE_URL ? null : 'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? null : 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean)

  throw new Error(
    `Falta configurar Supabase: ${faltan.join(', ')}. ` +
    `En local van en .env.local; en Vercel, en Settings → Environment Variables ` +
    `marcando los tres entornos. Ver guias/05_VARIABLES_DE_ENTORNO.md.`,
  )
}
