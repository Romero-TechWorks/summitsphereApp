-- ============================================================================
-- F03·B3 · La evidencia de campo — `adjuntos` aprende `item_id`
--
-- La pantalla de recorrido es «ítem → veredicto → nota → foto», y hasta hoy esa
-- foto **no tenía dónde colgarse**: `adjuntos` sabe de tareas, documentos y
-- hallazgos, pero no de un punto de la lista de verificación.
--
-- ⚠️ **Y no basta con colgarla del hallazgo**, que era la lectura fácil del
-- modelo de datos. Tres casos que se pierden así, y los tres pasan en una planta:
--
--   1. **La foto se toma ANTES de decidir el veredicto.** El auditor fotografía
--      el tablero eléctrico y después piensa si eso es una NC menor o una
--      observación. Sin `item_id` la foto no existe hasta que exista el
--      hallazgo, y en el orden real de los dedos eso es al revés.
--   2. **Un `conforme` también se fotografía.** «Sí tenían el registro, aquí
--      está» es evidencia objetiva de que se verificó, y de un conforme no nace
--      ningún hallazgo del que colgarla.
--   3. **La nota dictada.** Es un archivo de audio del punto que se está
--      mirando, no de un hallazgo — y muchas veces se dicta justo para decidir
--      si hay hallazgo.
--
-- Es la vía de ampliación que F02·B2b dejó escrita: una columna aquí, una rama
-- en `heredar_org_del_adjunto()` y una línea en `CAMPOS_DOMINANTES`.
--
-- ⚠️ Va DESPUÉS de `20260824120000_auditorias_y_hallazgos.sql`: `auditoria_items`
-- nace ahí, y aquí se le pone una clave foránea.
-- ============================================================================

alter table public.adjuntos
  add column item_id uuid references public.auditoria_items(id) on delete cascade;

comment on column public.adjuntos.item_id is
  'La foto o la nota dictada de un punto de la lista de verificación. Campo dominante entre hallazgo_id y documento_id.';

create index adjuntos_item_idx on public.adjuntos (item_id) where item_id is not null;

-- `heredar_org_del_adjunto()` aprende la rama.
--
-- ⚠️ El orden del `if` es el mismo que el de `campoDominante()` en
-- `src/lib/offline/adjuntos.ts`, de lo más específico a lo más general:
-- tarea de etapa → hallazgo → punto de verificación → documento. Los dos se
-- mueven juntos; si divergen, un adjunto hereda la organización equivocada.
--
-- ⚠️ El hallazgo va ANTES que el punto porque es más específico: un hallazgo
-- cita a un punto, no al revés. Una foto que llegara con los dos campos puestos
-- es evidencia del hallazgo.
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
-- Y un punto con evidencia tampoco se quita
-- ============================================================================

-- ⚠️ **Un `on delete cascade` se salta el RLS**, y ahí estaba el agujero: la
-- política de DELETE de `adjuntos` sólo deja borrar evidencia a un **socio**,
-- pero quitar un punto de la lista lo puede hacer cualquier editor — y el
-- cascade se habría llevado sus fotos por delante en silencio, sin pasar por esa
-- política y sin dejar a nadie a quien preguntarle.
--
-- La condición se pone donde ya estaba la del hallazgo, en la política del
-- punto: un punto que ya produjo un hallazgo **o al que ya se le tomó una foto**
-- deja de ser una casilla en blanco y no se quita. El cascade sigue puesto, pero
-- ya no puede dispararse desde la app.
--
-- ⚠️ Recuerda que un DELETE bloqueado por RLS **no lanza**: afecta a cero filas
-- y PostgREST responde 200. Por eso `eliminarItem()` pide `.select()` y trata el
-- cero como error — si no, el punto desaparecería de la pantalla y volvería al
-- refrescar.
drop policy if exists "auditoria_items_delete" on public.auditoria_items;

create policy "auditoria_items_delete" on public.auditoria_items for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and not exists (select 1 from public.hallazgos h where h.item_id = auditoria_items.id)
     and not exists (select 1 from public.adjuntos  a where a.item_id = auditoria_items.id));
