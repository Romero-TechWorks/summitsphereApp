/**
 * **El informe de auditoría, en HTML imprimible** [F03·B5].
 *
 * Reproduce `F-SG-12 Reporte Final de Auditoría Interna`, el formato oficial de
 * la firma (tarea del dueño `D01`, entregado el 30 ago 2026). Sus nueve secciones
 * y el mapeo campo por campo:
 * `docs/formatos_informeAuditorias/F-SG-12_reporte_final.md`.
 *
 * ⚠️ **El orden de las secciones no se cambia.** Es el documento que el cliente
 * ya sabe leer, y en una firma de auditoría la familiaridad del entregable es
 * parte del servicio.
 *
 * ⚠️ **Devuelve una cadena, no JSX**, y por dos razones: se imprime en una
 * ventana que no hereda `globals.css` (docs/05 §6), y la misma cadena se enseña
 * en pantalla dentro de un `<iframe sandbox>`, así que lo que se ve es
 * exactamente lo que sale por la impresora. Todo lo que se interpola pasa por
 * `esc()` — ver el porqué en `impresion.ts`.
 *
 * ⚠️ **Ni una consulta.** Todo entra por parámetro, desde la caché que dejó
 * `piezasDeLaPrecarga()`: esto se genera en una planta, sin señal, delante del
 * cliente.
 */

import {
  TINTA,
  esc,
  escParrafos,
  membrete,
  pieConfidencial,
  rotulo as etiqueta,
  tintaDeHallazgo,
  tintaDeVeredicto,
  tituloSeccion as titulo,
} from '@/lib/plantillas/impresion'
import { etiquetaDe } from '@/lib/cartera/catalogos'
import { TIPOS_AUDITORIA, TIPOS_HALLAZGO } from '@/lib/auditorias/catalogos'
import { formatDate, formatDateOnly } from '@/lib/utils/dates'
import { nombreDeOrganizacion } from '@/lib/queries/cartera'
import { folioVisible } from '@/lib/queries/auditorias'
import { folioDeHallazgo } from '@/lib/queries/hallazgos'
import type {
  AuditoriaEnLista,
  AuditoriaNorma,
  AuditoriaProceso,
  AuditoriaSitio,
  MiembroAuditor,
  RenglonAgenda,
} from '@/lib/queries/auditorias'
import type { HallazgoConContexto } from '@/lib/queries/hallazgos'
import type { IdentidadFirma } from '@/lib/queries/firma'
import type { ResumenInforme, Tramo } from '@/lib/auditorias/informe'
import { PAPELES_AUDITOR } from '@/lib/auditorias/catalogos'

/**
 * El código del formato, tal como lo numera la firma.
 *
 * ⚠️ Vive en una constante y no en la base a propósito: es la versión de **la
 * plantilla**, que vive en el código y cambia con un despliegue. El día que la
 * firma renumere sus formatos, se cambia aquí. La identidad —razón social,
 * logotipo— sí sale de `config_firma`, porque ésa la edita el dueño.
 */
const FORMATO = {
  nombre: 'Reporte Final de Auditoría Interna',
  codigo: 'F-SG-12',
  version: '0',
} as const

export type DatosInforme = {
  auditoria: AuditoriaEnLista
  firma: IdentidadFirma | null
  normas: readonly AuditoriaNorma[]
  sitios: readonly AuditoriaSitio[]
  procesos: readonly AuditoriaProceso[]
  equipo: readonly MiembroAuditor[]
  resumen: ResumenInforme
}

// ═══════════════════════════════════════════════════════════════ piezas ═════

/** `09:00:00` → `09:00`. Un `time` de la base trae segundos que nadie lee. */
function hora(valor: string | null): string {
  if (!valor) return ''
  return valor.slice(0, 5)
}

/** El horario de un renglón de agenda: `09:00 – 10:15`, o sólo la hora. */
function horario(renglon: RenglonAgenda): string {
  const inicio = hora(renglon.hora_inicio)
  const fin = hora(renglon.hora_fin)
  if (inicio && fin) return `${inicio} – ${fin}`
  return inicio || fin
}

/**
 * Un párrafo con su etiqueta. **Vacío devuelve cadena vacía**, y quien llama
 * decide: en un informe, un título con nada debajo se lee como un dato que la
 * app perdió.
 */
function parrafo(rotulo: string, texto: string | null): string {
  const cuerpo = escParrafos(texto, '')
  if (!cuerpo) return ''
  return `<div style="margin-bottom:12px">${etiqueta(rotulo)}<div style="font-size:13px;line-height:1.55">${cuerpo}</div></div>`
}

/** Una cifra grande con su rótulo. Sin tarjeta: aquí tampoco hay tarjetas. */
function cifra(valor: string | number, rotulo: string): string {
  return `<div style="min-width:96px">
    <div style="font-size:26px;font-weight:600;color:${TINTA.navy};line-height:1.1">${esc(valor)}</div>
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TINTA.dim};margin-top:2px">${esc(rotulo)}</div>
  </div>`
}

/**
 * Un gráfico de barras nativo.
 *
 * ⚠️ **Sin librería de gráficas, y este informe es justamente el caso que
 * `docs/02` dejaba como excepción** («si un informe lo exige de verdad»). Sigue
 * sin aplicar, por tres motivos y el tercero decide: no romper el bundle; un
 * `canvas` no imprime bien; y **esto se genera en una planta sin señal**, donde
 * un chunk que se carga bajo demanda es un chunk que no está.
 *
 * ⚠️ **Cada barra lleva su número absoluto.** Un porcentaje sobre cuatro
 * hallazgos dice «25%» y suena a mucho.
 */
function grafico(rotulo: string, tramos: readonly Tramo[], color: (valor: string) => string): string {
  if (tramos.length === 0) return ''

  const tope = Math.max(...tramos.map((t) => t.total), 1)

  const barras = tramos
    .map((tramo) => {
      const ancho = Math.round((tramo.total / tope) * 100)
      return `<tr>
        <td style="width:38%;font-size:12px;padding:3px 8px 3px 0">${esc(tramo.etiqueta)}</td>
        <td style="padding:3px 8px 3px 0">
          <span style="display:block;height:9px;border-radius:2px;background:${color(tramo.valor)};width:${ancho === 0 ? 1 : ancho}%"></span>
        </td>
        <td style="width:34px;text-align:right;font-size:12px;font-weight:600;padding:3px 0">${esc(tramo.total)}</td>
      </tr>`
    })
    .join('')

  return `<div class="grafico" style="margin-bottom:16px">
    <h3 style="font-size:12px;color:${TINTA.dim};text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">${esc(rotulo)}</h3>
    <table><tbody>${barras}</tbody></table>
  </div>`
}

/**
 * Un hallazgo, como se lee en el informe.
 *
 * ⚠️ `break-inside: avoid` en la clase: un hallazgo partido entre dos páginas se
 * lee como dos hallazgos distintos.
 */
function hallazgo(item: HallazgoConContexto): string {
  const color = tintaDeHallazgo(item.tipo)
  const clausula = item.clausula
    ? `${item.clausula.numero} · ${item.clausula.titulo}`
    : 'Sin cláusula citada'

  const filas = [
    ['Cláusula citada', esc(clausula)],
    ['Requisito incumplido', esc(item.requisito_incumplido, '')],
    ['Proceso', esc(item.proceso?.nombre, '')],
    ['Sitio', esc(item.sitio?.nombre, '')],
    ['Responsable', esc(item.responsable?.nombre, '')],
    ['Fecha compromiso', item.fecha_compromiso ? esc(formatDateOnly(item.fecha_compromiso)) : ''],
  ]
    .filter(([, valor]) => valor !== '')
    .map(
      ([rotulo, valor]) =>
        `<tr><th style="width:32%;padding:2px 8px 2px 0">${esc(rotulo)}</th><td style="font-size:12px;padding:2px 0">${valor}</td></tr>`,
    )
    .join('')

  return `<div class="hallazgo" style="margin:0 0 14px;padding-left:9px;border-left:3px solid ${color}">
    <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-bottom:3px">
      <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:600">${esc(folioDeHallazgo(item))}</span>
      <span style="font-size:11px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:.04em">${esc(etiquetaDe(TIPOS_HALLAZGO, item.tipo))}</span>
    </div>
    <div style="font-size:13px;line-height:1.5;margin-bottom:5px">${escParrafos(item.descripcion)}</div>
    <div style="margin-bottom:5px">${etiqueta('Evidencia objetiva')}<div style="font-size:12px;line-height:1.5">${escParrafos(item.evidencia_objetiva)}</div></div>
    ${filas ? `<table><tbody>${filas}</tbody></table>` : ''}
  </div>`
}

/** Una sección de hallazgos. El vacío se dice, no se deja en blanco. */
function seccionHallazgos(
  rotulo: string,
  items: readonly HallazgoConContexto[],
  cuandoVacio: string,
): string {
  const cuerpo =
    items.length > 0
      ? items.map(hallazgo).join('')
      : `<p style="font-size:12px;color:${TINTA.dim};margin:0">${esc(cuandoVacio)}</p>`

  return `${titulo(rotulo)}<div class="bloque">${cuerpo}</div>`
}

// ═══════════════════════════════════════════════════════════ el documento ═══

export function informeDeAuditoriaHtml({
  auditoria,
  firma,
  normas,
  sitios,
  procesos,
  equipo,
  resumen,
}: DatosInforme): string {
  const cliente = auditoria.organizacion
    ? nombreDeOrganizacion(auditoria.organizacion)
    : 'Sin cliente'

  const fechas = auditoria.fecha_inicio
    ? `${formatDateOnly(auditoria.fecha_inicio)}${auditoria.fecha_fin && auditoria.fecha_fin !== auditoria.fecha_inicio ? ` al ${formatDateOnly(auditoria.fecha_fin)}` : ''}`
    : 'Sin fechas'

  // ── el membrete ──────────────────────────────────────────────────────────
  const encabezado = membrete(firma, FORMATO)

  // ── identificación ───────────────────────────────────────────────────────
  const identificacion = `<div class="bloque" style="display:flex;gap:26px;flex-wrap:wrap;margin-bottom:6px">
    <div style="flex:1 1 220px">${etiqueta('Organización auditada')}<div style="font-size:15px;font-weight:600">${esc(cliente)}</div></div>
    <div>${etiqueta('Fecha de auditoría')}<div style="font-size:13px">${esc(fechas)}</div></div>
    <div>${etiqueta('Auditoría')}<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px">${esc(folioVisible(auditoria))}</div></div>
    <div>${etiqueta('Tipo')}<div style="font-size:13px">${esc(etiquetaDe(TIPOS_AUDITORIA, auditoria.tipo))}</div></div>
  </div>
  <div style="font-size:13px;color:${TINTA.dim};margin-bottom:4px">${esc(auditoria.titulo)}</div>`

  // ── §1 · objetivo y alcance ──────────────────────────────────────────────
  //
  // ⚠️ El título es el del formato original —los junta— pero los párrafos van
  // separados: son cosas distintas (para qué se audita / qué se audita).
  const listaNormas = normas
    .map((fila) => esc(fila.norma?.clave ?? fila.norma?.nombre, ''))
    .filter(Boolean)
    .join(' · ')

  const listaSitios = sitios
    .map((fila) => esc(fila.sitio?.nombre, ''))
    .filter(Boolean)
    .join(' · ')

  const listaProcesos = procesos
    .map((fila) => esc(fila.proceso?.nombre, ''))
    .filter(Boolean)
    .join(' · ')

  const objetivoYAlcance = `${titulo('Objetivo y alcance de la auditoría')}
  <div class="bloque">
    ${parrafo('Objetivo', auditoria.objetivo)}
    ${parrafo('Alcance', auditoria.alcance)}
    ${listaSitios ? `<div style="margin-bottom:12px">${etiqueta('Sitios')}<div style="font-size:13px">${listaSitios}</div></div>` : ''}
    ${listaProcesos ? `<div style="margin-bottom:12px">${etiqueta('Procesos auditados')}<div style="font-size:13px">${listaProcesos}</div></div>` : ''}
    ${parrafo('Criterios', auditoria.criterios)}
    ${listaNormas ? `<div style="margin-bottom:12px">${etiqueta('Normas del alcance')}<div style="font-size:13px">${listaNormas}</div></div>` : ''}
  </div>`

  // ── §2 · reunión de apertura ─────────────────────────────────────────────
  //
  // ⚠️ Sin renglón de apertura en la agenda, la sección **se omite entera**. Es
  // preferible a imprimir un título con nada debajo.
  const apertura = resumen.apertura
  const seccionApertura = apertura
    ? `${titulo('Reunión de apertura')}
  <div class="bloque">
    <div style="font-size:13px;margin-bottom:5px">
      ${esc(formatDateOnly(apertura.fecha))}${horario(apertura) ? ` · ${esc(horario(apertura))}` : ''}${apertura.auditado ? ` · ${esc(apertura.auditado)}` : ''}
    </div>
    ${apertura.cumplido ? '' : `<p style="font-size:12px;color:#a55a00;margin:0 0 5px">Estaba planeada y no se registró como celebrada.</p>`}
    ${apertura.nota ? `<div style="font-size:13px;line-height:1.55">${escParrafos(apertura.nota)}</div>` : ''}
  </div>`
    : ''

  // ── §3 · resumen ─────────────────────────────────────────────────────────
  const cifras = [
    cifra(resumen.hallazgos.length, 'Hallazgos'),
    cifra(resumen.noConformidades.length, 'No conformidades'),
    cifra(procesos.length, 'Procesos'),
    resumen.lista.total > 0
      ? cifra(`${resumen.lista.evaluados}/${resumen.lista.total}`, 'Puntos evaluados')
      : '',
  ]
    .filter(Boolean)
    .join('')

  // La agenda cumplida: la única prueba de que el plan que se mandó se siguió.
  const agendaCumplida = resumen.dias
    .map((dia) => {
      const filas = dia.renglones
        .map(
          (renglon) => `<tr>
          <td style="width:88px;font-size:12px;white-space:nowrap">${esc(horario(renglon))}</td>
          <td style="font-size:12px">${esc(renglon.tema)}${renglon.auditado ? `<span style="color:${TINTA.dim}"> · ${esc(renglon.auditado)}</span>` : ''}</td>
          <td style="width:74px;text-align:right;font-size:11px;color:${renglon.cumplido ? TINTA.verdeTinta : '#a55a00'}">${renglon.cumplido ? 'Cumplido' : 'No cumplido'}</td>
        </tr>`,
        )
        .join('')

      return `<div style="margin-bottom:10px">
        ${etiqueta(formatDateOnly(dia.fecha))}
        <table><tbody>${filas}</tbody></table>
      </div>`
    })
    .join('')

  const seccionResumen = `${titulo('Resumen de la auditoría')}
  <div class="bloque">
    <div style="display:flex;gap:26px;flex-wrap:wrap;margin-bottom:14px">${cifras}</div>
    ${parrafo('Metodología', auditoria.metodologia)}
    ${agendaCumplida ? `<div>${etiqueta('Agenda cumplida')}${agendaCumplida}</div>` : ''}
  </div>`

  // ── §4 a §6 · los hallazgos ──────────────────────────────────────────────
  //
  // ⚠️ Las no conformidades van **mayores primero** (P-SG-03 §5.4.5 punto 4).
  const mayores = resumen.noConformidades.filter((h) => h.tipo === 'nc_mayor')
  const menores = resumen.noConformidades.filter((h) => h.tipo === 'nc_menor')

  const seccionNC = `${titulo('No conformidades encontradas')}
  <div class="bloque">
    ${
      resumen.noConformidades.length === 0
        ? `<p style="font-size:12px;color:${TINTA.dim};margin:0">No se levantaron no conformidades en esta auditoría.</p>`
        : `${mayores.length > 0 ? `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:${TINTA.dim};margin:0 0 7px">Mayores (${mayores.length})</h3>${mayores.map(hallazgo).join('')}` : ''}
           ${menores.length > 0 ? `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:${TINTA.dim};margin:10px 0 7px">Menores (${menores.length})</h3>${menores.map(hallazgo).join('')}` : ''}`
    }
  </div>`

  // ── §7 · gráficos ────────────────────────────────────────────────────────
  const graficos = [
    grafico('Hallazgos por tipo', resumen.porTipo, tintaDeHallazgo),
    grafico('Hallazgos por proceso', resumen.porProceso, () => TINTA.verde),
    resumen.porNorma.length > 0
      ? grafico('Hallazgos por norma', resumen.porNorma, () => TINTA.verde)
      : '',
    resumen.lista.total > 0
      ? grafico('Lista de verificación', resumen.veredictos, tintaDeVeredicto)
      : '',
  ]
    .filter(Boolean)
    .join('')

  const seccionGraficos = graficos ? `${titulo('Gráficos de resultados')}${graficos}` : ''

  // ── §8 · conclusión ──────────────────────────────────────────────────────
  const seccionConclusion = auditoria.conclusiones
    ? `${titulo('Conclusión')}<div class="bloque" style="font-size:13px;line-height:1.6">${escParrafos(auditoria.conclusiones)}</div>`
    : ''

  // ── §9 · equipo y firma ──────────────────────────────────────────────────
  //
  // ⚠️ P-SG-03 §5.4.5 punto 6 pide «auditores participantes en cada proceso
  // auditado», y eso no cabe en una línea de firma: va como bloque antes.
  const porProceso = resumen.auditores
    .map(
      (fila) =>
        `<tr><td style="font-size:12px;padding:2px 8px 2px 0">${esc(fila.proceso)}</td><td style="width:110px;text-align:right;font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${esc(fila.auditores)}</td></tr>`,
    )
    .join('')

  const miembros = equipo
    .map(
      (miembro) => `<div style="margin-bottom:6px">
      <div style="font-size:13px;font-weight:600">${esc(miembro.usuario?.nombre, 'Sin nombre')} <span style="font-weight:400;color:${TINTA.dim}">· ${esc(etiquetaDe(PAPELES_AUDITOR, miembro.papel))}</span></div>
      ${(miembro.usuario?.certificaciones ?? []).length > 0 ? `<div style="font-size:11px;color:${TINTA.dim}">${(miembro.usuario?.certificaciones ?? []).map((c) => esc(c)).join(' · ')}</div>` : ''}
    </div>`,
    )
    .join('')

  const lider = equipo.find((m) => m.usuario_id === auditoria.auditor_lider_id)?.usuario
  const nombreLider = lider?.nombre ?? auditoria.lider?.nombre ?? ''

  const seccionEquipo = `${titulo('Equipo auditor')}
  <div class="bloque">
    ${miembros || `<p style="font-size:12px;color:${TINTA.dim};margin:0 0 8px">Sin equipo registrado.</p>`}
    ${porProceso ? `<div style="margin-top:10px">${etiqueta('Auditores por proceso')}<table><tbody>${porProceso}</tbody></table></div>` : ''}
  </div>

  <div class="bloque" style="margin-top:34px">
    <div style="width:250px;border-top:1px solid ${TINTA.navy};padding-top:5px">
      <div style="font-size:13px;font-weight:600">${esc(nombreLider, '&nbsp;')}</div>
      <div style="font-size:11px;color:${TINTA.dim}">Elaboró el reporte de auditoría interna</div>
    </div>
  </div>`

  // ── pie ──────────────────────────────────────────────────────────────────
  const emitido = auditoria.informe_emitido_en
    ? `Informe emitido el ${formatDate(auditoria.informe_emitido_en)}.`
    : 'Documento preliminar: el informe todavía no ha sido emitido formalmente.'

  const pie = pieConfidencial(cliente, firma, emitido)

  return [
    encabezado,
    identificacion,
    objetivoYAlcance,
    seccionApertura,
    seccionResumen,
    seccionHallazgos(
      'Fortalezas del sistema de gestión',
      resumen.fortalezas,
      // ⚠️ Aquí el vacío ES el mensaje: un informe sin fortalezas es una lista de
      // quejas, y que el auditor lo vea impreso es lo que hace que la próxima vez
      // registre las conformidades que verificó.
      'No se registraron conformidades. Un informe que sólo enumera lo que está mal no refleja el estado del sistema: conviene dejar constancia también de lo que se verificó y cumple.',
    ),
    seccionHallazgos(
      'Observaciones y oportunidades de mejora',
      resumen.observaciones,
      'No se registraron observaciones ni oportunidades de mejora.',
    ),
    seccionNC,
    seccionGraficos,
    seccionConclusion,
    seccionEquipo,
    pie,
  ]
    .filter(Boolean)
    .join('\n')
}

/** El nombre de la ventana y del PDF que se guarda. */
export function tituloDelInforme(auditoria: AuditoriaEnLista): string {
  return `Informe de auditoría · ${folioVisible(auditoria)}`
}
