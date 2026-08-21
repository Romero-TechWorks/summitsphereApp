-- ============================================================================
-- FASE 01 · Cartera — sitios, contactos, proyectos, alcance y bitácora
--
-- La migración que hace real la multi-tenencia. Hasta aquí el RLS sólo cuidaba
-- preferencias de tablero; a partir de esta migración cuida el expediente de
-- cada cliente de la firma, y **un hallazgo de la planta A no le puede aparecer
-- al contacto de la planta B** (CLAUDE.md · regla 1).
--
--     auth.uid() → usuarios_organizaciones → mis_organizaciones()
--                → POLICY ... USING (org_id IN (SELECT ...))
--
-- ⚠️ Convenciones que NO se rompen (las mismas de la primera migración):
--   · Toda tabla de dominio: `org_id NOT NULL` + RLS + políticas `TO authenticated`.
--   · Catálogos con `text` + CHECK, cero enums de dominio (§4.2).
--   · Fechas de calendario `date`; instantes `timestamptz`.
--   · Los UPDATE llevan USING **y** WITH CHECK: sin WITH CHECK, quien puede
--     editar una fila puede cambiarle el `org_id` y mandarla a otro expediente.
--   · Nada se borra: se desactiva, se cierra o se cancela (§4.3).
--
-- ⚠️ Alcance: esta migración trae **toda la Fase 01 de una vez** —también las
-- tablas de F01·B2 (proyectos y alcance) y las del catálogo de normas que llena
-- el importador de F01·B2b—, para que el dueño aplique una sola migración y
-- regenere los tipos una sola vez. Las pantallas llegan bloque por bloque.
--
-- ⚠️ `normas` y `norma_clausulas` nacen **VACÍAS**: el catálogo de Summit no se
-- siembra desde el repositorio, se sube como archivo `.md` y se indexa desde la
-- app (F01·B2b). Es lo que mantiene el criterio técnico de la firma fuera de
-- Git —CLAUDE.md regla 12— y lo que permite corregir un resumen sin una
-- migración.
-- ============================================================================

-- ============================================================================
-- §1 · FUNCIONES DE APOYO
-- ============================================================================

-- Quién puede ESCRIBIR en una organización, no sólo verla.
--
-- `mis_organizaciones()` contesta "¿la ve?"; esto contesta "¿la toca?". La
-- diferencia es la columna `papel` de `usuarios_organizaciones`, que hasta hoy
-- existía sin consecuencias: `lectura` es exactamente eso —el consultor que
-- entra a consultar un expediente que no lleva— y sin esta función el papel
-- sería un adorno (CLAUDE.md · regla 11: nada de interruptores muertos).
--
-- ⚠️ STABLE y SECURITY DEFINER por la misma razón que `mis_organizaciones()`:
-- consulta `usuarios_organizaciones` desde una política, así que tiene que
-- salirse del RLS una vez y en un sitio auditado, o Postgres devuelve
-- "infinite recursion detected in policy". Y VOLATILE se evaluaría una vez por
-- fila.
create or replace function public.puedo_editar_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_socio() or exists (
    select 1
      from public.usuarios_organizaciones
     where usuario_id = auth.uid()
       and org_id     = p_org
       and papel     <> 'lectura'
  )
$$;

-- La `org_id` de lo que cuelga de un proyecto NO la manda el cliente: se hereda
-- del proyecto.
--
-- ⚠️ Dos cosas a la vez, y las dos importan. Una: el navegador no tiene por qué
-- saber la organización de un proyecto, y pedírsela es abrir la puerta a que
-- mande otra. Dos: aunque la mandara bien, `WITH CHECK` sólo comprueba que sea
-- una organización SUYA — no que sea la del proyecto. Un consultor con dos
-- clientes podría colgar el alcance del proyecto de uno en el expediente del
-- otro sin violar ninguna política.
create or replace function public.heredar_org_del_proyecto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.proyectos where id = new.proyecto_id;

  if v_org is null then
    raise exception 'El proyecto % no existe', new.proyecto_id
      using errcode = '23503';
  end if;

  new.org_id := v_org;
  return new;
end
$$;

-- Un sitio en el alcance de un proyecto tiene que ser un sitio DE ESE cliente.
--
-- No lo puede impedir una clave foránea —`proyecto_sitios` apunta a `sitios` y a
-- `proyectos` por separado— ni un CHECK, que no puede mirar otra tabla.
create or replace function public.validar_sitio_del_proyecto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_sitio uuid;
begin
  select org_id into v_org_sitio from public.sitios where id = new.sitio_id;

  if v_org_sitio is distinct from new.org_id then
    raise exception 'El sitio no pertenece a la organización del proyecto'
      using errcode = '23514';
  end if;

  return new;
end
$$;

-- Mover un proyecto de etapa deja su renglón en la bitácora, y lo escribe la
-- BASE.
--
-- ⚠️ No lo hace la app a propósito. Sin señal, el UPDATE del proyecto y el
-- INSERT de la bitácora saldrían como dos operaciones distintas de la cola: si
-- la segunda falla —o si alguien cambia la etapa desde el SQL Editor— la línea
-- de tiempo miente, y es lo primero que se abre antes de una reunión con el
-- cliente. Una sola escritura del cliente, dos filas garantizadas.
--
-- ⚠️ `current_date` NO: la base corre en UTC, así que a las 19:00 de México ya
-- es el día siguiente y el cambio de etapa quedaría fechado mañana. La fecha se
-- calcula en la zona de la firma.
create or replace function public.registrar_cambio_etapa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.etapa is distinct from old.etapa then
    insert into public.bitacora_proyecto
      (org_id, proyecto_id, tipo, fecha, titulo, detalle, creado_por)
    values (
      new.org_id,
      new.id,
      'cambio_etapa',
      (now() at time zone 'America/Mexico_City')::date,
      'Cambio de etapa: ' || old.etapa || ' → ' || new.etapa,
      null,
      auth.uid()
    );
  end if;

  return new;
end
$$;

-- ============================================================================
-- §2 · TABLAS
-- ============================================================================

-- ----------------------------------------------------------------- sitios --
-- Los centros de trabajo del cliente.
--
-- ⚠️ **El sitio es una entidad, no una línea de dirección.** Una organización
-- puede tener cinco plantas y el alcance del certificado cubrir sólo dos, y qué
-- NOM aplica depende del número de trabajadores DE ESE SITIO, no de la empresa
-- (docs/06_MODULOS_FUNCIONALES.md · Cartera).
create table public.sitios (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizaciones(id) on delete cascade,
  nombre            text not null,                 -- "Planta Toluca"
  tipo              text not null default 'planta'
                    check (tipo in ('planta','oficina','almacen','obra','sucursal')),
  direccion         text,
  municipio         text,
  entidad           text,                          -- estado de la República
  cp                text,
  -- Determina qué NOMs aplican [Fase 05]. Nulo = todavía no se preguntó.
  num_trabajadores  int check (num_trabajadores is null or num_trabajadores >= 0),
  notas             text,
  -- Nada se borra: un sitio que cierra se desactiva y sus auditorías siguen
  -- apuntando a algo que existe.
  activo            boolean not null default true,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  creado_por        uuid references public.usuarios(id)
);

comment on table public.sitios is
  'Centros de trabajo de cada organización. El alcance de un certificado se define por sitio.';

-- --------------------------------------------------------------- contactos --
-- Quién es quién del lado del cliente.
--
-- ⚠️ Sin `acceso_portal` todavía: el portal del cliente llega en la Fase 06 y
-- una casilla que no enciende nada es un interruptor muerto (CLAUDE.md regla
-- 11). La columna se agrega en la migración de esa fase, junto a lo que la lee.
create table public.contactos (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizaciones(id) on delete cascade,
  -- A qué sitio pertenece, si pertenece a uno. El responsable de seguridad suele
  -- ser de una planta concreta; el representante de la dirección, de la empresa.
  sitio_id        uuid references public.sitios(id) on delete set null,
  nombre          text not null,
  puesto          text,
  correo          text,
  telefono        text,
  papel           text not null default 'otro'
                  check (papel in ('representante_direccion','coordinador_sgc',
                                   'responsable_seguridad','contacto_comercial','otro')),
  -- Con quién se habla primero. Lo enseña la lista de organizaciones.
  principal       boolean not null default false,
  activo          boolean not null default true,
  notas           text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  creado_por      uuid references public.usuarios(id)
);

comment on table public.contactos is
  'Contactos del cliente con su papel. El acceso al portal se agrega en la Fase 06.';

-- ---------------------------------------------------------------- normas --
-- Catálogo GLOBAL: las normas no son de nadie.
--
-- ⚠️ **Sin `org_id` a propósito** — está declarada en la lista `EXENTAS` de
-- `.github/workflows/rls-check.yml`, junto a `norma_clausulas`. Se lee con
-- sesión y sólo la escribe un socio.
--
-- ⚠️ **Nace vacía.** El catálogo se sube como `.md` y se indexa desde la app
-- (F01·B2b). Sembrarlo aquí metería el criterio técnico de Summit en el
-- repositorio y obligaría a una migración por cada corrección de un resumen.
create table public.normas (
  id              uuid primary key default gen_random_uuid(),
  clave           text not null unique,            -- iso_9001
  nombre          text not null,                   -- ISO 9001
  version         text,                            -- 2015
  titulo          text,                            -- Sistemas de gestión de la calidad
  activa          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

comment on table public.normas is
  'Catálogo global de normas. Se llena importando el .md de Summit, nunca con una semilla del repo (CLAUDE.md regla 12).';

-- -------------------------------------------------------- norma_clausulas --
-- El árbol de cláusulas. Catálogo GLOBAL.
--
-- ⚠️ **`resumen` lo redacta Summit.** Aquí NO se copia el texto de la norma: es
-- obra protegida y la firma la tiene bajo licencia. Lo que vive en la base es la
-- estructura —número, título y el resumen propio— y las referencias
-- (CLAUDE.md regla 12 · docs/08 §8.6).
create table public.norma_clausulas (
  id              uuid primary key default gen_random_uuid(),
  norma_id        uuid not null references public.normas(id) on delete cascade,
  padre_id        uuid references public.norma_clausulas(id) on delete cascade,
  numero          text not null,                   -- 8.5.1
  titulo          text not null,
  resumen         text,                            -- ⚠️ redactado por Summit
  -- Si se puede levantar un hallazgo contra ella. Los capítulos 1, 2 y 3 de una
  -- ISO no son auditables: son objeto, referencias y términos.
  auditable       boolean not null default true,
  -- El orden en que venía en el archivo. Sin esto, "10.3" saldría antes de
  -- "2.1" en cuanto se ordene por texto.
  orden           int not null default 0,
  activa          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  unique (norma_id, numero)
);

comment on table public.norma_clausulas is
  'Estructura de cláusulas y resumen propio de Summit. NUNCA el texto de la norma.';

-- -------------------------------------------------------------- proyectos --
-- El contrato.
create table public.proyectos (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizaciones(id) on delete cascade,
  nombre              text not null,
  -- Los cinco servicios de la firma más el soporte.
  tipo                text not null default 'implementacion'
                      check (tipo in ('implementacion','auditoria','capacitacion',
                                      'cumplimiento','automatizacion','soporte_it')),
  -- Las SEIS etapas de la metodología de Summit. El tablero de la firma es este
  -- embudo (docs/06_MODULOS_FUNCIONALES.md).
  etapa               text not null default 'diagnostico'
                      check (etapa in ('diagnostico','planificacion','documentacion',
                                       'implementacion','auditoria_interna','certificacion')),
  estado              text not null default 'propuesta'
                      check (estado in ('propuesta','activo','pausado','cerrado','cancelado')),
  lider_id            uuid references public.usuarios(id),
  fecha_inicio        date,
  fecha_fin_estimada  date,
  fecha_fin_real      date,
  monto               numeric(14,2),               -- dinero: nunca float
  moneda              text not null default 'MXN' check (moneda in ('MXN','USD')),
  objetivo            text,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  creado_por          uuid references public.usuarios(id)
);

comment on table public.proyectos is
  'El contrato con el cliente, con su etapa de la metodología. Se cierra o se cancela; no se borra.';

-- ------------------------------------------- proyecto_normas · proyecto_sitios --
-- **El alcance real, en tablas, no en una cadena de texto.** De aquí sale la
-- lista de verificación de una auditoría [Fase 03] y la matriz de requisitos
-- [Fase 02]: con las normas en un `text` habría que adivinarlas con un LIKE.
--
-- `org_id` lo pone el trigger, no el cliente (ver §1).
create table public.proyecto_normas (
  proyecto_id  uuid not null references public.proyectos(id) on delete cascade,
  norma_id     uuid not null references public.normas(id)    on delete restrict,
  org_id       uuid not null references public.organizaciones(id) on delete cascade,
  creado_en    timestamptz not null default now(),
  creado_por   uuid references public.usuarios(id),
  primary key (proyecto_id, norma_id)
);

create table public.proyecto_sitios (
  proyecto_id  uuid not null references public.proyectos(id) on delete cascade,
  sitio_id     uuid not null references public.sitios(id)    on delete cascade,
  org_id       uuid not null references public.organizaciones(id) on delete cascade,
  creado_en    timestamptz not null default now(),
  creado_por   uuid references public.usuarios(id),
  primary key (proyecto_id, sitio_id)
);

-- ------------------------------------------------------- bitacora_proyecto --
-- La línea de tiempo del cliente: visitas, entregas, cambios de etapa, acuerdos.
-- Es lo primero que se abre antes de una reunión, y hoy vive en la memoria del
-- consultor y en un hilo de correo.
create table public.bitacora_proyecto (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizaciones(id) on delete cascade,
  proyecto_id    uuid not null references public.proyectos(id) on delete cascade,
  tipo           text not null default 'nota'
                 check (tipo in ('visita','entrega','cambio_etapa','acuerdo','incidencia','nota')),
  fecha          date not null,
  titulo         text not null,
  detalle        text,
  participantes  text[] not null default '{}',
  creado_en      timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id)
);

comment on table public.bitacora_proyecto is
  'Línea de tiempo por proyecto. Los cambios de etapa los escribe el trigger registrar_cambio_etapa().';

-- ============================================================================
-- §3 · ÍNDICES
-- Todo filtra por organización, siempre.
-- ============================================================================

create index sitios_org_idx              on public.sitios (org_id, activo);
create index contactos_org_idx           on public.contactos (org_id, activo);
create index contactos_sitio_idx         on public.contactos (sitio_id);
-- El embudo del tablero y la lista de la cartera salen de este índice.
create index proyectos_org_idx           on public.proyectos (org_id, estado, etapa);
create index proyectos_lider_idx         on public.proyectos (lider_id, estado);
-- "Contratos por renovar": los que terminan en los próximos 60 días.
create index proyectos_fin_idx           on public.proyectos (fecha_fin_estimada)
  where estado in ('activo','pausado');
create index proyecto_normas_org_idx     on public.proyecto_normas (org_id);
create index proyecto_normas_norma_idx   on public.proyecto_normas (norma_id);
create index proyecto_sitios_org_idx     on public.proyecto_sitios (org_id);
create index proyecto_sitios_sitio_idx   on public.proyecto_sitios (sitio_id);
create index bitacora_proyecto_idx       on public.bitacora_proyecto (proyecto_id, fecha desc);
create index bitacora_proyecto_org_idx   on public.bitacora_proyecto (org_id, fecha desc);
create index norma_clausulas_norma_idx   on public.norma_clausulas (norma_id, orden);
create index norma_clausulas_padre_idx   on public.norma_clausulas (padre_id);

-- ============================================================================
-- §4 · TRIGGERS
-- ============================================================================

create trigger sitios_actualizado_en
  before update on public.sitios
  for each row execute function public.tocar_actualizado_en();

create trigger contactos_actualizado_en
  before update on public.contactos
  for each row execute function public.tocar_actualizado_en();

create trigger proyectos_actualizado_en
  before update on public.proyectos
  for each row execute function public.tocar_actualizado_en();

create trigger normas_actualizado_en
  before update on public.normas
  for each row execute function public.tocar_actualizado_en();

create trigger norma_clausulas_actualizado_en
  before update on public.norma_clausulas
  for each row execute function public.tocar_actualizado_en();

-- La organización de lo que cuelga de un proyecto se hereda; no se manda.
create trigger proyecto_normas_org
  before insert or update on public.proyecto_normas
  for each row execute function public.heredar_org_del_proyecto();

create trigger proyecto_sitios_org
  before insert or update on public.proyecto_sitios
  for each row execute function public.heredar_org_del_proyecto();

-- ⚠️ Después del anterior: valida contra la `org_id` ya heredada. El orden entre
-- triggers `BEFORE` es alfabético por nombre — `proyecto_sitios_org` va antes
-- que `proyecto_sitios_valida`, y por eso se llaman así.
create trigger proyecto_sitios_valida
  before insert or update on public.proyecto_sitios
  for each row execute function public.validar_sitio_del_proyecto();

create trigger bitacora_proyecto_org
  before insert or update on public.bitacora_proyecto
  for each row execute function public.heredar_org_del_proyecto();

create trigger proyectos_cambio_etapa
  after update on public.proyectos
  for each row execute function public.registrar_cambio_etapa();

-- La bitácora inmutable se engancha a las tablas de dominio.
create trigger sitios_bitacora
  after insert or update or delete on public.sitios
  for each row execute function public.registrar_bitacora();

create trigger contactos_bitacora
  after insert or update or delete on public.contactos
  for each row execute function public.registrar_bitacora();

create trigger proyectos_bitacora
  after insert or update or delete on public.proyectos
  for each row execute function public.registrar_bitacora();

create trigger proyecto_normas_bitacora
  after insert or update or delete on public.proyecto_normas
  for each row execute function public.registrar_bitacora();

create trigger proyecto_sitios_bitacora
  after insert or update or delete on public.proyecto_sitios
  for each row execute function public.registrar_bitacora();

create trigger normas_bitacora
  after insert or update or delete on public.normas
  for each row execute function public.registrar_bitacora();

-- ⚠️ `norma_clausulas` y `bitacora_proyecto` van SIN bitácora, y por motivos
-- distintos. La primera se escribe por lotes: una importación del árbol de ISO
-- 9001 son ~300 filas, y engancharla llenaría `audit_logs` de ruido cada vez que
-- el socio corrija una errata — la trazabilidad de qué importación la dejó así
-- la guarda `normas` y la propia pantalla del importador. La segunda YA ES una
-- bitácora: duplicarla en `audit_logs` no agrega nada que no esté.

-- ============================================================================
-- §5 · RLS
-- ============================================================================

alter table public.sitios            enable row level security;
alter table public.contactos         enable row level security;
alter table public.proyectos         enable row level security;
alter table public.proyecto_normas   enable row level security;
alter table public.proyecto_sitios   enable row level security;
alter table public.bitacora_proyecto enable row level security;
alter table public.normas            enable row level security;
alter table public.norma_clausulas   enable row level security;

-- ⚠️ El patrón, y se repite igual en las seis tablas de dominio:
--   SELECT  → la ve quien tiene la organización asignada, o el socio.
--   INSERT  → la escribe quien además NO es `lectura` (`puedo_editar_org`).
--   UPDATE  → USING **y** WITH CHECK, o se le puede cambiar el `org_id`.
--   DELETE  → no existe, salvo en las dos tablas de alcance.

-- ------------------------------------------------------------------ sitios --
create policy "sitios_select" on public.sitios for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "sitios_insert" on public.sitios for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "sitios_update" on public.sitios for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- Sin DELETE: un sitio que cierra va a `activo = false`. Sus auditorías y sus
-- obligaciones siguen apuntando a él.

-- --------------------------------------------------------------- contactos --
create policy "contactos_select" on public.contactos for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "contactos_insert" on public.contactos for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "contactos_update" on public.contactos for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- Sin DELETE: `activo = false`. Quien firmó un acta el año pasado tiene que
-- seguir existiendo para que el acta siga teniendo sentido.

-- --------------------------------------------------------------- proyectos --
create policy "proyectos_select" on public.proyectos for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "proyectos_insert" on public.proyectos for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "proyectos_update" on public.proyectos for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- Sin DELETE: se cierra o se cancela.

-- ----------------------------------------- proyecto_normas · proyecto_sitios --
-- ⚠️ Las DOS ÚNICAS tablas de la fase con DELETE, y es legítimo: quitar una
-- norma o un sitio del alcance es una corrección normal de un contrato que se
-- está negociando, no la destrucción de un registro. Queda en la bitácora.
--
-- ⚠️ El `WITH CHECK` mira `org_id`, que para entonces ya lo puso el trigger
-- `heredar_org_del_proyecto()` — los BEFORE corren antes que la comprobación de
-- la política, así que el cliente puede mandar la fila sin `org_id` y la
-- política sigue siendo verdadera.
create policy "proyecto_normas_select" on public.proyecto_normas for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "proyecto_normas_insert" on public.proyecto_normas for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "proyecto_normas_delete" on public.proyecto_normas for delete to authenticated
  using (public.puedo_editar_org(org_id));

create policy "proyecto_sitios_select" on public.proyecto_sitios for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "proyecto_sitios_insert" on public.proyecto_sitios for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "proyecto_sitios_delete" on public.proyecto_sitios for delete to authenticated
  using (public.puedo_editar_org(org_id));

-- -------------------------------------------------------- bitacora_proyecto --
create policy "bitacora_proyecto_select" on public.bitacora_proyecto for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "bitacora_proyecto_insert" on public.bitacora_proyecto for insert to authenticated
  with check (public.puedo_editar_org(org_id));

-- Corregir la nota que uno mismo escribió, sí. La de otro, no — salvo el socio.
create policy "bitacora_proyecto_update" on public.bitacora_proyecto for update to authenticated
  using      (public.puedo_editar_org(org_id) and (creado_por = auth.uid() or public.es_socio()))
  with check (public.puedo_editar_org(org_id) and (creado_por = auth.uid() or public.es_socio()));

-- Sin DELETE: una entrada equivocada se corrige con otra entrada. Es una
-- bitácora.

-- ------------------------------------------------ normas · norma_clausulas --
-- Catálogo global: lo lee cualquiera con sesión —hace falta para elegir el
-- alcance de un proyecto— y sólo lo escribe un socio, desde el importador.
create policy "normas_select" on public.normas for select to authenticated
  using (true);

create policy "normas_insert" on public.normas for insert to authenticated
  with check (public.es_socio());

create policy "normas_update" on public.normas for update to authenticated
  using (public.es_socio()) with check (public.es_socio());

create policy "norma_clausulas_select" on public.norma_clausulas for select to authenticated
  using (true);

create policy "norma_clausulas_insert" on public.norma_clausulas for insert to authenticated
  with check (public.es_socio());

create policy "norma_clausulas_update" on public.norma_clausulas for update to authenticated
  using (public.es_socio()) with check (public.es_socio());

-- Sin DELETE en ninguna de las dos: una cláusula que desaparece del `.md` se
-- marca `activa = false`. Puede haber hallazgos citándola, y un hallazgo sin
-- cláusula no es un hallazgo.

-- ============================================================================
-- §6 · LA ORGANIZACIÓN, AHORA CON PAPEL
-- ============================================================================

-- La primera migración dejó escrito que "el reparto por papel llega en la Fase
-- 01". Llegó: con `puedo_editar_org()` en las seis tablas de arriba, dejar la
-- organización con una política más floja que la de sus sitios sería una
-- incoherencia con forma de bug — un `lectura` que no puede tocar un contacto
-- pero sí renombrar al cliente entero.
--
-- ⚠️ Se recrea la política, NO se edita la migración que la creó: una migración
-- aplicada no se toca (docs/03 §4.1).
drop policy if exists "organizaciones_update" on public.organizaciones;

create policy "organizaciones_update" on public.organizaciones for update to authenticated
  using      (public.puedo_editar_org(id))
  with check (public.puedo_editar_org(id));

-- El alta sigue siendo del socio, y es una decisión, no una omisión: quién entra
-- a la cartera lo decide él (docs/09_TAREAS_DEL_DUENO.md · B02). Además, un
-- consultor que creara una organización dejaría de verla en el instante
-- siguiente —no cumpliría `mis_organizaciones()`— y parecería que la app perdió
-- el cliente que acaba de capturar.
