# Decisiones del dueño · 22 sep 2026

> Tomadas al revisar la quinta tanda y la sección Fase 05 de
> [`DOCUMENTOS_POR_PEDIR`](DOCUMENTOS_POR_PEDIR.md). **Seis decisiones y dos
> hechos nuevos.** Manda este documento sobre lo que digan las fichas anteriores.

---

## 1 · ⚠️ LAS BIBLIOTECAS LAS CONSTRUYE EL USUARIO, NO SE PIDEN

**La decisión más importante de la tanda, y cambia lo que hay que construir.**

> «Es una consultoría de auditorías **emergente**. Para ir rápido buscan normas ya
> "procesadas". Hay que dejar que la biblioteca la vayan construyendo **ellos
> mismos, de manera orgánica, y con sus propias palabras**.»

### Por qué manda sobre el plan

`docs/02` y `docs/09` plantearon `F01` («entregar el catálogo de NOMs») y `F02`
(«entregar el catálogo de cursos») como **entregas de un archivo**, igual que
`C01` con las cláusulas ISO. Y `DOCUMENTOS_POR_PEDIR` los marcó **⛔
imprescindibles**.

**Estaba mal encuadrado, por tres razones:**

1. **Un catálogo completo es una biblioteca entera.** Las NOM-STPS vigentes son
   decenas, más SEMARNAT y Protección Civil. Pedirlas todas de golpe es pedirle a
   una firma emergente que escriba un año de trabajo antes de usar la app.
2. ⚠️ **Y se vuelve obsoleto.** Una NOM se actualiza —la NOM-035 cambió, la
   NOM-037 es de 2023— y un catálogo sembrado en una migración se queda viejo.
   **Es exactamente el motivo por el que el catálogo de normas ISO se sube y no
   se siembra** (`F01·B2b`): «lo que permite corregir un resumen sin una
   migración».
3. **El valor está en las palabras de Summit, no en el texto oficial.** Igual que
   con las cláusulas ISO: el resumen es el criterio técnico de la firma, y es la
   defensa el día que un cliente discuta un hallazgo.

### Qué se construye en su lugar

**`noms` y `nom_requisitos` nacen VACÍAS y se llenan desde la app**, exactamente
como `normas` y `norma_clausulas`:

| Regla | Igual que |
|---|---|
| Nacen vacías; no hay `INSERT` de siembra | `normas` (regla 12) |
| Se cargan **desde la pantalla**, no por migración | Importador de `/sistemas` |
| **Alta, edición y baja** a voluntad del socio | — ⚠️ **nuevo**: el importador de normas hoy no edita, sólo importa |
| Lo que desaparece **se marca `activa = false`**, nunca se borra | `norma_clausulas` |
| **Idempotente**: subir el mismo archivo corregido no duplica, actualiza | Importador de normas |
| El resumen y la evidencia esperada son **de Summit** | `norma_clausulas.resumen` |
| ⚠️ **Se puede versionar**: una NOM actualizada no crea otra, actualiza la que hay y deja rastro | ⚠️ **nuevo** — ver §1.1 |

⚠️ **Lo mismo para `cursos`.** Decisión idéntica del dueño: *«que el usuario sea
capaz de añadir los cursos que está trabajando e implementando y poco a poco ir
teniendo su biblioteca»*. `cursos` nace vacía y se captura desde la pantalla.
No hace falta importador de archivo: un curso son seis campos, se dan de alta a
mano.

### 1.1 · ⚠️ Lo que esto SÍ obliga a resolver, y el plan no tenía

**Una norma se actualiza, y eso no es lo mismo que corregir un resumen.** La
NOM-035-STPS-2018 sustituyó a criterios anteriores; la NOM-037-STPS-2023 es
nueva. Si la app deja editar libremente:

- ⚠️ **Un hallazgo levantado contra la versión vieja sigue citando lo que decía
  entonces.** Es el mismo problema que `hallazgos` ↔ `norma_clausulas`, ya
  resuelto ahí con `activa = false` en vez de borrar. Aquí aplica igual: **una
  NOM que cambia de año es una NOM NUEVA** (`NOM-035-STPS-2018` es su clave
  completa, con año), y la anterior se marca inactiva. **No se reescribe.**
- ✅ **Eso ya está decidido en `docs/04`**: `noms.clave` es `NOM-035-STPS-2018`,
  **con el año dentro**. La decisión de diseño estaba tomada sin saber que iba a
  sostener esto.

### 1.2 · Qué se le pide entonces a Summit

Nada obligatorio. Lo que conviene es **arrancar con las que ya tienen
procesadas** —las ocho del levantamiento STPS, que vienen con su texto de
obligación redactado— y dejar que la biblioteca crezca con cada cliente.

## 2 · El control de vencimientos NO tiene clave, y tiene TRES dueños

Pregunta del dueño: *«¿El Control de Vencimientos tiene algún nombre clave, como
los documentos anteriores?»*

**No.** Busqué en los dos catálogos completos (105 documentos de ATELIER + 164 de
César Roel) y **no existe un formato llamado "Control de Vencimientos"**. Lo que
hay es **el mismo patrón repetido en tres sitios, con tres nombres distintos**:

| Dónde | Qué vence | Cadencia de aviso |
|---|---|---|
| **`SGI-P-TI-01` §5.17.3** · Licencias de software | Licencia, con fabricante, serial, fecha de adquisición y **vencimiento** | ⚠️ **«alertas a 90, 60 y 30 días de anticipación»** |
| **`SGI-P-AH-01`** y **`SGI-P-CP-01`** · Poderes notariales | La **vigencia legal** del testimonio notarial; monitoreo periódico y renovación con el cliente | Sin cadencia escrita |
| `F-MT-01` / `SGI-F-MT-01` Programa de Mantenimiento Preventivo | Mantenimientos con vigencia | Parrilla anual |

**Tres cosas que esto resuelve:**

1. ✅ **Confirma que `obligaciones` tiene que ser GENÉRICA.** Si el modelo se
   hubiera atado a NOMs, un poder notarial y una licencia de software —que vencen
   igual y duelen igual— no habrían cabido. El CHECK de `tipo` necesita al menos
   `licencia_software` y `poder_notarial` además de los del plan.
2. ⚠️ **La cadencia de aviso del cliente es 90/60/30, no 90/30/7.** `docs/02` y
   `docs/06` dicen «90, 30 y 7 días». El único documento que lo tabula dice
   **90, 60 y 30**. **Gana el formato sobre la prosa del plan** — es el
   precedente de `D06` (la hoja de cálculo del `F-SG-09` contra el texto de
   `P-SG-03`). Pero 7 días es un último aviso razonable de Summit: la propuesta
   es **90 / 60 / 30 / 7**, con las tres primeras justificadas por el cliente.
3. **Sigue faltando lo que se pidió**: el archivo real con el que Summit lleva
   los vencimientos **de un cliente de cumplimiento** (estudios, dictámenes,
   licencias ambientales, extintores, exámenes médicos) y **cada cuánto vence
   cada cosa**. Los tres de arriba son del cliente, no de Summit, y ninguno
   cubre SST.

## 3 · ✅ Queja y denuncia se separan

> «Sí, separa quejas de denuncias. Bien pensado.»

**Hueco 37 deja de ser pregunta y pasa a decisión.** `denuncias` es una tabla
propia, y **no es `quejas` con un booleano**, por una razón de seguridad:

| | `quejas` | `denuncias` |
|---|---|---|
| Quién la ve | Todo el que tiene la `org_id` asignada | ⚠️ **Sólo el receptor designado y la Dirección** |
| RLS | `org_id IN (SELECT mis_organizaciones())` | ⚠️ **Además, por persona** — el jefe del denunciado no la ve |
| Anonimato | El quejoso se identifica | ⚠️ **Anónima o confidencial** |
| Represalias | — | ⚠️ **Protección explícita** (37001 8.9 / 37301 8.3) |
| Origen | Cliente | Personal y **terceros** |

⚠️ **Y esto rompe la regla 1 de la manera correcta.** `push_suscripciones` ya es
«la única tabla sin `org_id`» porque cuelga de la persona. `denuncias` **sí lleva
`org_id`** —es de una organización— pero su política **no basta con la `org_id`**:
necesita una segunda condición por persona, como la de `push_suscripciones`. Es
el segundo caso del proyecto, y hay que escribirlo con cuidado: una denuncia
visible para el denunciado es peor que no tener el módulo.

⚠️ **Sin `PanelQuejas` compartido.** La pantalla de quejas de `/acciones` no se
reusa: un panel que muestre las dos cosas acaba enseñando una denuncia a quien no
debe. Es pantalla aparte y con su propio permiso.

## 4 · ✅ El informe de avance lo genera la app

> «El Informe de Avance se generará con la información de la aplicación (es el
> objetivo de la automatización de sus procesos), y sus conclusiones y puntos
> finales ya depende de ellos.»

**Confirma [`informes_de_avance.md`](informes_de_avance.md) y cierra sus
preguntas 1 y 2.** El reparto queda:

| Sección | Quién |
|---|---|
| Membrete · cabecera · objetivo · información general | **La app** |
| **Tabla de actividades** (`% hecho · vencimiento · estado · notas`) | **La app**, desde `tareas_etapa` |
| A&D / desafíos · Próximos pasos | **La app**, desde `acciones` |
| Tabla de estado documental (los conteos) | **La app** |
| **Conclusiones y recomendaciones** | **Las escribe el consultor** |

⚠️ **Consecuencia directa: el hueco 35 sube de prioridad y ya no es cosmético.**
`tareas_etapa` es booleana —hecha o no— y el informe que la firma **cobra**
necesita `% hecho`, `fecha de vencimiento`, `estado` y `notas` por actividad. Son
tres columnas y un CHECK, aditivos. Y `proyectos` necesita `objetivo`.

✅ **Y `conclusiones` es una columna de texto**, no un archivo: se escribe en la
app y se imprime con lo demás. Un `informes` por proyecto, con su fecha de corte.

## 5 · ✅ Continuidad es un SERVICIO, y eso abre algo más grande

> «La Continuidad es un Servicio Aparte que se vende. Tener un apartado de
> **Servicios Extras** que se ofrecen y **en qué clientes están activos** es una
> excelente idea.»

⚠️ **Esto es mejor que lo que yo recomendé.** En
[`SGI-P-CA-09_continuidad.md`](SGI-P-CA-09_continuidad.md) §6 dije «no abrirlo
como fase, es un interruptor muerto con un solo cliente». Con esto deja de serlo:
**no es un dominio, es una línea de servicio**, y la firma vende varias.

### Lo que hay que construir, y no está en ninguna fase

**`servicios`** — el catálogo de lo que Summit vende, de la firma (sin `org_id`):
implantación de SGC, auditoría interna, cumplimiento normativo, capacitación,
**continuidad del negocio**, protección de datos, compliance/antisoborno.

**`org_servicios`** — qué cliente tiene cuál **activo**, desde cuándo, con qué
alcance y quién lo lleva.

**Tres cosas que esto resuelve de golpe:**

1. ✅ **Es el interruptor que la regla 11 pedía.** Un módulo de continuidad no se
   pinta para todos: se pinta **para los clientes que lo contrataron**. Mismo
   mecanismo que `MODULOS_APAGADOS_POR_DEFECTO`, pero **por cliente** en vez de
   por instalación.
2. ✅ **Da la respuesta comercial que `/admin` de la Fase 06 necesitaba**:
   «¿qué le vendemos a quién?» y «¿qué cliente no tiene contratado X?» es el
   embudo, no un reporte.
3. ✅ **Y explica el encuadre de la Fase 05.** Cumplimiento y capacitación son
   **dos servicios distintos**, no dos bloques de una fase: hay clientes con
   cumplimiento y sin capacitación. `F05·B1+B2` y `F05·B3` se encienden por
   separado.

⚠️ **Dónde NO ponerlo**: no es `proyectos`. Un proyecto es un trabajo con fechas
y etapas; un servicio contratado es una **capacidad activa** que puede tener cero,
uno o varios proyectos debajo. **Hueco 39.**

## 6 · ⚠️ Datos de trabajadores: advertencia al cargar, y nada más por ahora

> «Sobre los Datos de los Trabajadores lo vemos en su momento, pero deja una
> advertencia al respecto cuando se carguen documentos de ese tipo.»

**Decisión: no se modela retención ni supresión todavía. Se avisa.**

Lo que hay que construir cuando se toque la pantalla de subida de documentos y
de adjuntos:

- Una **advertencia visible** al subir, no un texto legal escondido: *«Este
  expediente puede contener datos personales de trabajadores. Súbelo sólo si el
  cliente lo autorizó y no incluyas datos de salud si puedes evitarlo.»*
- ⚠️ **Redactada en español llano y corta.** Una advertencia larga no se lee, y
  una que no se lee es peor que ninguna porque da falsa cobertura.
- **No bloquea.** Es un aviso, no un permiso: el consultor sabe lo que sube.
- Se anota en `docs/08` como **deuda declarada**, con su motivo, para que la
  próxima persona no crea que se olvidó.

✅ **Y donde ya existe media respuesta**: el bucket `evidencias` es privado y
cada archivo se abre con liga firmada al momento. Eso no es retención, pero sí es
lo que impide que un expediente circule por un enlace.

⚠️ **Lo que queda explícitamente pendiente** (no es un olvido, es una decisión):
plazo de conservación por tipo de documento, supresión al vencer con acta,
notificación de vulneración en 72 h, y si SummitApp entra al alcance de
privacidad de Summit como **encargado**. Ver
[`SGI-P-COM-10_privacidad_y_arco.md`](SGI-P-COM-10_privacidad_y_arco.md) §6.

## 7 · Dos hechos nuevos

### 7.1 · ⚠️ La migración de avisos SE APLICÓ (~15 sep 2026)

`20260909120000_avisos_y_notificaciones.sql` lleva una semana en producción, así
que **las diecisiete están aplicadas y no queda ninguna pendiente**. La Fase 04
está cerrada.

**Consecuencia:** el CHECK de `notificaciones.categoria` está en producción con
trece valores, y **el hueco 29 —las cuatro categorías multinorma— ya cuesta una
migración**. Se avisó a tiempo y no se alcanzó; es aditivo y no urge, así que
**va dentro de la primera migración de la Fase 05**, no en una propia.

### 7.2 · El `SGI-F-RH-06` llegó en `.docx` y el dueño tiene razón

Se puede leer, y **no aporta casi nada**: `PUESTO · NOMBRE · PROCESO · FECHA ·
CALIFICACIÓN` y nueve renglones `1.- / R=`.

Lo poco que sí aporta, y conviene anotar:

- ⚠️ **Las preguntas son abiertas, no de opción múltiple.** La app **no puede
  calificar**: `asistentes.calificacion` es un número **que captura el
  instructor**, no un resultado calculado. Eso descarta construir un motor de
  exámenes.
- **El examen se identifica por PROCESO, no por curso.** Encaja con `SGI-P-RH-01`
  §5.4: la capacitación interna es sobre los documentos de un proceso.
- ✅ El umbral **≥ 80 %** sigue viniendo del procedimiento, no del formato.
