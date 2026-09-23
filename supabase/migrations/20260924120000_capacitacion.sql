-- ============================================================================
-- F05·B3 · CAPACITACIÓN: PROVEEDORES, CURSOS, PROGRAMA ANUAL, SESIONES Y DC-3
--
-- Tarea `F00c`. Especificación: `docs/14_ESPECIFICACION_F05_B3.md`.
-- ⚠️ **Va DESPUÉS de `20260923120000_renovacion_de_vencimientos.sql`**:
-- reescribe `heredar_org_del_adjunto()` y `puedo_borrar_org()`, que esa cadena
-- dejó con las ramas de cumplimiento.
--
-- **Las cuatro respuestas de Summit (23 sep 2026) que fijan el diseño:**
--   1. **El instructor es EXTERNO**, y es quien imparte el curso. No es un
--      usuario de la firma: es un nombre, en texto.
--   2. **Hay un catálogo de proveedores** —los agentes capacitadores externos—,
--      porque Summit trabaja con más de uno.
--   3. **La solicitud al proveedor es una lista genérica**: la app la arma en
--      CSV con lo que cualquier agente pide para expedir un DC-3.
--   4. **Sólo se entrega el DC-3**, que expide el proveedor. ⚠️ **Summit NO
--      emite constancias**: la app **registra** el folio y el PDF que llegan, no
--      genera ninguna. Sin formato oficial, sin registro STPS de la firma, sin
--      bucket `constancias`.
--
-- ⚠️ **LAS BIBLIOTECAS NACEN VACÍAS**, igual que `noms`: `cursos` y
-- `proveedores_capacitacion` las llena el socio desde la pantalla, sin un solo
-- `INSERT` de siembra (decisión del dueño, 22 sep 2026).
--
-- ✅ **Es aditiva**: tablas nuevas, dos columnas nullable en `adjuntos` y dos
-- funciones reescritas con lo mismo más algo.
-- ============================================================================


-- ============================================================================
-- §1 · LA BIBLIOTECA DE LA FIRMA — sin `org_id`, con partición de pruebas
-- ============================================================================

-- Los agentes capacitadores externos. Es a quien se le manda la lista y quien
-- devuelve los DC-3.
create table public.proveedores_capacitacion (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null check (length(btrim(nombre)) > 0),
  razon_social   text,
  rfc            text,
  -- El número con que la STPS lo registra como agente capacitador externo. Va
  -- impreso en cada DC-3 que expide, y es lo que un inspector pregunta.
  registro_stps  text,
  contacto       text,
  correo         text,
  telefono       text,
  notas          text,
  activo         boolean not null default true,
  es_demo        boolean not null default false,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id)
);

comment on table public.proveedores_capacitacion is
  'Agentes capacitadores externos que Summit contrata: imparten el curso y expiden el DC-3. Catálogo de la firma; se da de baja, no se borra.';

create table public.cursos (
  id             uuid primary key default gen_random_uuid(),
  clave          text,
  nombre         text not null check (length(btrim(nombre)) > 0),
  tipo           text not null default 'normatividad'
                 check (tipo in ('normatividad','brigada','sistema_gestion','otro')),
  -- La NOM a la que responde, si responde a una. De la biblioteca de F05·B1.
  nom_id         uuid references public.noms(id) on delete restrict,
  duracion_horas numeric(6,2) check (duracion_horas is null or duracion_horas > 0),
  temario        text,
  modalidad      text not null default 'presencial'
                 check (modalidad in ('presencial','en_linea','mixta')),
  activo         boolean not null default true,
  es_demo        boolean not null default false,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id)
);

comment on table public.cursos is
  'Catálogo de cursos de la firma. Nace vacío y lo llena el socio. Se da de baja, no se borra: hay sesiones que lo citan.';


-- ============================================================================
-- §2 · `dnc` — el programa anual de capacitación de un cliente
--
-- Un renglón = «este curso, en este mes, para tantas personas». **Si ya se
-- impartió NO se guarda aquí**: se deriva en memoria de que exista una sesión
-- que lo cite (`sesiones.dnc_id`). Guardarlo sería un dato que dos escrituras
-- de la cola podrían dejar contradiciéndose.
-- ============================================================================

create table public.dnc (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizaciones(id) on delete cascade,
  anio               int  not null check (anio between 2000 and 2100),
  mes                int  not null check (mes between 1 and 12),
  curso_id           uuid not null references public.cursos(id) on delete restrict,
  sitio_id           uuid references public.sitios(id) on delete set null,
  participantes      int check (participantes is null or participantes >= 0),
  cancelada          boolean not null default false,
  motivo_cancelacion text,
  notas              text,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  creado_por         uuid references public.usuarios(id),
  -- Un curso planeado que no se da es un hueco en el programa que el cliente
  -- presentó a la STPS: sin motivo, nadie lo puede explicar después.
  constraint dnc_cancelada_con_motivo
    check (not cancelada or (motivo_cancelacion is not null and length(btrim(motivo_cancelacion)) > 0))
);

comment on table public.dnc is
  'Programa anual de capacitación por cliente. «Impartido» se deriva de las sesiones que lo citan; cancelar exige motivo.';


-- ============================================================================
-- §3 · `sesiones` — un curso impartido
-- ============================================================================

create table public.sesiones (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizaciones(id) on delete cascade,
  curso_id           uuid not null references public.cursos(id) on delete restrict,
  dnc_id             uuid references public.dnc(id) on delete set null,
  -- Quién la imparte y expide los DC-3. Nullable: una sesión se programa antes
  -- de contratar al proveedor. La solicitud de DC-3 sí lo exige, en pantalla.
  proveedor_id       uuid references public.proveedores_capacitacion(id) on delete restrict,
  -- ⚠️ **Texto, no un usuario**: el instructor es del proveedor, no de la firma
  -- (respuesta 1 de Summit).
  instructor         text,
  fecha_inicio       date not null,
  fecha_fin          date not null,
  duracion_horas     numeric(6,2) check (duracion_horas is null or duracion_horas > 0),
  sede               text,
  sitio_id           uuid references public.sitios(id) on delete set null,
  estado             text not null default 'programada'
                     check (estado in ('programada','impartida','cancelada')),
  motivo_cancelacion text,
  notas              text,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  creado_por         uuid references public.usuarios(id),
  -- ⚠️ El DC-3 lleva el periodo de ejecución. Un fin antes del inicio es una
  -- constancia que el proveedor devolvería.
  constraint sesiones_periodo_check check (fecha_fin >= fecha_inicio),
  constraint sesiones_cancelada_con_motivo
    check (estado <> 'cancelada' or (motivo_cancelacion is not null and length(btrim(motivo_cancelacion)) > 0))
);

comment on table public.sesiones is
  'Un curso impartido a un cliente por un proveedor externo. El instructor es texto: es del proveedor, no de la firma.';


-- ============================================================================
-- §4 · `asistentes` — quién tomó el curso, y su DC-3
--
-- ⚠️ **El DC-3 se REGISTRA, no se genera** (respuesta 4). `folio_dc3` y
-- `dc3_recibido_en` los captura la firma cuando el proveedor manda la
-- constancia; el PDF es un adjunto (`adjuntos.asistente_id`).
--
-- ⚠️ **La CURP es un dato personal** (docs/08 §7): se guarda porque el DC-3 la
-- lleva y el proveedor la pide, no «por si acaso». La pantalla lo advierte al
-- capturarla.
-- ============================================================================

create table public.asistentes (
  id              uuid primary key default gen_random_uuid(),
  -- La pone `heredar_org_de_la_sesion()`; el cliente no la manda.
  org_id          uuid not null references public.organizaciones(id) on delete cascade,
  sesion_id       uuid not null references public.sesiones(id) on delete cascade,
  nombre          text not null check (length(btrim(nombre)) > 0),
  -- ⚠️ El formato de RENAPO: cuatro letras, fecha, sexo, estado, tres
  -- consonantes, homoclave y dígito. Una CURP mal escrita es un DC-3 que el
  -- proveedor devuelve una semana después; aquí se rechaza al capturarla.
  curp            text check (curp is null or curp ~ '^[A-Z]{4}[0-9]{6}[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9][0-9]$'),
  puesto          text,
  -- La ocupación específica que pide el DC-3. Texto: el catálogo de la STPS
  -- ya no hace falta, lo aplica el proveedor.
  ocupacion       text,
  asistio         boolean not null default true,
  -- ⚠️ **La CAPTURA el instructor**, no la calcula la app: el examen tiene
  -- preguntas abiertas (`SGI-F-RH-06`).
  calificacion    numeric(5,2) check (calificacion is null or calificacion between 0 and 100),
  folio_dc3       text,
  dc3_recibido_en date,
  notas           text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  creado_por      uuid references public.usuarios(id),
  -- Quien no asistió no tiene constancia.
  constraint asistentes_dc3_si_asistio check (folio_dc3 is null or asistio),
  -- Una fecha de recepción sin folio es un DC-3 que nadie puede buscar.
  constraint asistentes_recibido_con_folio check (dc3_recibido_en is null or folio_dc3 is not null)
);

comment on table public.asistentes is
  'Quién tomó una sesión, su calificación (la captura el instructor) y el DC-3 que expidió el proveedor: folio + fecha + PDF adjunto.';


-- ============================================================================
-- §5 · Herencias y validaciones
-- ============================================================================

create or replace function public.heredar_org_de_la_sesion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.sesiones where id = new.sesion_id;
  if v_org is null then
    raise exception 'La sesión % no existe', new.sesion_id using errcode = '23503';
  end if;
  new.org_id := v_org;
  return new;
end
$$;

-- ⚠️ **Todo lo que un renglón del programa o una sesión apunta tiene que ser de
-- SU organización y de SU partición**: el sitio, el renglón del programa, el
-- curso y el proveedor. Los dos catálogos no tienen `org_id`, así que lo que se
-- compara es la partición: un curso de pruebas colgado de un cliente real
-- mezclaría las dos carteras por la puerta de atrás.
create or replace function public.validar_capacitacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demo  boolean;
  v_otro  boolean;
  v_org   uuid;
  v_curso uuid;
begin
  select es_demo into v_demo from public.organizaciones where id = new.org_id;

  if new.sitio_id is not null then
    select org_id into v_org from public.sitios where id = new.sitio_id;
    if v_org is distinct from new.org_id then
      raise exception 'El sitio no pertenece a la organización' using errcode = '23514';
    end if;
  end if;

  select es_demo into v_otro from public.cursos where id = new.curso_id;
  if v_otro is distinct from v_demo then
    raise exception 'El curso no es de la partición de la organización' using errcode = '23514';
  end if;

  if tg_table_name = 'sesiones' then
    if new.proveedor_id is not null then
      select es_demo into v_otro from public.proveedores_capacitacion where id = new.proveedor_id;
      if v_otro is distinct from v_demo then
        raise exception 'El proveedor no es de la partición de la organización' using errcode = '23514';
      end if;
    end if;

    -- La sesión que cumple un renglón del programa es de ese cliente y de ese
    -- curso: si no, «impartido» se pintaría en el renglón equivocado.
    if new.dnc_id is not null then
      select org_id, curso_id into v_org, v_curso from public.dnc where id = new.dnc_id;
      if v_org is distinct from new.org_id then
        raise exception 'El renglón del programa no pertenece a la organización' using errcode = '23514';
      end if;
      if v_curso is distinct from new.curso_id then
        raise exception 'La sesión no es del curso que el programa planeó' using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end
$$;

-- Un curso cita una NOM de SU partición.
create or replace function public.validar_curso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demo boolean;
begin
  if new.nom_id is not null then
    select es_demo into v_demo from public.noms where id = new.nom_id;
    if v_demo is distinct from new.es_demo then
      raise exception 'La NOM no es de la partición del curso' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;


-- ============================================================================
-- §6 · `adjuntos.sesion_id` y `adjuntos.asistente_id`
--
-- La foto de la sesión y la lista de asistencia firmada, y **el PDF del DC-3**
-- de cada asistente. ⚠️ El orden: … → obligación → **asistente → sesión** →
-- documento. El asistente antes que la sesión porque cuelga de ella.
-- `CAMPOS_DOMINANTES` lleva el mismo orden.
-- ============================================================================

alter table public.adjuntos
  add column sesion_id    uuid references public.sesiones(id)   on delete cascade,
  add column asistente_id uuid references public.asistentes(id) on delete cascade;

comment on column public.adjuntos.asistente_id is
  'El PDF del DC-3 que expidió el proveedor. Campo dominante entre obligacion_id y sesion_id.';
comment on column public.adjuntos.sesion_id is
  'Evidencia de la sesión: fotos, lista de asistencia firmada. Campo dominante entre asistente_id y documento_id.';

create index adjuntos_sesion_idx    on public.adjuntos (sesion_id)    where sesion_id    is not null;
create index adjuntos_asistente_idx on public.adjuntos (asistente_id) where asistente_id is not null;

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
  elsif new.asistente_id is not null then
    select org_id into v_org from public.asistentes where id = new.asistente_id;
    if v_org is null then
      raise exception 'El asistente % no existe', new.asistente_id using errcode = '23503';
    end if;
  elsif new.sesion_id is not null then
    select org_id into v_org from public.sesiones where id = new.sesion_id;
    if v_org is null then
      raise exception 'La sesión % no existe', new.sesion_id using errcode = '23503';
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
-- §7 · `puedo_borrar_org()` — una sesión impartida es evidencia
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
     and not exists (select 1 from public.sesiones      where org_id = p_org
                                                          and estado = 'impartida')
$$;

comment on function public.puedo_borrar_org is
  'Socio de su partición, y sin documentos, auditorías, hallazgos, acciones, quejas, obligaciones evaluadas, vencimientos ni sesiones impartidas.';


-- ============================================================================
-- §8 · ÍNDICES, TRIGGERS Y RLS
-- ============================================================================

create index proveedores_cap_particion_idx on public.proveedores_capacitacion (es_demo);
create index cursos_particion_idx          on public.cursos (es_demo);
create index dnc_org_idx                   on public.dnc (org_id, anio, mes);
create index sesiones_org_idx              on public.sesiones (org_id, fecha_inicio desc);
create index sesiones_dnc_idx              on public.sesiones (dnc_id) where dnc_id is not null;
create index asistentes_sesion_idx         on public.asistentes (sesion_id);
create index asistentes_org_idx            on public.asistentes (org_id);

-- actualizado_en
create trigger proveedores_capacitacion_actualizado_en before update on public.proveedores_capacitacion
  for each row execute function public.tocar_actualizado_en();
create trigger cursos_actualizado_en     before update on public.cursos
  for each row execute function public.tocar_actualizado_en();
create trigger dnc_actualizado_en        before update on public.dnc
  for each row execute function public.tocar_actualizado_en();
create trigger sesiones_actualizado_en   before update on public.sesiones
  for each row execute function public.tocar_actualizado_en();
create trigger asistentes_actualizado_en before update on public.asistentes
  for each row execute function public.tocar_actualizado_en();

-- partición de la biblioteca. ⚠️ Orden alfabético de los BEFORE: en `cursos`,
-- `cursos_particion` sella `es_demo` antes de que `cursos_valida` lo compare.
create trigger proveedores_capacitacion_particion before insert or update on public.proveedores_capacitacion
  for each row execute function public.sellar_particion();
create trigger cursos_particion before insert or update on public.cursos
  for each row execute function public.sellar_particion();
create trigger cursos_valida before insert or update on public.cursos
  for each row execute function public.validar_curso();

-- herencia y validación
create trigger asistentes_org before insert or update on public.asistentes
  for each row execute function public.heredar_org_de_la_sesion();
create trigger dnc_valida before insert or update on public.dnc
  for each row execute function public.validar_capacitacion();
create trigger sesiones_valida before insert or update on public.sesiones
  for each row execute function public.validar_capacitacion();

-- bitácora
create trigger proveedores_capacitacion_bitacora after insert or update or delete on public.proveedores_capacitacion
  for each row execute function public.registrar_bitacora();
create trigger cursos_bitacora after insert or update or delete on public.cursos
  for each row execute function public.registrar_bitacora();
create trigger dnc_bitacora after insert or update or delete on public.dnc
  for each row execute function public.registrar_bitacora();
create trigger sesiones_bitacora after insert or update or delete on public.sesiones
  for each row execute function public.registrar_bitacora();
create trigger asistentes_bitacora after insert or update or delete on public.asistentes
  for each row execute function public.registrar_bitacora();

-- RLS
alter table public.proveedores_capacitacion enable row level security;
alter table public.cursos                   enable row level security;
alter table public.dnc                      enable row level security;
alter table public.sesiones                 enable row level security;
alter table public.asistentes               enable row level security;

-- La biblioteca: la lee cualquiera DE SU LADO, la escribe el socio, no se borra.
create policy "proveedores_capacitacion_select" on public.proveedores_capacitacion for select to authenticated
  using (es_demo = public.soy_dev());
create policy "proveedores_capacitacion_insert" on public.proveedores_capacitacion for insert to authenticated
  with check (public.es_socio());
create policy "proveedores_capacitacion_update" on public.proveedores_capacitacion for update to authenticated
  using      (public.es_socio() and es_demo = public.soy_dev())
  with check (public.es_socio() and es_demo = public.soy_dev());

create policy "cursos_select" on public.cursos for select to authenticated
  using (es_demo = public.soy_dev());
create policy "cursos_insert" on public.cursos for insert to authenticated
  with check (public.es_socio());
create policy "cursos_update" on public.cursos for update to authenticated
  using      (public.es_socio() and es_demo = public.soy_dev())
  with check (public.es_socio() and es_demo = public.soy_dev());

-- ⚠️ Las tres de dominio: `mis_organizaciones()` A SECAS (regla 1 · A10).
create policy "dnc_select" on public.dnc for select to authenticated
  using (org_id in (select public.mis_organizaciones()));
create policy "dnc_insert" on public.dnc for insert to authenticated
  with check (public.puedo_editar_org(org_id));
create policy "dnc_update" on public.dnc for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));
-- Un renglón que ya tiene sesión se cancela, no se quita: es lo que se planeó.
create policy "dnc_delete" on public.dnc for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and not exists (select 1 from public.sesiones s where s.dnc_id = dnc.id));

create policy "sesiones_select" on public.sesiones for select to authenticated
  using (org_id in (select public.mis_organizaciones()));
create policy "sesiones_insert" on public.sesiones for insert to authenticated
  with check (public.puedo_editar_org(org_id));
create policy "sesiones_update" on public.sesiones for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));
-- ⚠️ Sólo una capturada por error: sin impartir, sin asistentes y sin
-- evidencia. El cascade de `asistentes` y `adjuntos` se saltaría el RLS.
create policy "sesiones_delete" on public.sesiones for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and estado <> 'impartida'
     and not exists (select 1 from public.asistentes a where a.sesion_id = sesiones.id)
     and not exists (select 1 from public.adjuntos  j where j.sesion_id = sesiones.id));

create policy "asistentes_select" on public.asistentes for select to authenticated
  using (org_id in (select public.mis_organizaciones()));
create policy "asistentes_insert" on public.asistentes for insert to authenticated
  with check (public.puedo_editar_org(org_id));
create policy "asistentes_update" on public.asistentes for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));
-- Un asistente capturado por error se quita; uno con su DC-3 registrado, no.
create policy "asistentes_delete" on public.asistentes for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and folio_dc3 is null
     and not exists (select 1 from public.adjuntos j where j.asistente_id = asistentes.id));
