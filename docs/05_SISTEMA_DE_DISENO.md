# 05 · Sistema de diseño

La identidad sale de la web de Summit-Sphere (`landingPage/website/styles.css`):
**navy · verde · cyan**, con *Cormorant Garamond* de display y *DM Sans* de texto.
Aquí se convierte en un sistema para una aplicación densa de datos, que es un
problema distinto al de una página de presentación.

---

## §1 · La decisión de fondo: la app es clara

JDM Built es oscura porque vive en un taller. **SummitApp es clara**, y es una
decisión, no un descuido:

- El trabajo es **leer documentos**: procedimientos, matrices, listas de
  verificación, informes. El fondo claro es el que corresponde.
- La marca es clara. La web abre en `--cream` con texto navy.
- Un auditor trabaja **a plena luz** en un patio, en una azotea, junto a una
  ventana de nave industrial. Ahí una pantalla oscura se convierte en un espejo.
- Lo que se imprime —y aquí se imprime mucho— sale de fondo blanco. Que la
  pantalla y el papel se parezcan evita sorpresas.

**El navy no desaparece: se queda en el armazón.** Sidebar, Navbar y BottomNav van
en navy, igual que la navegación de la web. El contenido va claro. Es el mismo
contraste que ya tiene la marca.

> **Tema oscuro: aplazado a después de la Fase 06.** Los tokens están definidos
> para que sea un bloque de anulaciones, no una reescritura. Pero como el proyecto
> estiliza con `style` inline, un tema alterno no se resuelve con una media query
> — hay que cambiar el valor de las variables en `:root`, y **cada par de colores
> se revalida en contraste**. No es trabajo de una tarde.

---

## §2 · Paleta

### §2.1 · Tokens

```css
:root {
  /* ── Marca ───────────────────────────────────────────────────────── */
  --navy:        #0d1f35;   /* Armazón, texto principal            */
  --navy-hondo:  #081528;   /* Sidebar al fondo, cabeceras          */
  --navy-medio:  #132b48;   /* Hover del armazón, sub-paneles navy  */
  --verde:       #3dba4e;   /* Acento principal — rellenos          */
  --verde-claro: #5ed46e;   /* Hover de relleno verde               */
  --verde-hondo: #2d9a3c;   /* Presionado                           */
  --cyan:        #29abe2;   /* Acento secundario — rellenos         */

  /* ── Tintas (colores COMO TEXTO sobre fondo claro) ──────────────── */
  /* El verde y el cyan de marca fallan AA como texto sobre claro:
     2.37:1 y 2.46:1. Estas son sus versiones legibles. NO se usan
     como relleno; para relleno van --verde y --cyan. */
  --verde-tinta:  #1e6b28;  /* 6.10:1 sobre --fondo                 */
  --cyan-tinta:   #0f6d94;  /* 5.36:1 sobre --fondo                 */

  /* ── Superficies ─────────────────────────────────────────────────── */
  --fondo:        #f5f8fc;  /* Fondo de la app (el cream de la marca) */
  --superficie:   #ffffff;  /* Tarjetas, paneles                     */
  --superficie-2: #eef3f9;  /* Campos, sub-paneles                   */
  --superficie-3: #e2eaf3;  /* Badges, anidados                      */

  /* ── Líneas ──────────────────────────────────────────────────────── */
  --borde:        #d5e0ec;  /* Separadores y marco del modal         */
  --borde-fuerte: #6f8aa8;  /* Bordes de CONTROLES — 3.59:1, WCAG 1.4.11 */

  /* ── Texto ───────────────────────────────────────────────────────── */
  --texto:        #0d1f35;  /* 15.5:1 sobre --fondo                  */
  --texto-dim:    #4a6080;  /* 6.03:1 sobre --fondo                  */
  --sobre-acento: #0d1f35;  /* Texto sobre CUALQUIER relleno de acento */

  /* ── Armazón (navy) ──────────────────────────────────────────────── */
  --nav-fondo:      #0d1f35;
  --nav-fondo-2:    #132b48;
  --nav-texto:      #e8eef5;
  --nav-texto-dim:  rgba(232, 238, 245, 0.62);
  --nav-activo:     #5ed46e;   /* verde claro: 8.1:1 sobre navy      */
  --nav-alerta:     #f0b429;   /* ámbar:       8.9:1 sobre navy      */
  --nav-error:      #ff8b7d;   /* coral:       7.3:1 sobre navy      */

  /* ── Estado (como TEXTO sobre fondo claro; todos pasan AA) ───────── */
  --exito:       #1e6b28;   /* 6.10:1 */
  --info:        #1d4ed8;   /* 6.24:1 */
  --advertencia: #a55a00;   /* 4.86:1 */
  --error:       #b91c1c;   /* 6.13:1 */
}
```

### §2.2 · Regla de contraste — se aplica siempre

**Texto sobre cualquier relleno de color de la paleta va con
`var(--sobre-acento)` (navy), nunca blanco.**

| Relleno | Blanco encima | Navy encima |
|---|---|---|
| `--verde` #3dba4e | **2.52:1** ✗ | **6.53:1** ✓ |
| `--cyan` #29abe2 | **2.62:1** ✗ | **6.29:1** ✓ |
| `--verde-claro` #5ed46e | 1.96:1 ✗ | 8.4:1 ✓ |

El verde de marca no cambia — sólo el color del texto encima. Es la misma regla
que rige JDM Built con su naranja, y por la misma razón: los acentos de marca son
**claros**, y un color claro con texto blanco no se lee.

**Y el recíproco:** el verde y el cyan de marca **no se usan como color de texto
sobre fondo claro**. Para eso existen `--verde-tinta` y `--cyan-tinta`. Un
`color: var(--verde)` sobre `--fondo` da 2.37:1 y es ilegible para media oficina.

### §2.3 · Colores de los hallazgos

Los cinco tipos de hallazgo tienen cinco tonos distintos, todos AA sobre claro.
**Es el catálogo visual más importante de la app**: un auditor lee la severidad
por el color antes que por la palabra.

| Tipo | Token | Uso |
|---|---|---|
| **NC mayor** | `--error` #b91c1c | Texto sobre tinte `rgba(185,28,28,.10)` |
| **NC menor** | `--advertencia` #a55a00 | Texto sobre tinte `rgba(165,90,0,.10)` |
| **Observación** | `--info` #1d4ed8 | Texto sobre tinte `rgba(29,78,216,.10)` |
| **Oportunidad de mejora** | `--cyan-tinta` #0f6d94 | Texto sobre tinte `rgba(15,109,148,.10)` |
| **Conformidad** | `--exito` #1e6b28 | Texto sobre tinte `rgba(30,107,40,.10)` |

⚠️ **El color nunca es la única señal.** WCAG 1.4.1. Cada badge lleva su etiqueta
en texto (*NC mayor*), y las listas se pueden ordenar y filtrar por tipo. Un
auditor daltónico es un auditor perfectamente capaz.

⚠️ Este catálogo vive **en un solo archivo**, `src/lib/auditorias/catalogos.ts`
(`TIPOS_HALLAZGO`), y su lectura **nunca devuelve `undefined`**: degrada enseñando
el valor crudo. Para el papel hay una segunda copia **en hexadecimal**, en
`src/lib/plantillas/impresion.ts`, y no es una duplicación por descuido: la
ventana de impresión no hereda `globals.css`, así que allá un `var(--error)` no
existe. Las dos se mueven juntas. En
JDM Built, un catálogo copiado en tres archivos que devolvía `undefined` tumbaba
la pantalla entera — y como las tarjetas se pintan en bucle, **un solo hallazgo
raro se llevaba los cuarenta**.

---

## §3 · Tipografía

| Familia | Token | Para qué |
|---|---|---|
| **Cormorant Garamond** | `--fuente-display` | Títulos de página, números grandes de KPI, portadas de informe |
| **DM Sans** | `--fuente-texto` | **Todo lo demás**: interfaz, botones, tablas, formularios, etiquetas |
| **IBM Plex Mono** | `--fuente-mono` | Folios, RFC, CURP, fechas, importes, números de cláusula |

⚠️ **Cormorant no baja de 24px.** Es una serif de display con trazos finos:
funciona en un `h1` y en un `2 450 000` de tablero, y se vuelve ilegible en una
etiqueta de formulario o en una celda de tabla. La regla dura: si el texto es
menor a 24px o el usuario lo va a leer más de una vez, es DM Sans.

**Los folios van en mono, siempre.** `AUD-2026-014/H-03` leído en una sans
proporcional se confunde: el 0 con la O, el 1 con la l. Un auditor dicta ese folio
por teléfono.

Se cargan con `next/font/google` en `src/app/layout.tsx` — no con un `<link>` a
`fonts.googleapis.com`, que suma una petición bloqueante y una dependencia de red
en el arranque de una app que tiene que abrir sin señal.

### Escala

```
Título de página     32px  Cormorant  600
Título de sección    20px  DM Sans    600
Subtítulo            16px  DM Sans    500
Cuerpo               15px  DM Sans    400
Etiqueta / meta      13px  DM Sans    500   letter-spacing .04em
Micro (badge)        11px  DM Sans    600   mayúsculas, letter-spacing .08em
Dato numérico        15px  IBM Plex Mono 400
KPI                  40px  Cormorant  600
```

---

## §4 · Reglas de interfaz

### §4.1 · Estilos inline con variables

```tsx
<article style={{
  background: 'var(--superficie)',
  border: '1px solid var(--borde)',
  borderRadius: 6,
  padding: 16,
}}>
```

**No mezclar Tailwind en componentes existentes.** Los nuevos de
`src/components/ui/` pueden usarlo si respetan las variables.

### §4.2 · Accesibilidad — reglas globales, no por componente

Van en `globals.css` porque son justo lo que un estilo inline no resuelve: un
pseudo-estado y un mínimo que aplica a todo lo interactivo a la vez.

- **Anillo de foco** `:focus-visible` en `--verde-hondo`, 2px, con
  `!important` (el estilo inline le gana a la hoja de estilos).
- **Mínimo táctil 44×44** en `@media (pointer: coarse)`. En escritorio no: con
  ratón sólo engorda la interfaz.
- **`prefers-reduced-motion`** apaga animaciones y transiciones.
- Para un contenedor que hace de botón pero anida otros controles (un acordeón),
  `clickableProps()` de `src/lib/utils/a11y.ts`. Para todo lo demás, un `<button>`
  real.

### §4.3 · Sin tarjetas. En ninguna pantalla

**El tablero es la plantilla visual del resto de la aplicación.** Lo que se
construya en cualquier fase se parece a `/`, no al revés.

⚠️ **Esta regla se invirtió el 21 ago 2026** (decisión del dueño). Antes decía
*"tarjetas sí, excepto en tres pantallas"*; ahora es al revés y sin excepciones.
Si encuentras un `background` de contenedor con `borderRadius` y borde de cuatro
lados alrededor de contenido, es código anterior a esa fecha o un descuido — no
un caso especial. `src/components/ui/Card.tsx` **ya no existe**.

Qué significa, en concreto:

- **Ni `background` de contenedor, ni `borderRadius`, ni bordes de cuatro
  lados.** El contenido va sobre `--fondo`, directamente.
- **La jerarquía la hacen la tipografía, el aire y una línea.** Cada bloque o
  fila se delimita **por debajo** con el verde de Summit: una hairline de
  `rgba(61,186,78,.16)` de lado a lado y, encima, un tramo en degradado de
  `--verde-hondo` a `--verde` que crece cuando el elemento está bajo el cursor o
  enfocado con el teclado.
- **El badge sobrevive; el aviso no.** Un `Badge` es una etiqueta de estado —
  micro-texto en mayúsculas sobre un tinte del 10%— y así está en el tablero,
  que es la plantilla. Un **aviso**, en cambio, va con una **barra de 2px a la
  izquierda y sin relleno** (`ui/Aviso.tsx`): un rectángulo tintado del ancho de
  la pantalla ya es un contenedor, y apilado compite con el contenido en vez de
  destacarse de él.
- **El icono deja de ser adorno**: es lo que hace reconocible un bloque antes de
  leer su título. Por eso el catálogo de widgets lo exige (`NombreIcono` es una
  unión de literales, no un `string`) y el mapa de iconos no puede devolver
  `undefined` — se pintan en bucle y uno roto se lleva los nueve.
- **El aire ES la separación.** Sin marcos, el `gap` de la rejilla y el padding
  de la fila son lo único que dice dónde termina un elemento y empieza el
  siguiente. Bajarlos a los 12px de una rejilla de tarjetas devuelve el
  amontonamiento que este diseño evita.

Dónde vive: `src/components/tablero/RejillaTablero.tsx` (bloques) y
`src/components/ui/Lista.tsx` (filas). Uno de los dos sirve para casi todo.

**Por qué.** Nueve recuadros blancos sobre el fondo claro compiten entre sí y no
gana ninguno: la portada de la firma se lee como una cuadrícula de cajas vacías.
Y en una pantalla de contenido el costo es peor que estético — una tarjeta cuesta
~24px de aire por elemento, que en un teléfono son dos hallazgos menos por
pantalla en una lista que se recorre con el pulgar.

**Las tres excepciones, y son de mecánica, no de gusto:**

1. **Los controles conservan su marco.** Un `<input>`, un `<select>` o un
   `<textarea>` sin borde no se ve pulsable. Van con `--borde-fuerte` (3.59:1),
   no con `--borde` (1.2:1): WCAG 1.4.11 pide 3:1 para el contorno de un control.
   `src/components/ui/Campo.tsx`.
2. **El modal lleva superficie.** Es una capa *por encima* de la pantalla, no una
   caja *dentro* de ella; sin fondo propio no se separaría de lo que tapa. Lo que
   va adentro sigue estas reglas.
3. **El armazón sigue en navy.** Sidebar, Navbar y BottomNav son marco, no
   contenido.

⚠️ **El marco sí aparece, pero sólo mientras se arrastra un widget del tablero**
—fondo, sombra y radio—, que es el único momento en el que hace falta ver el
bloque como un objeto que se toma con la mano.

### §4.4 · Eliminar, dos formas

- En una fila de una lista: `BotonEliminar` (`src/components/ui/`), **sólo
  el icono 🗑**, en el flujo y nunca encimado con `position: absolute` —flotando
  tapa el contenido de la esquina. `titulo` es obligatorio y específico: es el
  `aria-label`.
- En un formulario o una ficha: con su texto («Eliminar obligación»), al fondo y
  separado.

⚠️ **En muchos sitios de esta app no hay eliminar.** Un hallazgo se anula, una
versión de documento se hace obsoleta, una acción se cancela. El botón que existe
es «Anular», y pide motivo.

### §4.5 · Estados vacíos

Nunca una pantalla en blanco. Cada lista vacía dice **qué falta y cómo empezar**:
*"Este proyecto todavía no tiene su matriz de requisitos. Genérala desde el
alcance."* con el botón al lado. Es la diferencia entre una app que se adopta y
una que se abandona la primera semana.

### §4.6 · El indicador de conexión

Vive en la Navbar y **late sólo cuando hay cambios saliendo**. Un indicador que
parpadea siempre deja de mirarse. En campo dice tres cosas: sin señal / N cambios
esperando / todo sincronizado. Es el elemento de interfaz que más mira un auditor
en una jornada.

---

## §5 · El logotipo

La esfera de Summit-Sphere es SVG, sin dependencias, y va como componente en
`src/components/ui/Logo.tsx`:

```svg
<svg viewBox="0 0 40 40" fill="none">
  <circle cx="20" cy="20" r="18" stroke="#29abe2" stroke-width="1.2" opacity="0.6"/>
  <ellipse cx="20" cy="20" rx="11" ry="18" stroke="#3dba4e" stroke-width="2"
           transform="rotate(-25 20 20)"/>
  <ellipse cx="20" cy="20" rx="18" ry="8" stroke="#3dba4e" stroke-width="1.5"
           transform="rotate(-15 20 20)" opacity="0.5"/>
  <circle cx="20" cy="20" r="3.5" fill="#3dba4e"/>
  <circle cx="30" cy="16" r="2"   fill="#3dba4e"/>
  <circle cx="11" cy="25" r="1.5" fill="#29abe2"/>
</svg>
```

Sobre navy va tal cual. Sobre claro, el `#29abe2` del anillo exterior baja a
`--cyan-tinta` para que no se pierda.

Los iconos de la app son **SVG de trazo, 1.5px**, del mismo repertorio que usa la
web. Sin librería de iconos: son treinta iconos, no tres mil.

---

## §6 · Impresión

Los entregables imprimibles (informe de auditoría, matriz, constancia DC-3) se
renderizan en una ventana aparte.

⚠️ **La ventana de impresión no hereda `globals.css`.** Los colores van
**literales** en el HTML de la plantilla, no como `var(--verde)`. Es la trampa que
ya costó en JDM Built: la plantilla se ve perfecta en pantalla y sale en blanco y
negro sin estilos al imprimir.

Para papel: fondo blanco, texto navy, verde sólo en encabezados y líneas de
sección. Nada de tintes de fondo — se comen el tóner y se ven sucios en una
impresora láser de oficina de cliente.

⚠️ **Única excepción al «nada de tintes»: las barras de un gráfico**, que *son* el
dato — una barra sin relleno no es una barra. Se mantienen delgadas (9px) y cada
una lleva **su número absoluto al lado**: un porcentaje sobre cuatro hallazgos
dice «25%» y suena a mucho.

**Lo que se fijó al construir el primero** (el informe de auditoría, F03·B5), y
vale para los ocho que llegan con F06·B2:

- La plantilla devuelve **una cadena de HTML**, y la misma cadena se enseña en
  pantalla en un `<iframe sandbox>` vacío. Un solo renderizador: lo que el auditor
  ve antes de imprimir es exactamente lo que sale.
- **Ventana aparte, no `window.print()` sobre la app**: el armazón es un marco
  fijo que recorta (CLAUDE.md regla 4), así que imprimir la pantalla sale cortado
  por la primera página. Si el navegador bloquea la emergente, **se dice** — quien
  está en una reunión de cierre necesita saber que le falta un permiso, no ver que
  el botón no hizo nada.
- `break-inside: avoid` en cada hallazgo y cada gráfico: uno partido entre dos
  páginas se lee como dos.
- **En el teléfono, imprimir es compartir.** Un auditor en una planta no tiene
  impresora: enseña la pantalla y manda el PDF. La plantilla tiene que leerse en
  vertical, no sólo en A4.
- **Sin librería de gráficas.** El aplazamiento de `docs/02` se revisó con este
  informe delante y se confirma: se generan en una planta sin señal, y un chunk
  que se carga bajo demanda es un chunk que no está.
