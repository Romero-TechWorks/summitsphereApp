# 00 · Índice de infraestructura — empieza aquí

Montar el espacio de Summit-Sphere en GitHub, Supabase, Vercel y Cloudflare.

**Tiempo total: 2 a 3 horas** si nada se atora. La parte lenta es el DNS
(§Cloudflare), que puede tardar horas en propagarse — por eso va primero aunque se
use al final.

---

## El orden importa

```
   ┌──────────────────────────────────────────────────────────────┐
   │  0. CLOUDFLARE — comprar/apuntar el dominio  ⏱ empieza YA    │
   │     El DNS tarda. Se arranca primero y se sigue trabajando.  │
   └───────────────────────────┬──────────────────────────────────┘
                               │
   ┌───────────────────────────▼──────────────────────────────────┐
   │  1. GITHUB — organización + repositorio privado              │
   │     Sin repo no hay a dónde apuntar Vercel.                  │
   └───────────────────────────┬──────────────────────────────────┘
                               │
   ┌───────────────────────────▼──────────────────────────────────┐
   │  2. SUPABASE — proyecto, base de datos, Auth, Storage        │
   │     Produce las llaves que Vercel necesita.                  │
   └───────────────────────────┬──────────────────────────────────┘
                               │
   ┌───────────────────────────▼──────────────────────────────────┐
   │  2.5 ANDAMIO Next.js — package.json, next.config, src/   ✅  │
   │      Vercel NO PUEDE desplegar sin esto. Es Fase 00.         │
   └───────────────────────────┬──────────────────────────────────┘
                               │
   ┌───────────────────────────▼──────────────────────────────────┐
   │  3. VERCEL — proyecto, variables, dominio, crons             │
   │     Consume todo lo anterior.                                │
   └───────────────────────────┬──────────────────────────────────┘
                               │
   ┌───────────────────────────▼──────────────────────────────────┐
   │  4. CLOUDFLARE (cierre) — Turnstile, R2, WAF, correo         │
   └──────────────────────────────────────────────────────────────┘
```

| Paso | Guía | Tiempo |
|---|---|---|
| 0 | [`04_CLOUDFLARE.md`](04_CLOUDFLARE.md) §1 — sólo el dominio | 15 min + espera |
| 1 | [`01_GITHUB.md`](01_GITHUB.md) | 30 min |
| 2 | [`02_SUPABASE.md`](02_SUPABASE.md) | 45 min |
| 2.5 | **Andamio Next.js** — [`docs/02_PLAN_DE_FASES.md`](../docs/02_PLAN_DE_FASES.md) Fase 00 | ✅ hecho |
| 3 | [`03_VERCEL.md`](03_VERCEL.md) | 30 min |
| 4 | [`04_CLOUDFLARE.md`](04_CLOUDFLARE.md) §2 en adelante | 30 min |
| — | [`05_VARIABLES_DE_ENTORNO.md`](05_VARIABLES_DE_ENTORNO.md) | consulta |

⚠️ **El paso 2.5 es el que sorprende a todos, y ya está hecho.** Vercel busca un
`package.json` con `next` adentro; si el repositorio sólo tiene documentación y
migraciones, el import no termina o el build truena en el primer intento. Elegir
*Next.js* en el *Framework Preset* no crea la aplicación. Detalle en
[`03_VERCEL.md`](03_VERCEL.md) §0.

---

## Antes de empezar

### Una sola identidad para todo

Las cuatro cuentas se crean con **el correo de la firma**
(`manuel.garcia@summit-sphere.com`), nunca con uno personal. Si mañana alguien
cambia de puesto, la cuenta se queda con la empresa.

### Segundo factor en las cuatro, el mismo día

⚠️ **No lo dejes para después.** Quien entre a cualquiera de esas cuatro cuentas
tiene los datos de todos tus clientes: sus hallazgos, sus incumplimientos, sus
plantas. GitHub, Supabase, Vercel y Cloudflare tienen 2FA y las cuatro lo piden en
tres clics.

### Un gestor de contraseñas

1Password, Bitwarden o el llavero del navegador. Vas a generar varias cadenas
largas al azar que **se muestran una sola vez**. Ten dónde ponerlas antes de
empezar, no después de perder la primera.

### Nombres que se usan en todas las guías

| Qué | Valor |
|---|---|
| Organización de GitHub | `summit-sphere` |
| Repositorio | `summit-app` (privado) |
| Proyecto de Supabase | `summit-app-prod` |
| Región de Supabase | **East US (North Virginia)** — la más cercana con menor latencia a México |
| Proyecto de Vercel | `summit-app` |
| Dominio de la app | `app.summit-sphere.com` |
| Dominio de la web | `summit-sphere.com` (ya existe, no se toca) |

---

## Costo

| Servicio | Plan | Costo |
|---|---|---|
| **GitHub** | Free | $0 — repos privados ilimitados, 2000 min/mes de Actions |
| **Supabase** | Free → **Pro cuando entre a producción** | $0 → **$25 USD/mes** |
| **Vercel** | Hobby → **Pro si hace falta** | $0 → $20 USD/mes |
| **Cloudflare** | Free (+ R2) | $0 + ~$0.50/mes de respaldos |
| **Gemini + Claude** | Por uso, sólo desde Fase 07 | $10–50 USD/mes estimado |

**Total para empezar: $0.** Total en producción: **~$25–45 USD/mes** hasta que el
volumen justifique más.

⚠️ **Supabase Free pausa el proyecto tras una semana de inactividad y no tiene
respaldos automáticos.** Para desarrollo está bien. **El día que entren datos
reales de clientes, se pasa a Pro** — que además da respaldos diarios, siete días
de recuperación puntual y la base sin pausas. No es negociable con expedientes de
auditoría adentro.

⚠️ **Vercel Hobby permite exactamente dos crons** y **prohíbe el uso comercial** en
su letra chica. Para una herramienta interna de la firma es zona gris; para algo
que el cliente usa (el portal), conviene Pro. Es la decisión de $20 USD que evita
una discusión.

---

## Checklist maestro

Recórrelo al terminar. Si algo no está marcado, algo va a fallar más adelante de
una forma que no va a parecer relacionada.

### Cloudflare
- [ ] Dominio `summit-sphere.com` en Cloudflare, nameservers propagados
- [ ] `app.summit-sphere.com` apuntando a Vercel, verificado
- [ ] SSL/TLS en **Full (strict)**
- [ ] Turnstile creado, con `site key` y `secret key` guardadas
- [ ] Bucket R2 `summit-respaldos` creado, con su token S3
- [ ] 2FA activo

### GitHub
- [ ] Organización `summit-sphere` creada
- [ ] Repositorio `summit-app` **privado**
- [ ] Rama `main` protegida
- [ ] `.gitignore` con `.env*` **antes del primer commit**
- [ ] Secretos de Actions cargados (respaldos)
- [ ] Workflows de respaldo y de prueba de restauración
- [ ] 2FA obligatorio en la organización

### Supabase
- [ ] Proyecto `summit-app-prod` en East US
- [ ] **Contraseña de la base guardada en el gestor**
- [ ] `URL`, `anon key` y `service_role key` copiadas
- [ ] Auth: proveedor de correo, sin registro abierto
- [ ] MFA (TOTP) habilitado
- [ ] Buckets `documentos`, `evidencias`, `biblioteca`, `constancias`, `fiscal` — **todos privados**
- [ ] Extensión `pgvector` habilitada *(o cuando llegue la Fase 07)*
- [ ] CLI enlazada (`supabase link`)
- [ ] Advisors → Security **sin alertas**
- [ ] 2FA activo

### Vercel
- [ ] Proyecto `summit-app` conectado al repo
- [ ] Variables de entorno cargadas en **Production, Preview y Development**
- [ ] `app.summit-sphere.com` asignado y verificado
- [ ] `vercel.json` con los dos crons
- [ ] Despliegue automático en `main` funcionando
- [ ] 2FA activo

### Verificación de punta a punta
- [ ] `https://app.summit-sphere.com` abre con candado
- [ ] Se puede iniciar sesión
- [ ] La PWA se instala desde el navegador del teléfono
- [ ] Un `git push` a `main` despliega solo
- [ ] El respaldo de anoche corrió en Actions

---

## Si algo sale mal

| Síntoma | Casi siempre es |
|---|---|
| Vercel construye pero la app da 500 | Falta una variable de entorno. Vercel → Deployment → Runtime Logs |
| "Invalid API key" | Se copió la `service_role` donde iba la `anon`, o al revés |
| El dominio no resuelve | El DNS todavía se está propagando. Espera y prueba en `dnschecker.org` |
| Bucle de redirección en el login | El matcher de `proxy.ts` o el SSL de Cloudflare en "Flexible" en vez de "Full (strict)" |
| La PWA no se instala | El `manifest.json` o `sw.js` están entrando al matcher de `proxy.ts` |
| El respaldo falla con "connection refused" | Se usó la conexión directa (IPv6) en vez del **Session Pooler** |
| El respaldo falla con "server version mismatch" | El `pg_dump` del runner es más viejo que el Postgres de Supabase |
