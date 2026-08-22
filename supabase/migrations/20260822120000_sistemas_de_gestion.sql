-- ============================================================================
-- FASE 02 · Sistemas de gestión — el esquema completo
--
-- Aquí la app deja de ser un CRM. Lo que entra:
--
--   §1 · Funciones auxiliares (herencia de org, sellos, guardas)
--   §2 · procesos                                       [F02·B4]
--   §3 · documentos · documento_versiones · documento_clausulas   [F02·B2]
--   §4 · adjuntos                                       [F02·B2b]
--   §5 · requisitos — la matriz                         [F02·B3]
--   §6 · riesgos · indicadores · mediciones             [F02·B4]
--   §7 · Índices
--   §8 · Triggers
--   §9 · RLS
--   §10 · Ampliación de `puedo_borrar_org` y `puedo_borrar_proyecto`
--
-- ⚠️ **Va DESPUÉS de `20260821220000_tareas_y_depuracion.sql`.** Amplía
-- `puedo_borrar_org()` y `sellar_tarea_hecha()`, que nacen ahí, y añade la
-- columna `exige_evidencia` a `tareas_etapa`.
--
-- ⚠️ Las políticas de Storage van en su PROPIA migración
-- (`20260822120100_storage_documentos_y_evidencias.sql`), a propósito:
-- `create policy on storage.objects` toca un esquema que no es nuestro y puede
-- fallar por permisos. Si fuera dentro de este archivo, se llevaría por delante
-- el esquema entero.
--
-- ⚠️ Convenciones de siempre: `org_id NOT NULL` + RLS + políticas
-- `TO authenticated`, catálogos `text` + CHECK (nunca enum), UPDATE con USING y
-- WITH CHECK, y nada de `fecha::text` en columnas generadas ni en índices.
-- ============================================================================


-- ============================================================================
-- §1 · FUNCIONES AUXILIARES
-- ============================================================================

-- La `org_id` de lo que cuelga de un DOCUMENTO se hereda del documento.
--
-- Mismo razonamiento que `heredar_org_del_proyecto()`: el navegador no tiene por
-- qué saber la organización de un documento, y aunque la mandara bien,
-- `WITH CHECK` sólo comprueba que sea una organización SUYA — no que sea la del
-- documento. Un consultor con dos clientes podría colgar la versión de un manual
-- del expediente equivocado sin violar ninguna política.
create or replace function public.heredar_org_del_documento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.documentos where id = new.documento_id;

  if v_org is null then
    raise exception 'El documento % no existe', new.documento_id
      using errcode = '23503';
  end if;

  new.org_id := v_org;
  return new;
end
$$;

-- Igual, para las mediciones de un indicador.
create or replace function public.heredar_org_del_indicador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.indicadores where id = new.indicador_id;

  if v_org is null then
    raise exception 'El indicador % no existe', new.indicador_id
      using errcode = '23503';
  end if;

  new.org_id := v_org;
  return new;
end
$$;

-- La `org_id` de un adjunto sale de **su campo dominante**, no del cliente.
--
-- ⚠️ El orden de este `coalesce` es el mismo que el de `campoDominante()` en
-- `src/lib/offline/adjuntos.ts`, y los dos se mueven juntos: de lo más
-- específico a lo más general. Cuando lleguen `hallazgos` [Fase 03] y
-- `acciones` [Fase 04], se añade su rama aquí y su línea allá.
--
-- El adjunto suelto de una organización —sin tarea y sin documento— sí manda su
-- `org_id`, y el `WITH CHECK` de la política lo valida.
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

-- El dueño de un proceso tiene que ser un contacto DE ESE cliente.
--
-- No lo puede impedir una clave foránea —`procesos` apunta a `contactos` y a
-- `organizaciones` por separado— ni un CHECK, que no puede mirar otra tabla. Es
-- la misma guarda que `validar_sitio_del_proyecto()`.
create or replace function public.validar_contacto_de_la_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_contacto uuid;
begin
  if new.dueno_contacto_id is null then
    return new;
  end if;

  select org_id into v_org_contacto from public.contactos where id = new.dueno_contacto_id;

  if v_org_contacto is distinct from new.org_id then
    raise exception 'El contacto no pertenece a esta organización'
      using errcode = '23514';
  end if;

  return new;
end
$$;

-- Un requisito de la matriz tiene que ser de una cláusula que **esté en el
-- alcance del proyecto**.
--
-- ⚠️ Sólo al INSERT, y es deliberado: si el alcance cambia después —el cliente
-- añade una norma o quita otra—, lo ya evaluado se queda. Validarlo también en
-- el UPDATE dejaría filas imposibles de tocar, ni siquiera para corregirlas, el
-- día que alguien reordene el alcance.
create or replace function public.validar_clausula_del_alcance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
      from public.norma_clausulas c
      join public.proyecto_normas pn on pn.norma_id = c.norma_id
     where c.id = new.clausula_id
       and pn.proyecto_id = new.proyecto_id
  ) then
    raise exception 'Esa cláusula no pertenece a ninguna norma del alcance del proyecto'
      using errcode = '23514';
  end if;

  return new;
end
$$;

-- Quién aprobó una versión y cuándo lo escribe la BASE.
--
-- Es el mismo motivo que `sellar_tarea_hecha()`, y aquí pesa más: la firma de
-- aprobación de un documento del SGC es lo que un auditor externo mira primero.
-- Una fecha que viaja desde el navegador es una fecha que se puede escribir a
-- mano.
--
-- ⚠️ `elaboro_id` y `reviso_id` NO se sellan: son campos que se capturan. Quien
-- elaboró un procedimiento puede no ser quien lo está subiendo, y firmar como
-- revisor a quien sólo movió el estado sería inventar una firma. Lo único que la
-- base afirma es lo que la base presenció: quién apretó «aprobar».
--
-- ⚠️ `current_date` NO: la base corre en UTC, así que a las 19:00 de México ya
-- es el día siguiente. La fecha se calcula en la zona de la firma.
create or replace function public.sellar_version_documento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'aprobado' and (tg_op = 'INSERT' or old.estado is distinct from 'aprobado') then
    new.aprobo_id        := auth.uid();
    new.fecha_aprobacion := (now() at time zone 'America/Mexico_City')::date;
  end if;

  -- Al crear, quien la sube es el elaborador salvo que se diga otra cosa.
  if tg_op = 'INSERT' and new.elaboro_id is null then
    new.elaboro_id := auth.uid();
  end if;

  return new;
end
$$;

-- **Nunca se sobrescribe una versión aprobada.**
--
-- Ésta es la regla que sostiene todo el control documental, y por eso vive en la
-- base y no en la pantalla. Una versión aprobada sólo puede hacer una cosa:
-- pasar a `obsoleto` cuando se aprueba la siguiente. Cualquier otro cambio
-- —el markdown, el archivo, la fecha, el control de cambios— se rechaza.
-- Una obsoleta ya no cambia nada en absoluto.
--
-- Corregir un documento aprobado es **crear la versión siguiente**. Es la
-- diferencia entre un expediente y un archivo de Word que alguien fue pisando.
create or replace function public.proteger_version_aprobada()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.estado = 'obsoleto' then
    raise exception 'La versión % ya está obsoleta: no se modifica. Trabaja sobre la versión vigente.', old.version
      using errcode = '23514';
  end if;

  if old.estado = 'aprobado' then
    if new.estado <> 'obsoleto' then
      raise exception 'La versión % está aprobada: sólo puede pasar a obsoleta al aprobarse la siguiente. Para cambiar el contenido, crea una versión nueva.', old.version
        using errcode = '23514';
    end if;

    -- Pasa a obsoleta, sí; pero se va tal como se aprobó.
    if new.version           is distinct from old.version
    or new.markdown          is distinct from old.markdown
    or new.archivo_ruta      is distinct from old.archivo_ruta
    or new.control_cambios   is distinct from old.control_cambios
    or new.elaboro_id        is distinct from old.elaboro_id
    or new.reviso_id         is distinct from old.reviso_id
    or new.aprobo_id         is distinct from old.aprobo_id
    or new.fecha_aprobacion  is distinct from old.fecha_aprobacion then
      raise exception 'Una versión aprobada no se edita: sólo se marca obsoleta.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end
$$;

-- Aprobar una versión jubila a la anterior y actualiza al documento.
--
-- ⚠️ Tres escrituras que tienen que pasar juntas o no pasar: la nueva queda
-- aprobada, la que estaba aprobada pasa a obsoleta, y el documento apunta a la
-- nueva como vigente. Hacerlo desde el cliente serían tres operaciones de la
-- cola que sin señal pueden llegar desparejadas — y un documento con dos
-- versiones aprobadas a la vez es exactamente el hallazgo que la firma le
-- levanta a sus clientes.
--
-- La recursión se corta sola: el UPDATE de abajo deja `estado = 'obsoleto'`, y
-- con ese valor esta función no vuelve a entrar.
create or replace function public.jubilar_version_anterior()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado <> 'aprobado' then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.estado = 'aprobado' then
    return null;
  end if;

  update public.documento_versiones
     set estado = 'obsoleto'
   where documento_id = new.documento_id
     and id <> new.id
     and estado = 'aprobado';

  update public.documentos
     set version_vigente_id = new.id,
         estado             = 'vigente'
   where id = new.documento_id;

  return null;
end
$$;

-- Cuándo se evaluó un requisito, y quién. Lo escribe la base [F02·B3].
--
-- El porcentaje de avance del proyecto sale de esta tabla y se enseña en la
-- reunión mensual con el cliente. «Evaluado el 3 de marzo» tiene que ser cierto.
create or replace function public.sellar_evaluacion_requisito()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    new.evaluado_en  := now();
    new.evaluado_por := auth.uid();
  end if;

  return new;
end
$$;


-- ============================================================================
-- §2 · PROCESOS  [F02·B4]
-- ============================================================================

-- El mapa de procesos del cliente. De aquí cuelgan el documento (su proceso
-- dueño), el riesgo y el indicador: sin esta tabla, esos tres campos serían
-- texto libre y no habría forma de contestar «¿qué riesgos tiene Compras?».
create table public.procesos (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizaciones(id) on delete cascade,
  codigo             text,
  nombre             text not null,
  tipo               text not null default 'operativo'
                     check (tipo in ('estrategico','operativo','soporte')),
  -- El dueño del proceso es gente DEL CLIENTE, no de la firma: por eso apunta a
  -- `contactos` y no a `usuarios`.
  dueno_contacto_id  uuid references public.contactos(id) on delete set null,
  objetivo           text,
  entradas           text,
  salidas            text,
  orden              int not null default 0,
  activo             boolean not null default true,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  creado_por         uuid references public.usuarios(id)
);

comment on table public.procesos is
  'Mapa de procesos del cliente. Dueño de documentos, riesgos e indicadores.';


-- ============================================================================
-- §3 · CONTROL DOCUMENTAL  [F02·B2]
-- ============================================================================

-- La biblioteca del cliente. **Cuelga de la organización, no del proyecto**: el
-- manual de calidad sobrevive al contrato que lo produjo. `proyecto_id` dice qué
-- contrato lo pagó, y por eso el expediente se puede mirar entero o filtrado.
create table public.documentos (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizaciones(id) on delete cascade,
  -- ON DELETE SET NULL, no CASCADE: borrar un proyecto de prueba [F01·B6] no
  -- puede llevarse los documentos del cliente por delante.
  proyecto_id         uuid references public.proyectos(id) on delete set null,
  proceso_id          uuid references public.procesos(id)  on delete set null,
  codigo              text not null,
  titulo              text not null,
  tipo                text not null default 'procedimiento'
                      check (tipo in ('manual','procedimiento','instructivo','formato',
                                      'registro','politica','plan','externo')),
  estado              text not null default 'en_elaboracion'
                      check (estado in ('en_elaboracion','vigente','obsoleto')),
  -- La FK se añade abajo: apunta a una tabla que todavía no existe.
  version_vigente_id  uuid,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  creado_por          uuid references public.usuarios(id)
);

comment on table public.documentos is
  'Documento del SGC de un cliente. El contenido vive en documento_versiones; aquí sólo la identidad.';

-- Cada revisión, con su ciclo de vida y sus firmas.
--
-- ⚠️ **El archivo original NUNCA se tira.** El `.docx` o el PDF es lo que firmó
-- el cliente y lo que pide un auditor; el `markdown` es una representación para
-- leerlo en el teléfono, editarlo sin Word y dárselo al asistente [Fase 07] sin
-- volver a procesarlo. Si los dos discrepan, manda el original.
create table public.documento_versiones (
  id                 uuid primary key default gen_random_uuid(),
  -- La pone el trigger `heredar_org_del_documento()`; el cliente no la manda.
  org_id             uuid not null references public.organizaciones(id) on delete cascade,
  documento_id       uuid not null references public.documentos(id) on delete cascade,
  version            text not null,
  estado             text not null default 'borrador'
                     check (estado in ('borrador','en_revision','aprobado','obsoleto')),
  -- ⚠️ RUTA en el bucket privado `documentos`, NO una URL. El bucket es privado
  -- y se lee firmando la ruta al vuelo; una URL firmada guardada en la base es
  -- una URL caducada dentro de una hora. `documentos/{org_id}/{documento_id}/…`
  archivo_ruta       text,
  archivo_nombre     text,
  archivo_tipo       text,
  archivo_tamano     bigint,
  markdown           text,
  -- De dónde salió el markdown, y por tanto cuánto fiarse de él.
  origen_markdown    text check (origen_markdown in ('docx','pdf','escrito')),
  -- Qué no sobrevivió la conversión: tablas complejas, imágenes, numeración
  -- automática. Se avisa AL SUBIR, no cuando el cliente lo encuentra.
  avisos_conversion  text[] not null default '{}',
  elaboro_id         uuid references public.usuarios(id),
  reviso_id          uuid references public.usuarios(id),
  aprobo_id          uuid references public.usuarios(id),
  fecha_elaboracion  date,
  fecha_aprobacion   date,
  fecha_vigencia     date,
  control_cambios    text,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  creado_por         uuid references public.usuarios(id),
  unique (documento_id, version)
);

comment on table public.documento_versiones is
  'Cada revisión de un documento. Una versión aprobada no se sobrescribe nunca: se jubila al aprobar la siguiente.';

alter table public.documentos
  add constraint documentos_version_vigente_fkey
  foreign key (version_vigente_id) references public.documento_versiones(id) on delete set null;

-- Qué cláusula cubre qué documento. Alimenta la matriz de requisitos: es lo que
-- convierte «tenemos un procedimiento de compras» en «la 8.4 está documentada».
create table public.documento_clausulas (
  documento_id  uuid not null references public.documentos(id) on delete cascade,
  clausula_id   uuid not null references public.norma_clausulas(id) on delete cascade,
  -- La pone el trigger `heredar_org_del_documento()`.
  org_id        uuid not null references public.organizaciones(id) on delete cascade,
  creado_en     timestamptz not null default now(),
  creado_por    uuid references public.usuarios(id),
  primary key (documento_id, clausula_id)
);


-- ============================================================================
-- §4 · ADJUNTOS  [F02·B2b — adelantado desde la Fase 04]
-- ============================================================================

-- Evidencia: la foto del extintor, el acta firmada, el correo del cliente.
--
-- ⚠️ **Nace con las claves foráneas que HOY existen.** El modelo de datos lista
-- seis campos dominantes; `hallazgos` es de la Fase 03, y `acciones`, `tareas` y
-- `obligaciones` de la 04 y la 05. Poner ahora una FK a una tabla que no existe
-- es un error de migración, no una previsión. Cada fase añade su columna con un
-- `alter table`, y `campoDominante()` en el cliente ya lleva escrito el orden
-- completo para que sea una línea.
--
-- ⚠️ Borrar una fila de aquí NO borra el archivo del bucket. Es a propósito
-- mientras no haya un cron de limpieza: un objeto huérfano en Storage cuesta
-- unos centavos; un archivo de evidencia borrado por accidente no se recupera.
create table public.adjuntos (
  id              uuid primary key default gen_random_uuid(),
  -- La pone `heredar_org_del_adjunto()` a partir del campo dominante.
  org_id          uuid not null references public.organizaciones(id) on delete cascade,
  tarea_etapa_id  uuid references public.tareas_etapa(id) on delete cascade,
  documento_id    uuid references public.documentos(id)   on delete cascade,
  -- Ruta en el bucket privado `evidencias`: `{org_id}/{año}/{uuid}-{nombre}`.
  ruta            text not null,
  nombre          text not null,
  tipo_mime       text,
  tamano          bigint,
  titulo          text,
  -- El portal del cliente [Fase 06] y el buzón de correo [Fase 07] dejan rastro
  -- distinto: quién subió una evidencia importa cuando se discute un hallazgo.
  subido_desde    text not null default 'app'
                  check (subido_desde in ('app','portal','correo')),
  creado_en       timestamptz not null default now(),
  creado_por      uuid references public.usuarios(id)
);

comment on table public.adjuntos is
  'Evidencia adjunta. Cola propia en IndexedDB y bucket privado; se filtra por campo dominante, nunca con un OR.';

-- La casilla que la migración 4 dejó pendiente a propósito, ahora que existe lo
-- que la hace verdadera (CLAUDE.md regla 11).
alter table public.tareas_etapa
  add column exige_evidencia boolean not null default false;

comment on column public.tareas_etapa.exige_evidencia is
  'Si es true, la tarea no se puede marcar hecha sin al menos un adjunto. Lo impide sellar_tarea_hecha().';

-- `sellar_tarea_hecha()` aprende a exigir la evidencia.
--
-- ⚠️ **Y funciona sin señal por el orden de las colas.** La fila del adjunto se
-- escribe por el `outbox` normal —es una escritura de tabla— y el binario va por
-- la cola de adjuntos, que se vacía DESPUÉS. Así, al reconectar, el servidor ve
-- primero el adjunto y después el «hecha», que es el orden en que el auditor lo
-- hizo. Al revés, cada tarea con evidencia obligatoria se rechazaría al llegar
-- del sótano.
create or replace function public.sellar_tarea_hecha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'hecha' and (tg_op = 'INSERT' or old.estado is distinct from 'hecha') then
    if new.exige_evidencia and not exists (
      select 1 from public.adjuntos where tarea_etapa_id = new.id
    ) then
      raise exception 'Esta tarea pide evidencia: adjunta el archivo antes de darla por hecha.'
        using errcode = '23514';
    end if;

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


-- ============================================================================
-- §5 · REQUISITOS — LA MATRIZ  [F02·B3]
-- ============================================================================

-- La tabla que contesta «¿cuánto nos falta para certificarnos?».
--
-- **El diagnóstico inicial de la etapa 1 ES esta matriz recién llenada**, no un
-- documento aparte que después haya que mantener sincronizado.
create table public.requisitos (
  id             uuid primary key default gen_random_uuid(),
  -- La pone el trigger `heredar_org_del_proyecto()`.
  org_id         uuid not null references public.organizaciones(id) on delete cascade,
  proyecto_id    uuid not null references public.proyectos(id) on delete cascade,
  clausula_id    uuid not null references public.norma_clausulas(id) on delete cascade,
  estado         text not null default 'no_iniciado'
                 check (estado in ('no_iniciado','documentado','implementado',
                                   'evidenciado','no_aplica')),
  -- ⚠️ Obligatoria si `no_aplica`, y en la BASE. Es el primer punto que revisa
  -- un auditor de certificación, y «no aplica» sin motivo escrito es una no
  -- conformidad servida.
  justificacion  text,
  observaciones  text,
  responsable_id uuid references public.usuarios(id),
  evaluado_en    timestamptz,
  evaluado_por   uuid references public.usuarios(id),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id),
  constraint requisitos_no_aplica_justificado
    check (estado <> 'no_aplica' or coalesce(btrim(justificacion), '') <> '')
);

comment on table public.requisitos is
  'La matriz: estado de cada cláusula del alcance de un proyecto. El % de avance del cliente sale de aquí.';


-- ============================================================================
-- §6 · RIESGOS · INDICADORES · MEDICIONES  [F02·B4]
-- ============================================================================

-- Riesgos y oportunidades. Cubre ISO 9001 §6.1, 45001 §6.1, 27001 y 37001 de
-- una sola vez.
--
-- `proceso_id` es opcional a propósito: un riesgo de 27001 —«fuga de datos por
-- un proveedor»— puede no colgar de ningún proceso del mapa, y obligarlo a
-- inventarse uno ensucia el mapa para siempre.
create table public.riesgos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizaciones(id) on delete cascade,
  proceso_id     uuid references public.procesos(id) on delete set null,
  tipo           text not null default 'riesgo' check (tipo in ('riesgo','oportunidad')),
  descripcion    text not null,
  causa          text,
  consecuencia   text,
  probabilidad   int not null default 3 check (probabilidad between 1 and 5),
  impacto        int not null default 3 check (impacto between 1 and 5),
  -- ⚠️ Columna generada, y aquí SÍ se puede: es una multiplicación de enteros,
  -- que es inmutable. Lo que nunca puede ir en una generada es una fecha a texto
  -- (CLAUDE.md · trampas heredadas, `fecha::text` no es IMMUTABLE).
  nivel          int generated always as (probabilidad * impacto) stored,
  tratamiento    text check (tratamiento in ('evitar','mitigar','transferir','aceptar','explotar')),
  plan           text,
  responsable_id uuid references public.usuarios(id),
  fecha_revision date,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id)
);

comment on table public.riesgos is
  'Riesgos y oportunidades por proceso. nivel = probabilidad * impacto, calculado por la base.';

-- Los objetivos de calidad con su meta. Alimentan la revisión por la dirección.
create table public.indicadores (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizaciones(id) on delete cascade,
  proceso_id     uuid references public.procesos(id) on delete set null,
  nombre         text not null,
  formula        text,
  unidad         text,
  meta           numeric(14,4),
  -- Sin esto, el semáforo no sabe si 3 % de rechazos es bueno o malo.
  sentido        text not null default 'mayor_mejor'
                 check (sentido in ('mayor_mejor','menor_mejor')),
  frecuencia     text not null default 'mensual'
                 check (frecuencia in ('mensual','trimestral','semestral','anual')),
  responsable_id uuid references public.usuarios(id),
  activo         boolean not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  creado_por     uuid references public.usuarios(id)
);

-- El valor de cada periodo. `periodo` es el primer día del mes/trimestre/año que
-- se mide — una fecha, no un texto: así se ordena y se compara sin adivinar.
create table public.mediciones (
  id           uuid primary key default gen_random_uuid(),
  -- La pone el trigger `heredar_org_del_indicador()`.
  org_id       uuid not null references public.organizaciones(id) on delete cascade,
  indicador_id uuid not null references public.indicadores(id) on delete cascade,
  periodo      date not null,
  valor        numeric(14,4) not null,
  comentario   text,
  creado_en    timestamptz not null default now(),
  creado_por   uuid references public.usuarios(id),
  unique (indicador_id, periodo)
);


-- ============================================================================
-- §7 · ÍNDICES
-- Todo filtra por organización, siempre.
-- ============================================================================

create index procesos_org_idx              on public.procesos (org_id, activo, orden);
create index procesos_contacto_idx         on public.procesos (dueno_contacto_id);

create index documentos_org_idx            on public.documentos (org_id, estado);
create index documentos_proyecto_idx       on public.documentos (proyecto_id);
create index documentos_proceso_idx        on public.documentos (proceso_id);
-- El código de un documento es único dentro del cliente, sin importar mayúsculas:
-- `PR-CAL-001` y `pr-cal-001` son el mismo procedimiento.
-- ⚠️ `lower(text)` sí es IMMUTABLE — al contrario que `fecha::text`.
create unique index documentos_codigo_idx  on public.documentos (org_id, lower(codigo));

create index documento_versiones_doc_idx   on public.documento_versiones (documento_id, creado_en desc);
create index documento_versiones_org_idx   on public.documento_versiones (org_id, estado);
create index documento_clausulas_org_idx   on public.documento_clausulas (org_id);
create index documento_clausulas_cl_idx    on public.documento_clausulas (clausula_id);

create index adjuntos_org_idx              on public.adjuntos (org_id, creado_en desc);
-- Los índices del campo dominante: parciales, porque casi todas las filas tienen
-- una sola de estas columnas llena.
create index adjuntos_tarea_etapa_idx      on public.adjuntos (tarea_etapa_id) where tarea_etapa_id is not null;
create index adjuntos_documento_idx        on public.adjuntos (documento_id)   where documento_id   is not null;

create unique index requisitos_unico_idx   on public.requisitos (proyecto_id, clausula_id);
create index requisitos_org_idx            on public.requisitos (org_id, estado);
create index requisitos_clausula_idx       on public.requisitos (clausula_id);

create index riesgos_org_idx               on public.riesgos (org_id, nivel desc);
create index riesgos_proceso_idx           on public.riesgos (proceso_id);

create index indicadores_org_idx           on public.indicadores (org_id, activo);
create index indicadores_proceso_idx       on public.indicadores (proceso_id);
create index mediciones_indicador_idx      on public.mediciones (indicador_id, periodo desc);
create index mediciones_org_idx            on public.mediciones (org_id, periodo desc);


-- ============================================================================
-- §8 · TRIGGERS
-- ============================================================================

create trigger procesos_actualizado_en
  before update on public.procesos
  for each row execute function public.tocar_actualizado_en();

create trigger procesos_valida_contacto
  before insert or update on public.procesos
  for each row execute function public.validar_contacto_de_la_org();

create trigger documentos_actualizado_en
  before update on public.documentos
  for each row execute function public.tocar_actualizado_en();

create trigger documento_versiones_org
  before insert or update on public.documento_versiones
  for each row execute function public.heredar_org_del_documento();

-- ⚠️ El orden importa: la guarda mira `old` antes de que el sello escriba en
-- `new`, y los triggers BEFORE de una misma tabla corren por orden alfabético
-- de nombre. `proteger` va antes que `sellar`.
create trigger documento_versiones_proteger
  before update on public.documento_versiones
  for each row execute function public.proteger_version_aprobada();

create trigger documento_versiones_sellar
  before insert or update on public.documento_versiones
  for each row execute function public.sellar_version_documento();

create trigger documento_versiones_actualizado_en
  before update on public.documento_versiones
  for each row execute function public.tocar_actualizado_en();

create trigger documento_versiones_jubilar
  after insert or update on public.documento_versiones
  for each row execute function public.jubilar_version_anterior();

create trigger documento_clausulas_org
  before insert or update on public.documento_clausulas
  for each row execute function public.heredar_org_del_documento();

create trigger adjuntos_org
  before insert or update on public.adjuntos
  for each row execute function public.heredar_org_del_adjunto();

create trigger requisitos_org
  before insert or update on public.requisitos
  for each row execute function public.heredar_org_del_proyecto();

create trigger requisitos_valida_alcance
  before insert on public.requisitos
  for each row execute function public.validar_clausula_del_alcance();

create trigger requisitos_sellar
  before insert or update on public.requisitos
  for each row execute function public.sellar_evaluacion_requisito();

create trigger requisitos_actualizado_en
  before update on public.requisitos
  for each row execute function public.tocar_actualizado_en();

create trigger riesgos_actualizado_en
  before update on public.riesgos
  for each row execute function public.tocar_actualizado_en();

create trigger indicadores_actualizado_en
  before update on public.indicadores
  for each row execute function public.tocar_actualizado_en();

create trigger mediciones_org
  before insert or update on public.mediciones
  for each row execute function public.heredar_org_del_indicador();

-- La bitácora. `mediciones` queda fuera a propósito: son cientos de filas de un
-- número por mes, y llenar `audit_logs` con eso entierra lo que sí importa.
create trigger procesos_bitacora
  after insert or update or delete on public.procesos
  for each row execute function public.registrar_bitacora();

create trigger documentos_bitacora
  after insert or update or delete on public.documentos
  for each row execute function public.registrar_bitacora();

create trigger documento_versiones_bitacora
  after insert or update or delete on public.documento_versiones
  for each row execute function public.registrar_bitacora();

create trigger documento_clausulas_bitacora
  after insert or update or delete on public.documento_clausulas
  for each row execute function public.registrar_bitacora();

create trigger adjuntos_bitacora
  after insert or update or delete on public.adjuntos
  for each row execute function public.registrar_bitacora();

create trigger requisitos_bitacora
  after insert or update or delete on public.requisitos
  for each row execute function public.registrar_bitacora();

create trigger riesgos_bitacora
  after insert or update or delete on public.riesgos
  for each row execute function public.registrar_bitacora();

create trigger indicadores_bitacora
  after insert or update or delete on public.indicadores
  for each row execute function public.registrar_bitacora();


-- ============================================================================
-- §9 · RLS
--
-- El patrón de siempre: SELECT por organización asignada (o socio), INSERT y
-- UPDATE por `puedo_editar_org()` —que deja fuera al papel `lectura`—, y DELETE
-- sólo donde borrar no destruye evidencia.
-- ============================================================================

alter table public.procesos             enable row level security;
alter table public.documentos           enable row level security;
alter table public.documento_versiones  enable row level security;
alter table public.documento_clausulas  enable row level security;
alter table public.adjuntos             enable row level security;
alter table public.requisitos           enable row level security;
alter table public.riesgos              enable row level security;
alter table public.indicadores          enable row level security;
alter table public.mediciones           enable row level security;

-- ---------------------------------------------------------------- procesos --
create policy "procesos_select" on public.procesos for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "procesos_insert" on public.procesos for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "procesos_update" on public.procesos for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- Un proceso del mapa no es evidencia de auditoría; uno capturado por error se
-- quita. Lo que cuelga de él —documentos, riesgos, indicadores— queda con el
-- proceso en null, no se va con él (ON DELETE SET NULL).
create policy "procesos_delete" on public.procesos for delete to authenticated
  using (public.puedo_editar_org(org_id));

-- -------------------------------------------------------------- documentos --
create policy "documentos_select" on public.documentos for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "documentos_insert" on public.documentos for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "documentos_update" on public.documentos for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- ⚠️ Un documento se borra **sólo mientras nunca haya tenido una versión
-- aprobada**. Un borrador capturado por error se quita; un procedimiento que
-- estuvo vigente es evidencia y se queda, obsoleto pero consultable
-- (CLAUDE.md regla 13).
create or replace function public.puedo_borrar_documento(p_documento uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.documentos d where d.id = p_documento
                   and public.puedo_editar_org(d.org_id))
     and not exists (
       select 1 from public.documento_versiones v
        where v.documento_id = p_documento
          and v.estado in ('aprobado','obsoleto')
     )
$$;

comment on function public.puedo_borrar_documento is
  'Un documento con alguna versión aprobada u obsoleta es evidencia: no se borra.';

create policy "documentos_delete" on public.documentos for delete to authenticated
  using (public.puedo_borrar_documento(id));

-- ------------------------------------------------- documento_versiones --
create policy "documento_versiones_select" on public.documento_versiones for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "documento_versiones_insert" on public.documento_versiones for insert to authenticated
  with check (public.puedo_editar_org(org_id));

-- El guardián de verdad es `proteger_version_aprobada()`, no esta política: la
-- política dice **quién** puede tocar la fila, el trigger dice **qué** se puede
-- cambiar en ella.
create policy "documento_versiones_update" on public.documento_versiones for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- Sólo un borrador. Un borrador es un archivo a medias; una versión aprobada es
-- el expediente.
create policy "documento_versiones_delete" on public.documento_versiones for delete to authenticated
  using (public.puedo_editar_org(org_id) and estado = 'borrador');

-- ------------------------------------------------- documento_clausulas --
create policy "documento_clausulas_select" on public.documento_clausulas for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "documento_clausulas_insert" on public.documento_clausulas for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "documento_clausulas_delete" on public.documento_clausulas for delete to authenticated
  using (public.puedo_editar_org(org_id));

-- ---------------------------------------------------------------- adjuntos --
create policy "adjuntos_select" on public.adjuntos for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "adjuntos_insert" on public.adjuntos for insert to authenticated
  with check (public.puedo_editar_org(org_id));

-- El título, no el archivo: la ruta y el nombre no se reescriben.
create policy "adjuntos_update" on public.adjuntos for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- ⚠️ Sólo el socio, y es a propósito. Una foto adjunta a un hallazgo [Fase 03]
-- es evidencia de auditoría: si cualquiera pudiera quitarla, la trazabilidad de
-- la auditoría dependería de que nadie se equivoque de botón.
create policy "adjuntos_delete" on public.adjuntos for delete to authenticated
  using (public.es_socio());

-- -------------------------------------------------------------- requisitos --
create policy "requisitos_select" on public.requisitos for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "requisitos_insert" on public.requisitos for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "requisitos_update" on public.requisitos for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

-- Una fila de la matriz se pone en `no_iniciado`, no se borra: el histórico de
-- quién evaluó qué y cuándo es parte del diagnóstico. Pero si una norma sale del
-- alcance, sus filas sobran de verdad y hay que poder quitarlas.
create policy "requisitos_delete" on public.requisitos for delete to authenticated
  using (public.puedo_editar_org(org_id));

-- ----------------------------------------------------------------- riesgos --
create policy "riesgos_select" on public.riesgos for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "riesgos_insert" on public.riesgos for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "riesgos_update" on public.riesgos for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

create policy "riesgos_delete" on public.riesgos for delete to authenticated
  using (public.puedo_editar_org(org_id));

-- ------------------------------------------------ indicadores · mediciones --
create policy "indicadores_select" on public.indicadores for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "indicadores_insert" on public.indicadores for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "indicadores_update" on public.indicadores for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

create policy "indicadores_delete" on public.indicadores for delete to authenticated
  using (public.puedo_editar_org(org_id));

create policy "mediciones_select" on public.mediciones for select to authenticated
  using (org_id in (select public.mis_organizaciones()) or public.es_socio());

create policy "mediciones_insert" on public.mediciones for insert to authenticated
  with check (public.puedo_editar_org(org_id));

create policy "mediciones_update" on public.mediciones for update to authenticated
  using      (public.puedo_editar_org(org_id))
  with check (public.puedo_editar_org(org_id));

create policy "mediciones_delete" on public.mediciones for delete to authenticated
  using (public.puedo_editar_org(org_id));


-- ============================================================================
-- §10 · LA AMPLIACIÓN QUE LA MIGRACIÓN 4 DEJÓ ANOTADA
--
-- «⚠️ ESTA POLÍTICA HAY QUE AMPLIARLA EN LA FASE 02 Y EN LA 03.» Es hoy.
-- ============================================================================

-- Una organización con documentos ya NO se borra.
--
-- El día que existan `auditorias` y `hallazgos` [Fase 03], se añaden sus dos
-- líneas aquí y en ningún otro sitio. Por eso la condición vive en una función.
create or replace function public.puedo_borrar_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_socio()
     and not exists (select 1 from public.documentos where org_id = p_org)
  -- Fase 03: and not exists (select 1 from auditorias where org_id = p_org)
  --          and not exists (select 1 from hallazgos  where org_id = p_org)
$$;

comment on function public.puedo_borrar_org is
  'Socio, y sin documentos. AMPLIAR en F03: una organización con auditorías o hallazgos no se borra.';

-- Y un proyecto con documentos tampoco.
--
-- ⚠️ Ojo con la asimetría, que es intencional: `documentos.proyecto_id` es
-- ON DELETE SET NULL, así que borrar el proyecto NO se llevaría los documentos.
-- Aun así se bloquea: un contrato que produjo entregables es historia de la
-- firma, y dejar sus documentos huérfanos de proyecto es perder de qué contrato
-- salieron — que es justo lo que el campo existe para contestar.
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
  -- Fase 03: and not exists (select 1 from auditorias where proyecto_id = p_proyecto)
$$;

comment on function public.puedo_borrar_proyecto is
  'Socio, y sin documentos. AMPLIAR en F03: un proyecto con auditorías o hallazgos no se borra.';
