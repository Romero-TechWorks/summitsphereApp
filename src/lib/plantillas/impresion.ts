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
