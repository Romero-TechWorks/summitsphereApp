# F-SG-12 · Reporte Final de Auditoría Interna — **la especificación de F03·B5**

> ✅ **Construido el 30 ago 2026.** Es la pestaña **Informe** de
> `/auditorias/[id]`. Las decisiones de la §4 y la §5 se tomaron todas; están
> anotadas ahí mismo.

> Transcripción del `.docx` que entregó Summit (30 ago 2026). Versión vigente 0,
> emitido el 10-Feb-2025. **Es la tarea del dueño `D01`, y con esto queda cerrada.**
>
> El original es una plantilla **vacía**: nueve secciones tituladas y sin contenido
> de ejemplo. Eso es una buena noticia — dice el orden y los títulos exactos, que
> es lo que había que reproducir, y no arrastra el contenido de ningún cliente.
>
> Los «huecos» numerados que se citan aquí están en el [índice y análisis](README.md).

**Quién lo hace y cuándo:** el equipo auditor, con plazo de **una semana** después
de la auditoría (P-SG-03 §5.4.5). Se entrega al Coordinador del SGC del cliente.
⚠️ Pero el criterio de cierre de la Fase 03 pide más que eso: **el preliminar se
enseña en la reunión de cierre, el mismo día, en el sitio y posiblemente sin
señal.** Ver §5.

---

## 1 · Estructura del original, en orden

```
┌─ encabezado (en todas las páginas) ─────────────────────────────┐
│ [logo]  Reporte Final de Auditoría Interna   F. Elaboración: … │
│         F-SG-12                              Versión vigente: 0 │
└─────────────────────────────────────────────────────────────────┘

  Fecha de Auditoría:              │  Auditoría Interna:
  ─────────────────────────────────┴──────────────────────────────
  Objetivo y Alcance de la auditoría:
  ────────────────────────────────────────────────────────────────
  Reunión de Apertura:
  ────────────────────────────────────────────────────────────────
  Resumen de Auditoría Interna:
  ────────────────────────────────────────────────────────────────
  Fortalezas del SGC:
  ────────────────────────────────────────────────────────────────
  Observaciones (oportunidades de mejora):
  ────────────────────────────────────────────────────────────────
  No Conformidades encontradas:
  ────────────────────────────────────────────────────────────────

  Gráficos de Resultados
  ────────────────────────────────────────────────────────────────

  Conclusión:
  ────────────────────────────────────────────────────────────────

  ______________________________
  Elaboró Reporte de Auditoría Interna
```

Nueve secciones, un bloque de gráficos y una firma. **Ese orden no se cambia**: es
el documento que el cliente ya sabe leer, y en una firma de auditoría la
familiaridad del entregable es parte del servicio.

---

## 2 · De dónde sale cada sección

| # | Sección | Fuente | Nota |
|---|---|---|---|
| 1 | **Fecha de Auditoría** | `auditorias.fecha_inicio` – `fecha_fin` | ⚠️ Son `date`. `formatDateOnly`, **nunca `new Date()`** |
| 2 | **Auditoría Interna** *(la clave)* | `auditorias.folio` (+ `titulo` si trae la clave del cliente) | Ver P-SG-03 §5.1. Si el folio es `null` —encolada sin señal— se dice «pendiente de sincronizar», no se deja en blanco |
| 3 | **Objetivo y Alcance** | ⚠️ **`objetivo` no existe** + `auditorias.alcance` + `auditoria_sitios` | Hueco 1. Ver §4 |
| — | *Criterios* | `auditorias.criterios` + `auditoria_normas` → `normas.clave/nombre` | ⚠️ **No tiene sección propia en el original** y P-SG-03 §5.4.5 lo exige. Va dentro de la 3, con su propio subtítulo |
| 4 | **Reunión de Apertura** | El renglón de `auditoria_agenda` de la apertura: `fecha`, `hora_inicio`, `auditado`, `nota`, `cumplido` | Ver §3.1 |
| 5 | **Resumen de Auditoría Interna** | Cifras calculadas + `auditorias.metodologia` + la agenda cumplida | Ver §3.2 |
| 6 | **Fortalezas del SGC** | `hallazgos` con `tipo = 'conformidad'` | ⚠️ Ver §3.3 |
| 7 | **Observaciones (oportunidades de mejora)** | `hallazgos` con `tipo in ('observacion','oportunidad_mejora')` | Los dos tipos caen aquí: el original sólo tiene «observación» y su definición (P-SG-03 §3) dice literalmente «como oportunidad de mejora» |
| 8 | **No Conformidades encontradas** | `hallazgos` con `tipo in ('nc_mayor','nc_menor')` | **Separadas en dos subsecciones**, mayores primero. P-SG-03 §5.4.5 punto 4 |
| 9 | **Gráficos de Resultados** | Calculado en memoria | Ver §3.4 |
| 10 | **Conclusión** | `auditorias.conclusiones` | Texto libre del auditor líder |
| 11 | **Elaboró** | `auditorias.auditor_lider_id` → `usuarios.nombre` + `certificaciones` | Y debajo el equipo, **por proceso**. Ver §3.5 |
| — | Encabezado | `config_firma` (`razon_social`, `logotipo_url`) + constantes del formato | ⚠️ **No está en la precarga.** Ver §5 |
| — | Pie | Leyenda de confidencialidad **de Summit** | El del original protege al cliente de sus empleados; el nuestro protege el expediente que la firma entrega |

⚠️ **Los hallazgos `anulado` no se imprimen, en ninguna de las tres secciones.**
Un hallazgo anulado queda en la base con su motivo y su historial —regla 13— pero
no es un resultado de la auditoría: meterlo en el informe que ve el cliente
convertiría un error del auditor en una acusación. Filtrar por
`estado <> 'anulado'`, no por `estado in (...)`: así un estado nuevo entra solo.

---

## 3 · Las secciones que hay que componer

### 3.1 · Reunión de Apertura

El original deja un párrafo en blanco. Lo que corresponde escribir ahí es cuándo
se hizo, quién estuvo y qué se dijo — y todo eso ya está en el renglón de agenda
de la apertura.

Se localiza el renglón por su `orden` más bajo del primer día cuyo `tema`
normalizado contenga «apertura». Si no hay ninguno —una auditoría corta que no la
registró— **la sección se omite entera**, no se imprime vacía.

Se compone: fecha y hora del renglón · `auditado` («Todos») · `nota` como el
cuerpo. Si `cumplido` es falso, se dice: la reunión estaba planeada y no se
celebró, y eso es información que un certificador pregunta.

⚠️ **Lo mismo aplica a la reunión de cierre**, que el original no tiene como
sección. No se le inventa una: va como último renglón de la agenda cumplida,
dentro del resumen.

### 3.2 · Resumen de Auditoría Interna

Tres bloques, en este orden:

1. **Las cifras**, en una fila de números grandes sin tarjeta (§5 del sistema de
   diseño): puntos de la lista evaluados / total · procesos auditados · hallazgos
   por tipo · no conformidades abiertas.
2. **La agenda cumplida**: los renglones de `auditoria_agenda` con su `cumplido`.
   Es la única prueba documental de que el plan que se le mandó al cliente se
   siguió. Un renglón no cumplido se marca y se imprime su `nota`.
3. **`auditorias.metodologia`**, si viene llena.

⚠️ **Si la auditoría no tiene lista de verificación, el bloque de cifras de la
lista se omite** —P-SG-03 §5.3 la hace opcional— en vez de imprimir «0 de 0».

### 3.3 · Fortalezas del SGC

Sale de `hallazgos` con `tipo = 'conformidad'`, y es la sección que justifica que
ese tipo exista en el catálogo. Se imprimen la `descripcion`, la cláusula citada
y el proceso.

⚠️ **Si no hay ninguna conformidad registrada, la sección se imprime igual, con
una línea que lo dice.** Es la única sección donde el vacío es el mensaje: un
informe sin fortalezas es una lista de quejas, y que el auditor lo vea impreso es
lo que hace que la próxima vez registre las conformidades.

### 3.4 · Gráficos de Resultados

⚠️ **Esto activa una decisión que el plan tenía aplazada.** `docs/02` deja fuera
«Gráficas de librería (Recharts y similares)» con la condición *«si un informe lo
exige de verdad»*. Éste lo exige — pero la excepción sigue sin aplicar: **barras
nativas y números absolutos**, `div` con un `width` en porcentaje y color literal.
Tres razones, y la tercera es la que decide:

1. El motivo original se sostiene: no romper el bundle.
2. Una librería de gráficas no imprime bien — `canvas` y `@media print` se llevan
   mal, y este documento se imprime.
3. **Y sobre todo: esto se genera en una planta, sin señal, desde la caché.** Un
   chunk que se carga bajo demanda es un chunk que no está.

Cuatro gráficos, todos calculados en memoria sobre lo que ya está en la caché:

| Gráfico | Datos | Colores |
|---|---|---|
| **Hallazgos por tipo** | Los cinco tipos, en orden de gravedad | La tabla de tonos de `docs/05` §116-120 |
| **Hallazgos por proceso** | `hallazgos.proceso_id` → `procesos.nombre` | Un solo verde; lo que se compara es el largo |
| **Veredictos de la lista** | Los cinco de `auditoria_items.veredicto` | Éxito / error / advertencia / neutro |
| **Hallazgos por norma** | Vía `clausula_id` → `norma_clausulas.norma_id` | **Sólo si el alcance tiene más de una norma** |

Colores literales, tomados de `docs/05_SISTEMA_DE_DISENO.md`:

```
NC mayor            #b91c1c   sobre  rgba(185, 28, 28, .10)
NC menor            #a55a00   sobre  rgba(165, 90,  0, .10)
Observación         #1d4ed8   sobre  rgba( 29, 78,216, .10)
Oportunidad mejora  #0f6d94   sobre  rgba( 15,109,148, .10)
Conformidad         #1e6b28   sobre  rgba( 30,107, 40, .10)

navy   #0d1f35    texto y armazón
verde  #3dba4e    acento de la firma
borde  #d5e0ec    separadores
dim    #4a6080    texto secundario
```

⚠️ **Van literales y no como `var(--navy)`.** La ventana de impresión no hereda
`globals.css` — está escrito en el plan de la fase y es la trampa que convierte un
informe en un documento en blanco y negro delante del cliente.

⚠️ **Cada barra lleva su número absoluto al lado.** Un porcentaje sobre cuatro
hallazgos dice «25%» y suena a mucho.

### 3.5 · Firmas

El original tiene **una** línea: «Elaboró Reporte de Auditoría Interna». Se llena
con el auditor líder (`auditorias.auditor_lider_id`), su nombre y sus
`certificaciones` debajo.

Pero P-SG-03 §5.4.5 punto 6 pide además **«auditores participantes en cada proceso
auditado»**, y eso no cabe en una línea de firma. Va como un bloque antes de la
firma: cada proceso de `auditoria_procesos` con los auditores que lo recorrieron,
sacados de `auditoria_agenda.auditor_id` de los renglones de ese proceso — y si
vienen vacíos, el equipo completo (misma regla que F-SG-11 §3.2).

⚠️ **Sin firma electrónica.** `docs/02` la deja fuera: «la firma con nombre +
bitácora inmutable basta para auditoría interna». El informe imprime el nombre
sobre una línea para firmar a mano, que es lo que el formato original hace.

---

## 4 · Las dos decisiones de esquema — ✅ **tomadas**

Las dos viven en `20260830120000_informe_de_auditoria.sql`, tarea del dueño `D05`.
Es la migración más pequeña del proyecto: una columna y un trigger.

### 4.1 · `auditorias.objetivo` — se añadió la columna

F-SG-11 y F-SG-12 abren los dos con «Objetivo», y en el modelo el objetivo sólo
vivía en `programa_auditorias` — que es del año entero y **puede no existir**:
`programa_id` es nullable, así que una preauditoría, una de seguimiento o la
primera de un cliente nuevo se quedaban sin ninguno.

Se valoró reusar `alcance` e imprimir un solo párrafo bajo el título conjunto
«Objetivo y Alcance», que es literalmente el del formato original y no habría
costado migración. **Se descartó**: el objetivo dice *para qué* se audita y el
alcance *qué* se audita —«evaluar el grado de cumplimiento» contra «las tres
plantas del grupo»—, y el informe los imprime bajo subtítulos separados. En un
solo campo, la plantilla tendría que partir un texto libre por la mitad, que no se
puede hacer bien.

Coste real: una línea de SQL, sin política que tocar —`auditorias` ya las tiene—,
sin trigger y sin dato que migrar. `src/types/database.ts` se regeneró en el mismo
commit: tres líneas.

### 4.2 · `informe_emitido_en` — ahora lo sella el servidor

La columna existía desde la Fase 03 y **nunca la escribió nadie**: no tenía
trigger, ninguna consulta la tocaba, y la pestaña Plan llevaba desde entonces
diciendo «Sin emitir» sin manera de cambiarlo. B5 es quien la llena.

La sella `sellar_emision_informe()`, y **descarta cualquier fecha que mande el
navegador**. Emitir es una acción de **oficina**, y por la regla de las fechas de
la Fase 03 ésas las sella el servidor — aquí además con un motivo concreto: el
plazo de una semana que da P-SG-03 §5.4.5 se mide contra esa fecha, y es lo que un
organismo certificador contrasta.

- **Reemitir vuelve a sellar.** Si el auditor corrige el informe y lo entrega otra
  vez, la fecha que vale es la de la última entrega.
- **Retractar (null) la deja en null**, no la re-sella. Retirar una emisión es
  legítimo.
- **Editar cualquier otra cosa de la auditoría no la toca.**

⚠️ **El preliminar impreso en planta NO toca esta columna.** Son dos actos
distintos y conviene no confundirlos: en la reunión de cierre se *enseña* un
documento —eso no escribe nada, se arma desde la caché y por eso funciona sin
señal—; emitir es el botón «Marcar como emitido», que es un `update` normal y pasa
por la cola como todo lo demás.

---

## 5 · Lo que decide si B5 sirve: **el informe se arma desde la CACHÉ**

El criterio de cierre de la Fase 03 dice que el auditor «genera el informe
preliminar **en el sitio**» tras tres horas en modo avión. Eso impone una regla
dura sobre cómo se escribe:

> **El informe no puede introducir ni una clave de consulta nueva.** Toda su
> materia prima tiene que estar entre las que baja `piezasDeLaPrecarga()`, o el
> documento sale en blanco justo en la reunión de cierre.

Contra las diez piezas que hoy se precargan, el informe está **casi cubierto**:

| Necesita | ¿Está en la precarga? |
|---|---|
| La auditoría, con su organización embebida | ✅ `auditorias.auditoria(id)` |
| La lista de verificación | ✅ `auditorias.items(id)` |
| La agenda | ✅ `auditorias.agenda(id)` |
| Normas, sitios y procesos del alcance | ✅ `auditorias.alcance*(id)` |
| El árbol de cláusulas | ✅ `normas.arbol()` |
| El equipo, con nombres y certificaciones | ✅ `auditorias.equipo(id)` |
| Los procesos del cliente | ✅ `sistemas.procesos(orgId)` |
| Los hallazgos | ✅ `auditorias.hallazgos(id)` |
| **La identidad de la firma** (`config_firma`) | ⚠️ **No estaba** — se añadió con B5 |

✅ **Se añadió.** Es `src/lib/queries/firma.ts`, la clave `firma.identidad()` y la
**undécima pieza** de `piezasDeLaPrecarga()`, en el mismo commit que la plantilla.

⚠️ **El problema que resolvía, para que no se reabra:** `config_firma` sólo se
leía para `plantillas` (en `tareas.ts` y `verificacion.ts`), y su identidad
—`razon_social`, `logotipo_url`— no tenía clave de consulta ni entraba en la
precarga. Sin ella, el informe que se enseña en la reunión de cierre sale **sin
membrete**: un documento anónimo, en el único momento en que el entregable se mira
delante de quien lo paga.

Es una fila, pesa nada y se comparte con todo lo imprimible que venga después
(F06·B2 lista ocho entregables más). ⚠️ Tenía que ir **en el mismo commit que la
plantilla**: dejado para después, el informe funciona perfecto en la laptop del
desarrollador y sale sin membrete en la planta — que es el modo de fallo que este
proyecto lleva documentado desde la Fase 01.

⚠️ Y como el informe se arma en memoria sobre datos ya bajados, **no lleva
`useEffect` ni estado propio**: las mismas reglas del offline que el resto
(regla 1 y 2). Lo que se calcula —conteos, agrupaciones, porcentajes— es una
función pura sobre esos arreglos, del mismo estilo que
`src/lib/tablero/calculos.ts`.

---

## 6 · Impresión

- Sin dependencias: la plantilla es HTML propio con estilos en línea, como el
  resto del proyecto (regla 10).
- **Colores literales**, no `var(--…)`. §3.4.
- `@media print`: márgenes de la hoja, y **`break-inside: avoid`** en cada
  hallazgo y en cada gráfico — un hallazgo partido entre dos páginas se lee como
  dos hallazgos.
- Encabezado y pie repetidos por página. En HTML eso se consigue con
  `position: fixed` dentro de `@media print`, o con `thead`/`tfoot` de una tabla
  envolvente si hiciera falta más control.
- ⚠️ **`window.print()` no colisiona con el armazón fijo** (regla 4): la ventana
  de impresión es del navegador. Pero si el informe se muestra en pantalla antes
  de imprimir, ese contenedor sí necesita `minHeight: 0` para poder scrollear
  dentro del armazón (regla 4c).
- ⚠️ **En el teléfono, imprimir es «compartir».** Un auditor en una planta no
  tiene impresora: lo que hace es enseñar la pantalla y mandar el PDF por
  WhatsApp. La plantilla tiene que leerse bien **en vertical y en una pantalla de
  teléfono**, no sólo en A4.
