# P-SG-04 · Riesgos y Oportunidades  (+ F-SG-21 · F-SG-22 · F-SG-23 · F-OP-14)

> Transcripción del `.docx` y los cuatro formatos (cuarta tanda, 7 sep 2026).
> Versión 0.
>
> ⚠️ **Es de la Fase 02, no de la 04** — `procesos`, `riesgos` e `indicadores` se
> construyeron en `F02·B4` (22 ago 2026) **sin este procedimiento a la vista**.
> Trae la metodología completa y **tres escalas de evaluación distintas** que hay
> que contrastar contra lo que ya está en la base.

---

## 1 · ⚠️ Tres metodologías de riesgo, no una

El cliente evalúa riesgos de **tres formas distintas según el objeto**, y las tres
están especificadas:

| Objeto | Formato | Escala | Cálculo | Rango |
|---|---|---|---|---|
| **Proceso** (por etapa) | `F-SG-23` | A / M / B | **tabla de consulta, NO producto** | 1–9 |
| **Contexto** (FODA) | `F-SG-21` | 1–4 | probabilidad **×** severidad | 1–16 |
| **Parte interesada** | `F-SG-22` | A / M / B | sin cruce, evaluación directa | A/M/B |
| **Seguridad en obra** | `F-OP-14` | 1–3 | **(A+B+C+D) × severidad** | 4–36 |

**Ninguna es «probabilidad × severidad» a secas.** Modelar una sola columna
`nivel_riesgo` calculada con un producto rompe tres de las cuatro.

---

## 2 · La tabla de riesgo de proceso — y por qué NO es una multiplicación

`F-SG-23` · hoja «Criterios de Evaluación», y `P-SG-04` §5.1.2.1:

```
                        SEVERIDAD / BENEFICIO
                     BAJO    MEDIO    ALTO
   PROB.  ALTO    │    4   │   8   │   9   │
          MEDIO   │    3   │   6   │   7   │
          BAJO    │    1   │   2   │   5   │
```

| Rango | Clasificación | Tratamiento |
|---|---|---|
| **1 – 4** | Sin Riesgo / Oportunidad | Control operacional **(opcional)** |
| **5 – 8** | Riesgo / Oportunidad **Tolerable** | Control operacional |
| **9** | Riesgo **No Tolerable** / **Gran Oportunidad** | **Plan de Acciones** |

⚠️ **Alto×Bajo = 4 y Bajo×Alto = 5.** No es simétrica y no es un producto: es un
**lookup**. Una fórmula la desmiente en las esquinas, que es justo donde se decide
si hace falta un plan de acción.

✅ **Es el mismo precedente que zanjó `D06`**, y hay que aplicarlo igual:

> «Cuando un formato de trabajo y la prosa del procedimiento discrepen, gana el
> formato.» — CLAUDE.md, 31 ago 2026

Aquí **no discrepan** —§5.1.2.1 reproduce la misma tabla— pero la forma es la
misma: **columna generada con un `CASE`, no con una multiplicación**, y va en un
CHECK. `case` sobre enteros es IMMUTABLE (ver `D06`), así que es seguro.

---

## 3 · La escala del contexto — ésta SÍ es un producto

`F-SG-21` · hoja «CRITERIOS», y `P-SG-04` §5.2.1. Probabilidad 1-4 × Severidad
1-4 → 1-16, con cinco bandas y **estrategia asignada por banda**:

| Nivel | Estrategia para gestión de riesgos |
|---|---|
| Emergencias / Gran Oportunidad | Cambios o inclusión de procesos/infraestructura (**realizar plan de acción**) |
| Alto riesgo / Oportunidad Alta | Control mediante **modificación en proceso y/o infraestructura** |
| Medio riesgo | Control mediante **procedimientos** |
| Bajo riesgo | **Capacitación y conciencia** |
| Riesgo no significativo | **No necesaria** |

⚠️ **La estrategia se DERIVA del nivel.** No es texto libre: es un catálogo de
cinco valores que la pantalla propone. Igual que `CRITERIO_HALLAZGO`.

**Y el FODA es la unidad de captura**: `F-SG-21` tiene cuatro hojas —FORTALEZAS,
DEBILIDADES, OPORTUNIDADES, AMENAZAS— con columnas `TIPO` (Infraestructura,
Tecnológico, Cultural, Económico, Desempeño, Valores, Medio Ambiente, Gobierno,
Cambio Climático), descripción, probabilidad, severidad, nivel, responsable,
estrategia, acciones, proceso, **¿es efectivo?**, resultado de la eficacia y
responsable de verificación.

---

## 4 · ⚠️ `etapa` — la columna que falta y que pide TRES formatos

`P-SG-04` §5.1.1: «listando cada una de las **etapas** que se realizan en su
proceso o servicio… se procede a identificar qué riesgos se generan **en cada
etapa**».

| Formato | Columna |
|---|---|
| `F-SG-23` | `Etapa` — primera columna de la matriz |
| `F-SG-14` | `ETAPA DEL SERVICIO` |
| `P-SG-05` §5.1 | la tabla de nueve **etapas** donde nace una NC |

Hoy `procesos` no tiene etapas. **Una tabla `proceso_etapas` (`proceso_id`,
`nombre`, `orden`) sirve a los tres**, y `riesgos.etapa_id` deja de ser texto
libre. Es hueco de Fase 02, no de la 04.

---

## 5 · Verificación de eficacia — está en TODOS los formatos de riesgo

`F-SG-21`, `F-SG-22` y `F-SG-23` cierran con las mismas tres columnas:

`¿Es eficaz?` · `Resultado de la eficacia de las acciones` · `Responsable de
verificación`

✅ **Es la misma tripleta de `acciones.eficacia_*`.** Confirma que la verificación
de eficacia no es exclusiva de las acciones correctivas: **es transversal al SGC
entero**. Si se modela una vez en `acciones` y los riesgos cuelgan acciones de
ahí, no hace falta duplicarla.

---

## 6 · F-OP-14 · Matriz IPERC — el puente a la Fase 05

Es **seguridad y salud en el trabajo**, no calidad. `P-SG-04` §5.4 trae la
metodología completa:

**Nivel del Índice de Probabilidad (NIP) = A + B + C + D**, cada índice de 1 a 3:

| Índice | A · Personas expuestas | B · Procedimiento | C · Capacitación | D · Exposición al riesgo |
|---|---|---|---|---|
| 1 | de 1 a 3 | Existen, satisfactorios y permanentes | Capacitado, conoce y previene | Esporádica, ≥1 vez al año |
| 2 | de 4 a 12 | Existen parcialmente, no satisfactorios | Parcialmente capacitado, no controla | Eventual, ≥1 vez al mes |
| 3 | más de 12 | No existen | No entrenado, no conoce, no controla | Permanente, ≥1 vez al día |

**Severidad**: 1 lesión sin incapacidad · 2 incapacidad temporal · 3 incapacidad
permanente.

**Nivel de Riesgo = NIP × Severidad** → 4 a 36:

| Nivel | Rango | Control |
|---|---|---|
| **Riesgo Extremo (RE)** | 21 – 36 | **No se debe comenzar ni continuar el trabajo** hasta reducirlo; si no se puede, se prohíbe |
| **Riesgo Alto (RA)** | 11 – 20 | Esfuerzos e inversión, con periodo determinado |
| **Riesgo Tolerable (RT)** | 5 – 10 | No mejora obligatoria; comprobaciones periódicas |
| **Riesgo Mínimo (RM)** | 1 – 4 | Sin acción |

**Jerarquía de controles**, cinco columnas en la matriz y en ese orden:
**Eliminación · Sustitución · Control de Ingeniería · Control Administrativo · EPP**.

⚠️ **Y la matriz guarda la evaluación DOS VECES: antes y después del control.**
Las columnas `AE`–`AQ` repiten A, B, C, D, NIP, severidad, riesgo y nivel bajo el
encabezado «EVALUACIÓN DE RIESGOS DESPUÉS DEL CONTROL». Es el **riesgo residual**,
y sin él no se puede demostrar que el control sirvió. Otras columnas propias:
`LUGAR`, `PUESTO DE TRABAJO`, `TIPO DE TAREA` (rutinaria / no rutinaria),
`PELIGRO`, `TIPO DE PELIGRO` (Físico · Mecánico · Eléctrico · Químico · Biológico
· Ergonómico · Psicosocial), `RIESGO`, **`REQUISITO LEGAL`**,
`FECHA DE VERIFICACIÓN DE LA EFECTIVIDAD`.

✅ **`REQUISITO LEGAL` por renglón de peligro es exactamente `F05·B1`**: la matriz
de aplicabilidad NOM enganchada al peligro que la motiva. La Fase 05 tiene aquí su
formato de referencia, y viene con **un ejemplo lleno** (movimiento de tierras,
atropellos, NIP 7 × severidad 2 = 14 = RA, y tras el control 4 = RM).

⚠️ **Errata del cliente:** `P-OP-01` §5.1 cita «F-SG-14 Matriz IPERC». Es
`F-OP-14`; `F-SG-14` es Control de Servicio No Conforme.
