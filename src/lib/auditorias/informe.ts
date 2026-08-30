/**
 * **Lo que dice el informe de auditoría** [F03·B5] — funciones puras.
 *
 * Reproduce el formato oficial de la firma, `F-SG-12 Reporte Final de Auditoría
 * Interna`, que llegó con la tarea del dueño `D01` el 30 ago 2026. Su estructura
 * y el mapeo campo por campo están en
 * `docs/formatos_informeAuditorias/F-SG-12_reporte_final.md`.
 *
 * ⚠️ **NADA de aquí consulta**, y es la regla que decide si B5 sirve. El criterio
 * de cierre de la Fase 03 dice que el auditor «genera el informe preliminar en el
 * sitio» después de tres horas en modo avión: todo esto son funciones sobre los
 * arreglos que **ya bajó `piezasDeLaPrecarga()`**. Una consulta nueva aquí es una
 * clave que puede no estar en la caché, y el documento saldría vacío justo en la
 * reunión de cierre. Mismo criterio que `src/lib/tablero/calculos.ts` y que el
 * tablero del lunes.
 *
 * ⚠️ Y por lo mismo **no hay vista en la base**. Los conteos son decenas de
 * hallazgos y sesenta puntos de lista, no millones de filas.
 */

import { TIPOS_HALLAZGO, VEREDICTOS_ITEM } from '@/lib/auditorias/catalogos'
import { normalizar } from '@/lib/utils/texto'
import type { AuditoriaNorma, MiembroAuditor, RenglonAgenda } from '@/lib/queries/auditorias'
import type { HallazgoConContexto } from '@/lib/queries/hallazgos'
import type { ItemConContexto } from '@/lib/queries/verificacion'

// ══════════════════════════════════════════════════════ quién audita ════════

/**
 * Las iniciales de un auditor: «Juan Manuel García Maya» → `JMGM`.
 *
 * ⚠️ **Se derivan, no se guardan.** El formato F-SG-11 escribe el nombre
 * completo una vez arriba y después usa sólo las iniciales en cada renglón de la
 * agenda, porque la columna es angosta; el informe hace lo mismo en el bloque de
 * auditores por proceso. Una columna en `usuarios` para esto sería un dato más
 * que mantener a mano y que se puede calcular.
 *
 * Las partículas se saltan —«Ana de la Torre» es `AT`, no `ADLT`— y dos auditores
 * pueden coincidir; en un equipo de dos o tres es raro, y el nombre completo está
 * escrito arriba en el mismo documento.
 */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do'])

export function iniciales(nombre: string | null | undefined): string {
  if (!nombre) return '—'

  const letras = nombre
    .trim()
    .split(/\s+/)
    .filter((palabra) => palabra.length > 0 && !PARTICULAS.has(normalizar(palabra)))
    .map((palabra) => palabra[0]?.toLocaleUpperCase('es') ?? '')
    .join('')

  return letras || '—'
}

/** Las iniciales del equipo entero, para un renglón sin auditor asignado. */
export function inicialesDelEquipo(equipo: readonly MiembroAuditor[]): string {
  const marcas = equipo
    .map((miembro) => iniciales(miembro.usuario?.nombre))
    .filter((marca) => marca !== '—')
  return marcas.length > 0 ? marcas.join('/') : '—'
}

// ═══════════════════════════════════════════════ las reuniones de la agenda ══

/**
 * El renglón de la agenda que es la reunión de apertura, o `null`.
 *
 * ⚠️ **No hay campo para esto en `auditorias`, y no hace falta uno.** F-SG-11
 * pone la apertura y el cierre como renglones de la agenda —el primero y el
 * último—, y de ahí es de donde el informe saca su sección «Reunión de
 * Apertura»: la fecha, la hora, quién estuvo (`auditado`) y qué se dijo (`nota`).
 *
 * Se busca por el texto del tema porque es lo que el auditor escribe. Si no hay
 * ninguno, quien llama **omite la sección entera** en vez de imprimirla vacía.
 */
function renglonPorTema(agenda: readonly RenglonAgenda[], aguja: string): RenglonAgenda | null {
  const ordenados = [...agenda].sort(comparaAgenda)
  return ordenados.find((renglon) => normalizar(renglon.tema).includes(aguja)) ?? null
}

export function renglonDeApertura(agenda: readonly RenglonAgenda[]): RenglonAgenda | null {
  return renglonPorTema(agenda, 'apertura')
}

export function renglonDeCierre(agenda: readonly RenglonAgenda[]): RenglonAgenda | null {
  return renglonPorTema(agenda, 'cierre')
}

/** El orden real de la visita: por día y, dentro del día, por `orden`. */
export function comparaAgenda(a: RenglonAgenda, b: RenglonAgenda): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1
  if (a.orden !== b.orden) return a.orden - b.orden
  return (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? '')
}

export type DiaDeAgenda = { fecha: string; renglones: RenglonAgenda[] }

/** La agenda agrupada por día, como la imprime F-SG-11: un bloque por jornada. */
export function agendaPorDia(agenda: readonly RenglonAgenda[]): DiaDeAgenda[] {
  const dias = new Map<string, RenglonAgenda[]>()

  for (const renglon of [...agenda].sort(comparaAgenda)) {
    const previo = dias.get(renglon.fecha)
    if (previo) previo.push(renglon)
    else dias.set(renglon.fecha, [renglon])
  }

  return [...dias.entries()].map(([fecha, renglones]) => ({ fecha, renglones }))
}

// ════════════════════════════════════════════════════ la lista de verificación ══

export type ResumenLista = {
  total: number
  evaluados: number
  pendientes: number
  /** Entero de 0 a 100. Sin lista, `0` — y quien llama omite el bloque. */
  porcentaje: number
}

export function resumenDeLista(items: readonly ItemConContexto[]): ResumenLista {
  const total = items.length
  const pendientes = items.filter((item) => item.veredicto === 'pendiente').length
  const evaluados = total - pendientes

  return {
    total,
    evaluados,
    pendientes,
    porcentaje: total === 0 ? 0 : Math.round((evaluados / total) * 100),
  }
}

export type Tramo = { valor: string; etiqueta: string; total: number }

/**
 * Cuántos puntos de la lista cayeron en cada veredicto.
 *
 * ⚠️ Devuelve **los cinco siempre**, incluidos los que están en cero — misma
 * regla que el embudo del tablero. Un gráfico de resultados al que le faltan los
 * tramos vacíos miente: «no hubo ninguna no conformidad en la lista» es
 * justamente lo que el hueco dice.
 */
export function conteoDeVeredictos(items: readonly ItemConContexto[]): Tramo[] {
  return VEREDICTOS_ITEM.map((opcion) => ({
    valor: opcion.valor,
    etiqueta: opcion.etiqueta,
    total: items.filter((item) => item.veredicto === opcion.valor).length,
  }))
}

// ═══════════════════════════════════════════════════════════ los hallazgos ══

/**
 * Los hallazgos que entran al informe.
 *
 * ⚠️ **Los `anulado` se quedan fuera, y es lo contrario de esconderlos.** Un
 * hallazgo anulado sigue en la base con su motivo y su historial —regla 13, y la
 * base no deja borrarlo ni al socio—, pero **no es un resultado de la
 * auditoría**: imprimirlo en el documento que ve el cliente convertiría un error
 * del auditor en una acusación contra su empresa. Lo que un certificador viene a
 * revisar es el historial, no el informe.
 *
 * ⚠️ Se filtra por `estado !== 'anulado'` y no por una lista de estados válidos:
 * así un estado nuevo entra solo en el informe en vez de desaparecer de él sin
 * que nadie se entere.
 */
export function hallazgosDelInforme(
  hallazgos: readonly HallazgoConContexto[],
): HallazgoConContexto[] {
  return [...hallazgos]
    .filter((hallazgo) => hallazgo.estado !== 'anulado')
    .sort((a, b) => a.consecutivo - b.consecutivo)
}

/**
 * Los de unos tipos concretos, en orden de folio.
 *
 * Es lo que parte el informe en sus tres secciones: «Fortalezas del SGC»
 * (`conformidad`), «Observaciones» (`observacion` + `oportunidad_mejora`) y «No
 * Conformidades encontradas» (`nc_mayor` + `nc_menor`).
 */
export function hallazgosDeTipo(
  hallazgos: readonly HallazgoConContexto[],
  tipos: readonly string[],
): HallazgoConContexto[] {
  return hallazgos.filter((hallazgo) => tipos.includes(hallazgo.tipo))
}

/** Cuántos hay de cada tipo. Los cinco siempre, en orden de gravedad. */
export function conteoPorTipo(hallazgos: readonly HallazgoConContexto[]): Tramo[] {
  return TIPOS_HALLAZGO.map((opcion) => ({
    valor: opcion.valor,
    etiqueta: opcion.etiqueta,
    total: hallazgos.filter((hallazgo) => hallazgo.tipo === opcion.valor).length,
  }))
}

/**
 * Cuántos hallazgos por proceso.
 *
 * ⚠️ P-SG-03 §5.4.5 punto 4 lo pide por escrito: las no conformidades se
 * clasifican «incluyendo a qué procesos corresponden». Es el gráfico que le dice
 * al cliente **dónde** está su problema.
 *
 * Los que no tienen proceso salen agrupados al final y no se esconden: un
 * hallazgo que nadie supo de qué proceso era es información.
 */
export function conteoPorProceso(hallazgos: readonly HallazgoConContexto[]): Tramo[] {
  const porProceso = new Map<string, Tramo>()
  let sinProceso = 0

  for (const hallazgo of hallazgos) {
    if (!hallazgo.proceso_id) {
      sinProceso++
      continue
    }

    const previo = porProceso.get(hallazgo.proceso_id)
    if (previo) previo.total++
    else {
      porProceso.set(hallazgo.proceso_id, {
        valor: hallazgo.proceso_id,
        // El nombre puede faltar si el embebido no llegó: se degrada, no se rompe.
        etiqueta: hallazgo.proceso?.nombre ?? 'Proceso sin nombre',
        total: 1,
      })
    }
  }

  const tramos = [...porProceso.values()].sort((a, b) => b.total - a.total)
  if (sinProceso > 0) {
    tramos.push({ valor: '', etiqueta: 'Sin proceso asignado', total: sinProceso })
  }
  return tramos
}

/**
 * Cuántos hallazgos por norma, vía la cláusula que citan.
 *
 * ⚠️ **Sólo tiene sentido con más de una norma en el alcance**, y quien llama lo
 * comprueba: con una sola, este gráfico es una barra que dice el total otra vez.
 * El formato original no lo contempla porque ese cliente sólo tenía ISO 9001;
 * nuestros clientes pueden llevar 9001 + 14001 + 45001 en la misma visita, y
 * entonces «¿de cuál norma salieron los hallazgos?» es la primera pregunta.
 */
export function conteoPorNorma(
  hallazgos: readonly HallazgoConContexto[],
  normas: readonly AuditoriaNorma[],
): Tramo[] {
  const nombres = new Map(
    normas.map((fila) => [fila.norma_id, fila.norma?.clave ?? fila.norma?.nombre ?? 'Norma']),
  )

  const porNorma = new Map<string, Tramo>()
  for (const hallazgo of hallazgos) {
    const normaId = hallazgo.clausula?.norma_id
    if (!normaId) continue

    const previo = porNorma.get(normaId)
    if (previo) previo.total++
    else {
      porNorma.set(normaId, {
        valor: normaId,
        etiqueta: nombres.get(normaId) ?? 'Norma fuera del alcance',
        total: 1,
      })
    }
  }

  return [...porNorma.values()].sort((a, b) => b.total - a.total)
}

// ══════════════════════════════════════════════ auditores por proceso ═══════

export type AuditoresDeProceso = { proceso: string; auditores: string }

/**
 * Quién auditó cada proceso — P-SG-03 §5.4.5 punto 6 lo exige en el informe.
 *
 * Sale de la agenda: cada renglón dice qué proceso se recorrió y quién lo
 * recorrió. Un proceso que aparece en varios renglones junta a todos sus
 * auditores.
 *
 * ⚠️ **Un renglón sin `auditor_id` se atribuye al EQUIPO COMPLETO**, no a nadie.
 * `auditoria_agenda.auditor_id` es uno solo y en el formato real todos los
 * renglones llevan a los dos auditores («JMGM/AFRC»): en la práctica el equipo
 * recorre junto y nadie rellena esa columna. Dejarlo en blanco haría que el
 * informe dijera que ese proceso no lo auditó nadie, que es peor que decir de
 * más.
 *
 * ⚠️ **La apertura y el cierre se quedan fuera.** Son renglones de la agenda como
 * cualquier otro —así los pone el formato F-SG-11— pero no son procesos
 * auditados: son reuniones con todo el personal, y el informe ya las reporta
 * aparte. Sin este filtro, la tabla «auditores por proceso» abriría diciendo que
 * la reunión de apertura la auditó JMGM/AFRC.
 */
export function auditoresPorProceso(
  agenda: readonly RenglonAgenda[],
  equipo: readonly MiembroAuditor[],
): AuditoresDeProceso[] {
  const nombres = new Map(
    equipo.map((miembro) => [miembro.usuario_id, iniciales(miembro.usuario?.nombre)]),
  )
  const todos = inicialesDelEquipo(equipo)

  const reuniones = new Set(
    [renglonDeApertura(agenda), renglonDeCierre(agenda)]
      .filter((renglon): renglon is RenglonAgenda => renglon !== null)
      .map((renglon) => renglon.id),
  )

  const porTema = new Map<string, Set<string>>()

  for (const renglon of [...agenda].sort(comparaAgenda)) {
    if (reuniones.has(renglon.id)) continue

    const marca = renglon.auditor_id ? nombres.get(renglon.auditor_id) ?? todos : todos
    const previo = porTema.get(renglon.tema)
    if (previo) previo.add(marca)
    else porTema.set(renglon.tema, new Set([marca]))
  }

  return [...porTema.entries()].map(([proceso, marcas]) => ({
    proceso,
    auditores: [...marcas].join(' / '),
  }))
}

// ═══════════════════════════════════════════════════════════ el conjunto ════

/** Todo lo que el informe necesita, ya calculado. */
export type ResumenInforme = {
  hallazgos: HallazgoConContexto[]
  fortalezas: HallazgoConContexto[]
  observaciones: HallazgoConContexto[]
  noConformidades: HallazgoConContexto[]
  lista: ResumenLista
  porTipo: Tramo[]
  porProceso: Tramo[]
  porNorma: Tramo[]
  veredictos: Tramo[]
  apertura: RenglonAgenda | null
  cierre: RenglonAgenda | null
  dias: DiaDeAgenda[]
  auditores: AuditoresDeProceso[]
}

/**
 * Arma el informe entero a partir de lo que hay en la caché.
 *
 * Una sola pasada para que la pantalla no tenga que acordarse de llamar a nueve
 * funciones en el orden correcto — y para que el día que F06·B2 imprima esto
 * mismo desde otro sitio, sea una llamada.
 */
export function armarInforme({
  items,
  agenda,
  equipo,
  normas,
  hallazgos,
}: {
  items: readonly ItemConContexto[]
  agenda: readonly RenglonAgenda[]
  equipo: readonly MiembroAuditor[]
  normas: readonly AuditoriaNorma[]
  hallazgos: readonly HallazgoConContexto[]
}): ResumenInforme {
  const delInforme = hallazgosDelInforme(hallazgos)

  return {
    hallazgos: delInforme,
    fortalezas: hallazgosDeTipo(delInforme, ['conformidad']),
    observaciones: hallazgosDeTipo(delInforme, ['observacion', 'oportunidad_mejora']),
    noConformidades: hallazgosDeTipo(delInforme, ['nc_mayor', 'nc_menor']),
    lista: resumenDeLista(items),
    porTipo: conteoPorTipo(delInforme),
    porProceso: conteoPorProceso(delInforme),
    // Con una sola norma el gráfico repetiría el total: se omite.
    porNorma: normas.length > 1 ? conteoPorNorma(delInforme, normas) : [],
    veredictos: conteoDeVeredictos(items),
    apertura: renglonDeApertura(agenda),
    cierre: renglonDeCierre(agenda),
    dias: agendaPorDia(agenda),
    auditores: auditoresPorProceso(agenda, equipo),
  }
}
