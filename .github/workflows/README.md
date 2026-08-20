# `.github/workflows/` — automatizaciones del repositorio

Cinco workflows. Ninguno despliega la aplicación —de eso se encarga Vercel solo—;
todos existen para que un error no se quede callado.

| Archivo | Qué hace | Cuándo corre | Necesita |
|---|---|---|---|
| `ci.yml` | Busca credenciales en el código, compila y revisa migraciones | Cada PR y cada push a `main` | **Nada** ✅ |
| `supabase-drift.yml` | Detecta cambios hechos a mano en la base | PR/push que toque `supabase/` | Supabase ✅ |
| `rls-check.yml` | Comprueba que el aislamiento entre clientes sigue en pie | PR/push a `supabase/` + lunes | Supabase ✅ |
| `backup.yml` | Respalda la base cifrada a R2 | Diario 02:00 CDMX | **Cloudflare R2** ⏳ |
| `restore-test.yml` | Restaura el último respaldo en una base de prueba | Manual, día 1 de cada mes | R2 + proyecto desechable ⏳ |

---

## Qué funciona hoy y qué no

`ci.yml` corre desde el primer push y no pide nada. Mientras no exista
`package.json` se salta la compilación solo y sigue revisando lo demás; el día
que la Fase 00 cree el andamio, se enciende sin que haya que tocarlo.

`supabase-drift.yml` y `rls-check.yml` funcionan en cuanto cargues cuatro
secretos (abajo). Valen la pena desde ya: `rls-check` es la regla 1 de
[`CLAUDE.md`](../../CLAUDE.md) convertida en algo que se revisa solo.

⚠️ **`backup.yml` va a fallar todas las noches hasta que exista el bucket de R2.**
Es a propósito: un respaldo que no está configurado tiene que verse, no
esconderse. Dos salidas honestas — termina
[`guias/04_CLOUDFLARE.md`](../../guias/04_CLOUDFLARE.md) §4, o comenta el bloque
`schedule:` mientras tanto y déjalo en `workflow_dispatch`. Lo que no vale es
acostumbrarse a la tacha roja.

⚠️ **GitHub apaga los workflows programados en repositorios sin actividad
durante 60 días.** Manda un correo antes. Si el repo se queda quieto una
temporada, revisa que el respaldo diario siga encendido.

---

## Secretos

Repositorio → *Settings* → *Secrets and variables* → **Actions**.

### Ahora — para deriva y RLS

| Secreto | De dónde sale |
|---|---|
| `SUPABASE_DB_URL` | Supabase → *Connect* → **Session pooler**, puerto 5432 |
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens |
| `SUPABASE_DB_PASSWORD` | La de la tarea `A02` |
| `SUPABASE_PROJECT_REF` | La parte `<ref>` de `<ref>.supabase.co` |

⚠️ **De las tres cadenas de conexión que ofrece Supabase, sólo sirve la de en
medio.** La *Direct connection* es IPv6-only y los runners de GitHub son
IPv4-only; el *Transaction pooler* (6543) no soporta prepared statements y
`pg_dump` los necesita. Tabla completa en
[`guias/01_GITHUB.md`](../../guias/01_GITHUB.md) §5.

⚠️ **La contraseña va percent-encoded dentro de la URL.** Si trae `@`, `#`, `/`
o `:`, la URL se parte y el error no dice nada útil.

### Después — para los respaldos

`BACKUP_GPG_PASSPHRASE` · `BACKUP_S3_DEST` · `BACKUP_S3_ENDPOINT` ·
`AWS_ACCESS_KEY_ID` · `AWS_SECRET_ACCESS_KEY` · `AWS_DEFAULT_REGION` (`auto`)
· `RESTORE_TEST_DB_URL`

Opcional como *variable* (no secreto): `BACKUP_RETENTION_DAYS`, default 30.

⚠️ **La passphrase de GPG se guarda en un lugar distinto del bucket.** Un
respaldo cifrado cuya llave está junto al respaldo es un archivo grande.

⚠️ **`RESTORE_TEST_DB_URL` nunca apunta a producción.** El volcado trae
`DROP ... IF EXISTS`. El workflow lo comprueba y aborta, pero el candado de
verdad es no confundirse al pegarla.

---

## Lo que estos workflows NO respaldan

`pg_dump` copia la base. **No copia el Storage**: las fotos de hallazgos, la
evidencia de acciones correctivas y los PDF de constancias viven en buckets de
Supabase y quedan fuera del `.sql.gpg`.

Hoy no importa —esos buckets están vacíos hasta la Fase 03—. **El día que entre
la primera auditoría con fotos, esto pasa a ser un hueco real:** la base
restaurada tendría los hallazgos con sus rutas de adjunto y ningún archivo
detrás. Queda anotado como pendiente de la Fase 03, con dos caminos posibles
—sincronizar los buckets a R2 desde este mismo workflow, o pagar el PITR de
Supabase Pro— y hay que decidir cuál antes de que existan los archivos, no
después.

---

## Cómo se lee un fallo

| Síntoma | Casi siempre es |
|---|---|
| `connection refused` en el respaldo | Se usó la *Direct connection* (IPv6). Cambia al Session pooler |
| `server version mismatch` | El runner usó psql 16. El paso que agrega `/usr/lib/postgresql/17/bin` al PATH no corrió |
| `password authentication failed` | La contraseña trae símbolos sin escapar dentro de la URL |
| El respaldo pesa 400 bytes | El script lo detecta y falla a propósito. Credenciales caducadas |
| `db diff` marca deriva y nadie tocó nada | Alguien sí tocó algo desde el SQL Editor. Genera la migración con `supabase db diff -f <nombre>` |
| `rls-check` falla en una tabla nueva | Falta su política. No es un pendiente: es una fuga |
