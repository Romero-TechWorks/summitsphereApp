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
 * - Los cuatro widgets salen de **la misma lista** que `/cartera?tab=proyectos`:
 *   abrir cualquiera de las dos pantallas deja lista la otra.
 * - Y son decenas o cientos de proyectos, no millones de filas. El día que una
 *   firma tenga cinco mil, esto se mueve a una vista con `security_invoker` —y
 *   ese día se paga, no hoy.
 */

import { ESTADOS_ARCHIVADOS_PROYECTO, ETAPAS_PROYECTO } from '@/lib/cartera/catalogos'
import { toISODate } from '@/lib/utils/dates'
import type { ProyectoEnCartera } from '@/lib/queries/proyectos'

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
