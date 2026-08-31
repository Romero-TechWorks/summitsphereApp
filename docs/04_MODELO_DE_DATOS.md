# 04 · Modelo de datos

Cada tabla está marcada con la fase que la crea. **El orden de este documento es
el orden de las migraciones.**

Convenciones, sin excepciones:

- Nombres **en español**, `snake_case`. Excepción: lo que impone el proveedor
  (`created_at` de Supabase, `auth.uid()`).
- Toda tabla de dominio: `id uuid PK default gen_random_uuid()`,
  `org_id uuid NOT NULL REFERENCES organizaciones(id)`, `creado_en timestamptz`,
  `actualizado_en timestamptz`, `creado_por uuid REFERENCES usuarios(id)`.
- Catálogos: **`text` + `CHECK`**, nunca `enum` (§4.2).
- Fechas de calendario: **`date`**. Instantes: **`timestamptz`**.
  ⚠️ Una `date` formateada con `new Date()` corre un día en México.
- Dinero: `numeric(14,2)`. Nunca `float`.

---

# FASE 00 · Base

## `organizaciones`
La raíz de la multi-tenencia. **Todo cuelga de aquí.**

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `razon_social` | text NOT NULL | |
| `nombre_comercial` | text | Cómo se le dice en la firma |
| `rfc` | text | |
| `giro` | text | Manufactura, servicios, salud, construcción… |
| `tamano` | text CHECK | `micro` · `pequena` · `mediana` · `grande` |
| `logotipo_url` | text | |
| `estado` | text CHECK | `prospecto` · `activo` · `pausado` · `cerrado` |
| `notas` | text | |
| `es_demo` | boolean NOT NULL default false | **La partición de pruebas.** De qué lado vive este cliente. La sella `sellar_particion()` al crearlo y no se cambia desde la app |

⚠️ **`es_demo` es la raíz de la partición, igual que `organizaciones` es la raíz
de la multi-tenencia.** Todo lo que lleva `org_id` queda partido por herencia, sin
una columna más: la regla entera es `organizaciones.es_demo = soy_dev()` y vive
dentro de `mis_organizaciones()`. Ver docs/08 §2 y `09_TAREAS_DEL_DUENO.md` · `A10`.

## `usuarios`
Espeja `auth.users`. El perfil y el rol viven aquí.

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `nombre` | text NOT NULL | |
| `correo` | text NOT NULL | |
| `telefono` | text | |
| `rol` | text CHECK NOT NULL | `socio` · `consultor` · `auditor` · `administracion` · `cliente` |
| `certificaciones` | text[] | *Auditor líder ISO 9001*, *ISO 45001*… Se imprime en el informe de auditoría |
| `activo` | boolean default true | |
| `avatar_url` | text | |
| `es_dev` | boolean NOT NULL default false | **Cuenta de pruebas**: ve sólo la partición de demostración. **No es un rol**, se pone encima del rol |

⚠️ **`es_dev` no está en el CHECK de `rol` a propósito.** Con un sexto rol,
`es_socio()` sería falso para la cuenta de pruebas y ésa no podría dar de alta un
cliente, importar el catálogo ni repartir equipo — que es justo lo que hay que
poder probar. Y sólo un socio **de la partición real** puede ponerla o quitarla:
`proteger_rol_usuario()`.

⚠️ Esta tabla **no lleva `org_id`**: un consultor sirve a varias organizaciones.
El vínculo es la tabla siguiente.

## `usuarios_organizaciones`
**La tabla de la que cuelga todo el RLS del proyecto.**

| Columna | Tipo | Nota |
|---|---|---|
| `usuario_id` | uuid FK | |
| `org_id` | uuid FK | |
| `papel` | text CHECK | `lider` · `apoyo` · `auditor` · `lectura` |
| PK compuesta | `(usuario_id, org_id)` | |

De aquí sale `mis_organizaciones()`, la función que usan todas las políticas.

## `config_firma`
Fila única. Datos de Summit-Sphere, módulos encendidos, plazos por defecto,
plantillas.

| Columna | Tipo | Nota |
|---|---|---|
| `id` | int PK CHECK (`id = 1`) | Fila única, impuesta por el CHECK |
| `razon_social`, `rfc`, `direccion`, `telefono`, `correo`, `logotipo_url` | text | |
| `modulos_activos` | text[] | Qué está encendido. Ver *módulos apagados de fábrica* |
| `plantillas` | jsonb | Configuración de los entregables imprimibles. **Lleva dentro la partición**: `{ tareas, verificacion, dev: { tareas, verificacion } }`. Es la única tabla que el RLS no puede partir —tiene una sola fila—, así que se separa por espacio de nombres desde `src/lib/auth/particion.ts` |
| `plazos_default` | jsonb | Días por tipo de hallazgo |

⚠️ **La lee cualquiera con sesión: ninguna contraseña va aquí.**

## `audit_logs`
Inmutable. Sin UPDATE ni DELETE en RLS.

| Columna | Tipo |
|---|---|
| `id` | bigint PK |
| `tabla`, `registro_id`, `operacion` | text |
| `usuario_id` | uuid |
| `org_id` | uuid |
| `antes`, `despues` | jsonb |
| `contexto` | text |
| `creado_en` | timestamptz |

Trigger genérico `registrar_bitacora()`, enganchado a cada tabla de dominio.

## `notificaciones`

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `usuario_id` | uuid FK | |
| `org_id` | uuid FK | |
| `categoria` | text CHECK | `hallazgo_asignado` · `accion_por_vencer` · `accion_vencida` · `documento_por_aprobar` · `obligacion_proxima` · `resumen_diario` · `evidencia_evaluada` |
| `titulo`, `cuerpo`, `enlace` | text | |
| `leida_en` | timestamptz | |

Más `push_suscripciones` (endpoint, llaves, dispositivo) y
`preferencias_notificacion` (por usuario y categoría).

## `preferencias_tablero`
El orden en que cada persona acomodó sus widgets [F00·B6].

| Columna | Tipo | Nota |
|---|---|---|
| `usuario_id` | uuid PK FK | |
| `orden` | text[] | Ids del catálogo de `src/lib/tablero/widgets.ts` |
| `actualizado_en` | timestamptz | |

⚠️ **Sin `org_id`, y no es un olvido.** La fila pertenece a una persona, no a una
organización cliente — igual que `usuarios`. Su política es
`usuario_id = auth.uid()`, más estricta que el filtro por cartera. Tampoco lleva
trigger de bitácora: arrastrar un widget no es un acto auditable, y engancharlo
llenaría `audit_logs` de ruido en la tabla que más se escribe.

Por eso está declarada en la lista `EXENTAS` de `.github/workflows/rls-check.yml`,
junto a `usuarios` y los catálogos globales. **Esa lista y esta tabla se cambian
juntas**: si no, la auditoría de aislamiento avisa de una tabla sin `org_id` en
cada corrida y el aviso se vuelve ruido que todos aprenden a ignorar — que es
justo lo que no puede pasar con la comprobación que vigila la regla 1.

### Funciones — Fase 00

```sql
mis_organizaciones()      -- setof uuid, STABLE, SECURITY DEFINER
es_socio()                -- boolean, STABLE
registrar_bitacora()      -- trigger genérico de bitácora
tocar_actualizado_en()    -- trigger, mantiene `actualizado_en`
impedir_cambios_bitacora()-- trigger, rechaza UPDATE y DELETE en audit_logs
proteger_rol_usuario()    -- trigger, sólo un socio cambia `rol` y `activo`
crear_perfil_usuario()    -- trigger en auth.users → public.usuarios
registrar_inicio_sesion() -- RPC, la llama /login
```

⚠️ **`impedir_cambios_bitacora()` no es redundante con el RLS.** Las políticas no
alcanzan al `service_role`, que se las salta todas; el trigger corre para todos.
Sin él, la frase *"no se puede borrar ni con el service role desde la app"* del
criterio de cierre de la Fase 00 sería falsa.

⚠️ **`proteger_rol_usuario()` tampoco.** RLS no sabe de columnas: la política de
UPDATE deja a cada quien editar **su** fila, y sin este trigger "su fila" incluye
`rol`. Cualquiera con sesión se pondría `socio`.

⚠️ **`crear_perfil_usuario()` nunca lee el rol de `raw_user_meta_data`.** Esa
columna la escribe el propio usuario: tomar el rol de ahí sería regalar `socio` a
quien lo pida. Toda cuenta nace `cliente` y la asciende un socio.

---

# FASE 01 · Cartera

Migración `20260821180000_cartera_y_proyectos.sql`. **Trae la fase entera de una
vez** —también el catálogo de normas que llena el importador de F01·B2b— para
que se aplique una sola migración y los tipos se regeneren una sola vez.

## `sitios`
Los centros de trabajo. **Una organización puede tener cinco plantas y el alcance
del certificado cubrir sólo dos.**

| Columna | Tipo | Nota |
|---|---|---|
| `nombre` | text NOT NULL | *Planta Toluca* |
| `direccion`, `municipio`, `entidad`, `cp` | text | |
| `tipo` | text CHECK | `planta` · `oficina` · `almacen` · `obra` · `sucursal` |
| `num_trabajadores` | int | Determina qué NOMs aplican, **por sitio** |
| `notas` | text | Accesos, horarios, a quién buscar en la caseta |
| `activo` | boolean | Se da de baja; no se borra |

## `contactos`

| Columna | Tipo | Nota |
|---|---|---|
| `nombre`, `puesto`, `correo`, `telefono` | text | |
| `papel` | text CHECK | `representante_direccion` · `coordinador_sgc` · `responsable_seguridad` · `contacto_comercial` · `otro` |
| `sitio_id` | uuid FK | Nulo = de toda la organización |
| `principal` | boolean | Con quién se habla primero |
| `activo` | boolean | |

⚠️ **`acceso_portal` NO existe todavía**, y es deliberado: el portal del cliente
llega en la Fase 06 y una casilla que no enciende nada es un interruptor muerto
(CLAUDE.md regla 11). La columna se agrega en la migración de esa fase, junto a
lo que la lee.

## `normas` · `norma_clausulas`
**Catálogos globales, sin `org_id`** — declarados en la lista `EXENTAS` de
`.github/workflows/rls-check.yml`. Sólo los escribe un socio.

⚠️ **Desde `A10` ya no se leen «con sesión» sino «con sesión y de tu lado»**: las
dos llevan `es_demo` y sus políticas filtran por `es_demo = soy_dev()`. El motivo
no es la simetría: el importador es idempotente y **marca `activa = false` lo que
no viene en el archivo**, así que una prueba de importación contra un catálogo
compartido daría de baja cláusulas reales que los hallazgos del cliente citan.

⚠️ **Adelantados desde la Fase 02 y VACÍOS.** El catálogo de Summit no se siembra
desde el repositorio: se sube como archivo `.md` y se indexa desde la app
(F01·B2b). Es lo que mantiene el criterio técnico de la firma fuera de Git —regla
12— y lo que permite corregir un resumen sin escribir una migración. El detalle
de columnas está en la Fase 02, más abajo; en la Fase 01 sólo existen la
estructura y la política. `condensada` (Token Diet) llega con el Módulo B.

## `proyectos`
El contrato. **`etapa` son las seis de la metodología de Summit.**

| Columna | Tipo | Nota |
|---|---|---|
| `nombre` | text NOT NULL | |
| `tipo` | text CHECK | `implementacion` · `auditoria` · `capacitacion` · `cumplimiento` · `automatizacion` · `soporte_it` |
| `etapa` | text CHECK | `diagnostico` · `planificacion` · `documentacion` · `implementacion` · `auditoria_interna` · `certificacion` |
| `estado` | text CHECK | `propuesta` · `activo` · `pausado` · `cerrado` · `cancelado` |
| `lider_id` | uuid FK usuarios | |
| `fecha_inicio`, `fecha_fin_estimada`, `fecha_fin_real` | date | |
| `monto` | numeric(14,2) | |
| `moneda` | text CHECK | `MXN` · `USD`, default `MXN` |
| `objetivo` | text | |

## `proyecto_normas` · `proyecto_sitios`
El alcance real, en tablas, no en una cadena de texto. **De aquí sale la lista de
verificación de una auditoría.** PK compuesta, y las **dos únicas tablas de la
fase con `DELETE`**: quitar una norma del alcance es corregir un contrato, no
destruir un registro.

⚠️ **Su `org_id` la pone un trigger, no el cliente** (`heredar_org_del_proyecto`).
Y `proyecto_sitios` valida además que el sitio sea de esa misma organización
(`validar_sitio_del_proyecto`): ni una FK ni un CHECK pueden mirar dos tablas a
la vez.

## `bitacora_proyecto`
Línea de tiempo: visitas, entregas, cambios de etapa, acuerdos.

| Columna | Tipo | Nota |
|---|---|---|
| `proyecto_id` | uuid FK | |
| `tipo` | text CHECK | `visita` · `entrega` · `cambio_etapa` · `acuerdo` · `incidencia` · `nota` |
| `fecha` | date | |
| `titulo`, `detalle` | text | |
| `participantes` | text[] | |

⚠️ Sin `DELETE` y sin trigger de bitácora: **ya es una bitácora**. Una entrada
equivocada se corrige con otra entrada, y sólo su autor —o un socio— la edita.

## `tareas_etapa`
El checklist de la metodología dentro de un proyecto [F01·B5].

| Columna | Tipo | Nota |
|---|---|---|
| `proyecto_id` | uuid FK | |
| `etapa` | text CHECK | Las **mismas seis** de `proyectos.etapa` |
| `titulo` | text NOT NULL | |
| `detalle` | text | |
| `orden` | int | El orden dentro de su etapa |
| `estado` | text CHECK | `pendiente` · `en_curso` · `hecha` · `no_aplica` |
| `responsable_id` | uuid FK usuarios | |
| `fecha_compromiso` | date | |
| `hecha_en` | timestamptz · `hecha_por` uuid FK | Quién la cerró y cuándo. **Los escribe el trigger `sellar_tarea_hecha()`**, no el cliente |

⚠️ **`exige_evidencia` llega en F02·B2b**, con los adjuntos: una casilla que no
puede impedir nada todavía es un interruptor muerto (regla 11).

⚠️ **No es la tabla `tareas` de la Fase 04.** Aquélla son los pasos de una acción
correctiva: nace de un hallazgo, lleva verificación de eficacia y la audita un
tercero. Ésta es trabajo interno de la firma. Unirlas dejaría media fila vacía en
cada caso y obligaría a explicarle a un auditor por qué su acción correctiva vive
en la misma tabla que «mandar la propuesta por correo».

⚠️ **`etapa` repite el CHECK de `proyectos.etapa`, y los dos se mueven juntos** —
igual que `src/lib/cartera/catalogos.ts`. Una tarea colgada de una etapa que ya no
existe no se pinta en ningún sitio y nadie la vuelve a ver.

⚠️ La **plantilla** por tipo de proyecto no es una tabla: vive en
`config_firma.plantillas` (jsonb), que ya existe, y se instancia al abrir el
proyecto. Después se edita libremente — ningún cliente es igual a la plantilla.

### Funciones y triggers — Fase 01

```sql
puedo_editar_org(uuid)        -- boolean, STABLE, SECURITY DEFINER. Excluye al papel `lectura`
puedo_borrar_org(uuid)        -- boolean. Fase 01: sólo socio. ⚠️ AMPLIAR en F02/F03
puedo_borrar_proyecto(uuid)   -- boolean. Fase 01: sólo socio. ⚠️ AMPLIAR en F03
heredar_org_del_proyecto()    -- trigger BEFORE: la org de lo que cuelga de un proyecto
validar_sitio_del_proyecto()  -- trigger BEFORE: el sitio del alcance es de ese cliente
registrar_cambio_etapa()      -- trigger AFTER: mover de etapa escribe en la bitácora
sellar_tarea_hecha()          -- trigger BEFORE: quién cerró una tarea y cuándo
```

⚠️ **`puedo_borrar_*()` existe para tener UN sitio que ampliar.** Hoy sólo
comprueba que quien borra sea socio, porque lo único que cuelga de una
organización es su propia cartera. El día que existan `documentos`,
`auditorias` y `hallazgos`, borrar una organización que los tenga sería destruir
evidencia — y la condición se agrega ahí dentro, no en cinco políticas.

⚠️ **`registrar_cambio_etapa()` lo hace la BASE y no la app.** Sin señal, el
`UPDATE` del proyecto y el `INSERT` de la bitácora saldrían como dos operaciones
distintas de la cola; si la segunda fallara, la línea de tiempo mentiría. Y la
fecha se calcula con `(now() AT TIME ZONE 'America/Mexico_City')::date`, **no con
`current_date`**: la base corre en UTC, así que a las 19:00 de México
`current_date` ya es mañana.

⚠️ **`organizaciones_update` se recreó aquí** para usar `puedo_editar_org()`.
Dejar la organización con una política más floja que la de sus sitios sería una
incoherencia con forma de bug: un `lectura` que no puede tocar un contacto pero
sí renombrar al cliente entero.

---

# FASE 02 · Sistemas de gestión

> **Todo lo de abajo lo crea `20260822120000_sistemas_de_gestion.sql`** (22 ago
> 2026), salvo `normas` y `norma_clausulas`, que ya existían de la migración 3.
> Las políticas de Storage van en `20260822120100_storage_documentos_y_evidencias.sql`,
> **aparte a propósito**: tocan `storage.objects`, que no es un esquema nuestro,
> y si fallan por permisos no pueden llevarse por delante el esquema del dominio.

## `normas`
Las siete. **Catálogo global, sin `org_id`.**

⚠️ **La tabla se crea en la Fase 01, no aquí** — `proyecto_normas` la necesita
para el alcance de un proyecto. Lo que llega en la Fase 02 es su contenido, y
llega **por el importador de `.md`** (F01·B2b), nunca por una semilla del
repositorio.

| Columna | Tipo | Ejemplo |
|---|---|---|
| `clave` | text | `iso_9001` |
| `nombre` | text | `ISO 9001` |
| `version` | text | `2015` |
| `titulo` | text | `Sistemas de gestión de la calidad` |
| `activa` | boolean | |
| `es_demo` | boolean NOT NULL default false | La partición. La sella `sellar_particion()` |
| **UNIQUE** | `(clave, es_demo)` | ⚠️ Ver abajo |

⚠️ **`clave` dejó de ser única a secas y pasó a serlo POR PARTICIÓN** con `A10`.
Sin ese cambio la partición del catálogo no serviría de nada: con `iso_9001` única
en toda la base, la cuenta de pruebas **no podría importar su propio catálogo**
mientras exista el del cliente, y su cartera de demostración se quedaría con
proyectos cuyo alcance apunta a normas que no puede ver.

⚠️ **Y por eso el importador ya no hace `upsert` sobre `clave`**: es la misma
regla que en `requisitos` y `mediciones` (§6.1). Busca primero —la consulta ya
viene filtrada por partición por el RLS, así que devuelve como mucho una fila, la
de su lado— y después decide `insert` o `update`.

Semilla: `iso_9001` · `iso_14001` · `iso_45001` · `iso_13485` · `iso_27001` ·
`iso_37001` · `iso_37301`.

## `norma_clausulas`
El árbol. **Catálogo global.** Tabla creada en la Fase 01, junto a `normas`.
`condensada` se agrega con el Módulo B [Fase 07]: hasta entonces no hay quien la
lea (CLAUDE.md regla 11).

| Columna | Tipo | Nota |
|---|---|---|
| `norma_id` | uuid FK | |
| `padre_id` | uuid FK self | El árbol |
| `numero` | text | `8.5.1` |
| `titulo` | text | `Control de la producción y de la provisión del servicio` |
| `resumen` | text | ⚠️ **Redactado por Summit, no copiado de la norma** (CLAUDE.md regla 12) |
| `condensada` | text | La *Token Diet* del Módulo B: `[ISO9001\|8.5.1\|Ctrl_Produccion\|Req:Info_Documentada,Monitoreo,Competencia]` |
| `auditable` | boolean | Los capítulos 0-3 no se auditan |
| `orden` | int | |
| `es_demo` | boolean NOT NULL default false | **Se hereda de la norma** (`heredar_particion_de_la_norma`), nunca lo manda el cliente. Y si una norma cambia de lado, sus cláusulas la siguen (`propagar_particion_de_la_norma`) |

## `documentos` · `documento_versiones`
El control documental. El corazón de un SGC.

**`documentos`**

| Columna | Tipo | Nota |
|---|---|---|
| `codigo` | text | `PR-CAL-001` |
| `titulo` | text | |
| `tipo` | text CHECK | `manual` · `procedimiento` · `instructivo` · `formato` · `registro` · `politica` · `plan` · `externo` |
| `proceso_id` | uuid FK | Proceso dueño |
| `proyecto_id` | uuid FK NULL | Qué contrato lo produjo. La biblioteca se puede mirar entera o por proyecto |
| `version_vigente_id` | uuid FK | |
| `estado` | text CHECK | `vigente` · `obsoleto` · `en_elaboracion` |

**`documento_versiones`**

| Columna | Tipo | Nota |
|---|---|---|
| `documento_id` | uuid FK | |
| `version` | text | `1.0`, `2.0` |
| `estado` | text CHECK | `borrador` · `en_revision` · `aprobado` · `obsoleto` |
| `archivo_ruta` | text | ⚠️ La **RUTA** del original en el bucket privado `documentos`, no una URL: el bucket es privado y se firma al abrir. Una URL firmada guardada aquí caduca en una hora. **El archivo nunca se tira** |
| `archivo_nombre`, `archivo_tipo`, `archivo_tamano` | | Cómo se llamaba de verdad. La ruta lleva el id de la versión, porque dos revisiones del manual se llaman las dos `Manual de Calidad.docx` |
| `markdown` | text | La misma versión convertida a Markdown: lo que se lee y se edita en la app, y lo que leerá el asistente [Fase 07] |
| `origen_markdown` | text CHECK | `docx` · `pdf` · `escrito` — de dónde salió, y por tanto cuánto fiarse |
| `avisos_conversion` | text[] | Qué no sobrevivió: tablas, imágenes, numeración automática |
| `elaboro_id`, `reviso_id`, `aprobo_id` | uuid FK | |
| `fecha_elaboracion`, `fecha_aprobacion`, `fecha_vigencia` | date | |
| `control_cambios` | text | Qué cambió respecto a la versión anterior |

⚠️ **Nunca se sobrescribe una versión aprobada.** Aprobar una nueva marca la
anterior `obsoleto` y la conserva. Un auditor externo pide exactamente eso.
Editar el Markdown de una versión aprobada **crea la siguiente**, no la modifica.

**Y lo impone la base, no la pantalla** — cuatro piezas:

| Pieza | Qué garantiza |
|---|---|
| `proteger_version_aprobada()` | Una versión aprobada sólo puede pasar a `obsoleto`; cualquier otro cambio se rechaza. Una obsoleta ya no cambia nada |
| `jubilar_version_anterior()` | Aprobar jubila a la anterior **y** apunta `documentos.version_vigente_id` a la nueva, en una sola escritura del cliente. Tres operaciones de la cola podrían llegar desparejadas sin señal, y un documento con dos versiones aprobadas es el hallazgo que la firma le levanta a sus clientes |
| `sellar_version_documento()` | `aprobo_id` y `fecha_aprobacion` los escribe el servidor, con `auth.uid()` y la fecha en la zona de la firma. ⚠️ `elaboro_id` y `reviso_id` **no** se sellan: son capturables, y firmar como revisor a quien sólo movió el estado sería inventar una firma |
| `puedo_borrar_documento()` | Un documento con alguna versión `aprobado` u `obsoleto` no se borra. Un borrador capturado por error, sí |

⚠️ El DELETE de `documento_versiones` sólo alcanza a los `borrador`. Un borrador
es un archivo a medias; una versión aprobada es el expediente.

⚠️ **El Markdown es una representación, no el documento.** Lo que firmó el
cliente es el archivo original; el `.md` sirve para leerlo en el teléfono,
editarlo sin Word y dárselo al asistente sin volver a procesarlo. Si los dos
discrepan, manda el original.

## `adjuntos`
Cola propia, bucket privado [F02·B2b, adelantado desde la Fase 04].

⚠️ **La tabla nace con las claves foráneas que HOY existen: `tarea_etapa_id` y
`documento_id`.** Las otras cuatro apuntarían a tablas que todavía no se han
creado —`hallazgos` es de la Fase 03, y `acciones`, `tareas` y `obligaciones` de
la 04 y la 05—, y una FK a una tabla inexistente es un error de migración, no una
previsión. Cada fase añade la suya con un `alter table`. El **orden completo** sí
está escrito ya en `CAMPOS_DOMINANTES` (`src/lib/offline/adjuntos.ts`) y en el
`coalesce` de `heredar_org_del_adjunto()`, para que ampliarlo sean dos líneas.

| Columna | Tipo | Nota |
|---|---|---|
| `tarea_etapa_id`, `documento_id` | uuid FK NULL | ⚠️ Se filtra con `campoDominante()`, **nunca con un OR** (§8.8) |
| `hallazgo_id` | uuid FK | [F03·B0] La evidencia de un hallazgo |
| `item_id` | uuid FK | [F03·B3] La foto o la nota dictada de un punto de la lista de verificación |
| `tarea_id`, `accion_id`, `obligacion_id` | | ⚠️ **Todavía no existen**: las añaden las Fases 04 y 05 |
| `ruta` | text | Ruta en Storage |
| `nombre`, `tipo_mime`, `tamano` | | |
| `titulo` | text | Lo que el usuario escribe |
| `subido_desde` | text CHECK | `app` · `portal` · `correo` — el portal deja rastro distinto |

⚠️ **La cadena del campo dominante crece por delante, no por detrás**: la tarea de
etapa es más específica que la acción, y la acción más que el hallazgo. Si un
adjunto llegara con dos, gana el primero de la lista — y por eso el orden se
escribe una sola vez, en `campoDominante()`.

⚠️ **`org_id` la pone `heredar_org_del_adjunto()`** a partir del campo dominante,
no el cliente. Un adjunto suelto de la organización —sin tarea y sin documento—
sí manda la suya, y el `WITH CHECK` de la política la valida.

⚠️ **El DELETE es sólo del socio.** Una foto adjunta a un hallazgo [Fase 03] es
evidencia de auditoría: si cualquiera pudiera quitarla, la trazabilidad
dependería de que nadie se equivoque de botón. Y **borrar la fila no borra el
objeto del bucket**: deliberado mientras no haya cron de limpieza — un archivo
huérfano cuesta unos centavos, una evidencia borrada por accidente no se
recupera.

⚠️ **`tareas_etapa.exige_evidencia` entra en esta migración**, no en la 4: es la
columna que `sellar_tarea_hecha()` usa para rechazar el paso a `hecha` sin
adjunto. Antes de que existiera `adjuntos` habría sido un interruptor muerto
(CLAUDE.md regla 11).

## `documento_clausulas`
Qué cláusula cubre qué documento. Alimenta la matriz de requisitos.

## `procesos`

| Columna | Tipo | Nota |
|---|---|---|
| `nombre` | text | |
| `tipo` | text CHECK | `estrategico` · `operativo` · `soporte` |
| `dueno_contacto_id` | uuid FK contactos | |
| `entradas`, `salidas`, `objetivo` | text | |

## `requisitos`
**La matriz.** Contesta *"¿cuánto nos falta para certificarnos?"*.

| Columna | Tipo | Nota |
|---|---|---|
| `proyecto_id` | uuid FK | |
| `clausula_id` | uuid FK | |
| `estado` | text CHECK | `no_iniciado` · `documentado` · `implementado` · `evidenciado` · `no_aplica` |
| `justificacion` | text | **Obligatoria si `no_aplica`** — es lo primero que revisa un auditor externo |
| `responsable_id` | uuid FK usuarios | |
| `evaluado_en` | timestamptz | |

Índice único `(proyecto_id, clausula_id)`.

## `riesgos`

| Columna | Tipo | Nota |
|---|---|---|
| `proceso_id` | uuid FK | |
| `tipo` | text CHECK | `riesgo` · `oportunidad` |
| `descripcion`, `causa`, `consecuencia` | text | |
| `probabilidad`, `impacto` | int CHECK 1..5 | |
| `nivel` | int GENERATED | `probabilidad * impacto` |
| `tratamiento` | text CHECK | `evitar` · `mitigar` · `transferir` · `aceptar` · `explotar` |
| `plan`, `responsable_id`, `fecha_revision` | | |

⚠️ `nivel` es columna generada con una multiplicación de enteros — **inmutable, sin
problema**. Lo que **no** puede ir en una columna generada es una fecha a texto
(§4 y CLAUDE.md).

⚠️ **Y en TypeScript llega como `number | null`, no como `number`.** El generador
de Supabase no marca las columnas generadas ni como no anulables ni como no
insertables; así sale de `supabase gen types`, y **lo generado manda**. En la
base nunca es null —`probabilidad` e `impacto` son NOT NULL—, así que el código
lo lee con `nivelDe()` (`src/lib/queries/riesgos.ts`), que recalcula lo mismo que
calcularía Postgres. Y **nadie manda `nivel` en un insert**, aunque el tipo lo
permita: Postgres lo rechaza con *«cannot insert a non-DEFAULT value into column
nivel»*.

## `indicadores` · `mediciones`

**`indicadores`**: nombre, proceso, fórmula, unidad, meta, sentido
(`mayor_mejor` · `menor_mejor`), frecuencia (`mensual` · `trimestral` ·
`semestral` · `anual`), responsable.

**`mediciones`**: indicador, periodo (`date`), valor `numeric`, comentario. El
semáforo se calcula comparando contra la meta según el sentido.

---

# FASE 03 · Auditorías

> **Aplicada por el dueño con `D00`.** El esquema entero vive en
> `20260824120000_auditorias_y_hallazgos.sql`, y las 42 comprobaciones de
> comportamiento que lo respaldan están listadas en esa tarea. `D04` le sumó
> `adjuntos.item_id` (`20260824180000_evidencia_de_campo.sql`).
>
> ⚠️ **`D05` está escrita y pendiente de aplicar**:
> `20260830120000_informe_de_auditoria.sql`, la del informe [F03·B5]. Añade
> `auditorias.objetivo` y `sellar_emision_informe()`. **18 comprobaciones**, 11 de
> ellas de regresión.

⚠️ **La regla de las fechas cambia en esta fase, y hay que leerla antes de tocar
nada.** En las fases 01 y 02 la base sella toda fecha, porque una que viaja desde
el navegador se puede escribir a mano. Aquí eso vale sólo a medias:

| | Quién lo escribe | Por qué |
|---|---|---|
| **Quién** (`auth.uid()`) | **Siempre la base** | No se falsifica ni en campo ni en oficina |
| **Cuándo**, acción de CAMPO (`auditoria_items.evaluado_en`, `hallazgos.detectado_en`) | **El reloj del teléfono** | El auditor evaluó a las 10:15 en modo avión y la fila llega a las 14:00. Un `now()` del servidor pondría en el informe la hora en que volvió el semáforo, no la hora en que se vio el extintor descargado |
| **Cuándo**, acción de OFICINA (`aprobado_en`, `cerrada_en`, `cerrado_en`, `informe_emitido_en`) | **La base** | Es un acto administrativo y pasa con señal |

Y no se pierde nada: `creado_en` y `actualizado_en` siguen siendo del servidor, así
que si el reloj del teléfono estaba mal las dos fechas discrepan y se ve.

## `programa_auditorias`
El programa anual por cliente. ISO 9001 §9.2.2 lo exige por escrito y aprobado.

| Columna | Tipo | Nota |
|---|---|---|
| `anio` | int CHECK 2000–2100 | |
| `nombre` | text NOT NULL | «Programa anual de auditorías 2026» |
| `objetivo`, `criterios` | text | |
| `estado` | text CHECK | `borrador` · `aprobado` · `cerrado` |
| `aprobado_por_id`, `aprobado_en` | | Los sella `sellar_programa_aprobado()`. Devolverlo a borrador **borra la firma** |

⚠️ **Sin `unique (org_id, anio)`, a propósito.** Un cliente certificado en 9001 y
en 45001 por organismos distintos lleva dos programas el mismo año. Un índice
único rechazaría el segundo, y como toda escritura pasa por la cola, el rechazo
llegaría tarde y sin nadie mirando.

## `auditorias`

| Columna | Tipo | Nota |
|---|---|---|
| `folio` | text UNIQUE | `AUD-2026-014`. **Lo asigna la base**, ver abajo |
| `titulo` | text NOT NULL | El folio identifica; esto es lo que se lee en una lista |
| `programa_id`, `proyecto_id` | uuid FK NULL | Los dos ON DELETE SET NULL. Una auditoría sobrevive al contrato que la pagó |
| `tipo` | text CHECK | `interna` · `preauditoria` · `seguimiento` · `certificacion_acompanamiento` · `proveedor` |
| `estado` | text CHECK | `planeada` · `en_curso` · `cerrada` · `cancelada` |
| `fecha_inicio`, `fecha_fin` | date | CHECK: no termina antes de empezar |
| `auditor_lider_id` | uuid FK | |
| `objetivo` | text | **Para qué** se hace esta auditoría [F03·B5]. Ver abajo |
| `alcance`, `criterios`, `metodologia`, `conclusiones` | text | El alcance **en palabras**, para el informe. El concreto son las tres tablas de abajo |
| `informe_emitido_en` | timestamptz | Lo sella `sellar_emision_informe()` [F03·B5]. Ver abajo |
| `cerrada_en`, `cerrada_por_id` | | Los sella `sellar_cierre_auditoria()` |

⚠️ **`objetivo` y `alcance` son columnas distintas a propósito.** El objetivo dice
*para qué* se audita («evaluar el grado de cumplimiento contra lo establecido en
el sistema de gestión») y el alcance *qué* se audita («las tres plantas del
grupo»). Los formatos de la firma —`F-SG-11` y `F-SG-12`— abren los dos con
«Objetivo», y el informe los imprime bajo subtítulos separados: en un solo campo,
la plantilla tendría que partir un texto libre por la mitad. Y no basta con el
`objetivo` de `programa_auditorias`, porque `programa_id` es NULLABLE — una
preauditoría o una de seguimiento no cuelgan de ningún programa anual.

⚠️ **`informe_emitido_en` lo sella el servidor**, y **cualquier valor no nulo que
mande el cliente se descarta**: emitir el informe es una acción de oficina, y el
plazo de una semana que da el procedimiento de la firma (`P-SG-03` §5.4.5) se mide
contra esa fecha. Reemitir —el auditor corrige y vuelve a entregar— **vuelve a
sellar**, porque la fecha que vale es la de la última entrega; ponerla en null
retracta la emisión y no la re-sella. ⚠️ Enseñar el informe **preliminar** en la
reunión de cierre no toca esta columna: eso no escribe nada, se arma desde la
caché y por eso funciona sin señal.

⚠️ **El folio NO lo calcula el navegador**, y no es comodidad: con el RLS de este
proyecto un consultor sólo ve las auditorías de sus clientes, así que contar las
que tiene en la caché daría un consecutivo **ya usado en un expediente que no
puede mirar**. `asignar_folio_auditoria()` es `SECURITY DEFINER` y se sale del RLS
una vez, con un `pg_advisory_xact_lock` por año para que dos altas simultáneas no
choquen contra el UNIQUE. Una auditoría encolada sin señal aparece **sin folio
hasta que sincroniza**, y la pantalla lo dice en vez de inventarse uno.

## `auditoria_normas` · `auditoria_sitios` · `auditoria_procesos`
El alcance concreto, en tablas. De `auditoria_normas` **se genera** la lista de
verificación. Clave primaria compuesta, `org_id` por trigger.

⚠️ El sitio y el proceso tienen que ser **del mismo cliente**: lo comprueba
`validar_referencia_de_la_org()`, que no lo puede hacer una FK ni un CHECK.

## `auditoria_equipo`
Auditores participantes con su papel (`lider` · `auditor` · `experto_tecnico` ·
`observador`). Clave primaria `(auditoria_id, usuario_id)`.

⚠️ **No es `usuarios_organizaciones`.** Aquél decide quién puede escribir en el
expediente del cliente; éste dice quién hizo *esta* auditoría, y se imprime en el
informe junto a sus `certificaciones` — que salen de la ficha del usuario, no se
capturan por auditoría.

## `auditoria_agenda`
El plan hora por hora: fecha, `hora_inicio`/`hora_fin`, tema, proceso, sitio,
auditado, contacto, auditor, orden. Es lo que se le envía al cliente antes de la
visita. Lleva `cumplido boolean` y `nota` para el apartado «agenda cumplida» del
informe.

⚠️ `auditado` es **texto libre**: la agenda se manda semanas antes, cuando aún no
se sabe quién estará, y dice «Jefe de Almacén». `contacto_id` se ata después si se
sabe. ⚠️ Las horas son `time` sin zona: es un horario de pared, no un instante —
un `timestamptz` se movería solo según la zona del navegador que lo pinta.

## `auditoria_items`
La lista de verificación.

| Columna | Tipo | Nota |
|---|---|---|
| `auditoria_id` | uuid FK | |
| `clausula_id` | uuid FK **NULL** | ON DELETE RESTRICT. Nullable: el auditor añade preguntas propias que no cuelgan de ninguna cláusula |
| `proceso_id` | uuid FK NULL | |
| `pregunta` | text NOT NULL | |
| `orden` | int | |
| `veredicto` | text CHECK **NOT NULL** default `pendiente` | `pendiente` · `conforme` · `no_conforme` · `observacion` · `no_aplica` |
| `nota` | text | |
| `evaluado_en` | timestamptz | ⚠️ **El reloj del auditor** |
| `evaluado_por` | uuid FK | Lo sella la base |

⚠️ `veredicto` es NOT NULL con `pendiente` en la lista, **no nullable**: dos
maneras de decir «todavía no lo miré» son dos maneras de contar mal el avance del
recorrido, que es el número que el auditor mira para saber si le da tiempo. Volver
a `pendiente` **borra** `evaluado_en` y `evaluado_por`.

### La plantilla de listas de verificación  [F03·B2]

**No es una tabla.** Vive en `config_firma.plantillas` (jsonb) bajo la llave
`verificacion`, igual que la plantilla de tareas vive bajo `tareas`: es
configuración de la firma, la lee cualquiera con sesión y sólo la escribe un
socio. Una tabla para esto sería una tabla con una fila.

```jsonc
{
  "tareas":      { "<tipo_proyecto>": { "<etapa>": [ { "titulo", "detalle" } ] } },
  "verificacion":{ "<norma_clave>":   { "<giro>":  [ { "numero", "pregunta" } ] } }
}
```

- **`norma_clave`** es `normas.clave` (`iso_9001`), no el `id`.
- **`giro`** sale de `organizaciones.giro`, **normalizado** —sin acentos, en
  minúsculas— porque esa columna es texto libre y la firma acabaría con
  «Manufactura», «manufactura» y «Manufactura ligera» como tres plantillas que son
  la misma. `general` es el bucket de respaldo, y **no se mezcla** con el del giro:
  si hay lista para manufactura, ésa manda. Sumar las dos daría preguntas
  repetidas con distinta redacción.
- **`numero`** es el de la cláusula (`8.5.1`), no su `id`: es lo que un auditor
  reconoce, lo que sobrevive a reimportar el catálogo y lo que hace legible el
  jsonb el día que alguien lo abra en el SQL Editor. Un punto **sin** `numero` es
  una pregunta propia del auditor, sin cláusula.
- Se lee **a la defensiva**: ese jsonb lo puede haber escrito una versión vieja de
  la app o una mano en el SQL Editor. Si no tiene la forma esperada se devuelve
  vacío, nunca se revienta la pantalla de la auditoría.

⚠️ **El reparto de responsabilidades, que es lo que hay que no romper:** la base
decide **qué** se audita —las cláusulas hoja del alcance, vía
`generar_lista_verificacion()`— y la plantilla decide **cómo** se pregunta. Al
aplicarla, una cláusula que la plantilla nombra y que no está en el alcance **se
omite y se informa**; y un punto **ya evaluado no se toca**, porque reescribir la
pregunta debajo de un «conforme» ya dado deja el veredicto contestando algo que
nadie preguntó.

## `hallazgos`
⚠️ **No se borran.** CLAUDE.md regla 13, y aquí es donde muerde.

| Columna | Tipo | Nota |
|---|---|---|
| `auditoria_id` | uuid FK NOT NULL | ON DELETE **RESTRICT** |
| `item_id` | uuid FK NULL | ON DELETE SET NULL |
| `clausula_id` | uuid FK **NOT NULL** | **La cita es obligatoria.** Un hallazgo sin cláusula no es un hallazgo |
| `consecutivo` | int NOT NULL | El `03` de `H-03` |
| `folio` | text NOT NULL | `AUD-2026-014/H-03` |
| `tipo` | text CHECK | `nc_mayor` · `nc_menor` · `observacion` · `oportunidad_mejora` · `conformidad` |
| `descripcion` | text NOT NULL + CHECK no vacío | |
| `evidencia_objetiva` | text NOT NULL + CHECK no vacío | Qué se vio, dónde y cuándo |
| `requisito_incumplido` | text | |
| `proceso_id`, `sitio_id`, `responsable_contacto_id` | uuid FK NULL | Todos validados contra la org |
| `estado` | text CHECK | `abierto` · `en_accion` · `verificado` · `cerrado` · `anulado` |
| `fecha_compromiso` | date | |
| `detectado_en` | timestamptz | ⚠️ **El reloj del auditor**: cuándo se vio en planta |
| `cerrado_en`, `cerrado_por_id` | | Los sella `sellar_cierre_hallazgo()` |
| `motivo_anulacion` | text | **CHECK: obligatorio y no vacío si `estado = 'anulado'`** |
| `motivo_cambio` | text | El porqué del último cambio. Lo copia el historial a cada renglón |

⚠️ **`descripcion` y `evidencia_objetiva` llevan CHECK además de NOT NULL**: la
cadena vacía pasa un NOT NULL, y un hallazgo con la evidencia en blanco es un
hallazgo que no se puede defender delante del cliente.

⚠️ **`motivo_cambio` vive en `hallazgos` y no en el historial**, para que el
cambio y su motivo sean **una sola escritura** de la cola. Sin señal, dos podrían
llegar desparejadas y el renglón quedaría sin explicación.

⚠️ **NO hay `unique (auditoria_id, consecutivo)`, y es la decisión que salva el
criterio de cierre.** Dos auditores recorriendo la misma planta en modo avión
levantan los dos un `H-03`; ninguno ve el hallazgo del otro. Con un índice único,
el segundo en sincronizar recibiría un rechazo **media hora después y con nadie
mirando** — el hallazgo perdido que esta fase existe para impedir. En su lugar,
`sellar_folio_hallazgo()` **renumera al llegar** y recompone el folio: el auditor
vio un H-03 en el campo y en el informe sale un H-07. Un número corrido es un
detalle de edición; un hallazgo perdido no se recupera.

## `hallazgos_historial`
Cada cambio de un hallazgo, **campo por campo**: `campo`, `antes`, `despues`,
`motivo`, `hecho_por`, `hecho_en`. Es lo que un organismo certificador viene a
revisar.

⚠️ **Inmutable como `audit_logs`, y con los mismos dos candados.** Lo escribe
`registrar_historial_hallazgo()` (`SECURITY DEFINER`); la RLS sólo tiene SELECT, y
además la migración **revoca INSERT/UPDATE/DELETE a `service_role`** — que se
salta el RLS. Ver docs/08 §2.

## RPC `generar_lista_verificacion(p_auditoria uuid) → int`
Crea un `auditoria_items` por cada cláusula del alcance y devuelve cuántos creó.

⚠️ **Sólo las HOJAS auditables y activas.** Un capítulo como «8 · Operación» tiene
debajo 8.1, 8.2, 8.3…; poner los dos niveles duplicaría cada punto y haría el
recorrido el doble de largo sin comprobar nada nuevo.

⚠️ **Idempotente**, como el importador de normas: correrla otra vez tras ampliar
el alcance añade lo que falta y **no toca lo ya evaluado**. Un auditor que agrega
la 45001 a media planeación no puede perder los veredictos que ya capturó.

⚠️ **`SECURITY INVOKER`** —el de por defecto—, a propósito: el INSERT pasa por la
política de `auditoria_items`, así que el papel `lectura` no genera nada. Una
`security definer` aquí sería una puerta trasera a la multi-tenencia con forma de
comodidad.

---

# FASE 04 · Acciones y seguimiento

## `acciones`

| Columna | Tipo | Nota |
|---|---|---|
| `folio` | text | `ACC-2026-105` |
| `hallazgo_id` | uuid FK NULL | Puede nacer sola, como mejora |
| `tipo` | text CHECK | `correccion` · `accion_correctiva` · `preventiva` · `mejora` |
| `descripcion` | text | |
| `responsable_id` | uuid FK usuarios | |
| `responsable_contacto_id` | uuid FK contactos | Del lado del cliente |
| `fecha_compromiso` | date NOT NULL | |
| `estado` | text CHECK | `abierta` · `en_proceso` · `por_verificar` · `cerrada` · `cancelada` |
| `causa_metodo` | text CHECK | `cinco_porques` · `ishikawa` · `otro` |
| `causa_analisis` | jsonb | Estructurado, **no un párrafo**. ISO 9001 §10.2 lo exige |
| `causa_raiz` | text | La conclusión |
| `eficacia_verificada_en` | date | |
| `eficacia_verificada_por_id` | uuid FK | |
| `eficacia_resultado` | text CHECK | `eficaz` · `no_eficaz` · `parcial` |
| `eficacia_evidencia` | text | |

⚠️ **Una acción no pasa a `cerrada` sin `eficacia_verificada_en` y
`eficacia_resultado = 'eficaz'`.** Se impone con un CHECK, no con una validación
del navegador. Es el error más común en los SGC reales.

## `tareas`
Los pasos de una acción: descripción, responsable, fecha, estado, orden.

⚠️ **`adjuntos` ya no se crea aquí: se adelantó a la Fase 02** (F02·B2b). Lo que
esta fase agrega es su uso desde las acciones — la evidencia que cierra una
acción correctiva y la que respalda su verificación de eficacia.

---

# FASE 05 · Cumplimiento y capacitación

## `noms` · `nom_requisitos`
**Catálogo global**, sin `org_id`.

**`noms`**: clave (`NOM-035-STPS-2018`), nombre, autoridad
(`stps` · `semarnat` · `proteccion_civil` · `salud` · `otro`), tipo
(`seguridad` · `higiene` · `organizacion` · `producto` · `ambiental`),
periodicidad, vigente.

**`nom_requisitos`**: numeral, descripción, evidencia esperada, aplica_si
(condición de aplicabilidad: número de trabajadores, giro, actividad).

## `org_noms`
**La matriz de aplicabilidad.** Primer entregable de una consultoría de
cumplimiento.

| Columna | Tipo | Nota |
|---|---|---|
| `nom_id`, `sitio_id` | uuid FK | |
| `aplica` | boolean NOT NULL | |
| `justificacion` | text | **Obligatoria** en ambos sentidos: por qué aplica o por qué no |
| `estado_cumplimiento` | text CHECK | `cumple` · `parcial` · `no_cumple` · `en_proceso` · `sin_evaluar` |
| `evaluado_en`, `evaluado_por_id` | | |

## `org_nom_requisitos`
La evaluación punto por punto, con su evidencia.

## `obligaciones`
**La pantalla que evita una clausura.**

| Columna | Tipo | Nota |
|---|---|---|
| `tipo` | text CHECK | `estudio` · `dictamen` · `licencia` · `permiso` · `mantenimiento` · `recarga` · `examen_medico` · `capacitacion` · `otro` |
| `nombre` | text | *Estudio de ruido NOM-011* |
| `nom_id`, `sitio_id` | uuid FK | |
| `emitido_en` | date | |
| `vigencia_meses` | int | |
| `vence_en` | date NOT NULL | ⚠️ Se **guarda calculada**, no se deriva al vuelo: es la columna que se indexa y por la que barre el cron |
| `responsable_id` | uuid FK | |
| `documento_id` | uuid FK | El dictamen o el estudio |
| `estado` | text CHECK | `vigente` · `por_vencer` · `vencido` · `en_tramite` · `no_aplica` |

## `cursos` · `dnc` · `sesiones` · `asistentes`

**`cursos`** (catálogo de la firma, sin `org_id`): clave, nombre, tipo
(`normatividad_stps` · `brigada` · `iso` · `interno`), NOM relacionada, duración
en horas, temario, modalidad.

**`dnc`**: el programa anual de capacitación por cliente — curso, mes planeado,
número de participantes, estado.

**`sesiones`**: curso, fecha, instructor, sede, duración real, sitio, evidencia
fotográfica.

**`asistentes`**: sesión, nombre, puesto, CURP, calificación, asistencia, **folio
de la constancia DC-3**.

⚠️ El **DC-3** es un formato oficial de la STPS. Sus campos y su folio no son
libres — ver tarea del dueño `F03`.

---

# FASE 06 · Portal y administración

## `portal_tokens`

| Columna | Tipo | Nota |
|---|---|---|
| `token` | text UNIQUE | Lo que va en la URL |
| `org_id` | uuid FK | |
| `contacto_id` | uuid FK | |
| `creado_por_id` | uuid FK | |
| `expira_en` | timestamptz | |
| `revocado_en` | timestamptz | |
| `ultimo_acceso_en` | timestamptz | |

### `portal_organizacion(p_token text)` — la única puerta
`SECURITY DEFINER`, concedida a `anon`. Devuelve un `jsonb` armado a mano —
**lista blanca, no filtro**. ⚠️ `anon` **no tiene ninguna otra política operativa**
en toda la base. §8.5.

## Finanzas y facturación
Se heredan de JDM Built con el dominio cambiado: `transacciones` (con
`proyecto_id` en vez de `activo_id`), `metas`, `catalogo_servicios`, `facturas`,
`fiscal_credenciales`.

⚠️ **`fiscal_credenciales` tiene RLS activa y CERO políticas, a propósito.** Sólo
la toca `/api/fiscal/credenciales` con `service_role`. El bucket `fiscal` **no
tiene política de SELECT para nadie**: el `.key` se sube y no se vuelve a bajar.

## Vistas
Todas con **`security_invoker = true`** (§4.4):

| Vista | Qué resuelve |
|---|---|
| `avance_proyecto` | % de requisitos por proyecto y por norma |
| `hallazgos_abiertos` | ⚠️ **Aplazada en F03·B4, y confirmada al conectar el widget del tablero** (30 ago 2026). El tablero del lunes y el widget «Hallazgos abiertos» agrupan y calculan la antigüedad **en memoria**, sobre la misma lista ya bajada — una vista es otra clave que puede faltar en la caché, y las dos pantallas se abren con media barra de señal. Es la misma decisión que la de los widgets de la cartera [F01·B3] |
| `obligaciones_semaforo` | Qué vence en 7 / 30 / 90 días |
| `carga_consultor` | Proyectos y acciones abiertas por consultor |
| `indice_busqueda_global` | Las seis fuentes del buscador |
| `salud_sgc` | El puntaje de la Fase 08, por proceso y organización |

## RPC principales

```sql
correr_avisos_programados()        -- Fase 04, cron diario
buscar_global(consulta text)       -- Fase 06, por prefijo
generar_lista_verificacion(...)    -- Fase 03, desde el alcance
portal_organizacion(p_token)       -- Fase 06, SECURITY DEFINER
recalcular_salud_sgc()             -- Fase 08, barrido nocturno
```

---

# FASE 07 · Asistente

| Tabla | Qué guarda |
|---|---|
| `asistente_trazas` | Cada interacción: entrada, destino, propuesta, si se confirmó, tokens, latencia. ⚠️ La lectura es **lista blanca por destino** |
| `asistente_informes` | Informes generados; se releen sin regenerar |
| `asistente_memoria` | Lo que la firma le enseñó al asistente |
| `asistente_instrucciones` | Editables **sólo por el socio** |
| `biblioteca_documentos` | PDFs convertidos a markdown, por organización |
| `biblioteca_trozos` | Troceado **por cláusula**, con `embedding vector(768)` y `tsvector` para la búsqueda híbrida |
| `evaluaciones_evidencia` | Módulo C: archivo, cláusula, veredicto `PASS`/`FAIL`, motivo, qué propuso |

Extensión requerida: **`pgvector`**. Índice `ivfflat` sobre `embedding` y `gin`
sobre el `tsvector`, fundidos por **RRF**.

---

# FASE 08 · Automatización externa

| Tabla | Qué guarda |
|---|---|
| `graph_suscripciones` | Id de suscripción, recurso, `expira_en`, `client_state`. ⚠️ Expiran en < 72 h; el cron diario las renueva |
| `graph_eventos` | Cada notificación recibida, para trazabilidad y para no procesar dos veces |
| `puntajes` | Salud del SGC por proceso y organización: `puntaje` (0–1000), `ultimo_calculo`, `historial jsonb` |
| `buzon_evidencia` | Correos entrantes: remitente, asunto, folio detectado, adjuntos, resultado |

---

# Índices que importan

No son opcionales: sin ellos, las pantallas que más se abren se arrastran.

```sql
-- Todo filtra por organización, siempre
CREATE INDEX ON <cada_tabla_dominio> (org_id);

-- El tablero del lunes
CREATE INDEX ON hallazgos (org_id, estado, fecha_compromiso);
CREATE INDEX ON acciones  (org_id, estado, fecha_compromiso);

-- El barrido del cron
CREATE INDEX ON obligaciones (vence_en) WHERE estado <> 'no_aplica';

-- La matriz de requisitos
CREATE UNIQUE INDEX ON requisitos (proyecto_id, clausula_id);

-- El árbol de cláusulas
CREATE INDEX ON norma_clausulas (norma_id, padre_id, orden);

-- Búsqueda del asistente
CREATE INDEX ON biblioteca_trozos USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON biblioteca_trozos USING gin (busqueda);
```

⚠️ **Ningún índice de expresión con una fecha a texto.** `fecha::text` no es
IMMUTABLE y revienta con 42P17. Si hace falta indexar una fecha derivada, se usa
la resta (`vence_en - DATE '2000-01-01'`).
