# `supabase/` — el esquema versionado

```
supabase/
  config.toml          lo genera `npx supabase init`
  migrations/          AAAAMMDDHHMMSS_descripcion_en_espanol.sql
  functions/           Edge Functions, si hacen falta
```

**Reglas** (detalle en [`../guias/02_SUPABASE.md`](../guias/02_SUPABASE.md) §6):

1. El esquema se cambia **con migraciones, nunca desde el panel**.
2. **Aditivas**: una migración aplicada no se edita; se corrige con otra.
3. Cada migración de tabla nueva incluye, **en el mismo archivo**: la tabla con su
   `org_id`, su RLS activado, sus políticas, sus índices y su trigger de bitácora.
   Nunca la tabla en una migración y sus políticas en otra — entre las dos hay una
   ventana con la tabla abierta.
4. **Cero enums de dominio.** `text` + `CHECK`.
5. Al cambiar el esquema, regenerar `src/types/database.ts` **en el mismo commit**.

Las tablas, ordenadas por la fase que las crea, están en
[`../docs/04_MODELO_DE_DATOS.md`](../docs/04_MODELO_DE_DATOS.md).
