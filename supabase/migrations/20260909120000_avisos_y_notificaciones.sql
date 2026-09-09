-- ============================================================================
-- F04·B3 + B4 · AVISOS: SUSCRIPCIONES PUSH, PREFERENCIAS Y EL CRON DIARIO
--
-- Lo que cierra la Fase 04. Su criterio de cierre lo dice con estas palabras:
-- «el responsable **recibe la notificación en su teléfono**. A los 12 días le
-- llega el aviso de "vence en 3"». Todo lo demás de ese criterio ya está y lo
-- impone la base; esto es lo único que faltaba.
--
-- ⚠️ **Va DESPUÉS de `20260908120000_acciones_y_ciclo_de_mejora.sql`**, que crea
-- `acciones` — la tabla que el cron recorre.
--
-- ⚠️ **LAS CATEGORÍAS SALEN DE LA MATRIZ DEL CLIENTE, NO DEL PLAN.** `P-SG-08`
-- §5.5 tabula qué se comunica, cuándo, a quién y quién comunica: doce renglones
-- con cadencias reales. Puesta contra ella, la lista de `docs/02` fallaba en tres
-- cosas —hueco 27 del catálogo—:
--   · el cliente **no pide «resumen diario»**: vive en mensual, bimestral y por
--     evento. Nuestro resumen se queda —es criterio de Summit y sirve— pero deja
--     de ser la única cadencia.
--   · «acción por vencer / vencida» no está como evento: el cliente pide
--     **«Estado de las NC», BIMESTRAL**. Las dos conviven: la nuestra avisa al
--     responsable, la suya informa al personal involucrado.
--   · **faltaban cuatro que el cliente sí pide**: resultados de indicadores
--     (mensual), queja de cliente recibida (por evento y **a Dirección**),
--     satisfacción de clientes y documento publicado o cambiado.
-- Ficha: `docs/formatos_informeAuditorias/P-SG-08_comunicacion.md`.
--
-- ⚠️ **Es aditiva.** Dos tablas nuevas, dos columnas con default y un CHECK que
-- se **amplía**. El despliegue en línea no conoce nada de esto y sigue igual.
-- ============================================================================


-- ============================================================================
-- §1 · `push_suscripciones` — por usuario Y POR DISPOSITIVO
--
-- ⚠️ **Por dispositivo, no por usuario**, y es la diferencia que decide si esto
-- sirve: un consultor tiene el teléfono en la planta y la laptop en la oficina, y
-- el aviso de «vence en 3» tiene que llegarle al que trae encima. Una fila por
-- usuario dejaría fuera al otro sin decir nada.
--
-- ⚠️ **El `endpoint` es la identidad, no el usuario.** Lo emite el navegador y
-- cambia cuando el service worker se reinstala; por eso es UNIQUE y por eso la
-- misma persona puede tener varias filas vivas.
-- ============================================================================

create table public.push_suscripciones (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references public.usuarios(id) on delete cascade,
  -- La URL que el navegador da para empujarle. Es la llave de todo.
  endpoint       text not null unique,
  -- Las dos claves del cifrado de Web Push. Sin ellas el mensaje no se puede
  -- firmar y el navegador lo descarta.
  p256dh         text not null,
  auth           text not null,
  -- Para que alguien pueda reconocer cuál es cuál al desactivar uno.
  descripcion    text,
  -- ⚠️ Se DESACTIVA, no se borra, cuando el servicio de push devuelve 404/410:
  -- así queda el rastro de que ese dispositivo existió, que es lo que explica un
  -- «no me llegó nada» tres semanas después.
  activa         boolean not null default true,
  fallos         int not null default 0,
  ultimo_envio_en timestamptz,
  creado_en      timestamptz not null default now()
);

comment on table public.push_suscripciones is
  'Una fila por dispositivo, no por usuario: el aviso tiene que llegar al aparato que la persona trae encima. Se desactiva al fallar, no se borra.';


-- ============================================================================
-- §2 · LAS CATEGORÍAS — la matriz de `P-SG-08` §5.5
-- ============================================================================

alter table public.notificaciones drop constraint notificaciones_categoria_check;

alter table public.notificaciones
  add constraint notificaciones_categoria_check check (categoria in (
    -- ── Las nuestras, que el cliente no tabula pero la firma necesita ───────
    'hallazgo_asignado',        -- «Resultados de Auditorías», por evento ✅ sí la pide
    'accion_por_vencer',        -- criterio de Summit: avisa al responsable
    'accion_vencida',           -- criterio de Summit
    'obligacion_proxima',       -- criterio de Summit [F05]
    'resumen_diario',           -- criterio de Summit; el cliente no lo pide
    'evidencia_evaluada',
    'documento_por_aprobar',    -- «Procedimientos del SGC», ante aprobación ✅
    -- ── Las cuatro que faltaban, y las pide el cliente ──────────────────────
    'indicadores_mensual',      -- P-SG-08: resultados de indicadores, MENSUAL
    'queja_recibida',           -- P-SG-08: por evento, **a Dirección**
    'satisfaccion_cliente',     -- P-SG-08: por evento
    'documento_publicado',      -- P-SG-08: a los responsables de proceso
    -- ── Y la cadencia propia del cliente para las NC ────────────────────────
    'estado_nc_bimestral'       -- P-SG-08: «Estado de las NC», BIMESTRAL
  ));

-- ⚠️ **`clave_evento` es lo que hace idempotente al cron.** Corre todos los días;
-- sin esto, «vence en 3» se mandaría el día 12, el 13 y el 14. La clave describe
-- el hecho, no el momento: `accion:<id>:vence_3`. Con el índice único, el segundo
-- intento no inserta y no avisa.
alter table public.notificaciones
  add column clave_evento text,
  add column registro_id  text;

create unique index notificaciones_evento_idx
  on public.notificaciones (usuario_id, clave_evento)
  where clave_evento is not null;

comment on column public.notificaciones.clave_evento is
  'Idempotencia del cron: describe el HECHO, no el momento. accion:<id>:vence_3. Con el índice único, el aviso se manda una vez.';


-- ============================================================================
-- §3 · LAS PREFERENCIAS — un `jsonb` en `usuarios`, no una tabla
--
-- ⚠️ **Una tabla `(usuario, categoria)` necesitaría un índice único que no es la
-- PK**, y ahí la cola resuelve sus `upsert` por la PK (§6.1): apagar dos
-- categorías sin señal llegaría con otro `id` y chocaría contra el índice, con un
-- rechazo media hora después y nadie mirando. Es la misma decisión que
-- `config_firma.plantillas` y que `acciones.meses`.
--
-- Y además: apagar tres categorías es **una** escritura, no tres.
--
-- Forma: `{"resumen_diario": false, "accion_por_vencer": true}`. Lo que no esté
-- se considera **encendido** — un aviso que nadie apagó se manda, porque el
-- silencio por omisión es el fallo que hace inútil un sistema de avisos.
-- ============================================================================

alter table public.usuarios
  add column preferencias_aviso jsonb not null default '{}'::jsonb;

comment on column public.usuarios.preferencias_aviso is
  'Qué categorías tiene apagadas. Lo ausente está ENCENDIDO: el silencio por omisión es lo que hace inútil un sistema de avisos.';

-- ¿Le mando esta categoría a esta persona?
create or replace function public.quiere_aviso(p_usuario uuid, p_categoria text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (u.preferencias_aviso ->> p_categoria)::boolean
       from public.usuarios u
      where u.id = p_usuario and u.activo),
    -- Ausente = encendido. Y una cuenta inactiva no recibe nada: el `and
    -- u.activo` de arriba devuelve cero filas y el coalesce cae aquí, así que
    -- hace falta comprobarlo aparte.
    (select u.activo from public.usuarios u where u.id = p_usuario),
    false
  )
$$;


-- ============================================================================
-- §4 · `correr_avisos_programados()` — TODA la lógica vive aquí
--
-- `docs/02` lo fijó así y se cumple: **la ruta de cron sólo hace el fan-out de
-- push**. Los motivos son dos y los dos importan:
--   · esta función necesita ver las acciones de TODAS las organizaciones para
--     contar vencimientos, y eso desde el navegador no se puede — es
--     `SECURITY DEFINER` y corre fuera del RLS, igual que
--     `asignar_folio_auditoria()`.
--   · si mañana el cron se dispara desde otro sitio, la lógica no se muda.
--
-- ⚠️ **Las fechas se comparan como `date`, nunca con `new Date()`** — es una
-- columna `date` y aquí un día decide si algo está vencido (CLAUDE.md · trampas
-- heredadas). Y el «hoy» sale de México, no de UTC: a las 19:00 la base ya está
-- en el día siguiente.
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
  --
  -- ⚠️ Los tres avisos son a 7, 3 y 1 día, y **cada uno con su propia clave**:
  -- así los tres se mandan una vez cada uno, y no tres veces el mismo día 3.
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
  --
  -- ⚠️ **Una sola vez, el día que vence**, no todos los días a partir de ahí.
  -- Un aviso que se repite indefinidamente se silencia, y con él se silencian
  -- los que sí importaban. El seguimiento de una vencida es la pantalla, no el
  -- teléfono.
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
  --
  -- ⚠️ **La cadencia es del cliente, no nuestra**, y por eso no es un cron
  -- nuevo: el plan Hobby de Vercel da exactamente dos y están ocupados. Se
  -- cuelga del diario con su propia comprobación de fecha — día 1 de los meses
  -- impares —, que es lo que `P-SG-08` §2 dejó anotado.
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

  -- ⚠️ **Los avisos de indicadores (mensual), satisfacción y documento publicado
  -- NO se generan todavía**, y es a propósito: `mediciones` y el `F-SG-13` son de
  -- las Fases 02 y 06, y un aviso que no tiene de dónde leer es un interruptor
  -- muerto (regla 11). La categoría existe en el CHECK porque ampliarlo aquí
  -- cuesta cero y aparte cuesta otra migración; el disparador entra con su fase.

  -- ── Lo que la ruta tiene que empujar ──────────────────────────────────────
  -- Sólo lo NUEVO de esta corrida: lo de ayer ya se mandó.
  return query
    select n.usuario_id, n.categoria, n.titulo, n.cuerpo, n.enlace
      from public.notificaciones n
     where n.creado_en >= now() - interval '5 minutes'
       and n.leida_en is null;
end
$$;

comment on function public.correr_avisos_programados is
  'El cron diario: acciones por vencer y vencidas, y el «Estado de las NC» bimestral de P-SG-08. Idempotente por clave_evento. Devuelve lo que hay que empujar.';

revoke all on function public.correr_avisos_programados() from public, anon, authenticated;


-- ============================================================================
-- §5 · EL RESUMEN DE LA MAÑANA — el segundo cron
--
-- ⚠️ **Es criterio de Summit, no del cliente**: `P-SG-08` no pide resumen diario.
-- Se queda porque un consultor que lleva ocho clientes abre la app a las 8:00 y
-- necesita saber qué le toca — pero deja de ser la única cadencia, que es lo que
-- el hueco 27 corrigió.
-- ============================================================================

create or replace function public.armar_resumen_diario()
returns TABLE (usuario_id uuid, titulo text, cuerpo text)
language sql
stable
security definer
set search_path = public
as $$
  with hoy as (select (now() at time zone 'America/Mexico_City')::date as d)
  select
    u.id,
    'Tu día en SummitApp',
    format('%s acción%s vencida%s, %s vence%s esta semana.',
           count(*) filter (where a.fecha_compromiso < (select d from hoy)),
           case when count(*) filter (where a.fecha_compromiso < (select d from hoy)) = 1 then '' else 'es' end,
           case when count(*) filter (where a.fecha_compromiso < (select d from hoy)) = 1 then '' else 's' end,
           count(*) filter (where a.fecha_compromiso between (select d from hoy) and (select d from hoy) + 7),
           case when count(*) filter (where a.fecha_compromiso between (select d from hoy) and (select d from hoy) + 7) = 1 then '' else 'n' end)
  from public.usuarios u
  join public.acciones a on a.responsable_id = u.id
  where u.activo
    and a.estado in ('abierta','en_proceso','por_verificar')
    and public.quiere_aviso(u.id, 'resumen_diario')
  group by u.id
  -- Sin nada que contar no se manda: un resumen que dice «no tienes nada» todos
  -- los días es el que hace que se desactiven las notificaciones.
  having count(*) > 0
$$;

comment on function public.armar_resumen_diario is
  'El digest de la mañana. NO inserta en notificaciones: es efímero, se empuja y se olvida. Sin nada que contar, no se manda.';

revoke all on function public.armar_resumen_diario() from public, anon, authenticated;


-- ============================================================================
-- §6 · ÍNDICES, TRIGGERS Y RLS
-- ============================================================================

create index push_suscripciones_usuario_idx
  on public.push_suscripciones (usuario_id) where activa;

-- ⚠️ `notificaciones` NO estrena índice: `notificaciones_usuario_idx` existe
-- desde la primera migración sobre `(usuario_id, leida_en)` y cubre lo que hace
-- falta. Uno más sería peso en cada inserción del cron sin nadie que lo use — la
-- bandeja de notificaciones todavía no está construida.

create index acciones_responsable_vence_idx
  on public.acciones (responsable_id, fecha_compromiso)
  where estado in ('abierta','en_proceso','por_verificar');

alter table public.push_suscripciones enable row level security;

-- ⚠️ **Cada quien ve y borra sólo las suyas**, y no hay rama de socio: la
-- suscripción de otro es su teléfono. Es la única tabla del proyecto que no
-- filtra por organización — no tiene ninguna, cuelga de la persona.
create policy "push_suscripciones_select" on public.push_suscripciones
  for select to authenticated using (usuario_id = auth.uid());

create policy "push_suscripciones_insert" on public.push_suscripciones
  for insert to authenticated with check (usuario_id = auth.uid());

create policy "push_suscripciones_update" on public.push_suscripciones
  for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- Desuscribirse es quitar el permiso a un aparato: eso sí se borra.
create policy "push_suscripciones_delete" on public.push_suscripciones
  for delete to authenticated using (usuario_id = auth.uid());

create trigger push_suscripciones_bitacora
  after insert or update or delete on public.push_suscripciones
  for each row execute function public.registrar_bitacora();


-- ============================================================================
-- §7 · LOS PLAZOS POR DEFECTO — `E03`, decidido el 2 sep 2026
--
-- ⚠️ **DÍAS HÁBILES, no naturales.** `P-SG-03` §5.5 lo dice por escrito —«15 días
-- hábiles»— y es lo que el cliente va a alegar cuando se le reclame un plazo
-- vencido. Un plazo de 15 naturales vence **cinco días antes** que uno de 15
-- hábiles: la app estaría marcando en rojo acciones que según el procedimiento de
-- la firma siguen en tiempo.
--
-- ⚠️ El escalonado 15/30/60/90 es **criterio de Summit**, no del cliente:
-- `P-SG-05` sólo fija los 15 hábiles del análisis de causa. Por eso vive en
-- `config_firma` y no en un CHECK.
-- ============================================================================

update public.config_firma
   set plazos_default = jsonb_build_object(
         'unidad', 'habiles',
         'nc_mayor', 15,
         'nc_menor', 30,
         'observacion', 60,
         'oportunidad_mejora', 90)
 where id = 1
   and plazos_default = '{}'::jsonb;
