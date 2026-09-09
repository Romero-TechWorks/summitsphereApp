/**
 * **El reporte de no conformidad y su análisis de causa, en HTML imprimible**
 * [F04·B1].
 *
 * Reproduce `F-SG-06 Reporte de No Conformidad` y `F-SG-07 Análisis de Causa
 * Raíz 5 ¿Por qué?`, los dos formatos de la firma. Su estructura y el mapeo campo
 * por campo: `docs/formatos_informeAuditorias/F-SG-06_reporte_no_conformidad.md`
 * y `F-SG-07_analisis_causa_raiz.md`.
 *
 * ⚠️ **SE IMPRIMEN EN PAREJA, y no es una comodidad.** `P-SG-05` §5.5 y el
 * diagrama de flujo del procedimiento los citan siempre juntos, y el `F-SG-06`
 * tiene un campo que dice literalmente «Formato de Análisis de Causa» apuntando
 * al otro. Entregar uno sin el otro deja al responsable del proceso con la
 * pregunta pero sin el método.
 *
 * ⚠️ **LAS CASILLAS ☐ SE IMPRIMEN MARCADAS, NO VACÍAS.** Es la regla que las dos
 * fichas repiten: el papel se llenaba a mano y nosotros ya sabemos el tipo, la
 * fuente y las respuestas. Un formato impreso con las casillas en blanco delante
 * del cliente es un formato que alguien va a llenar con pluma — y ese dato ya no
 * vuelve a la app. Misma lección que dejó la lista de asistencia en `F03·B6d`.
 *
 * ⚠️ **`esc()` en CADA interpolación.** La descripción de un hallazgo y la de una
 * causa raíz las escribió una persona, y aquí no protege React.
 *
 * ⚠️ **Ni una clave de caché nueva**, igual que el informe de auditoría: todo
 * sale de lo que la ficha del hallazgo ya tiene bajado.
 */

import {
  TINTA,
  esc,
  escParrafos,
  membrete,
  pieConfidencial,
  rotulo,
  tituloSeccion,
} from '@/lib/plantillas/impresion'
import { etiquetaDe } from '@/lib/cartera/catalogos'
import {
  FUENTES_NC,
  TIPOS_HALLAZGO,
} from '@/lib/auditorias/catalogos'
import {
  RESULTADOS_EFICACIA,
  TIPOS_ACCION,
  folioDeAccion,
  leerAnalisis,
} from '@/lib/acciones/catalogos'
import { formatDateOnly } from '@/lib/utils/dates'
import type { AccionConContexto } from '@/lib/queries/acciones'
import type { HallazgoConContexto } from '@/lib/queries/hallazgos'
import type { IdentidadFirma } from '@/lib/queries/firma'

const F06 = {
  nombre: 'Reporte de No Conformidad',
  codigo: 'F-SG-06',
  version: '0',
} as const

const F07 = {
  nombre: 'Análisis de Causa Raíz 5 ¿Por qué?',
  codigo: 'F-SG-07',
  version: '0',
} as const

/**
 * Cuántos renglones de acción trae el original.
 *
 * ⚠️ **No es un límite, es lo que cabe en la hoja** —la ficha del `F-SG-06` lo
 * dice con estas palabras—. Se usa como mínimo: si la no conformidad tiene seis
 * acciones se imprimen las seis y la tabla continúa en la página siguiente.
 */
const RENGLONES_DEL_ORIGINAL = 4

/** Una casilla del formato, marcada o no. Nunca las dos en blanco. */
function casilla(texto: string, marcada: boolean): string {
  return `<span style="white-space:nowrap;margin-right:14px;font-weight:${marcada ? '600' : '400'};color:${marcada ? TINTA.navy : TINTA.dim}">${marcada ? '☒' : '☐'} ${esc(texto)}</span>`
}

/** Un par Sí/No. Si todavía no se ha contestado, se dice — no se marca «No». */
function siNo(valor: boolean | null): string {
  if (valor === null) {
    return `<span style="color:${TINTA.dim}">☐ Sí &nbsp;&nbsp; ☐ No &nbsp;&nbsp;<em>sin responder</em></span>`
  }
  return `${casilla('Sí', valor)}${casilla('No', !valor)}`
}

/** Un dato con su rótulo encima. El ladrillo del que están hechos los dos. */
function dato(etiqueta: string, valor: string): string {
  return `<div style="min-width:0">${rotulo(etiqueta)}<div>${valor || '—'}</div></div>`
}

/** Una rejilla de datos, del ancho que se le pida. */
function rejilla(columnas: number, contenido: string): string {
  return `<div class="bloque" style="display:grid;grid-template-columns:repeat(${columnas},1fr);gap:10px 16px;margin-bottom:12px">${contenido}</div>`
}

/** El renglón de un campo largo, con su línea debajo como en el papel. */
function campoLargo(etiqueta: string, valor: string, alto = 0): string {
  const relleno = alto > 0 ? `<div style="height:${alto}px"></div>` : ''
  return `<div class="bloque" style="margin-bottom:12px">
    ${rotulo(etiqueta)}
    <div style="border-bottom:1px solid ${TINTA.borde};padding-bottom:6px;min-height:20px">${valor || '&nbsp;'}${relleno}</div>
  </div>`
}

/**
 * Un bloque de firma: nombre y puesto impresos, y **el renglón en blanco**.
 *
 * ⚠️ La app no captura rúbricas y no debe. Imprime quién tiene que firmar y deja
 * la línea; la hoja firmada vuelve como adjunto. Es lo mismo que hacen el
 * `F-SG-12` y el `F-SG-03`.
 */
function firmaDe(bloque: string, nombre: string, puesto: string): string {
  return `<div style="min-width:0">
    ${rotulo(bloque)}
    <div style="border-bottom:1px solid ${TINTA.navy};height:34px"></div>
    <div style="font-size:11px;margin-top:3px">${esc(nombre, '&nbsp;')}</div>
    <div style="font-size:10px;color:${TINTA.dim}">${esc(puesto, '&nbsp;')}</div>
  </div>`
}

export type DatosReporteNC = {
  hallazgo: HallazgoConContexto
  acciones: readonly AccionConContexto[]
  /** El nombre del cliente, para el membrete y el pie. */
  cliente: string
  firma: IdentidadFirma | null
  /** El folio de la auditoría, cuando la NC salió de una. */
  folioAuditoria: string | null
  /** Quién la levantó, para el bloque «Detecta» del F-SG-07. */
  detectaNombre: string
  detectaPuesto: string
}

// ═══════════════════════════════════════════ F-SG-06 · el reporte de NC ══

function reporteF06(d: DatosReporteNC): string {
  const h = d.hallazgo

  // ⚠️ Las dos casillas del original son sólo «Mayor» y «Menor»: ese cliente no
  // usa los otros tres tipos. Los nuestros son cinco y el informe los necesita,
  // así que se imprimen las dos casillas del papel **y** el tipo real al lado
  // cuando no es ninguna de las dos. Ni se miente ni se pierde el dato.
  const esMayor = h.tipo === 'nc_mayor'
  const esMenor = h.tipo === 'nc_menor'
  const otroTipo = !esMayor && !esMenor

  const correcciones = d.acciones.filter((a) => a.tipo === 'correccion')
  const correctivas = d.acciones.filter((a) => a.tipo !== 'correccion')
  const faltan = Math.max(0, RENGLONES_DEL_ORIGINAL - correctivas.length)

  const renglonAccion = (a: AccionConContexto) => `<tr>
    <td style="width:38%">${escParrafos(a.descripcion)}<div style="font-size:10px;color:${TINTA.dim}">${esc(folioDeAccion(a))} · ${esc(etiquetaDe(TIPOS_ACCION, a.tipo))}</div></td>
    <td style="width:22%">${esc(a.contacto?.nombre ?? a.responsable?.nombre, '')}</td>
    <td style="width:22%">${esc(a.eficacia_evidencia, '')}</td>
    <td style="width:18%">${esc(formatDateOnly(a.fecha_compromiso))}</td>
  </tr>`

  const renglonVacio = `<tr><td style="height:26px;border-bottom:1px solid ${TINTA.borde}"></td><td style="border-bottom:1px solid ${TINTA.borde}"></td><td style="border-bottom:1px solid ${TINTA.borde}"></td><td style="border-bottom:1px solid ${TINTA.borde}"></td></tr>`

  return `${membrete(d.firma, F06)}

${rejilla(3, `
  ${dato('Fecha', esc(formatDateOnly(h.detectado_en ?? h.creado_en)))}
  ${dato('Fuente de la NC', esc(etiquetaDe(FUENTES_NC, h.fuente_nc)) + (h.fuente_detalle ? ` — ${esc(h.fuente_detalle)}` : ''))}
  ${dato('Quién identificó la NC', esc(d.detectaNombre))}
`)}

${rejilla(2, `
  ${dato('Clasificación', `${casilla('N.C. Mayor', esMayor)}${casilla('N.C. Menor', esMenor)}${otroTipo ? `<span style="font-weight:600">☒ ${esc(etiquetaDe(TIPOS_HALLAZGO, h.tipo))}</span>` : ''}`)}
  ${dato('Requisito / Documento', esc(h.clausula ? `${h.clausula.numero} ${h.clausula.titulo}` : h.requisito_incumplido, ''))}
`)}

${rejilla(3, `
  ${dato('No.', `<span style="font-family:ui-monospace,Menlo,monospace;font-weight:600">${esc(h.folio)}</span>`)}
  ${dato('Proceso', esc(h.proceso?.nombre, ''))}
  ${dato('Puesto responsable', esc(h.responsable?.puesto, ''))}
`)}

${campoLargo('No conformidad observada', escParrafos(h.descripcion))}
${campoLargo('Evidencia objetiva', escParrafos(h.evidencia_objetiva))}

${campoLargo(
  'Corrección / Acción inmediata',
  correcciones.length > 0
    ? correcciones
        .map((a) => `${escParrafos(a.descripcion)} <span style="font-size:10px;color:${TINTA.dim}">(${esc(a.contacto?.nombre ?? '')} · ${esc(formatDateOnly(a.fecha_compromiso))})</span>`)
        .join('<br />')
    : '',
  correcciones.length > 0 ? 0 : 22,
)}

${rejilla(2, `
  ${dato('Responsable de esta no conformidad', esc(h.responsable?.nombre, ''))}
  ${dato('Firma', `<div style="border-bottom:1px solid ${TINTA.navy};height:22px"></div>`)}
`)}

${rejilla(2, `
  ${dato('Análisis de causa raíz', escParrafos(h.causa_raiz, h.requiere_mas_informacion ? 'En curso: se requiere más información.' : ''))}
  ${dato('Formato de análisis de causa', `${esc(F07.codigo)} — se adjunta`)}
`)}

${tituloSeccion('Acción(es) correctiva(s)')}

${
  h.requiere_acciones
    ? `<table>
  <thead><tr><th>Acción</th><th>Responsable</th><th>Evidencia</th><th>Fecha</th></tr></thead>
  <tbody>
    ${correctivas.map(renglonAccion).join('')}
    ${renglonVacio.repeat(faltan)}
  </tbody>
</table>`
    : `<p style="margin:0;color:${TINTA.dim}">El análisis de causa concluyó que <strong>no se requieren acciones correctivas</strong>: la corrección inmediata bastó y no hay causa sistémica que atacar.</p>`
}

${tituloSeccion('Impacto en el sistema de gestión')}

${rejilla(1, `
  ${dato('¿Es necesario actualizar el análisis de riesgo?', `${siNo(h.nuevo_riesgo)}${h.nuevo_riesgo_desc ? `<div style="margin-top:3px">${escParrafos(h.nuevo_riesgo_desc)}</div>` : ''}`)}
  ${dato('¿Es necesario realizar cambios en el SGC?', `${siNo(h.requiere_cambio_sgc)}${h.requiere_cambio_sgc_desc ? `<div style="margin-top:3px">${escParrafos(h.requiere_cambio_sgc_desc)}</div>` : ''}`)}
  ${dato('¿Se requieren recursos?', `${siNo(h.requiere_recursos)}${h.requiere_recursos_desc ? `<div style="margin-top:3px">${escParrafos(h.requiere_recursos_desc)}</div>` : ''}`)}
`)}

${tituloSeccion('Cierre')}

${rejilla(3, `
  ${dato('No conformidad aceptada', `${siNo(h.aceptada)}${h.aceptada_motivo ? `<div style="margin-top:3px;font-size:11px">${escParrafos(h.aceptada_motivo)}</div>` : ''}`)}
  ${dato('¿Fueron efectivas las acciones?', d.acciones.some((a) => a.eficacia_resultado)
      ? d.acciones.filter((a) => a.eficacia_resultado).map((a) => `${esc(folioDeAccion(a))}: ${esc(etiquetaDe(RESULTADOS_EFICACIA, a.eficacia_resultado))}`).join('<br />')
      : `<span style="color:${TINTA.dim}">Sin verificar</span>`)}
  ${dato('Fecha de cierre', h.cerrado_en ? esc(formatDateOnly(h.cerrado_en)) : `<span style="color:${TINTA.dim}">Abierta</span>`)}
`)}

${rejilla(2, `
  ${firmaDe('Coordinador del SGC', '', '')}
  <div></div>
`)}

${pieConfidencial(d.cliente, d.firma, d.folioAuditoria ? `No conformidad levantada en la auditoría ${d.folioAuditoria}.` : undefined)}`
}

// ══════════════════════════════════════ F-SG-07 · el análisis de causa ══

function reporteF07(d: DatosReporteNC): string {
  const h = d.hallazgo
  const analisis = leerAnalisis(h.causa_analisis)
  const correcciones = d.acciones.filter((a) => a.tipo === 'correccion')
  const correctivas = d.acciones.filter((a) => a.tipo !== 'correccion')

  // ⚠️ **Pregunta y respuesta se vuelven a juntar en una celda.** En la app van
  // separadas —cada «por qué» interroga la respuesta anterior, y con un solo
  // campo la gente escribe cinco causas sueltas—, pero el papel del cliente tiene
  // una columna y hay que devolvérselo como lo conoce. Un formato nuestro con dos
  // columnas donde el suyo tiene una es un formato que el auditor externo va a
  // preguntar.
  const renglonPorque = (p: { n: number; pregunta: string; respuesta: string; evidencia: string }) => `<tr>
    <td style="width:24px;color:${TINTA.dim}">${p.n}</td>
    <td style="width:56%">${esc(p.pregunta)}${p.pregunta && p.respuesta ? ' — ' : ''}${esc(p.respuesta)}</td>
    <td>${esc(p.evidencia)}</td>
  </tr>`

  const renglonVacio = (n: number) => `<tr>
    <td style="color:${TINTA.dim};border-bottom:1px solid ${TINTA.borde};height:26px">${n}</td>
    <td style="border-bottom:1px solid ${TINTA.borde}"></td>
    <td style="border-bottom:1px solid ${TINTA.borde}"></td>
  </tr>`

  const faltanPorques = Math.max(0, 5 - analisis.porques.length)
  const faltanEstrategias = Math.max(0, 5 - correctivas.length)

  return `${membrete(d.firma, F07)}

${rejilla(2, `
  ${dato('No. de folio', `<span style="font-family:ui-monospace,Menlo,monospace;font-weight:600">${esc(h.folio)}</span>`)}
  ${dato('Fecha de elaboración', esc(formatDateOnly(h.causa_fecha), ''))}
`)}

${rejilla(3, `
  ${dato('Departamento', esc(h.proceso?.nombre, ''))}
  ${dato('Área', esc(h.sitio?.nombre, ''))}
  ${dato('Personal / Material / Equipo / Vehículo', esc(h.responsable?.nombre, ''))}
`)}

${campoLargo('Información de la no conformidad', escParrafos(h.descripcion))}

${campoLargo(
  'Acción inicial para contener la no conformidad',
  correcciones.map((a) => escParrafos(a.descripcion)).join('<br />'),
  correcciones.length > 0 ? 0 : 22,
)}

${tituloSeccion('Determinación de la causa raíz')}

<div style="margin-bottom:8px">${rotulo('Participantes')}<div>${esc(h.causa_participantes ?? analisis.participantes, '')}</div></div>

<table>
  <thead><tr><th></th><th>5 ¿Por qué? y respuestas</th><th>Evidencia de la respuesta</th></tr></thead>
  <tbody>
    ${analisis.porques.map(renglonPorque).join('')}
    ${Array.from({ length: faltanPorques }, (_, i) => renglonVacio(analisis.porques.length + i + 1)).join('')}
  </tbody>
</table>

${tituloSeccion('Cierre del ciclo')}

${rejilla(1, `
  ${dato('Se requiere más información', `${siNo(h.requiere_mas_informacion)} <span style="color:${TINTA.dim};font-size:11px">${h.requiere_mas_informacion ? '→ No estoy seguro de la causa raíz' : '→ Causa raíz hallada'}</span>`)}
  ${dato('Se requieren acciones correctivas', `${siNo(h.requiere_acciones)} <span style="color:${TINTA.dim};font-size:11px">${h.requiere_acciones ? '→ Se requiere seguimiento' : '→ No se requiere seguimiento'}</span>`)}
`)}

${tituloSeccion('Acciones correctivas que se requieren')}

${campoLargo('Descripción de la causa raíz', escParrafos(h.causa_raiz, ''), h.causa_raiz ? 0 : 22)}

<table>
  <thead><tr><th></th><th>Estrategia</th><th>Fecha programada de entrega</th><th>Responsable</th></tr></thead>
  <tbody>
    ${correctivas.map((a, i) => `<tr>
      <td style="width:24px;color:${TINTA.dim}">${i + 1}</td>
      <td style="width:48%">${escParrafos(a.descripcion)}</td>
      <td style="width:22%">${esc(formatDateOnly(a.fecha_compromiso))}</td>
      <td>${esc(a.contacto?.nombre ?? a.responsable?.nombre, '')}</td>
    </tr>`).join('')}
    ${Array.from({ length: faltanEstrategias }, (_, i) => `<tr>
      <td style="color:${TINTA.dim};border-bottom:1px solid ${TINTA.borde};height:26px">${correctivas.length + i + 1}</td>
      <td style="border-bottom:1px solid ${TINTA.borde}"></td>
      <td style="border-bottom:1px solid ${TINTA.borde}"></td>
      <td style="border-bottom:1px solid ${TINTA.borde}"></td>
    </tr>`).join('')}
  </tbody>
</table>

${rejilla(1, `
  ${dato('¿Existe un nuevo riesgo para el modelo del SGC?', `${siNo(h.nuevo_riesgo)}${h.nuevo_riesgo_desc ? `<div style="margin-top:3px">${escParrafos(h.nuevo_riesgo_desc)}</div>` : ''}`)}
  ${dato('¿Se requieren de recursos?', `${siNo(h.requiere_recursos)}${h.requiere_recursos_desc ? `<div style="margin-top:3px">${escParrafos(h.requiere_recursos_desc)}</div>` : ''}`)}
`)}

${rejilla(2, `
  ${dato('Fecha de cierre', h.cerrado_en ? esc(formatDateOnly(h.cerrado_en)) : `<span style="color:${TINTA.dim}">Abierta</span>`)}
  <div></div>
`)}

${tituloSeccion('Firmas')}

<div class="bloque" style="display:grid;grid-template-columns:repeat(2,1fr);gap:18px 24px">
  ${firmaDe('Detecta', d.detectaNombre, d.detectaPuesto)}
  ${firmaDe('Elabora', h.responsable?.nombre ?? '', h.responsable?.puesto ?? '')}
  ${firmaDe('Revisa', '', 'Coordinador del SGC')}
  ${firmaDe('Autoriza', '', 'Dirección')}
</div>

${pieConfidencial(d.cliente, d.firma)}`
}

/**
 * Los dos formatos, uno detrás del otro y con salto de página entre ellos.
 *
 * ⚠️ El salto va en el contenedor del segundo, no como un `<div>` suelto: un
 * elemento vacío con `page-break-before` deja una página en blanco cuando el
 * primero acaba justo en el borde de la hoja.
 */
export function reporteNoConformidad(d: DatosReporteNC): string {
  return `${reporteF06(d)}
<div style="break-before:page;page-break-before:always;padding-top:4px">${reporteF07(d)}</div>`
}

/** Cómo se llama la ventana y el PDF que salga de ella. */
export function tituloReporteNC(hallazgo: Pick<HallazgoConContexto, 'folio'>): string {
  return `${F06.codigo} ${hallazgo.folio}`
}
