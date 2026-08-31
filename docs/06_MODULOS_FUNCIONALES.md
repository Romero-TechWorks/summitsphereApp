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
| **Auditorías** | `/auditorias` | Programa · Auditorías · Hallazgos. El expediente `/auditorias/[id]` lleva ocho: Plan · Alcance · Lista · Equipo · Agenda · Recorrido · Hallazgos · Informe |
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

### Qué widget tiene datos hoy

| Widget | Fase | De dónde salen los datos |
|---|---|---|
| Esperando señal | 00 | La cola de salida de IndexedDB, sin pasar por el servidor |
| Embudo de proyectos · Mis proyectos · Carga del equipo · Contratos por renovar | 01 | **Una sola** consulta, la de `/cartera?tab=proyectos` |
| Documentos por aprobar | 02 | `sistemas.porAprobar()` — **la única clave propia del tablero**, porque `/sistemas` es por cliente y esto cruza la cartera |
| Mis auditorías · Próxima visita | 03 | La lista de `/auditorias`, con la marca de «lista sin señal» leída de la caché (`faltaPorPrecargar`) |
| Hallazgos abiertos | 03 | La misma lista del tablero del lunes, repartida por los tramos de `TRAMOS_ANTIGUEDAD` |
| Acciones de la semana | 04 | *Pendiente* |
| Vencimientos críticos | 05 | *Pendiente* |

⚠️ **Un widget cuya fase ya se entregó tiene que estar conectado.** El campo
`fase` del catálogo dice de dónde salen los datos, no si el widget funciona: con
la Fase 03 completa y el widget sin conectar, el tablero seguía anunciando «llega
en la Fase 03» y la firma lo leía como que la fase no se terminó. Se conectan en
`src/components/tablero/ContenidoWidget.tsx`, en el mismo commit que cierra la
fase.

⚠️ **Ninguno tiene vista en la base.** Se calculan en memoria sobre listas que ya
están en la caché, por la misma razón que la pestaña de hallazgos de
`/auditorias`: una vista es otra clave que puede faltar la mañana que alguien
abre la app en el estacionamiento de una planta.

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

`/auditorias` tiene dos pestañas —**Auditorías** y **Programa anual**— y una sola
ruta propia, `/auditorias/[id]`, el expediente de una auditoría.

### Cómo se elige el cliente: no se elige

⚠️ **A diferencia de `/sistemas`, aquí no hay selector de cliente.** Allá cinco de
seis pestañas son el expediente de *una* organización; aquí la semana de un
auditor cruza la cartera: el lunes abre «qué tengo esta semana», no «qué tiene
Planta Norte». Se descarga la lista visible una vez y el filtro por cliente, por
estado y por texto se aplica **en memoria** — que es además lo único que sobrevive
a una planta sin señal.

### Programa
El programa anual por cliente: qué se audita, cuándo, con qué frecuencia y bajo
qué criterio. ISO 9001 §9.2.2 lo exige por escrito y aprobado.

Aprobarlo **sella quién y cuándo en la base**, no en la pantalla; devolverlo a
borrador borra esa firma. Un cliente puede tener más de un programa el mismo año
—9001 y 45001 con organismos distintos— y eso es válido.

**La parrilla por proceso** `[F03·B6b]` se abre pulsando el programa
(`?programa=<id>`) y es donde vive la frecuencia: cada proceso con su **valor**
—2 si es del servicio, 1 si es de soporte—, las **no conformidades del año
anterior**, y de ahí salen los puntos y cuántas auditorías le tocan.

- **Puntos = valor × NC del año anterior.** Hasta 5 puntos, una auditoría al año;
  por encima, dos. ⚠️ **Nunca más de dos**: es lo que hace la hoja de cálculo de
  la firma. El texto del procedimiento dice otra cosa y está mal redactado.
- Los dos números **se proponen solos** —el valor desde el tipo del proceso, las
  NC desde los hallazgos del año pasado con el botón *Traer las NC*— y los dos se
  pueden cambiar. Lo que la app propone no es lo que la firma decide.
- **Los meses se planean tocando la celda**: una vez interna, otra externa, otra
  para quitarla.
- ⚠️ Con el programa aprobado los procesos **ya no se quitan**. Es un registro de
  ISO 9001 §9.2.2: la justificación del número de auditorías del año tiene que
  poder consultarse después. Lo impone la base, no la pantalla.
- **Se imprime** `[F03·B6c]`: es el `F-SG-09`, el documento que la Dirección del
  cliente firma. Sale con la leyenda de valores y el umbral, porque sin ellos el
  número de auditorías parece arbitrario.

### Planear una auditoría
Tipo (interna, preauditoría, seguimiento, acompañamiento a certificación, a
proveedor), fechas, auditor líder, programa y proyecto de los que cuelga, y el
alcance y los criterios en palabras para el informe.

⚠️ **El folio no se captura.** `AUD-2026-014` lo asigna el servidor: es el
consecutivo de la firma entera, y un consultor no ve las auditorías de los demás
para poder contarlo. Una auditoría creada sin señal **aparece sin folio hasta que
sincroniza**, y la pantalla lo dice en vez de enseñar un número que después cambia
solo.

⚠️ **El cliente no se cambia después del alta.** Una auditoría con hallazgos que
cambiara de organización se llevaría su evidencia al expediente equivocado.

### El expediente: Plan · Alcance · Equipo · Agenda

- **Alcance.** Normas, sitios y procesos, marcados de una lista. De las **normas**
  sale la lista de verificación: un punto por cada cláusula hoja auditable. Sin
  alcance no hay lista, y sin lista el auditor entra a planta con la pantalla
  vacía.
- **Equipo.** Quién audita y con qué papel (líder, auditor, experto técnico,
  observador). Sus certificaciones se imprimen en el informe y salen de su ficha
  de usuario — si se pudieran escribir por auditoría, dos informes del mismo
  auditor dirían cosas distintas sobre él.
  ⚠️ No es el equipo del expediente del cliente: aquél decide permisos, éste dice
  quién hizo *esta* auditoría.
- **Agenda.** El plan hora por hora, agrupado por día. Es lo que se le manda al
  cliente antes de ir, y después se marca lo que se cumplió — eso va al informe.
  El «auditado» admite un puesto («Jefe de Almacén»): la agenda se manda semanas
  antes de saber quién estará.
  De aquí salen **dos documentos** `[F03·B6d y B6e]`:
  - **Imprimir la agenda** — el `F-SG-11`, que se le manda al cliente *antes* de
    la visita, por correo y con copia a los jefes inmediatos. Un renglón sin
    auditor asignado se imprime con las iniciales del equipo completo.
  - **Asistencia**, en cada renglón — el `F-SG-03`, la hoja de firmas de esa
    reunión. `P-SG-03` §5.4.1 exige por escrito la de apertura.
    ⚠️ **Sale prellenada**: evento, objetivo, fecha, lugar y los puestos que la
    app ya sabe, con la columna de firma en blanco y seis renglones de sobra. Se
    firma con pluma en la sala y vuelve como foto adjunta a la auditoría. Una
    hoja vacía es un PDF que cualquiera saca de un Word.

### Lista de verificación
**Se genera desde el alcance.** Elegidas las normas, la lista sale con una entrada
por cláusula **hoja** auditable —el capítulo «8» y sus hijas juntos duplicarían el
recorrido sin comprobar nada nuevo—. El auditor la edita: añade, quita, reordena y
escribe sus propias preguntas antes de entrar.

Es una pestaña del expediente de la auditoría, entre **Alcance** —de donde sale— y
**Equipo**. Tres gestos, en este orden:

1. **Generar del alcance.** Idempotente: ampliar el alcance y volver a generar
   añade lo que falta y no toca lo ya evaluado.
   ⚠️ **Pide señal, y la pantalla lo dice.** Lo hace el servidor recorriendo las
   cláusulas, y es lo que se prepara en la oficina antes de salir. Añadir, editar
   y reordenar sí funcionan sin conexión.
2. **Usar la plantilla.** La firma le pone su redacción a esos puntos y suma sus
   preguntas propias. Lo que la plantilla nombra y no está en el alcance **se
   omite y se avisa**: auditarlo sería auditar fuera de alcance. Y un punto ya
   evaluado se deja como está.
3. **Guardar como plantilla** (sólo un socio). Se define **con el ejemplo**, no en
   una pantalla de configuración: el auditor deja bien la lista de un cliente y la
   guarda para los siguientes —«hazla como la de Aceros»—. Se guarda por norma y
   por giro del cliente.

⚠️ Un punto que **ya produjo un hallazgo no se quita**: es la cita de ese
hallazgo, y lo impide la base.

⚠️ La cláusula de un punto es **opcional**; la de un hallazgo, no. El auditor
añade preguntas propias («¿el extintor del pasillo 3 tiene carga vigente?») y eso
es trabajo legítimo — pero lo que salga de ahí, si es hallazgo, cita una cláusula.

### Recorrido — en planta, sin señal ⚠️

Este es el momento para el que existe toda la arquitectura offline. Es la última
pestaña del expediente de la auditoría, y está al final a propósito: las otras
cinco se preparan una vez en la oficina, ésta se abre en la planta.

1. **En la oficina, con señal**, el auditor pulsa **«Descargar para trabajar sin
   señal»**. Bajan nueve piezas —el plan, la lista, la agenda, el alcance, las
   cláusulas, el equipo, sitios y contactos, procesos y documentos— y el aviso
   cambia a **«lista para trabajar sin señal»**.
   ⚠️ Si algo no bajó, lo dice **por su nombre** y pide no entrar todavía.
2. **En planta**, cada punto es una fila que se abre al tocarla. Dentro: los
   cuatro veredictos como botones grandes en una fila —no un desplegable, que en
   un teléfono abre la rueda del sistema y pide la segunda mano—, la nota, el
   botón de **dictar** y el de **tomar foto**, que abre la cámara trasera
   directamente.
   Tres filtros para no perderse: *me faltan · con hallazgo · todos*.
3. Cada foto y cada nota de voz se **encolan**. Arriba, un contador **permanente**
   dice cuántos cambios esperan señal y cuántos archivos faltan por subir — es la
   única prueba de que las tres horas de trabajo siguen ahí.
4. Al salir y recuperar señal, todo sube: **primero los datos, después los
   adjuntos**, en orden y sin duplicar.

⚠️ **La hora que se guarda es la del teléfono**, no la del servidor: se evaluó a
las 10:15 en modo avión y la fila llega a las 14:00. Quién lo evaluó sí lo sella
la base.

⚠️ **Lo ya subido no se ve sin señal.** El bucket es privado y la URL se firma en
el servidor. Tomar la foto y adjuntarla, sí. La pantalla lo dice en vez de ofrecer
un botón que no haría nada.

### Hallazgos
- Cinco tipos: **NC mayor**, **NC menor**, **observación**, **oportunidad de
  mejora**, **conformidad**.
  ⚠️ Una **conformidad** es un hallazgo de verdad, no un relleno: un informe que
  sólo enumera lo que está mal no es una auditoría, es una lista de quejas.
  Al elegir el tipo, la pantalla enseña **el criterio de clasificación** — es lo
  que hace que dos auditores clasifiquen igual.
- **La cláusula citada es obligatoria.** Un hallazgo sin cláusula no es un
  hallazgo, es una opinión. Sólo se ofrecen las normas del **alcance**.
- **La evidencia objetiva es obligatoria**: qué se vio, dónde y cuándo.
- ⚠️ **No se borran.** No hay botón, y no falta: se **anulan con motivo** —la base
  lo exige— o se reclasifican, y queda el historial. Es exactamente lo que un
  organismo certificador viene a revisar, y la ficha lo enseña entero: qué campo
  cambió, qué decía antes, qué dice ahora, por qué y quién.
- Folio estable y calculable sin red: `AUD-2026-014/H-03`.
  ⚠️ Si dos auditores en modo avión levantan el mismo número, **el servidor
  renumera al llegar** en vez de rechazar el segundo. El auditor vio un H-03 y en
  el informe sale un H-07: un número corrido se edita, un hallazgo perdido no se
  recupera.
- **Se levantan desde el recorrido**, con un botón en cada punto de la lista: el
  hallazgo nace con la cláusula y el proceso de ese punto puestos, y al guardar el
  auditor se queda donde estaba.

### El tablero del lunes
Pestaña **Hallazgos** de `/auditorias`: los de **toda la cartera**, agrupados por
cliente, por norma o por antigüedad, con los vencidos contados aparte. No es la
lista de una auditoría — es «qué le debo a quién». Cada fila lleva a su auditoría.

### Informe
Octava y última pestaña del expediente de una auditoría. Reproduce el **`F-SG-12 Reporte
Final de Auditoría Interna`**, el formato que usa la firma: está transcrito, con
su mapeo campo por campo, en
[`docs/formatos_informeAuditorias/`](formatos_informeAuditorias/README.md).

Nueve secciones, **en el orden del original**: objetivo y alcance · reunión de
apertura · resumen con la agenda cumplida · fortalezas del sistema de gestión ·
observaciones y oportunidades de mejora · no conformidades (mayores y menores por
separado) · gráficos de resultados · conclusión · equipo auditor y firma. Con el
membrete de la firma.

- ⚠️ **Se genera el mismo día, en el sitio, con lo que hay en la caché.** El
  auditor lo enseña en la reunión de cierre, y en una planta eso puede ser sin
  señal. No consulta nada que la precarga no haya bajado ya.
- ⚠️ **Los hallazgos anulados NO salen.** Siguen en la base con su motivo y su
  historial —no se borran nunca—, pero no son un resultado de la auditoría:
  imprimirlos convertiría un error del auditor en una acusación contra la empresa
  del cliente. Lo que un certificador revisa es el historial, no el informe.
- **«Fortalezas del sistema de gestión» se imprime aunque esté vacía**, con una
  línea que lo dice. Es la única sección donde el hueco es el mensaje: un informe
  que sólo enumera lo que está mal es una lista de quejas, y verlo impreso es lo
  que hace que la próxima vez se registren las conformidades.
- Antes de imprimir, la pantalla **dice qué le falta** —el objetivo, la conclusión,
  el equipo— y **deja imprimir igual**: un preliminar incompleto en la reunión de
  cierre sigue siendo mejor que ningún documento, y quien decide es el auditor.
- **Marcarlo como emitido lo fecha el servidor.** El procedimiento de la firma da
  una semana de plazo desde la auditoría, y ese plazo se mide contra esa fecha.
  Enseñar el preliminar no lo marca ni escribe nada.
- **En el teléfono, imprimir es compartir**: no hay impresora en una planta, así
  que sale un PDF que se manda.

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
