-- ============================================================================
-- F00·B5 — Esquema base y bitácora   ·   MIGRACIÓN 1
--
-- Las seis tablas de las que cuelga todo lo demás (docs/04_MODELO_DE_DATOS.md,
-- Fase 00), con su RLS, sus índices y el trigger genérico de bitácora en el
-- MISMO archivo — nunca la tabla en una migración y sus políticas en otra:
-- entre las dos hay una ventana con la tabla abierta.
--
-- El eje de la multi-tenencia (docs/08_SEGURIDAD_Y_RLS.md §2):
--
--     auth.uid() → usuarios_organizaciones → mis_organizaciones()
--                → POLICY ... USING (org_id IN (SELECT mis_organizaciones()))
--
-- ⚠️ Convenciones que NO se rompen:
--   · Catálogos con `text` + CHECK, cero enums de dominio (§4.2).
--   · Toda función SECURITY DEFINER lleva `SET search_path = public`.
--   · Los UPDATE llevan USING **y** WITH CHECK: sin WITH CHECK, un consultor
--     puede cambiarle el `org_id` a una fila y mandarla a otro expediente.
--   · Ninguna política sin `TO authenticated`: sin rol explícito aplica también
--     a `anon`, que es quien abre el portal público.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ============================================================================
-- §1 · TABLAS
-- ============================================================================

-- ---------------------------------------------------------------- usuarios --
-- Espeja `auth.users`. El perfil y el ROL viven aquí.
--
-- ⚠️ Esta tabla NO lleva `org_id` a propósito: un consultor sirve a varias
-- organizaciones. El vínculo es `usuarios_organizaciones`.
create table public.usuarios (
  id               uuid primary key references auth.users(id) on delete cascade,
  nombre           text not null,
  correo           text not null,
  telefono         text,
  rol              text not null default 'cliente'
                   check (rol in ('socio','consultor','auditor','administracion','cliente')),
  -- Se imprimen en el informe de auditoría: "Auditor líder ISO 9001".
  certificaciones  text[] not null default '{}',
  activo           boolean not null default true,
  avatar_url       text,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

comment on table public.usuarios is
  'Perfil y rol de cada cuenta. El rol sólo lo cambia un socio (trigger proteger_rol_usuario).';

-- --------------------------------------------------------- organizaciones --
-- La raíz de la multi-tenencia. Todo cuelga de aquí.
create table public.organizaciones (
  id                uuid primary key default gen_random_uuid(),
  razon_social      text not null,
  nombre_comercial  text,                        -- cómo se le dice en la firma
  rfc               text,
  giro              text,                        -- manufactura, salud, construcción…
  tamano            text check (tamano in ('micro','pequena','mediana','grande')),
  logotipo_url      text,
  estado            text not null default 'prospecto'
                    check (estado in ('prospecto','activo','pausado','cerrado')),
  notas             text,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  creado_por        uuid references public.usuarios(id)
);

-- ------------------------------------------- usuarios_organizaciones (RLS) --
-- **La tabla de la que cuelga todo el RLS del proyecto**: qué consultor ve qué
-- cliente. Si una fila de aquí desaparece, esa persona deja de ver esa
-- organización en toda la aplicación, incluido el buscador global.
create table public.usuarios_organizaciones (
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  org_id      uuid not null references public.organizaciones(id) on delete cascade,
  papel       text not null default 'apoyo'
              check (papel in ('lider','apoyo','auditor','lectura')),
  creado_en   timestamptz not null default now(),
  creado_por  uuid references public.usuarios(id),
  primary key (usuario_id, org_id)
);

-- ------------------------------------------------------------ config_firma --
-- Fila única, impuesta por el CHECK. Datos de Summit-Sphere y qué módulos están
-- encendidos.
--
-- ⚠️ La lee CUALQUIERA con sesión: aquí no va ninguna contraseña. Las
-- credenciales del PAC viven en `fiscal_credenciales` [Fase 06], con RLS activa
-- y cero políticas a propósito.
create table public.config_firma (
  id               int primary key default 1 check (id = 1),
  razon_social     text not null default 'Summit-Sphere',
  rfc              text,
  direccion        text,
  telefono         text,
  correo           text,
  logotipo_url     text,
  -- Los módulos OPCIONALES que están encendidos. Vacío = los cuatro apagados
  -- de fábrica (facturacion · asistente · automatizacion · comercializadora).
  -- Se enciende con una casilla en /admin?tab=config, no con un deploy.
  modulos_activos  text[] not null default '{}',
  plantillas       jsonb not null default '{}'::jsonb,
  plazos_default   jsonb not null default '{}'::jsonb,
  actualizado_en   timestamptz not null default now(),
  actualizado_por  uuid references public.usuarios(id)
);

-- --------------------------------------------------------------- audit_logs --
-- INMUTABLE. Sin políticas de UPDATE ni DELETE, y con un trigger que además
-- se lo impide al `service_role` (ver §3).
--
-- ⚠️ Sin claves foráneas a propósito. Un registro de bitácora NUNCA debe fallar
-- al escribirse: si el usuario o la organización ya no existieran, la FK
-- abortaría la operación que se estaba auditando.
create table public.audit_logs (
  id           bigint generated always as identity primary key,
  tabla        text not null,
  registro_id  text,
  operacion    text not null
               check (operacion in ('INSERT','UPDATE','DELETE','inicio_sesion')),
  usuario_id   uuid,
  org_id       uuid,
  antes        jsonb,
  despues      jsonb,
  contexto     text,
  creado_en    timestamptz not null default now()
);

comment on table public.audit_logs is
  'Bitácora inmutable. En una firma de auditoría no es higiene: es el producto.';

-- ----------------------------------------------------------- notificaciones --
create table public.notificaciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  org_id      uuid not null references public.organizaciones(id) on delete cascade,
  categoria   text not null check (categoria in (
                'hallazgo_asignado','accion_por_vencer','accion_vencida',
                'documento_por_aprobar','obligacion_proxima','resumen_diario',
                'evidencia_evaluada')),
  titulo      text not null,
  cuerpo      text,
  enlace      text,
  leida_en    timestamptz,
  creado_en   timestamptz not null default now()
);

-- ============================================================================
-- §2 · ÍNDICES
-- Todo filtra por organización, siempre.
-- ============================================================================

create index usuarios_organizaciones_org_idx on public.usuarios_organizaciones (org_id);
create index organizaciones_estado_idx       on public.organizaciones (estado);
create index notificaciones_usuario_idx      on public.notificaciones (usuario_id, leida_en);
create index notificaciones_org_idx          on public.notificaciones (org_id);
create index audit_logs_registro_idx         on public.audit_logs (tabla, registro_id);
create index audit_logs_org_idx              on public.audit_logs (org_id, creado_en desc);
create index audit_logs_usuario_idx          on public.audit_logs (usuario_id, creado_en desc);

-- ============================================================================
-- §3 · FUNCIONES
-- ============================================================================

-- Qué organizaciones puede ver quien pregunta.
--
-- ⚠️ SECURITY DEFINER a propósito: se sale del RLS UNA SOLA VEZ y en un lugar
-- auditado. Si la política de `usuarios_organizaciones` consultara
-- `usuarios_organizaciones` bajo RLS, Postgres devolvería
-- "infinite recursion detected in policy".
--
-- ⚠️ STABLE, no VOLATILE: sin eso se evalúa una vez POR FILA y una lista de 500
-- hallazgos hace 500 consultas.
create or replace function public.mis_organizaciones()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.usuarios_organizaciones where usuario_id = auth.uid()
$$;

-- El socio ve toda la cartera — por una rama EXPLÍCITA de cada política, nunca
-- por ausencia de política.
create or replace function public.es_socio()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios where id = auth.uid() and rol = 'socio' and activo
  )
$$;

-- `actualizado_en` sin depender de que nadie se acuerde de mandarlo.
create or replace function public.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en := now();
  return new;
end
$$;

-- El trigger genérico de bitácora. Se engancha a cada tabla de dominio a medida
-- que aparece (docs/03_ARQUITECTURA.md §8.4).
create or replace function public.registrar_bitacora()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes    jsonb;
  v_despues  jsonb;
  v_fila     jsonb;
  v_org      uuid;
  v_registro text;
begin
  if tg_op <> 'INSERT' then v_antes   := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_despues := to_jsonb(new); end if;

  v_fila     := coalesce(v_despues, v_antes);
  v_registro := v_fila ->> 'id';

  -- La organización sale de la propia fila. Las tablas sin `org_id` —usuarios,
  -- config_firma— dejan la columna en null y entonces sólo el socio ve el
  -- registro en /admin?tab=bitacora.
  v_org := nullif(v_fila ->> 'org_id', '')::uuid;
  if tg_table_name = 'organizaciones' then
    v_org := v_registro::uuid;
  end if;

  insert into public.audit_logs
    (tabla, registro_id, operacion, usuario_id, org_id, antes, despues, contexto)
  values
    (tg_table_name, v_registro, tg_op, auth.uid(), v_org, v_antes, v_despues,
     nullif(current_setting('app.contexto', true), ''));

  return coalesce(new, old);
end
$$;

-- La inmutabilidad de la bitácora, de verdad.
--
-- ⚠️ Las políticas de RLS no bastan: el `service_role` se las salta todas. Este
-- trigger corre para TODOS —incluida la ruta de API con service_role— y es lo
-- que hace verdadera la frase "no se puede borrar ni con el service role desde
-- la app" del criterio de cierre de la Fase 00.
create or replace function public.impedir_cambios_bitacora()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit_logs es inmutable: un registro de bitácora no se actualiza ni se borra'
    using errcode = '42501';
end
$$;

-- Nadie se asciende solo.
--
-- RLS no sabe de columnas: la política de UPDATE de `usuarios` deja a cada quien
-- editar SU fila, y sin esto "su fila" incluye la columna `rol`. Cualquiera con
-- sesión se pondría `socio` y vería la cartera entera.
create or replace function public.proteger_rol_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol_jwt text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  if new.rol is distinct from old.rol or new.activo is distinct from old.activo then
    -- 'authenticated' es una persona con sesión, y tiene que ser socio.
    -- El `service_role` (el alta de usuarios de /api/users) y las conexiones
    -- directas sin JWT (migraciones, respaldos) pasan.
    if v_rol_jwt = 'authenticated' and not public.es_socio() then
      raise exception 'Sólo un socio puede cambiar el rol o el estado de un usuario'
        using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;

-- Espejo de `auth.users` → `public.usuarios`.
--
-- ⚠️ El rol SIEMPRE nace en 'cliente', el de menos privilegio, y NUNCA se lee de
-- `raw_user_meta_data`: esa columna la puede escribir el propio usuario, así que
-- tomar el rol de ahí sería regalar `socio` a quien lo pida. Lo asciende un
-- socio desde /admin?tab=usuarios [Fase 06].
create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nombre, correo, rol)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''),
             split_part(coalesce(new.email, ''), '@', 1),
             'Sin nombre'),
    coalesce(new.email, new.id::text),
    'cliente'
  )
  on conflict (id) do nothing;
  return new;
end
$$;

-- El inicio de sesión también se registra. Lo llama /login al entrar.
create or replace function public.registrar_inicio_sesion()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.audit_logs (tabla, registro_id, operacion, usuario_id, contexto)
  values ('auth', auth.uid()::text, 'inicio_sesion', auth.uid(), 'Inicio de sesión');
end
$$;

revoke all on function public.registrar_inicio_sesion() from public;
grant execute on function public.registrar_inicio_sesion() to authenticated;

-- ============================================================================
-- §4 · TRIGGERS
-- ============================================================================

create trigger usuarios_actualizado_en
  before update on public.usuarios
  for each row execute function public.tocar_actualizado_en();

create trigger organizaciones_actualizado_en
  before update on public.organizaciones
  for each row execute function public.tocar_actualizado_en();

create trigger config_firma_actualizado_en
  before update on public.config_firma
  for each row execute function public.tocar_actualizado_en();

create trigger usuarios_proteger_rol
  before update on public.usuarios
  for each row execute function public.proteger_rol_usuario();

create trigger bitacora_inmutable
  before update or delete on public.audit_logs
  for each row execute function public.impedir_cambios_bitacora();

create trigger crear_perfil_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_usuario();

-- La bitácora se engancha a las tablas de dominio. `notificaciones` queda
-- fuera a propósito: es ruido generado por el sistema, no un acto de nadie.
create trigger organizaciones_bitacora
  after insert or update or delete on public.organizaciones
  for each row execute function public.registrar_bitacora();

create trigger usuarios_bitacora
  after insert or update or delete on public.usuarios
  for each row execute function public.registrar_bitacora();

create trigger usuarios_organizaciones_bitacora
  after insert or update or delete on public.usuarios_organizaciones
  for each row execute function public.registrar_bitacora();

create trigger config_firma_bitacora
  after insert or update or delete on public.config_firma
  for each row execute function public.registrar_bitacora();

-- ============================================================================
-- §5 · RLS
-- ============================================================================

alter table public.usuarios                enable row level security;
alter table public.organizaciones          enable row level security;
alter table public.usuarios_organizaciones enable row level security;
alter table public.config_firma            enable row level security;
alter table public.audit_logs              enable row level security;
alter table public.notificaciones          enable row level security;

-- ---------------------------------------------------------------- usuarios --
-- Cada quien se ve a sí mismo; el socio ve a todos; y los demás se ven entre sí
-- SÓLO si comparten una organización asignada — hace falta para poder elegir al
-- auditor de una auditoría sin enseñar la plantilla entera de la firma.
create policy "usuarios_select" on public.usuarios for select to authenticated
  using (
    id = auth.uid()
    or public.es_socio()
    or exists (
      select 1 from public.usuarios_organizaciones uo
       where uo.usuario_id = public.usuarios.id
         and uo.org_id in (select public.mis_organizaciones())
    )
  );

-- Sin INSERT: las filas las crea el trigger `crear_perfil_usuario`.
-- Sin DELETE: un usuario se desactiva (`activo = false`), no se borra.
create policy "usuarios_update" on public.usuarios for update to authenticated
  using      (id = auth.uid() or public.es_socio())
  with check (id = auth.uid() or public.es_socio());

-- --------------------------------------------------------- organizaciones --
create policy "organizaciones_select" on public.organizaciones for select to authenticated
  using (id in (select public.mis_organizaciones()) or public.es_socio());

-- Sólo el socio da de alta una organización: quien no lo es no puede satisfacer
-- `id IN (SELECT mis_organizaciones())` para un id que todavía no existe, así
-- que la rama honesta es ésta. El reparto por `papel` llega en la Fase 01.
create policy "organizaciones_insert" on public.organizaciones for insert to authenticated
  with check (public.es_socio());

create policy "organizaciones_update" on public.organizaciones for update to authenticated
  using      (id in (select public.mis_organizaciones()) or public.es_socio())
  with check (id in (select public.mis_organizaciones()) or public.es_socio());

-- Sin DELETE: una organización se cierra (`estado = 'cerrado'`).

-- ------------------------------------------------- usuarios_organizaciones --
create policy "usuarios_organizaciones_select" on public.usuarios_organizaciones
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.es_socio()
    or org_id in (select public.mis_organizaciones())
  );

-- Quién ve a qué cliente es decisión del socio, y sólo suya.
create policy "usuarios_organizaciones_insert" on public.usuarios_organizaciones
  for insert to authenticated with check (public.es_socio());

create policy "usuarios_organizaciones_update" on public.usuarios_organizaciones
  for update to authenticated
  using (public.es_socio()) with check (public.es_socio());

-- La única tabla de la Fase 00 con DELETE: retirar a alguien de un cliente es
-- una operación legítima y frecuente, y la bitácora conserva quién lo hizo.
create policy "usuarios_organizaciones_delete" on public.usuarios_organizaciones
  for delete to authenticated using (public.es_socio());

-- ------------------------------------------------------------ config_firma --
create policy "config_firma_select" on public.config_firma for select to authenticated
  using (true);

create policy "config_firma_update" on public.config_firma for update to authenticated
  using (public.es_socio()) with check (public.es_socio());

-- --------------------------------------------------------------- audit_logs --
-- Se lee filtrada por organización; lo que no cuelga de ninguna —usuarios,
-- config_firma, inicios de sesión— sólo lo ve el socio.
create policy "audit_logs_select" on public.audit_logs for select to authenticated
  using (public.es_socio() or org_id in (select public.mis_organizaciones()));

-- Sin INSERT: escribe el trigger `registrar_bitacora`, que es SECURITY DEFINER.
-- Sin UPDATE ni DELETE: NUNCA. Ver `impedir_cambios_bitacora`.
revoke update, delete on public.audit_logs from anon, authenticated, service_role;

-- ----------------------------------------------------------- notificaciones --
create policy "notificaciones_select" on public.notificaciones for select to authenticated
  using (usuario_id = auth.uid());

-- Marcar como leída. Las crea el cron con `service_role`, por eso no hay INSERT.
create policy "notificaciones_update" on public.notificaciones for update to authenticated
  using      (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- ============================================================================
-- §6 · SEMILLA
-- ============================================================================

insert into public.config_firma (id, razon_social)
values (1, 'Summit-Sphere')
on conflict (id) do nothing;

-- Espejo de las cuentas que ya existían antes de que existiera el trigger.
insert into public.usuarios (id, nombre, correo, rol)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'nombre', ''),
           split_part(coalesce(u.email, ''), '@', 1),
           'Sin nombre'),
  coalesce(u.email, u.id::text),
  'cliente'
from auth.users u
on conflict (id) do nothing;

-- Arranque del primer socio.
--
-- ⚠️ Corre UNA sola vez y sólo si todavía no hay ningún socio: la cuenta más
-- antigua de `auth.users` es la que el dueño creó al montar el proyecto. Sin
-- esto no habría nadie que pudiera ascender a nadie —el rol lo cambia un socio,
-- y no habría ninguno— y la aplicación quedaría cerrada para todos.
--
-- ⚠️ VERIFÍCALO: si la cuenta más antigua no es la del dueño, corrígelo
-- (docs/09_TAREAS_DEL_DUENO.md · A04).
update public.usuarios
   set rol = 'socio'
 where id = (select id from auth.users order by created_at limit 1)
   and not exists (select 1 from public.usuarios where rol = 'socio');
