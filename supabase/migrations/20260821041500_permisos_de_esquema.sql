-- ============================================================================
-- Permisos del esquema `public` — lo que Supabase concede solo, escrito a mano
--
-- **Esta migración no cambia el comportamiento de nada.** Reproduce, palabra por
-- palabra, los `GRANT` que la plataforma de Supabase aplica sola a toda tabla
-- nueva de `public`. Existe por una razón concreta y de higiene:
--
-- `supabase db diff` compara la base real —que SÍ tiene esos grants, porque los
-- puso Supabase— contra una base de sombra levantada sólo con nuestras
-- migraciones —que NO los tiene, porque nunca los escribimos—. El resultado es
-- que el workflow «Deriva del esquema» falla en CADA corrida listando cien
-- `grant`, y ninguno de ellos es deriva de verdad.
--
-- Y un vigilante que grita todos los días deja de vigilar. La única forma de que
-- ese workflow siga sirviendo para lo que se creó —descubrir que alguien tocó
-- una política a mano desde el SQL Editor a las once de la noche— es que su rojo
-- signifique algo. Por eso el repositorio pasa a describir también esto.
--
-- ⚠️ **ESTO NO ABRE NADA, y hay que entender por qué antes de tocarlo.** En el
-- modelo de Supabase el `GRANT` sólo dice *«este rol puede intentarlo»*; quien
-- decide qué filas se ven es el RLS. En este proyecto el RLS está cerrado: toda
-- política operativa es `TO authenticated` y filtra por `org_id`
-- (CLAUDE.md · regla 1). Un `grant select ... to anon` sobre una tabla sin
-- ninguna política para `anon` **no devuelve una sola fila** — el grant es la
-- puerta, la política es la llave, y `anon` no tiene llave de nada.
--
-- Lo que SÍ hay que seguir vigilando es lo de siempre: que ninguna política se
-- escriba `TO public` o sin `TO`, porque entonces sí alcanzaría a `anon`. De eso
-- se encarga la revisión de código y `.github/workflows/rls-check.yml`.
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Las tablas que ya existen.
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;

-- Y las que se creen a partir de ahora, para que la base de sombra que levanta
-- el CI se comporte igual que la real sin tener que acordarse de nada.
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines  to anon, authenticated, service_role;

-- ⚠️ Y la excepción que define el producto, otra vez y al final.
--
-- El `grant all on all tables` de arriba acaba de devolverle a `audit_logs` el
-- UPDATE y el DELETE que la primera migración le había quitado. Se los volvemos
-- a quitar **aquí y no en otro archivo**: si esto vive en otra migración, basta
-- con que alguien reordene o repita el grant para que la bitácora se vuelva
-- editable sin que nadie lo note.
--
-- Las políticas de RLS no bastan para esto: `service_role` **las salta**. Lo
-- único que lo detiene a él es la ausencia del permiso — más el trigger
-- `impedir_cambios_bitacora()` de la primera migración, que es el segundo
-- candado. En una firma de auditoría, que la bitácora no se pueda reescribir no
-- es higiene: es el producto (CLAUDE.md · regla 8).
revoke update, delete on public.audit_logs from anon, authenticated, service_role;
