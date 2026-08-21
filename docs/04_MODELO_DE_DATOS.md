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

## `sitios`
Los centros de trabajo. **Una organización puede tener cinco plantas y el alcance
del certificado cubrir sólo dos.**

| Columna | Tipo | Nota |
|---|---|---|
| `nombre` | text NOT NULL | *Planta Toluca* |
| `direccion`, `municipio`, `entidad`, `cp` | text | |
| `tipo` | text CHECK | `planta` · `oficina` · `almacen` · `obra` · `sucursal` |
| `num_trabajadores` | int | Determina qué NOMs aplican |
| `activo` | boolean | |

## `contactos`

| Columna | Tipo | Nota |
|---|---|---|
| `nombre`, `puesto`, `correo`, `telefono` | text | |
| `papel` | text CHECK | `representante_direccion` · `coordinador_sgc` · `responsable_seguridad` · `contacto_comercial` · `otro` |
| `sitio_id` | uuid FK | |
| `acceso_portal` | boolean | |
| `principal` | boolean | |

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
| `moneda` | text default `'MXN'` | |
| `objetivo` | text | |

## `proyecto_normas` · `proyecto_sitios`
El alcance real, en tablas, no en una cadena de texto. **De aquí sale la lista de
verificación de una auditoría.**

## `bitacora_proyecto`
Línea de tiempo: visitas, entregas, cambios de etapa, acuerdos.

| Columna | Tipo | Nota |
|---|---|---|
| `proyecto_id` | uuid FK | |
| `tipo` | text CHECK | `visita` · `entrega` · `cambio_etapa` · `acuerdo` · `incidencia` · `nota` |
| `fecha` | date | |
| `titulo`, `detalle` | text | |
| `participantes` | text[] | |

---

# FASE 02 · Sistemas de gestión

## `normas`
Las siete. **Catálogo global, sin `org_id`.**

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
El árbol. **Catálogo global.**

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
| `version_vigente_id` | uuid FK | |
| `estado` | text CHECK | `vigente` · `obsoleto` · `en_elaboracion` |

**`documento_versiones`**

| Columna | Tipo | Nota |
|---|---|---|
| `documento_id` | uuid FK | |
| `version` | text | `1.0`, `2.0` |
| `estado` | text CHECK | `borrador` · `en_revision` · `aprobado` · `obsoleto` |
| `archivo_url` | text | Bucket privado `documentos` |
| `elaboro_id`, `reviso_id`, `aprobo_id` | uuid FK | |
| `fecha_elaboracion`, `fecha_aprobacion`, `fecha_vigencia` | date | |
| `control_cambios` | text | Qué cambió respecto a la versión anterior |

⚠️ **Nunca se sobrescribe una versión aprobada.** Aprobar una nueva marca la
anterior `obsoleto` y la conserva. Un auditor externo pide exactamente eso.

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

## `adjuntos`
Cola propia, bucket privado.

| Columna | Tipo | Nota |
|---|---|---|
| `tarea_id`, `accion_id`, `hallazgo_id`, `documento_id`, `obligacion_id` | uuid FK NULL | ⚠️ Se filtra con `campoDominante()`, **nunca con un OR** (§8.8) |
| `ruta` | text | Ruta en Storage |
| `nombre`, `tipo_mime`, `tamano` | | |
| `titulo` | text | Lo que el usuario escribe |
| `subido_desde` | text CHECK | `app` · `portal` · `correo` — el portal deja rastro distinto |

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
