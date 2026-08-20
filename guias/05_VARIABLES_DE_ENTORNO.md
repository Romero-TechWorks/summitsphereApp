# 05 · Variables de entorno

Cada secreto: qué es, de dónde sale, dónde vive y qué pasa si se filtra.

**La regla, en una línea:** todo lo que empieza con `NEXT_PUBLIC_` **llega al
navegador y cualquiera puede leerlo**. Todo lo demás vive sólo en el servidor.

---

## §1 · Tabla maestra

| Variable | Fase | ¿Al navegador? | De dónde sale |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 00 | ✅ Sí | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 00 | ✅ Sí | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | 00 | ❌ **NUNCA** | Supabase → Settings → API |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | 00 | ✅ Sí | Cloudflare → Turnstile |
| `TURNSTILE_SECRET_KEY` | 00 | ❌ No | Cloudflare → Turnstile |
| `NEXT_PUBLIC_SENTRY_DSN` | 00 | ✅ Sí | Sentry → Project Settings |
| `SENTRY_ORG` · `SENTRY_PROJECT` | 00 | ❌ No | Sentry |
| `SENTRY_AUTH_TOKEN` | 00 | ❌ No | Sentry → Auth Tokens |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 04 | ✅ Sí | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | 04 | ❌ **NUNCA** | idem |
| `VAPID_SUBJECT` | 04 | ❌ No | `mailto:` de la firma |
| `CRON_SECRET` | 04 | ❌ **NUNCA** | `openssl rand -base64 32` |
| `GEMINI_API_KEY` | 07 | ❌ **NUNCA** | Google AI Studio |
| `ANTHROPIC_API_KEY` | 07 | ❌ **NUNCA** | Anthropic Console |
| `GITHUB_PAT` | 07 | ❌ **NUNCA** | GitHub → Fine-grained tokens |
| `GITHUB_OWNER` · `GITHUB_REPO_EXPEDIENTES` | 07 | ❌ No | Constantes |
| `MS_TENANT_ID` · `MS_CLIENT_ID` | 08 | ❌ No | Azure Entra ID |
| `MS_CLIENT_SECRET` | 08 | ❌ **NUNCA** | Azure Entra ID |
| `MS_WEBHOOK_SECRET` | 08 | ❌ **NUNCA** | `openssl rand -hex 32` |
| `MS_BUZON_EVIDENCIA` | 08 | ❌ No | `auditoria@summit-sphere.com` |

---

## §2 · Dónde vive cada cosa

```
                    ┌─────────────────────────────────────┐
                    │  GESTOR DE CONTRASEÑAS DEL DUEÑO    │
                    │  (la copia de referencia de TODO)   │
                    └──────────────┬──────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
   ┌─────────────┐        ┌─────────────────┐      ┌────────────────┐
   │ .env.local  │        │  VERCEL         │      │ GITHUB SECRETS │
   │ (local, en  │        │  Env Variables  │      │ (Actions:      │
   │  .gitignore)│        │  Prod+Prev+Dev  │      │  respaldos)    │
   └─────────────┘        └─────────────────┘      └────────────────┘
        desarrollo            la app en línea         los respaldos
```

⚠️ **Los tres se mantienen sincronizados a mano.** No hay magia. Si cambias la
contraseña de la base en Supabase, hay que cambiarla en el gestor **y** en el
secreto de GitHub — y si no lo haces, los respaldos dejan de correr **en
silencio**, que es la peor forma de fallar.

### Secretos de GitHub Actions (sólo respaldos)

`SUPABASE_DB_URL` · `BACKUP_GPG_PASSPHRASE` · `BACKUP_S3_DEST` ·
`AWS_ACCESS_KEY_ID` · `AWS_SECRET_ACCESS_KEY` · `AWS_DEFAULT_REGION` ·
`BACKUP_S3_ENDPOINT`

Detalle en [`01_GITHUB.md`](01_GITHUB.md) §5.

---

## §3 · Cómo generar las que se generan

```bash
# CRON_SECRET
openssl rand -base64 32

# MS_WEBHOOK_SECRET (clientState de Graph)
openssl rand -hex 32

# BACKUP_GPG_PASSPHRASE
openssl rand -base64 32

# Contraseña de la base de Supabase — SIN símbolos (va dentro de una URL)
openssl rand -hex 24

# Llaves VAPID (devuelve la pública y la privada)
npx web-push generate-vapid-keys
```

---

## §4 · Qué pasa si se filtra cada una

Ordenadas por gravedad. **Rotar significa: generar una nueva, cargarla en Vercel,
redesplegar, y revocar la vieja.**

| Secreto | Consecuencia | Qué hacer |
|---|---|---|
| **`SUPABASE_SERVICE_ROLE_KEY`** | ☠️ **La base entera, leída y escrita, saltándose todo el RLS.** Todos los expedientes de todos tus clientes | **Rotar hoy.** Supabase → Settings → API → *Generate new key*. Revisar los logs de acceso |
| **Contraseña de la base** | ☠️ Acceso directo por SQL | Rotar en Supabase, actualizar el secreto de GitHub |
| **`GITHUB_PAT`** | Escritura en el repositorio de expedientes | Revocar en GitHub, generar otro |
| **`MS_CLIENT_SECRET`** | Acceso al correo y calendario de la firma y sus clientes | Rotar en Azure. **Avisar al cliente** |
| **`CRON_SECRET`** | Cualquiera dispara las tareas automáticas en bucle | Rotar |
| **`GEMINI_API_KEY` / `ANTHROPIC_API_KEY`** | Consumo a tu cuenta | Revocar. Tener límite de gasto puesto **antes** |
| **`VAPID_PRIVATE_KEY`** | Mandar notificaciones falsas a tus usuarios | Rotar ⚠️ **mata todas las suscripciones**; cada usuario reautoriza |
| **`TURNSTILE_SECRET_KEY`** | Saltarse el anti-bot del login | Rotar |
| **`SENTRY_AUTH_TOKEN`** | Subir source maps falsos | Rotar |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Ninguna, si el RLS está bien.** Es pública por diseño | Nada. ⚠️ Pero si el RLS **no** está bien, es todo — por eso la lista de §9 de `08_SEGURIDAD_Y_RLS.md` |
| `NEXT_PUBLIC_SUPABASE_URL` | Ninguna | Nada |

⚠️ **Un secreto commiteado a Git queda en el historial para siempre.** Borrar el
archivo en un commit posterior no sirve: el valor sigue en el historial y en cada
clon. **Si pasa: rota la llave.** Reescribir el historial es un último recurso que
además rompe los clones de todo el mundo.

---

## §5 · La regla de `NEXT_PUBLIC_`

Next.js reemplaza `process.env.NEXT_PUBLIC_LO_QUE_SEA` por su **valor literal**
dentro del bundle en tiempo de compilación. Ese bundle se descarga en el navegador
de cualquiera que abra la app.

**Antes de ponerle el prefijo a algo, pregúntate: ¿me daría igual publicarlo en la
página de inicio?**

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → sí, da igual. Es pública por diseño y lo que
  la contiene es el RLS, no el secreto.
- `SUPABASE_SERVICE_ROLE_KEY` → **no**. Es la base entera.

⚠️ **Una variable server-only usada dentro de un componente `'use client'` no da
error: da `undefined`.** El código sigue, falla más adelante, y el mensaje no
menciona la variable. Los secretos se usan en API routes y en Server Components,
punto.

---

## §6 · Desarrollo local

```bash
cp .env.example .env.local
```

Y llenarlo con los valores de desarrollo. `.env.local` está en `.gitignore`.

⚠️ **Hoy `.env.local` apunta al mismo Supabase de producción.** Un `DELETE` de
prueba en tu máquina borra datos reales. Hasta que exista staging, trata tu
entorno local como producción.

**Lo que no funciona en `localhost`:**

| Cosa | Por qué | Cómo se prueba |
|---|---|---|
| Notificaciones push | Exigen HTTPS o `localhost` estricto | `npm run build && npm run start`, o en preview |
| El service worker / offline | **Apagado en `dev`** | `npm run build && npm run start` |
| Los crons de Vercel | No existen local | Llamando la ruta con la cabecera del secreto |
| Webhooks de MS Graph | Necesitan URL pública | Con un túnel (`cloudflared tunnel`) |
| `crypto.randomUUID()` | ⚠️ Sólo en contexto seguro | Ya está resuelto: `uuid()` de `lib/utils/uuid.ts` |

---

## §7 · Rotación programada

| Secreto | Cada cuánto |
|---|---|
| `GITHUB_PAT` | **1 año** (o lo que dure el token) |
| `MS_CLIENT_SECRET` | **1–2 años** (Azure lo caduca solo) |
| `CRON_SECRET`, `MS_WEBHOOK_SECRET` | 1 año |
| Contraseña de la base | Sólo si se sospecha filtración |
| Llaves de LLM | Sólo si se sospecha filtración |
| `VAPID_*` | ⚠️ **Nunca por rutina** — mata todas las suscripciones |

⚠️ **`MS_CLIENT_SECRET` y `GITHUB_PAT` caducan solos**, y cuando lo hacen la
función que dependía de ellos **deja de funcionar sin avisar**. Pon la fecha en el
calendario de la firma el día que los crees, con un recordatorio un mes antes.
