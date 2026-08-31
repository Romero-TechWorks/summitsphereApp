/**
 * Los cimientos de todo lo imprimible — docs/05_SISTEMA_DE_DISENO.md §6.
 *
 * Lo comparten el informe de auditoría [F03·B5] y los ocho entregables que
 * llegan con F06·B2 (matriz de requisitos, lista maestra de documentos, matriz
 * de aplicabilidad NOM, plan de acción, constancia DC-3, acta de revisión…).
 *
 * ⚠️ **LA TRAMPA DE ESTE ARCHIVO: la ventana de impresión NO hereda
 * `globals.css`.** Los colores van **literales**, nunca `var(--verde)`. Es lo que
 * ya costó en JDM Built: la plantilla se ve perfecta en pantalla y sale en blanco
 * y negro sin estilos al imprimir. Por eso la paleta vive aquí, en hexadecimal, y
 * no se lee de las variables CSS.
 *
 * ⚠️ **Y nada de tintes de fondo** (docs/05 §6): se comen el tóner y se ven
 * sucios en la impresora láser de la oficina de un cliente. Fondo blanco, texto
 * navy, y el verde sólo en encabezados y líneas de sección. La única excepción
 * son las barras de los gráficos, que **son** el dato: una barra sin relleno no
 * es una barra.
 */

import type { IdentidadFirma } from '@/lib/queries/firma'

/**
 * La paleta del papel. Los mismos valores que los tokens de `globals.css`, pero
 * escritos a mano porque allá no llegan.
 */
export const TINTA = {
  navy: '#0d1f35',
  verde: '#3dba4e',
  verdeTinta: '#1e6b28',
  dim: '#4a6080',
  borde: '#d5e0ec',
  papel: '#ffffff',
} as const

/**
 * El color de cada tipo de hallazgo — docs/05 §2.3, que lo llama «el catálogo
 * visual más importante de la app».
 *
 * ⚠️ **Se indexa por `hallazgos.tipo`, que viene de la base**, así que se lee
 * siempre con `tintaDeHallazgo()` y **nunca devuelve `undefined`**. Es la trampa
 * heredada de CLAUDE.md, y en un informe muerde el doble: los hallazgos se
 * pintan **en bucle**, así que un tipo inesperado no rompería su renglón —
 * rompería el informe entero, delante del cliente y en la reunión de cierre.
 *
 * ⚠️ El color **nunca es la única señal** (WCAG 1.4.1): cada hallazgo lleva su
 * tipo escrito al lado, y las tres secciones de hallazgos van tituladas.
 */
const TINTA_HALLAZGO: Readonly<Record<string, string>> = {
  nc_mayor: '#b91c1c',
  nc_menor: '#a55a00',
  observacion: '#1d4ed8',
  oportunidad_mejora: '#0f6d94',
  conformidad: '#1e6b28',
}

export function tintaDeHallazgo(tipo: string | null | undefined): string {
  if (!tipo) return TINTA.dim
  return TINTA_HALLAZGO[tipo] ?? TINTA.dim
}

/** El color de un veredicto de la lista de verificación. Misma regla. */
const TINTA_VEREDICTO: Readonly<Record<string, string>> = {
  conforme: '#1e6b28',
  no_conforme: '#b91c1c',
  observacion: '#a55a00',
  no_aplica: '#4a6080',
  pendiente: '#6f8aa8',
}

export function tintaDeVeredicto(veredicto: string | null | undefined): string {
  if (!veredicto) return TINTA.dim
  return TINTA_VEREDICTO[veredicto] ?? TINTA.dim
}

/**
 * Escapa un texto para meterlo en el HTML de una plantilla.
 *
 * ⚠️ **Obligatorio en cada interpolación, sin excepciones.** Este HTML se arma
 * concatenando cadenas, así que aquí no protege React: la descripción de un
 * hallazgo, el nombre de un contacto o la razón social de un cliente son texto
 * que escribió una persona, y basta un `<` para romper el documento — o algo
 * peor. Es la misma razón por la que el visor de documentos de la Fase 02 no
 * usa `dangerouslySetInnerHTML` ni una sola vez.
 *
 * Devuelve el sustituto cuando no hay valor: un hueco en blanco en un informe
 * parece un error de la app, no un dato que falta.
 */
export function esc(texto: unknown, sustituto = ''): string {
  if (texto === null || texto === undefined) return sustituto
  const crudo = String(texto)
  if (crudo.trim() === '') return sustituto

  return crudo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Lo mismo, pero conservando los saltos de línea de un `<textarea>`.
 *
 * El alcance, los criterios y las conclusiones se capturan en párrafos y así se
 * tienen que leer en el papel.
 */
export function escParrafos(texto: unknown, sustituto = ''): string {
  const limpio = esc(texto, '')
  if (limpio === '') return sustituto
  return limpio.replace(/\r?\n/g, '<br />')
}

// ══════════════════════════════════════════ piezas compartidas ═══════════════
//
// Las comparten los cuatro documentos de la firma —F-SG-12, F-SG-11, F-SG-09 y
// F-SG-03— y los ocho que llegan con F06·B2. Vivían dentro de
// `informeAuditoria.ts` hasta que hubo un segundo documento que las quería
// idénticas: un membrete que se escribe dos veces es un membrete que acaba
// distinto en cada entregable.

/** Cómo numera la firma un formato suyo. */
export type FormatoDeLaFirma = {
  /** El nombre tal como lo lee el cliente: «Reporte Final de Auditoría Interna». */
  nombre: string
  /** `F-SG-12`. */
  codigo: string
  /** La versión de la PLANTILLA, no la del documento lleno. */
  version: string
}

/**
 * El membrete: identidad de la firma a la izquierda, formato a la derecha.
 *
 * ⚠️ **La identidad sale de `config_firma` y el código del formato de una
 * constante del código**, y la división es a propósito: la razón social y el
 * logotipo los edita el dueño desde la app; renumerar los formatos de la firma
 * es un despliegue.
 *
 * ⚠️ `firma` puede ser `null` —la fila de `config_firma` puede no existir
 * todavía—, y entonces se imprime «Summit-Sphere». Un documento sin membrete es
 * mejor que un documento que no se puede imprimir delante del cliente.
 */
export function membrete(firma: IdentidadFirma | null, formato: FormatoDeLaFirma): string {
  const logo = firma?.logotipo_url
    ? `<img src="${esc(firma.logotipo_url)}" alt="" style="height:34px;width:auto" />`
    : ''

  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:8px;border-bottom:2px solid ${TINTA.verde};margin-bottom:18px">
    <div style="display:flex;gap:10px;align-items:center;min-width:0">
      ${logo}
      <div>
        <div style="font-size:14px;font-weight:600">${esc(firma?.razon_social, 'Summit-Sphere')}</div>
        <div style="font-size:11px;color:${TINTA.dim}">${[esc(firma?.telefono, ''), esc(firma?.correo, '')].filter(Boolean).join(' · ')}</div>
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:${TINTA.dim};flex-shrink:0">
      <div style="font-weight:600;color:${TINTA.navy};font-size:12px">${esc(formato.nombre)}</div>
      <div>${esc(formato.codigo)} · versión ${esc(formato.version)}</div>
    </div>
  </div>`
}

/**
 * El pie de confidencialidad.
 *
 * ⚠️ **La leyenda es de SUMMIT, no la del formato original.** La del original
 * protege al cliente de sus propios empleados; ésta protege el expediente que la
 * firma le entrega a su cliente.
 *
 * `nota` es la línea de arriba, que cambia por documento: «informe emitido
 * el…», «programa aprobado por…».
 */
export function pieConfidencial(
  cliente: string,
  firma: IdentidadFirma | null,
  nota?: string,
): string {
  const encabezado = nota ? `<p style="margin:0 0 3px">${esc(nota)}</p>` : ''

  return `<div style="margin-top:26px;padding-top:8px;border-top:1px solid ${TINTA.borde};font-size:10px;line-height:1.5;color:${TINTA.dim}">
    ${encabezado}
    <p style="margin:0">Este documento contiene información confidencial de ${esc(cliente)}, elaborada por ${esc(firma?.razon_social, 'Summit-Sphere')} en el marco de sus servicios de consultoría. Queda prohibida su reproducción total o parcial y su entrega a terceros sin autorización expresa de ambas partes.</p>
  </div>`
}

/** El título de una sección, subrayado con el verde de Summit. */
export function tituloSeccion(texto: string): string {
  return `<h2 style="font-size:15px;color:${TINTA.navy};margin:22px 0 8px;padding-bottom:5px;border-bottom:2px solid ${TINTA.verde}">${esc(texto)}</h2>`
}

/** El rótulo pequeño en versalitas que va encima de un dato. */
export function rotulo(texto: string): string {
  return `<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TINTA.dim};margin-bottom:2px">${esc(texto)}</div>`
}

/** El armazón del documento: `@page`, tipografías y las reglas de salto. */
export function documentoImprimible(titulo: string, cuerpo: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(titulo)}</title>
<style>
  /* ⚠️ Márgenes de la HOJA, no del cuerpo: el navegador pone los suyos por
     defecto y añaden la URL y la fecha en las esquinas. */
  @page { size: A4; margin: 16mm 14mm; }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: ${TINTA.papel};
    color: ${TINTA.navy};
    font: 13px/1.55 "DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* En pantalla el documento se centra como una hoja; al imprimir, el papel ya
     es la hoja y esto sobra. */
  .hoja { max-width: 820px; margin: 0 auto; padding: 24px 20px 40px; }
  @media print { .hoja { max-width: none; margin: 0; padding: 0; } }

  h1, h2, h3 { margin: 0; font-weight: 600; }

  /* ⚠️ Nada partido entre dos páginas: un hallazgo a caballo se lee como dos
     hallazgos, y un gráfico cortado no se lee. */
  .bloque, .hallazgo, .grafico, tr { break-inside: avoid; page-break-inside: avoid; }
  h2 { break-after: avoid; page-break-after: avoid; }

  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; vertical-align: top; padding: 5px 8px 5px 0; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: ${TINTA.dim}; font-weight: 600; }
</style>
</head>
<body><div class="hoja">${cuerpo}</div></body>
</html>`
}

/** Lo que pasó al intentar abrir la ventana de impresión. */
export type ResultadoImpresion = { abierta: true } | { abierta: false; motivo: string }

/**
 * Abre el documento en una ventana aparte y manda imprimir.
 *
 * ⚠️ **Una ventana aparte y no `window.print()` sobre la app**, y no es por
 * comodidad: el armazón de la aplicación es un marco fijo que recorta
 * (`overflow: hidden`, CLAUDE.md regla 4), así que imprimir la propia pantalla
 * sale cortado por la primera página. Además el documento tiene que llevar sus
 * colores literales, y en una ventana nueva no hay `globals.css` que los pise.
 *
 * ⚠️ **`window.open` puede devolver `null`** —bloqueador de emergentes, o un
 * navegador móvil restrictivo—. Se devuelve el motivo para poder decirlo en
 * pantalla: quien está en una reunión de cierre necesita saber que le falta un
 * permiso del navegador, no ver que «no pasó nada» al pulsar el botón.
 */
export function imprimirDocumento(titulo: string, html: string): ResultadoImpresion {
  const ventana = window.open('', '_blank')

  if (!ventana) {
    return {
      abierta: false,
      motivo:
        'El navegador bloqueó la ventana del informe. Permite las ventanas emergentes para este sitio y vuelve a intentarlo; el documento de arriba es el mismo que se imprime.',
    }
  }

  ventana.document.open()
  ventana.document.write(documentoImprimible(titulo, html))
  ventana.document.close()

  // ⚠️ Se espera al `load` antes de imprimir. Sin eso, en un documento con
  // tipografías web el diálogo sale antes de que se apliquen y la primera
  // impresión queda con la fuente de respaldo.
  ventana.addEventListener('load', () => {
    ventana.focus()
    ventana.print()
  })

  return { abierta: true }
}
