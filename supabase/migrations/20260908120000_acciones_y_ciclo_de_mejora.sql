-- ============================================================================
-- F04·B1 · ACCIONES Y CICLO DE MEJORA
--
-- El ciclo que cierra una no conformidad: corrección inmediata → análisis de
-- causa → acciones correctivas → seguimiento → verificación de eficacia →
-- cierre. Lo gobierna `P-SG-05`, que llegó el 7 sep 2026 en la cuarta tanda y
-- era el único documento que faltaba de los ocho procedimientos del cliente.
--
-- ⚠️ **Va DESPUÉS de `20260902120000_fuente_de_no_conformidad.sql`** (F04·B0),
-- que aflojó `hallazgos.auditoria_id` y creó `fuente_nc`. Sin ella, §3 no tiene
-- qué ampliar.
--
-- Las fichas que la especifican, todas en `docs/formatos_informeAuditorias/`:
--   P-SG-05  el ciclo entero, las nueve etapas y el folio del cliente
--   F-SG-06  el reporte de NC — la mitad de abajo es esta migración
--   F-SG-07  el análisis de causa raíz y la forma de `causa_analisis`
--   F-SG-17  la base de datos de NC — avance, monitoreo y proceso
--   F-SG-16  el plan de mejora
--   F-SG-24  la gestión de cambios
--   P-SG-07  quejas y sugerencias, con sus dos series de folio
--   P-SG-02  el servicio no conforme, que ES una NC y no un ciclo aparte
--
-- ⚠️ **ES ADITIVA.** Tablas nuevas, columnas nuevas con default, y un CHECK que
-- se AMPLÍA —nunca se estrecha—. El build que ya está en línea no conoce nada de
-- esto y sigue funcionando igual mientras se despliega el que sí.
--
-- ⚠️ **Lo que NO trae, y es deliberado:**
--   · **`tareas`**, los sub-pasos de una acción que `docs/02` anotaba. Ninguno de
--     los cinco formatos que gobiernan este ciclo tiene sub-pasos, y el propio
--     `F-SG-16` enseña que cuando un conjunto de acciones necesita planeación la
--     respuesta del cliente es un **contenedor con más acciones**, no una tabla
--     de tareas. Añadirla hoy sería un interruptor muerto (regla 11).
--   · **`acciones_historial`.** `registrar_bitacora()` ya guarda `antes` y
--     `despues` completos en `audit_logs`, que es inmutable con los dos candados
--     de la regla 13. La justificación de cada reprogramación que exige `P-SG-05`
--     §5.6 queda ahí entera, incluida la fecha anterior. Una tabla paralela sería
--     el mismo hecho en dos sitios.
--   · **Pantalla de planes de mejora, cambios de SGC y quejas.** El esquema entra
--     aquí porque metido aquí cuesta cero; las tres pantallas van después.
-- ============================================================================


-- ============================================================================
-- §1 · `planes_mejora`  ·  F-SG-16
--
-- ⚠️ **NO es «acciones con tipo = mejora»**, que es lo que el índice del catálogo
-- supuso hasta que llegó el formato. Es un **contenedor** de varias acciones con
-- calendario anual programado/real, y es **condicional**: `P-SG-05` §5.5 lo pide
-- sólo «cuando las acciones correctivas requieran de una planeación de mayor
-- complejidad», y `P-SG-07` §5.5.2 cuando una sugerencia de cliente procede.
-- ============================================================================

create table public.planes_mejora (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizaciones(id) on delete cascade,
  -- Los tres textos de encuadre del formato, arriba de la parrilla.
  alcance        text,
  objetivo       text,
  programa_de    text,
  anio           int  not null,
  estado         text not null default 'borrador'
                 check (estado in ('borrador','aprobado','cerrado')),
  -- `elaboro` se captura y `aprobo` lo sella la base: misma decisión que
  -- `programa_auditorias` y que `documento_versiones` (P-SG-01 confirma que
  -- elaboró y revisó NO se sellan — firmar como revisor a quien sólo movió el
  -- estado sería inventar una firma).
  elaborado_por_id uuid references public.usuarios(id),
  aprobado_por_id  uuid references public.usuarios(id),
  aprobado_en      timestamptz,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id),
  constraint planes_mejora_anio_razonable check (anio between 2000 and 2100)
);

comment on table public.planes_mejora is
  'F-SG-16 Plan de Mejora: contenedor de acciones con calendario anual P/R. Condicional — sólo cuando las acciones necesitan planeación (P-SG-05 §5.5).';


-- ============================================================================
-- §2 · `cambios_sgc`  ·  F-SG-24
--
-- ⚠️ **Tres disparadores, no uno**, y sólo el primero es de la Fase 04:
--   · `P-SG-05` §5.5 — al determinar acciones: «¿cambios al SGC?»   [F04]
--   · `P-SG-01` §5.7 — solicitud de cambio de un documento publicado [F02]
--   · `P-SG-07` §5.5.2 — una sugerencia procedente de un cliente     [F05/F06]
-- Se construye entero aquí porque **las tres bocas escriben en la misma tabla**:
-- partirlo por fases costaría tres migraciones para una estructura.
--
-- ⚠️ **Y aquí convergen las DOS preguntas de impacto del `F-SG-06`.** El §III del
-- formato es «Riesgos Identificados»: el cambio al SGC y la actualización de
-- riesgos no son dos ramas separadas, son el mismo documento.
-- ============================================================================

create table public.cambios_sgc (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizaciones(id) on delete cascade,
  -- El «No. Proy.» del formato. Es del cliente y se captura: no lo sellamos.
  numero         text,
  proyecto_id    uuid references public.proyectos(id) on delete set null,
  fecha          date,
  -- §I · Descripción general
  nombre         text not null check (btrim(nombre) <> ''),
  descripcion    text,
  alcance        text,
  -- §II · Justificación. Las tres casillas del original.
  ambito         text not null default 'sgc'
                 check (ambito in ('sgc','procesos','otro')),
  justificacion  text,
  -- §III · Riesgos identificados — la boca por la que este formato ata con
  -- `P-SG-04` y con la matriz F-SG-23.
  riesgos        text,
  -- §V · Recursos
  recursos       text,
  -- De dónde vino. Es lo que permite que las tres bocas convivan sin
  -- confundirse al reportar.
  origen         text not null default 'accion_correctiva'
                 check (origen in ('accion_correctiva','solicitud_documento',
                                   'sugerencia_cliente','otro')),
  -- La acción correctiva que lo motivó, cuando el origen es esa. Se añade la FK
  -- al final del archivo: `acciones` todavía no existe aquí.
  accion_origen_id uuid,
  estado         text not null default 'borrador'
                 check (estado in ('borrador','en_revision','autorizado',
                                   'rechazado','cerrado')),
  -- Las tres firmas del pie. `autorizo` la sella la base; las otras dos se
  -- capturan, por lo mismo que en `planes_mejora`.
  elaborado_por_id  uuid references public.usuarios(id),
  revisado_por_id   uuid references public.usuarios(id),
  autorizado_por_id uuid references public.usuarios(id),
  autorizado_en     timestamptz,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id)
);

comment on table public.cambios_sgc is
  'F-SG-24 Gestión de Cambios en SGC y Procesos. Tres disparadores: acción correctiva (P-SG-05), solicitud de cambio documental (P-SG-01) y sugerencia de cliente (P-SG-07).';

-- §IV del formato: la documentación del SGC que hay que reeditar por el cambio.
create table public.cambios_sgc_documentos (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizaciones(id) on delete cascade,
  cambio_id    uuid not null references public.cambios_sgc(id) on delete cascade,
  documento_id uuid not null references public.documentos(id)  on delete cascade,
  nota         text,
  creado_en    timestamptz not null default now(),
  unique (cambio_id, documento_id)
);

comment on table public.cambios_sgc_documentos is
  'Qué documentos hay que reeditar por un cambio (F-SG-24 §IV). N:N contra `documentos`.';


-- ============================================================================
-- §3 · `hallazgos` — los cuatro huecos del catálogo, y el análisis de causa
--
-- Los huecos 15, 17 y 18 del `README` del catálogo, más la columna `I` del
-- `F-SG-17`. Los cuatro son aditivos y **metidos aquí cuestan cero**: cada uno
-- por separado sería otra migración.
-- ============================================================================

-- ─────────────────────────── hueco 15 · las nueve etapas de P-SG-05 §5.1 ────
--
-- El CHECK que escribió `B0` tiene once valores y cubre **cinco de las nueve**
-- etapas que el procedimiento del cliente tabula. Las otras cuatro caían en
-- `otro`, y una de ellas —**incumplimiento legal**— es el núcleo entero de la
-- Fase 05: NOM STPS, SEMARNAT y Protección Civil son el servicio que más
-- urgencia genera en el cliente (docs/02 · Fase 05).
--
-- ⚠️ **`satisfaccion_cliente` NO es `queja_cliente`.** Una encuesta `F-SG-13`
-- por debajo del objetivo de 90 % es una NC (P-SG-05 §5.1 etapa 6) y no hay
-- ninguna queja de por medio: nadie llamó a reclamar. Meterlas en el mismo valor
-- perdería la distinción que `P-SG-07` dibuja con dos ramas y dos folios.
--
-- ⚠️ **Ampliar un CHECK no rechaza ninguna fila que antes pasaba**, y las cuatro
-- nuevas caen del lado «sin auditoría» de la partición, así que
-- `hallazgos_fuente_coherente` sigue valiendo tal cual y no se toca.
alter table public.hallazgos drop constraint hallazgos_fuente_valida;

alter table public.hallazgos
  add constraint hallazgos_fuente_valida check (fuente_nc in (
    -- Con auditoría de por medio (los tres de B0; el CHECK de coherencia los
    -- nombra uno por uno y por eso este orden importa).
    'auditoria_interna',        -- F-SG-11 · F-SG-12 · P-SG-03
    'auditoria_externa',        -- el certificador, con Summit acompañando
    'auditoria_proveedor',      -- auditorias.tipo = 'proveedor'
    -- Sin auditoría (los ocho de B0 menos ninguno, más los cuatro nuevos).
    'queja_cliente',            -- P-SG-07 rama Q · F-SG-08 · F-SG-10
    'servicio_no_conforme',     -- P-SG-02 §5.2 · F-SG-14 · P-SG-05 §5.1 etapa 1
    'revision_direccion',       -- F-SG-18 · P-SG-05 §5.1 etapa 4
    'seguimiento_interno',      -- F-SG-26
    'indicador',                -- P-SG-06 · F-SG-15 · P-SG-05 §5.1 etapa 2
    'evaluacion_proveedor',     -- P-CO-02
    'incidente',
    'informacion_documentada',  -- NUEVO · P-SG-05 §5.1 etapa 3
    'capacitacion',             -- NUEVO · P-SG-05 §5.1 etapa 7
    'satisfaccion_cliente',     -- NUEVO · P-SG-05 §5.1 etapa 6 · F-SG-13 bajo meta
    'incumplimiento_legal',     -- NUEVO · P-SG-05 §5.1 etapa 8 · el núcleo de F05
    'otro'
  ));

-- ─────────────────────────────── hueco 17 · la NC que nace de otra NC ───────
--
-- `P-SG-05` §5.7: «Si el incumplimiento se repite, las acciones no fueron
-- efectivas» y **se aplica un F-SG-06 NUEVO** — no se reabre el anterior. Es la
-- novena etapa de §5.1, y no es una *fuente*: es un enlace.
--
-- ⚠️ RESTRICT, no CASCADE: la NC original es la prueba de que hubo reincidencia.
alter table public.hallazgos
  add column nc_origen_id uuid references public.hallazgos(id) on delete restrict;

alter table public.hallazgos
  add constraint hallazgos_nc_origen_distinta check (nc_origen_id is distinct from id);

comment on column public.hallazgos.nc_origen_id is
  'La NC anterior cuyas acciones no fueron efectivas (P-SG-05 §5.7). Reincidencia: se levanta una NC nueva enlazada, no se reabre la vieja.';

-- ───────────────────────────── hueco 18 · el auditado puede RECHAZARLA ──────
--
-- El `F-SG-06` pregunta «No Conformidad aceptada: ☐ Sí ☐ No».
--
-- ⚠️ **No es lo mismo que `anulado`** (regla 13): anular es que el auditor se
-- equivocó; **rechazar es que el cliente discrepa y el hallazgo sigue en pie**
-- hasta que se resuelva. Por eso son dos columnas y no un estado más.
--
-- ⚠️ Y son TRES estados, no dos: `null` = todavía no se le ha preguntado.
-- Un `false` por defecto diría que todo el histórico fue rechazado.
alter table public.hallazgos
  add column aceptada        boolean,
  add column aceptada_motivo text;

-- Rechazar sin motivo es rechazar en silencio, y deja al auditor sin nada que
-- contestar. Misma regla que `motivo_anulacion` y que la justificación de
-- `no aplica` en `requisitos`.
alter table public.hallazgos
  add constraint hallazgos_rechazo_con_motivo check (
    aceptada is distinct from false
    or (aceptada_motivo is not null and btrim(aceptada_motivo) <> '')
  );

comment on column public.hallazgos.aceptada is
  'F-SG-06: si el auditado acepta la NC. NULL = no se le ha preguntado. FALSE ≠ anulado (regla 13): rechazada sigue en pie hasta resolverse.';

-- ─────────────────────── F-SG-17 col. I · cliente interno o externo ─────────
alter table public.hallazgos
  add column cliente_tipo text check (cliente_tipo in ('interno','externo'));

comment on column public.hallazgos.cliente_tipo is
  'F-SG-17 col. I. Una NC que tocó al cliente final del cliente no se reporta igual que una de un proceso interno.';

-- ────────────────────────── El análisis de causa · F-SG-07 · P-SG-05 §5.4 ───
--
-- ⚠️ **VIVE EN EL HALLAZGO, no en la acción**, y `docs/04` decía lo contrario.
-- Tres razones, y la tercera es la que decide:
--   1. En el papel es **uno por NC**: un F-SG-07 por cada F-SG-06, con el folio
--      de la NC en el encabezado. Las cinco «estrategias» de abajo son su salida.
--   2. Colgarlo de `acciones` obliga a decidir a cuál de las cinco pertenece —el
--      mismo problema que hizo descartar una tabla `analisis_causa` propia
--      (F-SG-07 §5).
--   3. ⚠️ **Un análisis puede concluir que NO se requieren acciones correctivas.**
--      Es una respuesta válida y frecuente del F-SG-07 §4 —una corrección puntual
--      sin causa sistémica—, y en `acciones` ese análisis no tendría dónde vivir.
alter table public.hallazgos
  add column causa_metodo text
             check (causa_metodo in ('cinco_porques','ishikawa','otro')),
  add column causa_analisis jsonb,
  add column causa_raiz text,
  -- Texto libre, NO una lista de contactos: es gente del cliente reunida una
  -- tarde, y darlos de alta para poder escribir un análisis convierte diez
  -- minutos en media hora. Misma decisión que `auditoria_agenda.auditado`.
  add column causa_participantes text,
  add column causa_fecha date,
  -- Las dos casillas de «Cierre del ciclo» del F-SG-07 §4.
  add column requiere_mas_informacion boolean not null default false,
  add column requiere_acciones        boolean not null default true;

comment on column public.hallazgos.causa_analisis is
  'F-SG-07: {"metodo","participantes","porques":[{"n","pregunta","respuesta","evidencia"}]}. Cinco es lo que cabe en la hoja, no un límite.';
comment on column public.hallazgos.requiere_acciones is
  'F-SG-07 §4, la compuerta hacia las acciones correctivas. FALSE es válido y frecuente: sin esta casilla la app obligaría a inventar una acción para poder cerrar.';

-- ──────────────────── Las tres preguntas de impacto · F-SG-06 §4 · F-SG-07 §6 ─
--
-- ⚠️ **También son del hallazgo, no de la acción.** Los dos formatos las hacen
-- una sola vez por NC, no una por cada acción correctiva. Y las tres tienen dos
-- fuentes independientes pidiéndolas, que es lo que las saca del terreno de la
-- idea buena: `nuevo_riesgo` y `cambio_sgc` los piden F-SG-06 y P-SG-05 §5.5;
-- `requiere_recursos` los piden F-SG-07 §6 y P-SG-05 §5.5.
--
-- Es el mecanismo por el que una no conformidad **retroalimenta el sistema de
-- gestión** en vez de morir en su propia acción correctiva — lo que ISO 9001
-- §10.2 pide y lo que un certificador revisa.
alter table public.hallazgos
  add column nuevo_riesgo       boolean not null default false,
  add column nuevo_riesgo_desc  text,
  -- El enlace, no sólo el texto: marcarlo y no poder llegar al riesgo desde ahí
  -- deja el mecanismo a medias.
  add column riesgo_id          uuid references public.riesgos(id) on delete set null,
  add column requiere_cambio_sgc      boolean not null default false,
  add column requiere_cambio_sgc_desc text,
  add column cambio_sgc_id            uuid references public.cambios_sgc(id) on delete set null,
  add column requiere_recursos       boolean not null default false,
  add column requiere_recursos_desc  text;

-- Un «Sí» sin descripción es una casilla que alguien palomeó: el valor de la
-- pregunta está entero en el texto de al lado.
alter table public.hallazgos
  add constraint hallazgos_impacto_descrito check (
    (not nuevo_riesgo        or (nuevo_riesgo_desc       is not null and btrim(nuevo_riesgo_desc)       <> ''))
    and (not requiere_cambio_sgc or (requiere_cambio_sgc_desc is not null and btrim(requiere_cambio_sgc_desc) <> ''))
    and (not requiere_recursos   or (requiere_recursos_desc   is not null and btrim(requiere_recursos_desc)   <> ''))
  );

-- Y no se enlaza lo que se dijo que no hacía falta.
alter table public.hallazgos
  add constraint hallazgos_enlaces_coherentes check (
    (riesgo_id     is null or nuevo_riesgo)
    and (cambio_sgc_id is null or requiere_cambio_sgc)
  );


-- ============================================================================
-- §4 · `acciones`  ·  F-SG-06 · F-SG-17 · P-SG-05
--
-- Lo que se ejecuta. Cuelga de un hallazgo, de un plan de mejora, de un cambio
-- de SGC — o de nada, cuando es una mejora suelta.
-- ============================================================================

create table public.acciones (
  id             uuid primary key default gen_random_uuid(),
  -- La pone `resolver_org_de_la_accion()`, del padre que tenga.
  org_id         uuid not null references public.organizaciones(id) on delete cascade,

  -- ── De quién cuelga. Los tres son opcionales y NO son excluyentes: una acción
  -- de un plan de mejora puede responder a un hallazgo.
  -- RESTRICT contra el hallazgo: es evidencia y no se lleva sus acciones por
  -- delante (regla 13 — y un `cascade` se salta el RLS).
  hallazgo_id    uuid references public.hallazgos(id)     on delete restrict,
  plan_mejora_id uuid references public.planes_mejora(id) on delete set null,
  cambio_sgc_id  uuid references public.cambios_sgc(id)   on delete set null,

  -- ── hueco 19 · `F-SG-17` col. F, y el folio del cliente cuenta POR PROCESO.
  proceso_id     uuid references public.procesos(id) on delete set null,

  -- ── Los folios. Ver §7.
  consecutivo         int  not null,
  folio               text not null,
  -- El del cliente, `AC-FA-01-25`. NULL mientras el proceso no tenga las dos
  -- letras de `P-SG-01` §5.2 en `procesos.codigo`.
  consecutivo_cliente int,
  folio_cliente       text,

  -- ⚠️ Los cuatro valores están confirmados por tres fuentes independientes:
  -- P-SG-05 §5.3 (corrección), §5.5 (correctiva), F-SG-17 col. `PREV/CORR`
  -- (preventiva) y F-SG-16 (mejora).
  tipo           text not null default 'accion_correctiva'
                 check (tipo in ('correccion','accion_correctiva','preventiva','mejora')),
  descripcion    text not null check (btrim(descripcion) <> ''),

  -- La firma o el cliente. `P-SG-05` §5.5 pide «Responsable» a secas y el F-SG-17
  -- lo repite: quien ejecuta suele ser gente del cliente.
  responsable_id          uuid references public.usuarios(id),
  responsable_contacto_id uuid references public.contactos(id) on delete set null,

  -- ⚠️ **La corrección inmediata TAMBIÉN lleva fecha** (`P-SG-02` §5.2b): no es
  -- un campo de texto del hallazgo, es una acción con su propio vencimiento.
  fecha_compromiso date not null,
  -- hueco 20 · `P-SG-05` §5.6 — reprogramar exige justificar la demora. La
  -- original se sella la primera vez que la fecha se mueve; el motivo lo exige
  -- `sellar_reprogramacion_accion()`. El rastro completo de cada reprogramación
  -- queda en `audit_logs`, que guarda `antes` y `despues` enteros.
  fecha_compromiso_original date,
  motivo_reprogramacion     text,

  -- ⚠️ Cinco estados, y son NUESTROS: el `F-SG-17` sólo tiene ABIERTA/CERRADA
  -- más un porcentaje. Los cinco son más finos y se quedan, pero **al reportar
  -- al cliente hay que colapsarlos a abierta/cerrada** (P-SG-05 §6.2).
  estado         text not null default 'abierta'
                 check (estado in ('abierta','en_proceso','por_verificar',
                                   'cerrada','cancelada')),
  -- hueco 19 · `F-SG-17` col. M. Sin esto no hay promedio por NC ni tablero.
  avance_pct     int not null default 0 check (avance_pct between 0 and 100),
  -- hueco 19 · `F-SG-17` col. N. La nota de seguimiento del Coordinador SGC,
  -- distinta de la evidencia de cierre.
  monitoreo      text,

  -- ── La verificación de eficacia. ⚠️ **Son DOS fechas** (`P-SG-05` §5.7): la
  -- programada se fija *después* de concluir las acciones, y la real es cuando
  -- se comprobó.
  eficacia_fecha_programada  date,
  eficacia_verificada_en     date,
  eficacia_verificada_por_id uuid references public.usuarios(id),
  eficacia_resultado         text check (eficacia_resultado in ('eficaz','no_eficaz','parcial')),
  eficacia_evidencia         text,

  -- ── El calendario del plan de mejora, `F-SG-16`. Dos arreglos de doce:
  -- `{"p":[1,0,…],"r":[0,0,…]}` — programado y real.
  -- ⚠️ **jsonb y no tabla hija**, exactamente por lo que decidió `D06` para
  -- `programa_procesos`: una tabla `(renglón, mes)` necesitaría un índice único
  -- que no es la PK, y ahí la cola resuelve sus `upsert` por la PK (§6.1).
  -- Además marcar seis meses serían seis operaciones de la cola en vez de una.
  meses          jsonb,

  cerrada_en     timestamptz,
  cerrada_por_id uuid references public.usuarios(id),
  -- El porqué del último cambio, como en `hallazgos`: viaja con el cambio en una
  -- sola escritura de la cola.
  motivo_cambio  text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id),

  -- ⚠️ **EL CANDADO DE LA FASE.** «Una acción no se cierra sin verificación de
  -- eficacia» es el error más común en los SGC reales, y por eso lo impone la
  -- base y no una validación del navegador.
  -- ⚠️ Y sólo `eficaz` cierra: `parcial` sigue abierta, y `no_eficaz` no se
  -- reabre —`P-SG-05` §5.7 manda levantar una NC NUEVA enlazada con
  -- `hallazgos.nc_origen_id`—.
  constraint acciones_cierre_con_eficacia check (
    estado <> 'cerrada'
    or (eficacia_verificada_en is not null and eficacia_resultado = 'eficaz')
  ),
  -- Cancelar sin decir por qué es borrar con otro nombre. Misma regla que
  -- `hallazgos_anulado_con_motivo`.
  constraint acciones_cancelada_con_motivo check (
    estado <> 'cancelada'
    or (motivo_cambio is not null and btrim(motivo_cambio) <> '')
  ),
  -- El calendario es del plan de mejora; sin plan no hay parrilla que llenar.
  constraint acciones_meses_solo_con_plan check (
    meses is null or plan_mejora_id is not null
  )
);

comment on table public.acciones is
  'El ciclo de P-SG-05: corrección, acción correctiva, preventiva y mejora. Cuelga de un hallazgo, de un plan de mejora, de un cambio de SGC, o de nada.';
comment on column public.acciones.folio is
  'ACC-2026-105, por organización y año. El nuestro, el del expediente.';
comment on column public.acciones.folio_cliente is
  'AC-FA-01-25 (P-SG-05 §5.2): tipo + procesos.codigo + consecutivo POR PROCESO + año. NULL si el proceso no tiene las dos letras.';

-- La FK que §2 dejó pendiente: `cambios_sgc` se creó antes que `acciones`.
alter table public.cambios_sgc
  add constraint cambios_sgc_accion_origen_fkey
  foreign key (accion_origen_id) references public.acciones(id) on delete set null;


-- ============================================================================
-- §5 · `quejas`  ·  P-SG-07 · F-SG-08 · F-SG-10
--
-- ⚠️ **Dos ramas con dos destinos distintos**, y esto decide el modelo: una
-- **queja** procedente genera NC y se trata por `P-SG-05`; una **sugerencia**
-- procedente NO — va a gestión de cambios (`F-SG-24`) o a plan de mejora
-- (`F-SG-16`). Por eso las dos ramas caben en una tabla con `tipo`, pero sus
-- salidas son FK distintas.
-- ============================================================================

create table public.quejas (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizaciones(id) on delete cascade,
  -- `Q-01-25` o `S-01-25`. Tercera serie de folio del cliente, y también anual.
  consecutivo    int  not null,
  folio          text not null,
  tipo           text not null default 'queja' check (tipo in ('queja','sugerencia')),
  fecha          date not null default (now() at time zone 'America/Mexico_City')::date,
  -- Quién la puso. El contacto cuando está dado de alta; el nombre suelto
  -- cuando llamó alguien que no está en el expediente — que es lo normal.
  contacto_id    uuid references public.contactos(id) on delete set null,
  cliente_nombre text,
  descripcion    text not null check (btrim(descripcion) <> ''),
  proceso_id     uuid references public.procesos(id) on delete set null,
  responsable_id uuid references public.usuarios(id),
  -- ⚠️ TRES estados: `null` = todavía no se ha decidido si procede. Es la
  -- columna `PROCEDE` del F-SG-08, y una queja improcedente **se registra y se
  -- cierra** (P-SG-07 §1) — no desaparece.
  procede        boolean,
  -- Las tres salidas. La primera sólo para quejas; las otras dos, para
  -- sugerencias.
  hallazgo_id    uuid references public.hallazgos(id)     on delete set null,
  cambio_sgc_id  uuid references public.cambios_sgc(id)   on delete set null,
  plan_mejora_id uuid references public.planes_mejora(id) on delete set null,
  avance_pct     int not null default 0 check (avance_pct between 0 and 100),
  estado         text not null default 'abierta'
                 check (estado in ('abierta','en_proceso','cerrada')),
  cerrada_en     timestamptz,
  observaciones  text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id),

  -- ⚠️ La regla de `P-SG-07`: una NC sale de una QUEJA, nunca de una sugerencia.
  constraint quejas_nc_solo_de_queja check (
    hallazgo_id is null or tipo = 'queja'
  ),
  -- Y nada se enlaza mientras no se haya decidido que procede.
  constraint quejas_salidas_solo_si_procede check (
    procede is true
    or (hallazgo_id is null and cambio_sgc_id is null and plan_mejora_id is null)
  )
);

comment on table public.quejas is
  'F-SG-08 quejas y sugerencias, con sus dos series de folio. Una queja procedente genera NC (P-SG-05); una sugerencia procedente va a F-SG-24 o F-SG-16.';


-- ============================================================================
-- §6 · `adjuntos.accion_id` — la FK que F04·B2 pedía
--
-- «Lo que queda aquí es conectarla a las acciones: la evidencia que cierra una
-- acción correctiva y la que respalda su verificación de eficacia» (docs/02,
-- F04·B2). El `F-SG-06` la nombra «Evidencia de la acción realizada».
--
-- ⚠️ Va **antes** de `hallazgo_id` en el orden de campo dominante: la evidencia
-- de una acción es de la acción, aunque la acción cuelgue de un hallazgo.
-- `CAMPOS_DOMINANTES` en `src/lib/offline/adjuntos.ts` lleva el mismo orden, y
-- el `coalesce` de `heredar_org_del_adjunto()` también.
-- ============================================================================

alter table public.adjuntos
  add column accion_id uuid references public.acciones(id) on delete cascade;

comment on column public.adjuntos.accion_id is
  'La evidencia de una acción (F-SG-06 «Evidencia», F-SG-16 col. EVIDENCIA). Campo dominante: gana sobre hallazgo_id.';


-- ============================================================================
-- §7 · LOS FOLIOS — dos series por acción, y una tercera para las quejas
--
-- El cliente numera con `AC-FA-01-25` (P-SG-05 §5.2) y nosotros con
-- `ACC-2026-105`. **No compiten: el nuestro identifica la fila en el expediente
-- de la firma y el suyo es el que su Coordinador del SGC escribe en su F-SG-17.**
-- Es el mismo reparto del hueco 2, donde la clave `AI-01-25` del cliente acabó
-- conviviendo con `AUD-2026-014`.
-- ============================================================================

create or replace function public.sellar_folio_accion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anio    int;
  v_yy      text;
  v_demo    boolean;
  v_prefijo text;
  v_letras  text;
  v_tipo    text;
begin
  -- ⚠️ `current_date` NO: la base corre en UTC y a las 19:00 de México ya es el
  -- día siguiente. Misma trampa que en los otros dos selladores de folio.
  v_anio := extract(year from (now() at time zone 'America/Mexico_City'))::int;
  v_yy   := lpad((v_anio % 100)::text, 2, '0');

  -- ── El nuestro. Sólo al nacer: un folio emitido no se recalcula. ──────────
  if tg_op = 'INSERT' then
    select o.es_demo into v_demo
      from public.organizaciones o where o.id = new.org_id;

    if v_demo is null then
      raise exception 'La organización % no existe', new.org_id using errcode = '23503';
    end if;

    v_prefijo := case when v_demo then 'DEMO-ACC' else 'ACC' end;

    perform pg_advisory_xact_lock(
      hashtext('folio_accion_' || new.org_id::text || '_' || v_anio::text));

    -- Renumera en vez de rechazar, como las dos series de `hallazgos`: una
    -- acción se captura en la reunión de cierre, y ahí tampoco hay señal.
    if new.consecutivo is null or new.consecutivo < 1 or exists (
      select 1 from public.acciones
       where org_id = new.org_id and consecutivo = new.consecutivo
         and folio ~ ('^' || v_prefijo || '-' || v_anio::text || '-[0-9]+$')
    ) then
      select coalesce(max(consecutivo), 0) + 1
        into new.consecutivo
        from public.acciones
       where org_id = new.org_id
         and folio ~ ('^' || v_prefijo || '-' || v_anio::text || '-[0-9]+$');
    end if;

    new.folio := format('%s-%s-%s', v_prefijo, v_anio::text,
                        lpad(new.consecutivo::text, 3, '0'));
  end if;

  -- ── El del cliente. Se RELLENA una vez y no se reescribe. ────────────────
  --
  -- ⚠️ No es «se recalcula en cada update»: es que al nacer una acción rara vez
  -- tiene proceso asignado —se captura primero y se clasifica después—, y
  -- congelarlo en NULL para siempre dejaría la columna inútil. En cuanto se
  -- puede componer se compone, y a partir de ahí queda quieto aunque cambien el
  -- tipo o el proceso: es el número que el Coordinador ya escribió en su hoja.
  if new.folio_cliente is not null then
    return new;
  end if;

  if new.proceso_id is null then
    return new;
  end if;

  select upper(left(btrim(p.codigo), 2)) into v_letras
    from public.procesos p
   where p.id = new.proceso_id and btrim(coalesce(p.codigo, '')) <> '';

  if v_letras is null then
    return new;
  end if;

  -- ⚠️ **Sólo `AC` viene del cliente**; `P-SG-05` §5.2 nombra ese y nada más.
  -- Los otros tres son por simetría con la columna `PREV / CORR` del `F-SG-17`,
  -- y si el cliente los llama de otra forma, esto es lo que hay que corregir.
  v_tipo := case new.tipo
              when 'accion_correctiva' then 'AC'
              when 'preventiva'        then 'AP'
              when 'correccion'        then 'CI'
              when 'mejora'            then 'AM'
            end;

  perform pg_advisory_xact_lock(
    hashtext('folio_cliente_' || new.proceso_id::text || '_' || v_anio::text));

  -- El consecutivo es **del proceso**, no del tipo: «la acción correctiva número
  -- uno del proceso de facturación del año 2025». `AC-FA-01-25` y `AC-OP-01-25`
  -- conviven; `AP-FA-02-25` sigue a `AC-FA-01-25`.
  select coalesce(max(consecutivo_cliente), 0) + 1
    into new.consecutivo_cliente
    from public.acciones
   where org_id = new.org_id
     and proceso_id = new.proceso_id
     and consecutivo_cliente is not null
     and folio_cliente ~ ('-' || v_letras || '-[0-9]+-' || v_yy || '$');

  new.folio_cliente := format('%s-%s-%s-%s', v_tipo, v_letras,
                              lpad(new.consecutivo_cliente::text, 2, '0'), v_yy);
  return new;
end
$$;

comment on function public.sellar_folio_accion is
  'ACC-2026-105 (nuestro, al nacer) y AC-FA-01-25 (del cliente, P-SG-05 §5.2, se rellena en cuanto hay proceso con código y ya no se reescribe).';


create or replace function public.sellar_folio_queja()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anio    int;
  v_yy      text;
  v_demo    boolean;
  v_letra   text;
  v_prefijo text;
begin
  v_anio := extract(year from coalesce(new.fecha,
              (now() at time zone 'America/Mexico_City')::date))::int;
  v_yy   := lpad((v_anio % 100)::text, 2, '0');

  select o.es_demo into v_demo from public.organizaciones o where o.id = new.org_id;
  if v_demo is null then
    raise exception 'La organización % no existe', new.org_id using errcode = '23503';
  end if;

  -- `Q-01-25` para quejas y `S-01-25` para sugerencias (P-SG-07 · F-SG-08), con
  -- la marca de la partición delante para poder contestar «¿esto es del cliente
  -- o es de mentira?».
  v_letra   := case new.tipo when 'sugerencia' then 'S' else 'Q' end;
  v_prefijo := case when v_demo then 'DEMO-' || v_letra else v_letra end;

  perform pg_advisory_xact_lock(
    hashtext('folio_queja_' || new.org_id::text || '_' || v_letra || '_' || v_anio::text));

  if new.consecutivo is null or new.consecutivo < 1 or exists (
    select 1 from public.quejas
     where org_id = new.org_id and consecutivo = new.consecutivo
       and folio ~ ('^' || v_prefijo || '-[0-9]+-' || v_yy || '$')
  ) then
    select coalesce(max(consecutivo), 0) + 1
      into new.consecutivo
      from public.quejas
     where org_id = new.org_id
       and folio ~ ('^' || v_prefijo || '-[0-9]+-' || v_yy || '$');
  end if;

  new.folio := format('%s-%s-%s', v_prefijo,
                      lpad(new.consecutivo::text, 2, '0'), v_yy);
  return new;
end
$$;

comment on function public.sellar_folio_queja is
  'Q-01-25 y S-01-25, por organización, tipo y año (P-SG-07 · F-SG-08). Renumera en vez de rechazar.';


-- ============================================================================
-- §8 · LA `org_id` Y LOS SELLOS
-- ============================================================================

-- Misma forma que `resolver_org_del_hallazgo()` de B0: del padre cuando lo hay,
-- de la propia fila cuando no — y ahí la valida la política de INSERT, que es
-- la que siempre decidió quién escribe en qué cliente.
create or replace function public.resolver_org_de_la_accion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if new.hallazgo_id is not null then
    select org_id into v_org from public.hallazgos where id = new.hallazgo_id;
    if v_org is null then
      raise exception 'El hallazgo % no existe', new.hallazgo_id using errcode = '23503';
    end if;
  elsif new.plan_mejora_id is not null then
    select org_id into v_org from public.planes_mejora where id = new.plan_mejora_id;
    if v_org is null then
      raise exception 'El plan de mejora % no existe', new.plan_mejora_id using errcode = '23503';
    end if;
  elsif new.cambio_sgc_id is not null then
    select org_id into v_org from public.cambios_sgc where id = new.cambio_sgc_id;
    if v_org is null then
      raise exception 'El cambio % no existe', new.cambio_sgc_id using errcode = '23503';
    end if;
  else
    if new.org_id is null then
      raise exception 'Una acción suelta tiene que traer su organización'
        using errcode = '23502';
    end if;
    v_org := new.org_id;
  end if;

  -- ⚠️ Y los padres que NO mandaron la org_id tienen que ser del mismo cliente:
  -- con dos clientes asignados, una acción de un hallazgo del A podría colgar
  -- del plan de mejora del B sin violar ninguna política.
  if new.plan_mejora_id is not null
     and (select org_id from public.planes_mejora where id = new.plan_mejora_id) is distinct from v_org then
    raise exception 'Ese plan de mejora no pertenece a esta organización' using errcode = '23514';
  end if;

  if new.cambio_sgc_id is not null
     and (select org_id from public.cambios_sgc where id = new.cambio_sgc_id) is distinct from v_org then
    raise exception 'Ese cambio de SGC no pertenece a esta organización' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and new.org_id is distinct from old.org_id
     and old.hallazgo_id is null and old.plan_mejora_id is null and old.cambio_sgc_id is null then
    raise exception 'La organización de una acción no se cambia' using errcode = '42501';
  end if;

  new.org_id := v_org;
  return new;
end
$$;

comment on function public.resolver_org_de_la_accion is
  'La org_id de una acción: de su hallazgo, plan o cambio; de la propia fila cuando es una mejora suelta. Y comprueba que los padres sean del mismo cliente.';


-- El QUIÉN lo sella la base; el CUÁNDO también, porque cerrar una acción y
-- verificar su eficacia son actos de OFICINA, no de campo (docs/04 · Fase 03).
create or replace function public.sellar_accion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ── Cierre ───────────────────────────────────────────────────────────────
  if new.estado = 'cerrada' and (tg_op = 'INSERT' or old.estado is distinct from 'cerrada') then
    new.cerrada_en     := now();
    new.cerrada_por_id := auth.uid();
  elsif new.estado <> 'cerrada' then
    new.cerrada_en     := null;
    new.cerrada_por_id := null;
  end if;

  -- ── Verificación de eficacia ─────────────────────────────────────────────
  -- Quién verificó lo pone el servidor: es la firma que un certificador mira.
  if new.eficacia_verificada_en is not null
     and (tg_op = 'INSERT' or old.eficacia_verificada_en is distinct from new.eficacia_verificada_en) then
    new.eficacia_verificada_por_id := auth.uid();
  elsif new.eficacia_verificada_en is null then
    new.eficacia_verificada_por_id := null;
  end if;

  -- ── hueco 20 · reprogramar exige justificar la demora (P-SG-05 §5.6) ──────
  if tg_op = 'UPDATE' and new.fecha_compromiso is distinct from old.fecha_compromiso then
    -- ⚠️ **Y el motivo tiene que ser NUEVO**, no el de la vez pasada. Sin esto,
    -- una acción reprogramada tres veces enseñaría siempre la primera excusa y
    -- el §5.6 quedaría satisfecho en apariencia. El rastro de cada una queda
    -- entero en `audit_logs`, que guarda `antes` y `despues`.
    if new.motivo_reprogramacion is null
       or btrim(new.motivo_reprogramacion) = ''
       or new.motivo_reprogramacion is not distinct from old.motivo_reprogramacion then
      raise exception 'Mover la fecha compromiso exige justificar la demora'
        using errcode = '23514';
    end if;

    -- La primera fecha se guarda una sola vez: es contra la que se mide si la
    -- acción se retrasó, y reescribirla borraría el retraso.
    new.fecha_compromiso_original := coalesce(old.fecha_compromiso_original,
                                              old.fecha_compromiso);
  end if;

  return new;
end
$$;

comment on function public.sellar_accion is
  'Sella cierre y verificación de eficacia (actos de oficina), y exige un motivo NUEVO para cada reprogramación (P-SG-05 §5.6).';


create or replace function public.sellar_plan_aprobado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'aprobado' and (tg_op = 'INSERT' or old.estado is distinct from 'aprobado') then
    new.aprobado_por_id := auth.uid();
    new.aprobado_en     := now();
  elsif new.estado = 'borrador' then
    new.aprobado_por_id := null;
    new.aprobado_en     := null;
  end if;
  return new;
end
$$;


create or replace function public.sellar_cambio_autorizado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'autorizado' and (tg_op = 'INSERT' or old.estado is distinct from 'autorizado') then
    new.autorizado_por_id := auth.uid();
    new.autorizado_en     := now();
  elsif new.estado in ('borrador','en_revision') then
    new.autorizado_por_id := null;
    new.autorizado_en     := null;
  end if;
  return new;
end
$$;


-- ⚠️ **La guarda genérica gana dos ramas, `proyecto_id` y `contacto_id`.**
-- `cambios_sgc` referencia un proyecto y `quejas` un contacto, y ninguna de las
-- dos columnas estaba contemplada. Se amplía la función que ya existe en vez de
-- escribir una nueva: mira las columnas con `to_jsonb`, así que **es aditiva** —
-- las cinco tablas que ya la usan no tienen ninguna de las dos y no cambian de
-- comportamiento.
-- No sirve `validar_contexto_de_la_auditoria()`: lee `new.programa_id` directo, y
-- en una tabla que no lo tiene revienta en tiempo de ejecución.
create or replace function public.validar_referencia_de_la_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if to_jsonb(new) ? 'sitio_id' and (to_jsonb(new)->>'sitio_id') is not null then
    select org_id into v_org from public.sitios where id = (to_jsonb(new)->>'sitio_id')::uuid;
    if v_org is distinct from new.org_id then
      raise exception 'Ese sitio no pertenece a esta organización' using errcode = '23514';
    end if;
  end if;

  if to_jsonb(new) ? 'proceso_id' and (to_jsonb(new)->>'proceso_id') is not null then
    select org_id into v_org from public.procesos where id = (to_jsonb(new)->>'proceso_id')::uuid;
    if v_org is distinct from new.org_id then
      raise exception 'Ese proceso no pertenece a esta organización' using errcode = '23514';
    end if;
  end if;

  if to_jsonb(new) ? 'responsable_contacto_id' and (to_jsonb(new)->>'responsable_contacto_id') is not null then
    select org_id into v_org from public.contactos where id = (to_jsonb(new)->>'responsable_contacto_id')::uuid;
    if v_org is distinct from new.org_id then
      raise exception 'Ese contacto no pertenece a esta organización' using errcode = '23514';
    end if;
  end if;

  -- Nuevas en F04·B1.
  if to_jsonb(new) ? 'contacto_id' and (to_jsonb(new)->>'contacto_id') is not null then
    select org_id into v_org from public.contactos where id = (to_jsonb(new)->>'contacto_id')::uuid;
    if v_org is distinct from new.org_id then
      raise exception 'Ese contacto no pertenece a esta organización' using errcode = '23514';
    end if;
  end if;

  if to_jsonb(new) ? 'proyecto_id' and (to_jsonb(new)->>'proyecto_id') is not null then
    select org_id into v_org from public.proyectos where id = (to_jsonb(new)->>'proyecto_id')::uuid;
    if v_org is distinct from new.org_id then
      raise exception 'Ese proyecto no pertenece a esta organización' using errcode = '23514';
    end if;
  end if;

  return new;
end
$$;

comment on function public.validar_referencia_de_la_org is
  'Guarda de multi-tenencia: el sitio, proceso, contacto o proyecto que referencia una fila tiene que ser del mismo cliente. Mira las columnas que existen, con to_jsonb.';


-- Los hijos que cuelgan de otra fila heredan su `org_id`, nunca la mandan.
create or replace function public.heredar_org_del_cambio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_doc uuid;
begin
  select org_id into v_org from public.cambios_sgc where id = new.cambio_id;
  if v_org is null then
    raise exception 'El cambio % no existe', new.cambio_id using errcode = '23503';
  end if;
  new.org_id := v_org;

  select org_id into v_doc from public.documentos where id = new.documento_id;
  if v_doc is distinct from v_org then
    raise exception 'Ese documento no pertenece a la organización del cambio'
      using errcode = '23514';
  end if;

  return new;
end
$$;


-- El campo dominante nuevo entra en la cascada, **delante de `hallazgo_id`**: la
-- evidencia de una acción es de la acción, aunque la acción cuelgue de una NC.
-- ⚠️ El orden tiene que ser el mismo que `CAMPOS_DOMINANTES` en
-- `src/lib/offline/adjuntos.ts`, o la fila viaja con un campo y la base la
-- cuelga de otro.
create or replace function public.heredar_org_del_adjunto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if new.tarea_etapa_id is not null then
    select org_id into v_org from public.tareas_etapa where id = new.tarea_etapa_id;
    if v_org is null then
      raise exception 'La tarea % no existe', new.tarea_etapa_id using errcode = '23503';
    end if;
  elsif new.accion_id is not null then
    select org_id into v_org from public.acciones where id = new.accion_id;
    if v_org is null then
      raise exception 'La acción % no existe', new.accion_id using errcode = '23503';
    end if;
  elsif new.hallazgo_id is not null then
    select org_id into v_org from public.hallazgos where id = new.hallazgo_id;
    if v_org is null then
      raise exception 'El hallazgo % no existe', new.hallazgo_id using errcode = '23503';
    end if;
  elsif new.item_id is not null then
    select org_id into v_org from public.auditoria_items where id = new.item_id;
    if v_org is null then
      raise exception 'El punto de verificación % no existe', new.item_id using errcode = '23503';
    end if;
  elsif new.documento_id is not null then
    select org_id into v_org from public.documentos where id = new.documento_id;
    if v_org is null then
      raise exception 'El documento % no existe', new.documento_id using errcode = '23503';
    end if;
  else
    v_org := new.org_id;
  end if;

  new.org_id := v_org;
  return new;
end
$$;


-- ============================================================================
-- §8b · EL HISTORIAL DEL HALLAZGO — tres columnas nuevas que cambian su sentido
--
-- `audit_logs` ya guarda todo, pero `hallazgos_historial` es el que la ficha del
-- hallazgo PINTA: es el relato que un certificador lee, campo por campo y con su
-- motivo. Tres de las columnas de §3 pertenecen ahí:
--
--   · **`aceptada`** — que el auditado RECHACE la no conformidad es el cambio de
--     estado más delicado de todo el ciclo, y hasta hoy no dejaba renglón. Sin
--     él, «el cliente no está de acuerdo» pasaría sin rastro visible.
--   · **`causa_raiz`** — la conclusión del análisis. El jsonb de los cinco
--     porqués NO va: es demasiado verboso para un historial campo por campo, y
--     su versión anterior queda entera en `audit_logs`.
--   · **`nc_origen_id`** — enlazar una NC a la que reincide cambia qué historia
--     cuenta (P-SG-05 §5.7).
-- ============================================================================

create or replace function public.registrar_historial_hallazgo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.hallazgos_historial (org_id, hallazgo_id, campo, antes, despues, motivo, hecho_por)
  select new.org_id, new.id, c.campo, c.antes, c.despues, nullif(btrim(coalesce(new.motivo_cambio,'')), ''), auth.uid()
    from (values
      ('tipo',                    old.tipo,                                        new.tipo),
      ('estado',                  old.estado,                                      new.estado),
      ('clausula_id',             old.clausula_id::text,                           new.clausula_id::text),
      ('descripcion',             old.descripcion,                                 new.descripcion),
      ('evidencia_objetiva',      old.evidencia_objetiva,                          new.evidencia_objetiva),
      ('requisito_incumplido',    old.requisito_incumplido,                        new.requisito_incumplido),
      ('fecha_compromiso',        to_char(old.fecha_compromiso, 'YYYY-MM-DD'),     to_char(new.fecha_compromiso, 'YYYY-MM-DD')),
      ('responsable_contacto_id', old.responsable_contacto_id::text,               new.responsable_contacto_id::text),
      ('motivo_anulacion',        old.motivo_anulacion,                            new.motivo_anulacion),
      -- F04·B0
      ('fuente_nc',               old.fuente_nc,                                   new.fuente_nc),
      ('fuente_detalle',          old.fuente_detalle,                              new.fuente_detalle),
      ('auditoria_id',            old.auditoria_id::text,                          new.auditoria_id::text),
      -- F04·B1
      ('aceptada',                old.aceptada::text,                              new.aceptada::text),
      ('causa_raiz',              old.causa_raiz,                                  new.causa_raiz),
      ('nc_origen_id',            old.nc_origen_id::text,                          new.nc_origen_id::text)
    ) as c(campo, antes, despues)
   where c.antes is distinct from c.despues;

  return null;
end
$$;

comment on function public.registrar_historial_hallazgo is
  'Una fila de hallazgos_historial por cada campo que cambió: tipo, estado, cita, fuente, auditoría, aceptación del auditado, causa raíz y reincidencia. El historial es el producto, no higiene.';


-- ============================================================================
-- §9 · ÍNDICES
-- Todo filtra por organización, siempre.
-- ============================================================================

create index acciones_org_idx        on public.acciones (org_id, estado, fecha_compromiso);
create index acciones_hallazgo_idx   on public.acciones (hallazgo_id) where hallazgo_id is not null;
create index acciones_plan_idx       on public.acciones (plan_mejora_id) where plan_mejora_id is not null;
create index acciones_cambio_idx     on public.acciones (cambio_sgc_id) where cambio_sgc_id is not null;
create index acciones_proceso_idx    on public.acciones (org_id, proceso_id, consecutivo_cliente);
create index acciones_responsable_idx on public.acciones (responsable_id) where responsable_id is not null;
-- El tablero del lunes y el widget `acciones_semana`: qué vence pronto y sigue
-- abierto.
create index acciones_vencimiento_idx on public.acciones (fecha_compromiso)
  where estado in ('abierta','en_proceso','por_verificar');

create index planes_mejora_org_idx   on public.planes_mejora (org_id, anio);
create index cambios_sgc_org_idx     on public.cambios_sgc (org_id, estado);
create index cambios_sgc_docs_idx    on public.cambios_sgc_documentos (cambio_id);
create index cambios_sgc_docs_doc_idx on public.cambios_sgc_documentos (documento_id);
create index quejas_org_idx          on public.quejas (org_id, estado, fecha desc);
create index quejas_hallazgo_idx     on public.quejas (hallazgo_id) where hallazgo_id is not null;
create index adjuntos_accion_idx     on public.adjuntos (accion_id) where accion_id is not null;
create index hallazgos_nc_origen_idx on public.hallazgos (nc_origen_id) where nc_origen_id is not null;


-- ============================================================================
-- §10 · TRIGGERS
--
-- ⚠️ **El orden alfabético manda**: Postgres dispara los BEFORE de una misma
-- operación por nombre. `_org` pone la `org_id`, `_valida` compara contra ella y
-- `_zfolio` compone el folio cuando la fila ya está entera. Renombrar uno rompe
-- la guarda en silencio.
-- ============================================================================

create trigger acciones_org
  before insert or update on public.acciones
  for each row execute function public.resolver_org_de_la_accion();

create trigger acciones_sellar
  before insert or update on public.acciones
  for each row execute function public.sellar_accion();

create trigger acciones_valida
  before insert or update on public.acciones
  for each row execute function public.validar_referencia_de_la_org();

create trigger acciones_zfolio
  before insert or update on public.acciones
  for each row execute function public.sellar_folio_accion();

create trigger acciones_actualizado_en
  before update on public.acciones
  for each row execute function public.tocar_actualizado_en();

create trigger acciones_bitacora
  after insert or update or delete on public.acciones
  for each row execute function public.registrar_bitacora();

create trigger planes_mejora_sellar
  before insert or update on public.planes_mejora
  for each row execute function public.sellar_plan_aprobado();

create trigger planes_mejora_actualizado_en
  before update on public.planes_mejora
  for each row execute function public.tocar_actualizado_en();

create trigger planes_mejora_bitacora
  after insert or update or delete on public.planes_mejora
  for each row execute function public.registrar_bitacora();

create trigger cambios_sgc_sellar
  before insert or update on public.cambios_sgc
  for each row execute function public.sellar_cambio_autorizado();

create trigger cambios_sgc_valida
  before insert or update on public.cambios_sgc
  for each row execute function public.validar_referencia_de_la_org();

create trigger cambios_sgc_actualizado_en
  before update on public.cambios_sgc
  for each row execute function public.tocar_actualizado_en();

create trigger cambios_sgc_bitacora
  after insert or update or delete on public.cambios_sgc
  for each row execute function public.registrar_bitacora();

create trigger cambios_sgc_documentos_org
  before insert or update on public.cambios_sgc_documentos
  for each row execute function public.heredar_org_del_cambio();

create trigger quejas_valida
  before insert or update on public.quejas
  for each row execute function public.validar_referencia_de_la_org();

create trigger quejas_zfolio
  before insert on public.quejas
  for each row execute function public.sellar_folio_queja();

create trigger quejas_actualizado_en
  before update on public.quejas
  for each row execute function public.tocar_actualizado_en();

create trigger quejas_bitacora
  after insert or update or delete on public.quejas
  for each row execute function public.registrar_bitacora();


-- ============================================================================
-- §11 · RLS
--
-- ⚠️ **Sin `or public.es_socio()`.** Desde `20260825120000` la rama del socio
-- vive DENTRO de `mis_organizaciones()`, ya filtrada por partición; volver a
-- escribirla suelta aquí reabriría la puerta lateral que esa migración cerró en
-- 32 políticas — un socio de pruebas vería los clientes reales (regla 1).
-- ============================================================================

alter table public.acciones               enable row level security;
alter table public.planes_mejora          enable row level security;
alter table public.cambios_sgc            enable row level security;
alter table public.cambios_sgc_documentos enable row level security;
alter table public.quejas                 enable row level security;

-- ------------------------------------------------------------- acciones ----
create policy "acciones_select" on public.acciones for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

create policy "acciones_insert" on public.acciones for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "acciones_update" on public.acciones for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- ⚠️ **Se borra sólo lo que todavía no es evidencia de nada**: una acción recién
-- capturada, sin avance, sin evidencia y sin verificación. Todo lo demás **se
-- cancela con motivo** —el CHECK lo exige— y queda.
-- Es la línea de la regla 13: lo que no es evidencia sí se borra, y sólo
-- mientras no cuelgue nada de ello.
create policy "acciones_delete" on public.acciones for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and estado = 'abierta'
     and avance_pct = 0
     and eficacia_verificada_en is null
     and not exists (select 1 from public.adjuntos a where a.accion_id = acciones.id));

-- -------------------------------------------------------- planes de mejora --
create policy "planes_mejora_select" on public.planes_mejora for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

create policy "planes_mejora_insert" on public.planes_mejora for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "planes_mejora_update" on public.planes_mejora for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- Un plan aprobado lleva firmas al pie: es un entregable, y ya no se borra.
create policy "planes_mejora_delete" on public.planes_mejora for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and estado = 'borrador'
     and not exists (select 1 from public.acciones a where a.plan_mejora_id = planes_mejora.id));

-- --------------------------------------------------------- cambios de SGC --
create policy "cambios_sgc_select" on public.cambios_sgc for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

create policy "cambios_sgc_insert" on public.cambios_sgc for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "cambios_sgc_update" on public.cambios_sgc for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

create policy "cambios_sgc_delete" on public.cambios_sgc for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and estado = 'borrador'
     and not exists (select 1 from public.acciones a where a.cambio_sgc_id = cambios_sgc.id));

create policy "cambios_sgc_documentos_select" on public.cambios_sgc_documentos for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

create policy "cambios_sgc_documentos_insert" on public.cambios_sgc_documentos for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "cambios_sgc_documentos_delete" on public.cambios_sgc_documentos for delete to authenticated
  using (public.puedo_editar_org(org_id));

-- ---------------------------------------------------------------- quejas ---
create policy "quejas_select" on public.quejas for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

create policy "quejas_insert" on public.quejas for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "quejas_update" on public.quejas for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- ⚠️ Una queja improcedente **se registra y se cierra** (P-SG-07 §1), no se
-- borra: es la prueba de que se atendió. Sólo se quita la capturada por error,
-- antes de decidir si procede.
create policy "quejas_delete" on public.quejas for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and procede is null
     and estado = 'abierta');


-- ============================================================================
-- §12 · LA AMPLIACIÓN QUE TOCA A ESTA FASE
--
-- «Una organización con documentos, auditorías o hallazgos ya no se borra.»
-- Ahora tampoco una con acciones: una acción de mejora suelta no cuelga de
-- ningún hallazgo, así que sin esta línea un cliente con todo su ciclo de mejora
-- capturado y sin una sola auditoría seguiría siendo borrable.
-- ============================================================================

create or replace function public.puedo_borrar_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_socio()
     and not exists (select 1 from public.documentos    where org_id = p_org)
     and not exists (select 1 from public.auditorias    where org_id = p_org)
     and not exists (select 1 from public.hallazgos     where org_id = p_org)
     and not exists (select 1 from public.acciones      where org_id = p_org)
     and not exists (select 1 from public.quejas        where org_id = p_org)
$$;

comment on function public.puedo_borrar_org is
  'Socio, y sin documentos, auditorías, hallazgos, acciones ni quejas. Lo que es evidencia no se borra: la organización se cierra.';
