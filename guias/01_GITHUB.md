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

## §5 · Secretos de Actions — los respaldos

Repositorio → *Settings* → *Secrets and variables* → **Actions** →
*New repository secret*.

| Secreto | Qué es | De dónde sale |
|---|---|---|
| `SUPABASE_DB_URL` | Cadena de conexión completa | Supabase → *Connect* → **Session pooler** |
| `BACKUP_GPG_PASSPHRASE` | Contraseña de cifrado | La generas tú: `openssl rand -base64 32` |
| `BACKUP_S3_DEST` | Destino | `s3://summit-respaldos/postgres` |
| `AWS_ACCESS_KEY_ID` | Token de R2 | Cloudflare → R2 → API Tokens |
| `AWS_SECRET_ACCESS_KEY` | Token de R2 | idem |
| `AWS_DEFAULT_REGION` | Región | **`auto`** (es lo que usa R2) |
| `BACKUP_S3_ENDPOINT` | Endpoint de R2 | `https://<cuenta>.r2.cloudflarestorage.com` |

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

Tres archivos en `.github/workflows/`. Se escriben en la Fase 00.

### `backup.yml` — respaldo diario

```yaml
name: Respaldo diario

on:
  schedule:
    - cron: '0 8 * * *'      # 08:00 UTC ≈ 02:00 CDMX
  workflow_dispatch:          # también a mano, desde la pestaña Actions

jobs:
  backup:
    runs-on: ubuntu-latest
    timeout-minutes: 30       # un respaldo sano tarda 2-4 min
    steps:
      - uses: actions/checkout@v4

      # ⚠️ pg_dump debe ser >= la versión del servidor o aborta con
      # "server version mismatch". Supabase corre Postgres 17.
      - name: Instalar cliente de PostgreSQL 17
        run: |
          sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
          curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg
          sudo apt-get update -o Acquire::Retries=3 -o Acquire::http::Timeout=20
          sudo apt-get install -y postgresql-client-17

      - name: Volcar, cifrar y subir
        env:
          PGURL:      ${{ secrets.SUPABASE_DB_URL }}
          PASSPHRASE: ${{ secrets.BACKUP_GPG_PASSPHRASE }}
          DEST:       ${{ secrets.BACKUP_S3_DEST }}
          AWS_ACCESS_KEY_ID:     ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION:    ${{ secrets.AWS_DEFAULT_REGION }}
          ENDPOINT:   ${{ secrets.BACKUP_S3_ENDPOINT }}
        run: |
          set -euo pipefail
          STAMP=$(date -u +%Y%m%dT%H%M%SZ)
          pg_dump "$PGURL" --format=custom --no-owner --no-acl \
            | gpg --batch --yes --symmetric --cipher-algo AES256 \
                  --passphrase "$PASSPHRASE" -o "summit-$STAMP.dump.gpg"
          aws s3 cp "summit-$STAMP.dump.gpg" "$DEST/" --endpoint-url "$ENDPOINT"

      # ⚠️ Sin esto, un respaldo que falle no avisa: sólo deja de existir.
      - name: Avisar si falló
        if: failure()
        run: echo "::error::El respaldo diario FALLÓ. Revísalo hoy."
```

⚠️ **No instales `awscli` por apt**: Ubuntu 24.04 lo quitó de sus repos y los
runners ya traen AWS CLI v2 preinstalado.

### `restore-test.yml` — prueba de restauración mensual

⚠️ **Un respaldo que nadie ha restaurado nunca no es un respaldo.** Este workflow
levanta un Postgres efímero, restaura el respaldo más reciente y cuenta las filas
de las tablas críticas. Si falla, avisa.

Corre el día 1 de cada mes. Es la mitad del trabajo que la gente se salta y la
mitad que importa.

### `supabase-drift.yml` — deriva del esquema

Compara el esquema de producción contra las migraciones del repositorio. Si
alguien tocó la base **desde el panel de Supabase** en vez de con una migración,
lo detecta.

Pasa más de lo que parece: se arregla algo urgente a las 11 de la noche desde el
SQL Editor, y tres semanas después el esquema del repositorio ya no describe la
realidad.

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

- [ ] `https://github.com/summit-sphere/summit-app` abre y dice **Private**
- [ ] 2FA obligatorio en la organización
- [ ] `main` protegida contra borrado y `--force`
- [ ] Los siete secretos de Actions cargados
- [ ] *Actions* → *Respaldo diario* → **Run workflow** termina en verde
- [ ] El archivo `.dump.gpg` aparece en el bucket R2
- [ ] `git log --all -- .env.local` no devuelve nada
