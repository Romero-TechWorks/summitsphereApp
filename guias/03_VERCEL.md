# 03 · Vercel

**Qué es:** donde corre la aplicación. Cada `git push` a `main` la publica sola.
**Tiempo:** 30 minutos. **Costo:** $0 en Hobby; $20 USD/mes en Pro.

---

## §0 · ⚠️ Vercel no puede desplegar un repositorio sin aplicación

**El andamio ya existe** (F00·B1 y B2), así que esta guía corre de principio a
fin. Queda escrito el tropiezo porque es el que sorprende a todo el mundo y
porque va a volver a aparecer si algún día se importa el repo desde cero.

Si Vercel no deja terminar el import —o lo termina y el build truena en el primer
intento— con alguna variante de:

```
No Next.js version detected. Make sure your package.json has "next"
in either "dependencies" or "devDependencies".
```

no hay nada mal configurado. Vercel busca un `package.json` con `next` adentro y
un `npm run build` que exista. Elegir *Next.js* en el *Framework Preset* no crea
la aplicación: sólo le dice a Vercel qué esperar, y luego no lo encuentra.

### El orden correcto

```
   GitHub  ✅   →   Supabase  ✅   →   ANDAMIO Next.js  ✅   →   Vercel   →   Cloudflare
                                        └── Fase 00, bloques 1-2 ──┘
```

Ver [`docs/02_PLAN_DE_FASES.md`](../docs/02_PLAN_DE_FASES.md), Fase 00.

### ⚠️ Antes de desplegar: las variables

Sin `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, la aplicación
**despliega bien y responde 503** en todas sus rutas, con un texto que dice qué
variable falta. Es deliberado —falla cerrada y se explica— pero significa que
cargar las variables del §2 no es opcional para ver algo.

### Si aun así el repositorio ni siquiera aparece en la lista

Eso ya no es el andamio: es permiso de GitHub. `summit-app` pertenece a la
**organización** `summit-sphere`, no a tu cuenta personal, y la GitHub App de
Vercel necesita autorización de la organización para verlo.

1. GitHub → `summit-sphere` → *Settings* → *Third-party Access* → **GitHub Apps**
   → aprobar **Vercel**.
2. O desde Vercel: *Add New… → Project* → **Adjust GitHub App Permissions** →
   elegir la organización → *Only select repositories* → `summit-app`.

⚠️ **Los términos de Vercel prohíben el uso comercial en cuentas Hobby.** Una
aplicación que la firma le cobra a sus clientes es uso comercial. Puedes armar
todo en Hobby, pero el día que entre el primer cliente real hay que estar en un
**Team** de pago. Ver §7.

---

## §1 · Crear el proyecto

1. [vercel.com](https://vercel.com) → *Sign Up* → **Continue with GitHub**.
2. **Activa 2FA**: *Settings* → *Authentication* → *Two-Factor Authentication*.
3. *Add New…* → **Project** → autorizar la organización `summit-sphere` →
   importar **`summit-app`**.

### Configuración de build

Vercel detecta Next.js solo. Verifica que quede:

| Campo | Valor |
|---|---|
| Framework Preset | **Next.js** |
| Build Command | `npm run build` |
| Output Directory | *(vacío — Next.js lo maneja)* |
| Install Command | `npm install` |
| Node.js Version | **22.x** |

⚠️ **`npm run build` lleva `--webpack` dentro del `package.json`.** No lo quites y
no lo cambies a Turbopack: el fork de PWA (`@ducanh2912/next-pwa`) no funciona con
Turbopack en esta versión y el service worker deja de generarse — sin dar error.
La app construye, despliega, y **simplemente no funciona sin señal**.

**No despliegues todavía.** Primero las variables, o el build falla.

---

## §2 · Variables de entorno

*Settings* → *Environment Variables*. Tabla completa en
[`05_VARIABLES_DE_ENTORNO.md`](05_VARIABLES_DE_ENTORNO.md).

⚠️ **Marca los tres entornos** —Production, Preview y Development— en cada
variable. La causa número uno de "funciona en producción y falla en la preview"
es una variable que sólo se marcó en Production.

### Las de la Fase 00

```
NEXT_PUBLIC_SUPABASE_URL          https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     eyJhb…
SUPABASE_SERVICE_ROLE_KEY         eyJhb…        ⚠️ SERVER-ONLY
NEXT_PUBLIC_TURNSTILE_SITE_KEY    0x4AAA…
TURNSTILE_SECRET_KEY              0x4AAA…       ⚠️ SERVER-ONLY
NEXT_PUBLIC_SENTRY_DSN            https://…
SENTRY_ORG                        summit-sphere
SENTRY_PROJECT                    summit-app
SENTRY_AUTH_TOKEN                 sntrys_…      ⚠️ SERVER-ONLY
```

⚠️ **`NEXT_PUBLIC_` significa "va al navegador".** Cualquiera puede leerla. Es
correcto para la URL de Supabase y la `anon key` —que el RLS contiene—, y es una
fuga total para la `service_role`. Antes de agregar el prefijo a algo, pregúntate
si te da igual publicarlo en la página de inicio.

### Las que llegan después

| Variable | Fase | Sale de |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | 04 | `npx web-push generate-vapid-keys` |
| `CRON_SECRET` | 04 | `openssl rand -base64 32` |
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | 07 | Los proveedores |
| `GITHUB_PAT` / `GITHUB_OWNER` / `GITHUB_REPO_EXPEDIENTES` | 07 | [`01_GITHUB.md`](01_GITHUB.md) §7 |
| `MS_TENANT_ID` / `MS_CLIENT_ID` / `MS_CLIENT_SECRET` / `MS_WEBHOOK_SECRET` | 08 | Azure Entra ID |

### Llaves VAPID — tarea `E01`

```bash
npx web-push generate-vapid-keys
```

Devuelve dos. La **pública** va a `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; la **privada** a
`VAPID_PRIVATE_KEY`, sin prefijo. `VAPID_SUBJECT` es
`mailto:manuel.garcia@summit-sphere.com`.

⚠️ **Guárdalas también en el gestor.** Si se pierden y se regeneran, **todas las
suscripciones push existentes quedan muertas** y cada usuario tiene que volver a
autorizar las notificaciones desde su teléfono.

---

## §3 · El dominio

*Settings* → *Domains* → **Add** → `app.summit-sphere.com`.

Vercel te va a pedir un registro DNS. En Cloudflare (ver
[`04_CLOUDFLARE.md`](04_CLOUDFLARE.md) §2):

| Type | Name | Content | Proxy |
|---|---|---|---|
| `CNAME` | `app` | `cname.vercel-dns.com` | ⚠️ **DNS only (nube gris)** |

⚠️ **La nube tiene que estar GRIS, no naranja.** Con el proxy de Cloudflare
encendido sobre un dominio de Vercel se encadenan dos CDN: rompe la emisión del
certificado, mete latencia y produce errores 522 intermitentes que son un
infierno de diagnosticar. Vercel ya trae su propio CDN y su propio SSL.

El certificado tarda de 1 a 60 minutos. `summit-sphere.com` (la web actual) **no
se toca**.

---

## §4 · Crons

`vercel.json` en la raíz del repositorio:

```json
{
  "crons": [
    { "path": "/api/cron/diario",  "schedule": "0 14 * * *" },
    { "path": "/api/cron/resumen", "schedule": "0 12 * * *" }
  ]
}
```

En UTC: `0 14` ≈ 8:00 CDMX (los avisos de vencimientos), `0 12` ≈ 6:00 CDMX (el
resumen diario, listo antes de que nadie abra el teléfono).

⚠️ **Hobby permite exactamente dos crons, y estos dos los ocupan.** Todo lo que
necesite tiempo —renovar las suscripciones de Graph, recalcular la Salud del SGC,
limpiar tokens vencidos— **se cuelga del diario**, no pide un tercero.

⚠️ **Las rutas de cron llegan sin sesión.** Van excluidas del matcher de
`proxy.ts` y se autentican solas comparando la cabecera `Authorization` contra
`CRON_SECRET`. Una ruta de cron sin esa comprobación es un endpoint público que
cualquiera puede disparar en bucle.

⚠️ **Hobby corre los crons una vez al día y no garantiza la hora exacta.** Puede
desviarse hasta una hora. Para avisos de vencimiento a 90/30/7 días da igual; si
alguna vez hiciera falta precisión, es Pro.

---

## §5 · Despliegue

```
push a main ──────────▶ producción (app.summit-sphere.com)
push a otra rama ─────▶ preview  (summit-app-git-<rama>-….vercel.app)
```

- El build tarda 2–4 minutos.
- Si falla, Vercel **mantiene la versión anterior en línea**. Nunca queda una
  producción rota por un build fallido.
- *Deployments* → cualquier despliegue anterior → **Promote to Production**
  revierte en segundos. Es el botón de pánico, y funciona.

⚠️ **Las previews apuntan al mismo Supabase que producción** hasta que exista un
proyecto de staging. Una rama que borre datos, los borra de verdad.

---

## §6 · Dónde mirar cuando algo falla

| Pestaña | Qué enseña |
|---|---|
| *Deployments* → *Building* | Errores de compilación y de TypeScript |
| *Deployments* → *Runtime Logs* | Errores en vivo de las API routes |
| *Observability* | Latencia, invocaciones, errores por ruta |
| Sentry | Los errores del navegador, que aquí no salen |

**Errores frecuentes:**

| Síntoma | Causa |
|---|---|
| Build falla con `Type error` | TypeScript. Se reproduce con `npm run build` local |
| Build pasa, la app da 500 | Falta una variable de entorno → *Runtime Logs* |
| `Invalid API key` | Se cruzaron `anon` y `service_role` |
| El cron nunca corre | `vercel.json` no está en la raíz, o la ruta no existe |
| El cron corre y devuelve 401 | `CRON_SECRET` no coincide entre Vercel y el código |
| El SW no se registra | El matcher de `proxy.ts` no excluye `sw.js` |
| Sin `sw.js` en `public/` tras el build | Se cambió `--webpack` por Turbopack |

---

## §7 · Hobby vs Pro

| | Hobby ($0) | Pro ($20/mes) |
|---|---|---|
| Crons | **2, 1×día** | 40, cada minuto |
| Duración de función | 10 s | 60 s (hasta 300) |
| Uso comercial | ⚠️ **Prohibido en los términos** | ✅ |
| Protección de previews | ❌ | ✅ |
| Logs | 1 hora | 1 día |

⚠️ **Los dos que fuerzan la decisión:**

1. **El uso comercial.** Los términos de Hobby son para proyectos personales. Una
   herramienta interna de la firma es zona gris; **el portal, que usan tus
   clientes, no lo es.** En cuanto el portal esté en línea, es Pro.
2. **Los 10 segundos de función.** La Fase 07 hace llamadas a modelos de lenguaje.
   Un informe generado con Claude tarda más de 10 segundos con facilidad y en
   Hobby **se corta a la mitad**, con un error que parece del modelo y no lo es.

**Recomendación: Hobby hasta la Fase 05. Pro al encender el portal.** Son $20 al
mes contra una hora de consultor.

---

## §8 · Verificar

- [ ] Proyecto `summit-app` conectado al repositorio
- [ ] Variables cargadas en **Production, Preview y Development**
- [ ] `app.summit-sphere.com` asignado y con certificado (candado)
- [ ] En Cloudflare, el CNAME `app` con la **nube gris**
- [ ] `vercel.json` con los dos crons, en la raíz
- [ ] Un push a `main` despliega solo
- [ ] Una rama de prueba genera su URL de preview
- [ ] La PWA se instala desde el navegador del teléfono
- [ ] 2FA activo en la cuenta
