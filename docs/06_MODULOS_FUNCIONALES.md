# 06 · Módulos funcionales

Cómo se usa la app, en el lenguaje de la firma. Para el detalle técnico ver
[`03_ARQUITECTURA.md`](03_ARQUITECTURA.md); para las tablas,
[`04_MODELO_DE_DATOS.md`](04_MODELO_DE_DATOS.md).

Cada módulo indica **`[Fase NN]`**: si no lo encuentras en el código, mira su fase
antes de reportarlo como faltante.

---

## Navegación

**Siete dominios**, cada uno una página con pestañas:

| Dominio | Ruta | Pestañas |
|---|---|---|
| **Cartera** | `/cartera` | Organizaciones · Proyectos · Contactos |
| **Sistemas** | `/sistemas` | Documentos · Requisitos · Procesos · Riesgos · Indicadores |
| **Auditorías** | `/auditorias` | Programa · Auditorías · Hallazgos |
| **Cumplimiento** | `/cumplimiento` | Matriz NOM · Obligaciones · Dictámenes |
| **Capacitación** | `/capacitacion` | Cursos · Programa · Sesiones · Constancias |
| **Acciones** | `/acciones` | Abiertas · Por verificar · Cerradas |
| **Admin** | `/admin` | Metas · Finanzas · Facturación · Usuarios · Bitácora · Configuración |

En **escritorio** los siete están en el Sidebar. En **móvil** la BottomNav tiene
**cinco destinos** —Inicio, Auditorías, Acciones, Cumplimiento, Cartera— y el
resto se alcanza desde el buscador global y el menú del header. El 🤖 del
asistente y el buscador viven en la Navbar, no en la barra inferior.

---

## Inicio — el tablero `[Fase 00 · widgets por fase]`

Widgets reordenables, con preferencias por usuario. Cada rol abre viendo lo suyo:

| Rol | Lo primero que ve |
|---|---|
| **Socio** | Embudo de proyectos por etapa · rentabilidad del mes · carga del equipo · vencimientos críticos de toda la cartera |
| **Consultor** | Sus proyectos · acciones que vencen esta semana · documentos esperando su aprobación · próxima visita |
| **Auditor** | Sus auditorías programadas · hallazgos que levantó y siguen abiertos · lo que está esperando señal para subir |
| **Administración** | Facturas por emitir · cobranza vencida · contratos por renovar |

⚠️ Los widgets de facturación y cobranza **no están en el catálogo todavía**:
pertenecen al módulo `facturacion`, que viene apagado de fábrica y se enciende en
`/admin?tab=config` [Fase 06]. Hasta entonces, administración abre con
*Contratos por renovar* y *Esperando señal*.

**«Esperando señal»** es el widget que sí tiene datos desde la Fase 00: enseña lo
que se guardó sin conexión y todavía no ha subido. Lo ven los cinco roles.

---

## Cartera `[Fase 01]`

### Organizaciones
El expediente del cliente. Datos fiscales, giro, tamaño, sus **sitios** (una
organización puede tener cinco plantas), sus **contactos** con su papel, y el
histórico de todo lo que la firma le ha hecho.

⚠️ **El sitio es una entidad, no una línea de dirección.** El alcance de un
certificado puede cubrir la planta de Toluca y no la de Lerma, y una NOM aplica o
no según el número de trabajadores **de ese sitio**.

### Proyectos
El contrato. Su tipo (implementación, auditoría, capacitación, cumplimiento,
automatización, soporte IT), sus normas, sus sitios en alcance, su líder, sus
fechas, su monto — y su **etapa**, que es una de las seis de la metodología de
Summit:

```
1 Diagnóstico → 2 Planificación → 3 Documentación y capacitación
              → 4 Implementación y seguimiento → 5 Auditoría interna
              → 6 Certificación y soporte
```

El tablero de la firma **es** este embudo. Mover un proyecto de etapa queda en la
bitácora del proyecto con fecha y responsable — lo escribe la base, no la app.

Dónde se abre: dentro del expediente del cliente, pestaña **Proyectos**. El
detalle vive en la misma pantalla (`?proyecto=<id>`), con su avance de etapas y
su alcance —normas × sitios— en dos grupos de casillas que guardan al momento.
`/cartera?tab=proyectos` enseña los de toda la cartera, con filtros por estado y
por etapa.

### Tareas por etapa `[Fase 01]`
Dentro de un proyecto, **una lista desplegable por cada una de las seis etapas**
con lo que la metodología de Summit manda hacer ahí. Se marcan conforme se
cumplen, cada etapa enseña su avance (`4/7`) y se pinta en verde cuando lo
obligatorio está hecho.

Las tareas salen de una **plantilla por tipo de proyecto** —la metodología no se
re-teclea en cada cliente— y después se editan libremente. Las que exigen
evidencia no se pueden dar por hechas sin un adjunto: **lo impide la base**
(`sellar_tarea_hecha()`), no la pantalla, y la fila lo avisa con «Pide evidencia»
antes de que nadie toque la casilla. La evidencia se adjunta desde el mismo
modal de edición de la tarea [F02·B2b].

⚠️ **Cerrar las tareas de una etapa no mueve el proyecto de etapa.** La app lo
propone; avanzar lo decide el consultor y queda en la bitácora con su nombre.

### Bitácora del proyecto
La línea de tiempo: visitas, entregas, cambios de etapa, acuerdos, incidencias. Es
lo primero que se abre antes de una reunión con el cliente, y hoy vive en la
memoria del consultor y en un hilo de correo.

Se anota en la visita —también sin señal— y **los cambios de etapa se escriben
solos**. Una entrada se corrige, nunca se borra: la corrige quien la escribió, o
un socio.

---

## Sistemas de gestión `[Fase 02]`

### Normas — el catálogo `[llegó en la Fase 01]`
La pantalla `/sistemas` empieza siendo esto y sólo esto: **el catálogo de normas
de la firma, que se sube como archivo**. Un socio escribe su `.md` con la
estructura de cláusulas y el resumen de Summit para cada una, lo sube, ve el
saldo de lo que va a cambiar y confirma. Corregir una errata es volver a subirlo.

⚠️ Se adelantó a la Fase 01 porque el **alcance de un proyecto** cuelga de él: sin
normas cargadas no se puede decir qué cubre un contrato.

### Cómo se elige el cliente
Las cinco pestañas de este dominio son de **un cliente**, no de la cartera
entera: un documento, un proceso y un riesgo son de alguien. El selector de
arriba vive en la URL (`?org=<id>`), así que se cambia de pestaña sin perder el
cliente y el enlace se puede mandar por correo. La pestaña de Normas no lo pide:
el catálogo es de la firma.

### Documentos — control documental
Lo que un cliente cree que está comprando cuando contrata una implementación.
Es **la biblioteca del cliente**, y se puede mirar entera o filtrada por el
proyecto que la produjo.

- Un documento tiene **código, tipo, proceso dueño y cláusulas que cubre**.
- Cada revisión es una **versión** con su ciclo
  `borrador → en revisión → aprobado → obsoleto`, con quién elaboró, quién revisó
  y quién aprobó, y con su **control de cambios**.
- ⚠️ **Aprobar una versión nueva no borra la anterior: la marca obsoleta y la
  conserva.** Un auditor externo pide justamente el histórico.
- La **lista maestra de documentos** sale sola y es un entregable en sí mismo.
- **Se sube en Word o en PDF y se lee en la app.** Cada versión guarda su
  Markdown además del archivo original: se lee con formato en el teléfono, se
  edita sin abrir Word —editar crea la versión siguiente— y sale de vuelta a
  `.docx` con la plantilla de Summit [Fase 07]. ⚠️ La conversión avisa de lo que
  no sobrevive (tablas complejas, imágenes) y **un PDF escaneado no se puede
  convertir**: eso necesita el módulo multimodal.
- ⚠️ **El saldo de la conversión se enseña ANTES de guardar nada**: cuántos
  caracteres salieron, qué se perdió, y el texto entero desplegable. Un conversor
  que escribe y después informa es un conversor en el que nadie confía la segunda
  vez.
- ⚠️ **Subir el archivo necesita conexión.** Pesa megabytes y no pasa por la cola
  de salida. Lo que sí se puede hacer sin señal es **escribir una versión a
  mano**, mandarla a revisión y aprobarla: eso es texto y se encola como todo lo
  demás.
- El expediente de un documento tiene cuatro secciones: **Texto** (con el visor
  o el editor de Markdown y el botón para abrir el original), **Versiones** (el
  historial con sus firmas y sus botones de ciclo de vida), **Cláusulas** (lo que
  cubre) y **Evidencia** (el acta de aprobación, la lista de difusión).

### Requisitos — la matriz
La pantalla que contesta *"¿cuánto nos falta para certificarnos?"*.

⚠️ Cuelga de un **proyecto**, no de la organización: el alcance —qué normas se
están implementando— es del contrato, y una misma planta puede llevar 9001 este
año y 45001 el siguiente. Por eso hay un segundo selector.

Por cada cláusula auditable del alcance: `no iniciado` · `documentado` ·
`implementado` · `evidenciado` · `no aplica`. El `no aplica` **exige
justificación**: es el primer punto que un auditor de certificación revisa.

El **diagnóstico inicial** (etapa 1 de la metodología) *es* esta matriz recién
llenada. No es un documento aparte que luego hay que mantener sincronizado.

El porcentaje de avance por norma y por capítulo sale de aquí, y es el número que
el cliente pide en cada reunión mensual.

### Procesos
El mapa de procesos: estratégicos, operativos, de soporte. Con su dueño del lado
del cliente, sus entradas y sus salidas.

⚠️ El dueño de un proceso es **gente del cliente** —sale del directorio de
contactos, no de los usuarios de la firma—: es a quien el auditor le pregunta en
el piso y quien firma la evidencia. Un proceso se **da de baja**, no se borra
mientras haya documentos que cuelguen de él.

### Riesgos
Riesgos y oportunidades por proceso, con probabilidad × impacto = nivel, y su
tratamiento (evitar, mitigar, transferir, aceptar, explotar). Cubre ISO 9001 §6.1,
45001 §6.1, 27001 y 37001 de una sola vez.

### Indicadores
Objetivos con su meta, su fórmula, su frecuencia y su responsable; y la medición
de cada periodo. El semáforo de los que van fuera de meta alimenta la **revisión
por la dirección**, que es un entregable obligatorio de todas las normas.

---

## Auditorías `[Fase 03]` — el núcleo

### Programa
El programa anual por cliente: qué se audita, cuándo, con qué frecuencia y bajo
qué criterio. Aprobado y con fecha.

### Planear una auditoría
Tipo (interna, preauditoría, seguimiento, acompañamiento a certificación, a
proveedor), alcance (normas + sitios + procesos), criterios, equipo auditor con
sus certificaciones, y la **agenda hora por hora** que se le manda al cliente
antes de la visita.

### Lista de verificación
**Se genera desde el alcance.** Elegidas las normas y los procesos, la lista sale
con una entrada por cláusula auditable. El auditor la edita: añade, quita,
reordena y escribe sus propias preguntas antes de entrar.

Hay plantillas por norma y por giro, para no rearmarla desde cero cada vez.

### Ejecutar — en planta, sin señal ⚠️

Este es el momento para el que existe toda la arquitectura offline.

1. **En la oficina, con señal**, el auditor abre la auditoría. La app descarga
   todo: agenda, ítems, cláusulas, hallazgos previos, documentos aprobados. Un
   aviso dice **"lista para trabajar sin señal"**.
2. **En planta**, la pantalla es una lista densa que se recorre con el pulgar:
   ítem → veredicto → nota → foto. La cámara abre y cierra sin salir de la
   pantalla.
3. Cada foto se **encola**; el contador de la Navbar dice cuántos cambios están
   esperando.
4. Al salir y recuperar señal, todo sube: **primero los datos, después los
   adjuntos**, en orden y sin duplicar.

### Hallazgos
- Cinco tipos: **NC mayor**, **NC menor**, **observación**, **oportunidad de
  mejora**, **conformidad**.
- **La cláusula citada es obligatoria.** Un hallazgo sin cláusula no es un
  hallazgo, es una opinión.
- **La evidencia objetiva es obligatoria**: qué se vio, dónde y cuándo.
- ⚠️ **No se borran.** Se anulan con motivo o se reclasifican, y queda el
  historial. Es exactamente lo que un organismo certificador viene a revisar.
- Folio estable y calculable sin red: `AUD-2026-014/H-03`.

### Informe
Se genera **el mismo día, en el sitio, con lo que hay en la caché**: alcance,
criterios, equipo, agenda cumplida, resumen de hallazgos por tipo y por cláusula,
conclusiones y firmas. Con la identidad de Summit.

---

## Acciones `[Fase 04]`

Cierra el ciclo: un hallazgo sin acción es un hallazgo perdido.

- Nace de un hallazgo, o sola como acción de mejora.
- Tipo: **corrección** (apagar el fuego) vs **acción correctiva** (que no vuelva a
  pasar). La distinción es de norma, no de estilo, y la app la exige.
- **Análisis de causa** estructurado: 5 porqués o Ishikawa (6M). Guardado como
  datos, no como un párrafo — ISO 9001 §10.2 lo pide y un auditor externo lo lee.
- **Tareas** con responsable y fecha.
- ⚠️ **Verificación de eficacia obligatoria para cerrar.** Fecha, quién verificó,
  evidencia y veredicto. Sin eso la app no deja cerrar. Es el error más común en
  los SGC reales: se cierra la acción el día que se hace, sin comprobar meses
  después que sirvió.

### Notificaciones
Push al teléfono: hallazgo asignado, acción por vencer, acción vencida, documento
esperando aprobación, obligación próxima a vencer, resumen diario. Con
preferencias por usuario y por categoría.

---

## Cumplimiento `[Fase 05]`

El servicio que más urgencia genera: aquí hay multas y clausuras de por medio.

### Matriz de aplicabilidad NOM
**Qué NOMs le aplican a esta organización, en este sitio, y por qué.** Con
justificación obligatoria en ambos sentidos — por qué aplica y por qué no. Es el
primer entregable de una consultoría de cumplimiento y hoy se entrega en Excel.

Cubre STPS (seguridad e higiene industrial), SEMARNAT y Protección Civil.

### Evaluación de cumplimiento
Punto por punto de cada NOM: cumple / parcial / no cumple / no aplica, con su
evidencia. De ahí sale el **semáforo por NOM y por sitio**, que es lo que el
director de planta quiere ver en una diapositiva.

### Obligaciones y vencimientos
La pantalla que evita una clausura. Todo lo que caduca:

- **Estudios**: ruido (NOM-011), iluminación (NOM-025), condiciones térmicas
  (NOM-015), vibraciones (NOM-024), psicosocial (NOM-035), ergonómico (NOM-036).
- **Dictámenes**: eléctrico, estructural.
- **Licencias**: ambiental, de funcionamiento, uso de suelo, cédula de
  zonificación.
- **Mantenimientos**: sistemas contra incendio, recarga de extintores.
- **Personas**: exámenes médicos, capacitaciones obligatorias, constancias.

Cada una con emisión, vigencia, vencimiento calculado, documento y responsable. La
app **avisa a 90, 30 y 7 días**, no el día que ya venció.

---

## Capacitación `[Fase 05]`

- **Catálogo de cursos** de la firma: normatividad STPS (NOM-002, 009, 017, 018,
  019, 022, 029, 033, 035, 036) y brigadas (montacargas, prevención y combate de
  incendios, búsqueda y rescate, extintores, primeros auxilios, multibrigadas,
  plataformas de elevación).
- **Programa anual (DNC)** por cliente.
- **Sesiones impartidas**: fecha, instructor, sede, duración real, temario,
  evidencia fotográfica.
- **Asistentes** con su calificación y su asistencia.
- **Constancias DC-3** en el formato oficial de la STPS, con folio, generadas de
  los datos de la sesión. Hoy se llenan una por una a mano.

---

## Portal del cliente `[Fase 06]`

`/portal/[token]` — **público, sin cuenta, sin instalar nada.** Se manda por
WhatsApp y se abre en el teléfono.

El cliente ve: el avance de su sistema por norma, sus hallazgos abiertos con
fecha compromiso, sus vencimientos próximos, su calendario de visitas, sus
documentos aprobados y su **Salud del SGC** `[Fase 08]`.

Y puede **subir evidencia** de una acción sin tener cuenta.

⚠️ Todo lo que ve entra por **una sola función de lista blanca**. Nunca se
consultan tablas desde el navegador del cliente. Ver
[`08_SEGURIDAD_Y_RLS.md`](08_SEGURIDAD_Y_RLS.md).

---

## Admin `[Fase 06]`

- **Metas y comercial**: metas de venta, embudo de propuestas, tasa de cierre.
- **Finanzas**: ingresos por proyecto, gastos, **rentabilidad por cliente y por
  consultor**. La pregunta que contesta: *¿este cliente nos deja dinero?*
- **Facturación CFDI 4.0**: ⚠️ **apagada de fábrica**. Se enciende cuando el dueño
  lo pida y con el CSD cargado.
- **Usuarios**: alta, roles, **asignación a organizaciones** (que es lo que
  decide quién ve qué), reseteo de contraseña.
- **Bitácora**: `audit_logs` traducida a lenguaje natural. *"Ana cambió el estado
  del hallazgo AUD-2026-014/H-03 de abierto a en acción, el 14 de marzo a las
  10:32."*
- **Configuración**: datos de la firma, módulos encendidos, plazos por defecto por
  tipo de hallazgo, plantillas.

---

## Asistente `[Fase 07]`

Módulo **apagado de fábrica**. Se entra por el 🤖 de la Navbar. Cinco pestañas:
**Chat · Informes · Biblioteca · Memoria · Trazas** (más **Instrucciones**, que
sólo se le ofrece al socio).

**La regla que gobierna todo: propone, no escribe.** Cada acción pasa por una
pantalla de confirmación tipada antes de tocar la base.

Detalle completo en
[`07_ASISTENTE_Y_AUTOMATIZACION.md`](07_ASISTENTE_Y_AUTOMATIZACION.md).

---

## Automatización `[Fase 08]`

Módulo **apagado de fábrica**. Es el puente con Microsoft: transcripciones de
Teams que se vuelven tareas, un buzón de correo que evalúa evidencia solo, y el
motor que calcula la **Salud del SGC** de cada cliente.
