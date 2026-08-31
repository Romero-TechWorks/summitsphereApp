# F-SG-09 · Programa Anual de Auditorías Internas

> Transcripción del `.xlsx` que entregó Summit (31 ago 2026). Versión vigente 0,
> emitido el 10-Feb-2025, actualizado el 12-Feb-2025. Dos hojas: *Año* y
> *Control de Cambios*.
>
> **Lo emite el Coordinador del SGC** (P-SG-03 §5.2) y es lo que decide **cuántas
> veces se audita cada proceso el año siguiente**. Para nosotros cierra el
> **hueco 5** del [índice](README.md): `programa_auditorias` existe desde F03·B1
> pero no tiene renglón por proceso.
>
> ⚠️ **Este archivo trae las fórmulas, y las fórmulas mandan.** Ver §3.
>
> ✅ **Construido el 31 ago 2026** (F03·B6a·B6b·B6c): `programa_auditorias.alcance`
> y `programa_procesos` en `20260831120000_programa_anual_por_proceso.sql`, la
> parrilla en `?programa=<id>` y la impresión en
> `src/lib/plantillas/programaAnual.ts`.

---

## 1 · Encabezado y bloque superior

El logo va anclado arriba a la izquierda; el título y el código del formato están
en la banda de las filas 1–4, que en la plantilla que llegó viene **en blanco**
salvo por la fecha:

```
[logo]                                    Fecha de Actualización: 12-Feb-2025
```

Igual que en F-SG-11 y F-SG-12: identidad de la firma desde `config_firma`
(`razon_social`, `logotipo_url`), y el código `F-SG-09` con su versión desde una
constante del código.

Debajo, el año y los tres textos de encuadre:

| Celda | Campo | Ejemplo real del archivo | De dónde sale |
|---|---|---|---|
| `A7` | **Año** | `2025` | `programa_auditorias.anio` ✅ |
| `A9`/`B9` | **CRITERIOS** | «Norma ISO 9001:2015, así como los procedimientos, políticas, indicadores y formatos establecidos en el SGC.» | `programa_auditorias.criterios` ✅ |
| `A10`/`B10` | **ALCANCE** | «Todo el personal de GRUPO ATELIER, compuesto por ATELIER TEA, MODULOR y PETRA.» | ❌ **`programa_auditorias.alcance` NO EXISTE** — hueco 10 |
| `A11`/`B11` | **OBJETIVO** | «Evaluar el grado el cumplimiento contra lo establecido en el SGC.» | `programa_auditorias.objetivo` ✅ |

⚠️ **Hueco 10 — `alcance` falta en `programa_auditorias`, y es el mismo error que
`D05` arregló en `auditorias`.** Los tres textos van juntos en el papel y sólo dos
están en la tabla. No se puede rellenar con el de la auditoría: el programa se
escribe **antes** de que exista ninguna auditoría del año, y su alcance es el de
la organización entera («todo el personal del grupo»), no el de una visita. Es una
columna `text` nullable — aditiva, sin riesgo para lo que ya está en producción.

## 2 · La tabla de valores — la leyenda del formato

Antes de la parrilla, el formato imprime su propia leyenda. **Es parte del
documento, no una nota al margen:** es lo que le explica al cliente por qué su
proceso se audita dos veces.

```
VALORES                          Puntos    No. de auditorias
  2  Procesos del Servicio        > 5              2
  1  Procesos de Soporte         <= 5              1
```

Y al lado, el valor asignado a cada proceso de Grupo Atelier — que es el ejemplo,
no un catálogo nuestro:

| Proceso | Valor | | Proceso | Valor | | Proceso | Valor |
|---|:-:|---|---|:-:|---|---|:-:|
| Comercial | 2 | | Diseño | 2 | | Facturación | 1 |
| Administración | 1 | | Compras | 1 | | Mantenimiento | 1 |
| Recursos Humanos | 1 | | Transporte y Almacén | 1 | | SGC | 1 |
| Operación | 2 | | Contaduría | 1 | | | |

⚠️ **El valor NO se deriva de `procesos.tipo`, se guarda.** Nuestro enum es
`estrategico · operativo · soporte` y el del formato es «del servicio» vs «de
soporte» — parecidos, pero no lo mismo: en el ejemplo, Compras y Transporte y
Almacén valen 1 aunque en muchos SGC serían operativos, y SGC vale 1 aunque sea
el proceso que gobierna todo. **«Procesos del servicio» es un juicio de la firma
sobre ese cliente**, no una propiedad del proceso.

Lo razonable: `procesos.tipo = 'operativo'` **propone** 2 y el resto propone 1, y
la pantalla deja cambiarlo. Igual que `CRITERIO_HALLAZGO` propone y el auditor
decide.

## 3 · La parrilla — y la regla de frecuencia

Encabezado de la fila 21:

```
NC evento anterior | Puntos | PROCESOS | AUDITORIAS ANUALES | ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC
```

Una fila por proceso (11 en el ejemplo), y al pie `A33 = SUM(A22:A32)`: el total
de no conformidades del evento anterior.

**Las fórmulas del archivo, literales:**

```
B22 = G15 * A22            →  Puntos = valor_del_proceso × NC_del_evento_anterior
D22 = IF(B22<=5, 1, 2)     →  Auditorías del año = 1 si Puntos ≤ 5, si no 2
```

### ⚠️ 3.1 · La hoja contradice al procedimiento, y **gana la hoja**

P-SG-03 §5.2 dice, con estas palabras:

> «valor del proceso × número de NC documentadas en la auditoría anterior
> = **cantidad de auditorías** que ese proceso requiere el año siguiente»

Eso **no es lo que hace el archivo**. En el archivo el producto son *puntos*, y
las auditorías salen de un umbral en 5. La diferencia no es cosmética: un proceso
de servicio (valor 2) con 4 NC daría **8 auditorías** por el texto y **2** por la
hoja.

**Decisión del dueño (31 ago 2026): manda la hoja.** Es el artefacto que la firma
usa de verdad; el texto del procedimiento está mal redactado. Se codifica el
umbral y **el resultado nunca pasa de 2**.

⚠️ **Y esto es un CHECK, no una validación de pantalla.** Un `auditorias_requeridas`
de 8 en la base sería la prosa del procedimiento colándose por una captura manual.

### 3.2 · `nc_previas` se puede calcular, y por eso hay que dejar cambiarlo

Nosotros tenemos algo que el Excel no: los hallazgos del año pasado. El número de
NC de un proceso es

```
hallazgos donde  tipo in ('nc_mayor','nc_menor')
                 and proceso_id = <proceso>
                 and estado <> 'anulado'
                 and la auditoría cuelga del programa del año anterior
```

Un botón *«traer del año anterior»* que llene la columna es de las cosas que
justifican que esto viva en la app y no en una hoja. Pero **la columna se guarda,
no se deriva**, por tres razones que pasan el primer año de uso:

1. El primer programa de un cliente no tiene año anterior y hay que teclear el
   número que traía en su Excel.
2. Una NC puede venir de fuera de una auditoría interna —una queja, un incidente—
   y ésas hoy no existen en `hallazgos` (ver `fuente_nc`, hueco 6).
3. El programa se **aprueba** y queda como evidencia: si el número se recalculara
   solo, anular un hallazgo en noviembre reescribiría un programa que la Dirección
   firmó en enero.

### 3.3 · Los meses — el calendario, no una tabla hija

Las doce columnas `ENE…DIC` se marcan con color, y el pie del formato trae la
leyenda:

```
■ Externa      ■ Interna
```

Es decir: cada marca dice **en qué mes** y **de qué modalidad** es la auditoría
planeada.

⚠️ **Va en una columna del renglón, no en una tabla hija**, y es por la regla de
`§6.1` de `CLAUDE.md`: una tabla `(programa_proceso_id, mes)` necesitaría un índice
único que no es la clave primaria, y ahí la cola offline resuelve los `upsert` por
la PK — el segundo cambio sin señal llegaría con otro `id` y chocaría media hora
después, sin nadie mirando. Además el gesto real es tocar celdas de una parrilla:
con una tabla hija, marcar seis meses son seis operaciones en la cola; con una
columna, una.

```
meses jsonb not null default '[]'::jsonb
  -- [{ "mes": 3, "modalidad": "interna" }, { "mes": 9, "modalidad": "externa" }]
```

⚠️ Y **`modalidad` es del renglón del programa, no de `auditorias.tipo`.** Nuestro
`tipo` tiene cinco valores (`interna · preauditoria · seguimiento ·
certificacion_acompanamiento · proveedor`) y el formato sólo distingue interna de
externa: una auditoría de certificación y una de proveedor son las dos «externa»
en este papel. Se mapea al imprimir, no se guarda dos veces.

## 4 · La tabla que falta — `programa_procesos`

Lo que el README dejó anotado como especulación en el hueco 5, ya en firme:

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid FK NOT NULL | La hereda del programa, con trigger (regla 1) |
| `programa_id` | uuid FK NOT NULL | `on delete cascade` |
| `proceso_id` | uuid FK NOT NULL | `on delete restrict` — un programa aprobado es evidencia |
| `valor` | int NOT NULL CHECK `in (1,2)` | Se propone desde `procesos.tipo`, se guarda |
| `nc_previas` | int NOT NULL default 0 CHECK `>= 0` | §3.2 |
| `puntos` | int **generated stored** | `valor * nc_previas` |
| `auditorias_requeridas` | int **generated stored** | `case when valor*nc_previas <= 5 then 1 else 2 end` |
| `meses` | jsonb NOT NULL default `'[]'` | §3.3 |
| `orden` | int NOT NULL default 0 | El papel tiene un orden y el cliente lo reconoce |
| `nota` | text | «se aumentó por cambio de normatividad» — P-SG-03 §5.2 |

⚠️ **Las dos generadas son seguras**: multiplicación de enteros y un `case` sobre
enteros son IMMUTABLE. No es el caso de `fecha::text` (§Trampas heredadas), que
revienta con 42P17.

⚠️ **`unique (programa_id, proceso_id)`** — y por eso la pantalla elige `insert` o
`update` mirando la caché, **nunca `upsert`**. Misma regla que `requisitos` y
`mediciones`.

⚠️ **`nota` no es decorativa.** El procedimiento permite subir la frecuencia por
cuatro motivos que la fórmula no ve: cambios significativos al sistema, caída de
efectividad, cambio de normatividad, o búsqueda de mejora continua. Si un socio
sube el número a mano, el papel tiene que decir por qué — si no, el año siguiente
nadie sabe si fue criterio o un dedazo.

## 5 · La hoja *Control de Cambios*

Una tabla de Excel llamada `Table1` en `B2:D13`:

| Fecha | Edición | Cambio realizado |
|---|---|---|
| 10-Feb-2025 | 0 | Se da de alta el formato |

Es el control de versiones **del formato en blanco**, no del programa lleno — la
misma idea que `documento_versiones` de la Fase 02. **No se modela:** el código y
la versión del formato son una constante del código, igual que en F-SG-11 y
F-SG-12. Se transcribe para que quede claro que ya se miró y se descartó.

## 6 · Al imprimirlo

Es un entregable: la Dirección lo firma y el cliente lo archiva. Va a
`src/lib/plantillas/`, devuelve una cadena y no consulta — mismo contrato que
`informeAuditoria.ts`.

- Encabezado y pie idénticos a los del F-SG-12.
- **La leyenda de valores y el umbral se imprimen.** Son la justificación del
  número de auditorías y sin ellos el programa parece arbitrario.
- Las doce columnas de mes con su marca de color. ⚠️ La paleta va **en
  hexadecimal** dentro de `impresion.ts`: la ventana de impresión no hereda
  `globals.css` (docs/05 §6). Y el color solo no basta en blanco y negro — la
  marca lleva además una letra (`I` / `E`).
- Al pie, **Elaborado por** (Coordinador del SGC) y **Aprobado por** (Dirección).
  Salen de `programa_auditorias.aprobado_por_id` y de los contactos con papel
  `coordinador_sgc` y `representante_direccion`.
- Los dos gráficos del archivo original apuntan a `#REF!` — están rotos en la
  plantilla que llegó. **No se replican.** Si algún día hacen falta, son barras
  nativas como las del informe: sigue sin haber librería de gráficas, y por el
  mismo motivo.
