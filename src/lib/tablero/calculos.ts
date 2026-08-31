/**
 * Lo que enseñan los widgets del tablero [F01·B3].
 *
 * ⚠️ **Funciones puras sobre la lista de proyectos que ya está en la caché, y
 * NO vistas de la base.** Es una decisión de offline, no de pereza:
 *
 * - Una vista sería otra consulta, otra clave y otra cosa que puede no estar en
 *   la caché. El tablero es lo primero que se abre por la mañana —a veces con
 *   media barra de señal en el estacionamiento de una planta— y tiene que
 *   pintarse con lo que ya se descargó.
 * - Cada widget sale de **la misma lista** que su pantalla: los cuatro de la
 *   cartera de `/cartera?tab=proyectos`, y los tres de la Fase 03 de
 *   `/auditorias` y de su pestaña de hallazgos. Abrir cualquiera de las dos
 *   pantallas deja lista la otra, y el tablero no pide ni una consulta propia.
 * - Y son decenas o cientos de proyectos, no millones de filas. El día que una
 *   firma tenga cinco mil, esto se mueve a una vista con `security_invoker` —y
 *   ese día se paga, no hoy.
 */

import { ESTADOS_ARCHIVADOS_PROYECTO, ETAPAS_PROYECTO } from '@/lib/cartera/catalogos'
import {
  ESTADOS_ABIERTOS_HALLAZGO,
  ESTADOS_ARCHIVADOS_AUDITORIA,
  TRAMOS_ANTIGUEDAD,
} from '@/lib/auditorias/catalogos'
import { toISODate } from '@/lib/utils/dates'
import type { ProyectoEnCartera } from '@/lib/queries/proyectos'
import type { AuditoriaEnLista } from '@/lib/queries/auditorias'
import { diasAbierto, type HallazgoEnCartera } from '@/lib/queries/hallazgos'

/** Los que cuentan como trabajo vivo: ni cerrados ni cancelados. */
export function proyectosVivos(proyectos: ProyectoEnCartera[]): ProyectoEnCartera[] {
  return proyectos.filter((p) => !ESTADOS_ARCHIVADOS_PROYECTO.includes(p.estado))
}

export type TramoEmbudo = { etapa: string; etiqueta: string; total: number }

/**
 * El embudo: cuántos proyectos vivos hay en cada una de las seis etapas.
 *
 * ⚠️ Devuelve **las seis siempre**, incluidas las que están en cero. Un embudo
 * al que le faltan los tramos vacíos no es un embudo: lo que dice «no hay nada
 * en certificación» es justamente el hueco.
 */
export function embudoPorEtapa(proyectos: ProyectoEnCartera[]): TramoEmbudo[] {
  const vivos = proyectosVivos(proyectos)

  return ETAPAS_PROYECTO.map((etapa) => ({
    etapa: etapa.valor,
    etiqueta: etapa.etiqueta,
    total: vivos.filter((p) => p.etapa === etapa.valor).length,
  }))
}

export type CargaConsultor = { id: string | null; nombre: string; total: number }

/**
 * Cuántos proyectos vivos lleva cada quien.
 *
 * ⚠️ Los proyectos **sin líder** salen agrupados al final, no se esconden: un
 * contrato que no tiene dueño es exactamente lo que un socio necesita ver en su
 * tablero.
 */
export function cargaPorConsultor(proyectos: ProyectoEnCartera[]): CargaConsultor[] {
  const porConsultor = new Map<string, CargaConsultor>()
  let sinLider = 0

  for (const proyecto of proyectosVivos(proyectos)) {
    if (!proyecto.lider_id) {
      sinLider++
      continue
    }

    const previo = porConsultor.get(proyecto.lider_id)
    if (previo) previo.total++
    else {
      porConsultor.set(proyecto.lider_id, {
        id: proyecto.lider_id,
        // El nombre puede faltar si el embed no llegó: se degrada, no se rompe.
        nombre: proyecto.lider?.nombre ?? 'Consultor',
        total: 1,
      })
    }
  }

  const lista = [...porConsultor.values()].sort((a, b) => b.total - a.total)
  if (sinLider > 0) lista.push({ id: null, nombre: 'Sin líder asignado', total: sinLider })

  return lista
}

/**
 * Los contratos que terminan pronto — **y los que ya vencieron sin cerrarse**.
 *
 * ⚠️ Lo vencido va primero y no se filtra. Un proyecto cuya fecha de fin pasó
 * hace dos meses y sigue `activo` es el que hay que mirar hoy: o se cerró y
 * nadie lo marcó, o se está trabajando gratis.
 *
 * ⚠️ Las fechas se comparan como **texto** `YYYY-MM-DD`, nunca con `new Date()`:
 * se ordenan igual y no entra ninguna zona horaria de por medio (CLAUDE.md ·
 * trampas heredadas).
 */
export function proximosACerrar(
  proyectos: ProyectoEnCartera[],
  dias = 60,
): ProyectoEnCartera[] {
  const hoy = toISODate()
  const limite = toISODate(new Date(Date.now() + dias * 24 * 60 * 60 * 1000))

  return proyectosVivos(proyectos)
    .filter((p) => p.fecha_fin_estimada !== null && p.fecha_fin_estimada <= limite)
    .sort((a, b) => (a.fecha_fin_estimada ?? '').localeCompare(b.fecha_fin_estimada ?? ''))
    .map((p) => ({ ...p, vencido: (p.fecha_fin_estimada ?? '') < hoy }) as ProyectoEnCartera)
}

/**
 * Los proyectos de quien mira, **los suyos primero**.
 *
 * Un consultor ve por RLS los de todas sus organizaciones asignadas; los que
 * lidera él van arriba, y dentro de cada grupo manda la fecha más próxima.
 */
export function misProyectos(
  proyectos: ProyectoEnCartera[],
  usuarioId: string | null,
): ProyectoEnCartera[] {
  return proyectosVivos(proyectos).sort((a, b) => {
    const mio = (p: ProyectoEnCartera) => (usuarioId && p.lider_id === usuarioId ? 0 : 1)
    if (mio(a) !== mio(b)) return mio(a) - mio(b)

    // Sin fecha, al final: no compite con lo que sí tiene compromiso.
    const fechaA = a.fecha_fin_estimada ?? '9999-12-31'
    const fechaB = b.fecha_fin_estimada ?? '9999-12-31'
    return fechaA.localeCompare(fechaB)
  })
}

// ═══════════════════════════════════════════ los tres de la Fase 03 ════════

/**
 * Las auditorías que siguen siendo trabajo: ni cerradas ni canceladas.
 *
 * ⚠️ Una `cancelada` no se esconde en `/auditorias` porque explica por qué el
 * programa anual no se cumplió; en el tablero sí, porque el tablero contesta
 * «qué tengo esta semana» y una auditoría que no se va a hacer no es eso.
 */
export function auditoriasVivas(auditorias: AuditoriaEnLista[]): AuditoriaEnLista[] {
  return auditorias.filter((a) => !ESTADOS_ARCHIVADOS_AUDITORIA.includes(a.estado))
}

/**
 * Las auditorías de quien mira, **las suyas primero** y por fecha.
 *
 * Mismo criterio que `misProyectos`: por RLS se ven las de todas las
 * organizaciones asignadas, y las que uno lidera van arriba. Una auditoría sin
 * fecha se va al final — todavía no compromete a nadie.
 */
export function misAuditorias(
  auditorias: AuditoriaEnLista[],
  usuarioId: string | null,
): AuditoriaEnLista[] {
  return auditoriasVivas(auditorias).sort((a, b) => {
    const mia = (x: AuditoriaEnLista) => (usuarioId && x.auditor_lider_id === usuarioId ? 0 : 1)
    if (mia(a) !== mia(b)) return mia(a) - mia(b)

    const fechaA = a.fecha_inicio ?? '9999-12-31'
    const fechaB = b.fecha_inicio ?? '9999-12-31'
    return fechaA.localeCompare(fechaB)
  })
}

/**
 * A dónde va uno después: la auditoría que toca.
 *
 * ⚠️ Lo que está **`en_curso` manda sobre la fecha**, y no es un detalle: una
 * auditoría de tres días que empezó ayer tiene la fecha de inicio en el pasado,
 * y ordenando sólo por fecha el tablero enseñaría la de la semana que viene
 * mientras el auditor está dentro de la planta.
 *
 * ⚠️ Y las fechas se comparan como **texto** `YYYY-MM-DD`, nunca con
 * `new Date()`: una columna `date` corre un día en México (CLAUDE.md · trampas
 * heredadas).
 */
export function proximaVisita(
  auditorias: AuditoriaEnLista[],
  usuarioId: string | null,
  hoy: string = toISODate(),
): AuditoriaEnLista | null {
  const candidatas = misAuditorias(auditorias, usuarioId).filter((a) => {
    if (a.estado === 'en_curso') return true
    // Sin fecha no se puede decir «a dónde vas»: es un plan, no una visita.
    if (a.fecha_inicio === null) return false
    return (a.fecha_fin ?? a.fecha_inicio) >= hoy
  })

  const enCurso = candidatas.find((a) => a.estado === 'en_curso')
  return enCurso ?? candidatas[0] ?? null
}

export type TramoAntiguedad = { etiqueta: string; corta: string; total: number }

/**
 * Los hallazgos abiertos de la cartera, repartidos por antigüedad.
 *
 * ⚠️ Devuelve **los cuatro tramos siempre**, incluidos los vacíos, por lo mismo
 * que el embudo devuelve las seis etapas: lo que dice «no hay nada de más de 180
 * días» es justamente el hueco, y un tramo que desaparece se lee como que no se
 * midió.
 *
 * Los tramos salen de `TRAMOS_ANTIGUEDAD`, la misma lista que agrupa el tablero
 * del lunes: si el corte cambia, cambia en las dos pantallas a la vez.
 */
export function hallazgosPorAntiguedad(hallazgos: HallazgoEnCartera[]): TramoAntiguedad[] {
  const abiertos = hallazgosAbiertos(hallazgos)

  return TRAMOS_ANTIGUEDAD.map((tramo, indice) => {
    const desde = indice === 0 ? -1 : TRAMOS_ANTIGUEDAD[indice - 1].hasta
    return {
      etiqueta: tramo.etiqueta,
      corta: tramo.corta,
      total: abiertos.filter((h) => {
        const dias = diasAbierto(h)
        return dias >= desde && dias < tramo.hasta
      }).length,
    }
  })
}

/** Los que siguen contando: abierto, en acción o verificado. */
export function hallazgosAbiertos(hallazgos: HallazgoEnCartera[]): HallazgoEnCartera[] {
  return hallazgos.filter((h) => ESTADOS_ABIERTOS_HALLAZGO.includes(h.estado))
}

/**
 * Los abiertos cuyo compromiso con el cliente ya pasó.
 *
 * Es el número que hace que el widget valga la pena: un hallazgo de hace 40 días
 * no dice nada por sí solo, pero uno que se prometió cerrar la semana pasada sí.
 */
export function hallazgosVencidos(
  hallazgos: HallazgoEnCartera[],
  hoy: string = toISODate(),
): HallazgoEnCartera[] {
  return hallazgosAbiertos(hallazgos).filter(
    (h) => h.fecha_compromiso !== null && h.fecha_compromiso < hoy,
  )
}
