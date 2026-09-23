-- ============================================================================
-- F06·B4 · BUSCADOR GLOBAL
--
-- Tarea `G00`. La vigésima primera. `docs/03` §8.16 · `docs/04` · Fase 06.
--
-- La vista `indice_busqueda_global` junta las fuentes del buscador de la Navbar
-- y la RPC `buscar_global()` las consulta **por prefijo**: se teclea a medias
-- palabras —«calibr», «AUD-2026-01»—, así que cada palabra es `'calibr':*` y
-- no un `websearch_to_tsquery`, que exige la palabra entera.
--
-- **Las fuentes son siete, no seis**: las seis del plan —organizaciones,
-- proyectos, documentos, hallazgos, acciones y obligaciones— **más las
-- auditorías**. Lo primero que teclea un auditor es un folio `AUD-2026-014`, y
-- sin ellas la búsqueda devolvería sus hallazgos pero no la auditoría.
--
-- ⚠️ **LA VISTA ES `security_invoker = true`, Y ES TODO EL PUNTO** (regla 6).
-- Sin esa propiedad una vista corre con los permisos de su dueño —`postgres`,
-- que se salta el RLS— y el buscador sería la puerta trasera de la
-- multi-tenencia: el hallazgo de la planta A apareciendo al teclear en la
-- cuenta de la planta B. Con ella, cada una de las siete tablas aplica su propia
-- política a quien busca, **partición de pruebas incluida**. Al recrear la
-- vista, la propiedad se vuelve a poner.
--
-- ⚠️ **La RPC es `SECURITY INVOKER` por lo mismo**, y sin `revoke` de más: no
-- ve nada que la persona no pudiera leer tabla por tabla.
--
-- **Sin índice, a propósito.** El `tsvector` se calcula al vuelo: la firma
-- tiene cientos de filas por fuente, no millones, y un índice GIN por tabla
-- serían siete columnas generadas que mantener por un buscador que hoy tarda
-- milisegundos. El día que haga falta, cada fuente gana su columna generada con
-- `texto_busqueda()` —que es IMMUTABLE justo para eso— y la vista no cambia.
--
-- ✅ **Es aditiva**: una función, una vista y una RPC. No toca ninguna tabla.
-- ============================================================================


-- ============================================================================
-- §1 · EL TEXTO QUE SE COMPARA
-- ============================================================================

-- Minúsculas, sin acentos y **sólo letras y números separados por espacios**,
-- para que «calibracion» encuentre «Calibración» y «nino» encuentre «Niño».
--
-- ⚠️ **Los signos se vuelven espacios ANTES del `to_tsvector`, y no es
-- cosmético.** El analizador de Postgres lee `AUD-2026-001` como la palabra
-- `aud` y los enteros NEGATIVOS `-2026` y `-001`, así que un folio nunca
-- casaba con lo que se teclea. Con los signos fuera, el documento y la consulta
-- se parten igual: `aud 2026 001`.
--
-- Con `translate` y no con la extensión `unaccent`: `unaccent()` no es
-- IMMUTABLE —depende de un diccionario que se puede cambiar— y así esta función
-- sirve mañana para una columna generada.
create or replace function public.texto_busqueda(p_texto text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select btrim(regexp_replace(
    translate(
      lower(coalesce(p_texto, '')),
      'áàäâãéèëêíìïîóòöôõúùüûñç',
      'aaaaaeeeeiiiiooooouuuunc'
    ),
    '[^a-z0-9]+', ' ', 'g'
  ))
$$;

comment on function public.texto_busqueda is
  'Minúsculas, sin acentos y sólo letras y números. IMMUTABLE: sirve para una columna generada el día que el buscador necesite índice.';


-- ============================================================================
-- §2 · LA VISTA
-- ============================================================================

-- Una fila por cosa encontrable, con lo que el buscador pinta y lo que necesita
-- para armar el enlace. **El nombre del cliente entra en el texto de cada
-- fila**: «aceros calibr» encuentra los hallazgos de calibración de Aceros, que
-- es como se busca de verdad.
--
-- `auditoria_id` sólo lo llevan los hallazgos (su expediente vive en su
-- auditoría) y va nulo en las demás fuentes.
create or replace view public.indice_busqueda_global
with (security_invoker = true)
as
  select
    'organizacion'::text                        as tipo,
    o.id,
    o.id                                        as org_id,
    coalesce(o.nombre_comercial, o.razon_social) as organizacion,
    o.rfc                                       as folio,
    coalesce(o.nombre_comercial, o.razon_social) as titulo,
    nullif(concat_ws(' · ', o.razon_social, o.giro), '') as detalle,
    null::uuid                                  as auditoria_id,
    o.estado,
    o.actualizado_en,
    to_tsvector('simple', public.texto_busqueda(
      concat_ws(' ', o.razon_social, o.nombre_comercial, o.rfc, o.giro)
    ))                                          as documento
  from public.organizaciones o

  union all

  select
    'proyecto', p.id, p.org_id,
    coalesce(o.nombre_comercial, o.razon_social),
    null,
    p.nombre,
    p.objetivo,
    null::uuid,
    p.estado,
    p.actualizado_en,
    to_tsvector('simple', public.texto_busqueda(
      concat_ws(' ', p.nombre, p.objetivo, o.razon_social, o.nombre_comercial)
    ))
  from public.proyectos p
  join public.organizaciones o on o.id = p.org_id

  union all

  select
    'documento', d.id, d.org_id,
    coalesce(o.nombre_comercial, o.razon_social),
    d.codigo,
    d.titulo,
    null,
    null::uuid,
    d.estado,
    d.actualizado_en,
    to_tsvector('simple', public.texto_busqueda(
      concat_ws(' ', d.codigo, d.titulo, o.razon_social, o.nombre_comercial)
    ))
  from public.documentos d
  join public.organizaciones o on o.id = d.org_id

  union all

  select
    'auditoria', a.id, a.org_id,
    coalesce(o.nombre_comercial, o.razon_social),
    a.folio,
    a.titulo,
    a.alcance,
    null::uuid,
    a.estado,
    a.actualizado_en,
    to_tsvector('simple', public.texto_busqueda(
      concat_ws(' ', a.folio, a.titulo, a.alcance, a.objetivo, o.razon_social, o.nombre_comercial)
    ))
  from public.auditorias a
  join public.organizaciones o on o.id = a.org_id

  union all

  -- ⚠️ Los anulados SÍ entran. Siguen en la base con su motivo (regla 13), y
  -- quien busca un folio que vio en papel tiene que encontrarlo — aunque sea
  -- para leer por qué se anuló. La pantalla dice el estado.
  select
    'hallazgo', h.id, h.org_id,
    coalesce(o.nombre_comercial, o.razon_social),
    h.folio,
    h.descripcion,
    h.requisito_incumplido,
    h.auditoria_id,
    h.estado,
    h.actualizado_en,
    to_tsvector('simple', public.texto_busqueda(
      concat_ws(' ', h.folio, h.descripcion, h.requisito_incumplido, h.evidencia_objetiva,
                o.razon_social, o.nombre_comercial)
    ))
  from public.hallazgos h
  join public.organizaciones o on o.id = h.org_id

  union all

  -- Las dos series de folio de una acción: la nuestra (`ACC-2026-105`) y la
  -- del cliente (`AC-FA-01-25`). El Coordinador del SGC teclea la suya.
  select
    'accion', ac.id, ac.org_id,
    coalesce(o.nombre_comercial, o.razon_social),
    coalesce(ac.folio_cliente, ac.folio),
    ac.descripcion,
    nullif(concat_ws(' · ', ac.folio, ac.folio_cliente), ''),
    null::uuid,
    ac.estado,
    ac.actualizado_en,
    to_tsvector('simple', public.texto_busqueda(
      concat_ws(' ', ac.folio, ac.folio_cliente, ac.descripcion, o.razon_social, o.nombre_comercial)
    ))
  from public.acciones ac
  join public.organizaciones o on o.id = ac.org_id

  union all

  select
    'obligacion', ob.id, ob.org_id,
    coalesce(o.nombre_comercial, o.razon_social),
    null,
    coalesce(nullif(ob.elemento, ''), left(ob.obligacion, 120)),
    ob.fuente,
    null::uuid,
    ob.estado_cumplimiento,
    ob.actualizado_en,
    to_tsvector('simple', public.texto_busqueda(
      concat_ws(' ', ob.elemento, ob.obligacion, ob.fuente, o.razon_social, o.nombre_comercial)
    ))
  from public.obligaciones ob
  join public.organizaciones o on o.id = ob.org_id;

comment on view public.indice_busqueda_global is
  'Las siete fuentes del buscador global. security_invoker: cada tabla aplica su RLS a quien busca. Al recrearla, la propiedad se vuelve a poner.';

revoke all on public.indice_busqueda_global from anon, public;
grant select on public.indice_busqueda_global to authenticated;


-- ============================================================================
-- §3 · LA RPC
-- ============================================================================

-- Cada palabra tecleada, sin acentos y partida en letras y números, se vuelve
-- un prefijo, y todas tienen que estar: «aceros calibr» → `'aceros':* &
-- 'calibr':*`. Un folio se parte igual —«AUD-2026-01» → `'aud':* & '2026':* &
-- '01':*`— y casa con el `tsvector`, que `texto_busqueda()` parte igual.
--
-- ⚠️ **La consulta nunca se interpola en `to_tsquery` tal cual.** Un `'` o un
-- `&` sueltos en lo que teclea alguien romperían la sintaxis; aquí sólo llegan
-- trozos `[a-z0-9]+`, así que no hay nada que escapar.
--
-- Con una consulta vacía —o sólo signos— devuelve cero filas, no la base
-- entera.
create or replace function public.buscar_global(p_consulta text, p_limite int default 40)
returns table (
  tipo           text,
  id             uuid,
  org_id         uuid,
  organizacion   text,
  folio          text,
  titulo         text,
  detalle        text,
  auditoria_id   uuid,
  estado         text,
  actualizado_en timestamptz,
  rango          real
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_prefijos text;
  v_consulta tsquery;
begin
  select string_agg(trozo || ':*', ' & ')
    into v_prefijos
    from regexp_split_to_table(public.texto_busqueda(p_consulta), '[^a-z0-9]+') as trozo
   where trozo <> '';

  if v_prefijos is null then
    return;
  end if;

  v_consulta := to_tsquery('simple', v_prefijos);

  return query
    select i.tipo, i.id, i.org_id, i.organizacion, i.folio, i.titulo, i.detalle,
           i.auditoria_id, i.estado, i.actualizado_en,
           ts_rank(i.documento, v_consulta) as rango
      from public.indice_busqueda_global i
     where i.documento @@ v_consulta
     -- Por la expresión y no por `rango`: en plpgsql las columnas de
     -- `returns table` son variables, y `order by rango` sería ambiguo.
     order by ts_rank(i.documento, v_consulta) desc, i.actualizado_en desc
     limit least(greatest(coalesce(p_limite, 40), 1), 100);
end
$$;

comment on function public.buscar_global is
  'El buscador de la Navbar, por prefijo. SECURITY INVOKER sobre una vista security_invoker: no ve nada que quien busca no pudiera leer tabla por tabla.';

revoke all on function public.buscar_global(text, int) from anon, public;
grant execute on function public.buscar_global(text, int) to authenticated;
