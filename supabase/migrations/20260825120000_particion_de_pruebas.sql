-- ============================================================================
-- A10 · La partición de pruebas — la cuenta `dev` y sus datos   ·  MIGRACIÓN 11
--
-- **El problema.** La instancia trae la cartera de demostración con la que se le
-- enseñó el flujo al cliente, y a partir de hoy el cliente captura lo real
-- encima. Borrar la demostración pierde el banco de pruebas —el único juego de
-- datos con proyectos en las seis etapas, auditorías cerradas y hallazgos de
-- todos los tipos—; dejarla revuelta mete clientes inventados en el tablero de
-- una firma que audita de verdad.
--
-- **La solución: una sola igualdad, y vive en la BASE.**
--
--     organizaciones.es_demo = soy_dev()
--
-- A un lado la cartera real, al otro la de pruebas. Ninguna de las dos ve a la
-- otra, y el candado no es la pantalla: es el RLS, igual que el aislamiento
-- entre clientes (CLAUDE.md · regla 1).
--
-- ⚠️ **`dev` NO es un rol, es una MARCA encima del rol** (`usuarios.es_dev`).
-- Con un sexto rol, `es_socio()` sería falso para la cuenta de pruebas y ésa no
-- podría dar de alta un cliente, importar el catálogo ni repartir el equipo —
-- que es justo lo que hay que poder probar. Así la cuenta de pruebas es un
-- socio COMPLETO dentro de su partición, y de paso puede seguir probando cómo
-- se ve la app siendo consultor o auditor.
--
-- ⚠️ **`mis_organizaciones()` cambia de significado, y es el corazón de todo
-- esto.** Hasta hoy devolvía «las que tengo asignadas», y cada política añadía a
-- mano `or public.es_socio()` para que el socio viera la cartera entera. Esa
-- rama es una puerta lateral que se salta cualquier filtro que se ponga en la
-- otra: un socio de pruebas la cruzaría y vería los clientes reales. Desde hoy
-- `mis_organizaciones()` devuelve **todo lo que puedo ver, ya filtrado por
-- partición** —la rama del socio incluida— y las ~32 políticas que llevaban
-- `or public.es_socio()` la pierden.
--
-- **No es una relajación.** Para un socio que no sea dev el resultado es
-- idéntico al de antes: antes veía todas las organizaciones por la rama
-- lateral, ahora las ve porque `mis_organizaciones()` se las devuelve. Para
-- todos los demás, tampoco cambia nada: sus organizaciones asignadas están
-- todas de su lado de la partición.
--
-- ⚠️ **Lo que NO se parte, y es a propósito:**
--   · `usuarios` — la plantilla de la firma es una sola. Lo que sí se acota es
--     quién puede TOCARLA: un socio edita cuentas de su propio lado.
--   · `audit_logs` — se parte por `org_id` como todo lo demás; lo que no cuelga
--     de ninguna organización (altas de usuario, config, inicios de sesión) lo
--     sigue viendo sólo el socio real.
--   · `config_firma` — salvo `plantillas`, que se separa por espacio de nombres
--     desde la aplicación (`plantillas.dev`, ver `src/lib/auth/particion.ts`).
--     Los módulos encendidos y los datos de la firma son de la firma.
--   · `service_role` — **se salta el RLS entero**. El cron y las rutas de API
--     con la llave de servicio ven las dos particiones. Es exactamente lo mismo
--     que ya pasa con el aislamiento entre clientes, y por el mismo motivo.
--
-- ⚠️ Va DESPUÉS de `20260824180000_evidencia_de_campo.sql`: toca políticas que
-- nacen en las diez migraciones anteriores.
-- ============================================================================


-- ============================================================================
-- §1 · LAS COLUMNAS
-- ============================================================================

-- --------------------------------------------------------------- usuarios --
--
-- ⚠️ `default false` y NOT NULL: toda cuenta —las que ya existen y las que cree
-- el trigger `crear_perfil_usuario`— nace en la partición REAL. Es la misma
-- decisión que el rol naciendo en `cliente`: el arranque es el estado de menos
-- consecuencias, y ascender es un acto deliberado de alguien.
alter table public.usuarios
  add column es_dev boolean not null default false;

comment on column public.usuarios.es_dev is
  'Cuenta de pruebas: ve SÓLO los datos de demostración y ninguno real. No es un rol: se pone encima del rol.';

-- ---------------------------------------------------------- organizaciones --
--
-- La raíz de la partición, igual que es la raíz de la multi-tenencia. Todo lo
-- que lleva `org_id` queda partido por herencia, sin una columna más.
alter table public.organizaciones
  add column es_demo boolean not null default false;

comment on column public.organizaciones.es_demo is
  'De qué lado de la partición vive este cliente. Lo sella la base al crearlo; no se cambia desde la aplicación.';

-- ------------------------------------------------- normas · norma_clausulas --
--
-- El catálogo también se parte, y no por simetría: el importador es
-- **idempotente y marca `activa = false` lo que no viene en el archivo**
-- (`src/lib/normas/importador.ts`). Una prueba de importación contra un
-- catálogo compartido daría de baja cláusulas reales que los hallazgos del
-- cliente citan — y un hallazgo sin cláusula no es un hallazgo.
alter table public.normas
  add column es_demo boolean not null default false;

alter table public.norma_clausulas
  add column es_demo boolean not null default false;

comment on column public.normas.es_demo is
  'De qué lado de la partición vive esta norma del catálogo. La sella la base al crearla.';

comment on column public.norma_clausulas.es_demo is
  'Se hereda de la norma (heredar_particion_de_la_norma), nunca la manda el cliente.';

-- ⚠️ **`normas.clave` deja de ser única a secas y pasa a serlo POR PARTICIÓN.**
-- Sin esto, la partición de normas no sirve para nada: con `iso_9001` única en
-- toda la base, la cuenta de pruebas **no puede importar su propio catálogo**
-- mientras exista el del cliente, y su cartera de demostración se queda con
-- proyectos cuyo alcance apunta a normas que no puede ver.
--
-- El nombre del constraint se busca en vez de escribirse: `normas_clave_key` es
-- lo que Postgres pone por defecto, pero una base restaurada de un respaldo
-- puede traerlo con otro nombre y un `drop constraint` a ciegas abortaría la
-- migración entera.
do $$
declare
  v_nombre text;
begin
  select con.conname
    into v_nombre
    from pg_constraint con
   where con.conrelid = 'public.normas'::regclass
     and con.contype  = 'u'
     and con.conkey   = array[
       (select att.attnum
          from pg_attribute att
         where att.attrelid = 'public.normas'::regclass
           and att.attname  = 'clave')
     ];

  if v_nombre is not null then
    execute format('alter table public.normas drop constraint %I', v_nombre);
  end if;
end
$$;

alter table public.normas
  add constraint normas_clave_particion_key unique (clave, es_demo);

-- Los índices. La partición entra en el `where` de casi toda consulta de
-- catálogo, y en `mis_organizaciones()`, que se evalúa en cada política.
create index organizaciones_particion_idx  on public.organizaciones (es_demo);
create index norma_clausulas_particion_idx on public.norma_clausulas (es_demo);


-- ============================================================================
-- §2 · LAS FUNCIONES
-- ============================================================================

-- De qué lado está quien pregunta.
--
-- ⚠️ STABLE y SECURITY DEFINER por lo mismo que `es_socio()`: se consulta desde
-- dentro de una política, así que tiene que salirse del RLS una vez y en un
-- sitio auditado; y VOLATILE se evaluaría una vez POR FILA.
--
-- ⚠️ Sin sesión devuelve `false` —la partición real—, que es el valor de menos
-- consecuencias: ninguna política de datos alcanza a `anon` de todas formas,
-- porque todas van `to authenticated`.
create or replace function public.soy_dev()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios where id = auth.uid() and es_dev and activo
  )
$$;

comment on function public.soy_dev is
  'Si quien pregunta es una cuenta de pruebas. La igualdad que parte la base en dos: organizaciones.es_demo = soy_dev().';

-- ---------------------------------------------------- mis_organizaciones() --
--
-- **Todo lo que puedo ver, ya filtrado por partición.** Ver el encabezado: la
-- rama del socio se muda aquí desde las 32 políticas que la llevaban suelta.
--
-- ⚠️ El orden de las condiciones importa para el plan: `es_demo = soy_dev()`
-- primero, que corta la tabla por la mitad con el índice, y la pertenencia
-- después.
create or replace function public.mis_organizaciones()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select o.id
    from public.organizaciones o
   where o.es_demo = public.soy_dev()
     and (
       public.es_socio()
       or exists (
         select 1
           from public.usuarios_organizaciones uo
          where uo.usuario_id = auth.uid()
            and uo.org_id     = o.id
       )
     )
$$;

comment on function public.mis_organizaciones is
  'Las organizaciones que puedo ver, ya filtradas por partición y con la cartera completa si soy socio.';

-- --------------------------------------------------------- puedo_editar_org --
--
-- Misma función de siempre —socio, o asignado con papel distinto de `lectura`—
-- con la partición delante. Se comprueba contra la fila de la organización por
-- su clave primaria y no con `p_org in (select mis_organizaciones())`: esta
-- función se evalúa una vez por fila en los `WITH CHECK`, y ahí una búsqueda por
-- PK cuesta lo que un `exists` y un recorrido de la cartera entera no.
create or replace function public.puedo_editar_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
           select 1
             from public.organizaciones o
            where o.id      = p_org
              and o.es_demo = public.soy_dev()
         )
     and (
           public.es_socio()
           or exists (
             select 1
               from public.usuarios_organizaciones
              where usuario_id = auth.uid()
                and org_id     = p_org
                and papel     <> 'lectura'
           )
         )
$$;

comment on function public.puedo_editar_org is
  'Socio o asignado con papel distinto de lectura, y siempre dentro de mi partición.';

-- ------------------------------------------ puedo_borrar_org · _proyecto ----
--
-- Se les añade la partición y nada más: los candados de la regla 13 —sin
-- documentos, sin auditorías, sin hallazgos— siguen exactamente donde estaban.
--
-- ⚠️ `puedo_borrar_documento()` NO se toca: ya pasa por `puedo_editar_org()`,
-- así que hereda la partición sin una línea más. Es lo que se ganó poniendo la
-- condición en una función en vez de en cinco políticas.
create or replace function public.puedo_borrar_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_socio()
     and exists (select 1 from public.organizaciones o
                  where o.id = p_org and o.es_demo = public.soy_dev())
     and not exists (select 1 from public.documentos where org_id = p_org)
     and not exists (select 1 from public.auditorias where org_id = p_org)
     and not exists (select 1 from public.hallazgos  where org_id = p_org)
$$;

comment on function public.puedo_borrar_org is
  'Socio de la partición de la organización, y sin documentos, auditorías ni hallazgos.';

create or replace function public.puedo_borrar_proyecto(p_proyecto uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_socio()
     and exists (
       select 1
         from public.proyectos p
         join public.organizaciones o on o.id = p.org_id
        where p.id      = p_proyecto
          and o.es_demo = public.soy_dev()
     )
     and not exists (select 1 from public.documentos where proyecto_id = p_proyecto)
     and not exists (select 1 from public.auditorias where proyecto_id = p_proyecto)
$$;

comment on function public.puedo_borrar_proyecto is
  'Socio de la partición del proyecto, y sin documentos ni auditorías.';

-- ------------------------------------------------ asignar_folio_auditoria ---
--
-- ⚠️ **El consecutivo de la firma se parte, o el cliente ve huecos.** La función
-- es SECURITY DEFINER y cuenta fuera del RLS —tiene que serlo: un consultor no
-- ve las auditorías de los demás para poder contarlas—, así que sin esto una
-- auditoría de prueba se llevaría el `AUD-2026-007` y el cliente pasaría del 006
-- al 008 sin explicación. Y un folio que salta es justo lo que un auditor
-- externo pregunta.
--
-- ⚠️ **La partición de pruebas usa `DEMO-` en vez de `AUD-`**, y no es sólo para
-- evitar el `unique (folio)` —que también—: un folio que se lee `DEMO-2026-003`
-- dice de un vistazo, en una captura de pantalla o en un PDF exportado por
-- error, que eso no es una auditoría de nadie. El folio de un hallazgo se
-- compone del de su auditoría, así que hereda el prefijo solo.
create or replace function public.asignar_folio_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anio        int;
  v_consecutivo int;
  v_demo        boolean;
  v_prefijo     text;
begin
  if new.folio is not null and btrim(new.folio) <> '' then
    return new;
  end if;

  -- ⚠️ `current_date` NO: la base corre en UTC y a las 19:00 de México ya es el
  -- día siguiente. Una auditoría de fin de año se iría al folio del siguiente.
  v_anio := extract(year from coalesce(
              new.fecha_inicio,
              (now() at time zone 'America/Mexico_City')::date))::int;

  select o.es_demo into v_demo
    from public.organizaciones o
   where o.id = new.org_id;

  if v_demo is null then
    raise exception 'La organización % no existe', new.org_id using errcode = '23503';
  end if;

  v_prefijo := case when v_demo then 'DEMO' else 'AUD' end;

  perform pg_advisory_xact_lock(
    hashtext('folio_auditoria_' || v_prefijo || '_' || v_anio::text));

  -- ⚠️ Se cuenta por PARTICIÓN, no sólo por prefijo. Las auditorías que ya
  -- existían nacieron antes de que hubiera particiones y llevan `AUD-`: sin el
  -- `join`, la primera auditoría real de la firma arrancaría en el número
  -- siguiente al de la última de la demostración, y el cliente estrenaría su
  -- expediente en `AUD-2026-007`.
  select coalesce(max((regexp_match(
           a.folio, '^' || v_prefijo || '-[0-9]{4}-([0-9]+)$'))[1]::int), 0) + 1
    into v_consecutivo
    from public.auditorias a
    join public.organizaciones o on o.id = a.org_id
   where a.folio ~ ('^' || v_prefijo || '-' || v_anio::text || '-[0-9]+$')
     and o.es_demo = v_demo;

  new.folio := format('%s-%s-%s', v_prefijo, v_anio::text, lpad(v_consecutivo::text, 3, '0'));
  return new;
end
$$;

comment on function public.asignar_folio_auditoria is
  'AUD-2026-014, o DEMO-2026-014 en la partición de pruebas. Consecutivo de la firma por partición, calculado fuera del RLS.';


-- ============================================================================
-- §3 · LOS TRIGGERS — la partición la sella la BASE
-- ============================================================================

-- ⚠️ **La partición no se manda desde el navegador, ni al crear ni al editar.**
-- Es la misma decisión que `heredar_org_del_proyecto()`, y por el mismo motivo:
-- un campo que viaja desde el cliente es un campo que se puede cambiar a mano, y
-- éste es el que decide qué cartera se ve.
--
-- ⚠️ El `raise` sólo alcanza a `authenticated`. Una conexión directa —psql, el
-- editor SQL del panel, una restauración— pasa: es la única manera de mover una
-- fila de lado, y tiene que existir para poder marcar la cartera de
-- demostración (§5) y para deshacerlo si el dueño se arrepiente. Es el mismo
-- reparto que `proteger_rol_usuario()`.
create or replace function public.sellar_particion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol_jwt text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  if tg_op = 'INSERT' then
    new.es_demo := public.soy_dev();
    return new;
  end if;

  if new.es_demo is distinct from old.es_demo and v_rol_jwt = 'authenticated' then
    raise exception 'La partición de una fila no se cambia desde la aplicación'
      using errcode = '42501';
  end if;

  return new;
end
$$;

create trigger organizaciones_particion
  before insert or update on public.organizaciones
  for each row execute function public.sellar_particion();

create trigger normas_particion
  before insert or update on public.normas
  for each row execute function public.sellar_particion();

-- Una cláusula está donde esté su norma. Mismo patrón que
-- `heredar_org_del_proyecto()`: el navegador no tiene por qué saberlo, y aunque
-- lo mandara bien, el `WITH CHECK` sólo comprobaría que sea SU partición, no que
-- sea la de la norma.
create or replace function public.heredar_particion_de_la_norma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demo boolean;
begin
  select es_demo into v_demo from public.normas where id = new.norma_id;

  if v_demo is null then
    raise exception 'La norma % no existe', new.norma_id using errcode = '23503';
  end if;

  new.es_demo := v_demo;
  return new;
end
$$;

create trigger norma_clausulas_particion
  before insert or update on public.norma_clausulas
  for each row execute function public.heredar_particion_de_la_norma();

-- Y si una norma cambia de lado —sólo desde una conexión directa—, sus
-- cláusulas la siguen. Sin esto, mover el catálogo dejaría un árbol partido a la
-- mitad: la norma de un lado y sus cláusulas del otro, que en pantalla se ve
-- como una norma sin cláusulas y en `generar_lista_verificacion()` como una
-- auditoría sin lista.
create or replace function public.propagar_particion_de_la_norma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.es_demo is distinct from old.es_demo then
    update public.norma_clausulas
       set es_demo = new.es_demo
     where norma_id = new.id;
  end if;
  return null;
end
$$;

create trigger normas_propagar_particion
  after update on public.normas
  for each row execute function public.propagar_particion_de_la_norma();

-- ------------------------------------------------------ proteger_rol_usuario --
--
-- `es_dev` se suma a las columnas que nadie se cambia solo, y con un reparto más
-- fino que el de `rol`:
--
--   · Un socio REAL manda sobre todo: es quien reparte los roles de la firma y
--     quien concede o retira la marca de pruebas.
--   · Un socio de PRUEBAS manda dentro de su partición y en ningún otro sitio:
--     puede cambiarle el rol o el estado a otra cuenta de pruebas —hace falta
--     para probar cómo se ve la app con cada rol—, nunca a una cuenta real, y
--     **nunca la marca `es_dev`, ni la de nadie ni la suya**. Ésa es la pared:
--     si una cuenta de pruebas pudiera quitarse su propia marca, la partición
--     sería una cortesía y no un candado.
create or replace function public.proteger_rol_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol_jwt text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  if new.rol    is distinct from old.rol
  or new.activo is distinct from old.activo
  or new.es_dev is distinct from old.es_dev then

    -- 'authenticated' es una persona con sesión. El `service_role` (el alta de
    -- usuarios de /api/users) y las conexiones directas sin JWT (migraciones,
    -- respaldos) pasan.
    if v_rol_jwt = 'authenticated' then
      if not public.es_socio() then
        raise exception 'Sólo un socio puede cambiar el rol o el estado de un usuario'
          using errcode = '42501';
      end if;

      if public.soy_dev() and (
           new.es_dev is distinct from old.es_dev
        or not old.es_dev
      ) then
        raise exception 'Una cuenta de pruebas sólo administra cuentas de pruebas, y nunca la marca de pruebas'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end
$$;


-- ============================================================================
-- §4 · LAS POLÍTICAS
--
-- Todas las que llevaban `or public.es_socio()` como rama de VISIBILIDAD la
-- pierden: esa rama ya vive dentro de `mis_organizaciones()`, y allí sí está
-- filtrada por partición. Las que usan `es_socio()` como PODER —quién da de
-- alta, quién borra evidencia— la conservan y se les añade la partición.
--
-- ⚠️ Se recrean, no se editan las migraciones que las crearon: una migración
-- aplicada no se toca (docs/03 §4.1).
-- ============================================================================

-- ═══════════════════════════════════ migración 1 · el esquema base ═════════

-- ---------------------------------------------------------- organizaciones --
drop policy if exists "organizaciones_select" on public.organizaciones;

create policy "organizaciones_select" on public.organizaciones for select to authenticated
  using (id in (select public.mis_organizaciones()));

-- El alta sigue siendo del socio y sigue sin poder pedir partición: la sella
-- `sellar_particion()`. Un socio de pruebas da de alta clientes de prueba y un
-- socio real da de alta clientes reales, con el mismo botón y sin decidir nada.
drop policy if exists "organizaciones_insert" on public.organizaciones;

create policy "organizaciones_insert" on public.organizaciones for insert to authenticated
  with check (public.es_socio());

-- ---------------------------------------------------------------- usuarios --
--
-- ⚠️ **El socio REAL sigue viendo a todo el mundo, cuentas de pruebas
-- incluidas**, y es deliberado: es quien concede y retira la marca, y no se
-- puede retirar lo que no se ve. Al revés no: una cuenta de pruebas ve a quien
-- comparte con ella una organización de su partición, y a nadie más.
drop policy if exists "usuarios_select" on public.usuarios;

create policy "usuarios_select" on public.usuarios for select to authenticated
  using (
    id = auth.uid()
    or (public.es_socio() and not public.soy_dev())
    or exists (
      select 1 from public.usuarios_organizaciones uo
       where uo.usuario_id = public.usuarios.id
         and uo.org_id in (select public.mis_organizaciones())
    )
  );

-- Un socio edita perfiles de su propio lado. `rol`, `activo` y `es_dev` los
-- protege además `proteger_rol_usuario()`; esto acota el resto —nombre,
-- teléfono, certificaciones—, que también sale impreso en un informe.
drop policy if exists "usuarios_update" on public.usuarios;

create policy "usuarios_update" on public.usuarios for update to authenticated
  using      (id = auth.uid()
              or (public.es_socio() and (not public.soy_dev() or public.usuarios.es_dev)))
  with check (id = auth.uid()
              or (public.es_socio() and (not public.soy_dev() or public.usuarios.es_dev)));

-- ------------------------------------------------- usuarios_organizaciones --
--
-- Las dos ramas de antes —`usuario_id = auth.uid()` y `or es_socio()`— se caen
-- porque las dos sobran: tener una fila aquí es exactamente lo que le mete a uno
-- la organización en `mis_organizaciones()`, y a un socio esa función ya le
-- devuelve su partición entera.
drop policy if exists "usuarios_organizaciones_select" on public.usuarios_organizaciones;

create policy "usuarios_organizaciones_select" on public.usuarios_organizaciones
  for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "usuarios_organizaciones_insert" on public.usuarios_organizaciones;

create policy "usuarios_organizaciones_insert" on public.usuarios_organizaciones
  for insert to authenticated
  with check (public.es_socio() and org_id in (select public.mis_organizaciones()));

drop policy if exists "usuarios_organizaciones_update" on public.usuarios_organizaciones;

create policy "usuarios_organizaciones_update" on public.usuarios_organizaciones
  for update to authenticated
  using      (public.es_socio() and org_id in (select public.mis_organizaciones()))
  with check (public.es_socio() and org_id in (select public.mis_organizaciones()));

drop policy if exists "usuarios_organizaciones_delete" on public.usuarios_organizaciones;

create policy "usuarios_organizaciones_delete" on public.usuarios_organizaciones
  for delete to authenticated
  using (public.es_socio() and org_id in (select public.mis_organizaciones()));

-- -------------------------------------------------------------- audit_logs --
--
-- ⚠️ La bitácora se parte por `org_id` como todo lo demás — y aquí importa más
-- que en ninguna otra tabla, porque `audit_logs.despues` lleva **la fila
-- entera**. Dejar `or es_socio()` suelto aquí habría hecho inútil el resto de la
-- migración: la cartera del cliente se leería completa desde la bitácora.
--
-- Lo que no cuelga de ninguna organización —altas de usuario, cambios de
-- configuración, inicios de sesión— lo sigue viendo sólo el socio real, y **sólo
-- eso**: el `org_id is null` de la segunda rama es lo que impide que la bitácora
-- se convierta en la puerta de atrás en el otro sentido, con el socio del
-- cliente leyendo los movimientos de la partición de pruebas.
drop policy if exists "audit_logs_select" on public.audit_logs;

create policy "audit_logs_select" on public.audit_logs for select to authenticated
  using (
    org_id in (select public.mis_organizaciones())
    or (org_id is null and public.es_socio() and not public.soy_dev())
  );

-- ═══════════════════════════════ migración 5 · cartera y proyectos ═════════

drop policy if exists "sitios_select" on public.sitios;
create policy "sitios_select" on public.sitios for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "contactos_select" on public.contactos;
create policy "contactos_select" on public.contactos for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "proyectos_select" on public.proyectos;
create policy "proyectos_select" on public.proyectos for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "proyecto_normas_select" on public.proyecto_normas;
create policy "proyecto_normas_select" on public.proyecto_normas for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "proyecto_sitios_select" on public.proyecto_sitios;
create policy "proyecto_sitios_select" on public.proyecto_sitios for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "bitacora_proyecto_select" on public.bitacora_proyecto;
create policy "bitacora_proyecto_select" on public.bitacora_proyecto for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

-- ⚠️ `bitacora_proyecto_update` NO se toca: su `or public.es_socio()` no es una
-- rama de visibilidad sino de autoría —«la nota de otro sólo la corrige un
-- socio»— y va dentro de un `puedo_editar_org(org_id)` que ya trae la partición.

-- ------------------------------------------------ normas · norma_clausulas --
--
-- El catálogo deja de leerlo «cualquiera con sesión» y pasa a leerlo cualquiera
-- **de su lado**. Sigue sin tener `org_id` —no es de ningún cliente, es de la
-- firma— y sigue en la lista de EXENTAS de `.github/workflows/rls-check.yml`.
drop policy if exists "normas_select" on public.normas;
create policy "normas_select" on public.normas for select to authenticated
  using (es_demo = public.soy_dev());

-- Sin partición en el WITH CHECK: la sella el trigger, y pedirla aquí sería
-- pedirle al navegador un dato que no tiene por qué saber.
drop policy if exists "normas_insert" on public.normas;
create policy "normas_insert" on public.normas for insert to authenticated
  with check (public.es_socio());

drop policy if exists "normas_update" on public.normas;
create policy "normas_update" on public.normas for update to authenticated
  using      (public.es_socio() and es_demo = public.soy_dev())
  with check (public.es_socio() and es_demo = public.soy_dev());

drop policy if exists "norma_clausulas_select" on public.norma_clausulas;
create policy "norma_clausulas_select" on public.norma_clausulas for select to authenticated
  using (es_demo = public.soy_dev());

drop policy if exists "norma_clausulas_insert" on public.norma_clausulas;
create policy "norma_clausulas_insert" on public.norma_clausulas for insert to authenticated
  with check (public.es_socio());

drop policy if exists "norma_clausulas_update" on public.norma_clausulas;
create policy "norma_clausulas_update" on public.norma_clausulas for update to authenticated
  using      (public.es_socio() and es_demo = public.soy_dev())
  with check (public.es_socio() and es_demo = public.soy_dev());

-- ═══════════════════════════ migración 6 · tareas y depuración ═════════════

drop policy if exists "tareas_etapa_select" on public.tareas_etapa;
create policy "tareas_etapa_select" on public.tareas_etapa for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

-- ═══════════════════════════ migración 7 · sistemas de gestión ═════════════

drop policy if exists "procesos_select" on public.procesos;
create policy "procesos_select" on public.procesos for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "documentos_select" on public.documentos;
create policy "documentos_select" on public.documentos for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "documento_versiones_select" on public.documento_versiones;
create policy "documento_versiones_select" on public.documento_versiones for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "documento_clausulas_select" on public.documento_clausulas;
create policy "documento_clausulas_select" on public.documento_clausulas for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "adjuntos_select" on public.adjuntos;
create policy "adjuntos_select" on public.adjuntos for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

-- ⚠️ Sigue siendo **sólo el socio** —una foto de auditoría es evidencia—, ahora
-- además sólo dentro de su partición.
drop policy if exists "adjuntos_delete" on public.adjuntos;
create policy "adjuntos_delete" on public.adjuntos for delete to authenticated
  using (public.es_socio() and org_id in (select public.mis_organizaciones()));

drop policy if exists "requisitos_select" on public.requisitos;
create policy "requisitos_select" on public.requisitos for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "riesgos_select" on public.riesgos;
create policy "riesgos_select" on public.riesgos for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "indicadores_select" on public.indicadores;
create policy "indicadores_select" on public.indicadores for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "mediciones_select" on public.mediciones;
create policy "mediciones_select" on public.mediciones for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

-- ═══════════════════════════ migración 9 · auditorías y hallazgos ══════════

drop policy if exists "programa_auditorias_select" on public.programa_auditorias;
create policy "programa_auditorias_select" on public.programa_auditorias for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "auditorias_select" on public.auditorias;
create policy "auditorias_select" on public.auditorias for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "auditoria_normas_select" on public.auditoria_normas;
create policy "auditoria_normas_select" on public.auditoria_normas for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "auditoria_sitios_select" on public.auditoria_sitios;
create policy "auditoria_sitios_select" on public.auditoria_sitios for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "auditoria_procesos_select" on public.auditoria_procesos;
create policy "auditoria_procesos_select" on public.auditoria_procesos for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "auditoria_equipo_select" on public.auditoria_equipo;
create policy "auditoria_equipo_select" on public.auditoria_equipo for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "auditoria_agenda_select" on public.auditoria_agenda;
create policy "auditoria_agenda_select" on public.auditoria_agenda for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "auditoria_items_select" on public.auditoria_items;
create policy "auditoria_items_select" on public.auditoria_items for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "hallazgos_select" on public.hallazgos;
create policy "hallazgos_select" on public.hallazgos for select to authenticated
  using (org_id in (select public.mis_organizaciones()));

drop policy if exists "hallazgos_historial_select" on public.hallazgos_historial;
create policy "hallazgos_historial_select" on public.hallazgos_historial for select to authenticated
  using (org_id in (select public.mis_organizaciones()));


-- ============================================================================
-- §5 · LOS DATOS QUE YA ESTÁN
--
-- ⚠️ **Todo lo que hay hoy en la base es la demostración**, y a partir de aquí
-- vive del lado de pruebas. Si al aplicar esto la aplicación se ve vacía, no
-- está rota: está limpia, y falta marcar la cuenta de pruebas.
--
--     update public.usuarios set es_dev = true where correo = 'tu@correo';
--
-- Esa línea NO va en la migración a propósito: decidir qué cuenta es la de
-- pruebas es del dueño, igual que ascender al primer socio
-- (docs/09_TAREAS_DEL_DUENO.md · A10).
-- ============================================================================

-- La cartera de demostración, entera.
update public.organizaciones set es_demo = true where es_demo = false;

-- Y el catálogo con el que se armó. Las cláusulas NO se tocan aquí: se van
-- solas con `propagar_particion_de_la_norma()`. Si se actualizaran a mano ANTES
-- que su norma, el trigger `heredar_particion_de_la_norma()` volvería a leer la
-- norma —todavía del lado real— y las devolvería a su sitio.
--
-- ⚠️ El cliente sube su catálogo de nuevo desde `/sistemas?tab=normas`, que es
-- la tarea `B03` de su lista y son dos minutos: el `.md` es suyo y vive fuera
-- del repositorio (CLAUDE.md · regla 12). A cambio, la cartera de demostración
-- se queda coherente —sus proyectos siguen viendo las normas de su alcance— en
-- vez de quedarse con un alcance que apunta a cláusulas invisibles.
update public.normas set es_demo = true where es_demo = false;

-- ⚠️ **Y las auditorías de la demostración se renumeran al prefijo de su
-- partición.** No es cosmético: `auditorias.folio` es UNIQUE en TODA la base, así
-- que un `AUD-2026-001` de mentira se queda con el primer folio de la firma para
-- siempre — la primera auditoría de verdad tendría que llamarse `AUD-2026-002`,
-- y un folio que arranca en el dos es lo primero que pregunta un organismo
-- certificador.
--
-- El folio de un hallazgo se compone del de su auditoría, así que se mueve con
-- ella. Ninguna de las dos escrituras deja renglón en `hallazgos_historial`:
-- `registrar_historial_hallazgo()` sólo registra los nueve campos que describen
-- el hallazgo, y `folio` no es uno de ellos.
update public.auditorias a
   set folio = 'DEMO-' || substring(a.folio from 5)
  from public.organizaciones o
 where o.id = a.org_id
   and o.es_demo
   and a.folio like 'AUD-%';

update public.hallazgos h
   set folio = 'DEMO-' || substring(h.folio from 5)
  from public.organizaciones o
 where o.id = h.org_id
   and o.es_demo
   and h.folio like 'AUD-%';
