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
| `plantillas` | jsonb | Configuración de los entregables imprimibles |
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
`.github/workflows/rls-check.yml`. Se leen con sesión; sólo los escribe un socio.

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
| `clave` | text UNIQUE | `iso_9001` |
| `nombre` | text | `ISO 9001` |
| `version` | text | `2015` |
| `titulo` | text | `Sistemas de gestión de la calidad` |
| `activa` | boolean | |

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
| `tarea_id`, `accion_id`, `hallazgo_id`, `obligacion_id` | | ⚠️ **Todavía no existen**: las añaden las Fases 03, 04 y 05 |
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

## `programa_auditorias`
El programa anual por cliente.

| Columna | Tipo | Nota |
|---|---|---|
| `anio` | int | |
| `objetivo`, `criterios` | text | |
| `aprobado_por_id`, `aprobado_en` | | |

## `auditorias`

| Columna | Tipo | Nota |
|---|---|---|
| `folio` | text UNIQUE | `AUD-2026-014`. **Se calcula sin red** (§8.7) |
| `programa_id`, `proyecto_id` | uuid FK | |
| `tipo` | text CHECK | `interna` · `preauditoria` · `seguimiento` · `certificacion_acompanamiento` · `proveedor` |
| `estado` | text CHECK | `planeada` · `en_curso` · `cerrada` · `cancelada` |
| `fecha_inicio`, `fecha_fin` | date | |
| `auditor_lider_id` | uuid FK | |
| `alcance`, `criterios`, `metodologia`, `conclusiones` | text | |
| `informe_emitido_en` | timestamptz | |

## `auditoria_normas` · `auditoria_sitios` · `auditoria_procesos`
El alcance concreto. De aquí se **genera** la lista de verificación.

## `auditoria_equipo`
Auditores participantes, con su papel (`lider` · `auditor` · `experto_tecnico` ·
`observador`).

## `auditoria_agenda`
El plan hora por hora: fecha, hora inicio/fin, proceso, auditado, auditor. Es lo
que se envía al cliente antes de la visita.

## `auditoria_items`
La lista de verificación.

| Columna | Tipo | Nota |
|---|---|---|
| `auditoria_id` | uuid FK | |
| `clausula_id` | uuid FK | |
| `pregunta` | text | |
| `orden` | int | |
| `veredicto` | text CHECK NULL | `conforme` · `no_conforme` · `observacion` · `no_aplica` · `pendiente` |
| `nota` | text | |
| `evaluado_en` | timestamptz | |

## `hallazgos`
⚠️ **No se borran.** CLAUDE.md regla 13.

| Columna | Tipo | Nota |
|---|---|---|
| `folio` | text | `AUD-2026-014/H-03` |
| `auditoria_id`, `item_id` | uuid FK | |
| `clausula_id` | uuid FK **NOT NULL** | **La cita es obligatoria.** Un hallazgo sin cláusula no es un hallazgo |
| `tipo` | text CHECK | `nc_mayor` · `nc_menor` · `observacion` · `oportunidad_mejora` · `conformidad` |
| `descripcion` | text NOT NULL | |
| `evidencia_objetiva` | text NOT NULL | Qué se vio, dónde y cuándo |
| `requisito_incumplido` | text | |
| `proceso_id`, `sitio_id` | uuid FK | |
| `responsable_contacto_id` | uuid FK | Del lado del cliente |
| `estado` | text CHECK | `abierto` · `en_accion` · `verificado` · `cerrado` · `anulado` |
| `fecha_compromiso` | date | |
| `cerrado_en`, `cerrado_por_id` | | |
| `motivo_anulacion` | text | **Obligatorio si `estado = 'anulado'`** |

## `hallazgos_historial`
Cada cambio de tipo, estado o descripción, con quién y cuándo. Es lo que un
organismo certificador viene a revisar.

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
| `hallazgos_abiertos` | Hallazgos abiertos con su antigüedad y su vencimiento |
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
