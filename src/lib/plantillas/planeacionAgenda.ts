/**
 * **La planeación y agenda de una auditoría, en HTML imprimible** [F03·B6e].
 *
 * Reproduce `F-SG-11 Planeación y Agenda de Auditoría Interna`. Estructura,
 * ejemplo real y mapeo campo por campo:
 * `docs/formatos_informeAuditorias/F-SG-11_planeacion_y_agenda.md`.
 *
 * ⚠️ **Esto se le manda al cliente ANTES de la visita** (`P-SG-03` §5.3), por
 * correo y con copia a los jefes inmediatos. El dato ya existía desde F03·B1;
 * lo que faltaba era poder entregarlo.
 *
 * ⚠️ **Ni una consulta y ni una clave nueva**, igual que el informe y la lista
 * de asistencia: sale de lo que la precarga ya baja.
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
import { iniciales, inicialesDelEquipo } from '@/lib/auditorias/informe'
import { etiquetaDe } from '@/lib/cartera/catalogos'
import { PAPELES_AUDITOR, TIPOS_AUDITORIA } from '@/lib/auditorias/catalogos'
import { formatDateOnly } from '@/lib/utils/dates'
import { nombreDeOrganizacion } from '@/lib/queries/cartera'
import { folioVisible } from '@/lib/queries/auditorias'
import type {
  AuditoriaEnLista,
  AuditoriaNorma,
  AuditoriaProceso,
  AuditoriaSitio,
  MiembroAuditor,
  RenglonAgenda,
} from '@/lib/queries/auditorias'
import type { IdentidadFirma } from '@/lib/queries/firma'

const FORMATO = {
  nombre: 'Planeación y Agenda de Auditoría Interna',
  codigo: 'F-SG-11',
  version: '0',
} as const

export type DatosPlaneacion = {
  auditoria: AuditoriaEnLista
  normas: readonly AuditoriaNorma[]
  sitios: readonly AuditoriaSitio[]
  procesos: readonly AuditoriaProceso[]
  equipo: readonly MiembroAuditor[]
  agenda: readonly RenglonAgenda[]
  firma: IdentidadFirma | null
}

/** `09:00:00` → `09:00`. Un `time` de la base trae segundos que nadie lee. */
function hora(valor: string | null): string {
  return valor ? valor.slice(0, 5) : ''
}

function horario(renglon: RenglonAgenda): string {
  const inicio = hora(renglon.hora_inicio)
  const fin = hora(renglon.hora_fin)
  if (inicio && fin) return `${inicio}–${fin}`
  return inicio || fin
}

/** Un dato del bloque de planeación. Vacío no se pinta: un hueco parece un fallo. */
function dato(etiqueta: string, texto: string): string {
  if (!texto) return ''
  return `<div style="margin-bottom:9px">${rotulo(etiqueta)}<div style="font-size:12px;line-height:1.5">${texto}</div></div>`
}

export function planeacionAgendaHtml({
  auditoria,
  normas,
  sitios,
  procesos,
  equipo,
  agenda,
  firma,
}: DatosPlaneacion): string {
  const cliente = auditoria.organizacion
    ? nombreDeOrganizacion(auditoria.organizacion)
    : 'Organización sin nombre'

  const listaNormas = normas
    .map((fila) => esc(fila.norma?.clave ?? fila.norma?.nombre, ''))
    .filter(Boolean)
    .join(' · ')

  const listaSitios = sitios.map((fila) => esc(fila.sitio?.nombre, '')).filter(Boolean).join(' · ')
  const listaProcesos = procesos.map((fila) => esc(fila.proceso?.nombre, '')).filter(Boolean).join(', ')

  // ⚠️ Nombre completo **con sus iniciales entre paréntesis**, tal como el
  // original: es lo que hace legibles las siglas de cada renglón de la agenda.
  const listaEquipo = equipo
    .map((miembro) => {
      const nombre = miembro.usuario?.nombre
      if (!nombre) return ''
      const papel = etiquetaDe(PAPELES_AUDITOR, miembro.papel)
      return `<div>${esc(papel)} <b>${esc(nombre)}</b> (${esc(iniciales(nombre))})</div>`
    })
    .filter(Boolean)
    .join('')

  const fechas = [auditoria.fecha_inicio, auditoria.fecha_fin]
    .filter(Boolean)
    .map((fecha) => formatDateOnly(fecha))
    .join(' y ')

  // ── el bloque de planeación ───────────────────────────────────────────────
  //
  // ⚠️ El «Alcance» del original son sitios; nosotros tenemos las dos cosas —el
  // texto libre y `auditoria_sitios`—, así que se componen: la redacción arriba y
  // las plantas debajo. Es lo que el cliente necesita saber para recibir a nadie.
  const alcance = [
    escParrafos(auditoria.alcance, ''),
    listaSitios ? `<div style="color:${TINTA.dim};margin-top:2px">Sitios: ${listaSitios}</div>` : '',
  ]
    .filter(Boolean)
    .join('')

  const criterios = [
    escParrafos(auditoria.criterios, ''),
    listaNormas ? `<div style="color:${TINTA.dim};margin-top:2px">Normas: ${listaNormas}</div>` : '',
  ]
    .filter(Boolean)
    .join('')

  const planeacion = `<div class="bloque">
    ${dato('Objetivo', escParrafos(auditoria.objetivo, ''))}
    ${dato('Alcance', alcance)}
    ${dato('Criterios', criterios)}
    ${dato('Fecha de ejecución', esc(fechas))}
    ${dato('Procesos por auditar', listaProcesos)}
    ${dato('Equipo auditor', listaEquipo)}
  </div>`

  // ── la agenda, un bloque por día ──────────────────────────────────────────
  const todos = inicialesDelEquipo(equipo)
  const porNombre = new Map(equipo.map((m) => [m.usuario_id, iniciales(m.usuario?.nombre)]))

  const dias = new Map<string, RenglonAgenda[]>()
  for (const renglon of [...agenda].sort((a, b) => a.orden - b.orden)) {
    const lista = dias.get(renglon.fecha) ?? []
    lista.push(renglon)
    dias.set(renglon.fecha, lista)
  }

  const bordeCelda = `border:1px solid ${TINTA.borde}`
  const th = `padding:5px 7px;${bordeCelda};font-size:9px;text-align:left`
  const td = `padding:5px 7px;${bordeCelda};font-size:11.5px;vertical-align:top`

  let numero = 0

  const bloquesDia = [...dias.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, renglones]) => {
      const filas = renglones
        .map((renglon) => {
          // ⚠️ **Las celdas vacías se dejan en blanco, no con un guion.** El
          // renglón «COMIDA» del ejemplo real no tiene responsable ni auditor, y
          // poner «sin asignar» ahí convierte una pausa en un pendiente.
          const responsable = esc(renglon.auditado, '&nbsp;')

          // ⚠️ Sin auditor asignado se imprimen las iniciales del equipo entero
          // (hueco 8): en la práctica el equipo recorre junto, y así se cubre el
          // caso real sin tocar el esquema.
          const marca = renglon.auditor_id ? porNombre.get(renglon.auditor_id) ?? todos : todos

          // El «No.» sólo numera los puntos auditados; una pausa no lleva número.
          const conNumero = Boolean(renglon.auditado || renglon.proceso_id || renglon.auditor_id)
          if (conNumero) numero += 1

          return `<tr>
            <td style="${td};width:26px;text-align:center;color:${TINTA.dim}">${conNumero ? esc(numero) : '&nbsp;'}</td>
            <td style="${td};width:26%"><b>${esc(renglon.tema)}</b></td>
            <td style="${td};width:24%">${responsable}</td>
            <td style="${td};width:74px;white-space:nowrap">${esc(horario(renglon), '&nbsp;')}</td>
            <td style="${td};width:78px">${esc(conNumero ? marca : '', '&nbsp;')}</td>
            <td style="${td}">${escParrafos(renglon.nota, '&nbsp;')}</td>
          </tr>`
        })
        .join('')

      return `<div class="bloque" style="margin-top:14px">
        <div style="font-size:12px;font-weight:600;margin-bottom:4px">${esc(formatDateOnly(dia))}</div>
        <table>
          <thead><tr>
            <th style="${th};text-align:center">No.</th>
            <th style="${th}">Área</th>
            <th style="${th}">Responsable</th>
            <th style="${th}">Horario</th>
            <th style="${th}">Auditores</th>
            <th style="${th}">Comentarios</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`
    })
    .join('')

  const agendaHtml =
    agenda.length === 0
      ? `<p style="font-size:12px;color:${TINTA.dim};margin:6px 0 0">Esta auditoría todavía no tiene agenda. El plan hora por hora es lo que se le manda al cliente antes de la visita.</p>`
      : bloquesDia

  const identificacion = `<div class="bloque" style="display:flex;gap:26px;flex-wrap:wrap;margin-bottom:10px">
    <div style="flex:1 1 220px">${rotulo('Organización auditada')}<div style="font-size:15px;font-weight:600">${esc(cliente)}</div></div>
    <div>${rotulo('Auditoría')}<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px">${esc(folioVisible(auditoria))}</div></div>
    <div>${rotulo('Tipo')}<div style="font-size:13px">${esc(etiquetaDe(TIPOS_AUDITORIA, auditoria.tipo))}</div></div>
  </div>
  <div style="font-size:12px;color:${TINTA.dim};margin-bottom:12px">${esc(auditoria.titulo)}</div>`

  return [
    membrete(firma, FORMATO),
    identificacion,
    planeacion,
    tituloSeccion('Agenda'),
    agendaHtml,
    pieConfidencial(
      cliente,
      firma,
      'Este plan se envía antes de la visita. Cualquier cambio de horario se acuerda con el Coordinador del Sistema de Gestión.',
    ),
  ].join('')
}

/** El nombre de la ventana y del PDF que se guarda. */
export function tituloDeLaPlaneacion(auditoria: AuditoriaEnLista): string {
  return `Planeación y agenda · ${folioVisible(auditoria)}`
}
