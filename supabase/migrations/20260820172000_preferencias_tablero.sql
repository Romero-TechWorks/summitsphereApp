-- ============================================================================
-- F00·B6 — Preferencias del tablero
--
-- El orden en que cada persona acomodó sus widgets. Poco código y mucha
-- intención: es la primera escritura de la aplicación, y sirve de prueba de
-- punta a punta de que el armazón, la caché offline y el RLS funcionan juntos
-- (docs/02_PLAN_DE_FASES.md · F00·B6).
--
-- ⚠️ **Esta tabla NO lleva `org_id`, y no es un olvido.** La regla 1 de
-- CLAUDE.md dice que una tabla de dominio sin `org_id` es una fuga — y lo es.
-- Ésta no es una tabla de dominio: la fila no pertenece a una organización
-- cliente sino a una persona de la firma, igual que `usuarios`. Su política es
-- `usuario_id = auth.uid()`, que es MÁS estricta que filtrar por organización:
-- nadie ve las preferencias de nadie, ni el socio.
-- ============================================================================

create table public.preferencias_tablero (
  usuario_id      uuid primary key references public.usuarios(id) on delete cascade,
  -- Los identificadores de los widgets, en el orden en que se pintan. Un id que
  -- ya no exista en el catálogo del código se ignora al leer, y uno nuevo que
  -- todavía no esté aquí se agrega al final: así una versión nueva de la app no
  -- le vacía el tablero a nadie (src/lib/tablero/widgets.ts).
  orden           text[] not null default '{}',
  actualizado_en  timestamptz not null default now()
);

comment on table public.preferencias_tablero is
  'Orden de los widgets del tablero, por persona. Sin org_id a propósito: la fila es de un usuario, no de una organización.';

alter table public.preferencias_tablero enable row level security;

create policy "preferencias_tablero_select" on public.preferencias_tablero
  for select to authenticated using (usuario_id = auth.uid());

create policy "preferencias_tablero_insert" on public.preferencias_tablero
  for insert to authenticated with check (usuario_id = auth.uid());

create policy "preferencias_tablero_update" on public.preferencias_tablero
  for update to authenticated
  using      (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- Sin DELETE: volver al orden de fábrica se guarda como un orden vacío.

create trigger preferencias_tablero_actualizado_en
  before update on public.preferencias_tablero
  for each row execute function public.tocar_actualizado_en();

-- ⚠️ Sin trigger de bitácora, a propósito. Arrastrar un widget no es un acto que
-- nadie vaya a auditar, y engancharlo aquí llenaría `audit_logs` de ruido justo
-- en la tabla que más se escribe — y la bitácora sólo sirve si se puede leer.
