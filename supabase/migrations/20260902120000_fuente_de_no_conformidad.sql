-- ============================================================================
-- FUENTE DE LA NO CONFORMIDAD  ·  Fase 04, paso 0  ·  tarea `E00`
--
-- Hasta hoy `hallazgos.auditoria_id` es NOT NULL, así que **toda** no
-- conformidad cuelga de una auditoría. El `F-SG-06` de la firma pregunta de
-- primero «Fuente de la NC», y con razón: una NC nace igual de una queja del
-- cliente, de un servicio no conforme, de la revisión por la dirección o de un
-- indicador bajo meta. Hoy ninguna de ésas tiene dónde vivir.
--
-- ⚠️ **Y va ANTES que `acciones`, no después.** Una acción correctiva cuelga de
-- un hallazgo. Si el hallazgo todavía no sabe nacer de una queja, medio ciclo de
-- acciones nace amputado y hay que rehacerlo con la fase encima.
--
-- Los once valores de `fuente_nc` **no se inventaron**: salen del catálogo
-- documental del cliente que trajo el `F-SG-05` (2 sep 2026). Nueve de los once
-- tienen un formato con nombre y número detrás —`F-SG-08` quejas, `F-SG-14`
-- servicio no conforme, `F-SG-18` revisión por la dirección, `F-SG-26`
-- seguimiento interno—, que es la diferencia entre un CHECK que aguanta y uno
-- que hay que abrir con otra migración en tres meses.
-- Ver `docs/formatos_informeAuditorias/F-SG-05_ficha_tecnica_de_proceso.md` §5.
--
-- ⚠️ **ES ADITIVA Y NO ROMPE EL BUILD QUE YA ESTÁ EN LÍNEA.** Aflojar un NOT
-- NULL nunca rechaza una fila que antes pasaba, y las dos columnas nuevas tienen
-- default. La app desplegada no las conoce y sigue insertando exactamente igual.
--
-- ⚠️ **Lo que esta migración NO trae, a propósito: pantalla.** No hay forma de
-- levantar una NC sin auditoría todavía; eso es F04·B1. Aquí sólo se pone el
-- esquema en su sitio para que B1 se escriba una vez. Es la excepción consciente
-- a la regla 11 de CLAUDE.md —«sin interruptores muertos»—: la columna no pinta
-- nada, pero tampoco es un interruptor; es el default de todo lo que ya existe.
--
-- Tres cosas se rompen si no se tocan aquí mismo, y las tres se ven sólo leyendo
-- el código de la Fase 03:
--   §3  `heredar_org_de_la_auditoria()` no tiene de dónde heredar la `org_id`.
--   §4  `sellar_folio_hallazgo()` lanza 23503 si no hay auditoría de la que
--       sacar el folio.
--   §5  el historial no registraría el cambio de fuente.
-- ============================================================================


-- ============================================================================
-- §1 · LAS COLUMNAS
-- ============================================================================

alter table public.hallazgos
  alter column auditoria_id drop not null;

alter table public.hallazgos
  add column fuente_nc      text,
  add column fuente_detalle text;

comment on column public.hallazgos.auditoria_id is
  'La auditoría, cuando la NC nace de una. NULL cuando nace de una queja, un incidente o un indicador — ver fuente_nc.';
comment on column public.hallazgos.fuente_nc is
  'De dónde salió la no conformidad (F-SG-06, primer campo). Los once valores salen del catálogo documental del cliente, no de la imaginación.';
comment on column public.hallazgos.fuente_detalle is
  'El texto libre de la fuente: qué queja, qué incidente, qué indicador. Obligatorio de hecho cuando la fuente es «otro», por convención de pantalla.';


-- ---------------------------------------------------------------- relleno --
-- ⚠️ **La fuente de lo que ya existe se DERIVA de `auditorias.tipo`, no se pone
-- toda en `auditoria_interna`.** La firma ya hace acompañamientos de
-- certificación y auditorías a proveedor: etiquetarlas como internas metería un
-- hallazgo de un organismo certificador en el conteo de auditoría interna del
-- informe, que es justo el número que la Dirección mira.
update public.hallazgos h
   set fuente_nc = case a.tipo
                     when 'certificacion_acompanamiento' then 'auditoria_externa'
                     when 'proveedor'                    then 'auditoria_proveedor'
                     else                                     'auditoria_interna'
                   end
  from public.auditorias a
 where a.id = h.auditoria_id;


-- ------------------------------------------------------------ los candados --
alter table public.hallazgos
  alter column fuente_nc set default 'auditoria_interna',
  alter column fuente_nc set not null;

alter table public.hallazgos
  add constraint hallazgos_fuente_valida check (fuente_nc in (
    -- Con auditoría de por medio: la NC salió de un recorrido nuestro.
    'auditoria_interna',      -- F-SG-11 · F-SG-12 · P-SG-03. El caso de siempre
    'auditoria_externa',      -- el organismo certificador, con Summit acompañando
    'auditoria_proveedor',    -- auditorías.tipo = 'proveedor'
    -- Sin auditoría: la NC salió de la operación del cliente.
    'queja_cliente',          -- F-SG-08 · F-SG-10 · P-SG-07
    'servicio_no_conforme',   -- P-SG-02 · F-SG-14 · F-AM-05
    'revision_direccion',     -- F-SG-18 Minuta de Revisión por la Dirección
    'seguimiento_interno',    -- F-SG-26 Checklist Seguimiento Interno
    'indicador',              -- F-SG-15 · F-SG-19. Un indicador bajo meta ES una NC
    'evaluacion_proveedor',   -- P-CO-02, sin auditoría de por medio
    'incidente',              -- sin formato en este cliente; es la fuente #1 en STPS/PC
    'otro'                    -- la válvula, con fuente_detalle al lado
  ));

-- ⚠️ **La partición no es decorativa: decide si el hallazgo sale en el informe.**
-- El `F-SG-12` se arma filtrando por `auditoria_id`. Sin este CHECK, una NC de
-- una queja con `auditoria_id` a mano se imprimiría como hallazgo de auditoría —
-- y al revés, una NC «de auditoría interna» sin auditoría no saldría en ningún
-- informe y desaparecería del expediente sin que nadie la borrara.
alter table public.hallazgos
  add constraint hallazgos_fuente_coherente check (
    (auditoria_id is not null)
    = (fuente_nc in ('auditoria_interna','auditoria_externa','auditoria_proveedor'))
  );

-- Un punto de la lista de verificación vive dentro de una auditoría. Sin este
-- CHECK, una NC de una queja podría citar el ítem de la auditoría de OTRO
-- cliente: `validar_referencia_de_la_org()` mira sitio, proceso y contacto, y
-- `item_id` nunca estuvo en esa lista porque hasta hoy lo garantizaba la FK a
-- la auditoría.
alter table public.hallazgos
  add constraint hallazgos_item_solo_con_auditoria check (
    item_id is null or auditoria_id is not null
  );


-- ============================================================================
-- §2 · ÍNDICE
--
-- El folio de la rama sin auditoría cuenta `max(consecutivo)` por organización.
-- El índice que ya había —`(auditoria_id, consecutivo)`— no sirve para eso.
-- ============================================================================

create index hallazgos_sin_auditoria_idx
  on public.hallazgos (org_id, consecutivo)
  where auditoria_id is null;


-- ============================================================================
-- §3 · LA `org_id` — el candado no se afloja, CAMBIA DE SITIO
--
-- `heredar_org_de_la_auditoria()` la sacaba de la auditoría y punto. Sin
-- auditoría no hay de dónde, así que la manda el cliente… y entonces la que
-- decide si esa organización es tuya es **la política de INSERT**, que ya
-- existe y ya lo hace: `with check (public.puedo_editar_org(org_id))`.
--
-- ⚠️ **La función nueva es SÓLO para `hallazgos`.**
-- `heredar_org_de_la_auditoria()` la comparten seis tablas más —`auditoria_
-- normas`, `_sitios`, `_procesos`, `_equipo`, `_agenda`, `_items`— y en todas
-- ellas la auditoría es obligatoria de verdad. Aflojarla ahí abriría seis
-- puertas para arreglar una.
--
-- ⚠️ **Y el trigger conserva su nombre, `hallazgos_org`.** Postgres dispara los
-- BEFORE de una misma operación en orden alfabético, y de ese orden depende que
-- `hallazgos_valida` compare contra una `org_id` ya puesta. Renombrarlo a algo
-- que caiga después de `_valida` rompería la guarda **en silencio**.
-- ============================================================================

create or replace function public.resolver_org_del_hallazgo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  -- Con auditoría: exactamente lo de antes.
  if new.auditoria_id is not null then
    select org_id into v_org from public.auditorias where id = new.auditoria_id;

    if v_org is null then
      raise exception 'La auditoría % no existe', new.auditoria_id
        using errcode = '23503';
    end if;

    new.org_id := v_org;
    return new;
  end if;

  -- Sin auditoría: la trae la fila. La política dirá si vale.
  if new.org_id is null then
    raise exception 'Un hallazgo sin auditoría tiene que traer su organización'
      using errcode = '23502';
  end if;

  -- ⚠️ Y no se mueve después. Cambiarle la organización a un hallazgo lo manda
  -- al expediente de otro cliente y deja su historial en el de origen — que es
  -- la fuga que el `with check` de la política existe para tapar (docs/08 §2).
  -- Con auditoría esto lo impedía la FK; sin ella hay que decirlo.
  if tg_op = 'UPDATE' and old.auditoria_id is null
     and new.org_id is distinct from old.org_id then
    raise exception 'La organización de un hallazgo no se cambia'
      using errcode = '42501';
  end if;

  return new;
end
$$;

comment on function public.resolver_org_del_hallazgo is
  'La org_id de un hallazgo: de su auditoría cuando la tiene, de la propia fila cuando no. Quien valida la segunda es la política de INSERT.';

drop trigger if exists hallazgos_org on public.hallazgos;
create trigger hallazgos_org
  before insert or update on public.hallazgos
  for each row execute function public.resolver_org_del_hallazgo();


-- ============================================================================
-- §4 · EL FOLIO — dos series, y la segunda también se compone sin red
--
-- `AUD-2026-014/H-03` no se puede componer sin AUD. La NC que no nace de una
-- auditoría estrena serie propia: **`NC-2026-007`, por organización y año**.
--
-- ⚠️ **Se cuenta por ORGANIZACIÓN, al revés que el folio de una auditoría.** El
-- de la auditoría es el consecutivo de la firma —`AUD-2026-014` es la
-- decimocuarta auditoría de Summit, no la del cliente— y por eso hubo que
-- partirlo a mano con `DEMO-` en `A10`. Éste es el consecutivo **del cliente**:
-- «la séptima no conformidad de esta planta este año» es lo que su Coordinador
-- del SGC lleva en su `F-SG-17`. Y como cuelga de `org_id`, **la partición de
-- pruebas sale gratis**: una organización de demostración es otra organización.
--
-- ⚠️ **La regla de renumerar en vez de rechazar se conserva.** Una NC de una
-- queja se captura en la oficina, sí — pero también en la planta, en la reunión
-- de cierre, y sin señal. Si dos personas levantan el mismo consecutivo, la base
-- renumera al llegar; nunca rechaza. Un número corrido se edita, una NC perdida
-- no se recupera (§8.7).
-- ============================================================================

create or replace function public.sellar_folio_hallazgo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folio_auditoria text;
  v_anio            int;
  v_demo            boolean;
  v_prefijo         text;
begin
  -- ── Rama 1 · el hallazgo de una auditoría. Sin un cambio desde F03·B4. ────
  if new.auditoria_id is not null then
    select folio into v_folio_auditoria
      from public.auditorias where id = new.auditoria_id;

    if v_folio_auditoria is null then
      raise exception 'La auditoría % no existe', new.auditoria_id
        using errcode = '23503';
    end if;

    perform pg_advisory_xact_lock(
      hashtext('folio_hallazgo_' || new.auditoria_id::text));

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
  end if;

  -- ── Rama 2 · la NC que no nace de una auditoría. ──────────────────────────

  -- ⚠️ `current_date` NO, por lo mismo que en `asignar_folio_auditoria()`: la
  -- base corre en UTC y a las 19:00 de México ya es el día siguiente. Y manda
  -- `detectado_en` —el reloj de quien la levantó— y no `now()`, que es la regla
  -- de las fechas de campo de la Fase 03.
  v_anio := extract(year from coalesce(
              new.detectado_en at time zone 'America/Mexico_City',
              now()            at time zone 'America/Mexico_City'))::int;

  -- El prefijo `DEMO-NC-` conserva las DOS señales: que es de la partición de
  -- pruebas y que no salió de una auditoría. `A10` cambia `AUD` por `DEMO`
  -- porque `auditorias.folio` es UNIQUE global; aquí no hay colisión que evitar
  -- —la serie ya es por organización—, sólo la pregunta de «¿esto que estoy
  -- borrando es del cliente o es de mentira?», que sí hay que poder contestar.
  select o.es_demo into v_demo
    from public.organizaciones o
   where o.id = new.org_id;

  if v_demo is null then
    raise exception 'La organización % no existe', new.org_id using errcode = '23503';
  end if;

  v_prefijo := case when v_demo then 'DEMO-NC' else 'NC' end;

  perform pg_advisory_xact_lock(
    hashtext('folio_nc_' || new.org_id::text || '_' || v_anio::text));

  if new.consecutivo is null or new.consecutivo < 1 or exists (
    select 1 from public.hallazgos
     where org_id       = new.org_id
       and auditoria_id is null
       and consecutivo  = new.consecutivo
       and folio ~ ('^' || v_prefijo || '-' || v_anio::text || '-[0-9]+$')
  ) then
    select coalesce(max(consecutivo), 0) + 1
      into new.consecutivo
      from public.hallazgos
     where org_id       = new.org_id
       and auditoria_id is null
       and folio ~ ('^' || v_prefijo || '-' || v_anio::text || '-[0-9]+$');
  end if;

  new.folio := format('%s-%s-%s', v_prefijo, v_anio::text, lpad(new.consecutivo::text, 3, '0'));
  return new;
end
$$;

comment on function public.sellar_folio_hallazgo is
  'AUD-2026-014/H-03 cuando nace de una auditoría; NC-2026-007 —por organización y año— cuando no. Renumera en vez de rechazar en las dos ramas.';

-- ⚠️ **EL FOLIO SE CONGELA AL NACER, Y SE QUEDA ASÍ A PROPÓSITO.** El trigger es
-- `before insert`, no `before insert or update`: mover un hallazgo de una
-- auditoría a otra —o desprenderlo de la suya— **no le recalcula el folio**, así
-- que puede quedar un `AUD-2026-001/H-01` colgado de otra auditoría o de ninguna.
--
-- No es un descuido y no se arregla aquí. Es la misma decisión que `nc_previas`
-- en el programa anual: **un folio ya emitido es lo que el cliente tiene en su
-- copia del `F-SG-12`**, y reescribirlo en noviembre cambiaría un documento que
-- la firma entregó en enero. El rastro existe igual — desde §5, mover un hallazgo
-- de auditoría deja renglón en `hallazgos_historial`.
--
-- Lo que sí hace falta es que **B1 lo diga en pantalla** al reclasificar: «este
-- hallazgo conserva el folio AUD-2026-001/H-01 porque ya se emitió». Un folio que
-- miente en silencio es peor que uno corrido.


-- ============================================================================
-- §5 · EL HISTORIAL — reclasificar la FUENTE deja renglón
--
-- ⚠️ Cambiarle la fuente a una NC es tan reclasificación como cambiarle el tipo,
-- y es más delicada: mueve el hallazgo dentro o fuera del informe de una
-- auditoría. Sin este renglón, una NC podría entrar al `F-SG-12` de una
-- auditoría ya emitida sin dejar rastro de que antes era una queja.
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
      -- Nuevos en la Fase 04.
      ('fuente_nc',               old.fuente_nc,                                   new.fuente_nc),
      ('fuente_detalle',          old.fuente_detalle,                              new.fuente_detalle),
      ('auditoria_id',            old.auditoria_id::text,                          new.auditoria_id::text)
    ) as c(campo, antes, despues)
   where c.antes is distinct from c.despues;

  return null;
end
$$;

comment on function public.registrar_historial_hallazgo is
  'Una fila de hallazgos_historial por cada campo que cambió, la fuente y la auditoría incluidas. Lo escribe la base: el historial es el producto, no higiene.';
