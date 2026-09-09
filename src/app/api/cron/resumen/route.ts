import { NextResponse } from 'next/server'
import { clienteDeServicio, cronAutorizado } from '@/lib/api/cron'
import { empujar, type Carga } from '@/lib/push/servidor'

/**
 * `/api/cron/resumen` — **el digest de la mañana** [F04·B4].
 *
 * ⚠️ **Es criterio de Summit, no del cliente.** `P-SG-08` §5.5 no pide resumen
 * diario: su matriz vive en mensual, bimestral y por evento. Se queda porque un
 * consultor que lleva ocho clientes abre la app a las 8:00 y necesita saber qué
 * le toca — pero dejó de ser la única cadencia, que es lo que corrigió el hueco
 * 27 del catálogo.
 *
 * ⚠️ **No escribe en `notificaciones`.** El resumen es efímero: se empuja y se
 * olvida. Guardarlo llenaría la bandeja de una fila diaria que nadie va a
 * releer, y encima competiría con los avisos que sí hay que atender.
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

  const { data: resumenes, error } = await supabase.rpc('armar_resumen_diario')

  if (error) {
    return NextResponse.json({ ok: false, motivo: error.message })
  }

  const destinatarios = (resumenes ?? []).map((r) => ({
    usuarioId: r.usuario_id,
    carga: {
      titulo: r.titulo,
      cuerpo: r.cuerpo,
      enlace: '/acciones',
      categoria: 'resumen_diario',
      clave: 'resumen_diario',
    } satisfies Carga,
  }))

  const push = await empujar(supabase, destinatarios)

  return NextResponse.json({ ok: true, generados: destinatarios.length, ...push })
}
