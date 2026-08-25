-- ============================================================================
-- FASE 03 · Auditorías — el esquema completo
--
-- El núcleo del producto: la fase que justifica que esto sea una PWA offline y
-- no una hoja de cálculo compartida. Lo que entra:
--
--   §1 · Funciones auxiliares (herencia de org, guardas, sellos, folios)
--   §2 · programa_auditorias                                      [F03·B1]
--   §3 · auditorias + auditoria_normas · _sitios · _procesos      [F03·B1]
--   §4 · auditoria_equipo · auditoria_agenda                      [F03·B1]
--   §5 · auditoria_items — la lista de verificación               [F03·B2]
--   §6 · hallazgos · hallazgos_historial                          [F03·B4]
--   §7 · `adjuntos` aprende `hallazgo_id`                         [F03·B3]
--   §8 · generar_lista_verificacion()                             [F03·B2]
--   §9 · Índices
--   §10 · Triggers
--   §11 · RLS
--   §12 · Ampliación de `puedo_borrar_org` y `puedo_borrar_proyecto`
--
-- ⚠️ **Va DESPUÉS de `20260822120000_sistemas_de_gestion.sql`.** Amplía
-- `puedo_borrar_org()`, `puedo_borrar_proyecto()` y `heredar_org_del_adjunto()`,
-- y añade la columna `hallazgo_id` a `adjuntos` — las cuatro nacen ahí.
--
-- ⚠️ Convenciones de siempre: `org_id NOT NULL` + RLS + políticas
-- `TO authenticated`, catálogos `text` + CHECK (nunca enum), UPDATE con USING y
-- WITH CHECK, y nada de `fecha::text` en columnas generadas ni en índices.
--
-- ══════════════════════════════════════════════════════════════════════════
-- ⚠️ LA REGLA QUE MANDA EN ESTE ARCHIVO, Y NO ES LA DE SIEMPRE
--
-- En las fases 01 y 02, **la base sella las fechas**: una fecha que viaja desde
-- el navegador es una fecha que se puede escribir a mano (`sellar_tarea_hecha`,
-- `sellar_version_documento`). Aquí eso deja de valer para una mitad del
-- dominio, y hay que decir por qué antes de que alguien lo «arregle».
--
-- Un auditor evalúa un ítem a las 10:15 **en modo avión** y la fila llega al
-- servidor a las 14:00, al salir de la planta. Un `now()` del servidor pondría
-- las 14:00 en el informe: la hora en que el semáforo cambió, no la hora en que
-- se vio el extintor descargado. En un informe de auditoría eso no es un detalle
-- cosmético — es la trazabilidad de la observación.
--
-- La línea, y es limpia:
--
--   • **QUIÉN lo sella SIEMPRE la base** (`auth.uid()`). Eso no se falsifica
--     nunca, ni en campo ni en oficina.
--   • **CUÁNDO, depende de dónde pasó la cosa.** Acción de CAMPO —evaluar un
--     ítem, levantar un hallazgo— la manda el reloj del teléfono
--     (`evaluado_en`, `detectado_en`). Acción de OFICINA —aprobar el programa,
--     cerrar un hallazgo, cerrar la auditoría— la sella el servidor.
--   • Y **no se pierde nada**: `creado_en` y `actualizado_en` siguen siendo del
--     servidor. Si el reloj del teléfono estaba mal, las dos fechas discrepan y
--     se ve.
-- ══════════════════════════════════════════════════════════════════════════
-- ============================================================================


-- ============================================================================
-- §1 · FUNCIONES AUXILIARES
-- ============================================================================

-- La `org_id` de lo que cuelga de una AUDITORÍA se hereda de la auditoría.
--
-- Mismo razonamiento que `heredar_org_del_proyecto()` y `heredar_org_del_
-- documento()`: `WITH CHECK` sólo comprueba que la organización sea **una de las
-- tuyas**, no que sea **la de la auditoría**. Un auditor con dos clientes
-- asignados podría colgar un hallazgo del expediente del otro sin violar
-- ninguna política.
create or replace function public.heredar_org_de_la_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.auditorias where id = new.auditoria_id;

  if v_org is null then
    raise exception 'La auditoría % no existe', new.auditoria_id
      using errcode = '23503';
  end if;

  new.org_id := v_org;
  return new;
end
$$;

-- Igual, para el historial de un hallazgo.
create or replace function public.heredar_org_del_hallazgo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.hallazgos where id = new.hallazgo_id;

  if v_org is null then
    raise exception 'El hallazgo % no existe', new.hallazgo_id
      using errcode = '23503';
  end if;

  new.org_id := v_org;
  return new;
end
$$;

-- Lo que una auditoría referencia tiene que ser **del mismo cliente**.
--
-- Es la misma guarda que `validar_sitio_del_proyecto()` y
-- `validar_contacto_de_la_org()`, y por el mismo motivo: no lo puede impedir una
-- clave foránea —las tablas apuntan a `sitios`, a `procesos` y a
-- `organizaciones` por separado— ni un CHECK, que no puede mirar otra tabla.
--
-- Una sola función para las tres: mira la columna que traiga la fila.
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

  return new;
end
$$;

comment on function public.validar_referencia_de_la_org is
  'Guarda de multi-tenencia: el sitio, el proceso o el contacto que referencia una fila tiene que ser del mismo cliente.';

-- El proyecto y el programa de una auditoría también son del mismo cliente.
create or replace function public.validar_contexto_de_la_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if new.proyecto_id is not null then
    select org_id into v_org from public.proyectos where id = new.proyecto_id;
    if v_org is distinct from new.org_id then
      raise exception 'Ese proyecto no pertenece a esta organización' using errcode = '23514';
    end if;
  end if;

  if new.programa_id is not null then
    select org_id into v_org from public.programa_auditorias where id = new.programa_id;
    if v_org is distinct from new.org_id then
      raise exception 'Ese programa no pertenece a esta organización' using errcode = '23514';
    end if;
  end if;

  return new;
end
$$;

-- ------------------------------------------------------------- los folios --

-- El folio de una auditoría lo asigna la BASE, y es consecutivo **de la firma**.
--
-- ⚠️ No lo puede calcular el navegador, y no por comodidad: con el RLS de este
-- proyecto un consultor sólo ve las auditorías de SUS clientes, así que contar
-- las que tiene en la caché daría un consecutivo que ya está usado en un
-- expediente que no puede mirar. `security definer` se sale del RLS a propósito,
-- una vez y en un sitio auditado — igual que `mis_organizaciones()`.
--
-- ⚠️ El `pg_advisory_xact_lock` serializa **sólo** la asignación de folio de ese
-- año. Sin él, dos altas simultáneas leen el mismo máximo, calculan el mismo
-- folio y la segunda muere contra el UNIQUE.
--
-- ⚠️ Un folio que ya viene puesto NO se recalcula: una vez impreso en un informe,
-- el folio de esa auditoría es el que es.
create or replace function public.asignar_folio_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anio        int;
  v_consecutivo int;
begin
  if new.folio is not null and btrim(new.folio) <> '' then
    return new;
  end if;

  -- ⚠️ `current_date` NO: la base corre en UTC y a las 19:00 de México ya es el
  -- día siguiente. Una auditoría de fin de año se iría al folio del siguiente.
  v_anio := extract(year from coalesce(
              new.fecha_inicio,
              (now() at time zone 'America/Mexico_City')::date))::int;

  perform pg_advisory_xact_lock(hashtext('folio_auditoria_' || v_anio::text));

  select coalesce(max((regexp_match(folio, '^AUD-[0-9]{4}-([0-9]+)$'))[1]::int), 0) + 1
    into v_consecutivo
    from public.auditorias
   where folio ~ ('^AUD-' || v_anio::text || '-[0-9]+$');

  new.folio := format('AUD-%s-%s', v_anio::text, lpad(v_consecutivo::text, 3, '0'));
  return new;
end
$$;

comment on function public.asignar_folio_auditoria is
  'AUD-2026-014. Consecutivo de la firma, no del cliente: se calcula fuera del RLS porque un consultor no ve las auditorías de los demás.';

-- El folio de un hallazgo se compone **sin red**: el folio de la auditoría, que
-- ya está en la caché del teléfono, más un consecutivo local.
--
-- ⚠️ **Y NO hay `unique (auditoria_id, consecutivo)`, a propósito.** Dos
-- auditores recorriendo la misma planta en modo avión levantan los dos un H-03;
-- ninguno puede ver el hallazgo del otro. Con un índice único, el segundo en
-- sincronizar recibiría un rechazo **media hora después y con nadie mirando**, y
-- ése es exactamente el hallazgo perdido que esta fase existe para impedir.
--
-- Lo que se hace en su lugar: si el consecutivo que trae el teléfono ya está
-- usado, la base **renumera** al llegar y recompone el folio. El auditor vio un
-- H-03 en el campo y en el informe sale un H-07. Un número corrido es un detalle
-- de edición; un hallazgo perdido no se recupera.
create or replace function public.sellar_folio_hallazgo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folio_auditoria text;
begin
  select folio into v_folio_auditoria from public.auditorias where id = new.auditoria_id;

  if v_folio_auditoria is null then
    raise exception 'La auditoría % no existe', new.auditoria_id using errcode = '23503';
  end if;

  perform pg_advisory_xact_lock(hashtext('folio_hallazgo_' || new.auditoria_id::text));

  if new.consecutivo is null or new.consecutivo < 1 or exists (
    select 1 from public.hallazgos
     where auditoria_id = new.auditoria_id
       and consecutivo  = new.consecutivo
  ) then
    select coalesce(max(consecutivo), 0) + 1
      into new.consecutivo
      from public.hallazgos
     where auditoria_id = new.auditoria_id;
  end if;

  new.folio := format('%s/H-%s', v_folio_auditoria, lpad(new.consecutivo::text, 2, '0'));
  return new;
end
$$;

comment on function public.sellar_folio_hallazgo is
  'AUD-2026-014/H-03. Renumera en vez de rechazar: dos auditores sin señal levantan el mismo consecutivo y ninguno puede perderse.';

-- ------------------------------------------------------------- los sellos --

-- Quién aprobó el programa anual y cuándo. Acción de OFICINA: la sella el
-- servidor (ver el encabezado de este archivo).
create or replace function public.sellar_programa_aprobado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'aprobado' and (tg_op = 'INSERT' or old.estado is distinct from 'aprobado') then
    new.aprobado_por_id := auth.uid();
    new.aprobado_en     := now();
  elsif new.estado <> 'aprobado' then
    -- Devolver el programa a borrador borra la firma: si no, quedaría diciendo
    -- que lo aprobó alguien que ya no lo tiene aprobado.
    new.aprobado_por_id := null;
    new.aprobado_en     := null;
  end if;

  return new;
end
$$;

-- Quién cerró la auditoría y cuándo. También de oficina.
create or replace function public.sellar_cierre_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'cerrada' and (tg_op = 'INSERT' or old.estado is distinct from 'cerrada') then
    new.cerrada_por_id := auth.uid();
    new.cerrada_en     := now();
  elsif new.estado <> 'cerrada' then
    new.cerrada_por_id := null;
    new.cerrada_en     := null;
  end if;

  return new;
end
$$;

-- Quién evaluó un ítem de la lista de verificación.
--
-- ⚠️ **El QUIÉN lo pone la base; el CUÁNDO lo manda el teléfono.** Es la regla
-- del encabezado: `evaluado_en` es el reloj del auditor porque el `now()` del
-- servidor sería la hora de recuperar la señal, no la del recorrido.
create or replace function public.sellar_evaluacion_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.veredicto <> 'pendiente'
     and (tg_op = 'INSERT' or old.veredicto is distinct from new.veredicto) then
    new.evaluado_por := auth.uid();
    -- Si el teléfono no mandó la hora del recorrido, se cae a la del servidor.
    -- Peor dato, pero mejor que ninguno.
    new.evaluado_en := coalesce(new.evaluado_en, now());
  elsif new.veredicto = 'pendiente' then
    new.evaluado_por := null;
    new.evaluado_en  := null;
  end if;

  return new;
end
$$;

-- Quién cerró un hallazgo y cuándo. De oficina: cerrar un hallazgo es un acto
-- administrativo, y su fecha es la que se le enseña al organismo certificador.
create or replace function public.sellar_cierre_hallazgo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado in ('cerrado','anulado')
     and (tg_op = 'INSERT' or old.estado is distinct from new.estado) then
    new.cerrado_por_id := auth.uid();
    new.cerrado_en     := now();
  elsif new.estado not in ('cerrado','anulado') then
    new.cerrado_por_id := null;
    new.cerrado_en     := null;
  end if;

  -- El motivo de anulación sólo tiene sentido mientras el hallazgo está anulado.
  if new.estado <> 'anulado' then
    new.motivo_anulacion := null;
  end if;

  return new;
end
$$;

-- **El historial de un hallazgo lo escribe la BASE, fila por fila.**
--
-- Esto es lo que un organismo certificador viene a revisar, y por eso no puede
-- depender de que la pantalla se acuerde de registrarlo. Una fila por campo que
-- cambió: qué decía antes, qué dice ahora, quién lo cambió y por qué.
--
-- ⚠️ `to_char()` y no `::text` para las fechas. `fecha::text` depende del
-- `DateStyle` de la sesión — es la misma trampa que revienta con 42P17 en un
-- índice de expresión, y aquí dejaría el historial escrito en dos formatos
-- distintos según quién hiciera el cambio.
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
      ('motivo_anulacion',        old.motivo_anulacion,                            new.motivo_anulacion)
    ) as c(campo, antes, despues)
   where c.antes is distinct from c.despues;

  return null;
end
$$;

comment on function public.registrar_historial_hallazgo is
  'Una fila de hallazgos_historial por cada campo que cambió. Lo escribe la base: el historial es el producto, no higiene.';


-- ============================================================================
-- §2 · PROGRAMA ANUAL DE AUDITORÍAS  [F03·B1]
-- ============================================================================

-- Qué se audita en el año, cuándo, con qué frecuencia y bajo qué criterio.
-- ISO 9001 §9.2.2 lo exige por escrito y aprobado.
--
-- ⚠️ **Sin `unique (org_id, anio)`, y es deliberado.** Un cliente certificado en
-- 9001 y en 45001 por organismos distintos lleva dos programas el mismo año. Un
-- índice único aquí rechazaría el segundo — y como toda escritura pasa por la
-- cola, el rechazo llegaría tarde y sin nadie mirando. Que no se dupliquen lo
-- resuelve la pantalla, que ya los enseña juntos.
create table public.programa_auditorias (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizaciones(id) on delete cascade,
  anio             int  not null check (anio between 2000 and 2100),
  nombre           text not null,
  objetivo         text,
  criterios        text,
  estado           text not null default 'borrador'
                   check (estado in ('borrador','aprobado','cerrado')),
  -- Los pone `sellar_programa_aprobado()`; el cliente no los manda.
  aprobado_por_id  uuid references public.usuarios(id),
  aprobado_en      timestamptz,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  creado_por       uuid references public.usuarios(id)
);

comment on table public.programa_auditorias is
  'El programa anual de auditorías de un cliente. ISO 9001 §9.2.2: por escrito, con objetivo, criterios y aprobación.';


-- ============================================================================
-- §3 · AUDITORÍAS Y SU ALCANCE  [F03·B1]
-- ============================================================================

-- La auditoría concreta.
--
-- ⚠️ **Cuelga de la organización, no del proyecto.** Igual que `documentos`: una
-- auditoría interna sobrevive al contrato que la pagó, y `proyecto_id` dice de
-- qué contrato salió. Por eso es ON DELETE SET NULL y no CASCADE — aunque desde
-- §12 un proyecto con auditorías ya no se pueda borrar, la asimetría se deja
-- escrita por si mañana se afloja.
create table public.auditorias (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizaciones(id) on delete cascade,
  programa_id         uuid references public.programa_auditorias(id) on delete set null,
  proyecto_id         uuid references public.proyectos(id)           on delete set null,
  -- Lo asigna `asignar_folio_auditoria()`. UNIQUE porque una auditoría se planea
  -- en la oficina, con señal — a diferencia del folio de un hallazgo (§1).
  folio               text unique,
  -- El folio identifica; el título es lo que se lee en una lista.
  titulo              text not null,
  tipo                text not null default 'interna'
                      check (tipo in ('interna','preauditoria','seguimiento',
                                      'certificacion_acompanamiento','proveedor')),
  estado              text not null default 'planeada'
                      check (estado in ('planeada','en_curso','cerrada','cancelada')),
  fecha_inicio        date,
  fecha_fin           date,
  auditor_lider_id    uuid references public.usuarios(id),
  alcance             text,
  criterios           text,
  metodologia         text,
  conclusiones        text,
  informe_emitido_en  timestamptz,
  -- Los pone `sellar_cierre_auditoria()`.
  cerrada_en          timestamptz,
  cerrada_por_id      uuid references public.usuarios(id),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  creado_por          uuid references public.usuarios(id),
  constraint auditorias_fechas_coherentes
    check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio)
);

comment on table public.auditorias is
  'La auditoría concreta, con su folio de la firma. No se borra: es evidencia (CLAUDE.md regla 13).';

-- ----------------------------------------------- el alcance, en tablas ------
-- De aquí sale la lista de verificación: `generar_lista_verificacion()` recorre
-- `auditoria_normas`. Con el alcance en un `text` habría que adivinarlo con un
-- LIKE — es la misma decisión que `proyecto_normas` en la Fase 01.
--
-- `org_id` lo pone `heredar_org_de_la_auditoria()`, no el cliente.
create table public.auditoria_normas (
  auditoria_id  uuid not null references public.auditorias(id) on delete cascade,
  norma_id      uuid not null references public.normas(id)     on delete restrict,
  org_id        uuid not null references public.organizaciones(id) on delete cascade,
  creado_en     timestamptz not null default now(),
  creado_por    uuid references public.usuarios(id),
  primary key (auditoria_id, norma_id)
);

create table public.auditoria_sitios (
  auditoria_id  uuid not null references public.auditorias(id) on delete cascade,
  sitio_id      uuid not null references public.sitios(id)     on delete cascade,
  org_id        uuid not null references public.organizaciones(id) on delete cascade,
  creado_en     timestamptz not null default now(),
  creado_por    uuid references public.usuarios(id),
  primary key (auditoria_id, sitio_id)
);

create table public.auditoria_procesos (
  auditoria_id  uuid not null references public.auditorias(id) on delete cascade,
  proceso_id    uuid not null references public.procesos(id)   on delete cascade,
  org_id        uuid not null references public.organizaciones(id) on delete cascade,
  creado_en     timestamptz not null default now(),
  creado_por    uuid references public.usuarios(id),
  primary key (auditoria_id, proceso_id)
);


-- ============================================================================
-- §4 · EQUIPO Y AGENDA  [F03·B1]
-- ============================================================================

-- Quién audita, con qué papel. Las certificaciones salen de `usuarios`
-- (`certificaciones text[]`) y se imprimen en el informe.
create table public.auditoria_equipo (
  auditoria_id  uuid not null references public.auditorias(id) on delete cascade,
  usuario_id    uuid not null references public.usuarios(id)   on delete cascade,
  org_id        uuid not null references public.organizaciones(id) on delete cascade,
  papel         text not null default 'auditor'
                check (papel in ('lider','auditor','experto_tecnico','observador')),
  creado_en     timestamptz not null default now(),
  creado_por    uuid references public.usuarios(id),
  primary key (auditoria_id, usuario_id)
);

-- El plan hora por hora. Es **lo que se le manda al cliente antes de la visita**,
-- y por eso vive en filas y no en un texto: se reordena, se imprime y se cumple.
--
-- ⚠️ `auditado` es texto libre a propósito. La agenda se manda semanas antes,
-- cuando todavía no se sabe el nombre de quien va a estar: dice «Jefe de
-- Almacén». `contacto_id` se llena después, si se sabe.
--
-- ⚠️ `hora_inicio`/`hora_fin` son `time`, sin zona: es un horario de pared —«de
-- 9:00 a 10:30»— y no un instante. Un `timestamptz` aquí se movería solo al
-- cambiar de zona el navegador que lo pinta.
create table public.auditoria_agenda (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizaciones(id) on delete cascade,
  auditoria_id  uuid not null references public.auditorias(id) on delete cascade,
  fecha         date not null,
  hora_inicio   time,
  hora_fin      time,
  tema          text not null,
  proceso_id    uuid references public.procesos(id) on delete set null,
  sitio_id      uuid references public.sitios(id)   on delete set null,
  auditado      text,
  contacto_id   uuid references public.contactos(id) on delete set null,
  auditor_id    uuid references public.usuarios(id),
  orden         int  not null default 0,
  -- Lo que de verdad pasó, para el apartado «agenda cumplida» del informe.
  cumplido      boolean not null default false,
  nota          text,
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por    uuid references public.usuarios(id),
  constraint auditoria_agenda_horas_coherentes
    check (hora_fin is null or hora_inicio is null or hora_fin >= hora_inicio)
);

comment on table public.auditoria_agenda is
  'El plan hora por hora que se envía al cliente antes de la visita, y lo que se cumplió de él.';


-- ============================================================================
-- §5 · LA LISTA DE VERIFICACIÓN  [F03·B2]
-- ============================================================================

-- Cada punto a verificar. Se **genera** del alcance con
-- `generar_lista_verificacion()` (§8) y después el auditor la edita: añade,
-- quita, reordena y escribe sus propias preguntas antes de entrar.
--
-- ⚠️ `clausula_id` es NULLABLE aquí, y NOT NULL en `hallazgos`. No es una
-- inconsistencia: un auditor añade preguntas propias que no cuelgan de ninguna
-- cláusula («¿el extintor del pasillo 3 tiene la carga vigente?»), y eso es
-- trabajo legítimo. Lo que no puede existir es un **hallazgo** sin cláusula
-- citada — eso ya no es un hallazgo, es una opinión.
--
-- ⚠️ `veredicto` es NOT NULL con `pendiente` en la lista, en vez de NULL. Dos
-- maneras de decir «todavía no lo miré» son dos maneras de contar mal el avance
-- del recorrido.
create table public.auditoria_items (
  id             uuid primary key default gen_random_uuid(),
  -- La pone `heredar_org_de_la_auditoria()`; el cliente no la manda.
  org_id         uuid not null references public.organizaciones(id) on delete cascade,
  auditoria_id   uuid not null references public.auditorias(id) on delete cascade,
  -- RESTRICT: una cláusula citada en una lista de verificación ya es parte de un
  -- expediente. El importador de normas nunca borra, marca `activa = false`.
  clausula_id    uuid references public.norma_clausulas(id) on delete restrict,
  proceso_id     uuid references public.procesos(id) on delete set null,
  pregunta       text not null,
  orden          int  not null default 0,
  veredicto      text not null default 'pendiente'
                 check (veredicto in ('pendiente','conforme','no_conforme',
                                      'observacion','no_aplica')),
  nota           text,
  -- ⚠️ El reloj del AUDITOR, no el del servidor. Ver el encabezado del archivo.
  evaluado_en    timestamptz,
  -- Éste sí lo sella la base: quién no se falsifica.
  evaluado_por   uuid references public.usuarios(id),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id)
);

comment on table public.auditoria_items is
  'La lista de verificación. Se genera del alcance y el auditor la edita antes de entrar a planta.';

comment on column public.auditoria_items.evaluado_en is
  'El reloj del TELÉFONO del auditor: la hora del recorrido, no la de recuperar la señal. actualizado_en sigue siendo del servidor.';


-- ============================================================================
-- §6 · HALLAZGOS  [F03·B4]
-- ============================================================================

-- ⚠️ **UN HALLAZGO NO SE BORRA.** CLAUDE.md regla 13, y aquí es donde muerde.
--
-- Se cierra, se reclasifica o se anula **con motivo**, y la versión anterior
-- queda en `hallazgos_historial`. La tabla no tiene política de DELETE — con RLS
-- activa, eso no es un olvido: es que ningún DELETE pasa, ni el del socio.
-- Destruir un hallazgo es destruir la trazabilidad de la auditoría, que es
-- exactamente lo que un auditor externo va a venir a revisar.
--
-- ⚠️ `descripcion` y `evidencia_objetiva` llevan CHECK además de NOT NULL: la
-- cadena vacía pasa un NOT NULL, y un hallazgo con la evidencia en blanco es un
-- hallazgo que no se puede defender delante del cliente.
create table public.hallazgos (
  id                       uuid primary key default gen_random_uuid(),
  -- La pone `heredar_org_de_la_auditoria()`.
  org_id                   uuid not null references public.organizaciones(id) on delete cascade,
  -- RESTRICT: la auditoría no se borra, y si algún día se aflojara, no puede
  -- llevarse sus hallazgos por delante.
  auditoria_id             uuid not null references public.auditorias(id) on delete restrict,
  item_id                  uuid references public.auditoria_items(id) on delete set null,
  -- **La cita es obligatoria.** Un hallazgo sin cláusula no es un hallazgo.
  clausula_id              uuid not null references public.norma_clausulas(id) on delete restrict,
  -- Los pone `sellar_folio_hallazgo()`. Sin UNIQUE sobre (auditoria_id,
  -- consecutivo): ver el porqué en §1, es la decisión que salva los 30 hallazgos.
  consecutivo              int  not null,
  folio                    text not null,
  tipo                     text not null default 'observacion'
                           check (tipo in ('nc_mayor','nc_menor','observacion',
                                           'oportunidad_mejora','conformidad')),
  descripcion              text not null check (btrim(descripcion) <> ''),
  evidencia_objetiva       text not null check (btrim(evidencia_objetiva) <> ''),
  requisito_incumplido     text,
  proceso_id               uuid references public.procesos(id) on delete set null,
  sitio_id                 uuid references public.sitios(id)   on delete set null,
  responsable_contacto_id  uuid references public.contactos(id) on delete set null,
  estado                   text not null default 'abierto'
                           check (estado in ('abierto','en_accion','verificado',
                                             'cerrado','anulado')),
  fecha_compromiso         date,
  -- ⚠️ El reloj del AUDITOR: cuándo se vio, en planta. Ver el encabezado.
  detectado_en             timestamptz,
  -- Los pone `sellar_cierre_hallazgo()`.
  cerrado_en               timestamptz,
  cerrado_por_id           uuid references public.usuarios(id),
  motivo_anulacion         text,
  -- El porqué del último cambio. Lo copia `registrar_historial_hallazgo()` a
  -- cada renglón que escribe. Vive aquí y no en el historial porque así el
  -- cambio y su motivo son **una sola escritura** de la cola: sin señal, dos
  -- podrían llegar desparejadas y el renglón quedaría sin explicación.
  motivo_cambio            text,
  creado_en                timestamptz not null default now(),
  actualizado_en           timestamptz not null default now(),
  creado_por               uuid references public.usuarios(id),
  -- Anular sin motivo es borrar con otro nombre.
  constraint hallazgos_anulado_con_motivo
    check (estado <> 'anulado'
           or (motivo_anulacion is not null and btrim(motivo_anulacion) <> ''))
);

comment on table public.hallazgos is
  'El hallazgo de auditoría. NO SE BORRA (regla 13): se cierra, se reclasifica o se anula con motivo, y queda el historial.';

comment on column public.hallazgos.detectado_en is
  'El reloj del TELÉFONO del auditor: cuándo se vio en planta. creado_en es cuándo llegó al servidor.';

-- El historial. **Esto es lo que un organismo certificador viene a revisar.**
--
-- ⚠️ Inmutable, igual que `audit_logs`: sin UPDATE ni DELETE en RLS, y sin
-- INSERT tampoco — lo escribe `registrar_historial_hallazgo()`, que es
-- `security definer` y se sale del RLS a propósito. Si la app que audita no
-- puede demostrar quién cambió qué, no sirve.
create table public.hallazgos_historial (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizaciones(id) on delete cascade,
  hallazgo_id  uuid not null references public.hallazgos(id) on delete cascade,
  campo        text not null,
  antes        text,
  despues      text,
  motivo       text,
  hecho_por    uuid references public.usuarios(id),
  hecho_en     timestamptz not null default now()
);

comment on table public.hallazgos_historial is
  'Cada cambio de un hallazgo, campo por campo. Inmutable: lo escribe un trigger y nadie lo edita.';


-- ============================================================================
-- §7 · `adjuntos` APRENDE `hallazgo_id`  [F03·B3]
-- ============================================================================

-- La columna que F02·B2b dejó anotada: «`hallazgo_id` la añade la Fase 03».
-- Es hoy, y son las dos líneas prometidas —ésta y la rama del `coalesce`— más
-- la suya en `CAMPOS_DOMINANTES` del cliente.
alter table public.adjuntos
  add column hallazgo_id uuid references public.hallazgos(id) on delete cascade;

comment on column public.adjuntos.hallazgo_id is
  'La foto de campo. Campo dominante entre tarea_etapa_id y documento_id: mismo orden que CAMPOS_DOMINANTES.';

-- `heredar_org_del_adjunto()` aprende la rama.
--
-- ⚠️ El orden del `if` es el mismo que el de `campoDominante()` en
-- `src/lib/offline/adjuntos.ts`, de lo más específico a lo más general:
-- tarea de etapa → hallazgo → documento. Los dos se mueven juntos.
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
  elsif new.hallazgo_id is not null then
    select org_id into v_org from public.hallazgos where id = new.hallazgo_id;
    if v_org is null then
      raise exception 'El hallazgo % no existe', new.hallazgo_id using errcode = '23503';
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
-- §8 · generar_lista_verificacion()  [F03·B2]
-- ============================================================================

-- La lista de verificación **sale sola** del alcance de la auditoría.
--
-- Recorre `auditoria_normas` y crea un ítem por cláusula auditable. Devuelve
-- cuántos creó.
--
-- ⚠️ **Sólo las HOJAS auditables.** Un capítulo como «8 · Operación» tiene
-- debajo 8.1, 8.2, 8.3…; poner los dos niveles duplicaría cada punto y haría el
-- recorrido el doble de largo para no comprobar nada nuevo. Se toma la cláusula
-- que no tiene ninguna hija auditable y activa.
--
-- ⚠️ **Idempotente**, igual que el importador de normas: correrla otra vez
-- después de ampliar el alcance añade lo que falta y **no toca lo ya evaluado**.
-- Un auditor que agrega la 45001 a media planeación no puede perder los
-- veredictos que ya capturó.
--
-- ⚠️ SECURITY INVOKER —el que trae por defecto—, a propósito: el INSERT pasa por
-- la política de `auditoria_items`, así que quien tenga papel `lectura` no puede
-- generar nada. Una función `security definer` aquí sería una puerta trasera a
-- la multi-tenencia con forma de comodidad.
create or replace function public.generar_lista_verificacion(p_auditoria uuid)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_creados int;
  v_base    int;
begin
  if not exists (select 1 from public.auditorias where id = p_auditoria) then
    raise exception 'La auditoría % no existe', p_auditoria using errcode = '23503';
  end if;

  -- Los nuevos van después de lo que el auditor ya tenía ordenado a mano.
  select coalesce(max(orden), 0) into v_base
    from public.auditoria_items where auditoria_id = p_auditoria;

  with candidatas as (
    select c.id,
           c.titulo,
           row_number() over (order by n.clave, c.orden, c.numero) as fila
      from public.auditoria_normas an
      join public.normas          n on n.id = an.norma_id
      join public.norma_clausulas c on c.norma_id = an.norma_id
     where an.auditoria_id = p_auditoria
       and c.auditable
       and c.activa
       -- sólo hojas: ninguna hija auditable y activa
       and not exists (
         select 1 from public.norma_clausulas h
          where h.padre_id = c.id and h.auditable and h.activa
       )
       -- y lo que ya está en la lista no se vuelve a poner
       and not exists (
         select 1 from public.auditoria_items i
          where i.auditoria_id = p_auditoria and i.clausula_id = c.id
       )
  )
  insert into public.auditoria_items (auditoria_id, clausula_id, pregunta, orden)
  select p_auditoria, candidatas.id, candidatas.titulo, v_base + candidatas.fila::int
    from candidatas;

  get diagnostics v_creados = row_count;
  return v_creados;
end
$$;

comment on function public.generar_lista_verificacion is
  'Crea un ítem por cláusula HOJA auditable del alcance de la auditoría. Idempotente: no toca lo ya evaluado.';

revoke all on function public.generar_lista_verificacion(uuid) from public;
grant execute on function public.generar_lista_verificacion(uuid) to authenticated;


-- ============================================================================
-- §9 · ÍNDICES
-- ============================================================================

create index programa_auditorias_org_idx  on public.programa_auditorias (org_id, anio desc);

create index auditorias_org_idx           on public.auditorias (org_id, estado, fecha_inicio desc);
create index auditorias_programa_idx      on public.auditorias (programa_id);
create index auditorias_proyecto_idx      on public.auditorias (proyecto_id);
create index auditorias_lider_idx         on public.auditorias (auditor_lider_id, estado);

create index auditoria_normas_org_idx     on public.auditoria_normas   (org_id);
create index auditoria_sitios_org_idx     on public.auditoria_sitios   (org_id);
create index auditoria_procesos_org_idx   on public.auditoria_procesos (org_id);
create index auditoria_equipo_org_idx     on public.auditoria_equipo   (org_id);
-- «Qué auditorías tengo asignadas», de toda la cartera.
create index auditoria_equipo_usuario_idx on public.auditoria_equipo   (usuario_id);

create index auditoria_agenda_aud_idx     on public.auditoria_agenda (auditoria_id, fecha, orden);
create index auditoria_agenda_org_idx     on public.auditoria_agenda (org_id);

-- La pantalla de recorrido: la lista entera de una auditoría, en orden.
create index auditoria_items_aud_idx      on public.auditoria_items (auditoria_id, orden);
create index auditoria_items_org_idx      on public.auditoria_items (org_id, veredicto);
create index auditoria_items_clausula_idx on public.auditoria_items (clausula_id);

-- **El tablero que el consultor abre cada lunes** (docs/04 · Índices que importan).
create index hallazgos_org_idx            on public.hallazgos (org_id, estado, fecha_compromiso);
create index hallazgos_auditoria_idx      on public.hallazgos (auditoria_id, consecutivo);
create index hallazgos_clausula_idx       on public.hallazgos (clausula_id);
create index hallazgos_item_idx           on public.hallazgos (item_id) where item_id is not null;
create index hallazgos_contacto_idx       on public.hallazgos (responsable_contacto_id);

create index hallazgos_historial_idx      on public.hallazgos_historial (hallazgo_id, hecho_en desc);
create index hallazgos_historial_org_idx  on public.hallazgos_historial (org_id);

-- El adjunto de campo, por su campo dominante.
create index adjuntos_hallazgo_idx        on public.adjuntos (hallazgo_id) where hallazgo_id is not null;


-- ============================================================================
-- §10 · TRIGGERS
-- ============================================================================

-- ------------------------------------------------------- programa anual ----
create trigger programa_auditorias_sellar
  before insert or update on public.programa_auditorias
  for each row execute function public.sellar_programa_aprobado();

create trigger programa_auditorias_actualizado_en
  before update on public.programa_auditorias
  for each row execute function public.tocar_actualizado_en();

-- ------------------------------------------------------------ auditorías ---
create trigger auditorias_folio
  before insert on public.auditorias
  for each row execute function public.asignar_folio_auditoria();

create trigger auditorias_contexto
  before insert or update on public.auditorias
  for each row execute function public.validar_contexto_de_la_auditoria();

create trigger auditorias_sellar_cierre
  before insert or update on public.auditorias
  for each row execute function public.sellar_cierre_auditoria();

create trigger auditorias_actualizado_en
  before update on public.auditorias
  for each row execute function public.tocar_actualizado_en();

-- ---------------------------------------------------------- el alcance -----
create trigger auditoria_normas_org
  before insert or update on public.auditoria_normas
  for each row execute function public.heredar_org_de_la_auditoria();

create trigger auditoria_sitios_org
  before insert or update on public.auditoria_sitios
  for each row execute function public.heredar_org_de_la_auditoria();

-- ⚠️ El orden importa: primero se hereda la `org_id` de la auditoría y después
-- se valida que el sitio sea de esa organización. Al revés compararía contra una
-- `org_id` que todavía no está puesta. Postgres dispara los triggers `BEFORE` de
-- una misma operación **en orden alfabético de nombre**, y `_org` va antes que
-- `_valida` — pero se deja escrito porque renombrar uno rompería la guarda en
-- silencio.
create trigger auditoria_sitios_valida
  before insert or update on public.auditoria_sitios
  for each row execute function public.validar_referencia_de_la_org();

create trigger auditoria_procesos_org
  before insert or update on public.auditoria_procesos
  for each row execute function public.heredar_org_de_la_auditoria();

create trigger auditoria_procesos_valida
  before insert or update on public.auditoria_procesos
  for each row execute function public.validar_referencia_de_la_org();

-- ------------------------------------------------------ equipo y agenda ----
create trigger auditoria_equipo_org
  before insert or update on public.auditoria_equipo
  for each row execute function public.heredar_org_de_la_auditoria();

create trigger auditoria_agenda_org
  before insert or update on public.auditoria_agenda
  for each row execute function public.heredar_org_de_la_auditoria();

create trigger auditoria_agenda_valida
  before insert or update on public.auditoria_agenda
  for each row execute function public.validar_referencia_de_la_org();

create trigger auditoria_agenda_actualizado_en
  before update on public.auditoria_agenda
  for each row execute function public.tocar_actualizado_en();

-- ------------------------------------------- la lista de verificación -----
create trigger auditoria_items_org
  before insert or update on public.auditoria_items
  for each row execute function public.heredar_org_de_la_auditoria();

create trigger auditoria_items_sellar
  before insert or update on public.auditoria_items
  for each row execute function public.sellar_evaluacion_item();

create trigger auditoria_items_valida
  before insert or update on public.auditoria_items
  for each row execute function public.validar_referencia_de_la_org();

create trigger auditoria_items_actualizado_en
  before update on public.auditoria_items
  for each row execute function public.tocar_actualizado_en();

-- --------------------------------------------------------------- hallazgos --
create trigger hallazgos_org
  before insert or update on public.hallazgos
  for each row execute function public.heredar_org_de_la_auditoria();

-- ⚠️ `hallazgos_sellar_cierre` va antes que `hallazgos_valida` sólo por el
-- alfabeto; ninguno depende del otro. El que SÍ depende es `hallazgos_org`, que
-- pone la `org_id` contra la que `_valida` compara — y `_org` gana alfabéticamente.
create trigger hallazgos_sellar_cierre
  before insert or update on public.hallazgos
  for each row execute function public.sellar_cierre_hallazgo();

create trigger hallazgos_valida
  before insert or update on public.hallazgos
  for each row execute function public.validar_referencia_de_la_org();

-- El folio se compone al final, cuando la fila ya tiene su auditoría validada.
create trigger hallazgos_zfolio
  before insert on public.hallazgos
  for each row execute function public.sellar_folio_hallazgo();

create trigger hallazgos_actualizado_en
  before update on public.hallazgos
  for each row execute function public.tocar_actualizado_en();

create trigger hallazgos_historial
  after update on public.hallazgos
  for each row execute function public.registrar_historial_hallazgo();

create trigger hallazgos_historial_org
  before insert on public.hallazgos_historial
  for each row execute function public.heredar_org_del_hallazgo();

-- ------------------------------------------------------------- bitácora ----
create trigger programa_auditorias_bitacora
  after insert or update or delete on public.programa_auditorias
  for each row execute function public.registrar_bitacora();

create trigger auditorias_bitacora
  after insert or update or delete on public.auditorias
  for each row execute function public.registrar_bitacora();

create trigger auditoria_items_bitacora
  after insert or update or delete on public.auditoria_items
  for each row execute function public.registrar_bitacora();

create trigger hallazgos_bitacora
  after insert or update or delete on public.hallazgos
  for each row execute function public.registrar_bitacora();


-- ============================================================================
-- §11 · RLS
--
-- La plantilla de siempre: SELECT por organización asignada, INSERT y UPDATE por
-- `puedo_editar_org()` —que excluye al papel `lectura`—, UPDATE con USING **y**
-- WITH CHECK, y `TO authenticated` en todas.
--
-- Sin `WITH CHECK`, un consultor puede tomar un hallazgo suyo y cambiarle la
-- `org_id`: la fila se le escapa de las manos y aterriza en el expediente
-- equivocado (docs/08 §2).
-- ============================================================================

alter table public.programa_auditorias  enable row level security;
alter table public.auditorias           enable row level security;
alter table public.auditoria_normas     enable row level security;
alter table public.auditoria_sitios     enable row level security;
alter table public.auditoria_procesos   enable row level security;
alter table public.auditoria_equipo     enable row level security;
alter table public.auditoria_agenda     enable row level security;
alter table public.auditoria_items      enable row level security;
alter table public.hallazgos            enable row level security;
alter table public.hallazgos_historial  enable row level security;

-- ------------------------------------------------------- programa anual ----
create policy "programa_auditorias_select" on public.programa_auditorias for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "programa_auditorias_insert" on public.programa_auditorias for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "programa_auditorias_update" on public.programa_auditorias for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- Un programa en borrador y sin auditorías es planeación, y se borra. Uno
-- aprobado es un registro de ISO 9001 §9.2.2 y ya no.
create policy "programa_auditorias_delete" on public.programa_auditorias for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and estado = 'borrador'
     and not exists (select 1 from public.auditorias a where a.programa_id = programa_auditorias.id));

-- ------------------------------------------------------------ auditorías ---
create policy "auditorias_select" on public.auditorias for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "auditorias_insert" on public.auditorias for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "auditorias_update" on public.auditorias for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- ⚠️ **SIN política de DELETE.** Una auditoría es evidencia: se cancela
-- (`estado = 'cancelada'`), no se borra. Con RLS activa y ninguna política de
-- DELETE, ningún borrado pasa — tampoco el del socio.

-- ---------------------------------------------------------- el alcance -----
create policy "auditoria_normas_select" on public.auditoria_normas for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "auditoria_normas_insert" on public.auditoria_normas for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "auditoria_normas_delete" on public.auditoria_normas for delete to authenticated
  using (public.puedo_editar_org(org_id));

create policy "auditoria_sitios_select" on public.auditoria_sitios for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "auditoria_sitios_insert" on public.auditoria_sitios for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "auditoria_sitios_delete" on public.auditoria_sitios for delete to authenticated
  using (public.puedo_editar_org(org_id));

create policy "auditoria_procesos_select" on public.auditoria_procesos for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "auditoria_procesos_insert" on public.auditoria_procesos for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "auditoria_procesos_delete" on public.auditoria_procesos for delete to authenticated
  using (public.puedo_editar_org(org_id));

-- ------------------------------------------------------ equipo y agenda ----
create policy "auditoria_equipo_select" on public.auditoria_equipo for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "auditoria_equipo_insert" on public.auditoria_equipo for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "auditoria_equipo_update" on public.auditoria_equipo for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

create policy "auditoria_equipo_delete" on public.auditoria_equipo for delete to authenticated
  using (public.puedo_editar_org(org_id));

create policy "auditoria_agenda_select" on public.auditoria_agenda for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "auditoria_agenda_insert" on public.auditoria_agenda for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "auditoria_agenda_update" on public.auditoria_agenda for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

create policy "auditoria_agenda_delete" on public.auditoria_agenda for delete to authenticated
  using (public.puedo_editar_org(org_id));

-- ------------------------------------------- la lista de verificación -----
create policy "auditoria_items_select" on public.auditoria_items for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "auditoria_items_insert" on public.auditoria_items for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "auditoria_items_update" on public.auditoria_items for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- El auditor «añade, quita y reordena antes de entrar» — pero un ítem que ya
-- produjo un hallazgo es la cita de ese hallazgo, y se queda.
create policy "auditoria_items_delete" on public.auditoria_items for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and not exists (select 1 from public.hallazgos h where h.item_id = auditoria_items.id));

-- --------------------------------------------------------------- hallazgos --
create policy "hallazgos_select" on public.hallazgos for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "hallazgos_insert" on public.hallazgos for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "hallazgos_update" on public.hallazgos for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- ⚠️ **SIN política de DELETE, y ésta es la importante.** CLAUDE.md regla 13.
-- Un hallazgo se anula con motivo (`estado = 'anulado'` + `motivo_anulacion`,
-- que el CHECK exige) o se reclasifica. Lo que no hace nunca es desaparecer.

-- ------------------------------------------------------------- historial ---
-- Sólo lectura. Lo escribe `registrar_historial_hallazgo()`, que es
-- `security definer`. Sin INSERT, sin UPDATE y sin DELETE: es la misma decisión
-- que `audit_logs`, y por el mismo motivo — en una firma de auditoría la
-- inmutabilidad no es higiene, es el producto.
create policy "hallazgos_historial_select" on public.hallazgos_historial for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());


-- ============================================================================
-- §12 · LA AMPLIACIÓN QUE LAS FASES 01 Y 02 DEJARON ANOTADA
--
-- «⚠️ ESTA POLÍTICA HAY QUE AMPLIARLA EN LA FASE 02 Y EN LA 03.» Es hoy, y es
-- la última: las dos líneas que las migraciones 4 y 6 dejaron comentadas.
-- ============================================================================

-- Una organización con auditorías o hallazgos ya NO se borra.
create or replace function public.puedo_borrar_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_socio()
     and not exists (select 1 from public.documentos where org_id = p_org)
     and not exists (select 1 from public.auditorias where org_id = p_org)
     and not exists (select 1 from public.hallazgos  where org_id = p_org)
$$;

comment on function public.puedo_borrar_org is
  'Socio, y sin documentos, auditorías ni hallazgos. La condición vive aquí para que ampliarla sea tocar un sitio.';

-- Y un proyecto con auditorías tampoco.
--
-- ⚠️ Misma asimetría intencional que con los documentos: `auditorias.proyecto_id`
-- es ON DELETE SET NULL, así que borrar el proyecto no se llevaría las
-- auditorías — las dejaría huérfanas de contrato, que es justo lo que el campo
-- existe para contestar.
create or replace function public.puedo_borrar_proyecto(p_proyecto uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_socio()
     and exists     (select 1 from public.proyectos  where id = p_proyecto)
     and not exists (select 1 from public.documentos where proyecto_id = p_proyecto)
     and not exists (select 1 from public.auditorias where proyecto_id = p_proyecto)
$$;

comment on function public.puedo_borrar_proyecto is
  'Socio, y sin documentos ni auditorías. Un contrato que produjo evidencia es historia de la firma.';


-- ============================================================================
-- §13 · LA REGLA 13, DE VERDAD — Y NO BASTABA CON NO PONER LA POLÍTICA
--
-- ⚠️ **`service_role` se salta el RLS.** Ausencia de política de DELETE detiene
-- a `authenticated`, y a nadie más: cualquier API route que use la llave de
-- servicio podría borrar un hallazgo, y la primera migración ya dejó escrito
-- que «lo único que lo detiene a él es la ausencia del PERMISO».
--
-- Es exactamente el problema de `audit_logs`, y se cierra con los mismos dos
-- candados, por el mismo motivo y en el mismo archivo que el resto de la fase:
--
--   1. **Revocar el permiso.** El grant es la puerta; sin puerta no hay intento.
--   2. **Un trigger que grita.** Porque el candado 1 lo deshace sin querer el
--      próximo `grant all on all tables in schema public` —que es justo lo que
--      hace `20260821041500_permisos_de_esquema.sql`—, y entonces el borrado
--      volvería a ser posible sin que nadie lo note. El trigger corre para
--      TODOS, service_role incluido, y no depende de ningún grant.
-- ============================================================================

create or replace function public.impedir_borrado_de_evidencia()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'Esto es evidencia de auditoría y no se borra: anúlalo con motivo o ciérralo (CLAUDE.md regla 13). Tabla: %',
    tg_table_name
    using errcode = '42501';
end
$$;

comment on function public.impedir_borrado_de_evidencia is
  'El segundo candado de la regla 13. Corre para todos, service_role incluido, y no depende de ningún grant.';

-- Un hallazgo se anula o se cierra. No desaparece.
create trigger hallazgos_inmutables
  before delete on public.hallazgos
  for each row execute function public.impedir_borrado_de_evidencia();

-- Una auditoría se cancela. Tampoco desaparece.
create trigger auditorias_inmutables
  before delete on public.auditorias
  for each row execute function public.impedir_borrado_de_evidencia();

-- Y el historial no se edita ni se borra: es lo que el organismo certificador
-- viene a revisar.
create or replace function public.impedir_cambios_historial()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'hallazgos_historial es inmutable: un renglón del historial no se actualiza ni se borra'
    using errcode = '42501';
end
$$;

create trigger hallazgos_historial_inmutable
  before update or delete on public.hallazgos_historial
  for each row execute function public.impedir_cambios_historial();

-- El primer candado. Va **al final del archivo**, igual que en
-- `20260821041500_permisos_de_esquema.sql`: si vive en otra migración, basta con
-- que alguien reordene o repita un grant para que la evidencia vuelva a ser
-- borrable sin que nadie lo note.
--
-- ⚠️ El INSERT de `hallazgos_historial` se revoca también, y no rompe nada:
-- lo escribe `registrar_historial_hallazgo()`, que es `security definer` y corre
-- como dueño de la tabla. Nadie más tiene por qué escribir ahí.
revoke delete on public.hallazgos, public.auditorias
  from anon, authenticated, service_role;

revoke insert, update, delete on public.hallazgos_historial
  from anon, authenticated, service_role;
