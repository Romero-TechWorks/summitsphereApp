# 07 · Asistente y automatización

Este documento aterriza los **Módulos A, B y C** de
`../../Automatización/Master_TechnicalInstructions.md` en trabajo ejecutable
dentro de SummitApp.

| Módulo original | Dónde vive aquí |
|---|---|
| **A** — Orquestación MS y generación de presentables | **Fase 08** (Graph) + **F07·T7** (OpenXML) |
| **B** — Documentación editable y economía de tokens | **Fase 07**, tandas T2, T3 y T7 |
| **C** — Auditoría asíncrona y gamificación | **F07·T6** (evaluación) + **Fase 08** B3, B4 y B5 |

---

## §0 · Las tres reglas que no se negocian

Antes de cualquier detalle técnico. Summit vende credibilidad ante organismos
certificadores; un asistente mal encuadrado la destruye más rápido de lo que la
construye.

### 1. Propone, no escribe

**Ninguna escritura del asistente llega a la base sin una pantalla de confirmación
tipada.** El camino es siempre el mismo:

```
entrada → interpretación → PROPUESTA (Zod) → confirmación humana
        → offlineWrite → traza
```

Un hallazgo firmado por un modelo y no por un auditor no vale nada ante un
organismo certificador. Y una acción correctiva inventada en el expediente de un
cliente es un incidente comercial, no un bug.

### 2. Cita siempre

Toda afirmación normativa del asistente sale con **norma, cláusula y documento**.
Sin cita, no se muestra. Lo que venga de la web va marcado explícitamente como
**sin verificar**.

### 3. Todo deja traza

`asistente_trazas` guarda entrada, destino, propuesta, si se confirmó, qué se
corrigió, tokens y latencia. Es lo que permite auditar al asistente — que es lo
mínimo que se le puede pedir a la herramienta de una firma de auditoría.

---

## §1 · Sobre la filosofía "zero-dependency" del plan original

El plan de automatización prohíbe explícitamente `microsoft-graph-client`,
`python-docx`, `docx.js`, Express, LangChain, LlamaIndex y bases vectoriales
externas. **Esa directiva se respeta, y conviene decir exactamente dónde aplica**
para que nadie la lea como "no uses Next.js".

| Lo que el plan prohíbe | Cómo se cumple aquí |
|---|---|
| SDK de Microsoft Graph | `fetch` nativo contra los endpoints REST. Un wrapper propio de ~150 líneas en `lib/graph/` |
| Framework de servidor (Express, Nest) | **No hace falta ninguno**: las API routes de Next.js *son* el servidor. No se añade una segunda capa |
| Librerías de documentos (`docx.js`, `pandoc`) | Manipulación directa de strings OpenXML + `zlib` nativo de Node. `lib/documentos/openxml.ts` |
| LangChain / LlamaIndex | Nada. El RAG son tres funciones: trocear, embeber, recuperar |
| Base vectorial externa (Pinecone) | **`pgvector` dentro del Supabase que ya existe.** Ver §3.2 |

**Una desviación consciente del plan original, y su porqué:**

El Módulo B pide *"motor vectorial en memoria: cargar la matriz completa de
vectores ISO en RAM al iniciar el servicio"*. Eso supone un daemon de larga vida.
**Vercel corre funciones sin estado**: no hay proceso que "inicie el servicio" y
mantenga la matriz caliente entre peticiones. Cargar cientos de vectores en cada
invocación cuesta más que la búsqueda misma.

Por eso los vectores viven en **`pgvector`, dentro del Postgres que ya se paga**,
y la similitud del coseno la calcula el índice. Se cumple el espíritu de la
directiva —cero dependencias externas, cero servicios de terceros, la matemática
en la infraestructura que ya existe— sin pelear contra el modelo de ejecución de
la plataforma.

⚠️ **La función `similitudCoseno()` en TypeScript puro sí se escribe igual**, y se
usa en el borde: para reordenar un puñado de candidatos ya recuperados y para
poder buscar en la biblioteca **sin señal**, sobre lo que está en la caché local.
Ahí sí es la herramienta correcta.

---

## §2 · Módulo B — Documentación y economía de tokens

### §2.1 · La *Token Diet*

Cada cláusula lleva, además de su resumen legible, una forma **condensada
clave-valor**:

```
[ISO9001|8.5.1|Ctrl_Produccion|Req:Info_Documentada,Monitoreo,Competencia,Validacion]
[ISO45001|6.1.2|Identif_Peligros|Req:Proceso_Continuo,Participacion_Trabajadores]
[NOM035|5.1|Politica_Riesgo_Psicosocial|Req:Difusion,Compromiso_Direccion]
```

Vive en `norma_clausulas.condensada` y la genera un script de preprocesamiento
revisado por un consultor — **no un modelo sin supervisión**: es el criterio
técnico de la firma comprimido.

**Objetivo del plan original: −85% de tokens de entrada.** Se mide en
`asistente_trazas.tokens_entrada` y se reporta en la pestaña de trazas.

### §2.2 · Recuperación

```
pregunta del consultor
   │
   ├─▶ embedding (text-embedding-004)  ─▶ pgvector  ─┐
   │                                                  ├─▶ RRF ─▶ 8 cláusulas
   └─▶ tsquery por prefijo              ─▶ GIN      ─┘
                                                        │
                    prompt = instrucción
                           + contexto del cliente
                           + 8 cláusulas CONDENSADAS
                                                        │
                                                        ▼
                                            respuesta CON CITA
```

⚠️ **El troceado es por cláusula, no por número de caracteres.** La unidad de una
norma es la cláusula; una cita partida a la mitad no sirve como evidencia ante un
auditor. Es el detalle que separa un RAG que funciona en una demo de uno que
funciona en una auditoría.

⚠️ **Reindexar cada vez que se corrija el texto de un documento.** Si no, la
búsqueda sigue citando el párrafo viejo. Es tarea del dueño `H05` y ya mordió en
el proyecto hermano.

### §2.3 · Generación de documentos → `.docx` nativo `[F07·T7]`

```
JSON de contexto (cliente, proceso, cláusula condensada)
   │
   ▼
LLM ──▶ Markdown ESTRICTO (sólo #, ##, *, **, >)  — sin HTML anidado
   │
   ├──▶ commit a GitHub (PUT /repos/{owner}/{repo}/contents/{path}, Base64)
   │       ⚠️ ANTES de liberar el .docx. Trazabilidad primero.
   │
   ▼
mdAOpenXML()  — parser propio de RegEx
   │
   ▼
inyección en word/document.xml de plantilla_summit.docx
   │
   ▼
zlib.deflateRaw ──▶ .docx válido
```

**El diccionario del transpilador** (`lib/documentos/transpilador.ts`):

| Markdown | OpenXML |
|---|---|
| `# Título` | `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>…</w:t></w:r></w:p>` |
| `## Título` | igual con `Heading2` |
| `* viñeta` | `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr>…</w:numPr></w:pPr>…` |
| `**negrita**` | `<w:r><w:rPr><w:b/></w:rPr><w:t>…</w:t></w:r>` |
| `> cita` | `<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr>…` |
| texto normal | `<w:p><w:r><w:t xml:space="preserve">…</w:t></w:r></w:p>` |

⚠️ **Escapar `&`, `<` y `>` antes de inyectar.** Un procedimiento que diga
*"presión < 5 bar"* rompe el XML y Word abre el archivo diciendo *"contenido
ilegible"* — con un mensaje que no menciona ni el ampersand ni el menor-que.

⚠️ **Los nombres de estilo de la plantilla tienen que coincidir** con los que
escribe el parser (`Heading1`, `Heading2`, `ListParagraph`, `Quote`). Si la
plantilla de Summit los tiene en español o renombrados, el `.docx` sale válido y
**sin formato** — el fallo más silencioso de todo el módulo. Tarea del dueño
`H03`.

---

## §3 · Módulo C — Auditoría multimodal y gamificación

### §3.1 · Evaluación de evidencia `[F07·T6]`

```
foto o PDF de un registro firmado
   │
   ▼
Storage → buffer en memoria → Base64
   │
   ▼
Gemini multimodal
   prompt = [Cláusula / requisito] + [Evidencia] + [Salida esperada]
   │
   ▼
{"status": "PASS" | "FAIL", "motivo": "…", "clausula": "8.5.1"}
   │
   ├─ PASS ─▶ PROPONE marcar el requisito como `evidenciado`
   └─ FAIL ─▶ PROPONE un hallazgo con su cláusula y su descripción
                        │
                        ▼
              pantalla de confirmación  ← §0 regla 1
```

⚠️ **Procesamiento efímero.** El archivo va de Storage a memoria y a la API, y se
libera. No toca disco. Un PDF de 40 MB de un estudio de ruido no debe poder tumbar
la función.

⚠️ **`FAIL` no significa "no conformidad".** Significa *"el modelo no encontró en
este archivo lo que la cláusula pide"*. Puede ser que la evidencia esté mal, o que
esté en otro archivo, o que el modelo no leyó bien un sello escaneado torcido. Por
eso propone y no escribe. La interfaz dice **"posible hallazgo"**, nunca
"no conformidad detectada".

### §3.2 · Motor de gamificación — Salud del SGC `[F08·B4]`

Matemática pura, sin motor de reglas. Puntaje **0–1000** por proceso y por
organización.

**Decaimiento** — una obligación vencida pierde valor con el tiempo:

```ts
const LAMBDA = Math.LN2 / 30   // a 30 días de retraso se pierde la mitad

export function calcularDecaimiento(puntaje: number, diasVencido: number): number {
  if (diasVencido <= 0) return puntaje
  const nuevo = puntaje * Math.exp(-LAMBDA * diasVencido)
  return Math.max(0, Math.min(1000, nuevo))
}
```

**Recompensa** — la evidencia que entra a tiempo suma, con rendimiento
decreciente al acercarse al techo:

```ts
export function otorgarPuntos(puntaje: number, complejidad: number): number {
  const base = 25 * Math.max(1, Math.min(5, complejidad))
  const margen = (1000 - puntaje) / 1000          // cuesta más subir arriba
  return Math.max(0, Math.min(1000, puntaje + base * margen))
}
```

**Salud del SGC** = promedio ponderado de los procesos, con peso por criticidad de
la cláusula. Se recalcula en el barrido nocturno colgado del cron diario
(⚠️ el plan Hobby de Vercel da **dos** crons y están ocupados).

**Cómo se pinta:** barras nativas y números absolutos. **Sin librerías de
gráficas.** Es un número que se mira tres segundos, no un tablero de BI.

⚠️ **La fórmula final y sus pesos los define la firma, no el código.** Es criterio
técnico: qué tan grave es un retraso de 15 días en un registro de calibración
frente a uno en un simulacro de evacuación no lo decide un programador. Tarea del
dueño `I03`. Lo de arriba es el andamio, con los parámetros afuera.

⚠️ **Cuidado con el efecto perverso.** Un puntaje visible que baja solo incentiva
a cerrar acciones por cerrarlas. Por eso la eficacia se **verifica** (Fase 04) y
la verificación es lo que suma, no el cierre.

---

## §4 · Módulo A — Puente con Microsoft `[Fase 08]`

### §4.1 · Autenticación y suscripciones

Registro **Daemon** en Azure Entra ID, flujo `client_credentials` contra
`login.microsoftonline.com`, token en caché hasta su expiración (menos un margen
de 5 minutos).

Permisos de aplicación: `OnlineMeetings.Read.All`, `Tasks.ReadWrite`,
`Calendars.ReadWrite`, `Mail.ReadWrite`, `Mail.Send`.

```
POST /api/graph/webhook
  ?validationToken=…   ──▶ responde el token EN TEXTO PLANO, 200, sin JSON
                            (si respondes JSON, Microsoft rechaza la suscripción)

POST /api/graph/webhook
  body: { value: [{ resource, clientState, … }] }
                       ──▶ valida clientState  ⚠️ si no coincide, se descarta
                       ──▶ 202 INMEDIATO      ⚠️ Graph reintenta si tardas
                       ──▶ el trabajo real, después
```

⚠️ **Las suscripciones expiran en menos de 72 horas.** La renovación se cuelga del
cron diario existente. Una suscripción caída no da error: **simplemente dejan de
llegar notificaciones**, y eso se nota días después. La app muestra en
`/admin?tab=config` cuándo expira cada una.

### §4.2 · De la reunión a las tareas

```
fin de reunión en Teams
   │  webhook
   ▼
GET transcripción → limpieza de metadatos
   │
   ▼
Gemini con instrucción estricta:
   "Devuelve ÚNICAMENTE JSON. Sin ```json. Sin texto antes ni después."
   [{"tarea", "responsable", "deadline": ISO8601, "norma", "clausula"}]
   │
   ▼
LOTE PROPUESTO  ← el consultor revisa y corrige
   │
   ├──▶ acciones en SummitApp (offlineWrite)
   └──▶ POST a Graph: /todo/lists · /planner/tasks · /events
```

⚠️ **El lote se confirma antes de inyectarse.** Una transcripción mal entendida
metiendo citas falsas en la agenda del director de planta de un cliente es un
incidente comercial. La regla §0.1 aplica aquí con más fuerza, no con menos,
porque el destino es un sistema ajeno.

⚠️ **Parsear la respuesta con tolerancia.** Aunque el prompt lo prohíba, los
modelos a veces envuelven el JSON en ```` ```json ````. El parser quita la valla
antes de intentar. Un `JSON.parse` desnudo aquí falla en producción tarde o
temprano.

**Objetivo del plan original: < 45 segundos** desde el fin de la reunión hasta que
el lote está listo para revisar.

### §4.3 · Buzón de evidencia `[F08·B3]`

Webhook sobre `auditoria@summit-sphere.com`, notificaciones `created` en Inbox.

```
correo entrante
   │
   ▼
asunto contiene el folio  →  #ACC-105
   │  ⚠️ sin folio: no se adivina. Se responde pidiendo el folio.
   ▼
GET /messages/{id}/attachments → buffer → Base64
   │
   ▼
evaluación multimodal (§3.1)
   │
   ├─ PASS ─▶ suma puntos · marca evidenciado · responde al cliente
   └─ FAIL ─▶ penaliza · redacta la no conformidad
              · PROPONE cita de revisión en el calendario
```

⚠️ **El correo saliente y la cita en el calendario de un cliente requieren
confirmación de un consultor, por defecto.** Existe un **modo desatendido** y se
enciende **por organización**, cuando ese cliente lo acuerda por escrito — no de
fábrica. Un correo automático diciéndole "no conformidad" al director de una
planta sin que nadie lo haya leído es la clase de error que cuesta una cuenta.

**Objetivo del plan original: < 2 minutos** por evidencia.

---

## §5 · La oficina `/asistente`

Seis pestañas. **Abre por el chat a propósito**: el 🤖 tiene que aterrizar en
"¿en qué te ayudo?", no en una pantalla que exige elegir un informe antes de
enseñar nada.

| Pestaña | Qué hace |
|---|---|
| **Chat** | Pregunta por texto o por voz. Lee los siete dominios; escribe con confirmación |
| **Informes** | Estado del sistema de un cliente · desempeño de auditorías del periodo · rentabilidad de un proyecto. Se releen sin regenerar |
| **Biblioteca** | PDFs convertidos a markdown consultable sin señal. Conversión por lotes reanudable |
| **Memoria** | Lo que la firma le enseñó. Editable |
| **Instrucciones** | Cómo debe comportarse. **Sólo el socio** |
| **Trazas** | Todo lo que hizo, qué se confirmó y qué se corrigió. Con el consumo de tokens |

⚠️ **Esta oficina no usa tarjetas** — como el resto de la app desde F01·B0.
Ver [`05_SISTEMA_DE_DISENO.md`](05_SISTEMA_DE_DISENO.md) §4.3.

### Herramientas del chat

**De lectura** (todas filtradas por el rol y las organizaciones de quien
pregunta): proyectos, requisitos, documentos, auditorías, hallazgos, acciones,
obligaciones, capacitaciones, indicadores, riesgos, más los resolutores de id
(organización, proyecto, contacto, cláusula).

**De escritura** (cada una con su pantalla de confirmación): hallazgo, acción,
tarea, documento, obligación, sesión de capacitación.

⚠️ **La lectura de las herramientas se declara filtrada por rol en el propio
esquema de la herramienta**, no en el prompt. Un modelo al que se le *pide* que no
mire los datos de otra organización, los mira. Uno cuya consulta lleva el filtro
en el SQL, no puede.

---

## §6 · Métricas de éxito

Las del plan original, con dónde se miden:

| Métrica | Objetivo | Dónde |
|---|---|---|
| Latencia de inyección de tareas (Módulo A) | < 45 s | `graph_eventos.latencia_ms` |
| Latencia de evaluación de evidencia (Módulo C) | < 2 min | `evaluaciones_evidencia.latencia_ms` |
| Reducción de tokens de entrada (Módulo B) | ≥ 85 % | `asistente_trazas`, pestaña Trazas |
| Tasa de parseo de JSON exitoso | 100 % | `asistente_trazas.parseo_ok` |
| Ensamblaje de un `.docx` | < 15 s y < 50 MB de RAM | Traza de la generación |
| Trazabilidad documental | 100 % commiteado antes de liberar | `asistente_trazas.commit_sha` |

Y una métrica propia que el plan original no tiene, y que importa más que todas:

| Métrica | Objetivo | Por qué |
|---|---|---|
| **Tasa de corrección humana** | Se **mide**, no se minimiza | Si el consultor confirma el 100% sin corregir nada, o el asistente es perfecto o **nadie está leyendo**. Lo segundo es mucho más probable, y es el riesgo real del módulo |
