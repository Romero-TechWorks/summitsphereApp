-- ============================================================================
-- F01·B5 + F01·B6 — Tareas por etapa, y poder borrar lo que no es evidencia
--
-- Los dos bloques salieron de **usar la app**, no del plan original: se cargaron
-- datos de prueba y no había forma de quitarlos, y al abrir un proyecto faltaba
-- lo único que un consultor mira todos los días — qué toca hacer ahora.
--
-- ⚠️ Convenciones de siempre: `org_id NOT NULL` + RLS + políticas
-- `TO authenticated`, catálogos `text` + CHECK, UPDATE con USING y WITH CHECK.
-- ============================================================================

-- ============================================================================
-- §1 · TAREAS POR ETAPA  [F01·B5]
-- ============================================================================

-- El checklist de la metodología de Summit dentro de un proyecto.
--
-- ⚠️ **NO es la tabla `tareas` de la Fase 04.** Aquélla son los pasos de una
-- acción correctiva: nace de un hallazgo, lleva verificación de eficacia y la
-- audita un tercero. Ésta es trabajo interno de la firma. Unirlas dejaría media
-- fila vacía en cada caso y obligaría a explicarle a un auditor por qué su
-- acción correctiva vive en la misma tabla que «mandar la propuesta por correo».
--
-- ⚠️ `etapa` repite el CHECK de `proyectos.etapa` **a propósito**, y los dos se
-- mueven juntos — igual que `src/lib/cartera/catalogos.ts`. Una tarea colgada de
-- una etapa que ya no existe no se pinta en ningún sitio y nadie la vuelve a ver.
create table public.tareas_etapa (
  id                uuid primary key default gen_random_uuid(),
  -- La pone el trigger `heredar_org_del_proyecto()`; el cliente no la manda.
  org_id            uuid not null references public.organizaciones(id) on delete cascade,
  proyecto_id       uuid not null references public.proyectos(id) on delete cascade,
  etapa             text not null
                    check (etapa in ('diagnostico','planificacion','documentacion',
                                     'implementacion','auditoria_interna','certificacion')),
  titulo            text not null,
  detalle           text,
  orden             int not null default 0,
  estado            text not null default 'pendiente'
                    check (estado in ('pendiente','en_curso','hecha','no_aplica')),
  responsable_id    uuid references public.usuarios(id),
  fecha_compromiso  date,
  -- Quién la dio por hecha y cuándo. Lo escribe el trigger, no el navegador:
  -- una fecha de cierre que manda el cliente es una fecha que se puede inventar.
  hecha_en          timestamptz,
  hecha_por         uuid references public.usuarios(id),
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  creado_por        uuid references public.usuarios(id)
);

comment on table public.tareas_etapa is
  'Checklist de la metodología por etapa de un proyecto. Distinta de `tareas` (pasos de una acción correctiva, Fase 04).';

-- ⚠️ Sin `exige_evidencia` todavía: la capa de adjuntos llega en F02·B2b y una
-- casilla que no puede impedir nada es un interruptor muerto (CLAUDE.md regla
-- 11). La columna entra en esa migración, junto a lo que la hace verdadera.

create index tareas_etapa_proyecto_idx on public.tareas_etapa (proyecto_id, etapa, orden);
create index tareas_etapa_org_idx      on public.tareas_etapa (org_id, estado);
-- «Lo que me toca esta semana», de toda la cartera.
create index tareas_etapa_responsable_idx on public.tareas_etapa (responsable_id, fecha_compromiso)
  where estado in ('pendiente','en_curso');

-- Quién cerró la tarea y cuándo lo decide la BASE.
--
-- Es el mismo motivo que el del cambio de etapa: sin señal, dos escrituras
-- separadas —el estado y la firma de quién lo hizo— pueden llegar
-- desparejadas. Y una fecha de cierre que viaja desde el navegador es una fecha
-- que alguien puede escribir a mano.
create or replace function public.sellar_tarea_hecha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'hecha' and (tg_op = 'INSERT' or old.estado is distinct from 'hecha') then
    new.hecha_en  := now();
    new.hecha_por := auth.uid();
  elsif new.estado <> 'hecha' then
    -- Reabrir una tarea borra la firma: si no, quedaría diciendo que la cerró
    -- alguien que ya no la tiene cerrada.
    new.hecha_en  := null;
    new.hecha_por := null;
  end if;

  return new;
end
$$;

create trigger tareas_etapa_org
  before insert or update on public.tareas_etapa
  for each row execute function public.heredar_org_del_proyecto();

create trigger tareas_etapa_sello
  before insert or update on public.tareas_etapa
  for each row execute function public.sellar_tarea_hecha();

create trigger tareas_etapa_actualizado_en
  before update on public.tareas_etapa
  for each row execute function public.tocar_actualizado_en();

create trigger tareas_etapa_bitacora
  after insert or update or delete on public.tareas_etapa
  for each row execute function public.registrar_bitacora();

alter table public.tareas_etapa enable row level security;

create policy "tareas_etapa_select" on public.tareas_etapa for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "tareas_etapa_insert" on public.tareas_etapa for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "tareas_etapa_update" on public.tareas_etapa for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- ⚠️ Ésta SÍ lleva DELETE, y no contradice la regla 13. Una tarea de método es
-- trabajo interno de la firma —no evidencia de auditoría—, y una que se agregó
-- por error tiene que poder quitarse. Lo que no se borra es el hallazgo que
-- salga de no haberla hecho.
create policy "tareas_etapa_delete" on public.tareas_etapa for delete to authenticated
  using (public.puedo_editar_org(org_id));

-- ============================================================================
-- §2 · DEPURACIÓN  [F01·B6]
-- ============================================================================

-- Poder borrar lo que **no es evidencia de auditoría**.
--
-- ⚠️ Esto NO afloja la regla 13, la delimita. Un hallazgo, una versión aprobada
-- y la bitácora no se borran nunca. Un cliente capturado por error y un proyecto
-- de prueba, sí — porque la alternativa real es una cartera llena de basura que
-- nadie puede quitar, y una app que se ensucia sola se deja de usar.
--
-- Tres candados:
--   1. **Sólo el socio.** Quien decide quién entra a la cartera decide quién sale.
--   2. **La pantalla pide escribir el nombre** antes de habilitar el botón.
--   3. **Queda en `audit_logs`**, que es inmutable, con la fila entera en `antes`.
--
-- ⚠️ **ESTA POLÍTICA HAY QUE AMPLIARLA EN LA FASE 02 Y EN LA 03.** El día que
-- existan `documentos`, `auditorias` y `hallazgos`, borrar una organización que
-- los tenga sería destruir evidencia. La condición vive en una función a
-- propósito, para que ampliarla sea tocar UN sitio y no cinco políticas.
create or replace function public.puedo_borrar_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Fase 01: sólo el socio. Lo que cuelga hoy —sitios, contactos, proyectos,
  -- alcance, tareas y bitácora— se va con el CASCADE y no es evidencia de
  -- auditoría.
  --
  -- Fase 02: and not exists (select 1 from documentos where org_id = p_org)
  -- Fase 03: and not exists (select 1 from auditorias where org_id = p_org)
  --          and not exists (select 1 from hallazgos  where org_id = p_org)
  select public.es_socio()
$$;

comment on function public.puedo_borrar_org is
  'Fase 01: sólo socio. AMPLIAR en F02/F03: una organización con documentos, auditorías o hallazgos no se borra.';

create or replace function public.puedo_borrar_proyecto(p_proyecto uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Mismo criterio, y la misma advertencia: en la Fase 03 un proyecto con
  -- auditorías deja de poder borrarse.
  select public.es_socio() and exists (
    select 1 from public.proyectos where id = p_proyecto
  )
$$;

comment on function public.puedo_borrar_proyecto is
  'Fase 01: sólo socio. AMPLIAR en F03: un proyecto con auditorías o hallazgos no se borra.';

-- ⚠️ La primera migración dejó escrito «sin DELETE: una organización se cierra».
-- Sigue siendo el camino normal —`estado = 'cerrado'`— y la pantalla lo esconde
-- de los listados. Esto es la salida de emergencia, no la puerta principal.
create policy "organizaciones_delete" on public.organizaciones for delete to authenticated
  using (public.puedo_borrar_org(id));

create policy "proyectos_delete" on public.proyectos for delete to authenticated
  using (public.puedo_borrar_proyecto(id));
