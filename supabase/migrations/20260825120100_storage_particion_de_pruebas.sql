-- ============================================================================
-- A10 · La partición de pruebas — Storage            ·   MIGRACIÓN 12
--
-- ⚠️ **Migración aparte a propósito, por lo mismo que la de la Fase 02.**
-- `create policy on storage.objects` toca un esquema que no es nuestro y puede
-- fallar por permisos según cómo esté configurado el proyecto. Si fuera dentro
-- de `20260825120000_particion_de_pruebas.sql` se llevaría por delante la
-- partición entera; aquí, si falla, el dominio ya está partido y esto se
-- resuelve desde el panel.
--
-- Dos cosas, y las dos son la misma que en las tablas:
--
--   1. **Leer**: se cae el `or public.es_socio()`, que era la puerta lateral. La
--      rama del socio ya vive dentro de `mis_organizaciones()`, filtrada por
--      partición. Un objeto se lee si su carpeta —el primer segmento de la
--      ruta, que es la `org_id`— está de mi lado.
--   2. **Borrar**: sigue siendo sólo el socio, ahora sólo en su partición.
--      ⚠️ Y esto además **tapa un agujero que ya existía**: `es_socio()` a secas
--      dejaba borrar cualquier objeto del bucket, incluidos los que tienen una
--      ruta que `org_de_la_ruta()` no sabe leer y que por tanto nadie puede ver.
--      Poder borrar lo que no se puede ver no es un permiso, es un accidente
--      esperando.
--
-- `documentos_subir`, `documentos_reemplazar` y `evidencias_subir` NO se tocan:
-- pasan por `puedo_editar_org()`, que ya trae la partición.
-- ============================================================================

drop policy if exists "documentos_leer" on storage.objects;

create policy "documentos_leer" on storage.objects for select to authenticated
using (
  bucket_id = 'documentos'
  and public.org_de_la_ruta(name) in (select public.mis_organizaciones())
);

drop policy if exists "documentos_borrar" on storage.objects;

create policy "documentos_borrar" on storage.objects for delete to authenticated
using (
  bucket_id = 'documentos'
  and public.es_socio()
  and public.org_de_la_ruta(name) in (select public.mis_organizaciones())
);

drop policy if exists "evidencias_leer" on storage.objects;

create policy "evidencias_leer" on storage.objects for select to authenticated
using (
  bucket_id = 'evidencias'
  and public.org_de_la_ruta(name) in (select public.mis_organizaciones())
);

drop policy if exists "evidencias_borrar" on storage.objects;

create policy "evidencias_borrar" on storage.objects for delete to authenticated
using (
  bucket_id = 'evidencias'
  and public.es_socio()
  and public.org_de_la_ruta(name) in (select public.mis_organizaciones())
);
