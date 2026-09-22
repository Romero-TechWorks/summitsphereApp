# Documentos que faltan por pedir al cliente

> Derivado el 7 sep 2026 de la **`F-SG-01` Lista Maestra de Documentos Internos y
> Externos**, que es el catálogo autoritativo del propio cliente.
>
> **105 documentos en el catálogo · 60 entregados · 45 faltan.** Ninguno de los
> entregados está fuera del catálogo, así que la carpeta es un subconjunto limpio
> y esta cuenta es exacta.
>
> ⚠️ **Ampliado el 15 sep y revisado el 22 sep 2026 con la
> [sección Fase 05](#fase-05--lo-que-hay-que-pedir-y-a-quién)**, que pide a **dos
> partes**: la mayor parte de lo que esa fase necesita **no está en el catálogo
> del cliente ni va a estarlo** — es de Summit. La **quinta tanda** (cliente 02)
> resolvió seis de las doce; quedan **cinco pendientes y seis preguntas**.

---

## Cómo leer esta lista

⚠️ **Pedir los 45 de golpe es correcto para archivarlos y equivocado para
priorizar.** La mayoría son formatos operativos de una constructora que
SummitApp **nunca va a modelar** (regla 11): hacen falta como *contenido* —para
que el expediente documental del cliente esté completo dentro de la app— pero no
especifican nada que haya que construir.

Los tres bloques van por lo que desbloquean, no por su código:

| Bloque | Qué son | Cuántos |
|---|---|---|
| **1 · Pedir ya** | Especifican algo que estamos construyendo o vamos a construir | **9** |
| **2 · Pedir junto** | Completan el mapa de una fase futura | **6** |
| **3 · Pedir en bloque** | El catálogo operativo. Contenido, no especificación | **30** |

**9 + 6 + 30 = 45.** Los tres bloques son una partición exacta de los faltantes:
verificado con `comm` contra la lista maestra, sin sobras ni repetidos.

---

## Bloque 1 · Pedir ya  (9 documentos)

### 1.1 · Proveedores — desbloquea Fase 04 y cierra una fuente de NC

| Código | Título | Por qué |
|---|---|---|
| **`P-CO-02`** | Procedimiento para Selección y Evaluación de Proveedores | ⚠️ **Es el único documento faltante que cita un procedimiento del SGC ya entregado** (`P-SG-06` §5.2). Respalda `fuente_nc = 'evaluacion_proveedor'` —un valor que ya está en la base sin documento detrás—, el **indicador 6** del `F-SG-19` y la **entrada 4g** de la Revisión por la Dirección |
| **`F-CO-02`** | Desempeño de Proveedores | El registro donde se evalúa. Lo citan `P-OP-02` y `P-OP-03` |
| **`F-CO-03`** | Listado de Proveedores | El padrón del que se elige. Lo citan `P-OP-01` y `P-OP-02` |

### 1.2 · Recursos Humanos — es la Fase 05·B3 entera

> ⚠️ **22 sep 2026: la serie `RH` llegó, pero del CLIENTE 02.** `SGI-P-RH-01`,
> `SGI-F-RH-03`, `-05`, `-06`, `-07` y ocho más. **Especifican la fase igual de
> bien**, así que estos seis bajan de prioridad: del cliente 01 ya sólo hacen
> falta para completar su expediente. ⚠️ **`F-RH-04` no llegó de ninguno de los
> dos.** [Ficha](SGI-P-RH-01_recursos_humanos.md)

| Código | Título | Por qué |
|---|---|---|
| **`P-RH-01`** | Procedimiento de Recursos Humanos y Competencia | ⚠️ **Cierra el hueco 11** (responsabilidad, autoridad y competencia del `F-SG-05`) y es el marco de `dnc`, `sesiones` y `asistentes` |
| **`F-RH-04`** | Programa de Capacitación | ⚠️ **Es literalmente `F05·B3`.** Y es el indicador 7 del `F-SG-19`, meta 90 % anual |
| **`F-RH-03`** | Descripción de Puesto | El perfil de puesto al que apunta el hueco 11. Citado por `F-SG-05`, `F-SG-21` y el manual |
| **`F-RH-06`** | Examen de Conocimientos | La calificación del asistente en `F05·B3` |
| **`F-RH-07`** | Listado de Datos y Documentación de Personal | El expediente de personal — lo que la constancia DC-3 necesita para salir llena |

### 1.3 · El que nadie había visto y es Fase 05

| Código | Título | Por qué |
|---|---|---|
> ⚠️ **22 sep 2026: `SGI-F-COM-18` del cliente 02 hace el mismo trabajo** y ya
> está analizada. La `F-CM-02` sigue siendo útil para contrastar, no para
> desbloquear. [Ficha](SGI-P-COM-02_obligaciones_de_compliance.md)

| **`F-CM-02`** | **Matriz de Requisitos Legales** | ⚠️ **Es `F05·B1` con otro nombre.** Es donde el cliente lleva su cumplimiento normativo, y el `F-SG-22` lo nombra como la **estrategia** frente a Gobierno para tres necesidades: obligaciones fiscales, prestaciones de ley y seguridad ocupacional, y regulaciones ambientales. Encaja con el `REQUISITO LEGAL` por peligro de la Matriz IPERC |

---

## Bloque 2 · Pedir junto  (6 documentos)

No bloquean nada hoy, pero completan una fase que ya está planeada.

| Código | Título | Para qué |
|---|---|---|
| `F-RH-01` | Organigrama ATELIER | Los puestos reales del cliente, que es lo que `contactos.puesto` y la pestaña Equipo capturan a mano hoy |
| `F-RH-02` | Solicitud de Personal | El alta de personal. El `F-SG-23` lo nombra como el registro que controla el riesgo «selección de candidatos inadecuados» |
| `F-RH-05` | Evaluación de Ambiente de Trabajo | ⚠️ Huele a **NOM-035-STPS** (factores de riesgo psicosocial). Si lo es, es Fase 05 y no un formato de RH |
| `P-MT-01` | Procedimiento de Mantenimiento | El marco de lo que vence y hay que renovar |
| `F-MT-01` | Programa de Mantenimiento Preventivo | ⚠️ **Es el patrón de `F05·B2`**: mantenimientos con vigencia. Citado por el manual y por el `F-SG-21` como control de un riesgo |
| `F-MT-02` | Control Interno de Vehículos | Verificaciones vehiculares con vencimiento — mismo patrón |

---

## Bloque 3 · Pedir en bloque  (30 documentos)

**Contenido, no especificación.** Van al expediente documental del cliente dentro
de la app (Fase 02) y hacen falta el día que Summit **audite** ese proceso — para
auditar un proceso hay que tener su procedimiento y sus formatos—. No se modelan.

**Administración (6)** — `P-AD-01` Planificación de Licitaciones y Concursos ·
`P-AD-02` Administración · `F-AD-01` Control de Archivo General · `F-AD-02`
Relación de Estimaciones · `F-AD-03` Resumen de Pago de las Obras Activas ·
`F-AD-04` Expediente Final

**Comercialización (2)** — `P-CM-01` Comercialización · `F-CM-01` Oferta Comercial

**Compras (3)** — `P-CO-01` Compras · `F-CO-01` Orden de Compra · `F-CO-04`
Solicitud de Pedido

**Contaduría (6)** — `P-CN-01` Contaduría · `F-CN-01` Solicitud de Pago ·
`F-CN-02` Solicitud de Reembolso · `F-CN-03` Control de Gastos · `F-CN-04`
Comprobación de Gastos · `F-CN-05` Nómina

**Transporte y Almacén (9)** — `P-AM-01` Transporte y Almacén · `F-AM-01` Control
de Inventario · `F-AM-02` Ingreso de Material a Almacén · `F-AM-03` Verificación
Vehicular de Salida · `F-AM-04` Guía de Despacho · `F-AM-05` Gestión de Material
no Conforme · `F-AM-06` Especificación de Vehículos · `F-AM-07` Movimiento de
Material · `F-AM-08` Devoluciones

**Diseño (2)** — `P-SD-01` Diseño · `F-SD-01` Alcances del Proyecto

**Facturación (2)** — `P-FA-01` Facturación · `F-FA-01` Generador de Pago por los
Servicios Ejecutados

⚠️ **`F-AM-05` merece un vistazo cuando llegue.** El catálogo lo titula «Gestión
de Material no Conforme», que **no es lo mismo** que el `F-SG-14` Control de
Servicio No Conforme. Si es un ciclo paralelo para materiales, puede que
`fuente_nc` necesite un valor más.

---

## Lo que NO es un documento por pedir, y hay que decirlo

### ⚠️ La Lista Maestra de Documentos **Externos** está vacía

La `F-SG-01` tiene una segunda hoja, «Externos», con sus ocho encabezados
—`Código · Título · Responsable · No. Versión · Fecha última revisión ·
Almacenamiento · No. de Copias · Proceso`— y **cero renglones**.

El `P-SG-01` §5.10 la exige: ahí van «normas, leyes, reglamentos, catálogos de
proveedores, documentos de clientes». Vacía significa que el cliente **no tiene
registrada ni la propia ISO 9001:2015** contra la que se certifica, ni una sola
NOM, ni un reglamento.

**No lo pidas como documento: es un hallazgo.** Es una no conformidad que Summit
le puede levantar a su cliente —fuente `informacion_documentada`, una de las nueve
etapas del `P-SG-05` §5.1— y es exactamente el trabajo que la firma vende.

### ⚠️ Cinco diagramas de flujo en blanco

`P-SG-02`, `P-SG-04`, `P-SG-05`, `P-SG-06` y `P-SG-07` tienen la sección
«Diagrama de flujo del proceso» y **la página está vacía en el `.docx` original**.
Si el cliente los tiene aparte, valen para la Fase 07; si no los tiene, es el
mismo caso que el anterior.

### ⚠️ Dos códigos que el propio catálogo se contradice

- **Diseño**: la `F-SG-01` dice `P-SD-01` / `F-SD-01`, la `F-SG-02` dice `P-DS-01`
  y la regla de codificación del `P-SG-01` §5.2 asigna **`DS`** a Diseño.
  **Pídelos por el título, no por el código**, o el cliente va a buscar el que no
  es.
- **`F-SG-15`** aparece en la lista maestra como «Desempeño de los Procesos del
  Sistema de Gestión de la Calidad» y el archivo entregado se llama
  `F-SG-15 Desempeño de los Procesos del SGC **(1)**.xlsx` — el `(1)` es de una
  descarga duplicada. **Confirma que es la versión vigente.**

---

## Texto listo para mandar

> Nos falta completar el expediente documental. Del catálogo de su `F-SG-01`
> (105 documentos) tenemos 60; les pedimos los 45 restantes.
>
> **Con prioridad**, porque son los que necesitamos para la siguiente etapa:
> `P-CO-02`, `F-CO-02` y `F-CO-03` (selección y evaluación de proveedores);
> `P-RH-01`, `F-RH-03`, `F-RH-04`, `F-RH-06` y `F-RH-07` (recursos humanos y
> capacitación); la **Matriz de Requisitos Legales** (`F-CM-02`); `F-RH-05`
> (evaluación de ambiente de trabajo); y `P-MT-01`, `F-MT-01` y `F-MT-02`
> (mantenimiento y vehículos).
>
> **Después**, el resto: las series `AD`, `AM`, `CM`, `CN`, `CO`, `FA` y `SD`
> completas, más `F-RH-01` y `F-RH-02`.
>
> Tres cosas más:
> 1. La segunda hoja de la `F-SG-01`, **Lista Maestra de Documentos Externos**,
>    está sin renglones. ¿Existe en otro archivo, o está pendiente de llenar?
> 2. Los procedimientos `P-SG-02`, `P-SG-04`, `P-SG-05`, `P-SG-06` y `P-SG-07`
>    tienen la sección de diagrama de flujo **en blanco**. ¿Los tienen aparte?
> 3. El procedimiento de Diseño aparece como `P-SD-01` en la lista maestra y como
>    `P-DS-01` en la distribución de copias. ¿Cuál es el vigente?

---

# Fase 05 · Lo que hay que pedir, y a quién

> Reescrito el 15 sep 2026 al arrancar la fase. **Se pide de más a propósito**:
> en las fases 03 y 04 cada formato que llegó corrigió algo ya construido, y aquí
> es más barato que sobre a que falte.

**La Fase 05 es el servicio de Summit, no el SGC del cliente.** ATELIER no tiene
ni una NOM ni un DC-3 en su `F-SG-01`, así que lo que hace falta lo tiene la
firma. Y la regla que va en el mensaje: **si algo no lo tienen, no lo hacen** —
lo diseñamos nosotros y ellos corrigen, como la plantilla de listas de
verificación. Lo que sí tengan, tal cual esté: un archivo lleno de un cliente
real vale más que una plantilla en blanco.

> ⚠️ **ACTUALIZADO EL 22 SEP 2026 CON LA QUINTA TANDA.** Llegaron 164 archivos de
> un **segundo cliente** y **seis de las doce cosas de abajo quedaron
> resueltas**. Lo tachado ya no se pide. Ver [cliente 02](cliente_02_cesar_roel.md).

## ✅ Lo que la quinta tanda resolvió

| # | Qué se pedía | Con qué llegó |
|---|---|---|
| **1b** | Cómo evalúan cada NOM | ✅ El **Levantamiento STPS**: ocho NOMs con su elemento verificable, el texto de la obligación y la condición de aplicabilidad. [Ficha](levantamiento_cumplimiento_STPS.md) |
| **1c** | Matriz de aplicabilidad llena | ✅ `SGI-F-COM-18`, con 18 obligaciones y nueve columnas. [Ficha](SGI-P-COM-02_obligaciones_de_compliance.md) |
| **1d** | Diagnóstico y semáforo | ✅ El mismo levantamiento: `Cumple / No cumple / Parcial` por elemento, con hallazgos y recomendaciones |
| **3e** | Lista de asistencia y examen | ✅ `SGI-F-CA-03` es la misma de auditoría; `SGI-F-RH-06` con **≥ 80 % aprobatorio**. ⚠️ El archivo del examen es `.doc` de Word 97 y **no se puede leer** — pedirlo en `.docx` o PDF |
| **3f** | Reporte tras un curso | ✅ Lo cubre el `Template Informe`. [Ficha](informes_de_avance.md) |
| **3d** | DNC / programa anual | ⚠️ **A medias.** `SGI-P-RH-01` §5.4 define el proceso y las cuatro columnas del programa, pero **el formato `F-RH-04` no vino** |

## ⚠️ Lo que sigue faltando — DOS cosas, y NINGUNA bloquea

> **Revisado el 22 sep 2026 tras las decisiones del dueño**, en
> [`DECISIONES_22_SEP_2026.md`](DECISIONES_22_SEP_2026.md). **Tres de las cinco
> dejaron de pedirse**: no porque llegaran, sino porque **se construyen en vez de
> pedirse**.

### ⚠️ NINGUNA DE LAS DOS BLOQUEA LA SIGUIENTE SESIÓN

> **Corregido el 22 sep 2026.** Aquí decía que el control de vencimientos
> «bloquea `F05·B2` entera». **Es falso, y era una inconsistencia**: la decisión
> de las bibliotecas orgánicas, aplicada hasta el final, también disuelve ésta.
> Se piden porque mejoran el arranque, no porque falte una pieza.

| # | Qué | Qué pasa sin ello |
|---|---|---|
| **2a·2b** | **El control de vencimientos de un cliente y las vigencias típicas** | ⚠️ **NO bloquea.** `obligacion_tipos` arranca vacío y el usuario captura «Estudio de ruido / 24 meses» la primera vez, como con las NOMs. **El costo es que la primera captura es más lenta**, no que falte modelo. Lo que sí aporta: los tipos que vencen **en la práctica real** y la vigencia de cada uno como valor propuesto. ⚠️ **No tiene clave de formato**: busqué en los 269 documentos de los dos catálogos y no existe — hay **tres instancias del mismo patrón** con tres nombres (licencias de software, poderes notariales, mantenimiento preventivo), todas del cliente y ninguna de SST. [Detalle](DECISIONES_22_SEP_2026.md#2--el-control-de-vencimientos-no-tiene-clave-y-tiene-tres-dueños) |
| **3b** | **¿Summit EMITE constancias DC-3 o sólo las recibe?** | ⚠️ **Bloquea UNA pantalla de `B3`, no `B1` ni `B2`.** Y el sí/no basta para avanzar: un **«no»** desbloquea del todo —no se construye el generador y la constancia es formato propio de Summit—; un **«sí»** se convierte en tres datos: el **número de registro** como agente capacitador, el **formato oficial vigente** y los dos **catálogos cerrados de la STPS** (área temática y ocupación) |

⚠️ **Y una limitación honesta sobre el DC-3**: el régimen del registro de agente
capacitador ha cambiado con los años. **No se construye contra el recuerdo de
nadie** — Summit hace esto profesionalmente y sabe cómo está hoy; por eso se
pregunta en vez de suponer.

✅ **Lo único que detenía la siguiente sesión eran las tres decisiones de diseño
—una tabla, área nullable, tipo editable— y el dueño ya las tomó** (22 sep 2026).
`B1` y `B2` se pueden escribir enteros hoy. Ver
[`../13_ESPECIFICACION_F05_B1_B2.md`](../13_ESPECIFICACION_F05_B1_B2.md).

### ✅ Lo que dejó de pedirse, y por qué

| # | Qué se pedía | Qué se hace en su lugar |
|---|---|---|
| **1a** | «La lista completa de NOMs» | ⚠️ **Se construye en la app, orgánicamente.** `noms` nace vacía y la llena el socio con sus palabras, como el catálogo ISO. Un catálogo completo es una biblioteca entera, y **se vuelve obsoleto**: la NOM-035 cambió y la NOM-037 es de 2023. Se arranca con **las ocho del levantamiento STPS**, que ya vienen procesadas |
| **3a** | «El catálogo de cursos» | **Igual**: `cursos` nace vacía y el usuario da de alta los que imparte. Son seis campos; ni siquiera hace falta importador |
| — | `SGI-F-RH-04` Programa de Capacitación | ⚠️ **Sigue sin llegar, pero ya no bloquea**: `SGI-P-RH-01` §5.4 define sus cuatro columnas (capacitación · fecha prevista · proceso que la requiere · tipo e instructor). Con eso se construye y se corrige después |
| — | `SGI-F-RH-06` Examen de Conocimientos | ✅ **Llegó en `.docx`** y confirma lo que el dueño anticipó: **no aporta casi nada**. Lo poco que sí: las preguntas son **abiertas**, así que la app **no califica** — la nota la captura el instructor |

⚠️ **Lo que esto cambia en `docs/09`:** las tareas `F01` y `F02` del dueño
**dejan de ser entregas de archivo** y pasan a ser *«dar de alta las primeras N
en la app»*. Sólo `F03` sigue siendo una entrega.

## Lo nuevo que hay que preguntar — **cuatro de seis ya contestadas**

| # | Pregunta | Estado |
|---|---|---|
| **N1** | ⚠️ **¿De dónde salieron los PDF de `Normas/`?** Texto íntegro de las cuatro ISO, y el de 27001 con marcas de un sitio pirata en sus metadatos | ⛔ **Abierta, y es la que más urge.** Regla 12. No entran al repositorio ni a la base |
| **N2** | ¿El **Anexo A de ISO 27001** (93 controles) se carga como una norma más? | ⛔ Abierta. [Ficha](serie_CA_multinorma.md) §4 |
| **N3** | ¿La línea ética / canal de denuncias entra al producto? | ✅ **SÍ, y separada de `quejas`.** Es tabla propia con RLS **por persona**, no sólo por `org_id`. [Decisión](DECISIONES_22_SEP_2026.md#3--queja-y-denuncia-se-separan) |
| **N4** | ¿El informe de avance lo genera la app? | ✅ **La app genera todo menos las conclusiones**, que escribe el consultor. [Decisión](DECISIONES_22_SEP_2026.md#4--el-informe-de-avance-lo-genera-la-app) |
| **N5** | ¿Continuidad es un servicio que se vende? | ✅ **Sí, y abre algo mayor**: un catálogo de **servicios extra** con qué cliente tiene cuál activo. [Decisión](DECISIONES_22_SEP_2026.md#5--continuidad-es-un-servicio-y-eso-abre-algo-más-grande) |
| **N6** | ¿SummitApp entra al alcance de privacidad de Summit? | ✅ **Se ve en su momento.** Por ahora, **advertencia al subir documentos** con datos de trabajadores, y la deuda queda declarada en `docs/08`. [Decisión](DECISIONES_22_SEP_2026.md#6--datos-de-trabajadores-advertencia-al-cargar-y-nada-más-por-ahora) |

## A Summit — las doce originales, para referencia

| # | Qué | Alimenta | Si no lo tienen |
|---|---|---|---|
| **1a** | **Lista de NOMs** con las que trabajan (STPS, SEMARNAT, Protección Civil). Sólo nombres | `noms` | ⛔ **Imprescindible.** No se puede inventar |
| **1b** | Por cada NOM, **cómo la evalúan**: puntos que revisan, evidencia que piden, a partir de qué condición aplica (trabajadores, giro, actividad) | `nom_requisitos` | Con **1a** basta: las NOMs se publican en el DOF y son públicas —no tienen la licencia de las ISO—, redactamos el borrador y corrigen por pasadas, como `C01` |
| 1c | **Matriz de aplicabilidad** de un cliente, llena | `org_noms` | Se propone |
| 1d | **Diagnóstico** punto por punto de un cliente y el **semáforo** que presentan | `org_nom_requisitos` | Se propone |
| 2a | **Control de vencimientos** de un cliente: estudios, dictámenes, licencias, extintores, exámenes médicos, Protección Civil | `obligaciones` | Se propone |
| 2b | **Cada cuánto vence** cada tipo | `vigencia_meses` | Se saca de cada NOM y validan. ⚠️ Preguntar si alguna depende del resultado anterior: entonces no es un default por tipo |
| **3a** | **Catálogo de cursos**: nombre, horas, temario, modalidad, NOM a la que responde | `cursos` | ⛔ **Imprescindible** (`F02`) |
| **3b** | **Número de registro ante la STPS** como agente capacitador externo (el oficio) | DC-3 | ⛔ **Imprescindible.** Va impreso en cada constancia |
| 3c | **Un DC-3 ya emitido** por la firma, y las **áreas temáticas** y **ocupaciones** del catálogo STPS que usan | DC-3 | El formato oficial es público: se descarga de la STPS. Sólo se confirma que es el que usan |
| 3d | **DNC** / programa anual de capacitación de un cliente | `dnc` | Se propone |
| 3e | **Lista de asistencia** de un curso y el **examen**, con la calificación mínima | `sesiones` · `asistentes` | `F-SG-03` ya sirve de lista; el examen se propone |
| 3f | **Reporte** que entregan después de un curso | salida de `sesiones` | Se propone |

⚠️ **Lo que el DC-3 pide del cliente y hoy no capturamos en ninguna tabla**: RFC,
representante legal y representante de los trabajadores —además de CURP y
ocupación del asistente—. Va a `organizaciones` o a `sitios`; se decide con la
respuesta a la pregunta 3 del mensaje, **antes** de la migración de `B3`.

**Ya tenemos y sirve:** la Matriz IPERC (`F-OP-14` + `P-SG-04` §5.4, con requisito
legal por peligro) para `B1`; `F-SG-03` como lista de asistencia; y `F-SG-22`,
que nombra la `F-CM-02` como estrategia frente a Gobierno.

## Del cliente — nada nuevo

Los diez que tocan a la fase **ya van dentro de los 45** y ya están en prioridad
en el texto de arriba: `F-CM-02` (la matriz de requisitos legales del cliente),
`P-RH-01`, `F-RH-03`, `F-RH-04`, `F-RH-05`, `F-RH-06`, `F-RH-07`, `P-MT-01`,
`F-MT-01` y `F-MT-02`. **Sólo sirven para contrastar** lo que Summit diga contra
un cliente real; ninguno especifica la fase.

## Mensaje listo para WhatsApp — seguimiento tras la quinta tanda

> Reescrito el 22 sep 2026: quedan **dos peticiones y dos preguntas**, no doce.

```text
Hola. Ya revisamos a fondo los 164 archivos de César Roel. Está muy completo y nos resolvió casi todo lo que les había pedido para la Fase 05.

Cambiamos el enfoque en una cosa importante, y creo que les va a gustar más:

*NO les vamos a pedir el catálogo de NOMs ni el de cursos.* Pensándolo bien, pedirles que escriban toda la biblioteca de golpe es pedirles un año de trabajo antes de poder usar la app, y en un año la mitad estaría desactualizada. En vez de eso, la app va a dejar que ustedes vayan *dando de alta, editando y dando de baja* las normas y los cursos que están trabajando, con sus propias palabras, igual que ya funciona con las cláusulas ISO. La biblioteca se va formando sola con cada cliente, y cuando salga una NOM nueva o se actualice una, la corrigen ustedes sin que nosotros toquemos nada.

Para arrancar usamos las 8 NOMs que ya vienen procesadas en el levantamiento de César Roel (001, 002, 019, 025, 026, 030, 035 y 037).

*LO QUE SÍ NECESITO* (sólo dos cosas)

1. El *control de vencimientos* que llevan de un cliente de cumplimiento: estudios (ruido, iluminación, térmicas, psicosocial), dictámenes, licencias, recargas de extintores, exámenes médicos... y *cada cuánto vence cada cosa*. Busqué en los dos catálogos completos y no existe un formato con ese nombre; lo más parecido son el control de licencias de software y el de poderes notariales de César Roel, que son del cliente y no cubren seguridad e higiene. Si lo llevan en un Excel suyo, ese Excel es justo lo que necesito.

Detalle de ahí mismo: el procedimiento de TI de César Roel avisa a *90, 60 y 30 días* antes del vencimiento. Nuestro plan decía 90, 30 y 7. ¿Nos vamos con 90/60/30 y dejamos el de 7 días como último recordatorio?

2. Su *número de registro ante la STPS como agente capacitador*. Esto es lo único que sigue completamente bloqueado: en César Roel ustedes le *piden* el DC-3 al proveedor de la capacitación. Necesito saber si Summit además los *emite*. Si no son agente capacitador registrado, la app no debería generar constancias DC-3 y eso cambia lo que construimos.

*DOS PREGUNTAS*

1. ⚠️ Los PDF de la carpeta "Normas" son el *texto completo* de las ISO 9001, 27001, 37001 y 37301, y el de la 27001 trae dentro el nombre de un sitio de descargas piratas. No los vamos a subir a la app ni al repositorio: las ISO son obra protegida y la app sólo guarda la estructura de cláusulas con el resumen de ustedes. ¿De dónde salieron y tienen licencia de ellas?

2. El Anexo A de la 27001 son 93 controles y es contra lo que se audita un sistema de seguridad de la información. ¿Los cargamos como una norma más en la app, para que la Declaración de Aplicabilidad funcione igual que la matriz de requisitos?

*LO QUE YA QUEDÓ DECIDIDO* (por si se les ofrece revisarlo)

· Las denuncias se separan de las quejas, con permisos propios: el jefe del denunciado no debe poder verlas.
· El informe de avance lo genera la app con sus datos; las conclusiones las escriben ustedes.
· Continuidad del negocio se maneja como servicio extra, con un apartado de qué cliente tiene contratado qué.
· El formato del examen de conocimientos ya lo abrimos: efectivamente no aporta mucho, pero nos sirvió para saber que las preguntas son abiertas y la calificación la captura el instructor.

*UNA OBSERVACIÓN QUE LES SIRVE*

En el Informe General aparece que los 16 hallazgos del levantamiento STPS llevan *catorce meses sin plan de atención aprobado*, porque los tres informes previos nunca se revisaron. Eso es exactamente lo que la app evita: cada hallazgo con responsable y fecha, aviso al teléfono cuando se acerca el vencimiento, y el cliente viéndolo en su portal en vez de en un correo. Vale la pena usarlo como primer caso real cuando esté la Fase 05.
```

---

## Anexo · El mensaje original al cliente 01 (7 sep 2026)


Va en formato de WhatsApp (`*negritas*` con asteriscos), para pegar tal cual.

```text
Hola. Para arrancar la Fase 05 (cumplimiento de NOMs y capacitación) necesito material de Summit, no del cliente: esta fase es el servicio de ustedes, y en el SGC de Atelier no hay nada de esto.

Una regla para todo lo de abajo: *si algo no lo tienen, no lo hagan*. Me dicen "no tenemos" y nosotros lo diseñamos y ustedes lo corrigen. Lo que sí tengan, mándenlo *tal cual está*: el archivo de un cliente real, aunque sea Excel o Word y aunque esté a medias. Sirve más un archivo lleno que una plantilla en blanco.

*1. CUMPLIMIENTO NOM* (lo más urgente)

1a. La *lista de NOMs* con las que trabajan: STPS, SEMARNAT y Protección Civil. Sólo el nombre de cada una.

1b. Por cada NOM, *cómo la evalúan*: qué puntos revisan, qué evidencia piden en cada punto, y a partir de qué condición aplica (número de trabajadores, giro, actividad). Si esto está en su cabeza y no en un archivo, no pasa nada: con la lista de 1a nosotros redactamos un borrador desde el texto oficial de cada NOM y ustedes lo corrigen.

1c. La *matriz de aplicabilidad* de un cliente, llena: la que dice qué NOMs le aplican y por qué.

1d. El *diagnóstico de cumplimiento* de un cliente (punto por punto) y el *semáforo* o resumen que le presentan al director.

*2. VENCIMIENTOS*

2a. El *control de vencimientos* que llevan de un cliente: estudios (ruido, iluminación, térmicas, psicosocial…), dictámenes (eléctrico, estructural), licencias, extintores, exámenes médicos, Protección Civil.

2b. *Cada cuánto vence* cada tipo de estudio o trámite. Si alguno depende del resultado anterior y no de una periodicidad fija, díganme cuál.

*3. CAPACITACIÓN*

3a. El *catálogo de cursos*: nombre, horas, temario, modalidad, y a qué NOM responde cada uno.

3b. Su *número de registro ante la STPS* como agente capacitador externo (el oficio, si lo tienen a la mano). Esto es imprescindible: va impreso en cada constancia.

3c. *Una constancia DC-3 ya emitida* por ustedes, y las áreas temáticas y ocupaciones del catálogo de la STPS que suelen usar.

3d. El *DNC* o programa anual de capacitación que entregan a un cliente.

3e. La *lista de asistencia* de un curso y el *examen*, con la calificación mínima para aprobar.

3f. El *reporte* que entregan después de un curso, si lo hay.

*4. TRES PREGUNTAS*

1. ¿Emiten también el DC-2 (plan de capacitación) y el DC-4 (lista de constancias), o sólo el DC-3?
2. ¿La matriz de aplicabilidad la hacen por empresa o por planta?
3. Para el DC-3: el RFC, el representante legal y el representante de los trabajadores del cliente, ¿los tienen guardados en algún lado o los piden cada vez?

Lo imprescindible es *1a, 3a y 3b*: sin eso no puedo empezar. Todo lo demás, si lo tienen, mejor; si no, lo hacemos nosotros.
```
