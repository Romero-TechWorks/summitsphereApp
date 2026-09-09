import { NextResponse } from 'next/server'
import { clienteDeServicio, cronAutorizado } from '@/lib/api/cron'
import { empujar, type Carga } from '@/lib/push/servidor'

/**
 * `/api/cron/diario` — **el cron de vencimientos** [F04·B4].
 *
 * ⚠️ **TODA la lógica vive en `correr_avisos_programados()`**, la RPC. Esta ruta
 * sólo hace el fan-out de push, y `docs/02` lo fijó así por dos motivos: la
 * función necesita ver las acciones de **todas** las organizaciones para contar
 * vencimientos —imposible desde el RLS— y, si mañana el cron se dispara desde
 * otro sitio, la lógica no se muda.
 *
 * ⚠️ **El plan Hobby de Vercel permite exactamente dos crons**, y están ocupados
 * con éste y el resumen. Lo que necesite otra cadencia —el «Estado de las NC»
 * bimestral de `P-SG-08`— se cuelga de aquí con su propia comprobación de fecha,
 * dentro de la RPC. No se pide un tercero.
 *
 * ⚠️ **Devuelve 200 aunque falte algo.** Un 500 en Vercel Cron deja una línea
 * roja en el panel que no dice qué falta; un 200 con `{ ok: false, motivo }` se
 * lee. Sólo el rechazo de autenticación es 401.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!cronAutorizado(request)) {
    return NextResponse.json({ ok: false, motivo: 'No autorizado.' }, { status: 401 })
  }

  const supabase = clienteDeServicio()
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      motivo: 'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el despliegue.',
    })
  }

  const { data: avisos, error } = await supabase.rpc('correr_avisos_programados')

  if (error) {
    return NextResponse.json({ ok: false, motivo: error.message })
  }

  const destinatarios = (avisos ?? []).map((a) => ({
    usuarioId: a.usuario_id,
    carga: {
      titulo: a.titulo,
      cuerpo: a.cuerpo ?? '',
      enlace: a.enlace ?? '/acciones',
      categoria: a.categoria,
      // Colapsa por categoría: si el teléfono estuvo dos días apagado, al volver
      // no se apilan tres avisos del mismo tipo.
      clave: a.categoria,
    } satisfies Carga,
  }))

  const push = await empujar(supabase, destinatarios)

  return NextResponse.json({
    ok: true,
    generados: destinatarios.length,
    ...push,
  })
}
