-- ============================================================================
-- F05·B2 · LA RENOVACIÓN DE UN VENCIMIENTO
--
-- Tarea `F04` del dueño (docs/09). ⚠️ **Va DESPUÉS de
-- `20260922120000_cumplimiento_normativo.sql`**, que crea `vencimientos`.
--
-- ⚠️ **Por qué hace falta, y no se vio al especificar.** Un estudio de ruido
-- vence cada dos años y se RENUEVA. Había dos maneras de hacerlo con lo que
-- existía, y las dos fallan:
--
--   · **Reescribir la misma fila** (nueva emisión, nueva fecha). La
--     `clave_evento` del cron es `vencimiento:<id>:vence_90` —describe el hecho,
--     y el índice único parcial lo hace idempotente—, así que el aviso de 90
--     días del ciclo NUEVO choca contra el del ciclo viejo y **no se manda
--     nunca**. Y el estudio anterior, con su PDF, deja de existir como renglón:
--     sólo queda en `audit_logs`, que no es lo que un auditor externo abre.
--   · **Dar de alta otra fila.** La vieja se queda en `vencido` para siempre, en
--     rojo en la lista, en el widget del tablero y en el semáforo: el cliente ya
--     renovó y la app dice que está incumpliendo.
--
-- La salida es la de `documento_versiones`: **una fila por emisión**, y la nueva
-- jubila a la anterior. `renueva_id` en la nueva apunta a la que sustituye, y un
-- trigger marca esa anterior como `renovado` **en la misma escritura del
-- cliente** — sin señal, dos operaciones de la cola podrían llegar desparejadas
-- (misma razón que `jubilar_version_anterior()`).
--
-- ✅ **Es aditiva**: una columna nullable y un CHECK que se **amplía**. El cron no
-- se toca: ya sólo mira `vigente`, `por_vencer`, `vencido` y `en_tramite`, así
-- que un `renovado` sale solo de los avisos.
-- ============================================================================


alter table public.vencimientos drop constraint vencimientos_estado_check;

alter table public.vencimientos
  add constraint vencimientos_estado_check check (estado in
    ('vigente','por_vencer','vencido','en_tramite','no_aplica','renovado'));

alter table public.vencimientos
  add column renueva_id uuid references public.vencimientos(id) on delete set null;

comment on column public.vencimientos.renueva_id is
  'La emisión anterior que ésta sustituye. Al insertar, la anterior pasa a renovado (trigger). Una fila por emisión, como documento_versiones.';

create index vencimientos_renueva_idx on public.vencimientos (renueva_id) where renueva_id is not null;


-- ── La validación aprende la renovación ─────────────────────────────────────
--
-- Se reescribe entera con lo que tenía; lo nuevo es el bloque de `renueva_id`:
-- la anterior tiene que ser de la misma organización y no puede ser ella misma.
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

    if new.renueva_id is not null then
      if new.renueva_id = new.id then
        raise exception 'Un vencimiento no se renueva a sí mismo' using errcode = '23514';
      end if;
      select org_id into v_org from public.vencimientos where id = new.renueva_id;
      if v_org is distinct from new.org_id then
        raise exception 'El vencimiento que se renueva no pertenece a la organización' using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end
$$;


-- ── La nueva emisión jubila a la anterior ───────────────────────────────────
--
-- ⚠️ **SECURITY INVOKER, a propósito.** El UPDATE de la anterior pasa por la
-- política de `vencimientos`: quien no puede editar ese cliente no puede
-- jubilarle nada. La validación de arriba ya garantizó que es de la misma
-- organización que la fila que se acaba de insertar, que sí pasó la política.
create or replace function public.jubilar_vencimiento_anterior()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.renueva_id is not null then
    update public.vencimientos
       set estado = 'renovado'
     where id = new.renueva_id
       and estado <> 'renovado';
    return null;
  end if;

  -- Quitar una renovación capturada por error devuelve la anterior a su ciclo.
  -- Se pone `vigente` y `calcular_estado_vencimiento()` la recoloca contra la
  -- fecha: vuelve a salir vencida si lo está, que es la verdad.
  if tg_op = 'DELETE' and old.renueva_id is not null then
    update public.vencimientos
       set estado = 'vigente'
     where id = old.renueva_id
       and estado = 'renovado';
  end if;

  return null;
end
$$;

create trigger vencimientos_jubila
  after insert or delete on public.vencimientos
  for each row execute function public.jubilar_vencimiento_anterior();
