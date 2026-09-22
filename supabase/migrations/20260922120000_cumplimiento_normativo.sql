-- ============================================================================
-- F05·B1 + B2 · CUMPLIMIENTO NORMATIVO: OBLIGACIONES, ÁREAS Y VENCIMIENTOS
--
-- Tarea `F00`. La especificación completa está en
-- `docs/13_ESPECIFICACION_F05_B1_B2.md`, y manda sobre lo que diga el plan.
--
-- **Las tres decisiones del dueño (22 sep 2026) que fijan el diseño:**
--   1. **UNA tabla**, `obligaciones`: la matriz de NOMs y la matriz de
--      obligaciones de compliance son lo mismo. Una NOM es un TIPO DE FUENTE, no
--      el eje del modelo — por eso cabe un despacho jurídico igual que una planta.
--   2. **Área nullable**: la evaluación cuelga de `sitio_areas` cuando la hay.
--   3. **`tipo` editable**: `obligacion_tipos` es un catálogo, no un CHECK.
--      ⚠️ Excepción consciente a «los catálogos de dominio van text + CHECK»; la
--      fricción se sustituye por `activo = false` y por que nada se borra.
--
-- ⚠️ **LAS BIBLIOTECAS NACEN VACÍAS.** `noms`, `nom_requisitos` y
-- `obligacion_tipos` no llevan ni un `INSERT` de siembra: las llena el socio
-- desde la pantalla, con sus palabras (regla 12, igual que `normas`).
--
-- ⚠️ **Va DESPUÉS de `20260909120000_avisos_y_notificaciones.sql`**: amplía el
-- CHECK de categorías que esa migración dejó con trece valores, y cuelga el
-- barrido de vencimientos de `correr_avisos_programados()`, que nace ahí.
--
-- ✅ **Es aditiva.** Tablas nuevas, columnas nullable, un CHECK que se amplía y
-- tres funciones que se reescriben con lo mismo más algo. No rechaza ninguna
-- fila que antes pasaba.
--
-- Contenido:
--   §1 · noms · nom_requisitos · obligacion_tipos — la biblioteca de la firma
--   §2 · sitio_areas                                       — la decisión 2
--   §3 · obligaciones                                      — LA tabla
--   §4 · vencimientos                                      — B2
--   §5 · adjuntos.obligacion_id · adjuntos.vencimiento_id
--   §6 · generar_obligaciones_de_nom()
--   §7 · el barrido de vencimientos dentro del cron diario
--   §8 · puedo_borrar_org() ampliada — y la partición que había perdido
--   §9 · hueco 29: las cuatro categorías multinorma
--   §10 · índices, triggers y RLS
-- ============================================================================


-- ============================================================================
-- §1 · LA BIBLIOTECA DE LA FIRMA — sin `org_id`, con partición de pruebas
--
-- Sigue el patrón de `normas` exactamente, lección de `A10` incluida:
-- `unique (clave, es_demo)` y NO `unique (clave)`. Sin eso la cuenta de pruebas
-- no podría dar de alta su propia `NOM-002-STPS-2010` mientras exista la real.
-- Y por lo mismo el alta NO usa `upsert` sobre `clave` (docs/03 §6.1).
-- ============================================================================

-- ⚠️ **La clave lleva el AÑO dentro** (`NOM-035-STPS-2018`). Una NOM que sale en
-- versión nueva **se da de alta como otra NOM** y la anterior pasa a
-- `vigente = false`. Nunca se reescribe: hay obligaciones y hallazgos citándola,
-- igual que `norma_clausulas`.
create table public.noms (
  id             uuid primary key default gen_random_uuid(),
  clave          text not null check (length(btrim(clave)) > 0),
  nombre         text not null check (length(btrim(nombre)) > 0),
  autoridad      text not null default 'stps'
                 check (autoridad in ('stps','semarnat','proteccion_civil','salud','otro')),
  tipo           text check (tipo in ('seguridad','higiene','organizacion','producto','ambiental')),
  -- Texto libre: «anual», «bienal», «por evento». Es lo que la NOM dice, no la
  -- cadencia con la que Summit la verifica (ésa va en cada obligación).
  periodicidad   text,
  vigente        boolean not null default true,
  -- La pone `sellar_particion()`; el navegador no la manda.
  es_demo        boolean not null default false,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id),
  constraint noms_clave_particion_key unique (clave, es_demo)
);

comment on table public.noms is
  'Biblioteca de NOMs de la firma. Nace vacía y la llena el socio (regla 12). La clave lleva el año: una NOM nueva es otra fila, la vieja pasa a vigente = false.';

-- La plantilla de lo que se verifica. Es a `obligaciones` lo que
-- `norma_clausulas` es a `auditoria_items`.
--
-- ⚠️ **`elemento` es lo que de verdad se evalúa**, no el numeral: «Extintores»,
-- «Carpeta normativa». El formato real de Summit audita una planta, no un papel
-- (docs/13 §3.4). El numeral se conserva como referencia para citarlo.
create table public.nom_requisitos (
  id                 uuid primary key default gen_random_uuid(),
  -- RESTRICT: una NOM no se borra, y si algún día se pudiera, no puede llevarse
  -- la plantilla de la que nacieron obligaciones ya evaluadas.
  nom_id             uuid not null references public.noms(id) on delete restrict,
  numeral            text,
  elemento           text not null check (length(btrim(elemento)) > 0),
  -- El deber, **con las palabras de Summit** (regla 12).
  descripcion        text not null check (length(btrim(descripcion)) > 0),
  evidencia_esperada text,
  -- La condición en prosa: «centros de trabajo de 16 a 50 trabajadores».
  aplica_si          text,
  -- ⚠️ **Sólo para PROPONER** (docs/13 §5.2). Giro y actividad se quedan en la
  -- prosa a propósito: hoy nada los consume (regla 11). Estos dos sí, porque
  -- `sitios.num_trabajadores` ya existe.
  min_trabajadores   int check (min_trabajadores is null or min_trabajadores >= 0),
  max_trabajadores   int check (max_trabajadores is null or max_trabajadores >= 0),
  orden              int not null default 0,
  activa             boolean not null default true,
  -- La hereda de su NOM `heredar_particion_de_la_nom()`.
  es_demo            boolean not null default false,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  creado_por         uuid references public.usuarios(id),
  constraint nom_requisitos_rango_check
    check (min_trabajadores is null or max_trabajadores is null
           or min_trabajadores <= max_trabajadores)
);

comment on table public.nom_requisitos is
  'Elementos verificables de una NOM, con las palabras de Summit. Plantilla de obligaciones. Lo que desaparece se apaga (activa = false), nunca se borra.';

comment on column public.nom_requisitos.min_trabajadores is
  'Sólo PROPONE si aplica, comparando con sitios.num_trabajadores. Lo que se guarda en obligaciones.aplica es lo que decidió una persona.';

-- ⚠️ **Decisión 3 del dueño**: el tipo de obligación es un catálogo editable, no
-- un CHECK. Arranca vacío; la pantalla de alta propone los que el dominio ya
-- conoce (estudio, dictamen, licencia, permiso, mantenimiento…) sin sembrarlos.
create table public.obligacion_tipos (
  id             uuid primary key default gen_random_uuid(),
  clave          text not null check (length(btrim(clave)) > 0),
  nombre         text not null check (length(btrim(nombre)) > 0),
  descripcion    text,
  orden          int not null default 0,
  -- Dar de baja es apagar: hay obligaciones y vencimientos que lo citan.
  activo         boolean not null default true,
  es_demo        boolean not null default false,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id),
  constraint obligacion_tipos_clave_particion_key unique (clave, es_demo)
);

comment on table public.obligacion_tipos is
  'Tipos de obligación de la firma (decisión 3 del dueño, 22 sep 2026): catálogo editable, no CHECK. Se da de baja con activo = false, nunca se borra.';


-- ============================================================================
-- §2 · `sitio_areas` — la decisión 2
--
-- El recorrido va por ÁREAS dentro del sitio —recepción, comedor, site de
-- telecomunicaciones— y un extintor falta en un área, no en el domicilio.
-- ============================================================================

create table public.sitio_areas (
  id             uuid primary key default gen_random_uuid(),
  -- La pone `heredar_org_del_sitio()`; el cliente no la manda.
  org_id         uuid not null references public.organizaciones(id) on delete cascade,
  sitio_id       uuid not null references public.sitios(id) on delete cascade,
  nombre         text not null check (length(btrim(nombre)) > 0),
  orden          int not null default 0,
  activa         boolean not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id)
);

comment on table public.sitio_areas is
  'Áreas de un sitio: la unidad del recorrido de cumplimiento. Una con obligaciones o vencimientos no se quita (política de DELETE); se apaga.';


-- ============================================================================
-- §3 · `obligaciones` — LA tabla (decisión 1)
--
-- Es a la vez la matriz de aplicabilidad NOM y la matriz de obligaciones de
-- compliance (`SGI-F-COM-18`). **Una fila = un deber concreto de esta
-- organización.**
--
-- ⚠️ **`aplica` es NULLABLE, y es lo que resuelve una contradicción de la
-- especificación.** docs/13 pedía a la vez que la justificación fuera
-- obligatoria en los dos sentidos (§3.3) y que `generar_obligaciones_de_nom()`
-- la dejara vacía «a propósito, la escribe una persona» (§4). Con `aplica NOT
-- NULL` las dos cosas no caben: el INSERT de la RPC chocaría contra el CHECK. Se
-- resuelve con un tercer estado que ya existía en la realidad —**«todavía no se
-- decidió»**—:
--   · `aplica is null`  → recién generada; sin justificación, y no se evalúa.
--   · `aplica` true/false → decidida por una persona, **con justificación**.
-- La propuesta (min/max contra `num_trabajadores`) la calcula la pantalla, que
-- tiene los dos números en la caché; la columna guarda sólo lo que alguien
-- decidió (docs/13 §5.2). Así la app propone, la persona decide y lo decidido
-- es lo que queda.
-- ============================================================================

create table public.obligaciones (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organizaciones(id) on delete cascade,
  sitio_id                uuid references public.sitios(id) on delete cascade,
  -- ⚠️ Decisión 2. Tiene que ser del sitio de la fila: `validar_ubicacion_cumplimiento()`.
  area_id                 uuid references public.sitio_areas(id) on delete cascade,
  tipo_id                 uuid references public.obligacion_tipos(id) on delete restrict,
  nom_id                  uuid references public.noms(id) on delete restrict,
  -- El renglón de plantilla del que nació. Es lo que hace idempotente la RPC.
  nom_requisito_id        uuid references public.nom_requisitos(id) on delete restrict,
  -- El elemento que se camina: «Extintores». Copiado de la plantilla al generar;
  -- en una obligación de compliance puede ir vacío.
  elemento                text,
  -- ⚠️ **La cita en prosa**: «LFPDPPP (DOF 20-Mar-2025), arts. 26 y 27». Texto
  -- porque no toda fuente está en `noms`.
  fuente                  text,
  -- ⚠️ **Arreglo**: el formato real combina («Legal / Norma») en un tercio de sus
  -- renglones. Partirlo en booleanos daría cuatro columnas muertas.
  naturaleza              text[] not null default '{}'::text[]
                          check (naturaleza <@ array['legal','norma','contractual','voluntaria']::text[]),
  obligacion              text not null check (length(btrim(obligacion)) > 0),
  aplica                  boolean,
  justificacion           text,
  responsable_id          uuid references public.usuarios(id),
  -- ⚠️ El control del SGI que la cubre: engancha con la Fase 02.
  documento_id            uuid references public.documentos(id) on delete set null,
  evidencia_esperada      text,
  -- ⚠️ **NO es un vencimiento** (docs/13 §5.1): es una cadencia. Lo que caduca es
  -- la próxima verificación, y las cosas que vencen viven en `vencimientos`.
  frecuencia_verificacion text check (frecuencia_verificacion in
                          ('anual','semestral','trimestral','mensual','por_evento','unica_vez')),
  -- La calcula `sellar_evaluacion_obligacion()` al evaluar.
  proxima_verificacion    date,
  estado_cumplimiento     text not null default 'sin_evaluar'
                          check (estado_cumplimiento in
                          ('cumple','parcial','no_cumple','en_proceso','sin_evaluar')),
  observacion             text,
  -- ⚠️ **La manda el TELÉFONO** (docs/13 §5.3). El QUIÉN lo sella el servidor.
  evaluado_en             timestamptz,
  evaluado_por_id         uuid references public.usuarios(id),
  orden                   int not null default 0,
  creado_en               timestamptz not null default now(),
  actualizado_en          timestamptz not null default now(),
  creado_por              uuid references public.usuarios(id),

  -- 1 · La justificación es obligatoria tanto si aplica como si no. Sólo la
  --     fila que nadie ha decidido todavía puede ir sin ella.
  constraint obligaciones_justificacion_check
    check (aplica is null
           or (justificacion is not null and length(btrim(justificacion)) > 0)),
  -- 2 · «Parcial» sin motivo es un veredicto que nadie puede defender.
  constraint obligaciones_parcial_check
    check (estado_cumplimiento <> 'parcial'
           or (observacion is not null and length(btrim(observacion)) > 0)),
  -- ⚠️ 3 · No se evalúa lo que no aplica ni lo que no se ha decidido. Un
  --     «no cumple» sobre algo que no aplica es un incumplimiento inventado en
  --     el informe que ve el cliente.
  constraint obligaciones_evalua_si_aplica_check
    check (estado_cumplimiento = 'sin_evaluar' or aplica is true),
  -- Un área sin sitio no dice dónde está.
  constraint obligaciones_area_con_sitio_check
    check (area_id is null or sitio_id is not null)
);

comment on table public.obligaciones is
  'La matriz de obligaciones: NOMs, leyes, contratos y compromisos voluntarios de una organización. Una fila = un deber concreto. aplica null = todavía no decidido.';

comment on column public.obligaciones.evaluado_en is
  'El reloj del TELÉFONO: la hora del recorrido, no la de recuperar la señal. actualizado_en sigue siendo del servidor.';

comment on column public.obligaciones.aplica is
  'null = generada y sin decidir. true/false = decidido por una persona, con justificación obligatoria.';


-- ============================================================================
-- §4 · `vencimientos` — B2
--
-- ⚠️ **No es `obligaciones`**: una obligación es permanente y se verifica con
-- una cadencia; un vencimiento es una COSA CONCRETA QUE CADUCA. «Contar con el
-- estudio de iluminación» es la obligación; «estudio del 10-Mar-2025, 24 meses,
-- vence el 10-Mar-2027» es el vencimiento.
-- ============================================================================

create table public.vencimientos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizaciones(id) on delete cascade,
  obligacion_id  uuid references public.obligaciones(id) on delete set null,
  sitio_id       uuid references public.sitios(id) on delete cascade,
  area_id        uuid references public.sitio_areas(id) on delete cascade,
  tipo_id        uuid references public.obligacion_tipos(id) on delete restrict,
  nombre         text not null check (length(btrim(nombre)) > 0),
  emitido_en     date,
  vigencia_meses int check (vigencia_meses is null or vigencia_meses > 0),
  -- ⚠️ **Se GUARDA calculada** (docs/13 §5.4): es la columna que se indexa y
  -- por la que barre el cron, y no puede ser generada —`date + interval` no es
  -- IMMUTABLE— y además hay vencimientos sin emisión (una licencia que ya
  -- venía). La app la calcula; la base la exige.
  vence_en       date not null,
  responsable_id uuid references public.usuarios(id),
  documento_id   uuid references public.documentos(id) on delete set null,
  -- ⚠️ `vigente`, `por_vencer` y `vencido` los mantiene la BASE contra la fecha
  -- (`calcular_estado_vencimiento()` y el cron). `en_tramite` y `no_aplica` son
  -- decisiones de una persona y no se tocan.
  estado         text not null default 'vigente'
                 check (estado in ('vigente','por_vencer','vencido','en_tramite','no_aplica')),
  notas          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id),
  constraint vencimientos_area_con_sitio_check
    check (area_id is null or sitio_id is not null)
);

comment on table public.vencimientos is
  'Lo que caduca: estudios, dictámenes, licencias, recargas. vence_en es date y se guarda calculada. Avisos a 90/60/30/7 días (SGI-P-TI-01 §5.17.3 + Summit).';

-- A cuántos días un vencimiento pasa a «por vencer». Coincide con el primer
-- aviso: desde el día que alguien recibe «vence en 90», la pantalla lo pinta en
-- ámbar.
create or replace function public.dias_por_vencer()
returns int
language sql
immutable
as $$ select 90 $$;

create or replace function public.calcular_estado_vencimiento()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  -- ⚠️ `current_date` NO: la base corre en UTC y a las 19:00 de México ya es el
  -- día siguiente — y aquí un día decide si algo está vencido.
  v_hoy date := (now() at time zone 'America/Mexico_City')::date;
begin
  if new.estado in ('vigente','por_vencer','vencido') then
    new.estado := case
      when new.vence_en < v_hoy                              then 'vencido'
      when new.vence_en - v_hoy <= public.dias_por_vencer()  then 'por_vencer'
      else 'vigente'
    end;
  end if;
  return new;
end
$$;


-- ============================================================================
-- Herencias y validaciones
-- ============================================================================

-- El área hereda la organización de su sitio. Mismo motivo que
-- `heredar_org_del_proyecto()`: el navegador no tiene por qué saberla, y aunque
-- la mandara bien, el WITH CHECK sólo comprobaría que es SUYA, no que es la del
-- sitio.
create or replace function public.heredar_org_del_sitio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.sitios where id = new.sitio_id;

  if v_org is null then
    raise exception 'El sitio % no existe', new.sitio_id using errcode = '23503';
  end if;

  new.org_id := v_org;
  return new;
end
$$;

-- Un requisito está en la partición de su NOM. Mismo patrón que
-- `heredar_particion_de_la_norma()`.
create or replace function public.heredar_particion_de_la_nom()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demo boolean;
begin
  select es_demo into v_demo from public.noms where id = new.nom_id;

  if v_demo is null then
    raise exception 'La NOM % no existe', new.nom_id using errcode = '23503';
  end if;

  new.es_demo := v_demo;
  return new;
end
$$;

-- Y si una NOM cambia de lado —sólo desde una conexión directa—, sus requisitos
-- la siguen.
create or replace function public.propagar_particion_de_la_nom()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.es_demo is distinct from old.es_demo then
    update public.nom_requisitos set es_demo = new.es_demo where nom_id = new.id;
  end if;
  return null;
end
$$;

-- ⚠️ **Todo lo que una obligación o un vencimiento apunta tiene que ser de SU
-- organización**, y ninguna FK ni CHECK lo puede decir: el sitio, el área, el
-- documento y —en un vencimiento— la obligación. Sin esto, un consultor con dos
-- clientes podría colgar la evaluación de uno en el sitio del otro sin violar
-- ninguna política. Es `validar_sitio_del_proyecto()` generalizada.
--
-- Una sola función para las dos tablas: leen las mismas columnas y divergen en
-- una rama.
create or replace function public.validar_ubicacion_cumplimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org   uuid;
  v_sitio uuid;
  v_nom   uuid;
begin
  if new.sitio_id is not null then
    select org_id into v_org from public.sitios where id = new.sitio_id;
    if v_org is distinct from new.org_id then
      raise exception 'El sitio no pertenece a la organización' using errcode = '23514';
    end if;
  end if;

  if new.area_id is not null then
    select sitio_id into v_sitio from public.sitio_areas where id = new.area_id;
    if v_sitio is distinct from new.sitio_id then
      raise exception 'El área no pertenece al sitio' using errcode = '23514';
    end if;
  end if;

  if new.documento_id is not null then
    select org_id into v_org from public.documentos where id = new.documento_id;
    if v_org is distinct from new.org_id then
      raise exception 'El documento no pertenece a la organización' using errcode = '23514';
    end if;
  end if;

  if tg_table_name = 'obligaciones' then
    -- El renglón de plantilla tiene que ser de la NOM que se cita. Si viene el
    -- requisito sin la NOM, se completa: es la misma información.
    if new.nom_requisito_id is not null then
      select nom_id into v_nom from public.nom_requisitos where id = new.nom_requisito_id;
      if new.nom_id is null then
        new.nom_id := v_nom;
      elsif v_nom is distinct from new.nom_id then
        raise exception 'El requisito no pertenece a esa NOM' using errcode = '23514';
      end if;
    end if;
  else
    if new.obligacion_id is not null then
      select org_id into v_org from public.obligaciones where id = new.obligacion_id;
      if v_org is distinct from new.org_id then
        raise exception 'La obligación no pertenece a la organización' using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end
$$;

-- Quién evaluó una obligación, y cuándo toca volver.
--
-- ⚠️ **El QUIÉN lo pone la base; el CUÁNDO lo manda el teléfono.** Es la regla
-- de la Fase 03 (`sellar_evaluacion_item()`), con una vuelta más: aquí también
-- se protege el caso en que el veredicto NO cambia. Allá un navegador que
-- mandara `evaluado_por` en un UPDATE de nota lo conseguía; aquí se conserva lo
-- que había, porque cambiarle la firma a una evaluación sin re-evaluar es
-- inventar quién la hizo.
create or replace function public.sellar_evaluacion_obligacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fecha date;
begin
  if new.estado_cumplimiento = 'sin_evaluar' then
    new.evaluado_por_id      := null;
    new.evaluado_en          := null;
    new.proxima_verificacion := null;
    return new;
  end if;

  if tg_op = 'INSERT' or old.estado_cumplimiento is distinct from new.estado_cumplimiento then
    new.evaluado_por_id := auth.uid();
    -- Si el teléfono no mandó la hora del recorrido, se cae a la del servidor.
    -- Peor dato, pero mejor que ninguno.
    new.evaluado_en     := coalesce(new.evaluado_en, now());
  else
    new.evaluado_por_id := old.evaluado_por_id;
    new.evaluado_en     := old.evaluado_en;
  end if;

  -- La próxima verificación sale de la fecha de la evaluación, en México, y de
  -- la cadencia. `por_evento` y `unica_vez` no tienen próxima: no hay
  -- calendario que la dé.
  v_fecha := (new.evaluado_en at time zone 'America/Mexico_City')::date;
  new.proxima_verificacion := case new.frecuencia_verificacion
    when 'anual'      then (v_fecha + interval '1 year')::date
    when 'semestral'  then (v_fecha + interval '6 months')::date
    when 'trimestral' then (v_fecha + interval '3 months')::date
    when 'mensual'    then (v_fecha + interval '1 month')::date
    else null
  end;

  return new;
end
$$;


-- ============================================================================
-- §5 · `adjuntos.obligacion_id` y `adjuntos.vencimiento_id`
--
-- La foto del extintor y el PDF del dictamen. Es la vía de ampliación que
-- F02·B2b dejó escrita: una columna aquí, una rama en
-- `heredar_org_del_adjunto()` y una línea en `CAMPOS_DOMINANTES`.
--
-- ⚠️ **El orden**: tarea → acción → hallazgo → punto → **vencimiento →
-- obligación** → documento. El vencimiento va antes que la obligación porque
-- cuelga de ella: es más específico. Y los dos antes que el documento, porque
-- una obligación CITA un documento, no al revés. `CAMPOS_DOMINANTES` en
-- `src/lib/offline/adjuntos.ts` lleva el mismo orden; si divergen, la fila viaja
-- con un campo y la base la cuelga de otro.
-- ============================================================================

alter table public.adjuntos
  add column obligacion_id  uuid references public.obligaciones(id) on delete cascade,
  add column vencimiento_id uuid references public.vencimientos(id) on delete cascade;

comment on column public.adjuntos.obligacion_id is
  'La evidencia de una obligación: la foto del extintor, la carpeta normativa. Campo dominante entre vencimiento_id y documento_id.';
comment on column public.adjuntos.vencimiento_id is
  'El estudio, el dictamen o la licencia que vence. Campo dominante entre item_id y obligacion_id.';

create index adjuntos_obligacion_idx  on public.adjuntos (obligacion_id)  where obligacion_id  is not null;
create index adjuntos_vencimiento_idx on public.adjuntos (vencimiento_id) where vencimiento_id is not null;

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
  elsif new.vencimiento_id is not null then
    select org_id into v_org from public.vencimientos where id = new.vencimiento_id;
    if v_org is null then
      raise exception 'El vencimiento % no existe', new.vencimiento_id using errcode = '23503';
    end if;
  elsif new.obligacion_id is not null then
    select org_id into v_org from public.obligaciones where id = new.obligacion_id;
    if v_org is null then
      raise exception 'La obligación % no existe', new.obligacion_id using errcode = '23503';
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
-- §6 · `generar_obligaciones_de_nom()`
--
-- `nom_requisitos` es una plantilla y `obligaciones` su instancia por
-- organización: la misma relación que `norma_clausulas` ↔ `auditoria_items`. Se
-- copian las reglas de `generar_lista_verificacion()` sin inventar nada:
--
--   · Sólo los requisitos ACTIVOS.
--   · ⚠️ **Idempotente**: correrla dos veces no duplica. La huella es
--     (organización, sitio, requisito) sobre las filas SIN área —las que la
--     propia RPC genera—; las copias que el consultor hizo a mano por área no
--     cuentan como «ya está».
--   · ⚠️ **No pisa lo ya evaluado**: no actualiza nada, sólo inserta lo que falta.
--   · ⚠️ **SECURITY INVOKER**: el INSERT pasa por la política, así que el papel
--     `lectura` no genera nada. Una `security definer` aquí sería una puerta
--     trasera a la multi-tenencia con forma de comodidad.
--   · ⚠️ **No decide si aplica**: deja `aplica` y `justificacion` en null. La
--     propuesta la pinta la pantalla; decidir es de una persona (§3).
--
-- ⚠️ **Sexta excepción consciente a `offlineWrite`** (CLAUDE.md): es una RPC,
-- escribe decenas de filas de golpe y se hace en la oficina antes de salir.
-- ============================================================================

create or replace function public.generar_obligaciones_de_nom(
  p_org   uuid,
  p_sitio uuid,
  p_nom   uuid
)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_creados int;
  v_base    int;
begin
  if not exists (select 1 from public.noms where id = p_nom) then
    raise exception 'La NOM % no existe', p_nom using errcode = '23503';
  end if;

  if p_sitio is not null
     and not exists (select 1 from public.sitios where id = p_sitio and org_id = p_org) then
    raise exception 'El sitio no pertenece a la organización' using errcode = '23514';
  end if;

  -- Los nuevos van después de lo que el consultor ya tenía ordenado.
  select coalesce(max(orden), 0) into v_base
    from public.obligaciones
   where org_id = p_org and sitio_id is not distinct from p_sitio;

  with candidatos as (
    select r.id, r.nom_id, r.elemento, r.descripcion, r.evidencia_esperada, n.clave,
           r.numeral,
           row_number() over (order by r.orden, r.numeral, r.elemento) as fila
      from public.nom_requisitos r
      join public.noms n on n.id = r.nom_id
     where r.nom_id = p_nom
       and r.activa
       and not exists (
         select 1 from public.obligaciones o
          where o.org_id = p_org
            and o.sitio_id is not distinct from p_sitio
            and o.area_id is null
            and o.nom_requisito_id = r.id
       )
  )
  insert into public.obligaciones
    (org_id, sitio_id, nom_id, nom_requisito_id, elemento, fuente, naturaleza,
     obligacion, evidencia_esperada, orden, creado_por)
  select p_org, p_sitio, c.nom_id, c.id, c.elemento,
         case when c.numeral is null or btrim(c.numeral) = '' then c.clave
              else c.clave || ', ' || c.numeral end,
         array['legal','norma']::text[],
         c.descripcion, c.evidencia_esperada, v_base + c.fila::int, auth.uid()
    from candidatos c;

  get diagnostics v_creados = row_count;
  return v_creados;
end
$$;

comment on function public.generar_obligaciones_de_nom is
  'Crea una obligación por requisito activo de la NOM para ese sitio. Idempotente, no pisa lo evaluado, no decide si aplica. SECURITY INVOKER.';

revoke all on function public.generar_obligaciones_de_nom(uuid, uuid, uuid) from public;
grant execute on function public.generar_obligaciones_de_nom(uuid, uuid, uuid) to authenticated;


-- ============================================================================
-- §7 · EL BARRIDO DE VENCIMIENTOS — dentro del cron diario
--
-- ⚠️ **No hay un tercer cron.** El plan Hobby de Vercel da dos y están
-- ocupados; el barrido se cuelga de `correr_avisos_programados()`, igual que el
-- «Estado de las NC» bimestral. La función se reescribe entera con lo que ya
-- tenía, sin tocar una coma, y el bloque nuevo al final.
--
-- **Cadencia 90 / 60 / 30 / 7.** Las tres primeras son del cliente
-- (`SGI-P-TI-01` §5.17.3); la de 7 es el último recordatorio de Summit. Gana el
-- formato sobre la prosa del plan, que decía 90/30/7 (precedente de `D06`).
--
-- ⚠️ `clave_evento` describe el HECHO: `vencimiento:<id>:vence_90`. Con el
-- índice único parcial, correr el cron tres veces no manda tres avisos.
-- ⚠️ Lo vencido avisa UNA VEZ, no todos los días a partir de ahí.
-- ============================================================================

create or replace function public.correr_avisos_programados()
returns TABLE (usuario_id uuid, categoria text, titulo text, cuerpo text, enlace text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy date := (now() at time zone 'America/Mexico_City')::date;
  v_dia int  := extract(day from v_hoy)::int;
  v_mes int  := extract(month from v_hoy)::int;
begin
  -- ── Acciones que vencen pronto ─────────────────────────────────────────────
  insert into public.notificaciones
    (usuario_id, org_id, categoria, titulo, cuerpo, enlace, clave_evento, registro_id)
  select
    a.responsable_id,
    a.org_id,
    'accion_por_vencer',
    format('Vence en %s día%s: %s',
           a.fecha_compromiso - v_hoy,
           case when a.fecha_compromiso - v_hoy = 1 then '' else 's' end,
           coalesce(a.folio_cliente, a.folio)),
    a.descripcion,
    '/acciones',
    format('accion:%s:vence_%s', a.id, a.fecha_compromiso - v_hoy),
    a.id::text
  from public.acciones a
  where a.responsable_id is not null
    and a.estado in ('abierta','en_proceso','por_verificar')
    and (a.fecha_compromiso - v_hoy) in (7, 3, 1)
    and public.quiere_aviso(a.responsable_id, 'accion_por_vencer')
  on conflict do nothing;

  -- ── Acciones vencidas ──────────────────────────────────────────────────────
  insert into public.notificaciones
    (usuario_id, org_id, categoria, titulo, cuerpo, enlace, clave_evento, registro_id)
  select
    a.responsable_id,
    a.org_id,
    'accion_vencida',
    format('Venció: %s', coalesce(a.folio_cliente, a.folio)),
    a.descripcion,
    '/acciones',
    format('accion:%s:vencida', a.id),
    a.id::text
  from public.acciones a
  where a.responsable_id is not null
    and a.estado in ('abierta','en_proceso','por_verificar')
    and a.fecha_compromiso < v_hoy
    and public.quiere_aviso(a.responsable_id, 'accion_vencida')
  on conflict do nothing;

  -- ── «Estado de las NC», BIMESTRAL · P-SG-08 §5.5 ──────────────────────────
  if v_dia = 1 and v_mes % 2 = 1 then
    insert into public.notificaciones
      (usuario_id, org_id, categoria, titulo, cuerpo, enlace, clave_evento)
    select
      uo.usuario_id,
      uo.org_id,
      'estado_nc_bimestral',
      'Estado de las no conformidades',
      format('%s abiertas y %s cerradas en el bimestre.',
             count(*) filter (where h.estado in ('abierto','en_accion','verificado')),
             count(*) filter (where h.estado = 'cerrado')),
      '/auditorias?tab=hallazgos',
      format('nc_bimestral:%s:%s-%s', uo.org_id, extract(year from v_hoy)::int, v_mes)
    from public.usuarios_organizaciones uo
    join public.hallazgos h on h.org_id = uo.org_id
    where public.quiere_aviso(uo.usuario_id, 'estado_nc_bimestral')
    group by uo.usuario_id, uo.org_id
    having count(*) > 0
    on conflict do nothing;
  end if;

  -- ── Vencimientos · F05·B2 ──────────────────────────────────────────────────
  --
  -- Primero se pone al día el estado guardado: `calcular_estado_vencimiento()`
  -- sólo corre cuando alguien escribe la fila, y un estudio que nadie toca pasa
  -- de vigente a vencido solo, con el calendario. El UPDATE sólo toca las filas
  -- que de verdad cambian — cada una deja su renglón en `audit_logs`.
  update public.vencimientos v
     set estado = case
           when v.vence_en < v_hoy                             then 'vencido'
           when v.vence_en - v_hoy <= public.dias_por_vencer() then 'por_vencer'
           else 'vigente'
         end
   where v.estado in ('vigente','por_vencer','vencido')
     and v.estado <> case
           when v.vence_en < v_hoy                             then 'vencido'
           when v.vence_en - v_hoy <= public.dias_por_vencer() then 'por_vencer'
           else 'vigente'
         end;

  -- ⚠️ Cada umbral con su propia clave: así los cuatro se mandan una vez cada
  -- uno. `en_tramite` también avisa —la renovación está pedida, pero si no
  -- llega, vence igual—; `no_aplica` no.
  insert into public.notificaciones
    (usuario_id, org_id, categoria, titulo, cuerpo, enlace, clave_evento, registro_id)
  select
    v.responsable_id,
    v.org_id,
    'obligacion_proxima',
    format('Vence en %s días: %s', v.vence_en - v_hoy, v.nombre),
    format('Vence el %s.', to_char(v.vence_en, 'DD/MM/YYYY')),
    format('/cumplimiento?tab=vencimientos&org=%s', v.org_id),
    format('vencimiento:%s:vence_%s', v.id, v.vence_en - v_hoy),
    v.id::text
  from public.vencimientos v
  where v.responsable_id is not null
    and v.estado in ('vigente','por_vencer','en_tramite')
    and (v.vence_en - v_hoy) in (90, 60, 30, 7)
    and public.quiere_aviso(v.responsable_id, 'obligacion_proxima')
  on conflict do nothing;

  -- ⚠️ **Una sola vez**, con una clave que no lleva fecha. El seguimiento de lo
  -- vencido es la pantalla, no el teléfono.
  insert into public.notificaciones
    (usuario_id, org_id, categoria, titulo, cuerpo, enlace, clave_evento, registro_id)
  select
    v.responsable_id,
    v.org_id,
    'obligacion_proxima',
    format('Venció: %s', v.nombre),
    format('Venció el %s.', to_char(v.vence_en, 'DD/MM/YYYY')),
    format('/cumplimiento?tab=vencimientos&org=%s', v.org_id),
    format('vencimiento:%s:vencido', v.id),
    v.id::text
  from public.vencimientos v
  where v.responsable_id is not null
    and v.estado in ('vencido','en_tramite')
    and v.vence_en < v_hoy
    and public.quiere_aviso(v.responsable_id, 'obligacion_proxima')
  on conflict do nothing;

  -- ── Lo que la ruta tiene que empujar ──────────────────────────────────────
  return query
    select n.usuario_id, n.categoria, n.titulo, n.cuerpo, n.enlace
      from public.notificaciones n
     where n.creado_en >= now() - interval '5 minutes'
       and n.leida_en is null;
end
$$;

comment on function public.correr_avisos_programados is
  'El cron diario: acciones por vencer y vencidas, el «Estado de las NC» bimestral de P-SG-08 y los vencimientos a 90/60/30/7 días. Idempotente por clave_evento.';

revoke all on function public.correr_avisos_programados() from public, anon, authenticated;


-- ============================================================================
-- §8 · `puedo_borrar_org()` — ampliada, y con la partición que había perdido
--
-- Una evaluación de cumplimiento es evidencia, y un vencimiento con su dictamen
-- también: una organización con cualquiera de las dos no se borra.
--
-- ⚠️ **Y se le devuelve la partición.** `A10` la metió
-- (`o.es_demo = soy_dev()`) y la versión de `20260908120000_acciones…` la
-- reescribió desde la de la Fase 03, sin ella. No era explotable desde la app
-- —PostgREST filtra el DELETE también por la política de SELECT, que sí la
-- lleva—, pero la función dice «puedo borrar» y tiene que ser verdad por sí
-- sola: el día que alguien la use desde otra política o una RPC, sin esta línea
-- un socio de pruebas podría borrar un cliente real.
-- ============================================================================

create or replace function public.puedo_borrar_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_socio()
     and exists (select 1 from public.organizaciones o
                  where o.id = p_org and o.es_demo = public.soy_dev())
     and not exists (select 1 from public.documentos    where org_id = p_org)
     and not exists (select 1 from public.auditorias    where org_id = p_org)
     and not exists (select 1 from public.hallazgos     where org_id = p_org)
     and not exists (select 1 from public.acciones      where org_id = p_org)
     and not exists (select 1 from public.quejas        where org_id = p_org)
     and not exists (select 1 from public.obligaciones  where org_id = p_org
                                                          and estado_cumplimiento <> 'sin_evaluar')
     and not exists (select 1 from public.vencimientos  where org_id = p_org)
$$;

comment on function public.puedo_borrar_org is
  'Socio de su partición, y sin documentos, auditorías, hallazgos, acciones, quejas, obligaciones evaluadas ni vencimientos. Lo que es evidencia no se borra.';


-- ============================================================================
-- §9 · HUECO 29 — las cuatro categorías multinorma
--
-- La matriz de comunicación del cliente 02 pasó de doce a dieciséis renglones.
-- Se avisó a tiempo y la migración de avisos se aplicó sin ellas; **meterlas
-- aquí cuesta cero, en otra migración cuesta otra migración.** Trece → diecisiete.
-- Como las de indicadores, **no tienen disparador todavía**: la categoría existe
-- para que el día que entre su pantalla no haga falta abrir el CHECK.
--
-- ⚠️ Lo que docs/13 §3.6 pedía además —`continuidad` y `ambiental` en
-- `riesgos.tipo`— **NO entra**, a propósito: esa columna es la polaridad
-- `riesgo/oportunidad`, no la categoría. Los 19 tipos de `SGI-F-CA-23` son otra
-- columna, y se deciden con el resto de esa matriz en la Fase 02.
-- ============================================================================

alter table public.notificaciones drop constraint notificaciones_categoria_check;

alter table public.notificaciones
  add constraint notificaciones_categoria_check check (categoria in (
    'hallazgo_asignado',
    'accion_por_vencer',
    'accion_vencida',
    'obligacion_proxima',
    'resumen_diario',
    'evidencia_evaluada',
    'documento_por_aprobar',
    'indicadores_mensual',
    'queja_recibida',
    'satisfaccion_cliente',
    'documento_publicado',
    'estado_nc_bimestral',
    -- ── Hueco 29 · la matriz multinorma del cliente 02 ──────────────────────
    'politica_compliance',
    'canal_denuncias',
    'incidente_seguridad',
    'obligaciones_compliance'
  ));


-- ============================================================================
-- §10 · ÍNDICES, TRIGGERS Y RLS
-- ============================================================================

create index nom_requisitos_nom_idx       on public.nom_requisitos (nom_id, orden);
create index nom_requisitos_particion_idx on public.nom_requisitos (es_demo);
create index noms_particion_idx           on public.noms (es_demo);
create index obligacion_tipos_part_idx    on public.obligacion_tipos (es_demo);
create index sitio_areas_sitio_idx        on public.sitio_areas (sitio_id, orden);
create index sitio_areas_org_idx          on public.sitio_areas (org_id);
create index obligaciones_org_idx         on public.obligaciones (org_id, sitio_id, orden);
create index obligaciones_area_idx        on public.obligaciones (area_id) where area_id is not null;
create index obligaciones_requisito_idx   on public.obligaciones (nom_requisito_id) where nom_requisito_id is not null;
create index vencimientos_org_idx         on public.vencimientos (org_id, vence_en);
create index vencimientos_obligacion_idx  on public.vencimientos (obligacion_id) where obligacion_id is not null;
-- Por donde barre el cron.
create index vencimientos_barrido_idx     on public.vencimientos (org_id, vence_en)
  where estado in ('vigente','por_vencer');

-- ── actualizado_en ─────────────────────────────────────────────────────────
create trigger noms_actualizado_en
  before update on public.noms
  for each row execute function public.tocar_actualizado_en();
create trigger nom_requisitos_actualizado_en
  before update on public.nom_requisitos
  for each row execute function public.tocar_actualizado_en();
create trigger obligacion_tipos_actualizado_en
  before update on public.obligacion_tipos
  for each row execute function public.tocar_actualizado_en();
create trigger sitio_areas_actualizado_en
  before update on public.sitio_areas
  for each row execute function public.tocar_actualizado_en();
create trigger obligaciones_actualizado_en
  before update on public.obligaciones
  for each row execute function public.tocar_actualizado_en();
create trigger vencimientos_actualizado_en
  before update on public.vencimientos
  for each row execute function public.tocar_actualizado_en();

-- ── partición de la biblioteca ─────────────────────────────────────────────
create trigger noms_particion
  before insert or update on public.noms
  for each row execute function public.sellar_particion();
create trigger obligacion_tipos_particion
  before insert or update on public.obligacion_tipos
  for each row execute function public.sellar_particion();
create trigger nom_requisitos_particion
  before insert or update on public.nom_requisitos
  for each row execute function public.heredar_particion_de_la_nom();
create trigger noms_propagar_particion
  after update on public.noms
  for each row execute function public.propagar_particion_de_la_nom();

-- ── herencia y validación ──────────────────────────────────────────────────
create trigger sitio_areas_org
  before insert or update on public.sitio_areas
  for each row execute function public.heredar_org_del_sitio();

-- ⚠️ El orden entre triggers BEFORE es alfabético por nombre. En `obligaciones`:
-- `_estado` → `_valida` (completa `nom_id`, compara `org_id`). El sello de la
-- evaluación no depende de la validación, así que su orden relativo da igual.
create trigger obligaciones_estado
  before insert or update on public.obligaciones
  for each row execute function public.sellar_evaluacion_obligacion();
create trigger obligaciones_valida
  before insert or update on public.obligaciones
  for each row execute function public.validar_ubicacion_cumplimiento();

create trigger vencimientos_estado
  before insert or update on public.vencimientos
  for each row execute function public.calcular_estado_vencimiento();
create trigger vencimientos_valida
  before insert or update on public.vencimientos
  for each row execute function public.validar_ubicacion_cumplimiento();

-- ── bitácora ───────────────────────────────────────────────────────────────
-- ⚠️ `nom_requisitos` va SIN bitácora, por lo mismo que `norma_clausulas`: se
-- captura por lotes, y la trazabilidad de la biblioteca la da `noms`.
create trigger noms_bitacora
  after insert or update or delete on public.noms
  for each row execute function public.registrar_bitacora();
create trigger obligacion_tipos_bitacora
  after insert or update or delete on public.obligacion_tipos
  for each row execute function public.registrar_bitacora();
create trigger sitio_areas_bitacora
  after insert or update or delete on public.sitio_areas
  for each row execute function public.registrar_bitacora();
create trigger obligaciones_bitacora
  after insert or update or delete on public.obligaciones
  for each row execute function public.registrar_bitacora();
create trigger vencimientos_bitacora
  after insert or update or delete on public.vencimientos
  for each row execute function public.registrar_bitacora();

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.noms             enable row level security;
alter table public.nom_requisitos   enable row level security;
alter table public.obligacion_tipos enable row level security;
alter table public.sitio_areas      enable row level security;
alter table public.obligaciones     enable row level security;
alter table public.vencimientos     enable row level security;

-- La biblioteca: la lee cualquiera DE SU LADO, la escribe el socio. Sin DELETE:
-- se apaga. Es exactamente el patrón de `normas` después de `A10`.
create policy "noms_select" on public.noms for select to authenticated
  using (es_demo = public.soy_dev());
create policy "noms_insert" on public.noms for insert to authenticated
  with check (public.es_socio());
create policy "noms_update" on public.noms for update to authenticated
  using      (public.es_socio() and es_demo = public.soy_dev())
  with check (public.es_socio() and es_demo = public.soy_dev());

create policy "nom_requisitos_select" on public.nom_requisitos for select to authenticated
  using (es_demo = public.soy_dev());
create policy "nom_requisitos_insert" on public.nom_requisitos for insert to authenticated
  with check (public.es_socio());
create policy "nom_requisitos_update" on public.nom_requisitos for update to authenticated
  using      (public.es_socio() and es_demo = public.soy_dev())
  with check (public.es_socio() and es_demo = public.soy_dev());

create policy "obligacion_tipos_select" on public.obligacion_tipos for select to authenticated
  using (es_demo = public.soy_dev());
create policy "obligacion_tipos_insert" on public.obligacion_tipos for insert to authenticated
  with check (public.es_socio());
create policy "obligacion_tipos_update" on public.obligacion_tipos for update to authenticated
  using      (public.es_socio() and es_demo = public.soy_dev())
  with check (public.es_socio() and es_demo = public.soy_dev());

-- ⚠️ Las tres de dominio: `mis_organizaciones()` A SECAS, sin `or es_socio()`
-- (regla 1 · A10), y escritura por `puedo_editar_org()`, que excluye `lectura`.
create policy "sitio_areas_select" on public.sitio_areas for select to authenticated
  using (org_id in (select public.mis_organizaciones()));
create policy "sitio_areas_insert" on public.sitio_areas for insert to authenticated
  with check (public.puedo_editar_org(org_id));
create policy "sitio_areas_update" on public.sitio_areas for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));
-- ⚠️ **Un área con obligaciones o vencimientos no se quita.** Un `on delete
-- cascade` se salta el RLS: sin esta condición, quitar un área se llevaría las
-- evaluaciones y sus fotos. Se apaga (`activa = false`).
create policy "sitio_areas_delete" on public.sitio_areas for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and not exists (select 1 from public.obligaciones o where o.area_id = sitio_areas.id)
     and not exists (select 1 from public.vencimientos v where v.area_id = sitio_areas.id));

create policy "obligaciones_select" on public.obligaciones for select to authenticated
  using (org_id in (select public.mis_organizaciones()));
create policy "obligaciones_insert" on public.obligaciones for insert to authenticated
  with check (public.puedo_editar_org(org_id));
create policy "obligaciones_update" on public.obligaciones for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));
-- Se quita lo generado por error —una NOM que no era—, **mientras nadie la haya
-- evaluado ni le haya tomado una foto**. Una evaluación es evidencia (regla 13),
-- y el cascade de `adjuntos` se saltaría la política de borrado de las fotos.
create policy "obligaciones_delete" on public.obligaciones for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and estado_cumplimiento = 'sin_evaluar'
     and not exists (select 1 from public.adjuntos a where a.obligacion_id = obligaciones.id)
     and not exists (select 1 from public.vencimientos v where v.obligacion_id = obligaciones.id));

create policy "vencimientos_select" on public.vencimientos for select to authenticated
  using (org_id in (select public.mis_organizaciones()));
create policy "vencimientos_insert" on public.vencimientos for insert to authenticated
  with check (public.puedo_editar_org(org_id));
create policy "vencimientos_update" on public.vencimientos for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));
-- Un vencimiento capturado por error se quita; uno con su dictamen adjunto, no.
create policy "vencimientos_delete" on public.vencimientos for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and not exists (select 1 from public.adjuntos a where a.vencimiento_id = vencimientos.id));
