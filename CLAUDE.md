# CLAUDE.md — SummitApp

Guía obligatoria para agentes de código en este repositorio. Léela completa antes
de tocar código.

**Contexto:** PWA de gestión para **Summit-Sphere**, consultoría en Sistemas de
Gestión ISO, auditorías, cumplimiento normativo (NOMs STPS / SEMARNAT /
Protección Civil), capacitación y automatización. **Next.js 16 App Router +
TypeScript + Supabase + PWA**, deploy en Vercel.

**El usuario real trabaja en una planta, no en una oficina.** Un auditor levanta
hallazgos caminando por un almacén con el teléfono en una mano y la lista de
verificación en la otra, muchas veces **sin señal**. Todo lo que se diseñe tiene
que sobrevivir a eso.

**Multi-tenencia: SÍ aplica, y es la diferencia grande con JDM Built.** Summit
tiene *muchas* organizaciones cliente dentro de **una sola instancia**. Cada fila
de dominio cuelga de una `org_id`. Ver §Reglas críticas, regla 1.

---

## Estado actual — lee esto antes de pedir nada

- ✅ **`F05·B1` ESTÁ ESCRITO Y SU MIGRACIÓN (`F00`) APLICADA** (22 sep 2026). `20260922120000_cumplimiento_normativo.sql` —tarea
  `F00`— es la **decimoctava** y cubre **B1 y B2 enteros** (tablas, RPC, barrido
  del cron); las pantallas son **sólo B1**. ⚠️ **Primero la migración, después el
  push**: `/cumplimiento` consulta tablas que sin ella no existen.
  Probada en Docker con las diecisiete anteriores y datos sembrados antes:
  **80 comprobaciones**. `src/types/database.ts` regenerado: **527 líneas
  añadidas, ninguna quitada**. `lint` y `build` en verde.
  `/cumplimiento` tiene **cuatro pestañas** —Matriz · Recorrido · Semáforo ·
  Catálogo de NOMs—, pide `?org=` y además `?sitio=` (los dos son filtros en
  memoria, no claves de caché). **Lo que hay que saber:**
  - ⚠️ **`obligaciones.aplica` es NULLABLE (`null` = sin decidir)**, al revés que
    `docs/13` §3.3. La spec pedía justificación obligatoria siempre **y** una RPC
    que la dejara vacía: no cabían juntas. La RPC genera sin decidir, la pantalla
    **propone** (`proponerAplica()`), la persona decide con justificación, y
    **no se evalúa lo que no aplica** (tercer CHECK). `docs/13` §0 tabula las seis
    diferencias con la spec.
  - ⚠️ **`riesgos.tipo` NO se amplió**: es la polaridad `riesgo/oportunidad`, no
    la categoría. Los 19 tipos de `SGI-F-CA-23` van en otra columna (Fase 02).
  - ✅ **`puedo_borrar_org()` recupera la partición de pruebas** que perdió al
    reescribirse en `20260908120000`.
  - ⚠️ **El informe de levantamiento (§10) NO está**: su prosa —objetivo,
    desafíos, próximos pasos, recomendaciones— no tiene tabla donde vivir. Hay que
    decidirla antes. Por lo mismo la precarga **no baja el membrete** todavía.
  - **La precarga del recorrido cuelga de la ORGANIZACIÓN**
    (`src/lib/cumplimiento/precarga.ts`, siete piezas): una descarga sirve para
    todos los sitios del día. La evidencia previa es **una** consulta por cliente
    (`cumplimiento.adjuntos(orgId)`), no una por obligación.
  - **`CAMPOS_DOMINANTES`** suma `vencimiento_id` y `obligacion_id`, **entre
    `item_id` y `documento_id`**, en el mismo orden que el trigger.
  - ⚠️ **La sexta excepción a `offlineWrite` ya existe en código**:
    `generarObligacionesDeNom()`. Todo lo demás —evaluar, fotos, «Evaluar en
    (área)», áreas, alta manual, la biblioteca— pasa por la cola.

- ✅ **`F05·B2` ESTÁ ESCRITO, Y TRAE UNA MIGRACIÓN QUE NO ESTABA EN LA SPEC**
  (23 sep 2026). `20260923120000_renovacion_de_vencimientos.sql` —tarea `F00b`,
  la **decimonovena**, ✅ **aplicada el 23 sep 2026**— añade el estado
  `renovado` y `vencimientos.renueva_id`. Probada en Docker: **94 comprobaciones** con datos previos y
  **80 de regresión** con las diecinueve desde cero; tipos regenerados, **10
  líneas añadidas**. `lint` y `build` en verde. **Lo que hay que saber:**
  - ⚠️ **UNA FILA POR EMISIÓN; RENOVAR NO REESCRIBE.** Reescribir la fecha
    dejaba **sin avisos el ciclo nuevo** —la `clave_evento` del cron lleva el
    id, y el `vence_90` ya se había mandado— y borraba de la lista el estudio
    viejo con su PDF. La emisión nueva lleva `renueva_id` y el trigger
    `jubilar_vencimiento_anterior()` marca la anterior `renovado` **en la misma
    escritura del cliente** (patrón `jubilar_version_anterior()`); quitar la
    renovación la devuelve a su ciclo. El cron ya ignoraba `renovado`.
  - **`cumplimiento.vencimientos()` es de TODA la cartera**, sin `orgId`: la
    comparten la pestaña —que filtra cliente y sitio en memoria— y el widget.
  - ⚠️ **El estado que se PINTA se recalcula contra hoy** (`estadoVisible()` en
    `src/lib/cumplimiento/catalogos.ts`); `DIAS_POR_VENCER = 90` es copia de
    `dias_por_vencer()` en la base, que manda.
  - ✅ **`vencimientos_criticos` está conectado: ya NO queda ningún placeholder
    en el tablero.** Enseña vencidos, en trámite y por vencer **a 30 días**.
  - ✅ **`obligacion_proxima` está ENCENDIDA en `/admin` → Avisos**, con la
    cadencia real 90/60/30/7.
  - **La advertencia de datos personales (hueco 42)** va en el adjunto del
    vencimiento, corta y sin bloquear. `docs/08` §7 declara el resto como deuda.
  - `docs/13` §0 tabula las doce diferencias de B1+B2 con la spec.
- ✅ **`F05·B3` ESTÁ ESCRITO Y SU MIGRACIÓN `F00c` APLICADA** (23 sep 2026).
  `20260924120000_capacitacion.sql` —la **vigésima**—. Probada en Docker: **125 comprobaciones** con
  datos previos y **94 de regresión** desde cero; tipos regenerados, **398
  líneas añadidas**. `lint` y `build` en verde. La especificación de lo
  construido es **`docs/14_ESPECIFICACION_F05_B3.md`**. **Lo que hay que saber:**
  - ⚠️ **LA APP REGISTRA DC-3, NO LOS GENERA.** Las cuatro respuestas de Summit:
    **instructor externo** (texto, no usuario), **catálogo de proveedores** con
    su registro STPS, **solicitud genérica** (CSV armado en el navegador, sale
    sin señal) y **sólo DC-3**, sin constancia propia.
  - **`cursos` y `proveedores_capacitacion` nacen vacías** y sólo las escribe el
    socio, con partición de pruebas. ⚠️ Como no tienen `org_id`, la validación
    compara **`es_demo`** del curso y del proveedor contra el del cliente.
  - **El estado del DC-3 se DERIVA** (`estadoDc3()`): recibido, pendiente,
    reforzamiento (< 80, no reprueba) o no asistió. Y **«impartido» del programa
    anual también se deriva** de las sesiones.
  - **La ficha de una sesión es `?sesion=<id>`**, sin ruta propia (§2.1).
  - **`CAMPOS_DOMINANTES`** suma `asistente_id` y `sesion_id` entre
    `obligacion_id` y `documento_id`.
  - ⚠️ **Sin precarga**: la lista de asistencia sin señal funciona si la sesión
    se abrió antes con señal. Si hace falta capturarla sin haberla abierto nunca,
    toca una precarga como la del recorrido.
- ✅ **`F03` SE RESOLVIÓ EL 23 SEP 2026: SUMMIT NO EMITE DC-3**, lo contrata a
  un agente capacitador externo. Por eso ya no hacen falta el formato oficial
  vigente, el registro STPS de Summit, los catálogos STPS ni el bucket
  `constancias` (si ya se creó, no estorba; nada lo usa).
- ✅ **`F06·B3` EMPEZÓ POR CONFIGURACIÓN Y USUARIOS** (23 sep 2026), **sin
  migración**: `config_firma` y `usuarios` ya tenían todo. `lint` y `build` en
  verde. `/admin` lleva ahora **Avisos · Configuración · Usuarios · Mi cuenta**.
  Tres decisiones del dueño que lo fijan:
  - ⚠️ **EL LOGOTIPO VA INCRUSTADO** en `config_firma.logotipo_url` como
    `data:image/png` reducido a 160 px (`src/lib/firma/logotipo.ts`). Un enlace
    no carga sin señal —y los buckets son privados, un enlace firmado caduca—:
    así viaja en `firma.identidad()`, que ya es pieza de la precarga, y el informe
    de la reunión de cierre sale con logo en el sótano.
  - ⚠️ **LOS PLAZOS POR DEFECTO YA TIENEN LECTOR**: el formulario del hallazgo
    —y el de NC desde queja— **propone** la fecha compromiso según el tipo
    (`usePlazoPropuesto()`), con **días hábiles** y los festivos de la LFT art. 74
    calculados (`src/lib/utils/diasHabiles.ts`) más los que añada la firma
    (`plazos_default.festivos`). La propuesta **se deriva, no se copia a estado**:
    se mueve con el tipo hasta que el auditor escribe la fecha. En un hallazgo ya
    levantado **no se inventa** una fecha. `firma.identidad()` trae ahora
    `plazos_default`; **sin ella en la caché no se propone nada** —nunca los
    plazos de fábrica—.
  - ⚠️ **ALTA CON CONTRASEÑA TEMPORAL**, que la persona cambia al entrar. Va
    por `/api/users` con `service_role` (`src/lib/api/usuarios.ts`:
    `socioQueLlama()` y `puedeAdministrar()` son el candado, porque ahí el RLS no
    existe). La marca `debe_cambiar_contrasena` vive en `user_metadata`, la lee
    `src/proxy.ts` de lo que `getUser()` ya devolvió y la persona la apaga **en la
    misma llamada** que pone su contraseña. `/contrasena` va **antes** que `/mfa`
    salvo si la cuenta ya tiene un factor sin usar. **La temporal se enseña una
    vez** y nunca va a la bitácora.
  - ⚠️ **LA BAJA BLOQUEA LA CUENTA EN `auth` (`ban_duration`)**, no sólo pone
    `activo = false`: `mis_organizaciones()` no mira `activo`, así que un
    consultor «dado de baja» seguía viendo sus expedientes. Nombre, rol y
    certificaciones sí van por la cola.
  - ⚠️ **Los módulos encendidos NO se pintaron**: ninguno de los cuatro existe en
    código (ver §Módulos apagados). Regla 11.
- ✅ **`F06·B4` —EL BUSCADOR GLOBAL— ESTÁ ESCRITO, CON SU MIGRACIÓN `G00` POR
  APLICAR** (23 sep 2026). `20260925120000_buscador_global.sql`, la **vigésima
  primera**. ⚠️ **Primero la migración, después el push.** Probada en Docker con
  las veinte anteriores y datos sembrados: **17 comprobaciones** (aislamiento por
  asignación y por partición, acentos, folios a medias, signos, `anon`). Tipos:
  **51 líneas añadidas, ninguna quitada**. `lint` y `build` en verde.
  **Lo que hay que saber:**
  - ⚠️ **`indice_busqueda_global` es `security_invoker = true`** y la RPC
    `SECURITY INVOKER`: es la primera vista del proyecto y la regla 6 manda.
    Siete fuentes: las seis del plan **más `auditorias`**.
  - ⚠️ **`texto_busqueda()` convierte los signos en espacios ANTES del
    `to_tsvector`.** El analizador leía `AUD-2026-001` como `aud`, `-2026`,
    `-001` —enteros negativos— y ningún folio casaba. Es IMMUTABLE a propósito:
    el día que haga falta índice, sale una columna generada.
  - ⚠️ **SIN SEÑAL SIGUE BUSCANDO** en las listas ya bajadas
    (`buscarEnCache()`, `src/lib/busqueda/buscador.ts`), con el mismo criterio
    de prefijos, y lo dice. **No dispara consultas**: sólo `getQueryData`.
  - ⚠️ **`busqueda.global(texto)` es la única clave con el texto dentro, y NO
    se persiste** (`persistencia.ts` la salta). Es la excepción consciente a la
    regla 7; lo que esa regla protege lo cubre la búsqueda en caché.
  - **Encuentra también las pantallas**: en el teléfono es el camino a
    Sistemas, Capacitación y Admin.
  - Se añadieron **`?hallazgo=`, `?accion=` y `?obligacion=`**, que abren la
    ficha. Cerrarla la **descarta** sin reescribir la URL (`descartado`), y otro
    id la vuelve a abrir.
- ▶️ **LO SIGUIENTE**: aplicar `G00`. La Fase 05 está escrita y aplicada
  entera; falta la prueba del criterio de cierre en el teléfono. De la Fase 06
  quedan el portal (espera `G02`), los reportes (esperan `G01`), metas y
  finanzas, y la bitácora. ⚠️ **El
  informe de levantamiento de `B1` sigue esperando** a que se decida dónde vive
  su prosa (docs/13 §0, #6).
- 📋 **B1 y B2 se especificaron en `docs/13_ESPECIFICACION_F05_B1_B2.md`** —y su
  §0 manda sobre el resto—. Todo lo necesario para escribir la migración y las pantallas
  **sin volver a leer el catálogo del cliente** está en
  **`docs/13_ESPECIFICACION_F05_B1_B2.md`**: DDL tabla por tabla, las cinco
  reglas que no se rompen, la RPC, las pantallas, los avisos, la precarga, la
  migración y sus **catorce comprobaciones**. Léelo entero antes de tocar nada.
  **Las tres decisiones del dueño (22 sep 2026) que lo fijan y NO se vuelven a
  discutir:**
  - **UNA tabla**: `org_noms` y la matriz de obligaciones de compliance son la
    misma, `obligaciones`. **Una NOM es un tipo de fuente, no el eje del modelo**
    — por eso cabe un despacho jurídico igual que una planta.
  - **Área nullable**: la evaluación cuelga de `sitio_areas` cuando la hay.
  - **`tipo` editable**: `obligacion_tipos` es un catálogo, **no un CHECK**.
    ⚠️ Excepción consciente a «los catálogos de dominio van `text` + `CHECK`»,
    por el mismo motivo que las normas; la fricción se sustituye por
    `activo = false` y por que nada se borra.
  ⚠️ **Y la regla que ordena el bloque: LAS BIBLIOTECAS LAS CONSTRUYE EL
  USUARIO.** `noms`, `nom_requisitos`, `obligacion_tipos` y `cursos` **nacen
  vacías**, sin un solo `INSERT` de siembra. Se arranca con las **ocho NOMs ya
  procesadas** del levantamiento del cliente 02.
  ✅ **El control de vencimientos que se le pidió a Summit mejora los valores
  propuestos, no falta como pieza** — el usuario captura sus tipos y vigencias
  igual que sus NOMs.

- ⚠️ **LLEGÓ UN SEGUNDO CLIENTE Y CAMBIA EL ENCUADRE** (22 sep 2026, quinta
  tanda): **César Roel Abogados**, despacho jurídico, con un **SGI multinorma**
  —ISO 9001 + **27001** + **37001** + **37301**— frente al SGC de sólo calidad de
  ATELIER. 164 archivos en `docs/nuevosFormatos/`, **ya en `.gitignore`** (72 MB),
  analizados en **nueve fichas nuevas** encabezadas por
  `docs/formatos_informeAuditorias/cliente_02_cesar_roel.md`.
  **Lo que hay que saber antes de tocar nada:**
  - ✅ **`F05·B1` SE DESTRABÓ.** El `Informe de Levantamiento de Cumplimiento
    Normativo STPS` es el formato que faltaba: ocho NOMs con su **elemento
    verificable**, el texto de la obligación y la condición de aplicabilidad
    («entre 16 y 50 trabajadores»). ⚠️ **Y corrige el plan: no se evalúan
    numerales, se evalúan ELEMENTOS** —«Extintores», «Carpeta normativa»— **por
    ÁREA del sitio**, caminando. Es pantalla de campo, con las ocho reglas del
    offline y el reloj del teléfono.
  - ⚠️ **`F05·B1` era más chico de lo que es.** `SGI-P-COM-02` + `SGI-F-COM-18`
    enseñan que la matriz de NOMs es un caso de **matriz de obligaciones**:
    legales, regulatorias, **contractuales** y voluntarias. Un despacho no tiene
    NOMs de agentes físicos, tiene LFPDPPP y cláusulas de contrato.
  - ⚠️ **EL CHECK DE CATEGORÍAS NECESITA CUATRO VALORES MÁS, Y YA CUESTA UNA
    MIGRACIÓN.** La matriz de comunicación multinorma pasó de doce a dieciséis
    renglones: faltan `politica_compliance`, `canal_denuncias`,
    `incidente_seguridad` y `obligaciones_compliance`. Trece → diecisiete. La
    migración se aplicó el ~15 sep, una semana antes de esta tanda; se avisó a
    tiempo y no se alcanzó. **Hueco 29**, y va **dentro de la primera migración
    de la Fase 05**, no en una propia.
  - ⚠️ **UNA SOLA ESCALA DE RIESGO, Y SUSTITUYE A LAS CUATRO.** `SGI-F-CA-23`
    (ago 2026) trae 5×5 → 1-25 con cuatro bandas, **inherente y residual**, y la
    reducción por efectividad del control es **aritmética y comprobada**: Alta
    −2 de probabilidad, Media −1, Baja 0; la severidad no se reduce. Cierra el
    hueco 23 mejor que `P-SG-04`. Trae **249 riesgos y 19 tipos** cargados.
  - ✅ **HUECO 11 CERRADO**: `SGI-F-RH-03 Descriptivo de Puesto`, con plantilla y
    **26 ejemplos**. ⚠️ Trae `Nivel de Riesgo` **del puesto** —insumo de la debida
    diligencia de ISO 37001— y `Modalidad`, que enlaza con la **NOM-037** de
    teletrabajo. `contactos.puesto` deja de aguantar como texto libre.
  - ✅ **`G01` de la Fase 06 quedó cubierta sin pedirla**: hay **una plantilla de
    informe** y los cuatro informes la siguen. ⚠️ Y deja un hallazgo:
    `tareas_etapa` es booleana donde el informe pide `% hecho · vencimiento ·
    estado · notas`, y `proyectos` no tiene `objetivo` (hueco 35).
  - ⚠️ **CONTINUIDAD ES UN SERVICIO QUE SE VENDE, NO UN DOMINIO** (decisión del
    dueño, 22 sep 2026), y eso abre el **hueco 39**: hacen falta `servicios`
    (catálogo de la firma) y `org_servicios` (**qué cliente tiene cuál activo**).
    Es el interruptor que la regla 11 pedía, **por cliente** en vez de por
    instalación — y explica que cumplimiento y capacitación sean **dos servicios**,
    no dos bloques de una fase.
  - ⚠️ **PRIVACIDAD SIGUE SIN FASE** (ARCO con **plazos en días hábiles**,
    vulneraciones con reloj de **horas**): el **calculador de días hábiles** de
    `E03` dejó de ser interruptor muerto, y una vulneración no tiene `fuente_nc`
    (hueco 34). ⚠️ **Y hay una deuda declarada**: al subir documentos con datos de
    trabajadores va **una advertencia corta que no bloquea** (hueco 42); la
    retención, la supresión y el papel de encargado se ven después, a propósito.
  - ⚠️ **UNA DENUNCIA NO ES UNA QUEJA, Y YA ESTÁ DECIDIDO QUE SE SEPARAN**
    (22 sep 2026, hueco 37, **y es de seguridad**): `denuncias` es tabla propia,
    anónima o confidencial, con protección contra represalias. Lleva `org_id`
    **y además una condición por persona** —segundo caso del proyecto tras
    `push_suscripciones`—, porque **el jefe del denunciado no puede verla**. Y
    **no se reusa `PanelQuejas`**: un panel que enseñe las dos acaba enseñando
    una denuncia a quien no debe.
  - ⚠️ **`docs/nuevosFormatos/Normas/` trae el TEXTO ÍNTEGRO de las cuatro ISO**, y
    el PDF de 27001 lleva en sus metadatos el nombre de un sitio de descargas
    piratas. **Regla 12**: no entra al repositorio ni a la base. Ya está
    `.gitignore`-ado; hay que preguntarle a Summit de dónde salió.
  - ⚠️ **LAS BIBLIOTECAS LAS CONSTRUYE EL USUARIO, NO SE PIDEN** (decisión del
    dueño, 22 sep 2026, y **manda sobre `F01` y `F02` de `docs/09``**): `noms`,
    `nom_requisitos` y `cursos` **nacen vacías** y las llena el socio desde la
    pantalla, **con sus propias palabras**, igual que `normas` (regla 12). Es una
    consultoría emergente: pedirle el catálogo completo es pedirle un año de
    trabajo antes de usar la app, y en un año la mitad está obsoleta —la NOM-035
    cambió, la NOM-037 es de 2023—. Se arranca con **las ocho del levantamiento
    STPS**, que ya vienen procesadas. ⚠️ **Hueco 40**: el importador de normas hoy
    sólo importa; esto necesita alta, edición y baja. Y **una NOM actualizada es
    una NOM nueva**, porque la clave lleva el año dentro.
  - ✅ **Y la multi-tenencia deja de ser teórica**: dos clientes, dos giros, dos
    catálogos, normas distintas. El criterio de cierre de la Fase 01 —«la prueba
    con datos reales y una segunda cuenta»— por fin tiene con qué hacerse.
  - ⚠️ **249 riesgos y 95 indicadores EN UN CLIENTE.** Las listas de riesgos e
    indicadores de `/sistemas` se diseñaron sin un número delante: van con
    descarga completa y **filtro en memoria** (regla offline 7), como la cartera.

- ✅ **LAS DIECINUEVE PRIMERAS MIGRACIONES ESTÁN APLICADAS.** `F00` el 22 sep
  2026, `F00b` —la renovación de vencimientos— y `F00c` —capacitación, la
  vigésima— el 23 sep 2026. **La única pendiente es la vigésima primera, `G00`
  (el buscador).**
  `20260909120000_avisos_y_notificaciones.sql` —tarea `E06`, la de **F04·B3+B4**—
  se aplicó **~15 sep 2026**, y con ella **la Fase 04 quedó cerrada**: su criterio
  exigía que «el responsable reciba la notificación en su teléfono».
  ⚠️ **Consecuencia inmediata: el CHECK de `notificaciones.categoria` ya está en
  producción con trece valores, así que las cuatro categorías multinorma del
  hueco 29 YA CUESTAN UNA MIGRACIÓN.** Es exactamente lo que se avisó y no se
  alcanzó — igual que con `E00` y las cuatro `fuente_nc`. No es grave (ampliar un
  CHECK es aditivo), pero ya no es gratis.
  Crea `push_suscripciones` (una fila **por aparato**, no por usuario), añade
  `usuarios.preferencias_aviso` y `notificaciones.clave_evento`, **amplía el CHECK
  de categorías según `P-SG-08`** (hueco 27) y crea las dos RPC del cron.
  Probada en Docker con las **dieciséis anteriores en orden y con datos sembrados
  ANTES**: **28 comprobaciones**, tres de regresión. `src/types/database.ts` está
  regenerado y el diff es **puramente aditivo**.
  ✅ **Es aditiva**: dos tablas, dos columnas con default y un CHECK que se
  **amplía**.
  ⚠️ **`vercel.json` declara los dos crons** y Vercel no los registra hasta el
  siguiente despliegue — comprobar que corrieron es la verificación pendiente.
  **Lo que hay que saber:**
  - ⚠️ **LAS CATEGORÍAS SALEN DE `P-SG-08` §5.5, NO DEL PLAN.** La matriz de
    comunicación del cliente tiene doce renglones con cadencias reales, y la lista
    de `docs/02` fallaba en tres: el cliente **no pide resumen diario** —vive en
    mensual, bimestral y por evento—, «acción por vencer» no está como evento
    —pide **«Estado de las NC», BIMESTRAL**— y **faltaban cuatro** que sí pide.
    Las nuestras se quedan porque son criterio de Summit y sirven; dejaron de ser
    las únicas.
  - ⚠️ **`clave_evento` es lo que hace idempotente al cron.** Corre a diario; sin
    ella «vence en 3» se mandaría el día 12, el 13 y el 14. La clave describe el
    HECHO —`accion:<id>:vence_3`—, no el momento, y el índice único parcial hace
    el resto. **Está comprobado: correr el cron tres veces no manda tres avisos.**
  - ⚠️ **La acción vencida avisa UNA VEZ, el día que vence**, no todos los días a
    partir de ahí. Un aviso que se repite se silencia, y con él los que sí
    importaban. El seguimiento de una vencida es la pantalla, no el teléfono.
  - **Las preferencias son un `jsonb` en `usuarios`, no una tabla.** Una tabla
    `(usuario, categoria)` necesitaría un índice único que no es la PK, y ahí la
    cola resuelve sus `upsert` por la PK (§6.1). Además apagar tres categorías es
    **una** escritura. Misma decisión que `config_firma.plantillas`.
  - ⚠️ **Lo ausente está ENCENDIDO**, en `quiere_aviso()` y en la pantalla. El
    silencio por omisión es lo que hace inútil un sistema de avisos: una categoría
    nueva que naciera apagada no se enteraría nadie de que existe.
  - ⚠️ **El plan Hobby de Vercel da DOS crons y están ocupados.** El «Estado de
    las NC» bimestral **no es un tercero**: se cuelga del diario con su
    comprobación de fecha dentro de la RPC.
  - **Toda la lógica vive en `correr_avisos_programados()`**; la ruta sólo hace el
    fan-out de push. La RPC necesita ver las acciones de **todas** las
    organizaciones para contar vencimientos —imposible desde el RLS— y va con
    `revoke`: un usuario no puede dispararla a mano.
  - ⚠️ **Un 404/410 del servicio de push DESACTIVA la suscripción, no la borra.**
    Seguir intentándolo es ruido, pero borrar la fila deja sin explicación el
    «llevo tres semanas sin recibir nada».
  - ⚠️ **`push_suscripciones` es la única tabla del proyecto sin `org_id`**, y no
    es una fuga: no cuelga de ninguna organización, cuelga de la persona. Su
    política es `usuario_id = auth.uid()` **sin rama de socio** — la suscripción
    de otro es su teléfono.
  - **`/admin` dejó de ser `PantallaPendiente`**: los avisos necesitan dónde
    activarse y es donde una persona los busca. El resto del dominio sigue siendo
    Fase 06 y la pantalla lo dice.
  - ✅ **`E03` quedó sembrado**: `config_firma.plazos_default` con
    `{"unidad":"habiles", …}`. ⚠️ **Falta el calculador de días hábiles** con
    festivos de México — nadie lo lee todavía.

- ✅ **LAS DIECISÉIS ANTERIORES ESTÁN APLICADAS**: las quince primeras el 7 sep
  2026 y `20260908120000_acciones_y_ciclo_de_mejora.sql`
  —tarea `E05`, la de **F04·B1**— el **9 sep 2026**, junto con la primera prueba
  de `/acciones` contra la base real.
  ⚠️ **`procesos.codigo` sigue casi vacío**: el dueño llenó **uno** para ver el
  folio del cliente funcionando. Mientras los otros once estén en blanco, sus
  acciones llevan sólo nuestro folio (`ACC-2026-105`) y la app funciona igual —
  pero el Coordinador del SGC del cliente no reconoce el número. La tabla de las
  doce claves está en `docs/09` · `E05`.
  Lo que esa migración crea `acciones`, `planes_mejora`, `cambios_sgc`, `cambios_sgc_documentos` y
  `quejas`; le añade a `hallazgos` el análisis de causa del `F-SG-07`, las tres
  preguntas de impacto, la aceptación del auditado y el enlace de reincidencia;
  amplía `fuente_nc` de once a quince valores; y le da a `adjuntos` su `accion_id`.
  Se probó en Docker con las **quince anteriores en orden y con datos sembrados
  ANTES**: **74 comprobaciones**, veinte de regresión. `src/types/database.ts` sale
  de ese esquema.
  **Cinco decisiones de diseño que salieron de los formatos, no del plan:**
  - ⚠️ **EL ANÁLISIS DE CAUSA VIVE EN `hallazgos`, NO EN `acciones`**, al revés de
    lo que decía `docs/04`. Lo que decide es el `F-SG-07` §4: **un análisis puede
    concluir que no se requieren acciones correctivas**, y ahí no tendría dónde
    vivir. También es uno por NC en el papel, y colgarlo de `acciones` obligaría a
    decidir a cuál de las cinco estrategias pertenece.
  - ⚠️ **`tareas` NO se creó**, y `docs/02` la anotaba. Ninguno de los cinco
    formatos del ciclo tiene sub-pasos, y el `F-SG-16` enseña que cuando un
    conjunto de acciones necesita planeación la respuesta del cliente es un
    **contenedor con más acciones**. Regla 11.
  - ⚠️ **`acciones_historial` tampoco.** `registrar_bitacora()` ya guarda `antes` y
    `despues` completos en `audit_logs`, que es inmutable con los dos candados de
    la regla 13: la justificación de cada reprogramación queda ahí entera.
  - **Dos series de folio por acción, y NO compiten**: `ACC-2026-105` (nuestro, por
    organización y año) y `AC-FA-01-25` (del cliente, `P-SG-05` §5.2, **por
    proceso**). El hueco 16 se resolvió leyendo con cuidado: el del cliente es el
    folio de la ACCIÓN y el nuestro el del hallazgo. El del cliente **se rellena en
    cuanto hay proceso con código y ya no se reescribe**.
  - **Las tres preguntas de impacto son del HALLAZGO**, no de la acción: los dos
    formatos las hacen una vez por NC. Y llevan CHECK que exige la descripción
    cuando el booleano es cierto.
  ⚠️ **Y la pantalla NO ofrece «cerrar» una acción.** Sólo «verificar eficacia»,
  que cierra si el resultado es `eficaz`. `parcial` sigue abierta y `no_eficaz` no
  reabre —`P-SG-05` §5.7 manda levantar una NC nueva enlazada—. Ofrecer el atajo
  sería institucionalizar el error más común de los SGC reales.

- ✅ **LA ÚLTIMA APLICADA ES LA FASE 04, PASO 0:**
  `20260902120000_fuente_de_no_conformidad.sql` — tarea `E00`, la de **F04·B0**,
  aplicada el 7 sep 2026.
  Afloja `hallazgos.auditoria_id` a nullable y añade `fuente_nc` + `fuente_detalle`:
  una no conformidad también nace de una queja, un incidente o un indicador.
  Probada en Docker con las **catorce anteriores en orden y con datos sembrados
  ANTES de aplicarla** —el camino real, no una base vacía—: **41 comprobaciones**,
  veinte de ellas de regresión. `src/types/database.ts` está regenerado desde ese
  esquema.
  ✅ **Es aditiva**: aflojar un NOT NULL nunca rechaza una fila que antes pasaba, y
  las dos columnas nuevas tienen default.
  ✅ **Sus once valores de `fuente_nc` se ampliaron a quince en `B1`** (hueco 15):
  cubrían cinco de las nueve etapas de `P-SG-05` §5.1, y entraron
  `incumplimiento_legal` —el núcleo de la Fase 05—, `informacion_documentada`,
  `capacitacion` y `satisfaccion_cliente`.
  **Lo que hay que saber:**
  - ⚠️ **VA ANTES QUE `acciones`, y ése es todo el punto.** Una acción cuelga de un
    hallazgo. Si el hallazgo todavía no sabe nacer de una queja, medio ciclo de
    acciones nace amputado y hay que rehacerlo con la fase encima. Por eso es un
    bloque propio (`B0`) y no parte de `B1`.
  - **Los valores de `fuente_nc` NO se inventaron.** Salen del catálogo
    documental del cliente que trajo el `F-SG-05`; nueve de once tienen un formato
    con nombre y número detrás (`F-SG-08` quejas, `F-SG-14` servicio no conforme,
    `F-SG-18` revisión por la dirección, `F-SG-26` seguimiento interno). Eso es la
    diferencia entre un CHECK que aguanta y uno que hay que abrir en tres meses.
  - ⚠️ **El CHECK de coherencia compara contra las TRES fuentes de auditoría, no
    contra `auditoria_interna` a secas.** `auditorias.tipo` ya incluye
    `certificacion_acompanamiento` y `proveedor`: con la versión simple, un
    hallazgo de un acompañamiento a certificación —que ya existe en la base— habría
    sido imposible de guardar. Y el relleno **deriva** la fuente de `auditorias.tipo`
    en vez de poner todo en interna, por lo mismo.
  - **Dos series de folio, y se cuentan distinto.** `AUD-2026-014/H-03` es el
    consecutivo de la **firma** (por eso `A10` tuvo que partirlo a mano con
    `DEMO-`); `NC-2026-007` es el consecutivo del **cliente** —«la séptima NC de
    esta planta este año», que es lo que su Coordinador del SGC lleva en el
    `F-SG-17`—. Como cuelga de `org_id`, **la partición sale gratis**; el prefijo
    `DEMO-NC-` se conserva sólo para poder contestar «¿esto es del cliente o es de
    mentira?». Las dos ramas **renumeran en vez de rechazar**.
  - ⚠️ **La `org_id` CAMBIA DE SITIO, no se afloja.**
    `heredar_org_de_la_auditoria()` **no se tocó** —la comparten seis tablas más y
    ahí la auditoría sí es obligatoria—; `hallazgos` estrena
    `resolver_org_del_hallazgo()`, y quien valida la organización que manda la fila
    es la política de INSERT, que es la que siempre decidió. **El trigger conserva
    su nombre** (`hallazgos_org`): de su lugar alfabético depende que
    `hallazgos_valida` compare contra una `org_id` ya puesta.
  - **El historial ahora sigue también `fuente_nc`, `fuente_detalle` y
    `auditoria_id`.** Reclasificar la fuente mueve el hallazgo dentro o fuera del
    informe de una auditoría; sin esos renglones, una NC podría entrar al `F-SG-12`
    de una auditoría ya emitida sin rastro de que antes era una queja.
  - ⚠️ **B0 NO trae pantalla, a propósito.** No hay forma de levantar una NC sin
    auditoría todavía — eso es `B1`. Lo único que queda pendiente del lado del
    cliente es `siguienteConsecutivo`, que cuenta por auditoría: con la serie por
    organización necesita otra clave, y esa clave tiene que entrar en
    `piezasDeLaPrecarga()` o el folio no sale sin red. No urge mientras no haya
    pantalla; el día que la haya, es lo primero.

- ✅ **LA ANTERIOR ES `D06`, TAMBIÉN APLICADA** (7 sep 2026):
  `20260831120000_programa_anual_por_proceso.sql` — tarea `D06`, la de F03·B6.
  Añade `programa_auditorias.alcance` y la tabla `programa_procesos`, que es donde
  vive la regla de frecuencia del `F-SG-09`. Probada en Docker con las **trece
  anteriores en orden**: **47 comprobaciones**, nueve de ellas de regresión.
  `src/types/database.ts` está regenerado desde ese esquema.
  ✅ **Es puramente aditiva**: una columna nullable y una tabla nueva.
  **Lo que hay que saber:**
  - ⚠️ **MANDA LA HOJA DE CÁLCULO, NO EL TEXTO DEL PROCEDIMIENTO.** `P-SG-03` §5.2
    dice «valor × NC = cantidad de auditorías»; el `F-SG-09` que la firma llena
    cada año calcula `puntos = valor × NC` y `auditorías = 1 si puntos ≤ 5, si no
    2`. Con 4 NC en un proceso de servicio, el texto pide **8** y la hoja pide
    **2**. Decisión del dueño (31 ago 2026), y **va en un CHECK**: un 8 en esa
    columna sería la prosa colándose por una captura manual. Vale como precedente:
    cuando un formato de trabajo y la prosa del procedimiento discrepen, gana el
    formato.
  - **El valor de un proceso se GUARDA, no se deriva de `procesos.tipo`.** Nuestro
    enum es `estrategico/operativo/soporte` y el del formato es «del servicio» vs
    «de soporte»: en el ejemplo de la firma, Compras y Transporte valen 1 aunque
    serían operativos, y el propio SGC vale 1. Es un juicio de la firma sobre ese
    cliente. La pantalla lo **propone**; la columna guarda lo que se decidió.
  - **`nc_previas` también se guarda**, aunque la pantalla lo traiga de
    `hallazgosDeLaCartera()` **en memoria y sin clave de caché nueva**. Un programa
    aprobado es evidencia: si el número se recalculara solo, anular un hallazgo en
    noviembre reescribiría lo que la Dirección firmó en enero.
  - ⚠️ **Los meses van en una columna `jsonb`, no en una tabla hija.** Una tabla
    `(renglón, mes)` necesitaría un índice único que no es la PK, y ahí la cola
    resuelve sus `upsert` por la PK (§6.1). Además marcar seis meses serían seis
    operaciones de la cola en vez de una.
  - **`puntos` y `auditorias_requeridas` son columnas generadas** y son seguras:
    enteros y un `case` sobre enteros son IMMUTABLE, al revés que `fecha::text`.
    La copia de la fórmula en `src/lib/auditorias/programaAnual.ts` existe **sólo**
    para que el número salga sin señal en la fila optimista; la base es la
    autoridad.

- ✅ **LLEGÓ `P-SG-05` Y LA FASE 04 SE DESTRABA** (7 sep 2026, cuarta tanda). El
  dueño entregó **una carpeta con 60 archivos: el SGC completo del cliente**, y
  dentro va el procedimiento de acciones correctivas que detenía `F04·B1` desde
  el 2 sep. ✅ **`F04·B1` ESTÁ COMPLETO** (8–9 sep 2026). `/acciones` lleva
  **cuatro pestañas** —Acciones · Quejas y sugerencias · Planes de mejora ·
  Cambios al SGC—, el análisis de causa del `F-SG-07` vive en la ficha del
  hallazgo, el `F-SG-06` y el `F-SG-07` **se imprimen en pareja**, y el widget
  `acciones_semana` está conectado.
  **Cuatro cosas del cierre que hay que saber:**
  - ⚠️ **LA RAMA `NC-` YA TIENE PANTALLA, así que el hueco 16 caducó.** Una queja
    procedente levanta su no conformidad desde `PanelQuejas` → `LevantarNCDeQueja`,
    y a partir de ahí **hay folios `NC-2026-00X` emitidos** — que no se recalculan.
  - ⚠️ **`siguienteConsecutivo` NO se extendió a la serie `NC-`, y es deliberado.**
    `B0` anotaba que haría falta otra clave en `piezasDeLaPrecarga()`; resultó más
    honesto **no calcularlo en el cliente**: se manda `consecutivo: 0`, lo asigna
    `sellar_folio_hallazgo()` y la fila optimista dice «sin folio hasta
    sincronizar». Una queja se captura en la oficina, no en un sótano — el motivo
    que hacía obligatoria la cuenta local en la planta aquí no aplica.
  - ⚠️ **`fuenteDeLaAuditoria()` arregla un fallo de datos que ya existía.**
    `crearHallazgo` no mandaba `fuente_nc` y la base ponía `auditoria_interna`,
    así que un hallazgo de un **acompañamiento a certificación** o de una
    **auditoría a proveedor** pasaba el CHECK pero quedaba contado como interno —
    el número que la Dirección del cliente mira. Ahora sale de `auditorias.tipo`,
    igual que hacía el relleno de la migración con el histórico.
  - **Los dos contenedores se eligen al levantar la acción**, en un solo
    desplegable (`plan:` / `cambio:`). Un selector por cada uno invitaría a llenar
    los dos, y no hay ningún caso del cliente en que eso signifique algo.
  Los `.docx`/`.xlsx` **no se commitean** (36 MB, ya en `.gitignore`); su
  sustituto son **doce fichas nuevas** en `docs/formatos_informeAuditorias/`, con
  el índice y el registro de huecos en su `README`.
  ⚠️ **DOS DECISIONES DEL DUEÑO, Y `E00` YA NO LAS CUBRE** —se aplicó el 7 sep—.
  Van en la migración de `B1`, que hay que escribir igual: **metidas ahí cuestan
  cero, olvidadas cuestan otra migración**:
  - **El CHECK de `fuente_nc` cubre CINCO de las NUEVE etapas** que `P-SG-05` §5.1
    tabula. Caen en `otro`: **incumplimiento legal** —que es el núcleo de la
    Fase 05—, información documentada, capacitación y satisfacción del cliente
    (que **no** es una queja: es el `F-SG-13` bajo meta). La novena, «acciones que
    no fueron efectivas», no es una fuente sino una **NC enlazada a otra NC**
    (`hallazgos.nc_origen_id`, §5.7). Ampliar el CHECK es aditivo: no rechaza
    ninguna fila que antes pasaba.
  - **El folio real del cliente es `AC-FA-01-25`, no `NC-2026-007`**: tipo de
    acción + dos letras del proceso + consecutivo **por proceso** + año, y es el
    folio de **la acción**, no del hallazgo. Mismo caso que la clave `AI-01-25`,
    que acabó en `auditorias.titulo`.
    ⚠️ **Ésta caduca y la otra no.** `B0` se aplicó **sin pantalla**, a propósito,
    así que hoy ninguna fila usa la rama `NC-`. En cuanto `B1` la tenga, hay
    folios emitidos — y un folio emitido no se recalcula.
  **Lo que `P-SG-05` aporta y no se sabía:** la corrección inmediata es una acción
  propia **con su propia fecha de vencimiento** (`P-SG-02` §5.2b); los **15 días
  hábiles** son sólo del análisis de causa —el 15/30/60/90 de `E03` es criterio de
  Summit, no del cliente—; el equipo de análisis es una **lista** de participantes;
  el seguimiento lo hace el **Auditor Interno** cuando la NC viene de auditoría y
  el Coordinador SGC en los demás casos; **reprogramar una fecha exige justificar
  la demora**, y **escala a Dirección** si hay reincidencia o queja de cliente; y
  la verificación de eficacia tiene **una segunda fecha** que se fija *después* de
  concluir las acciones.
  ✅ **Y llegaron los dos formatos que faltaban**: `F-SG-16` Plan de Mejora
  —⚠️ **no es «acciones con tipo mejora»**: es un contenedor con calendario anual
  P/R, la misma parrilla del `F-SG-09`— y `F-SG-24` Gestión de Cambios, que tiene
  **tres disparadores, no uno**: la acción correctiva, la **solicitud de cambio de
  un documento** (`P-SG-01` §5.7, que es Fase 02) y la sugerencia de cliente.
  ⚠️ **La tanda también toca las Fases 02, 05 y 06**, y eso no estaba previsto:
  `P-SG-04` trae **cuatro escalas de riesgo distintas** —y la de proceso **no es
  un producto, es un lookup asimétrico**—, `P-SG-06` trae objetivos compuestos y
  medición **por evento** en vez de por calendario, `P-SG-01` trae la codificación
  `A-BB-##` y las copias controladas, la **Matriz IPERC** completa es `F05·B1`, y
  `P-SG-08` **es la especificación de las categorías de aviso de `F04·B3`** —donde
  el cliente pide mensual, bimestral y por evento, y **no pide resumen diario**—.
  Los catorce huecos nuevos están tabulados como 15–28 en el `README` del catálogo.

- ✅ **LAS TRECE ANTERIORES YA LO ESTABAN.** La última de ellas fue
  `20260830120000_informe_de_auditoria.sql` —tarea `D05`, la de
  F03·B5— el 30 ago 2026. Es la más pequeña de todas: `auditorias.objetivo` y el
  trigger `sellar_emision_informe()`. Se probó en Docker con las **doce
  anteriores en orden**: **18 comprobaciones**, once de ellas de regresión.
  `src/types/database.ts` sale de ese esquema.
  **Lo que hay que saber:**
  - **`objetivo` no es `alcance`.** El objetivo dice *para qué* se audita y el
    alcance *qué* se audita, y los dos formatos de la firma abren con «Objetivo».
    No bastaba el de `programa_auditorias`: `programa_id` es NULLABLE, así que una
    preauditoría o una de seguimiento se quedaban sin ninguno.
  - ⚠️ **`informe_emitido_en` existía desde la Fase 03 y NUNCA lo escribió nadie.**
    La pestaña Plan llevaba desde entonces diciendo «Sin emitir» sin manera de
    cambiarlo. Ahora lo sella el servidor, y **descarta cualquier fecha que mande
    el navegador**: emitir es de oficina, y el plazo de una semana de `P-SG-03`
    §5.4.5 se mide contra ella. Reemitir vuelve a sellar; retractar (null) no.

- ✅ **LA PARTICIÓN DE PRUEBAS ESTÁ APLICADA** (30 ago 2026, por el dueño):
  `20260825120000_particion_de_pruebas.sql` y
  `20260825120100_storage_particion_de_pruebas.sql`, tarea `A10`. Parten la base
  en dos con **una sola igualdad**, `organizaciones.es_demo = soy_dev()`: a un
  lado la cartera real del cliente, al otro la de demostración, que sólo ve una
  cuenta con `usuarios.es_dev`. Ninguna ve a la otra, y el candado está en el RLS.
  Probadas en Docker con las diez anteriores en orden **y con datos sembrados
  antes de aplicarlas** —el camino real, no una base vacía—: **76 comprobaciones
  de comportamiento**, catorce de ellas de regresión. `src/types/database.ts` está
  regenerado desde ese esquema.
  **Lo que hay que saber para no romperlo:**
  - **`dev` NO es un rol, es una marca ENCIMA del rol.** Con un sexto valor en el
    CHECK de `usuarios.rol`, `es_socio()` sería falso para la cuenta de pruebas y
    ésa no podría dar de alta un cliente, importar el catálogo, borrar ni repartir
    equipo — justo lo que hay que poder probar. `ROLES` en
    `src/lib/auth/roles.ts` **no se toca**.
  - ⚠️ **`mis_organizaciones()` CAMBIÓ DE SIGNIFICADO y ninguna política nueva
    lleva ya `or public.es_socio()`.** Devuelve «todo lo que puedo ver, ya
    filtrado por partición», la rama del socio incluida. Esa rama suelta en cada
    política era una puerta lateral que se salta cualquier filtro: un socio de
    pruebas la cruzaba y veía los clientes reales. Se quitó de las 32 políticas de
    dominio, y **volver a escribirla en una tabla nueva reabre el agujero**. Para
    un socio no-dev el resultado es idéntico al de antes. §8.2 · docs/08 §2.1.
  - **Todo lo que lleva `org_id` se parte solo**; ni una política de dominio
    menciona `es_demo`. Lo que sí lo lleva es `organizaciones`, `normas` y
    `norma_clausulas` — la cláusula lo hereda de su norma, y si la norma cambia de
    lado sus cláusulas la siguen.
  - ⚠️ **`normas.clave` pasó de `unique (clave)` a `unique (clave, es_demo)`, y
    por eso el importador ya NO hace `upsert` sobre `clave`** (misma regla que
    `requisitos` y `mediciones`, §6.1). Sin ese cambio la cuenta de pruebas no
    podría importar su propio `iso_9001` mientras exista el del cliente, y su
    cartera de demostración se quedaría con un alcance apuntando a normas
    invisibles.
  - **`config_firma.plantillas` es lo único que la base NO puede partir** —una
    tabla de una fila—, así que se separa por espacio de nombres dentro del jsonb
    (`plantillas.dev`), desde `src/lib/auth/particion.ts`. Por eso
    `leerPlantillaTareas`/`leerPlantillaVerificacion` reciben `esDev` **y la clave
    de caché lo lleva dentro**: sin él, cambiar de cuenta en el mismo navegador
    serviría la plantilla de la otra partición desde la caché persistida.
  - **El consecutivo de folios también se partió.** `asignar_folio_auditoria()`
    cuenta fuera del RLS, así que una auditoría de prueba se llevaba el
    `AUD-2026-007` y el cliente pasaba del 006 al 008. La partición de pruebas usa
    `DEMO-`, y la migración renumeró las auditorías viejas para que la primera
    real sea `AUD-2026-001`.
  - **El distintivo `DEV` de la Navbar es PERMANENTE**, al revés que
    `EstadoConexion`. Las dos carteras se ven idénticas; sin él, «¿esto que estoy
    borrando es del cliente o es de mentira?» no tiene respuesta en pantalla.
    ⚠️ **Y NO sirve para comprobar que la partición quedó**: vive en el código, no
    en la base, así que no aparece hasta desplegar. El aislamiento en cambio es
    efectivo en cuanto se aplica la migración, con el build que ya esté en línea.
    La comprobación buena es el bloque de diagnóstico de `docs/09` · `A10`, que
    simula la sesión con `set_config('request.jwt.claims', …)` y pregunta
    `soy_dev()` y `mis_organizaciones()`.
  - ⚠️ **«Marqué mi cuenta y la app sigue vacía» tiene DOS causas, y ninguna es
    Vercel.** Una: el `update ... where correo = '…'` afectó cero filas, casi
    siempre por una mayúscula —`usuarios.correo` se copia tal cual de
    `auth.users.email`—. Dos: la caché persistida guardó la lista vacía que era
    correcta entre aplicar la migración y marcar la cuenta, y `staleTime` son
    cinco minutos. Se cura con una recarga forzada o cerrando sesión. `docs/09` ·
    `A10` lo tiene tabulado.
  - ⚠️ **Dejó el `npm run build` en ROJO durante seis días, y ya está arreglado**
    (30 ago 2026). `conPlantilla()` en `src/lib/auth/particion.ts` devolvía
    `Record<string, unknown>`, y eso **no es asignable a una columna `jsonb`**:
    TypeScript no puede comprobar que un `unknown` sea serializable, así que los
    dos `.update({ plantillas })` —`tareas.ts` y `verificacion.ts`— fallaban con
    TS2322. Ahora el archivo se tipa contra `Json` de `src/types/database.ts`
    (regla 9). ⚠️ **Se coló porque `npm run lint` pasa limpio**: el error es sólo
    de tipos, y la comprobación de tipos vive en `npm run build`. Hay que correr
    los dos, siempre — está en §Cómo trabajar y no es opcional.
  - ⚠️ **De paso se cerró un agujero que ya existía en Storage**:
    `documentos_borrar` y `evidencias_borrar` decían `es_socio()` sin mirar la
    ruta, así que un socio podía borrar objetos con rutas que
    `org_de_la_ruta()` no sabe leer — y que por tanto nadie puede ver.
- **La lista del cliente vive en `docs/11_TAREAS_DEL_CLIENTE.md`** (25 ago 2026).
  Lo que se **captura dentro de la app** —cartera, proyectos, catálogo de normas,
  alcance, equipo, documentos, auditorías— salió de `docs/09`, que se queda con lo
  técnico: paneles, llaves, migraciones y buckets. Las tareas que se mudaron
  (`B01`, `B02`, `B03`, `B04`, `C01`, `C02`) dejaron su renglón con el enlace para
  que las claves de `docs/02` sigan resolviendo. **Está escrita para alguien que
  no programa**, con la navegación pantalla por pantalla: si cambias una etiqueta
  de la interfaz que aparezca ahí, corrígela en el mismo commit.
- **Fase 00 cerrada, Fase 01 completa por el lado del código (B0 → B6), y
  Fase 02 escrita entera** (B2, B2b, B3, B4). De la Fase 01: el lenguaje visual
  sin tarjetas y el kit de captura, `/cartera` con su directorio y el expediente
  `/cartera/[id]`, proyectos con su alcance, el importador de normas, el tablero,
  la bitácora, las tareas por etapa y la depuración. **Está desplegado en Vercel
  y en uso.** Lo que falta para dar la Fase 01 por cerrada es **la prueba del
  criterio de cierre con datos reales y una segunda cuenta**, más las tareas del
  dueño `B01`–`B04`.
- **De la Fase 02 (22 ago 2026):** `/sistemas` deja de ser el catálogo de normas
  y se vuelve el dominio completo, con seis pestañas —Documentos · Requisitos ·
  Procesos · Riesgos · Indicadores · Normas— y un **selector de cliente en el
  query string** (`?org=`). Control documental con ciclo de vida y Markdown
  (`src/lib/documentos/`: lector de ZIP propio, `.docx` → md, PDF → md, visor sin
  `dangerouslySetInnerHTML`), adjuntos con cola propia, matriz de requisitos con
  su porcentaje de avance, y procesos, riesgos e indicadores. `npm run lint` y
  `npm run build` pasan limpios. **Falta probarlo contra la base real**: nada de
  esto se ha ejecutado todavía contra Supabase, porque las migraciones las aplica
  el dueño. **Lo que SÍ está probado son las migraciones**: se aplicaron las ocho
  en orden sobre un Postgres 17 desechable y pasaron 17 comprobaciones de
  comportamiento (herencia de `org_id`, sello de la firma de aprobación,
  jubilación de la versión anterior, rechazo de editar una aprobada, `no aplica`
  sin justificación, tarea con evidencia obligatoria sin adjunto, organización
  con documentos). Los tipos generados desde ese esquema salieron **idénticos**
  a `src/types/database.ts`.
- **LA FASE 03 ESTÁ COMPLETA POR EL LADO DEL CÓDIGO (`B0`–`B6`).** `B6` se abrió
  el 31 ago 2026 al transcribir los tres formatos de la segunda tanda —`F-SG-09`,
  `F-SG-07` y `F-SG-03`— y cerró cuatro huecos que no se podían ver sin ellos: el
  alcance del programa anual, la parrilla de frecuencia por proceso, y la
  impresión del `F-SG-09`, el `F-SG-03` y el `F-SG-11`.
  ⚠️ **Con la lista de asistencia, las reuniones de apertura y clausura dejan de
  ser un hueco de evidencia**: `P-SG-03` §5.4.1 las exige por escrito y hasta hoy
  la app no tenía forma de demostrar que ocurrieron.
  ⚠️ **Y se imprime PRELLENADA, no en blanco.** Evento, objetivo, fecha, lugar y
  los puestos que la app ya sabe; en blanco sólo la columna FIRMA y seis renglones
  de sobra. Una parrilla vacía es un PDF que cualquiera saca de un Word — misma
  lección que las casillas ☐ del `F-SG-06`. `/auditorias`
  es el dominio, con dos pestañas —Auditorías y Programa anual— y su ruta de
  detalle `/auditorias/[id]`, que dentro lleva **ocho**: Plan · Alcance · Lista de
  verificación · Equipo · Agenda · Recorrido · Hallazgos · **Informe**, y el
  dominio tiene su tablero del lunes. `npm run lint` y
  `npm run build` pasan limpios. **Lo que sí está probado es la migración**: se aplicó sobre un
  Postgres 17 desechable con las siete anteriores en orden y pasó **42
  comprobaciones de comportamiento** (folio de la firma que cruza organizaciones,
  renumeración de un hallazgo en colisión, la lista de verificación sólo de hojas
  e idempotente, hallazgo sin cláusula o con evidencia en blanco rechazado, el
  historial escrito por la base, y que **ni el socio ni `service_role`** borren un
  hallazgo o reescriban el historial). Los tipos se regeneraron desde ese esquema.
- ✅ **APLICADA** (`D04`, la de F03·B3):
  `20260824180000_evidencia_de_campo.sql`. Le añade
  `item_id` a `adjuntos` —la foto y la nota dictada de un punto de la lista— y
  **cierra un agujero**: un `on delete cascade` se salta el RLS, así que quitar un
  punto de la lista se habría llevado por delante fotos que sólo un socio puede
  borrar. Ahora un punto con evidencia no se quita. Probada en Docker con las
  nueve en orden: **53 comprobaciones**, las 42 de `D00` más 11 nuevas.
  `src/types/database.ts` está regenerado desde ese esquema.
- ✅ **LAS OCHO ANTERIORES ESTÁN APLICADAS** (24 ago 2026, por el dueño). Las
  cuatro últimas fueron, en orden:
  1. `20260821220000_tareas_y_depuracion.sql` — tarea `B00b`. Crea `tareas_etapa`
     y abre el DELETE de organizaciones y proyectos al socio.
  2. `20260822120000_sistemas_de_gestion.sql` — tarea `C00`. **Todo** el esquema
     de la Fase 02, y amplía `puedo_borrar_org()` / `puedo_borrar_proyecto()`.
  3. `20260822120100_storage_documentos_y_evidencias.sql` — tarea `C00`. Los
     buckets `documentos` y `evidencias` y sus políticas. **Aparte a propósito**:
     toca `storage.objects`, que no es un esquema nuestro, y si falla por permisos
     no puede llevarse por delante el esquema del dominio.
  4. `20260824120000_auditorias_y_hallazgos.sql` — tarea `D00`. **Todo** el
     esquema de la Fase 03, la RPC `generar_lista_verificacion()`, y los dos
     candados de la regla 13. Añade `hallazgo_id` a `adjuntos` y **termina** de
     ampliar `puedo_borrar_org()` / `puedo_borrar_proyecto()`.

  `src/types/database.ts` sale de ahí. Se regenera con
  `npx supabase gen types typescript --linked` **en el mismo commit** que toque
  el esquema.
- **`C01` y `B03` están hechas** (24 ago 2026): el árbol de cláusulas validado y
  el catálogo de normas subido. Es lo que destraba F03·B2 — sin cláusulas,
  `generar_lista_verificacion()` devuelve cero.
- **Quién cerró una tarea y cuándo lo escribe la base**, no el navegador
  (`sellar_tarea_hecha()`) — igual que el renglón de cambio de etapa. Una fecha
  que viaja desde el cliente es una fecha que se puede escribir a mano; está
  comprobado que mandar `hecha_por` de otro se sobrescribe.
- **Se puede borrar, y sólo el socio**: organizaciones y proyectos, con
  `puedo_borrar_org()` / `puedo_borrar_proyecto()`. **Las dos están COMPLETAS
  desde la Fase 03**: una organización con documentos, auditorías o hallazgos ya
  no se borra, y un proyecto con documentos o auditorías tampoco. No quedan
  líneas comentadas dentro. La tercera es `puedo_borrar_documento()`: un
  documento con alguna versión aprobada u obsoleta es evidencia y no se borra; un
  borrador capturado por error, sí.
- ⚠️ **`hallazgos`, `auditorias` y `hallazgos_historial` no se borran NUNCA, y no
  bastaba con no poner la política.** `service_role` **se salta el RLS**: sin
  política de DELETE se detiene a `authenticated` y a nadie más. Van los mismos
  dos candados que `audit_logs` —**revocar el permiso** a los tres roles y un
  **trigger que grita** (`impedir_borrado_de_evidencia()`,
  `impedir_cambios_historial()`)—, porque el primero lo deshace sin querer el
  próximo `grant all on all tables`, que es justo lo que hace la migración de
  permisos. §8.2 · docs/08.
- ⚠️ **En la Fase 03 la regla de las fechas CAMBIA a medias, y no la deshagas.**
  El **QUIÉN** lo sella siempre la base (`auth.uid()`). El **CUÁNDO** depende de
  dónde pasó la cosa: una acción de **campo** —`auditoria_items.evaluado_en`,
  `hallazgos.detectado_en`— la manda **el reloj del teléfono**, porque el auditor
  evaluó a las 10:15 en modo avión y la fila llega a las 14:00: un `now()` del
  servidor pondría en el informe la hora en que volvió el semáforo, no la hora en
  que se vio el extintor descargado. Una acción de **oficina** —aprobar el
  programa, cerrar un hallazgo o una auditoría— la sella el servidor. Y no se
  pierde nada: `creado_en` y `actualizado_en` siguen siendo suyos, así que un
  reloj mal puesto se nota. docs/04 · Fase 03.
- **El folio de una auditoría lo asigna la BASE; el de un hallazgo lo compone el
  teléfono y la base lo RENUMERA si choca.** `AUD-2026-014` es el consecutivo de
  la firma y `asignar_folio_auditoria()` lo calcula fuera del RLS —un consultor no
  ve las auditorías de los demás para poder contarlas—, así que una auditoría
  encolada sin señal **aparece sin folio hasta sincronizar** y la pantalla lo
  dice. En cambio **`hallazgos` NO tiene `unique (auditoria_id, consecutivo)`, a
  propósito**: dos auditores en la misma planta sin señal levantan los dos un
  `H-03`, y un índice único rechazaría al segundo media hora después y sin nadie
  mirando. `sellar_folio_hallazgo()` renumera al llegar — un número corrido se
  edita, un hallazgo perdido no se recupera. §8.7.
- **`/auditorias` NO pide elegir cliente**, al revés que `/sistemas`. Allá cinco
  de seis pestañas son el expediente de *una* organización; aquí la semana de un
  auditor cruza la cartera —el lunes abre «qué tengo esta semana»—. Se descarga la
  lista visible una vez y el filtro por cliente, estado y texto va **en memoria**.
  La ruta de detalle sí existe: `/auditorias/[id]`, con Plan · Alcance · Equipo ·
  Agenda.
- **De las normas del ALCANCE sale la lista de verificación**, no del proyecto:
  `generar_lista_verificacion()` toma sólo las cláusulas **hoja** auditables y
  activas —poner también el capítulo «8» y sus hijas duplicaría el recorrido—, es
  **idempotente** y **no pisa lo ya evaluado**. Es `SECURITY INVOKER` a propósito:
  el INSERT pasa por la política, así que el papel `lectura` no genera nada.
- **Un hallazgo NO se borra, y eso empieza en el código** [F03·B4].
  `src/lib/queries/hallazgos.ts` **no tiene función de borrado** y la ficha no
  tiene botón: se **anula con motivo** —lo exige el CHECK— o se reclasifica, y las
  dos dejan su renglón en `hallazgos_historial`. Ofrecer un botón que termina en
  42501 es peor que no ofrecerlo. Regla 13.
- **El consecutivo de un hallazgo se calcula sobre la CACHÉ**
  (`siguienteConsecutivo`), no preguntándole al servidor: en la planta no hay a
  quién preguntar. Y por eso **los hallazgos ya levantados van en la precarga** —
  sin ellos esa cuenta no se puede hacer y el folio no sale sin red.
- **La ayuda de clasificación se pinta al elegir el tipo**, no en un manual: es lo
  que hace que dos auditores clasifiquen igual. ⚠️ `CRITERIO_HALLAZGO` en
  `src/lib/auditorias/catalogos.ts` **ya trae el criterio de la firma** para los
  tres tipos que `P-SG-03` §3 define —NC mayor, NC menor y observación—, que es lo
  que cerró `D02` el 30 ago 2026. ⚠️ **`oportunidad_mejora` y `conformidad` siguen
  con el texto de arranque**: ese procedimiento no los define porque el cliente
  para el que se escribió no los usa, y el informe necesita los cinco.
- **El tablero del lunes NO tiene vista en la base**, igual que los widgets del
  tablero: agrupa y calcula la antigüedad en memoria sobre la lista ya bajada. Una
  vista sería otra clave que puede faltar en la caché, y esa pantalla se abre con
  media barra de señal. docs/04 lo deja anotado como aplazado.
- ⚠️ **Un embebido de PostgREST tiene que ser UN literal, no `'a' + 'b'`.** La
  concatenación con `+` se ensancha a `string`, y con un `string` cualquiera
  supabase-js ya no infiere la forma de la fila: devuelve `GenericStringError` y el
  `as` deja de compilar. Un `${}` sobre constantes literales sí lo conserva.
- **La precarga de una auditoría es lo que decide si la Fase 03 sirve** [F03·B3].
  La caché sólo tiene lo que alguien ya abrió: sin pulsar «Descargar para trabajar
  sin señal», en la planta la pantalla del recorrido sale **vacía** —no se
  perdieron los datos, nunca se bajaron— y para cuando se nota el auditor ya está
  en un sótano. **Once** piezas, en `src/lib/auditorias/precarga.ts` — la última
  es el membrete de la firma, y entró con B5.
  ⚠️ **El aviso «lista para trabajar sin señal» se calcula mirando la CACHÉ**
  (`faltaPorPrecargar()`), no un `useState`: con un booleano en el componente,
  salir de la pestaña y volver diría «descarga antes de entrar» con todo bajado, y
  eso hace que alguien se dé la vuelta en la puerta. §8.11.
- **El contador de pendientes del recorrido es PERMANENTE**, al revés que el de la
  Navbar. Allá un indicador que siempre está se deja de mirar; aquí es la única
  prueba de que las tres horas de trabajo siguen ahí, y el auditor lo mira cada
  pocos minutos.
- **Una nota de voz es un ADJUNTO, no un almacén propio** [F03·B3]. `docs/03` §2
  anunciaba un `src/lib/offline/dictados.ts` y resultó ser una capa de más: un
  dictado es justo lo que ya sabe hacer la cola de adjuntos, y darle almacén
  propio obligaba a subir `VERSION_BD` de `idb.ts` otra vez — un número que, si se
  olvida, **falla sólo en el teléfono del consultor** y nunca en desarrollo.
  ⚠️ `MediaRecorder` **no existe fuera de contexto seguro**, igual que el service
  worker y `crypto.randomUUID()`. Desde `http://192.168.x.x:3000` no hay
  grabadora; la pantalla lo comprueba y lo dice.
- ⚠️ **Un `on delete cascade` SE SALTA EL RLS.** Se pagó al añadir
  `adjuntos.item_id`: la política de `adjuntos` sólo deja borrar evidencia a un
  socio, pero quitar un punto de la lista lo hace cualquier editor — y el cascade
  se habría llevado sus fotos en silencio, sin pasar por esa política y sin nadie
  a quien preguntarle. La condición se puso en la política del punto: uno con
  hallazgo **o con adjuntos** no se quita. Vale para toda FK nueva que apunte a
  algo con política de borrado más estricta que su padre.
- **Las columnas de campo dominante de `adjuntar()` salen de `CAMPOS_DOMINANTES`,
  no escritas a mano.** Estaban a mano, y por eso `hallazgo_id` se quedó fuera al
  añadirlo: la lista y el trigger se actualizaron y ese objeto no, así que la foto
  de un hallazgo habría viajado sin su campo dominante y habría acabado colgada
  del cliente entero.
- **El informe reproduce el `F-SG-12` de la firma** [F03·B5], que llegó con `D01`
  el 30 ago 2026 junto con el procedimiento `P-SG-03` y dos formatos más. Los
  cuatro están transcritos en `docs/formatos_informeAuditorias/` — **los `.docx` y
  `.xlsx` no se commitean**, esos Markdown son su sustituto y llevan el mapeo campo
  por campo. **El orden de las nueve secciones no se cambia**: es el documento que
  el cliente ya sabe leer.
  ⚠️ **La regla que decide si B5 sirve: el informe NO introduce ni una clave de
  consulta nueva.** Se genera en la reunión de cierre, en la planta y sin señal, así
  que sus nueve consultas son literalmente las que baja `piezasDeLaPrecarga()`. Al
  escribirlo apareció el hueco: `config_firma` sólo se leía para `plantillas`, y su
  **identidad** —razón social y logotipo— no estaba en ninguna clave. Es
  `src/lib/queries/firma.ts`, `firma.identidad()` y la **undécima pieza** de la
  precarga; sin ella el documento sale **sin membrete**, delante del cliente.
  ⚠️ **Los hallazgos `anulado` NO se imprimen.** Siguen en la base con su motivo y
  su historial —regla 13—, pero no son un resultado de la auditoría: meterlos en el
  documento que ve el cliente convertiría un error del auditor en una acusación
  contra su empresa. Se filtra por `estado !== 'anulado'`, no por una lista blanca,
  para que un estado nuevo entre solo.
- **Lo imprimible vive en `src/lib/plantillas/`, devuelve una CADENA y no
  consulta.** `impresion.ts` tiene la paleta **en hexadecimal** —la ventana de
  impresión no hereda `globals.css`, docs/05 §6—, `esc()` para escapar **cada**
  interpolación, el armazón `@page`, la apertura de la ventana y, desde B6, el
  **membrete y el pie compartidos** (`membrete()`, `pieConfidencial()`,
  `tituloSeccion()`, `rotulo()`). Salieron de `informeAuditoria.ts` cuando hubo un
  segundo documento que los quería idénticos: un membrete escrito cuatro veces
  acaba distinto en cada entregable.
  ⚠️ **La misma cadena se enseña en pantalla dentro de un `<iframe sandbox>`
  vacío**: un solo renderizador, así que lo que se ve es lo que sale por la
  impresora, y el documento queda sin permisos. `esc()` no es opcional — ahí no
  protege React, y la descripción de un hallazgo la escribió una persona.
  ⚠️ **Y sigue sin haber librería de gráficas.** El informe tiene su sección
  «Gráficos de resultados», que era justo la condición del aplazamiento de
  `docs/02`; se revisó y no entra: esto se genera sin señal, y un chunk que se
  carga bajo demanda es un chunk que no está. Barras nativas con su número
  absoluto al lado.
- **La plantilla de listas de verificación NO es una tabla** [F03·B2]: vive en
  `config_firma.plantillas` bajo la llave `verificacion`, exactamente como la de
  tareas vive bajo `tareas`. Es configuración de la firma —una tabla para esto
  sería una tabla con una fila— y **se define con el ejemplo**: el auditor deja
  bien la lista de un cliente y un socio la guarda para los siguientes.
  ⚠️ Se guarda por **clave de norma** y por **giro normalizado** (`giro` es texto
  libre en `organizaciones`, y sin normalizar la firma acaba con tres plantillas
  que son la misma), con `general` de respaldo — y el respaldo **no se mezcla**
  con el del giro. Y se guarda el **`numero`** de la cláusula, no su `id`: es lo
  que un auditor reconoce y lo que hace legible el jsonb.
  ⚠️ **El reparto que no hay que romper: la BASE decide QUÉ se audita y la
  plantilla CÓMO se pregunta.** Al aplicarla, una cláusula que la plantilla
  nombra y que **no está en el alcance se omite y se avisa** —meterla sería
  auditar fuera de alcance—, y un punto **ya evaluado no se toca**, porque
  reescribir la pregunta debajo de un «conforme» ya dado deja el veredicto
  contestando algo que nadie preguntó.
- **El catálogo de normas se SUBE, no se siembra.** `normas` y `norma_clausulas`
  nacen vacías y las llena un socio con un `.md` propio desde `/sistemas`
  (`src/lib/normas/importador.ts`). Es lo que mantiene el criterio técnico de la
  firma fuera de Git —regla 12— y lo que permite corregir un resumen sin una
  migración. El importador es **idempotente** y lo que desaparece del archivo se
  marca `activa = false`, nunca se borra.
- **El detalle de un proyecto NO tiene ruta propia**: se abre con
  `?proyecto=<id>` sobre la pestaña de proyectos del expediente. La única ruta de
  detalle de la cartera es `/cartera/[id]` — los dominios son páginas con
  pestañas (§2.1). **El expediente de un documento sigue el mismo patrón**:
  `?documento=<id>` sobre `/sistemas?tab=documentos&org=<id>`.
- **`/sistemas` pide un cliente, y vive en la URL.** Cinco de sus seis pestañas
  son de *un* cliente, no de la cartera entera: el selector escribe `?org=<id>`,
  así que cambiar de pestaña no lo pierde y el enlace se puede mandar por correo.
  Una `org` que ya no está —enlace viejo, cliente borrado, expediente de otro
  consultor— cae en «ninguna», nunca en una pantalla consultando con un id
  fantasma. Normas no lo pide: el catálogo es de la firma.
- **Cuatro reglas del control documental las sostiene la BASE, no la pantalla**
  [F02·B2]: una versión aprobada no se sobrescribe
  (`proteger_version_aprobada()`); aprobar **jubila** a la anterior y apunta el
  documento a la nueva en una sola escritura del cliente
  (`jubilar_version_anterior()`) —tres operaciones de la cola podrían llegar
  desparejadas sin señal, y un documento con dos versiones aprobadas a la vez es
  el hallazgo que la firma le levanta a sus clientes—; quién aprobó y cuándo lo
  escribe el servidor (`sellar_version_documento()`); y un documento con una
  versión aprobada no se borra. La interfaz sólo evita ofrecer botones que ya
  están garantizados a fallar.
  ⚠️ `elaboro_id` y `reviso_id` **no se sellan**: son capturables. Firmar como
  revisor a quien sólo movió el estado sería inventar una firma.
- **La conversión de documentos pasa en el NAVEGADOR y devuelve estructura, no
  HTML.** `src/lib/documentos/` trae un lector de ZIP propio (~80 líneas con
  `DecompressionStream('deflate-raw')`, sin `jszip`), `.docx` → Markdown con
  RegEx sobre `word/document.xml`, PDF → Markdown con `pdfjs-dist`, y un
  analizador que el visor pinta como nodos de React. ⚠️ **Ni una línea de
  `dangerouslySetInnerHTML`**: ese texto viene del Word que mandó un cliente por
  correo, y un `<img onerror=…>` escondido ahí correría en la sesión de un
  consultor que ve los expedientes de todos los clientes.
- **La cola de adjuntos son DOS colas, y el reparto importa** [F02·B2b]: **la
  fila** de `adjuntos` va por el `outbox` normal —así conserva su orden respecto
  a las demás escrituras— y **el binario** por la cola propia de
  `src/lib/offline/adjuntos.ts`, que se vacía **después** de los datos. Al revés,
  marcar hecha una tarea con `exige_evidencia` llegaría antes que su adjunto y
  `sellar_tarea_hecha()` la rechazaría justo al recuperar la señal, con el
  auditor ya fuera de la planta.
  ⚠️ `ALMACEN_ADJUNTOS` obligó a subir `VERSION_BD` de 1 a 2 en
  `src/lib/offline/idb.ts`. Un `createObjectStore` sin tocar ese número no hace
  nada, y falla **sólo en el teléfono del consultor** —donde la base ya existía—,
  nunca en un equipo de desarrollo.
- **`upsert` NO se usa con un índice único que no sea la clave primaria.**
  `requisitos (proyecto_id, clausula_id)` y `mediciones (indicador_id, periodo)`
  eligen `insert` o `update` mirando la fila que ya está en la caché. La cola
  resuelve sus `upsert` por la clave primaria, así que un segundo cambio sin
  señal llegaría con otro `id` y chocaría contra el índice — un rechazo que
  aparece media hora después y sin nadie mirando (§6.1).
- **La migración 3 está aplicada** (21 ago 2026).
  `supabase/migrations/20260821180000_cartera_y_proyectos.sql` creó `sitios`,
  `contactos`, `proyectos`, `proyecto_normas`, `proyecto_sitios`,
  `bitacora_proyecto`, `normas` y `norma_clausulas` —estas dos **vacías**, las
  llena el importador de `.md` de F01·B2b—, con `puedo_editar_org()`,
  `heredar_org_del_proyecto()`, `validar_sitio_del_proyecto()` y
  `registrar_cambio_etapa()`. `npx supabase migration list --linked` da las cinco
  con `local = remote`, y `src/types/database.ts` regenerado salió idéntico al
  del repositorio.
- **La primera migración está aplicada.**
  `supabase/migrations/20260820160600_esquema_base_y_bitacora.sql` creó
  `usuarios`, `organizaciones`, `usuarios_organizaciones`, `config_firma`,
  `audit_logs` y `notificaciones`, con `mis_organizaciones()`, `es_socio()`, el
  trigger genérico `registrar_bitacora()` y las políticas de todas ellas.
  `src/types/database.ts` sale de ahí — se regenera con
  `npx supabase gen types typescript --linked` **en el mismo commit** que toque
  el esquema.
- **El guard ya conoce los roles.** `src/proxy.ts` manda a `/login` sin sesión y
  a `/mfa` a quien tenga un factor sin verificar o un rol que lo exija (`socio`,
  `administracion`). La consulta a `usuarios` sólo se paga cuando la cuenta no
  tiene ningún factor: ver `faltaSegundoFactor()`.
- **Turnstile está encendido y funcionando** (F00·B3 + `A08`, confirmado el
  21 ago 2026). El widget vive en `/login`, pero **quien valida el token es
  Supabase**, no la app: viaja en `options.captchaToken` de
  `signInWithPassword`. Comprobarlo en el navegador —o en un `/api/turnstile`
  propio— sería decorativo, porque el endpoint de autenticación de Supabase es
  público y quien quiera probar contraseñas no pasa por la pantalla.
  ⚠️ Son **dos mitades** y ahora las dos están puestas: el widget (aquí) y la
  protección en el panel de Supabase. Se apagan juntas y en ese orden —primero
  el panel, después la variable—: con el widget solo el token se ignora, y con
  la protección sola **no entra nadie**.
- **Ya hay un `socio`:** `herrliebert@live.com`, ascendido a mano y con su TOTP
  enrolado. La cuenta se creó *después* de la migración, así que el arranque
  automático del primer socio no ascendió a nadie y **ya no volverá a correr**:
  toda cuenta nueva nace `cliente` —el rol de menos privilegio, y nunca leído de
  `raw_user_meta_data`—, y hay que ascenderla a mano
  (`docs/09_TAREAS_DEL_DUENO.md` · A04).
- ⚠️ **Cargar variables en Vercel no basta: hay que redesplegar.** Las
  `NEXT_PUBLIC_*` se incrustan durante el build y el guard corre en el Edge, así
  que el despliegue que ya está en línea sigue viendo lo que había al compilar.
  Síntoma: **503 «SummitApp no está configurada todavía»** con las variables bien
  puestas en el panel. `docs/09_TAREAS_DEL_DUENO.md` · A09.
- **La capa offline ya existe y es obligatoria.** `src/lib/offline/` tiene el
  almacén de IndexedDB, la cola (`cola.ts`), `offlineWrite` (`mutate.ts`), el
  vaciado (`sync.ts`) y la persistencia de la caché (`persistencia.ts`); las
  claves viven en `src/lib/query/keys.ts` y el proveedor es
  `src/components/ProveedorConsultas.tsx`. **Toda lectura por `useQuery` con una
  clave de `keys.ts`; toda escritura por `offlineWrite`.** Una consulta suelta
  dentro de un componente ya no es "todavía no", es saltarse la capa.
- **Hay una pantalla de respaldo sin conexión:** `src/app/~offline/page.tsx`. El
  service worker la precachea y la sirve cuando una navegación no está ni en la
  red ni en la caché. Sin ella, esa navegación caía en la pantalla de error del
  navegador — que no dice el nombre de la app ni menciona que lo guardado sigue a
  salvo, y en campo se lee como que la app perdió el trabajo. Va fuera de
  `(dashboard)` y **excluida del matcher**, igual que `fallback-*.js`.
- **NADA lleva tarjetas, y el tablero es la plantilla del resto** [F01·B0].
  Cada bloque o fila es texto flotando sobre el fondo, con su icono y delimitado
  **por debajo** con el verde de Summit; el marco sólo aparece mientras se
  arrastra un widget. Los bloques salen de
  `src/components/tablero/RejillaTablero.tsx` y las filas de
  `src/components/ui/Lista.tsx` — uno de los dos sirve para casi todo.
  ⚠️ Tres excepciones, y son de mecánica: los **controles** conservan su marco
  (un `<input>` sin borde no se ve pulsable), el **modal** lleva superficie
  porque es una capa por encima y no una caja dentro, y el **armazón** sigue en
  navy. `ui/Card.tsx` ya no existe. §5 · docs/05_SISTEMA_DE_DISENO.md §4.3.
- **Quién ESCRIBE en una organización lo decide `puedo_editar_org()`**, no
  `mis_organizaciones()`. El `SELECT` de una tabla de dominio filtra por
  organización asignada; el `INSERT` y el `UPDATE` pasan además por esa función,
  que **excluye al papel `lectura`**. Desde F01·B1 el papel de
  `usuarios_organizaciones` tiene consecuencias reales, y el reparto se hace en
  la pestaña **Equipo** del expediente — no en `/admin`, que llega en la Fase 06.
  §8.2 · docs/08 §2.
- **Los widgets del tablero NO tienen vistas en la base**: se calculan en
  memoria (`src/lib/tablero/calculos.ts`) sobre listas que ya están en la caché,
  y cada uno comparte la consulta de su pantalla — los cuatro de la cartera con
  `/cartera?tab=proyectos`, los tres de auditorías con `/auditorias`. Una vista
  por widget sería otra clave que puede faltar en la caché, y el tablero se abre
  por la mañana con media barra de señal. Se moverá a vistas con
  `security_invoker` el día que una firma tenga miles de proyectos.
  ⚠️ **La única excepción es `documentos_por_aprobar`**, que sí estrena clave
  (`sistemas.porAprobar()`): `/sistemas` es por cliente y este widget cruza la
  cartera, así que no hay ninguna lista suya que compartir. Y como esa clave es
  **hermana** de `sistemas.documentos(orgId)` y no su hija, invalidar la del
  cliente **no la toca**: aprobar una versión invalida las dos, en
  `ExpedienteDocumento.tsx`.
- ⚠️ **Al cerrar una fase se conectan SUS widgets, en el mismo commit.** El campo
  `fase` de `src/lib/tablero/widgets.ts` dice de dónde salen los datos, no si el
  widget funciona: si nadie lo conecta en `ContenidoWidget.tsx`, el tablero
  —que es lo primero que la firma abre cada mañana— sigue diciendo «llega en la
  Fase 03» con la fase entregada, y eso se lee como que la fase no está. Pasó con
  la 02 y la 03 y se arregló el 30 ago 2026. ✅ **Ya no queda ninguno**:
  `vencimientos_criticos` se conectó con F05·B2 (23 sep 2026).
- **El indicador de conexión sólo aparece cuando tiene algo que decir**
  (`EstadoConexion` en la Navbar): sin conexión, con cola pendiente o con algo
  rechazado. En verde y vacío no se pinta — un indicador permanente deja de
  mirarse.
- **El plan manda sobre el orden.** `docs/02_PLAN_DE_FASES.md` decide qué se hace
  y cuándo. Si algo parece faltar, casi siempre está aplazado con motivo — búscalo
  ahí antes de "arreglarlo".

### Documentación de referencia

| Documento | Para qué |
|---|---|
| `docs/02_PLAN_DE_FASES.md` | **El plan.** Manda sobre el orden y el alcance de todo |
| `docs/03_ARQUITECTURA.md` | Stack, estructura, patrones. Las referencias §X.Y apuntan ahí |
| `docs/04_MODELO_DE_DATOS.md` | Tablas, vistas y RPC por fase |
| `docs/05_SISTEMA_DE_DISENO.md` | Tokens, paleta y reglas de UI |
| `docs/06_MODULOS_FUNCIONALES.md` | Cómo se usa cada módulo |
| `docs/07_ASISTENTE_Y_AUTOMATIZACION.md` | Módulos A, B y C |
| `docs/08_SEGURIDAD_Y_RLS.md` | Roles, políticas, secretos |
| `docs/09_TAREAS_DEL_DUENO.md` | Pasos manuales y **técnicos** del dueño (Supabase, Vercel, Cloudflare) |
| `docs/14_ESPECIFICACION_F05_B3.md` | Capacitación: lo construido con las cuatro respuestas de Summit sobre el DC-3 |
| `docs/13_ESPECIFICACION_F05_B1_B2.md` | ▶️ **La especificación de lo siguiente.** Matriz de obligaciones y vencimientos: DDL, reglas, RPC, pantallas, migración y comprobaciones. **Se lee entero antes de empezar `F05`** |
| `docs/11_TAREAS_DEL_CLIENTE.md` | Lo que el cliente **captura dentro de la app**, paso a paso y sin jerga |
| `docs/12_GUIA_DE_PRUEBAS.md` | **Qué probar**, para el equipo de Summit. Diez recorridos, lo que todavía no existe, y las pruebas negativas. ⚠️ Si cambias una etiqueta o un candado que aparezca ahí, corrígelo en el mismo commit |
| `docs/formatos_informeAuditorias/` | **Los catálogos documentales de los clientes** —232 archivos en cinco tandas: 68 del cliente 01 (ATELIER, constructora, ISO 9001) y **164 del cliente 02** (César Roel Abogados, despacho, **ISO 9001+27001+37001+37301**, 22 sep 2026)—, transcritos y mapeados al modelo en **29 fichas**. El `README` es su índice y lleva el registro de huecos (38). ⚠️ El nombre de la carpeta es histórico: ya no son sólo formatos de auditoría, ni de un solo cliente |
| `guias/*` | Montaje de la infraestructura |

**Regla de oro:** si un cambio afecta lo descrito en cualquiera de estos
documentos, **actualízalo en el mismo commit**. La documentación es parte del
producto.

---

## Reglas críticas — NO romper

Decisiones intencionales. Cambiarlas rompe algo más.

1. **`org_id` en toda tabla de dominio, y RLS de verdad.** Aquí conviven los datos
   de organizaciones que **no deben verse entre sí**: un hallazgo de la planta A
   no puede aparecerle al contacto de la planta B. A diferencia de JDM Built —
   donde el RLS operativo está de hecho abierto y el gateo real vive en el
   frontend— **en SummitApp el gateo vive en la base**. Toda política operativa
   filtra por `org_id IN (SELECT ...)` según la asignación del usuario. Una tabla
   nueva sin `org_id` y sin política es una fuga, no un pendiente. §8.2.
   ⚠️ **Y la política se escribe `USING (org_id IN (SELECT mis_organizaciones()))`
   a secas.** Desde `A10` la rama del socio vive dentro de esa función, ya
   filtrada por partición; añadirle `or public.es_socio()` la reabre por fuera.

2. **Middleware:** el archivo es `src/proxy.ts` con función exportada `proxy`, NO
   `middleware.ts` (Next.js 16 lo deprecó). Su `matcher` **debe excluir**: los
   archivos de la PWA (`sw.js`, `manifest.json`, `worker-*`, `swe-worker-*`,
   `workbox-*`), `/monitoring` (túnel de Sentry), `api/cron` (llega sin sesión, se
   autentica con `CRON_SECRET`) y `portal` (portal público del cliente). Si no,
   sin sesión se redirigen a `/login`, el navegador recibe HTML donde espera JS y
   **el service worker no se registra** — o el portal directamente no existe. Al
   añadir un generado a `public/` **o una ruta pública nueva**, súmalo al matcher
   **en el mismo commit**. §7.1.

3. **Config:** `next.config.mjs` (no `.ts`), con fork `@ducanh2912/next-pwa`. Los
   scripts de build llevan `--webpack`. **NUNCA `npx @sentry/wizard`:** reescribe
   el archivo y se lleva el fork, el worker de push y la caché offline.

4. **Responsive con React state (`isMobile`)**, no clases CSS ni media queries. El
   layout monta el Sidebar (escritorio) o la `BottomNav` (móvil); no hay
   hamburguesa. Lo pegado al fondo suma `var(--fab-lift)`.
   **La app es un ARMAZÓN FIJO: el documento no scrollea.** El `div` raíz mide la
   ventana y recorta; el único elemento con scroll es el que marca
   `src/lib/utils/appScroll.ts`. Es lo único que impide que el navegador móvil
   recoja su barra de URL y mueva el header y la barra inferior (`dvh` NO arregla
   eso: corrige cuánto miden las cosas, no contra qué se anclan). Cuatro reglas
   que se rompen sin darte cuenta:
   - **(a) `window.scrollTo` NO hace nada** dentro del dashboard — usa
     `getAppScroller()` o `scrollIntoView`.
   - **(b) Ningún `vh` crudo: usa `var(--vh-full)`.** Con el armazón la barra del
     navegador ya nunca se pliega, así que `100vh` es *permanentemente* más alto
     que lo visible (por eso los modales van a `calc(var(--vh-full) * 0.9)`).
   - **(c) Un contenedor con scroll dentro de un flex necesita `minHeight: 0`**, o
     `overflow` no se activa nunca.
   - **(d) Para librar la barra inferior, `var(--bottom-nav-total)`** (incluye el
     área segura), nunca `--bottom-nav-height`.

   Y no pongas `minHeight` de ventana en las páginas de dominio: el `main` ya lo
   hace. §8.5.

5. **Env vars: nunca a Git** (`.env.local` está en `.gitignore`).
   `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `VAPID_PRIVATE_KEY`,
   `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_PAT` y `MS_CLIENT_SECRET` son
   **server-only** y jamás van al bundle. Sólo lo que empieza con
   `NEXT_PUBLIC_` llega al navegador. §8.3 y `guias/05_VARIABLES_DE_ENTORNO.md`.

6. **Vistas de Supabase con `security_invoker = true`.** Toda vista que cruce
   tablas de dominio la lleva. Al recrearla, mantén la propiedad o RLS se salta y
   la vista se convierte en la puerta trasera de la multi-tenencia.

7. **Cliente de Supabase, dos variantes:** `lib/supabase/client.ts` en
   `'use client'`; `lib/supabase/server.ts` en Server Components y API routes.
   Usar el incorrecto rompe cookies o hidratación.

8. **Bitácora inmutable:** `audit_logs` no tiene UPDATE ni DELETE en RLS. Los
   registros nunca se borran. En una firma de auditoría esto no es higiene: es el
   producto. Si la app que audita no puede demostrar quién cambió qué, no sirve.

9. **TypeScript: cero `any`.** Todos los tipos salen de `src/types/database.ts`.
   Si agregas una tabla, agrega su interface ahí **antes** de usarla.

10. **Estilos:** inline styles con variables CSS es el patrón del proyecto. **No
    mezclar Tailwind en componentes existentes.** Los nuevos de
    `src/components/ui/` pueden usarlo si respetan las variables. §5.

11. **Sin interruptores muertos.** Un campo de catálogo, un sub-evento o un flag
    que nadie pinta no se registra hasta que alguien lo consuma.

12. **El texto de una norma NO se copia al repositorio.** Las normas ISO son obra
    protegida y la firma las tiene bajo licencia. En la base viven **la estructura
    de cláusulas** (número, título, resumen redactado por Summit) y las
    referencias; el texto íntegro entra sólo como archivo del cliente en un bucket
    privado, con su licencia. Un `INSERT` sembrando párrafos de la ISO 9001 es un
    problema legal, no una comodidad. §8.6.

13. **Un hallazgo no se borra.** Se cierra, se reclasifica o se anula **con
    motivo y firma**, y la versión anterior queda. `hallazgos` es aditiva:
    `estado` + `hallazgos_historial`. Un `DELETE` sobre un hallazgo destruye la
    trazabilidad de la auditoría — que es exactamente lo que un auditor externo
    va a venir a revisar. §8.7.
    ⚠️ **Dónde está la línea, porque no es "nada se borra nunca":** lo que **no
    es evidencia de auditoría** sí se borra —un cliente capturado por error, un
    proyecto de prueba—, **sólo el socio** y **sólo mientras no cuelgue de ello**
    un hallazgo, una auditoría o un documento aprobado. La comprobación vive en
    la política de DELETE, no en la pantalla, y el borrado queda en `audit_logs`.
    Sin esa salida, la primera semana de uso real deja la cartera llena de datos
    de prueba que nadie puede quitar (F01·B6).
    **Dónde está hoy, tabla por tabla:** `puedo_borrar_org()` y
    `puedo_borrar_proyecto()` exigen socio **y sin documentos**;
    `puedo_borrar_documento()`, editor y **sin versión aprobada u obsoleta**.
    Borran sin candado extra `tareas_etapa`, `procesos` y `riesgos` —trabajo
    interno, no evidencia—; `documento_versiones` sólo si está en `borrador`; y
    `adjuntos`, **sólo el socio**. Ampliar es tocar una función, no cinco
    políticas.

---

## Reglas del offline — se rompen sin darte cuenta

Detalle en §8.9 a §8.12. **Aquí importan más que en JDM Built**: allá el mecánico
tenía WiFi malo; aquí el auditor está en un sótano de una planta industrial.

1. Cargar datos con `useQuery`, nunca `useEffect` + `useState`. Toda clave sale de
   `src/lib/query/keys.ts`.
2. **La caché es la fuente de verdad.** Nunca copies `data` a un `useState` del
   componente: la caché es lo único que se persiste, así que al remontar reaparece
   lo viejo aunque el cambio siga en la cola.
3. **Los desplegables de un formulario también son datos**: por `useQuery`. Si no,
   sin señal llegan vacíos y el guardado muere en la validación *antes* de
   encolarse. Aplica en especial al selector de cláusula de un hallazgo: sin él,
   no hay hallazgo.
4. Toda escritura pasa por `offlineWrite` (`src/lib/offline/mutate.ts`) con
   etiqueta en español legible, nunca un UUID.
5. `getSession()` (local), nunca `getUser()` (pega a la red y sin señal cuelga).
6. **El offline NO se puede probar en el teléfono contra `npm run dev`.** Dos
   cosas lo impiden a la vez, y ninguna avisa: `next.config.mjs` apaga el
   service worker en desarrollo (`disable: NODE_ENV === 'development'`), y
   además **un service worker sólo se registra en contexto seguro** — `https://`
   o `localhost`. Desde el teléfono se entra por `http://192.168.x.x:3000`, que
   no es ninguno de los dos, así que ahí **no hay service worker ni con el build
   de producción**.
   Síntoma: modo avión y la pantalla de error del navegador en cualquier
   navegación. No es un fallo de la capa offline; es que no existe.
   Dónde sí se prueba: en la laptop con `npm run build && npm run start` y
   `localhost`, o **en el teléfono contra la URL de Vercel**, que es HTTPS. Esa
   segunda es la única prueba que vale para el criterio de cierre, porque es la
   única que se hace con el dedo.
7. **Un filtro de lista no es una consulta.** El texto del buscador y el estado
   seleccionado **no entran en la clave de caché**: se descarga la lista completa
   una vez y se filtra **en memoria**. Con una consulta por búsqueda, en una
   planta sin señal la lista se vacía en cuanto se teclea la primera letra —esa
   clave no está en la caché— y el consultor concluye que la app perdió sus
   datos. Ver `queryKeys.cartera.organizaciones()`.
   ⚠️ **La única excepción es el buscador global** [F06·B4]: buscar en toda la
   cartera no cabe en memoria, así que su clave lleva el texto —y no se
   persiste—. Sin señal cae a `buscarEnCache()` sobre las listas ya bajadas, que
   es lo que esta regla protege.
8. **Una auditoría se descarga entera antes de entrar a planta.** El plan, sus
   cláusulas, la lista de verificación y los hallazgos previos se precargan en la
   caché al abrir la auditoría con señal. Si esto no pasa, el auditor llega al
   piso con una pantalla vacía. §8.11.

**Excepciones conscientes, y son siete:**

1. **Los adjuntos**, sólo en su mitad binaria: la **fila** de `adjuntos` sí pasa
   por `offlineWrite` —y tiene que pasar, para conservar el orden—; lo que va por
   la cola propia es el archivo.
2. **Crear y revocar el link del portal**, que no tiene sentido sin red.
3. **La importación del catálogo de normas**: parte de un archivo que sólo existe
   en esa pantalla, escribe cientos de filas en lote y la hace un socio frente a
   su computadora.
4. **Subir el ARCHIVO de una versión de documento** [F02·B2]: pesa megabytes,
   sale de un `File` que sólo existe en esa pantalla, hay que convertirlo antes
   de guardarlo, y lo hace un consultor con el Word del cliente delante — nunca
   un auditor en un sótano. **Sólo esa mitad**: crear el documento, escribir una
   versión a mano, mandarla a revisión, aprobarla y vincular cláusulas pasan por
   la cola como todo lo demás.
5. **Generar la lista de verificación** [F03·B2]: es una RPC —la cola sabe
   reproducir `insert`/`update`/`delete` sobre una tabla, no una llamada a una
   función—, escribe cientos de filas de golpe (una ISO 9001 son ~60 puntos), y
   sobre todo **es lo que se hace en la oficina antes de salir**. El día que
   haga falta sin señal, ya es tarde: la lista tenía que estar hecha.
   **Sólo generar**: añadir un punto, editarlo, reordenarlo y quitarlo pasan por
   la cola.
6. **Generar las obligaciones de una NOM** [F05·B1]: `generar_obligaciones_de_nom()`,
   por los mismos tres motivos que la quinta. **Sólo generar**: evaluar cada
   elemento —que es lo que se hace en la planta— pasa por la cola.

7. **Las cuentas: alta, contraseña temporal, baja y cambiar la propia
   contraseña** [F06·B3]. Tocan `auth.users` —sólo `service_role` o la propia
   sesión— y no tienen sentido sin red. **Sólo esas**: nombre, rol y
   certificaciones de una cuenta pasan por la cola.

En las siete, sin conexión la pantalla **lo dice y no deja empezar**.

---

## Trampas heredadas — ya costaron caro en JDM Built, no las repitas

Esta sección no es teoría. Cada punto es un bug que ya se pagó en el proyecto
hermano y que **este código puede volver a cometer idéntico**.

- **`crypto.randomUUID()` NO existe fuera de contexto seguro.** No es soporte del
  navegador: es una API restringida a HTTPS y `localhost`. Desde una IP de red
  local el objeto `crypto` está y el método no. Como el id local es lo primero que
  calcula un insert, se lleva por delante **toda escritura nueva de la app**. Usa
  siempre `uuid()` de `src/lib/utils/uuid.ts`, que cae a `crypto.getRandomValues`.
  Producción no lo ve nunca: Vercel es HTTPS. Desarrollo sí.

- **Un catálogo en código que se lee sin valor por defecto tumba la pantalla
  entera.** `TIPOS_HALLAZGO[finding.tipo]` devolviendo `undefined` y un `.color`
  después revienta el render — y como las tarjetas se pintan **en bucle, un solo
  hallazgo raro se lleva los cuarenta**. El auditor no ve "un hallazgo con un
  problema", ve la página de error y ninguno de sus hallazgos. Todo catálogo
  indexado por un valor que viene de la base **nunca devuelve `undefined`** y
  degrada enseñando el valor crudo. El tipo de TypeScript es una promesa sobre ese
  texto, no una garantía.

- **Un `catch` vacío convierte un bug en "error".** Si un guardado puede fallar,
  el motivo se pinta. Y **pintar «no se pudo guardar» a secas es un `catch` vacío
  con mejor letra**: quien lo lee no sabe si perdió el dato, si fue un permiso o
  si basta con reintentar. Si la cola guardó un `motivo`, el motivo va en
  pantalla.

- **`String(error)` sobre un error de Supabase devuelve `"[object Object]"`.**
  Ésta no viene de JDM Built: se pagó aquí, y es la peor de la lista. Cuando un
  `fetch` no sale del teléfono, postgrest-js **no lanza un `Error`**: devuelve un
  objeto plano `{ message: 'TypeError: Failed to fetch', details, hint, code: '' }`.
  Un `error instanceof Error ? error.message : String(error)` sobre eso da la
  cadena `"[object Object]"`, y cualquier cosa que mire el mensaje decide mal en
  silencio.
  Lo que rompió: `esFalloDeRed()` clasificaba un corte de red **como rechazo del
  servidor** al vaciar la cola. Un tropiezo de señal al reconectar —justo lo que
  pasa al salir de la planta— marcaba las operaciones como RECHAZADAS en vez de
  dejarlas esperando, y no se volvían a intentar solas. Con treinta hallazgos en
  la cola, eso son treinta en rojo diciendo «no se pudo guardar» cuando lo único
  que pasó fue que el semáforo cambió.
  Receta: **`mensajeDeError()` de `src/lib/supabase/errores.ts`, nunca
  `String(error)`**. Aplica también a los filtros de Sentry
  (`instrumentation-client.ts`), que sin ella dejan pasar exactamente el ruido de
  red que existen para cortar.

- **Un DELETE o UPDATE bloqueado por RLS no es un error.** Un INSERT rechazado
  devuelve 42501 y se ve; un DELETE/UPDATE sobre filas que la política no deja
  tocar **afecta a cero filas** y PostgREST responde 200 con lista vacía. Síntoma:
  *"lo cierro, desaparece, lo refresco y vuelve"*. Receta: pide `.select()` y trata
  `0 filas` como error. **Con el RLS cerrado de SummitApp esto va a pasar más
  seguido que en JDM** — trátalo como el caso normal, no como la excepción.

- **`fecha::text` NO es IMMUTABLE.** Una columna generada o un índice de expresión
  con una fecha a texto revienta con 42P17: el resultado depende del `DateStyle`
  de la sesión. Se resuelve con la resta de fechas (`fecha - DATE '2000-01-01'`).
  `numeric::text` y `uuid::text` sí son inmutables.

- **`npx tsc --noEmit` puede mentir.** `tsconfig.json` incluye los tipos generados
  de `.next`; si `routes.d.ts` quedó truncado por un `dev` interrumpido, su error
  de sintaxis **aborta el análisis semántico de todo el proyecto** y tsc calla los
  errores reales. `npm run build` no tiene el problema.

- **Una columna `date` no se formatea con `new Date()`.** Corre un día en México.
  Usa `formatDateOnly` / `toISODate` de `lib/utils/dates.ts`; `formatDate` es para
  `timestamptz`. Aplica a **todas** las fechas de vencimiento normativo, que es
  justo donde un día de diferencia cambia si algo está vencido o no.

- **Las altas de valores de enum van en su propia migración.** Postgres no deja
  usar un valor de enum en la transacción que lo crea. **Decisión de proyecto: los
  catálogos de dominio NO usan enum.** Van `text` + `CHECK`, para que la trampa no
  aplique nunca. Los `CHECK` son listas cerradas a propósito: abrir un valor nuevo
  obliga a pasar por una migración, y esa fricción es deliberada.

- **No corras `npm run build` con un `npm run dev` encendido sobre el mismo repo.**
  Los dos escriben en `.next` y el build le pisa al dev los chunks: a partir de ahí
  el navegador ejecuta código viejo mezclado con nuevo y salen errores **cuyo
  número de línea no corresponde al archivo**. Para salir: parar el dev,
  `rm -rf .next`, arrancarlo otra vez.

---

## Estructura

```
src/
  app/(auth)/          → login + mfa
  app/(dashboard)/     → todo lo protegido por sesión
    cartera/           → organizaciones + proyectos + contactos
    sistemas/          → documentos + requisitos + procesos + riesgos + indicadores
    auditorias/        → programa + auditorías + hallazgos  [B1 ✅]
    cumplimiento/      → matriz NOM + vencimientos + dictámenes
    capacitacion/      → cursos + programa + sesiones + constancias
    acciones/          → planes de acción y su seguimiento
    admin/             → metas + finanzas + facturación + usuarios + bitácora + config
    auditorias/[id]/ acciones/[id]/ cartera/[id]/   (sólo detalle)
    asistente/         → oficina del asistente (URL `/asistente`, ver abajo)
  app/portal/[token]   → portal público del cliente, sin sesión
  app/api/             → users, push/*, cron/*, fiscal/*, asistente/*, graph/*
  components/          → por dominio; ui/ es la biblioteca común
  lib/queries/         → todas las consultas Supabase
  lib/supabase/        → client.ts (browser) + server.ts
  lib/offline/         → cola, caché, adjuntos, dictados y sincronía
  lib/normas/          → importador del catálogo de normas
  lib/documentos/      → zip · docx · pdf · markdown · convertir  [F02·B2]
  lib/sistemas/        → catálogos de la Fase 02
  lib/auditorias/      → catálogos · precarga · informe  [Fase 03]
  lib/acciones/        → catálogos del ciclo de mejora  [F04·B1]
  lib/cumplimiento/    → catálogos · precarga del recorrido  [F05·B1]
  lib/capacitacion/    → catálogos · estado del DC-3 · solicitud CSV  [F05·B3]
  lib/firma/           → plazos por defecto · logotipo incrustado  [F06·B3]
  lib/busqueda/        → tipos, enlaces y búsqueda en caché del buscador  [F06·B4]
  lib/api/             → lo compartido de las rutas: cron · usuarios (candado del socio)
  lib/asistente/       → proveedor, esquemas Zod, instrucciones, herramientas
  lib/plantillas/      → impresion.ts + los cinco formatos de la firma:
                         informeAuditoria [B5] · programaAnual · listaAsistencia
                         · planeacionAgenda [B6] · reporteNoConformidad [F04·B1]
  lib/utils/           → helpers puros
  types/database.ts    → todos los tipos
worker/index.js        → oyentes push del service worker
supabase/migrations/   → esquema versionado, aditivo
docs/ guias/           → la documentación de arriba
```

**Los siete dominios son páginas con pestañas, no carpetas por entidad.** Se
navega con query string (`/auditorias?tab=hallazgos`) desde el Sidebar y la
BottomNav. Agregar una sección = una pestaña más en su dominio, **no** una carpeta
nueva. Las únicas rutas propias son las de detalle, el portal y la oficina del
asistente.

⚠️ **`/asistente` es una excepción consciente**: cruza los siete dominios, así que
no pertenece a ninguno. Se entra desde el 🤖 del header, junto al buscador global.
**La `BottomNav` tiene cinco destinos y no hay un sexto** — en móvil los dominios
que no caben viven en el buscador y en el menú del header.

⚠️ **Vive en `src/app/(dashboard)/asistente/`, no en `src/app/asistente/`.** La URL
es la misma —el grupo de ruta no aparece—, pero dentro del grupo hereda el guard
de sesión de `proxy.ts` y el armazón fijo. Fuera saldría sin cabecera, sin sidebar
y sin barra inferior.

---

## Módulos apagados de fábrica

Igual que en JDM Built, hay módulos que existen en el código y **no se encienden**
hasta que el dueño lo pide, en `MODULOS_APAGADOS_POR_DEFECTO`.
⚠️ **Hoy ni esa constante ni ninguno de los cuatro módulos existe en el código**
(revisado el 23 sep 2026): la columna `config_firma.modulos_activos` está, y por
eso *Configuración* no pinta ninguna casilla todavía — la de cada módulo llega
con él. Los cuatro:

`facturacion` · `asistente` · `automatizacion` (MS Graph) · `comercializadora`

Un módulo apagado no pinta pestaña, no registra ruta en la navegación y sus
consultas no se disparan. Encenderlo es una casilla en `/admin?tab=config`, no un
deploy.

---

## Cómo trabajar

**Antes:** (1) lee la sección relevante de `docs/03_ARQUITECTURA.md`; (2)
`git pull origin main`; (3) si tocas Supabase, valida contra
`src/types/database.ts` y el esquema; (4) si dudas del patrón visual, mira 2-3
componentes similares del mismo módulo antes de crear uno nuevo; (5) si el cambio
afecta comportamiento documentado, actualiza el documento en el mismo commit.

**Después:** (1) `npm run lint`; (2) `npm run build` (usa `--webpack`, no lo
cambies); (3) deja el árbol de trabajo listo y **avisa de qué cambió**.

⚠️ **EL COMMIT Y EL PUSH LOS HACE EL DUEÑO. SIEMPRE. Un agente no los ejecuta.**

No es una preferencia de estilo. Cada `push` a `main` **despliega a producción**
en Vercel sin que nadie más lo revise, y este repositorio contiene el sistema con
el que una firma de auditoría lleva los expedientes de sus clientes. Quien firma
lo que sale a producción tiene que ser una persona, y tiene que haberlo mirado.

Qué hacer en su lugar: dejar los archivos escritos, `lint` y `build` en verde, y
**decir en un párrafo qué se cambió y qué falta por verificar**. Si un cambio
necesita ir acompañado de otra cosa —una migración por aplicar, una variable de
entorno, un paso en un panel—, se dice ahí mismo, porque el dueño va a decidir el
orden.

Vale igual para todo lo que empuja hacia fuera: `git push`, `supabase db push`,
aplicar una migración a la base remota, `vercel deploy`. Se preparan y se
explican; los dispara él.

**Idioma:** el producto, la interfaz, los nombres de columna, los comentarios y
los commits van **en español**. Es el idioma de la firma y de sus clientes. Sin
`snake_case` en inglés a medias: `fecha_compromiso`, no `commitment_date`.
Excepción: los nombres que vienen del framework o del proveedor
(`created_at`, `user_id`, `auth.uid()`).
