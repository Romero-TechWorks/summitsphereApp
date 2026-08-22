-- ============================================================================
-- FASE 02 · Storage — los buckets `documentos` y `evidencias`
--
-- ⚠️ **Migración aparte a propósito, y no es manía de orden.**
-- `create policy on storage.objects` toca un esquema que no es nuestro. Según
-- cómo esté configurado el proyecto de Supabase puede fallar por permisos, y si
-- fuera dentro de `20260822120000_sistemas_de_gestion.sql` se llevaría por
-- delante el esquema entero de la fase. Aquí, si falla, el dominio ya está
-- aplicado y esto se resuelve desde el panel (docs/09 · `C03` y `C04`).
--
-- ⚠️ **Los dos buckets son PRIVADOS, y eso no tiene arreglo posterior.** Un
-- bucket público deja los documentos y las fotos de auditoría de las plantas de
-- los clientes accesibles para cualquiera con el link — y una vez que el link
-- circuló, cerrarlo después no sirve de nada. Por eso el `on conflict` de abajo
-- **vuelve a poner `public = false`** aunque alguien lo haya creado a mano
-- marcando la casilla equivocada. docs/08 §4.
--
-- La ruta empieza SIEMPRE por la organización, y eso es lo que aísla a un
-- cliente de otro:
--   documentos/{org_id}/{documento_id}/{archivo}
--   evidencias/{org_id}/{aaaa}/{uuid}-{nombre}
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values
  -- 50 MB: un manual de calidad con imágenes cabe de sobra.
  ('documentos', 'documentos', false, 52428800),
  -- 25 MB: una foto de teléfono ronda los 4 MB; un video corto de una condición
  -- insegura, unos 20.
  ('evidencias', 'evidencias', false, 26214400)
on conflict (id) do update set public = false;

-- La organización a la que pertenece un objeto: el primer segmento de su ruta.
--
-- ⚠️ Devuelve `null` en vez de reventar cuando el primer segmento no es un UUID.
-- Sin esto, un objeto con una ruta rara —o un intento a mano— daría un 22P02
-- («invalid input syntax for type uuid») en mitad de una política, que es un
-- error incomprensible donde lo correcto es un simple «no».
--
-- ⚠️ `split_part(ruta, '/', 1)` y no `storage.foldername(ruta)[1]`, que es lo
-- que trae el ejemplo de docs/08: son el mismo primer segmento, pero
-- `storage.foldername` está declarada VOLATILE en el esquema de Supabase, y una
-- función VOLATILE dentro de una política se reevalúa por fila. `split_part` es
-- inmutable de verdad.
create or replace function public.org_de_la_ruta(p_ruta text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(p_ruta, '/', 1) ~*
         '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_ruta, '/', 1)::uuid
  end
$$;

comment on function public.org_de_la_ruta is
  'La org_id del primer segmento de una ruta de Storage. null si no es un UUID, nunca una excepción.';

-- ---------------------------------------------------------------------------
-- bucket `documentos` — los documentos del SGC de los clientes
-- ---------------------------------------------------------------------------

-- Se lee firmando la ruta al vuelo, nunca por URL pública.
create policy "documentos_leer" on storage.objects for select to authenticated
using (
  bucket_id = 'documentos'
  and (
    public.org_de_la_ruta(name) in (select public.mis_organizaciones())
    or public.es_socio()
  )
);

-- Subir exige el mismo permiso que escribir en la organización: `puedo_editar_org()`
-- deja fuera al papel `lectura`, igual que en las tablas.
create policy "documentos_subir" on storage.objects for insert to authenticated
with check (
  bucket_id = 'documentos'
  and public.puedo_editar_org(public.org_de_la_ruta(name))
);

-- Reemplazar el archivo de una versión en borrador. El trigger
-- `proteger_version_aprobada()` es quien impide que eso pase en una aprobada:
-- la fila no se deja cambiar `archivo_ruta`, así que el objeto de una versión
-- aprobada ya no lo referencia nadie que pueda moverlo.
create policy "documentos_reemplazar" on storage.objects for update to authenticated
using      (bucket_id = 'documentos' and public.puedo_editar_org(public.org_de_la_ruta(name)))
with check (bucket_id = 'documentos' and public.puedo_editar_org(public.org_de_la_ruta(name)));

-- ⚠️ Sólo el socio. El archivo original de una versión es lo que firmó el
-- cliente y lo que un auditor externo pide; borrarlo desde la app tiene que ser
-- una decisión, no un resbalón.
create policy "documentos_borrar" on storage.objects for delete to authenticated
using (bucket_id = 'documentos' and public.es_socio());

-- ---------------------------------------------------------------------------
-- bucket `evidencias` — adjuntos de tareas, documentos y (Fase 03) hallazgos
-- ---------------------------------------------------------------------------

create policy "evidencias_leer" on storage.objects for select to authenticated
using (
  bucket_id = 'evidencias'
  and (
    public.org_de_la_ruta(name) in (select public.mis_organizaciones())
    or public.es_socio()
  )
);

create policy "evidencias_subir" on storage.objects for insert to authenticated
with check (
  bucket_id = 'evidencias'
  and public.puedo_editar_org(public.org_de_la_ruta(name))
);

-- ⚠️ Sin política de UPDATE, y es deliberado. Una evidencia no se reemplaza: si
-- la foto salió movida, se sube otra. Dejar que un objeto de evidencia cambie de
-- contenido conservando su ruta es exactamente lo que un auditor externo no
-- puede permitir — la fila de `adjuntos` diría una cosa y el archivo sería otra.

-- Igual que arriba: sólo el socio, y en la tabla `adjuntos` la política de
-- DELETE dice lo mismo.
create policy "evidencias_borrar" on storage.objects for delete to authenticated
using (bucket_id = 'evidencias' and public.es_socio());
