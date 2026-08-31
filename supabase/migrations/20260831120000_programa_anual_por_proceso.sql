-- ============================================================================
-- F03·B6a + B6b · El programa anual, por proceso — `alcance` y la regla de
-- frecuencia del F-SG-09
--
-- Los dos cambios salen de leer el formato oficial de la firma, que llegó el
-- 31 ago 2026 en la segunda tanda de documentos
-- (docs/formatos_informeAuditorias/F-SG-09_programa_anual.md).
--
-- ⚠️ Va DESPUÉS de `20260824120000_auditorias_y_hallazgos.sql` —que crea
-- `programa_auditorias`, `tocar_actualizado_en()` y `registrar_bitacora()`— y de
-- `20260825120000_particion_de_pruebas.sql`, de donde sale la forma que llevan
-- las políticas nuevas (§4).
--
-- ⚠️ **Es puramente aditiva.** Una columna nullable y una tabla nueva: el build
-- que ya está en línea no las conoce y sigue funcionando igual mientras se
-- despliega el que sí.
-- ============================================================================


-- ============================================================================
-- §1 · `programa_auditorias.alcance` — el tercer texto de encuadre
-- ============================================================================
--
-- El F-SG-09 imprime **criterios, alcance y objetivo** juntos, arriba de la
-- parrilla, y hasta hoy sólo dos de los tres estaban en la tabla. Es el mismo
-- hueco que `20260830120000` cerró en `auditorias`, y por el mismo motivo: el
-- formato lo pide de primero y no había de dónde sacarlo.
--
-- ⚠️ **No se puede tomar prestado el de la auditoría.** El programa se escribe
-- en enero, **antes de que exista ninguna auditoría del año**, y su alcance es
-- el de la organización entera —«todo el personal del grupo, compuesto por las
-- tres unidades»—, no el de una visita concreta. Derivarlo de `auditorias`
-- dejaría el campo vacío justo cuando se imprime, que es al aprobar el programa.
alter table public.programa_auditorias
  add column alcance text;

comment on column public.programa_auditorias.alcance is
  'Qué abarca el programa del año: personal, unidades, sitios. Distinto del alcance de una auditoría concreta, que es de esa visita. Se imprime en F-SG-09.';


-- ============================================================================
-- §2 · `programa_procesos` — la regla de frecuencia
-- ============================================================================
--
-- P-SG-03 §5.2 dice de qué depende la frecuencia de auditoría de un proceso, y
-- el F-SG-09 lo aterriza en una fórmula. **Las dos no dicen lo mismo**, y ésta
-- es la decisión que hay que no deshacer:
--
--   · El TEXTO del procedimiento dice «valor × NC = cantidad de auditorías».
--   · El ARCHIVO calcula `Puntos = valor × NC` y luego
--     `Auditorías = IF(Puntos <= 5, 1, 2)`.
--
-- Con 4 NC en un proceso de servicio (valor 2), el texto pide **8 auditorías** y
-- la hoja pide **2**. **Manda la hoja** (decisión del dueño, 31 ago 2026): es el
-- artefacto que la firma llena todos los años; el párrafo se redactó una vez y
-- está mal. Ver F-SG-09 §3.1.
--
-- ⚠️ **Y por eso el tope de 2 es un CHECK y no una validación de pantalla.** Un
-- 8 escrito a mano en esta columna sería la prosa del procedimiento colándose
-- por una captura, y el programa saldría impreso pidiendo ocho auditorías de un
-- proceso que la firma audita dos veces.

-- Valida `meses`: un array de `{ "mes": 1..12, "modalidad": "interna"|"externa" }`.
--
-- ⚠️ **Los meses van en una columna y no en una tabla hija**, y no es pereza.
-- Una tabla `(programa_proceso_id, mes)` necesitaría un índice único que **no es
-- la clave primaria**, y ahí la cola offline resuelve sus `upsert` por la PK: un
-- segundo cambio sin señal llegaría con otro `id` y chocaría contra el índice
-- media hora después y sin nadie mirando (CLAUDE.md §6.1, la misma trampa que
-- `requisitos` y `mediciones`). Además el gesto real es tocar celdas de una
-- parrilla de 11×12: con tabla hija, marcar seis meses son seis operaciones de
-- la cola; con una columna, una.
--
-- ⚠️ `coalesce` en la modalidad a propósito: sin él, un objeto sin esa llave
-- daría `null` en el `not in`, el `where` no sería cierto, y la fila inválida
-- pasaría el CHECK sin que nadie se enterara.
create or replace function public.meses_de_programa_validos(p jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_catalog
as $$
  select jsonb_typeof(p) = 'array'
     and not exists (
       select 1
       from jsonb_array_elements(p) as e
       where jsonb_typeof(e) <> 'object'
          or coalesce(e ->> 'mes', '') !~ '^(1[0-2]|[1-9])$'
          or coalesce(e ->> 'modalidad', '') not in ('interna', 'externa')
     )
$$;

comment on function public.meses_de_programa_validos(jsonb) is
  'Forma de programa_procesos.meses: array de {mes: 1..12, modalidad: interna|externa}.';


create table public.programa_procesos (
  id            uuid primary key default gen_random_uuid(),
  -- La pone `heredar_org_del_programa()`, que además comprueba que el proceso
  -- sea de la misma organización (§3).
  org_id        uuid not null references public.organizaciones(id) on delete cascade,
  programa_id   uuid not null references public.programa_auditorias(id) on delete cascade,
  -- RESTRICT: un programa aprobado es evidencia de ISO 9001 §9.2.2, y borrar un
  -- proceso no puede llevarse por delante el renglón que lo justifica.
  proceso_id    uuid not null references public.procesos(id) on delete restrict,

  -- 2 = proceso del servicio · 1 = proceso de soporte (F-SG-09, leyenda).
  --
  -- ⚠️ **Se GUARDA, no se deriva de `procesos.tipo`.** Nuestro enum es
  -- `estrategico/operativo/soporte` y el del formato es «del servicio» vs «de
  -- soporte», que se parecen pero no son lo mismo: en el ejemplo de la firma,
  -- Compras y Transporte valen 1 aunque en muchos SGC serían operativos, y el
  -- propio proceso de SGC vale 1 aunque gobierne todo. «Proceso del servicio» es
  -- un juicio de la firma sobre ese cliente. La pantalla lo propone; aquí se
  -- guarda lo que decidió el consultor.
  valor         int  not null check (valor in (1, 2)),

  -- No conformidades del evento anterior. La pantalla ofrece traerlas de
  -- `hallazgos`, pero la columna se guarda por tres motivos que aparecen el
  -- primer año: un cliente nuevo no tiene año anterior y trae su número del
  -- Excel; una NC puede venir de fuera de una auditoría interna; y sobre todo
  -- **el programa se aprueba y queda como evidencia** — si el número se
  -- recalculara solo, anular un hallazgo en noviembre reescribiría un programa
  -- que la Dirección firmó en enero.
  nc_previas    int  not null default 0 check (nc_previas >= 0),

  -- ⚠️ Las dos generadas son SEGURAS: multiplicación de enteros y un `case`
  -- sobre enteros son IMMUTABLE. No es el caso de `fecha::text`, que revienta
  -- con 42P17 (CLAUDE.md · Trampas heredadas).
  --
  -- ⚠️ Y `auditorias_requeridas` repite la expresión en vez de leer `puntos`:
  -- Postgres no deja que una columna generada referencie a otra.
  puntos        int generated always as (valor * nc_previas) stored,
  auditorias_requeridas int generated always as
                  (case when valor * nc_previas <= 5 then 1 else 2 end) stored,

  meses         jsonb not null default '[]'::jsonb
                check (public.meses_de_programa_validos(meses)),

  orden         int  not null default 0,

  -- ⚠️ No es decorativa. El procedimiento permite subir la frecuencia por cuatro
  -- motivos que la fórmula no ve —cambios al sistema, caída de efectividad,
  -- cambio de normatividad, mejora continua—. Si alguien sube el número a mano,
  -- el papel tiene que decir por qué: el año siguiente, nadie sabe si fue
  -- criterio o un dedazo.
  nota          text,

  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por    uuid references public.usuarios(id),

  -- ⚠️ UNIQUE que NO es la clave primaria → la pantalla elige `insert` o
  -- `update` mirando la caché y **nunca hace `upsert`**. Misma regla que
  -- `requisitos (proyecto_id, clausula_id)` y `mediciones (indicador_id,
  -- periodo)`.
  constraint programa_procesos_unicos unique (programa_id, proceso_id)
);

comment on table public.programa_procesos is
  'El renglón por proceso del F-SG-09: su valor, las NC del año anterior, cuántas auditorías le tocan y en qué meses. La fórmula sale del archivo de la firma, no del texto de P-SG-03 §5.2.';

comment on column public.programa_procesos.auditorias_requeridas is
  'Calculada: 1 si puntos <= 5, si no 2. Nunca más de 2 — es lo que hace el F-SG-09.';


-- ============================================================================
-- §3 · La organización se hereda, y el proceso se valida
-- ============================================================================
--
-- ⚠️ Las dos cosas en el mismo trigger porque son la misma pregunta: de qué
-- cliente es este renglón. Sin la segunda mitad, un editor podría colgar del
-- programa de un cliente un proceso de otro — y ese renglón se imprimiría en el
-- programa anual que se le entrega, con el nombre de un proceso que no es suyo.
create or replace function public.heredar_org_del_programa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org     uuid;
  v_proceso uuid;
begin
  select org_id into v_org from public.programa_auditorias where id = new.programa_id;

  if v_org is null then
    raise exception 'El programa % no existe', new.programa_id
      using errcode = '23503';
  end if;

  new.org_id := v_org;

  select org_id into v_proceso from public.procesos where id = new.proceso_id;

  if v_proceso is distinct from v_org then
    raise exception 'Ese proceso no pertenece a la organización del programa'
      using errcode = '23514';
  end if;

  return new;
end
$$;


-- ============================================================================
-- §4 · Índices, triggers y RLS
-- ============================================================================

-- Por programa y en el orden del papel: es como se lee y como se imprime.
create index programa_procesos_programa_idx on public.programa_procesos (programa_id, orden);
create index programa_procesos_org_idx      on public.programa_procesos (org_id);

create trigger programa_procesos_org
  before insert or update on public.programa_procesos
  for each row execute function public.heredar_org_del_programa();

create trigger programa_procesos_actualizado_en
  before update on public.programa_procesos
  for each row execute function public.tocar_actualizado_en();

create trigger programa_procesos_bitacora
  after insert or update or delete on public.programa_procesos
  for each row execute function public.registrar_bitacora();

alter table public.programa_procesos enable row level security;

-- ⚠️ **Sin `or public.es_socio()`.** Desde `20260825120000` la rama del socio
-- vive DENTRO de `mis_organizaciones()`, ya filtrada por partición; volver a
-- escribirla suelta aquí reabriría la puerta lateral que esa migración cerró en
-- 32 políticas — un socio de pruebas vería los clientes reales (CLAUDE.md,
-- regla 1).
create policy "programa_procesos_select" on public.programa_procesos for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

create policy "programa_procesos_insert" on public.programa_procesos for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "programa_procesos_update" on public.programa_procesos for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- ⚠️ Se borra sólo mientras el programa esté en borrador — **exactamente la
-- misma regla que su padre**, ni más estricta ni más laxa. Un programa aprobado
-- es un registro de ISO 9001 §9.2.2: si sus renglones se pudieran quitar, la
-- justificación del número de auditorías del año desaparecería sin dejar rastro.
create policy "programa_procesos_delete" on public.programa_procesos for delete to authenticated
  using (public.puedo_editar_org(org_id)
     and exists (select 1
                   from public.programa_auditorias p
                  where p.id = programa_procesos.programa_id
                    and p.estado = 'borrador'));
