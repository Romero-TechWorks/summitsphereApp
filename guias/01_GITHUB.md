# 01 · GitHub

**Qué es:** donde vive el código y donde corren los respaldos automáticos.
**Tiempo:** 30 minutos. **Costo:** $0.

---

## §1 · Crear la organización

Una *organización* de GitHub es distinta de una cuenta personal: el código
pertenece a la empresa, no a una persona.

1. Entra a [github.com](https://github.com) y crea una cuenta con
   `manuel.garcia@summit-sphere.com` (si no tienes).
2. **Activa 2FA ahora mismo**: foto de perfil → *Settings* → *Password and
   authentication* → *Two-factor authentication*. Guarda los códigos de
   recuperación.
3. Foto de perfil → *Your organizations* → **New organization** → plan **Free**.
   - Nombre: **`summit-sphere`**
   - Correo de contacto: el de la firma
   - *This organization belongs to*: **My business**

### Exigir 2FA a todo el equipo

Organización → *Settings* → *Authentication security* → marcar
**Require two-factor authentication**.

⚠️ Quien no lo tenga activado será expulsado de la organización automáticamente.
Avísales antes.

---

## §2 · Crear el repositorio

Organización `summit-sphere` → **New repository**:

| Campo | Valor |
|---|---|
| Repository name | **`summit-app`** |
| Description | `Aplicación de gestión de Summit-Sphere` |
| Visibilidad | ⚠️ **Private** |
| Add a README | No (ya existe) |
| Add .gitignore | No (ya existe) |

⚠️ **Private, sin excepción.** Aunque el código no lleve datos, un repositorio
público expone la estructura de tu base, tus rutas de API y el nombre de cada
variable de entorno. Es un mapa gratis para quien quiera intentar algo.

### Subir lo que ya existe

Desde la carpeta `summitApp`:

```bash
cd "/ruta/a/summitApp"

git init
git branch -M main
git add .
git commit -m "docs: plan de fases, arquitectura y guías de infraestructura"
git remote add origin https://github.com/summit-sphere/summit-app.git
git push -u origin main
```

⚠️ **Antes del primer `git add .`, confirma que `.gitignore` incluye `.env*`.** Ya
está en este repositorio. Un secreto commiteado **queda en el historial para
siempre**, aunque lo borres después: hay que rotar la llave, no basta con
eliminar el archivo.

---

## §3 · Proteger `main`

Repositorio → *Settings* → *Rules* → *Rulesets* → **New branch ruleset**:

| Opción | Valor |
|---|---|
| Name | `proteger-main` |
| Enforcement status | **Active** |
| Target branches | **Include default branch** |
| Restrict deletions | ✓ |
| Block force pushes | ✓ |
| Require a pull request before merging | ✓ (o déjalo apagado si trabajas solo) |

Lo importante son los dos primeros: **nadie borra `main` ni reescribe su
historial**, ni por accidente ni con un `--force` distraído.

---

## §4 · Flujo de trabajo

```
main ──────●───────●───────●──────▶  producción (Vercel despliega solo)
            \     /         \
             ●───●           ●──●   ramas de trabajo → preview en Vercel
```

- Cada rama abre una **URL de preview** propia en Vercel.
- Fusionar a `main` **despliega a producción**.
- Commits: `feat: …` / `fix: …` / `chore: …` / `docs: …`, en español.

⚠️ **Las previews apuntan al mismo Supabase que producción.** Una rama que borre
datos los borra de verdad. Trátalas como producción hasta que exista un proyecto
de staging.

---

## §5 · Secretos de Actions

Repositorio → *Settings* → *Secrets and variables* → **Actions** →
*New repository secret*.

### Los que puedes cargar ya (sin Cloudflare)

| Secreto | Qué es | De dónde sale |
|---|---|---|
| `SUPABASE_DB_URL` | Cadena de conexión completa | Supabase → *Connect* → **Session pooler** |
| `SUPABASE_ACCESS_TOKEN` | Token personal del CLI | supabase.com/dashboard/account/tokens |
| `SUPABASE_DB_PASSWORD` | Contraseña de la base | La de la tarea `A02` |
| `SUPABASE_PROJECT_REF` | Ref del proyecto | La parte `<ref>` de `<ref>.supabase.co` |

Con esos cuatro corren `supabase-drift.yml` y `rls-check.yml`, que son los que
vigilan que el aislamiento entre clientes siga en pie. No hace falta esperar a
Cloudflare para encenderlos.

### Los que esperan a Cloudflare R2

| Secreto | Qué es | De dónde sale |
|---|---|---|
| `BACKUP_GPG_PASSPHRASE` | Contraseña de cifrado | La generas tú: `openssl rand -base64 32` |
| `BACKUP_S3_DEST` | Destino | `s3://summit-respaldos/postgres` |
| `AWS_ACCESS_KEY_ID` | Token de R2 | Cloudflare → R2 → API Tokens |
| `AWS_SECRET_ACCESS_KEY` | Token de R2 | idem |
| `AWS_DEFAULT_REGION` | Región | **`auto`** (es lo que usa R2) |
| `BACKUP_S3_ENDPOINT` | Endpoint de R2 | `https://<cuenta>.r2.cloudflarestorage.com` |
| `RESTORE_TEST_DB_URL` | Session pooler de un proyecto **desechable** | Se crea al hacer la primera prueba de restauración |

⚠️ **`RESTORE_TEST_DB_URL` jamás apunta a producción.** El volcado trae
`DROP ... IF EXISTS` y borraría a todos los clientes de la firma.

Opcional, como *variable* y no como secreto: `BACKUP_RETENTION_DAYS`
(default 30).

### ⚠️ La cadena de conexión: tres formas y sólo una sirve

Supabase ofrece tres y **sólo la del medio funciona aquí**:

| Forma | Puerto | ¿Sirve? |
|---|---|---|
| **Direct connection** (`db.<ref>.supabase.co`) | 5432 | ❌ **Es IPv6-only** y los runners de GitHub son IPv4-only. Falla con `connection refused` |
| **Session pooler** | **5432** | ✅ **Esta.** IPv4, y soporta prepared statements |
| **Transaction pooler** | 6543 | ❌ No soporta prepared statements y `pg_dump` los necesita |

⚠️ **La contraseña va *percent-encoded* dentro de la URL.** Si tiene `@`, `#`, `/`
o `:`, hay que escaparlos o la URL se parte y el error no dice nada útil. Lo más
simple: generar una contraseña alfanumérica sin símbolos.

⚠️ **Es la misma contraseña que guardaste en la tarea `A02`.** Si la cambias en
Supabase, hay que cambiarla aquí también — y si no lo haces, **los respaldos dejan
de correr en silencio**.

### ⚠️ La passphrase de GPG se guarda APARTE del bucket

Un respaldo cifrado cuya llave está en el mismo lugar que el respaldo es un
archivo grande. Va en el gestor de contraseñas del dueño, en una entrada aparte
que diga claramente para qué es.

---

## §6 · Workflows

**Ya están escritos.** Viven en [`.github/workflows/`](../.github/workflows/) y
cada uno lleva arriba, en comentarios, los secretos que necesita y por qué.
Documentación de conjunto en
[`.github/workflows/README.md`](../.github/workflows/README.md).

| Archivo | Qué hace | Cuándo | Listo para correr |
|---|---|---|---|
| `ci.yml` | Busca credenciales en el código, compila, revisa migraciones | Cada PR y push a `main` | ✅ **Sin configurar nada** |
| `supabase-drift.yml` | Detecta cambios hechos a mano en la base | PR/push a `supabase/` | ✅ Con los secretos de §5 |
| `rls-check.yml` | Comprueba que el aislamiento entre clientes sigue en pie | PR/push a `supabase/` + lunes | ✅ Con `SUPABASE_DB_URL` |
| `backup.yml` | Volcado cifrado a R2, con rotación | Diario 02:00 CDMX | ⏳ Falta Cloudflare R2 |
| `restore-test.yml` | Restaura el último respaldo en una base desechable | Manual | ⏳ Falta R2 + proyecto de prueba |

El trabajo pesado del respaldo está en [`scripts/backup.sh`](../scripts/backup.sh),
no en el YAML, para que se pueda correr a mano desde cualquier máquina el día que
haga falta y no dependa de que GitHub esté disponible.

### `ci.yml` — se enciende solo

Mientras no exista `package.json` se salta los pasos de compilación y sigue
revisando lo demás. El día que la Fase 00 cree el andamio, empieza a compilar sin
que haya que tocarlo.

⚠️ **Corre `npm run build`, no sólo `npx tsc --noEmit`.** `tsc` no ve los errores
que sólo aparecen al compilar rutas de Next.js y ha dejado pasar builds rotos.
Lo que decide es `next build`.

### `rls-check.yml` — la regla 1 revisándose sola

Es el workflow propio de este proyecto, el que JDM Built no necesitaba. Comprueba
contra la base real:

| # | Qué revisa | Si falla |
|---|---|---|
| 1 | Tablas de `public` sin RLS activo | ❌ Falla |
| 2 | Vistas sin `security_invoker = true` | ❌ Falla |
| 3 | Políticas `UPDATE` sin `WITH CHECK` | ❌ Falla |
| 4 | Tablas de dominio sin `org_id` | ⚠️ Avisa |
| 5 | Tablas con RLS y cero políticas | ⚠️ Avisa |

Las tres primeras son fugas de datos entre clientes, no advertencias de estilo.
La número 3 es exactamente la trampa de
[`docs/08_SEGURIDAD_Y_RLS.md`](../docs/08_SEGURIDAD_Y_RLS.md) §2: con `USING` pero
sin `WITH CHECK`, un consultor toma una fila que sí le toca y la reasigna a otra
organización al editarla.

Los catálogos globales que legítimamente no llevan `org_id` —`normas`,
`norma_clausulas`, `noms`, `nom_requisitos`, `organizaciones`, `usuarios`,
`config_firma`— están en una lista de exentas dentro del workflow.
⚠️ **Agregar una tabla a esa lista es una decisión de diseño, no un atajo para
pasar CI.**

### `backup.yml` — va a fallar hasta que exista R2

Es a propósito. Un respaldo que no está configurado tiene que verse. Cuando
termines [`04_CLOUDFLARE.md`](04_CLOUDFLARE.md) §4 se pone en verde; si prefieres
no ver la tacha roja mientras tanto, comenta el bloque `schedule:` y déjalo en
`workflow_dispatch`.

⚠️ **GitHub apaga los workflows programados en repositorios sin actividad durante
60 días.** Avisa por correo. Si el repo se queda quieto, revisa que el respaldo
diario siga encendido.

### `restore-test.yml` — el mes que no lo corres es el mes que falla

Un respaldo que nadie ha restaurado nunca no es un respaldo: es una suposición.
Pide escribir `RESTAURAR-EN-PRUEBAS` a mano y aborta si el destino coincide con
producción, porque el volcado trae `DROP ... IF EXISTS`.

Además de contar filas, comprueba que **las políticas RLS también se
restauraron**. Una base recuperada sin sus candados tiene los datos de todos los
clientes abiertos a cualquiera con la `anon key`.

⚠️ **Lo que estos workflows NO respaldan: el Storage.** Las fotos de hallazgos y
la evidencia viven en buckets de Supabase y `pg_dump` no los toca. Hoy están
vacíos; hay que resolverlo antes de la Fase 03, no después.

---

## §7 · El repositorio de expedientes `[Fase 07]`

El Módulo B commitea cada procedimiento generado como `.md` a un repositorio
aparte, **antes** de liberar el `.docx`. Eso es la trazabilidad documental.

1. Crear un segundo repositorio **privado**: `expedientes-clientes`.
2. Estructura: `/{org}/{proyecto}/{codigo-documento}.md`.
3. Crear el token de acceso (tarea del dueño `H04`):
   *Settings* personal → *Developer settings* → *Personal access tokens* →
   **Fine-grained tokens** → *Generate new token*:

| Campo | Valor |
|---|---|
| Resource owner | **`summit-sphere`** (la organización, no tu cuenta) |
| Repository access | **Only select repositories** → `expedientes-clientes` |
| Permissions → Contents | **Read and write** |
| Expiration | **1 año** (anótalo en el calendario) |

⚠️ **Fine-grained, no classic.** Un token clásico tiene acceso a *todo* lo que tú
puedes ver. Este sólo escribe en un repositorio.

⚠️ **Se muestra una sola vez.** Cópialo al gestor de contraseñas y de ahí a
Vercel como `GITHUB_PAT`.

---

## §8 · Verificar

- [x] `https://github.com/summit-sphere/summit-app` abre y dice **Private**
- [x] 2FA obligatorio en la organización
- [x] `main` protegida contra borrado y `--force`
- [ ] `git log --all -- .env.local` no devuelve nada

**Cuando Supabase esté cargado (los cuatro secretos de §5):**

- [ ] *Actions* → *Deriva del esquema* → **Run workflow** termina en verde
- [ ] *Actions* → *Auditoría de aislamiento (RLS)* → **Run workflow** termina en verde

**Cuando Cloudflare R2 esté listo (guía 04 §4):**

- [ ] *Actions* → *Respaldo diario* → **Run workflow** termina en verde
- [ ] El archivo `summit-<fecha>.sql.gpg` aparece en el bucket R2
- [ ] La passphrase de GPG está guardada **fuera** de Cloudflare
- [ ] *Prueba de restauración* corrió una vez y devolvió filas
