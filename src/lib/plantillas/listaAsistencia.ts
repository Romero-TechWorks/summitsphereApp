/**
 * **La lista de asistencia, en HTML imprimible** [F03·B6d].
 *
 * Reproduce `F-SG-03 Lista de Asistencia o Implementación`, el formato de la
 * firma. Su estructura y el mapeo campo por campo:
 * `docs/formatos_informeAuditorias/F-SG-03_lista_de_asistencia.md`.
 *
 * ⚠️ **Es lo que demuestra que la reunión de apertura ocurrió**, y `P-SG-03`
 * §5.4.1 la exige por escrito. Hasta ahora la app no tenía forma de probarlo.
 *
 * ⚠️ **LA REGLA QUE DECIDE SI ESTO SIRVE: se imprime LLENO, no en blanco.** Una
 * parrilla vacía es un PDF que cualquiera saca de un Word; lo que la app aporta
 * es que ya sabe el evento, el objetivo, la fecha, el lugar y los puestos. Sólo
 * la columna FIRMA va en blanco, que es lo único que el papel aporta. Es la
 * misma lección que dejaron las casillas ☐ del F-SG-06: lo que sale en blanco lo
 * llena alguien con pluma, y ese dato ya no vuelve.
 *
 * ⚠️ **Ni una consulta y ni una clave de caché nueva.** Sale entero de lo que ya
 * baja `piezasDeLaPrecarga()`, y es deliberado: la reunión de apertura pasa en la
 * planta, con el auditor recién llegado. Misma regla que gobernó el informe.
 */

import {
  TINTA,
  esc,
  escParrafos,
  membrete,
  pieConfidencial,
  rotulo,
} from '@/lib/plantillas/impresion'
import { etiquetaDe } from '@/lib/cartera/catalogos'
import { PAPELES_AUDITOR } from '@/lib/auditorias/catalogos'
import { formatDateOnly } from '@/lib/utils/dates'
import { nombreDeOrganizacion } from '@/lib/queries/cartera'
import { folioVisible } from '@/lib/queries/auditorias'
import type {
  AuditoriaEnLista,
  AuditoriaSitio,
  MiembroAuditor,
  RenglonAgenda,
} from '@/lib/queries/auditorias'
import type { IdentidadFirma } from '@/lib/queries/firma'

const FORMATO = {
  nombre: 'Lista de Asistencia o Implementación',
  codigo: 'F-SG-03',
  version: '0',
} as const

/**
 * Cuántos renglones tiene la parrilla del original.
 *
 * ⚠️ **No es un límite, es lo que cabe en la hoja** —igual que los cuatro
 * renglones de acción correctiva del F-SG-06—. Se usa como mínimo, no como
 * máximo: si a la reunión se espera más gente, la tabla crece.
 */
const RENGLONES_DEL_ORIGINAL = 18

/**
 * Renglones en blanco que quedan SIEMPRE, por debajo de los prellenados.
 *
 * ⚠️ A una reunión de apertura siempre llega alguien que no estaba en la agenda
 * —el jefe de turno, un practicante, el de seguridad—, y una hoja sin renglones
 * libres obliga a escribir en el margen o a no registrarlo. Seis es una fila de
 * gente de pie al fondo.
 */
const RENGLONES_LIBRES = 6

export type DatosListaAsistencia = {
  auditoria: AuditoriaEnLista
  /** El renglón de la agenda que es la reunión: apertura, clausura, la que sea. */
  renglon: RenglonAgenda
  /** La agenda completa — de ahí salen los puestos de los auditados esperados. */
  agenda: readonly RenglonAgenda[]
  equipo: readonly MiembroAuditor[]
  sitios: readonly AuditoriaSitio[]
  firma: IdentidadFirma | null
}

/** Quién se espera en la mesa: un nombre (si se sabe) y un puesto. */
type Asistente = { nombre: string; puesto: string }

/** `09:00:00` → `09:00`. Un `time` de la base trae segundos que nadie lee. */
function hora(valor: string | null): string {
  return valor ? valor.slice(0, 5) : ''
}

/**
 * A quién se prellena.
 *
 * Dos grupos y en este orden: **el equipo auditor** —de quien sabemos nombre y
 * papel— y **los auditados esperados**, de quienes sólo sabemos el puesto.
 *
 * ⚠️ `auditoria_agenda.auditado` es texto libre **con el puesto**, no con el
 * nombre: la agenda se manda semanas antes, cuando todavía no se sabe quién va a
 * estar, y dice «Jefe de Almacén». Eso encaja exacto con la columna PUESTO de
 * este formato — se imprime el puesto y la persona escribe su nombre al firmar.
 * Es el `puesto_responsable` que el F-SG-06 pedía, resuelto por una columna que
 * ya existía.
 *
 * ⚠️ **Los puestos se deduplican.** Un mismo «Jefe de Almacén» aparece en tres
 * renglones de la agenda y no son tres personas.
 */
function asistentesEsperados(
  equipo: readonly MiembroAuditor[],
  agenda: readonly RenglonAgenda[],
): Asistente[] {
  const auditores = equipo.map((miembro) => ({
    nombre: miembro.usuario?.nombre ?? '',
    puesto: etiquetaDe(PAPELES_AUDITOR, miembro.papel),
  }))

  const puestos = new Set<string>()
  for (const renglon of agenda) {
    const puesto = renglon.auditado?.trim()
    if (puesto) puestos.add(puesto)
  }

  const auditados = [...puestos].map((puesto) => ({ nombre: '', puesto }))

  return [...auditores, ...auditados]
}

/** Un renglón de la parrilla. `FIRMA` siempre vacío: es lo que aporta el papel. */
function renglonDeFirma(asistente: Asistente | null): string {
  // ⚠️ Alto de renglón de verdad, no una línea: se firma con pluma sobre una
  // mesa. `&nbsp;` sostiene la celda vacía para que la fila no se colapse.
  const celda = `padding:0 8px;height:30px;border:1px solid ${TINTA.borde};font-size:12px;vertical-align:middle`

  return `<tr>
    <td style="${celda};width:42%">${esc(asistente?.nombre, '&nbsp;')}</td>
    <td style="${celda};width:33%">${esc(asistente?.puesto, '&nbsp;')}</td>
    <td style="${celda};width:25%">&nbsp;</td>
  </tr>`
}

/** Un campo del bloque de encabezado: rótulo arriba, valor subrayado debajo. */
function campo(etiqueta: string, valor: string): string {
  return `<div style="margin-bottom:10px">
    ${rotulo(etiqueta)}
    <div style="font-size:13px;line-height:1.5;padding-bottom:3px;border-bottom:1px solid ${TINTA.borde};min-height:19px">${valor || '&nbsp;'}</div>
  </div>`
}

export function listaDeAsistenciaHtml({
  auditoria,
  renglon,
  agenda,
  equipo,
  sitios,
  firma,
}: DatosListaAsistencia): string {
  const cliente = auditoria.organizacion
    ? nombreDeOrganizacion(auditoria.organizacion)
    : 'Organización sin nombre'

  // ── EVENTO ────────────────────────────────────────────────────────────────
  //
  // ⚠️ El tema del renglón de agenda es texto libre, y ése ES el evento. Nada de
  // un CHECK con `('apertura','clausura')`: la misma hoja sirve para una sesión
  // de capacitación y para un arranque de proyecto (regla 11).
  const evento = [esc(renglon.tema), esc(folioVisible(auditoria)), esc(auditoria.titulo)]
    .filter(Boolean)
    .join(' · ')

  // ── FECHA ─────────────────────────────────────────────────────────────────
  //
  // ⚠️ `formatDateOnly`, nunca `new Date()`: `auditoria_agenda.fecha` es una
  // columna `date` y el constructor la corre un día en México.
  const inicio = hora(renglon.hora_inicio)
  const fin = hora(renglon.hora_fin)
  const franja = inicio && fin ? `${inicio} – ${fin}` : inicio || fin
  const fecha = [formatDateOnly(renglon.fecha), franja].filter(Boolean).join(' · ')

  // ── LUGAR ─────────────────────────────────────────────────────────────────
  const lugar = sitios
    .map((fila) => {
      const nombre = fila.sitio?.nombre
      if (!nombre) return ''
      const municipio = fila.sitio?.municipio
      return municipio ? `${nombre} (${municipio})` : nombre
    })
    .filter(Boolean)
    .join(' · ')

  // ── DIRIGIÓ EL EVENTO ─────────────────────────────────────────────────────
  //
  // El auditor del renglón si lo tiene; si no, el líder de la auditoría.
  const auditorDelRenglon = renglon.auditor_id
    ? equipo.find((miembro) => miembro.usuario_id === renglon.auditor_id)?.usuario?.nombre
    : null
  const dirigio = auditorDelRenglon ?? auditoria.lider?.nombre ?? ''

  // ── la parrilla ───────────────────────────────────────────────────────────
  const esperados = asistentesEsperados(equipo, agenda)
  const enBlanco = Math.max(RENGLONES_LIBRES, RENGLONES_DEL_ORIGINAL - esperados.length)

  const filas = [
    ...esperados.map((asistente) => renglonDeFirma(asistente)),
    ...Array.from({ length: enBlanco }, () => renglonDeFirma(null)),
  ].join('')

  const encabezadoTabla = ['Nombre', 'Puesto', 'Firma']
    .map(
      (texto) =>
        `<th style="padding:5px 8px;border:1px solid ${TINTA.borde};background:${TINTA.papel};font-size:10px">${esc(texto)}</th>`,
    )
    .join('')

  const parrilla = `<table style="margin-top:6px">
    <thead><tr>${encabezadoTabla}</tr></thead>
    <tbody>${filas}</tbody>
  </table>`

  // ⚠️ Nada de `break-inside: avoid` en estas filas: la parrilla puede pasar de
  // una hoja y tiene que poder partirse. Lo que no se parte es el bloque de
  // arriba, que es la identificación del evento.
  const identificacion = `<div class="bloque">
    ${campo('Evento', evento)}
    ${campo('Objetivo', escParrafos(auditoria.objetivo, ''))}
    ${campo('Fecha', esc(fecha))}
    ${campo('Lugar', esc(lugar))}
  </div>`

  const cierre = `<div class="bloque" style="margin-top:16px;max-width:360px">
    ${campo('Dirigió el evento', esc(dirigio))}
  </div>`

  return [
    membrete(firma, FORMATO),
    `<div style="font-size:15px;font-weight:600;margin-bottom:14px">${esc(cliente)}</div>`,
    identificacion,
    parrilla,
    cierre,
    pieConfidencial(cliente, firma),
  ].join('')
}

/** El nombre de la ventana y del PDF que se guarda. */
export function tituloDeListaAsistencia(
  auditoria: AuditoriaEnLista,
  renglon: RenglonAgenda,
): string {
  return `Lista de asistencia · ${renglon.tema} · ${folioVisible(auditoria)}`
}
