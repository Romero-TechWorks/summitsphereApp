# 13 · Especificación de implementación · F05·B1 y B2

> **Escrito el 22 sep 2026 para arrancar en frío en otra sesión.** Contiene todo
> lo necesario para escribir la migración y las pantallas de los dos primeros
> bloques de la Fase 05 sin volver a leer los 164 archivos del cliente 02.
>
> **Fuentes:** [`levantamiento_cumplimiento_STPS.md`](formatos_informeAuditorias/levantamiento_cumplimiento_STPS.md),
> [`SGI-P-COM-02_obligaciones_de_compliance.md`](formatos_informeAuditorias/SGI-P-COM-02_obligaciones_de_compliance.md)
> y [`DECISIONES_22_SEP_2026.md`](formatos_informeAuditorias/DECISIONES_22_SEP_2026.md).
>
> ⚠️ **`B3` (capacitación) NO entra aquí.** `F03` se resolvió el 23 sep 2026
> —Summit no emite DC-3, lo contrata a un externo— y B3 se especifica aparte.
> Ver §12.

---

## 0 · Lo que cambió al implementar `B1` (22 sep 2026)

La migración (`20260922120000_cumplimiento_normativo.sql`) cubre **B1 y B2
enteros**, como pide §11; las pantallas de esta entrega son **sólo B1**. Seis
diferencias con lo de abajo, y **mandan sobre el texto de las secciones**:

| # | Qué decía la spec | Qué se hizo | Por qué |
|---|---|---|---|
| 1 | `aplica` NOT NULL, justificación obligatoria siempre (§3.3) **y** la RPC la deja vacía (§4) | ⚠️ **`aplica` nullable**: `null` = sin decidir. La justificación se exige en cuanto `aplica` no es null. Y un **tercer CHECK**: no se evalúa lo que no aplica | Las dos reglas juntas hacían imposible el INSERT de la RPC. El tercer estado ya existía en la realidad |
| 2 | La RPC «propone `aplica`» (§4) | La RPC **no decide**; la propuesta la pinta la pantalla (`proponerAplica()`) con botón «Tomar la propuesta» | La columna guarda lo que decidió una persona (§5.2). Los dos números ya están en la caché |
| 3 | `riesgos.tipo` + `continuidad`, `ambiental` (§3.6, §11.8) | ⚠️ **No entró** | `riesgos.tipo` es la polaridad `riesgo/oportunidad`, no la categoría. Los 19 tipos de `SGI-F-CA-23` son otra columna, de la Fase 02 |
| 4 | `puedo_borrar_org()` «ampliada» (§3.6) | Ampliada **y con la partición de pruebas restaurada** | La reescritura de `20260908120000` la había perdido |
| 5 | Precarga de siete piezas con el membrete (§7) | Siete piezas **sin membrete y con los documentos del cliente** | El membrete sólo lo lee el informe (#6); los documentos son un desplegable del formulario (regla 3 del offline) |
| 6 | Informe de levantamiento (§10) | ⚠️ **Aplazado** | Sus secciones de prosa —objetivo del recorrido, desafíos, próximos pasos, recomendaciones— **no tienen dónde vivir en el modelo**: la spec no define una tabla de «levantamiento». Hay que decidirla antes de escribir el imprimible |

**Además**, cosas que la spec no decía y se decidieron así:

- **El sitio va en la URL** (`?sitio=`) y es un filtro en memoria, igual que
  `?org=`; el área es un filtro local del recorrido.
- **«Evaluar en (área)»**: un elemento generado para todo el sitio se copia al
  área que se está caminando (una fila por la cola, funciona sin señal). La RPC no
  cuenta esas copias para su idempotencia.
- **El sello de la evaluación es más estricto que el de la Fase 03**: si el
  veredicto no cambia, la base **conserva** quién y cuándo aunque el navegador
  mande otros.
- **`vencimientos.estado`** en `vigente/por_vencer/vencido` lo mantiene la base
  contra la fecha (trigger + el cron diario); `por_vencer` empieza a los **90
  días**, el primer aviso. `en_tramite` y `no_aplica` no se tocan.
- **Una obligación se puede quitar** mientras esté sin evaluar, sin fotos y sin
  vencimientos; un vencimiento, mientras no tenga adjunto.
- **Probada con 80 comprobaciones**, no catorce: §11 más su regresión.

### Y al implementar `B2` (23 sep 2026)

| # | Qué decía la spec | Qué se hizo | Por qué |
|---|---|---|---|
| 7 | Nada sobre renovar | ⚠️ **Migración `F00b`**: estado `renovado` + `vencimientos.renueva_id`; la emisión nueva jubila a la anterior por trigger | Reescribir la fila dejaba **sin avisos el ciclo nuevo** (la `clave_evento` lleva el id) y borraba el estudio anterior; otra fila dejaba la vieja vencida para siempre |
| 8 | «Lista, calendario y filtros» (§8) | Lista y vista **por mes**, con «Críticos» por defecto | Un calendario de cuadrícula en un teléfono no se lee; agrupado por mes, sí |
| 9 | Nada sobre la clave | **Una clave para toda la cartera**, `cumplimiento.vencimientos()`, compartida con el widget | El tablero no estrena clave (§8.10); son decenas por cliente |
| 10 | El widget «vencen este mes» | Vencidos, en trámite y **por vencer a 30 días** | «Por vencer» empieza a 90, y tres meses de la cartera entera no distinguen lo urgente |
| 11 | — | El estado que se **pinta** se recalcula contra hoy (`estadoVisible()`) | El cron lo actualiza una vez al día y la caché puede tener días |
| 12 | Advertencia de datos personales (hueco 42) | En el adjunto del vencimiento, corta y sin bloquear | Decisión 6 del dueño; `docs/08` §7 la declara como deuda |

---

## 1 · Las tres decisiones del dueño que fijan el diseño

Tomadas el 22 sep 2026. **No se vuelven a discutir.**

| # | Decisión | Consecuencia |
|---|---|---|
| **1** | **UNA tabla**, no dos | `org_noms` y la «matriz de obligaciones de compliance» son la misma tabla: `obligaciones`. Una NOM es **un tipo de fuente**, no el eje del modelo |
| **2** | **Área nullable** | La evaluación cuelga de `sitio_areas` cuando la hay, del sitio cuando no. Nace `sitio_areas` |
| **3** | **`tipo` editable** | No es un CHECK: es `obligacion_tipos`, un catálogo de la firma que el socio da de alta, edita y **da de baja sin borrar** |

⚠️ **La 3 es una excepción consciente a la trampa heredada** «los catálogos de
dominio van `text` + `CHECK` para que la fricción de la migración sea
deliberada». Aquí el dueño decidió lo contrario **por el mismo motivo que las
normas**: es una consultoría emergente y la biblioteca se construye sola. La
fricción se sustituye por `activo = false` y por que **nada se borra**.

## 2 · El principio que ordena todo: la biblioteca es del usuario

`noms`, `nom_requisitos`, `obligacion_tipos` y `cursos` **nacen vacías**. No hay
un solo `INSERT` de siembra en la migración. Es la misma decisión que `normas` y
`norma_clausulas` (regla 12), y por los mismos tres motivos:

1. Pedir el catálogo completo es pedir un año de trabajo antes de usar la app.
2. Un catálogo sembrado **nace viejo** — la NOM-035 cambió, la NOM-037 es de 2023.
3. El valor está en **las palabras de Summit**, que son su criterio técnico y su
   defensa cuando un cliente discuta un hallazgo.

⚠️ **Y la clave de una NOM lleva el año dentro** (`NOM-035-STPS-2018`). Cuando
sale una versión nueva **se da de alta como otra NOM** y la anterior se marca
`vigente = false`. **Nunca se reescribe**: hay hallazgos citándola, igual que
`norma_clausulas`.

**Para arrancar** hay ocho NOMs ya procesadas, con su texto de obligación
redactado, en la ficha del levantamiento STPS §5: **001, 002, 019, 025, 026,
030, 035 y 037-STPS**. Son la tarea `F01` del dueño, que ya no bloquea.

## 3 · El modelo

### 3.1 · Catálogos de la firma — sin `org_id`, con partición de pruebas

Siguen el patrón de `normas` exactamente, incluida la lección de `A10`.

**`noms`**

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `clave` | text NOT NULL | `NOM-035-STPS-2018` — **con el año** |
| `nombre` | text NOT NULL | |
| `autoridad` | text CHECK | `stps` · `semarnat` · `proteccion_civil` · `salud` · `otro` |
| `tipo` | text CHECK | `seguridad` · `higiene` · `organizacion` · `producto` · `ambiental` |
| `periodicidad` | text | Texto libre: «anual», «bienal», «por evento» |
| `vigente` | boolean NOT NULL default true | Una NOM sustituida se apaga, no se borra |
| `es_demo` | boolean | Lo pone el trigger de partición, como `normas` |

⚠️ **`unique (clave, es_demo)`, NO `unique (clave)`.** Es literalmente la lección
de `A10` con `normas.clave`: sin eso, la cuenta de pruebas no puede dar de alta
su propia `NOM-002-STPS-2010` mientras exista la real. **Y por lo mismo, el alta
NO usa `upsert` sobre `clave`** (§6.1 de `docs/03`).

**`nom_requisitos`** — la plantilla de lo que se verifica

| Columna | Tipo | Nota |
|---|---|---|
| `nom_id` | uuid FK | |
| `numeral` | text | `5.2`, `7.1 a)`. **Referencia, no clave** |
| `elemento` | text NOT NULL | ⚠️ **Lo que de verdad se evalúa**: «Extintores», «Carpeta normativa», «Estudio de riesgo de incendio». Ver §3.4 |
| `descripcion` | text NOT NULL | El deber, **con las palabras de Summit** (regla 12) |
| `evidencia_esperada` | text | Qué documento o registro lo demuestra |
| `aplica_si` | text | La condición en prosa: «centros de trabajo de 16 a 50 trabajadores» |
| `min_trabajadores` | int NULL | ⚠️ **Sólo para PROPONER**, §5.2 |
| `max_trabajadores` | int NULL | idem |
| `orden` | int | |
| `activa` | boolean default true | Lo que desaparece se apaga |

⚠️ **`min/max_trabajadores` no son un `aplica_si` estructurado completo.** Giro y
actividad se quedan en la prosa **a propósito**: hoy nada los consume y serían un
interruptor muerto (regla 11). Los dos enteros sí se consumen, porque
`sitios.num_trabajadores` **ya existe**.

**`obligacion_tipos`** — el catálogo editable de la decisión 3

`id · clave · nombre · descripcion · orden · activo · es_demo`, con
`unique (clave, es_demo)`. Arranca vacío. Los que el dominio ya conoce, para
proponerlos en la pantalla de alta: `estudio · dictamen · licencia · permiso ·
mantenimiento · recarga · examen_medico · capacitacion · licencia_software ·
poder_notarial · otro`.

### 3.2 · `sitio_areas` — la decisión 2

`id · org_id · sitio_id FK · nombre · orden · activa`

- `org_id` **lo hereda un trigger** desde el sitio, como `heredar_org_del_proyecto()`.
- Las del levantamiento real, para proponer al dar de alta un sitio: recepción,
  sala de juntas, oficinas privadas, área común de trabajo, sanitarios, site de
  telecomunicaciones, comedor.
- ⚠️ **No se borra un área con obligaciones evaluadas colgando** — la condición va
  en la política de DELETE, no en la pantalla. Es la lección del `on delete
  cascade` que se salta el RLS.

### 3.3 · `obligaciones` — LA tabla (decisión 1)

Es a la vez la matriz de aplicabilidad NOM y la matriz de obligaciones de
compliance. **Una fila = un deber concreto de esta organización.**

| Columna | Tipo | De dónde sale |
|---|---|---|
| `id` · `org_id` | uuid | Regla 1 |
| `sitio_id` | uuid FK NULL | |
| `area_id` | uuid FK NULL | **Decisión 2** |
| `tipo_id` | uuid FK NULL | → `obligacion_tipos` (**decisión 3**) |
| `nom_id` | uuid FK NULL | Cuando la fuente es una NOM del catálogo |
| `nom_requisito_id` | uuid FK NULL | El renglón de plantilla del que nació (§4) |
| `fuente` | text | ⚠️ **La cita en prosa**: «LFPDPPP (DOF 20-Mar-2025), arts. 26 y 27». Es texto **porque no toda fuente está en `noms`** |
| `naturaleza` | text[] NOT NULL | `legal` · `norma` · `contractual` · `voluntaria`. ⚠️ **Arreglo**: el formato real combina («Legal / Norma») |
| `obligacion` | text NOT NULL | El deber: «Contar con…», «Notificar…» |
| `aplica` | boolean NOT NULL | |
| `justificacion` | text | ⚠️ **CHECK: obligatoria en AMBOS sentidos** |
| `responsable_id` | uuid FK NULL | |
| `documento_id` | uuid FK NULL | ⚠️ **El control del SGI que la cubre** — engancha con la Fase 02 |
| `evidencia_esperada` | text | |
| `frecuencia_verificacion` | text | `anual · semestral · trimestral · mensual · por_evento · unica_vez`. ⚠️ **NO es un vencimiento**, §5.1 |
| `proxima_verificacion` | date NULL | Calculada al evaluar; es lo que barre el cron |
| `estado_cumplimiento` | text CHECK | `cumple · parcial · no_cumple · en_proceso · sin_evaluar` (default) |
| `observacion` | text | ⚠️ **CHECK: obligatoria cuando el estado es `parcial`** |
| `evaluado_en` | timestamptz NULL | ⚠️ **La manda el TELÉFONO**, §5.3 |
| `evaluado_por_id` | uuid NULL | **La sella el servidor** |
| `creado_en · actualizado_en · creado_por` | | |

**Los tres CHECK que sostienen la calidad del dato:**

```sql
-- 1 · La justificación es obligatoria tanto si aplica como si no
check (justificacion is not null and length(btrim(justificacion)) > 0)

-- 2 · «Parcial» sin motivo es un veredicto que nadie puede defender
check (estado_cumplimiento <> 'parcial'
       or (observacion is not null and length(btrim(observacion)) > 0))

-- 3 · El área tiene que ser del sitio de la fila
--     (trigger, como validar_sitio_del_proyecto())
```

⚠️ **`naturaleza` es `text[]` y por eso no lleva CHECK de un valor.** Se valida
con un trigger o con `naturaleza <@ array[...]`. Es la única columna del proyecto
con arreglo; se eligió porque el formato real del cliente combina dos valores en
un tercio de sus renglones y partirlo en booleanos daría cuatro columnas muertas.

### 3.4 · ⚠️ Por qué `elemento` y no `numeral`

`docs/02` suponía evaluar **numerales** (`5.1`, `7.2`). El formato real de Summit
evalúa **elementos físicos y documentales** —«Extintores», «Comisión de seguridad
e higiene», «Carpeta normativa»— y cuelga cada uno de su NOM.

Es la diferencia entre auditar un papel y auditar una planta, y decide la
pantalla: **`B1` es trabajo de campo, no de escritorio**. El numeral se conserva
como referencia para poder citarlo en el informe.

⚠️ **«Carpeta normativa» es un elemento POR NOM, no uno global.** Siete de las
ocho del levantamiento lo repiten, y es el renglón que más veces sale «No
cumple». Va como un `nom_requisito` más.

### 3.5 · `vencimientos` — `B2`

⚠️ **No es la misma tabla que `obligaciones`, y la diferencia es real:** una
obligación es **permanente** y se verifica con una cadencia; un vencimiento es
**una cosa concreta que caduca**. Una obligación genera cero, uno o muchos.

> «Contar con el informe de resultados de iluminación (NOM-025)» es la
> obligación. «Estudio de iluminación del 10-Mar-2025, vigencia 24 meses, vence
> el 10-Mar-2027, PDF adjunto» es el vencimiento.

| Columna | Tipo | Nota |
|---|---|---|
| `id` · `org_id` | uuid | |
| `obligacion_id` | uuid FK NULL | Qué obligación satisface |
| `sitio_id` · `area_id` | uuid FK NULL | |
| `tipo_id` | uuid FK NULL | Mismo catálogo editable |
| `nombre` | text NOT NULL | «Estudio de ruido NOM-011» |
| `emitido_en` | date NULL | |
| `vigencia_meses` | int NULL | |
| `vence_en` | **date NOT NULL** | ⚠️ **Se GUARDA calculada**, §5.4 |
| `responsable_id` | uuid FK NULL | |
| `documento_id` | uuid FK NULL | El dictamen o el estudio |
| `estado` | text CHECK | `vigente · por_vencer · vencido · en_tramite · no_aplica` |
| `notas` | text | |

**Índice:** `(org_id, vence_en) where estado in ('vigente','por_vencer')` — es
por donde barre el cron.

⚠️ **`vence_en` es `date`, no `timestamptz`.** Formatearla con `new Date()` la
corre un día en México, y aquí un día decide si algo está vencido. **`formatDateOnly`
/ `toISODate` de `lib/utils/dates.ts`, siempre.**

### 3.6 · Lo que hay que ampliar de lo ya construido

| Tabla | Qué se le añade | Por qué |
|---|---|---|
| `adjuntos` | `obligacion_id`, `vencimiento_id` | La foto del extintor y el PDF del dictamen |
| `CAMPOS_DOMINANTES` | Las dos claves nuevas | ⚠️ **No escribir el objeto de `adjuntar()` a mano**: así se quedó fuera `hallazgo_id` |
| `puedo_borrar_org()` | Y sin obligaciones evaluadas ni vencimientos | Una evaluación es evidencia |
| `notificaciones.categoria` | Las **cuatro multinorma** del hueco 29 | Aditivo; **aprovechar esta migración**, §11 |
| `riesgos.tipo` | `continuidad`, `ambiental` | Dos valores, para que los 249 riesgos del cliente 02 entren completos |

✅ **`obligacion_proxima` YA está en el CHECK aplicado** desde la primera
migración. El aviso de `B2` no necesita ampliar nada.

## 4 · La RPC: `generar_obligaciones_de_nom()`

**El hallazgo de diseño de esta especificación.** `nom_requisitos` es una
plantilla y `obligaciones` es su instancia por organización — exactamente la
relación que ya existe entre `norma_clausulas` y `auditoria_items`.

```
generar_obligaciones_de_nom(p_org uuid, p_sitio uuid, p_nom uuid) → int
```

Copia las reglas de `generar_lista_verificacion()` **sin inventar nada**:

- ✅ Toma sólo los `nom_requisitos` **activos**.
- ✅ **Es idempotente**: correrla dos veces no duplica.
- ✅ **No pisa lo ya evaluado** — reescribir la obligación debajo de un veredicto
  ya dado deja el veredicto contestando otra cosa.
- ✅ Es **`SECURITY INVOKER`**: el INSERT pasa por la política, así que el papel
  `lectura` no genera nada.
- ⚠️ **Propone `aplica`** comparando `min/max_trabajadores` con
  `sitios.num_trabajadores`, y deja `justificacion` vacía **a propósito**: la
  escribe una persona, y el CHECK no deja guardar sin ella.

⚠️ **Es la sexta excepción consciente a `offlineWrite`**, y por los mismos
motivos que la quinta (`generar_lista_verificacion`): es una RPC —la cola sabe
reproducir `insert`/`update`/`delete`, no una llamada a función—, escribe decenas
de filas de golpe, y **se hace en la oficina antes de salir**. Sin conexión, la
pantalla **lo dice y no deja empezar**. Hay que sumarla a la lista de `CLAUDE.md`
y a `docs/03` §8.9.

## 5 · Las cinco reglas que no se pueden romper

### 5.1 · `frecuencia_verificacion` NO es un vencimiento

Es una **cadencia**, como las categorías de `P-SG-08`. La obligación no caduca;
lo que caduca es **la próxima verificación**. Por eso `proxima_verificacion` es
una fecha aparte y `vence_en` vive en otra tabla.

### 5.2 · La app PROPONE, la persona DECIDE, y lo decidido se guarda

`min/max_trabajadores` proponen si una NOM aplica. **La columna guarda lo que
decidió el consultor**, no la fórmula. Es la misma decisión que
`programa_procesos.nc_previas` (F03·B6): *«un programa aprobado es evidencia: si
el número se recalculara solo, anular algo en noviembre reescribiría lo que la
Dirección firmó en enero»*.

### 5.3 · El CUÁNDO lo manda el teléfono; el QUIÉN, el servidor

`evaluado_en` es una **acción de campo**: el consultor evaluó el extintor a las
10:15 en modo avión y la fila llega a las 14:00. Un `now()` del servidor pondría
en el informe la hora en que volvió el semáforo. `evaluado_por_id` lo sella
`auth.uid()`. Es literalmente la regla de la Fase 03, y `creado_en` sigue siendo
del servidor para que un reloj mal puesto se note.

### 5.4 · `vence_en` se guarda calculada, no se deriva al vuelo

Es la columna que se indexa y por la que barre el cron. Y **no puede ser
generada**: `emitido_en + vigencia_meses` con `interval` no es `IMMUTABLE`, y
además hay vencimientos que se capturan a mano sin emisión (una licencia que ya
venía). La app la calcula al guardar; la base la exige `NOT NULL`.

### 5.5 · Offline: `B1` es campo, `B2` es oficina

| | `B1` evaluación | `B2` vencimientos |
|---|---|---|
| Dónde se usa | **Caminando por la planta, sin señal** | Escritorio |
| Lecturas | `useQuery` con clave de `keys.ts` | idem |
| Escrituras | **`offlineWrite`**, etiqueta legible | `offlineWrite` |
| Desplegables | ⚠️ **Por `useQuery`**: sin señal llegan vacíos y el guardado muere en la validación *antes* de encolarse | idem |
| Filtros | ⚠️ **En memoria**, jamás en la clave de caché | idem |
| **Precarga** | ⚠️ **Obligatoria**, §7 | No |

## 6 · Los avisos de `B2`

**Cadencia: 90 / 60 / 30 / 7 días.** ⚠️ `docs/02` y `docs/06` decían «90, 30 y
7»; el único documento del cliente que lo tabula —`SGI-P-TI-01` §5.17.3— dice
**«alertas a 90, 60 y 30 días»**. **Gana el formato sobre la prosa del plan**
(precedente de `D06`), y el de 7 días se conserva como último recordatorio de
Summit.

- Categoría: **`obligacion_proxima`**, ya en el CHECK.
- ⚠️ **`clave_evento` describe el HECHO, no el momento**:
  `vencimiento:<id>:vence_90`. Con el índice único parcial, correr el cron tres
  veces no manda tres avisos.
- ⚠️ **Lo vencido avisa UNA VEZ, el día que vence**, no todos los días a partir de
  ahí. Un aviso que se repite se silencia, y con él los que sí importaban. El
  seguimiento de lo vencido es la pantalla.
- ⚠️ **NO hay un tercer cron.** El plan Hobby de Vercel da dos y están ocupados.
  El barrido se cuelga de `correr_avisos_programados()`, igual que el «Estado de
  las NC» bimestral se colgó del diario.
- **Toda la lógica vive en la RPC**; la ruta sólo hace el fan-out de push. La
  función necesita ver los vencimientos de **todas** las organizaciones y va con
  `revoke`.

## 7 · La precarga — lo que decide si `B1` sirve

Es la misma lección de `F03·B3`, y es la que más caro sale olvidar: **la caché
sólo tiene lo que alguien ya abrió**. Sin «Descargar para trabajar sin señal», en
la planta la pantalla del recorrido sale **vacía** —no se perdieron los datos,
nunca se bajaron— y para cuando se nota, el consultor ya está en un sótano.

Piezas que hay que precargar al abrir un recorrido de cumplimiento con señal:

1. El sitio y **sus áreas**.
2. Las `obligaciones` de ese sitio con su estado.
3. Las `noms` y `nom_requisitos` implicados.
4. `obligacion_tipos` (es un desplegable).
5. El equipo de la organización (`responsable_id`).
6. Los adjuntos ya subidos de esas obligaciones.
7. El membrete de la firma (`firma.identidad()`), para poder imprimir.

⚠️ **El aviso «lista para trabajar sin señal» se calcula mirando la CACHÉ**, con
un `faltaPorPrecargar()` propio — **no un `useState`**. Con un booleano en el
componente, salir de la pestaña y volver diría «descarga antes de entrar» con
todo bajado, y eso hace que alguien se dé la vuelta en la puerta.

## 8 · Las pantallas

`/cumplimiento` **ya existe** como `PantallaPendiente`. Es un dominio, así que
son **pestañas con query string**, no carpetas (§2.1 de `docs/03`).

⚠️ **Pide cliente en la URL (`?org=`), como `/sistemas` y al revés que
`/auditorias`.** Cuatro de sus cinco pestañas son el expediente de *una*
organización. Una `org` que ya no está cae en «ninguna», nunca en una pantalla
consultando con un id fantasma.

| Pestaña | Qué hace |
|---|---|
| **Matriz** | Las `obligaciones` del cliente, agrupables por NOM, por sitio y por área. Alta manual y botón **«Generar desde una NOM»** (la RPC) |
| **Recorrido** | ⚠️ **La de campo.** Por sitio y área, el elemento con su texto de obligación, los cinco veredictos, la observación y la cámara. Contador de pendientes **permanente** |
| **Semáforo** | Conteos por NOM y por sitio, **en memoria** — sin vista en la base, como los widgets |
| **Vencimientos** | `B2`. Lista, calendario y filtros en memoria |
| **Catálogo de NOMs** | La biblioteca de la firma: alta, edición y baja. **No pide `org`** |

**Reglas de interfaz que ya están decididas** (§5 de `docs/05`): nada lleva
tarjetas; bloques y filas de `RejillaTablero`/`Lista`; inline styles con
variables CSS; nada de `vh` crudo — `var(--vh-full)`; lo pegado al fondo suma
`var(--bottom-nav-total)`.

⚠️ **La ayuda del veredicto se pinta al elegirlo**, no en un manual. Es lo que
hace que dos consultores evalúen igual — misma lección que `CRITERIO_HALLAZGO`.
Y **todo catálogo indexado por un valor de la base degrada enseñando el valor
crudo**, nunca `undefined`: un `.color` sobre `undefined` en un bucle se lleva
los cuarenta renglones y el consultor ve la página de error, no «un renglón raro».

## 9 · El widget que cierra la fase

⚠️ **`vencimientos_criticos` es el ÚLTIMO placeholder del tablero**
(`src/lib/tablero/widgets.ts:143`). **Se conecta en el mismo commit** que cierre
el bloque: si no, el tablero —lo primero que la firma abre cada mañana— sigue
diciendo «llega en la Fase 05» con la fase entregada, y eso se lee como que la
fase no está. Pasó con la 02 y la 03.

Se calcula **en memoria** sobre la lista ya bajada, como los demás.

## 10 · Lo imprimible

El **informe de levantamiento** reproduce el formato de Summit, en
`src/lib/plantillas/levantamientoCumplimiento.ts`. Devuelve **una cadena** y no
consulta; `esc()` en **cada** interpolación —el texto lo escribió una persona—;
membrete y pie compartidos de `impresion.ts`; vista previa en el
`<iframe sandbox>` para que lo que se ve sea lo que sale por la impresora.

**Sus secciones, en este orden** (es el documento que el cliente ya sabe leer):
membrete · fecha, proyecto y **elaborado por (lista)** · objetivo del recorrido ·
**áreas recorridas** · la tabla `elemento / normatividad / observación /
veredicto` · desafíos · próximos pasos · hallazgos relevantes · recomendaciones ·
anexos.

⚠️ **No introduce ni una clave de consulta nueva.** Se genera en la planta, así
que sus consultas son **exactamente** las siete de la precarga. Si al escribirlo
aparece una octava, es un hueco — como pasó con `firma.identidad()` en `B5`.

## 11 · La migración

**Nombre:** `2026MMDD120000_cumplimiento_normativo.sql`, tarea `F00`.

✅ **Es aditiva**: tablas nuevas, columnas nullable o con default, y dos CHECK que
se **amplían**. No rechaza ninguna fila que antes pasaba.

**Qué lleva, en orden:**

1. `noms`, `nom_requisitos`, `obligacion_tipos` con su partición (`es_demo`,
   `unique (clave, es_demo)`).
2. `sitio_areas` con su trigger de herencia de `org_id`.
3. `obligaciones` y `vencimientos` con sus CHECK, triggers y políticas.
4. `adjuntos.obligacion_id` y `adjuntos.vencimiento_id`.
5. `generar_obligaciones_de_nom()`.
6. El barrido de vencimientos **dentro de** `correr_avisos_programados()`.
7. `puedo_borrar_org()` ampliada.
8. ⚠️ **De paso, y por eso se aprovecha:** las cuatro categorías multinorma del
   **hueco 29** (`politica_compliance`, `canal_denuncias`, `incidente_seguridad`,
   `obligaciones_compliance`) y los dos valores de `riesgos.tipo`. Se avisó a
   tiempo, la migración de avisos se aplicó el ~15 sep y no se alcanzó; **meterlos
   aquí cuesta cero, en otra migración cuesta otra migración.**

**Políticas (regla 1):** toda tabla de dominio con
`USING (org_id IN (SELECT mis_organizaciones()))` **a secas** — ⚠️ **sin
`or public.es_socio()`**, que desde `A10` vive dentro de la función y reabrirlo
por fuera se salta la partición de pruebas. El INSERT y el UPDATE pasan además
por `puedo_editar_org()`, que excluye al papel `lectura`.

**Cómo se prueba** (no es opcional): Docker con Postgres 17, **las diecisiete
anteriores en orden y con datos sembrados ANTES** —el camino real, no una base
vacía—, con el preámbulo que stubbea `auth` y `storage` y cuyo `auth.uid()`
**lee `request.jwt.claims`**, o las pruebas de RLS pasan porque el usuario
simulado no es nadie. Y se regenera `src/types/database.ts` **en el mismo
commit**.

**Comprobaciones mínimas que tiene que pasar:**

| # | Qué |
|---|---|
| 1 | Una obligación sin `justificacion` se rechaza, **aplique o no aplique** |
| 2 | `parcial` sin `observacion` se rechaza |
| 3 | Un área de otro sitio se rechaza |
| 4 | `generar_obligaciones_de_nom()` dos veces no duplica |
| 5 | …y **no pisa** una obligación ya evaluada |
| 6 | …y con papel `lectura` **no genera nada** |
| 7 | `evaluado_por_id` mandado por el navegador **se sobrescribe** |
| 8 | `evaluado_en` mandado por el navegador **se conserva** |
| 9 | Una `org` no asignada **no ve** ni una obligación |
| 10 | La cuenta de pruebas **no ve** las NOMs reales y puede dar de alta su propia `NOM-002-STPS-2010` |
| 11 | Un sitio con obligaciones evaluadas **no se borra** |
| 12 | Un área con obligaciones **no se quita** |
| 13 | El cron corrido tres veces **no manda tres avisos** del mismo vencimiento |
| 14 | Un vencido avisa **una sola vez** |
| + | **Regresión** de las diecisiete anteriores |

## 12 · Lo que NO entra, y por qué

| Fuera | Motivo |
|---|---|
| **`B3` capacitación** | ✅ **`F03` resuelta el 23 sep 2026: Summit NO emite DC-3**, lo contrata a un agente capacitador externo. B3 ya no genera constancias: las **registra** (folio + PDF por asistente) y prepara los datos que el externo necesita. Especificado y construido en `docs/14` |
| **Matriz IPERC** | Es riesgo ocupacional y usa la escala de [`SGI-F-CA-23`](formatos_informeAuditorias/SGI-F-CA-23_matriz_de_riesgos.md), que es Fase 02. `B1` sólo engancha el **requisito legal por peligro** |
| **Calculador de días hábiles** | Los vencimientos son días naturales. Los días hábiles son de ARCO, que es privacidad y está fuera de fase |
| **Continuidad y privacidad** | Son **servicios**, no dominios (hueco 39). Hasta que exista `servicios`/`org_servicios`, no se pintan |
| **Retención y supresión de datos personales** | Deuda declarada (hueco 42). Lo que sí entra: **una advertencia corta al subir** documentos con datos de trabajadores, que **no bloquea** |

## 13 · Criterio de cierre de B1+B2

> Para un cliente se da de alta una NOM en la biblioteca con sus elementos
> verificables, se genera su matriz para un sitio con tres áreas, **se evalúa
> caminando y en modo avión**, la cola sincroniza al recuperar señal y sale el
> semáforo. Se registran seis estudios con sus vigencias, **la app avisa 90 días
> antes** de que venza el de ruido, y el widget `vencimientos_criticos` lo
> enseña en el tablero del lunes. El informe de levantamiento se imprime con
> membrete y sin conexión.

⚠️ **La prueba de la evaluación sin señal se hace en el teléfono contra la URL de
Vercel**, que es HTTPS. En `npm run dev` no hay service worker y desde
`http://192.168.x.x:3000` tampoco, ni con build de producción. Es la única
prueba que vale, porque es la única que se hace con el dedo.
