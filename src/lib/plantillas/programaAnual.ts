/**
 * **El programa anual de auditorías, en HTML imprimible** [F03·B6c].
 *
 * Reproduce `F-SG-09 Programa Anual de Auditorías Internas`, el formato de la
 * firma. Estructura, fórmulas y mapeo campo por campo:
 * `docs/formatos_informeAuditorias/F-SG-09_programa_anual.md`.
 *
 * ⚠️ **Es un entregable que la Dirección del cliente firma**, no una pantalla de
 * trabajo: se imprime al aprobar el programa y se archiva. ISO 9001 §9.2.2 pide
 * el programa por escrito, y esto es ese escrito.
 *
 * ⚠️ **La leyenda de valores y el umbral SE IMPRIMEN.** No son una nota al
 * margen: son la justificación de por qué a un proceso le tocan dos auditorías y
 * a otro una. Sin ellas el programa parece arbitrario, y es lo primero que un
 * cliente pregunta.
 *
 * ⚠️ **Ni una consulta.** Todo entra por parámetro, igual que el informe.
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
import {
  AUDITORIAS_MAXIMAS,
  MESES_CORTOS,
  UMBRAL_PUNTOS,
  mesesDe,
} from '@/lib/auditorias/programaAnual'
import { formatDate } from '@/lib/utils/dates'
import { nombreDeOrganizacion } from '@/lib/queries/cartera'
import type { ProgramaEnLista, RenglonPrograma } from '@/lib/queries/auditorias'
import type { IdentidadFirma } from '@/lib/queries/firma'

const FORMATO = {
  nombre: 'Programa Anual de Auditorías Internas',
  codigo: 'F-SG-09',
  version: '0',
} as const

/**
 * La leyenda de color de los meses.
 *
 * ⚠️ **En hexadecimal**, como toda la paleta del papel: la ventana de impresión
 * no hereda `globals.css` (docs/05 §6).
 *
 * ⚠️ **Y el color NUNCA es la única señal** (WCAG 1.4.1). La marca lleva además
 * su letra —`I` o `E`—, porque este documento acaba fotocopiado en blanco y
 * negro en el archivo del cliente y ahí los dos verdes son el mismo gris.
 */
const TINTA_MODALIDAD: Readonly<Record<string, string>> = {
  interna: '#1e6b28',
  externa: '#1d4ed8',
}

const INICIAL_MODALIDAD: Readonly<Record<string, string>> = {
  interna: 'I',
  externa: 'E',
}

export type DatosProgramaAnual = {
  programa: ProgramaEnLista
  renglones: readonly RenglonPrograma[]
  firma: IdentidadFirma | null
}

/** Un campo de encuadre: rótulo pequeño y su párrafo. Vacío no se pinta. */
function encuadre(etiqueta: string, texto: string | null): string {
  const cuerpo = escParrafos(texto, '')
  if (!cuerpo) return ''
  return `<div style="margin-bottom:10px">${rotulo(etiqueta)}<div style="font-size:12px;line-height:1.5">${cuerpo}</div></div>`
}

/**
 * La leyenda del formato: qué vale cada proceso y de dónde sale el número de
 * auditorías.
 */
function leyenda(): string {
  const celda = `padding:4px 8px;border:1px solid ${TINTA.borde};font-size:11px`

  return `<div class="bloque" style="display:flex;gap:22px;flex-wrap:wrap;margin:6px 0 14px">
    <div>
      ${rotulo('Valor del proceso')}
      <table style="width:auto;margin-top:3px">
        <tr><td style="${celda};font-weight:600;text-align:center">2</td><td style="${celda}">Procesos del servicio</td></tr>
        <tr><td style="${celda};font-weight:600;text-align:center">1</td><td style="${celda}">Procesos de soporte</td></tr>
      </table>
    </div>
    <div>
      ${rotulo('Puntos → auditorías al año')}
      <table style="width:auto;margin-top:3px">
        <tr><td style="${celda}">&le; ${esc(UMBRAL_PUNTOS)}</td><td style="${celda};font-weight:600;text-align:center">1</td></tr>
        <tr><td style="${celda}">&gt; ${esc(UMBRAL_PUNTOS)}</td><td style="${celda};font-weight:600;text-align:center">${esc(AUDITORIAS_MAXIMAS)}</td></tr>
      </table>
    </div>
    <div style="flex:1 1 220px;min-width:200px">
      ${rotulo('Cómo se calcula')}
      <div style="font-size:11px;line-height:1.6;color:${TINTA.dim};margin-top:3px">
        Puntos = valor del proceso × no conformidades documentadas en la auditoría anterior.
        La frecuencia puede aumentarse si hubo cambios significativos al sistema, si su
        efectividad disminuyó, si cambió la normatividad aplicable o si se buscan elementos
        de mejora continua.
      </div>
    </div>
    <div>
      ${rotulo('Modalidad')}
      <div style="font-size:11px;margin-top:5px;display:flex;gap:12px">
        <span><b style="color:${TINTA_MODALIDAD.interna}">I</b> Interna</span>
        <span><b style="color:${TINTA_MODALIDAD.externa}">E</b> Externa</span>
      </div>
    </div>
  </div>`
}

/** La marca de un mes: su letra, con el color de la modalidad. */
function marcaDeMes(modalidad: string | undefined): string {
  if (!modalidad) return '&nbsp;'
  // ⚠️ Nunca `undefined` aunque llegue una modalidad que no conocemos: esto se
  // pinta en bucle sobre 11 × 12 celdas y un `.charAt` sobre nada se llevaría el
  // programa entero, no esa celda.
  const letra = INICIAL_MODALIDAD[modalidad] ?? '·'
  const tinta = TINTA_MODALIDAD[modalidad] ?? TINTA.dim
  return `<b style="color:${tinta}">${esc(letra)}</b>`
}

export function programaAnualHtml({ programa, renglones, firma }: DatosProgramaAnual): string {
  const cliente = programa.organizacion
    ? nombreDeOrganizacion(programa.organizacion)
    : 'Organización sin nombre'

  const bordeCelda = `border:1px solid ${TINTA.borde}`
  const th = `padding:4px 5px;${bordeCelda};font-size:9px;text-align:center`
  const td = `padding:4px 6px;${bordeCelda};font-size:11px`

  const encabezados = [
    `<th style="${th};width:38px">NC año ant.</th>`,
    `<th style="${th};width:34px">Puntos</th>`,
    `<th style="${th};text-align:left">Proceso</th>`,
    `<th style="${th};width:34px">Valor</th>`,
    `<th style="${th};width:44px">Auditorías</th>`,
    ...MESES_CORTOS.map((mes) => `<th style="${th};width:20px">${esc(mes)}</th>`),
  ].join('')

  const filas = renglones
    .map((renglon) => {
      const meses = mesesDe(renglon.meses)
      const celdasMes = MESES_CORTOS.map((_, indice) => {
        const puesto = meses.find((m) => m.mes === indice + 1)
        return `<td style="${td};text-align:center;padding:4px 2px">${marcaDeMes(puesto?.modalidad)}</td>`
      }).join('')

      return `<tr>
        <td style="${td};text-align:center">${esc(renglon.nc_previas)}</td>
        <td style="${td};text-align:center;color:${TINTA.dim}">${esc(renglon.puntos)}</td>
        <td style="${td}">${esc(renglon.proceso?.nombre, 'Proceso dado de baja')}</td>
        <td style="${td};text-align:center">${esc(renglon.valor)}</td>
        <td style="${td};text-align:center;font-weight:600">${esc(renglon.auditorias_requeridas)}</td>
        ${celdasMes}
      </tr>`
    })
    .join('')

  // El pie de la parrilla: el total de NC del evento anterior, que en el
  // original es `SUM(A22:A32)`.
  const totalNc = renglones.reduce((suma, renglon) => suma + renglon.nc_previas, 0)
  const totalAuditorias = renglones.reduce((suma, r) => suma + (r.auditorias_requeridas ?? 0), 0)

  const pieTabla = `<tr>
    <td style="${td};text-align:center;font-weight:600">${esc(totalNc)}</td>
    <td style="${td}">&nbsp;</td>
    <td style="${td};font-weight:600">Total</td>
    <td style="${td}">&nbsp;</td>
    <td style="${td};text-align:center;font-weight:600">${esc(totalAuditorias)}</td>
    ${MESES_CORTOS.map(() => `<td style="${td}">&nbsp;</td>`).join('')}
  </tr>`

  const parrilla =
    renglones.length === 0
      ? `<p style="font-size:12px;color:${TINTA.dim};margin:6px 0 0">Este programa todavía no tiene procesos. Sin ellos no hay frecuencia que calcular y el documento sale sin su parte principal.</p>`
      : `<table style="margin-top:4px;table-layout:fixed">
           <thead><tr>${encabezados}</tr></thead>
           <tbody>${filas}${pieTabla}</tbody>
         </table>`

  // ── las dos firmas ────────────────────────────────────────────────────────
  //
  // ⚠️ Los rótulos son los del original —Coordinador del SGC elabora, Dirección
  // aprueba— y son cargos **del cliente**, no de la firma. La línea se firma con
  // pluma: la app no captura rúbricas.
  const sello = programa.aprobado_en
    ? `<div style="font-size:10px;color:${TINTA.dim};margin-top:3px">Aprobado el ${esc(formatDate(programa.aprobado_en))}${programa.aprobador?.nombre ? ` · registrado por ${esc(programa.aprobador.nombre)}` : ''}</div>`
    : ''

  const firmas = `<div class="bloque" style="display:flex;gap:40px;margin-top:30px">
    <div style="flex:1 1 0">
      <div style="border-bottom:1px solid ${TINTA.navy};height:34px"></div>
      <div style="font-size:11px;font-weight:600;margin-top:4px">Elaboró</div>
      <div style="font-size:10px;color:${TINTA.dim}">Coordinador del Sistema de Gestión</div>
    </div>
    <div style="flex:1 1 0">
      <div style="border-bottom:1px solid ${TINTA.navy};height:34px"></div>
      <div style="font-size:11px;font-weight:600;margin-top:4px">Aprobó</div>
      <div style="font-size:10px;color:${TINTA.dim}">Dirección</div>
      ${sello}
    </div>
  </div>`

  const identificacion = `<div class="bloque" style="display:flex;gap:26px;flex-wrap:wrap;margin-bottom:12px">
    <div style="flex:1 1 240px">${rotulo('Organización')}<div style="font-size:15px;font-weight:600">${esc(cliente)}</div></div>
    <div>${rotulo('Año')}<div style="font-size:15px;font-weight:600">${esc(programa.anio)}</div></div>
  </div>
  <div style="font-size:12px;color:${TINTA.dim};margin-bottom:10px">${esc(programa.nombre)}</div>`

  const encuadres =
    [
      encuadre('Criterios', programa.criterios),
      encuadre('Alcance', programa.alcance),
      encuadre('Objetivo', programa.objetivo),
    ].join('') || ''

  const estado = programa.aprobado_en
    ? null
    : 'Documento preliminar: este programa todavía no ha sido aprobado.'

  return [
    membrete(firma, FORMATO),
    identificacion,
    encuadres,
    tituloSeccion('Frecuencia de auditoría por proceso'),
    leyenda(),
    parrilla,
    firmas,
    pieConfidencial(cliente, firma, estado ?? undefined),
  ].join('')
}

/** El nombre de la ventana y del PDF que se guarda. */
export function tituloDelProgramaAnual(programa: ProgramaEnLista): string {
  return `Programa anual de auditorías ${programa.anio} · ${
    programa.organizacion ? nombreDeOrganizacion(programa.organizacion) : 'Sin cliente'
  }`
}
