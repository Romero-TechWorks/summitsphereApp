# 02 · Supabase

**Qué es:** la base de datos, el inicio de sesión y el almacenamiento de archivos.
Es **el corazón del sistema**: aquí viven los datos de todos tus clientes.
**Tiempo:** 45 minutos. **Costo:** $0 para empezar, **$25 USD/mes en producción**.

---

## §1 · Crear el proyecto

1. [supabase.com](https://supabase.com) → *Start your project* → **Continue with
   GitHub** (usa la cuenta de la organización).
2. **Activa 2FA**: *Account* → *Security* → *Two-Factor Authentication*.
3. *New project*:

| Campo | Valor |
|---|---|
| Organization | `Summit-Sphere` |
| Name | **`summit-app-prod`** |
| Database Password | ⚠️ **Ver abajo** |
| Region | **East US (North Virginia)** |
| Plan | Free (por ahora) |

### ⚠️ La contraseña de la base — tarea `A02`

**Se muestra una sola vez.** Genera una larga y **sin símbolos**:

```bash
openssl rand -hex 24
```

Sin símbolos porque esa contraseña va **dentro de una URL** en los respaldos, y un
`@` o un `/` la parten sin dar un error que se entienda.

Guárdala en el gestor de contraseñas **antes de darle a crear**.

### Por qué East US y no otra región

La latencia a México desde Virginia es de ~40 ms; desde Oregón, ~90 ms. En una app
que hace muchas consultas pequeñas eso se nota. Supabase no tiene región en
México.

⚠️ **La región no se cambia después.** Mover un proyecto es exportar, crear otro e
importar.

---

## §2 · Copiar las llaves

*Project Settings* → *API*. Tres valores:

| Valor | Va a | ⚠️ |
|---|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` | Pública, sin problema |
| **anon / public** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública. **Sólo es segura porque el RLS la contiene** |
| **service_role** | `SUPABASE_SERVICE_ROLE_KEY` | ⚠️⚠️ **SALTA TODO EL RLS.** Sólo en el servidor |

⚠️ **La `service_role` es la base entera abierta.** Si aparece en el navegador —en
un componente `'use client'`, en una variable `NEXT_PUBLIC_*`, en el repositorio—
cualquiera lee y escribe todos los datos de todos tus clientes. **Sólo en API
routes.** Y si alguna vez se filtra: se rota en *Project Settings* → *API* →
*Generate new key*, ese día.

---

## §3 · Autenticación

*Authentication* → *Providers* / *Configuration*.

### Correo y contraseña

- **Email** habilitado, el resto de proveedores apagado.
- ⚠️ **Apaga *Allow new users to sign up*.** Sin eso, cualquiera con la URL se
  crea una cuenta. En SummitApp las cuentas las crea el socio desde
  `/admin?tab=usuarios`, con `service_role` desde una API route.
- **Confirm email**: activado.

### URLs

*Authentication* → *URL Configuration*:

| Campo | Valor |
|---|---|
| Site URL | `https://app.summit-sphere.com` |
| Redirect URLs | `https://app.summit-sphere.com/**`<br>`http://localhost:3000/**`<br>`https://*-summit-sphere.vercel.app/**` |

⚠️ Sin el comodín de Vercel, **el login no funciona en las previews** — y el
síntoma es un redirect a una URL que no existe, no un mensaje de error.

### MFA

*Authentication* → *Multi-Factor Authentication* → habilitar **TOTP (App
Authenticator)**.

Es lo que exige `src/proxy.ts` a los roles `socio` y `administracion`.

### Endurecer

| Ajuste | Valor | Por qué |
|---|---|---|
| Minimum password length | **12** | El default de 6 es indefendible con expedientes adentro |
| Password requirements | Letras + números + símbolos | |
| Leaked password protection | **Activado** | Rechaza contraseñas que ya están en filtraciones conocidas |
| JWT expiry | 3600 (1 h) | |
| Refresh token rotation | Activado | |

---

## §4 · Storage — los cinco buckets

*Storage* → *New bucket*. **Los cinco privados.**

| Bucket | Guarda | Público | Tamaño máx. |
|---|---|---|---|
| `documentos` | Documentos del SGC | ❌ | 50 MB |
| `evidencias` | Fotos y archivos de auditoría | ❌ | 25 MB |
| `biblioteca` | PDFs normativos | ❌ | 100 MB |
| `constancias` | DC-3 emitidas | ❌ | 5 MB |
| `fiscal` | CSD (`.cer`, `.key`) | ❌ | 1 MB |

⚠️ **Verifica que cada uno diga "Private".** Un bucket público deja los documentos
de tus clientes accesibles para cualquiera con el link — y una vez que el link
circuló, cerrarlo después no sirve: ya se copió.

⚠️ **El bucket `fiscal` no lleva política de SELECT para nadie.** El `.key` se
sube y no se vuelve a bajar. Sólo lo toca `/api/fiscal/credenciales` con
`service_role`.

Las políticas de cada bucket (que filtran por organización) van en la migración
correspondiente, no a mano desde el panel. Ver
[`../docs/08_SEGURIDAD_Y_RLS.md`](../docs/08_SEGURIDAD_Y_RLS.md) §4.

---

## §5 · Extensiones

*Database* → *Extensions*:

| Extensión | Cuándo | Para qué |
|---|---|---|
| `pgcrypto` | Fase 00 | `gen_random_uuid()` |
| `pg_trgm` | Fase 06 | Búsqueda por similitud en el buscador global |
| `vector` (pgvector) | **Fase 07** | Los embeddings de la biblioteca normativa |

---

## §6 · La CLI y las migraciones

⚠️ **Regla dura del proyecto: el esquema se cambia con migraciones, nunca desde el
panel.** Un cambio hecho a mano en el SQL Editor no queda en el repositorio, no se
revisa, y tres semanas después el esquema real ya no es el que describe el código.
El workflow `supabase-drift.yml` existe justo para atrapar eso.

```bash
# Instalar (ya está en devDependencies)
npx supabase login

# Enlazar el repositorio con el proyecto
npx supabase link --project-ref <ref-del-proyecto>
# El ref es lo que va antes de .supabase.co en la Project URL

# Crear una migración
npx supabase migration new nombre_descriptivo
# → supabase/migrations/20260819120000_nombre_descriptivo.sql

# Aplicar a producción
npx supabase db push

# Regenerar los tipos de TypeScript  ⚠️ en el MISMO commit
npx supabase gen types typescript --linked > src/types/database.ts
```

### Convenciones

- Nombre: `AAAAMMDDHHMMSS_descripcion_en_espanol.sql`
- **Aditivas**: se agrega, no se reescribe. Una migración aplicada **no se edita**
  — se corrige con otra.
- Cada migración de tabla nueva incluye, en el mismo archivo: la tabla con su
  `org_id`, su RLS activado, sus políticas, sus índices y su trigger de bitácora.
  **Nunca una tabla en una migración y sus políticas en otra**: entre las dos hay
  una ventana con la tabla abierta.
- ⚠️ **Cero enums de dominio.** `text` + `CHECK`. Ver
  [`../docs/03_ARQUITECTURA.md`](../docs/03_ARQUITECTURA.md) §4.2.

---

## §7 · Pasar a Pro — cuándo y por qué

⚠️ **El día que entre el primer dato real de un cliente.**

| | Free | Pro ($25 USD/mes) |
|---|---|---|
| Respaldos automáticos | ❌ **Ninguno** | ✅ Diarios, 7 días |
| Recuperación puntual (PITR) | ❌ | ✅ Opcional |
| Pausa por inactividad | ⚠️ **A los 7 días** | ✅ Nunca |
| Base de datos | 500 MB | 8 GB |
| Storage | 1 GB | 100 GB |
| Soporte | Comunidad | Correo |

**Los respaldos de GitHub Actions no sustituyen esto**, lo complementan: los de
Actions te protegen de que Supabase desaparezca; los de Pro te protegen de un
`DELETE` mal escrito un martes a las 3 de la tarde, que es lo que de verdad pasa.

*Settings* → *Billing* → *Upgrade to Pro*. Y activa **Point-in-Time Recovery** si
el volumen lo justifica.

---

## §8 · Staging — cuándo

Hoy **no hay proyecto de staging** y las previews de Vercel apuntan a producción.
Es aceptable mientras la app está vacía. Deja de serlo cuando:

- Hay datos reales de más de un cliente, **o**
- Trabaja más de una persona en el código, **o**
- Toca una migración destructiva

Entonces: crear `summit-app-staging`, aplicarle las mismas migraciones, y apuntar
ahí las variables de *Preview* en Vercel. Media hora de trabajo que evita el día
que una rama de prueba borre los hallazgos de un cliente.

---

## §9 · Verificar

- [x] Proyecto `summit-app-prod` corriendo en East US
- [x] **Contraseña de la base en el gestor** (`A02`)
- [x] Las tres llaves copiadas y en su lugar correcto
- [x] *Allow new users to sign up* **apagado**
- [x] MFA (TOTP) habilitado
- [x] Site URL y las tres Redirect URLs configuradas
- [x] Contraseña mínima 12 + protección de contraseñas filtradas
- [x] Los cinco buckets creados y **los cinco privados**
- [x] `npx supabase link` funciona
- [ ] *Advisors* → *Security* **sin alertas**
- [x] 2FA activo en la cuenta

⚠️ **El linter de Advisors se revisa en cada despliegue**, no una vez. Detecta
justo lo que este proyecto no puede permitirse: tablas sin RLS, vistas sin
`security_invoker`, funciones `SECURITY DEFINER` sin `search_path` fijo.
