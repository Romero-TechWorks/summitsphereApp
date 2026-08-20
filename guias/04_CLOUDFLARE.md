# 04 · Cloudflare

**Qué es:** el DNS del dominio, el anti-bot del login, el almacén de respaldos y
la primera línea de defensa. **Tiempo:** 45 minutos (+ espera de DNS).
**Costo:** $0 + ~$0.50 USD/mes de respaldos.

⚠️ **§1 se hace PRIMERO de todo**, antes que GitHub, Supabase y Vercel: el cambio
de nameservers puede tardar horas en propagarse y no bloquea nada más.
El resto (§2 en adelante) se hace **al final**.

---

## §1 · El dominio · **hazlo primero**

### Si `summit-sphere.com` ya está en Cloudflare

Perfecto, no hay nada que hacer aquí. Salta a §2 cuando Vercel esté listo.

### Si está en otro proveedor (GoDaddy, Namecheap, Hostinger…)

1. [cloudflare.com](https://cloudflare.com) → cuenta con el correo de la firma.
2. **Activa 2FA** de inmediato: *My Profile* → *Authentication*.
3. *Add a site* → `summit-sphere.com` → plan **Free**.
4. Cloudflare importa los registros DNS existentes.
   ⚠️ **Revísalos uno por uno antes de continuar.** Si falta el `MX`, **el correo
   de la firma deja de llegar** en cuanto cambies los nameservers. Es el error que
   más duele y el más fácil de evitar: compara la lista contra la del proveedor
   viejo, registro por registro.
5. Cloudflare te da dos nameservers (`xxx.ns.cloudflare.com`). Cámbialos en el
   panel de tu proveedor actual, donde diga *Nameservers* o *DNS Servers*.
6. **Espera.** Normalmente 1–4 horas, a veces hasta 24. Mientras tanto puedes
   seguir con GitHub y Supabase.

Verifica en [dnschecker.org](https://dnschecker.org) buscando los NS de
`summit-sphere.com`.

### SSL/TLS

*SSL/TLS* → *Overview* → modo **Full (strict)**.

⚠️ **Nunca "Flexible".** Con Flexible, Cloudflare habla HTTPS con el visitante y
**HTTP con Vercel** — el tráfico viaja sin cifrar en el último tramo, y con Next.js
produce un bucle infinito de redirecciones en el login que parece un bug de la
app.

Además: *Edge Certificates* → **Always Use HTTPS: On**.

---

## §2 · DNS de la aplicación

*DNS* → *Records* → **Add record**:

| Type | Name | Content | Proxy status |
|---|---|---|---|
| `CNAME` | `app` | `cname.vercel-dns.com` | ⚠️ **DNS only (gris)** |

⚠️ **La nube tiene que estar GRIS.** Poner el proxy naranja sobre un dominio de
Vercel encadena dos CDN: rompe la emisión del certificado, suma latencia y produce
errores 522 intermitentes. Vercel ya trae CDN y SSL propios. Si alguien
"optimiza" esto encendiendo la nube naranja, el síntoma aparece días después y no
se parece a su causa.

Los registros existentes de `summit-sphere.com` (la web actual) y del correo
(`MX`, `TXT` de SPF/DKIM) **no se tocan**.

### Los subdominios de la firma

| Subdominio | Para | Estado |
|---|---|---|
| `summit-sphere.com` | La web actual | Ya existe |
| **`app.summit-sphere.com`** | **SummitApp** | Este paso |
| `academia.summit-sphere.com` | El LMS | Futuro, otro producto |

---

## §3 · Turnstile — el anti-bot del login

Es el CAPTCHA de Cloudflare: gratis, sin imágenes de semáforos y sin rastrear al
usuario. Protege `/login` de ataques de fuerza bruta.

*Turnstile* → **Add widget**:

| Campo | Valor |
|---|---|
| Widget name | `summit-app-login` |
| Domains | `app.summit-sphere.com`<br>`localhost`<br>`vercel.app` |
| Widget Mode | **Managed** |

Da dos llaves:

| Llave | Variable |
|---|---|
| **Site Key** | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (pública, va al navegador) |
| **Secret Key** | `TURNSTILE_SECRET_KEY` ⚠️ **server-only** |

⚠️ **Agrega `localhost` y `vercel.app` a los dominios**, o el widget no carga en
desarrollo ni en las previews y **nadie puede entrar** para probar nada.

⚠️ **La verificación del token va del lado del servidor.** Un Turnstile que sólo
se pinta en la pantalla y no se valida contra
`https://challenges.cloudflare.com/turnstile/v0/siteverify` es decoración: un bot
salta el navegador y llama la API directo.

---

## §4 · R2 — los respaldos

R2 es el almacén de objetos de Cloudflare, compatible con S3 y **sin cargos por
salida de datos** (que es lo que hace caro a S3 cuando restauras).

### Crear el bucket

*R2* → *Create bucket*:

| Campo | Valor |
|---|---|
| Bucket name | **`summit-respaldos`** |
| Location | *Automatic* |

⚠️ **Privado.** No le habilites acceso público ni le pongas dominio. Ahí van los
volcados de la base de datos de todos tus clientes.

### El token de API

*R2* → *Manage R2 API Tokens* → **Create API token**:

| Campo | Valor |
|---|---|
| Token name | `github-actions-respaldos` |
| Permissions | **Object Read & Write** |
| Specify bucket | **`summit-respaldos`** solamente |
| TTL | *Forever* (o 1 año, con recordatorio) |

Da tres valores que van a los secretos de GitHub Actions:

| Cloudflare | Secreto en GitHub |
|---|---|
| Access Key ID | `AWS_ACCESS_KEY_ID` |
| Secret Access Key | `AWS_SECRET_ACCESS_KEY` |
| Endpoint (`https://<cuenta>.r2.cloudflarestorage.com`) | `BACKUP_S3_ENDPOINT` |

Y además: `AWS_DEFAULT_REGION` = **`auto`** (es lo que R2 espera; cualquier otra
región falla con un error de firma que parece de credenciales).

⚠️ **El Secret Access Key se muestra una sola vez.**

⚠️ **Limita el token a ese bucket.** Un token con acceso a toda la cuenta de R2
que se filtre, es toda tu cuenta.

### Retención

*R2* → `summit-respaldos` → *Settings* → **Object lifecycle rules**:
eliminar objetos con más de **90 días**.

Sin esto, el bucket crece para siempre. Con volcados diarios de una base modesta
son unos centavos al mes; en dos años, no.

---

## §5 · Seguridad del borde

Cloudflare no proxea `app.summit-sphere.com` (nube gris, §2), así que el WAF **no
protege la app**. Lo que sí puedes hacer, y conviene:

### Sobre `summit-sphere.com` (la web, con nube naranja)

*Security* → *WAF* → *Managed rules* → **Cloudflare Managed Ruleset: On**.

### Bot Fight Mode

*Security* → *Bots* → **Bot Fight Mode: On**, sólo sobre la web.

⚠️ **No sobre la app.** Bot Fight Mode bloquea peticiones que parecen
automatizadas, y un service worker sincronizando 50 fotos al recuperar señal se
parece bastante a un bot.

### Correo

Si `auditoria@summit-sphere.com` (Fase 08) vive en Microsoft 365, verifica que
sigan en Cloudflare los registros `MX`, el `TXT` de SPF, el `CNAME` de DKIM y el
`TXT` de DMARC. Sin ellos, **los correos que la app manda a los clientes caen en
spam** — y ese es exactamente el escenario en que nadie se entera de una no
conformidad.

---

## §6 · Lo que Cloudflare NO hace aquí

Vale la pena decirlo para que nadie lo intente:

- **No sirve la app.** Eso es Vercel. Cloudflare Pages sería una alternativa,
  no un complemento.
- **No cachea la app.** Con nube gris, el tráfico ni pasa por Cloudflare.
- **No guarda archivos de la app.** Eso es Supabase Storage. R2 es **sólo** para
  respaldos.
- **No sustituye el RLS.** Ninguna capa de red sustituye una política de base de
  datos.

---

## §7 · Verificar

- [ ] `summit-sphere.com` en Cloudflare, nameservers propagados
- [ ] ⚠️ **El correo de la firma sigue llegando** (manda uno de prueba)
- [ ] SSL/TLS en **Full (strict)** + Always Use HTTPS
- [ ] `app.summit-sphere.com` → CNAME a Vercel, **nube gris**
- [ ] `https://app.summit-sphere.com` abre con candado
- [ ] Turnstile creado, con los tres dominios y las dos llaves guardadas
- [ ] Bucket R2 `summit-respaldos` creado y **privado**
- [ ] Token de R2 limitado a ese bucket, con sus tres valores en GitHub
- [ ] Regla de ciclo de vida a 90 días
- [ ] 2FA activo en la cuenta
