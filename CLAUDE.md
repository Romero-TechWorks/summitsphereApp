# CLAUDE.md — SummitApp

Guía obligatoria para agentes de código en este repositorio. Léela completa antes
de tocar código.

**Contexto:** PWA de gestión para **Summit-Sphere**, consultoría en Sistemas de
Gestión ISO, auditorías, cumplimiento normativo (NOMs STPS / SEMARNAT /
Protección Civil), capacitación y automatización. **Next.js 16 App Router +
TypeScript + Supabase + PWA**, deploy en Vercel.

**El usuario real trabaja en una planta, no en una oficina.** Un auditor levanta
hallazgos caminando por un almacén con el teléfono en una mano y la lista de
verificación en la otra, muchas veces **sin señal**. Todo lo que se diseñe tiene
que sobrevivir a eso.

**Multi-tenencia: SÍ aplica, y es la diferencia grande con JDM Built.** Summit
tiene *muchas* organizaciones cliente dentro de **una sola instancia**. Cada fila
de dominio cuelga de una `org_id`. Ver §Reglas críticas, regla 1.

---

## Estado actual — lee esto antes de pedir nada

- **Fase 00, bloques 1 y 2 hechos.** Existe el andamio: `package.json`,
  `next.config.mjs` con PWA y Sentry, el armazón fijo, los tokens de Summit, la
  biblioteca `ui/`, `src/proxy.ts` y `/login`. `npm run build` y `npm run lint`
  pasan limpios.
- **La aplicación gatea sesión pero todavía no conoce roles.** El guard manda a
  `/login` a quien no tenga sesión; **falta exigir `aal2` a `socio` y
  `administracion`**, porque depende de la tabla `usuarios` (F00·B5). Va en el
  mismo bloque que la tabla.
- **GitHub y Supabase están montados.** El proyecto de Supabase existe y está
  vinculado, pero **el esquema está vacío**: cero tablas de dominio, cero
  políticas, cero buckets con contenido. `src/types/database.ts` no existe todavía
  porque sale del esquema, no al revés.
- **Lo que sigue es F00·B3 + B5 juntos**: la primera migración
  (`organizaciones`, `usuarios`, `usuarios_organizaciones`, `config_firma`,
  `audit_logs`, `notificaciones`) con su RLS, y encima el MFA y los roles. Van
  juntos porque el guard de MFA necesita leer el rol de una tabla que sólo existe
  después de la migración.
- **Todavía NO hay capa offline.** No hay React Query, ni IndexedDB, ni `outbox`.
  Eso es F00·B4. Hasta entonces, **no escribas consultas a Supabase en
  componentes**: las claves de caché y `offlineWrite` tienen que existir antes o
  habrá que reescribirlas todas.
- **El plan manda sobre el orden.** `docs/02_PLAN_DE_FASES.md` decide qué se hace
  y cuándo. Si algo parece faltar, casi siempre está aplazado con motivo — búscalo
  ahí antes de "arreglarlo".

### Documentación de referencia

| Documento | Para qué |
|---|---|
| `docs/02_PLAN_DE_FASES.md` | **El plan.** Manda sobre el orden y el alcance de todo |
| `docs/03_ARQUITECTURA.md` | Stack, estructura, patrones. Las referencias §X.Y apuntan ahí |
| `docs/04_MODELO_DE_DATOS.md` | Tablas, vistas y RPC por fase |
| `docs/05_SISTEMA_DE_DISENO.md` | Tokens, paleta y reglas de UI |
| `docs/06_MODULOS_FUNCIONALES.md` | Cómo se usa cada módulo |
| `docs/07_ASISTENTE_Y_AUTOMATIZACION.md` | Módulos A, B y C |
| `docs/08_SEGURIDAD_Y_RLS.md` | Roles, políticas, secretos |
| `docs/09_TAREAS_DEL_DUENO.md` | Pasos manuales del dueño (Supabase, Vercel, Cloudflare) |
| `guias/*` | Montaje de la infraestructura |

**Regla de oro:** si un cambio afecta lo descrito en cualquiera de estos
documentos, **actualízalo en el mismo commit**. La documentación es parte del
producto.

---

## Reglas críticas — NO romper

Decisiones intencionales. Cambiarlas rompe algo más.

1. **`org_id` en toda tabla de dominio, y RLS de verdad.** Aquí conviven los datos
   de organizaciones que **no deben verse entre sí**: un hallazgo de la planta A
   no puede aparecerle al contacto de la planta B. A diferencia de JDM Built —
   donde el RLS operativo está de hecho abierto y el gateo real vive en el
   frontend— **en SummitApp el gateo vive en la base**. Toda política operativa
   filtra por `org_id IN (SELECT ...)` según la asignación del usuario. Una tabla
   nueva sin `org_id` y sin política es una fuga, no un pendiente. §8.2.

2. **Middleware:** el archivo es `src/proxy.ts` con función exportada `proxy`, NO
   `middleware.ts` (Next.js 16 lo deprecó). Su `matcher` **debe excluir**: los
   archivos de la PWA (`sw.js`, `manifest.json`, `worker-*`, `swe-worker-*`,
   `workbox-*`), `/monitoring` (túnel de Sentry), `api/cron` (llega sin sesión, se
   autentica con `CRON_SECRET`) y `portal` (portal público del cliente). Si no,
   sin sesión se redirigen a `/login`, el navegador recibe HTML donde espera JS y
   **el service worker no se registra** — o el portal directamente no existe. Al
   añadir un generado a `public/` **o una ruta pública nueva**, súmalo al matcher
   **en el mismo commit**. §7.1.

3. **Config:** `next.config.mjs` (no `.ts`), con fork `@ducanh2912/next-pwa`. Los
   scripts de build llevan `--webpack`. **NUNCA `npx @sentry/wizard`:** reescribe
   el archivo y se lleva el fork, el worker de push y la caché offline.

4. **Responsive con React state (`isMobile`)**, no clases CSS ni media queries. El
   layout monta el Sidebar (escritorio) o la `BottomNav` (móvil); no hay
   hamburguesa. Lo pegado al fondo suma `var(--fab-lift)`.
   **La app es un ARMAZÓN FIJO: el documento no scrollea.** El `div` raíz mide la
   ventana y recorta; el único elemento con scroll es el que marca
   `src/lib/utils/appScroll.ts`. Es lo único que impide que el navegador móvil
   recoja su barra de URL y mueva el header y la barra inferior (`dvh` NO arregla
   eso: corrige cuánto miden las cosas, no contra qué se anclan). Cuatro reglas
   que se rompen sin darte cuenta:
   - **(a) `window.scrollTo` NO hace nada** dentro del dashboard — usa
     `getAppScroller()` o `scrollIntoView`.
   - **(b) Ningún `vh` crudo: usa `var(--vh-full)`.** Con el armazón la barra del
     navegador ya nunca se pliega, así que `100vh` es *permanentemente* más alto
     que lo visible (por eso los modales van a `calc(var(--vh-full) * 0.9)`).
   - **(c) Un contenedor con scroll dentro de un flex necesita `minHeight: 0`**, o
     `overflow` no se activa nunca.
   - **(d) Para librar la barra inferior, `var(--bottom-nav-total)`** (incluye el
     área segura), nunca `--bottom-nav-height`.

   Y no pongas `minHeight` de ventana en las páginas de dominio: el `main` ya lo
   hace. §8.5.

5. **Env vars: nunca a Git** (`.env.local` está en `.gitignore`).
   `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `VAPID_PRIVATE_KEY`,
   `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_PAT` y `MS_CLIENT_SECRET` son
   **server-only** y jamás van al bundle. Sólo lo que empieza con
   `NEXT_PUBLIC_` llega al navegador. §8.3 y `guias/05_VARIABLES_DE_ENTORNO.md`.

6. **Vistas de Supabase con `security_invoker = true`.** Toda vista que cruce
   tablas de dominio la lleva. Al recrearla, mantén la propiedad o RLS se salta y
   la vista se convierte en la puerta trasera de la multi-tenencia.

7. **Cliente de Supabase, dos variantes:** `lib/supabase/client.ts` en
   `'use client'`; `lib/supabase/server.ts` en Server Components y API routes.
   Usar el incorrecto rompe cookies o hidratación.

8. **Bitácora inmutable:** `audit_logs` no tiene UPDATE ni DELETE en RLS. Los
   registros nunca se borran. En una firma de auditoría esto no es higiene: es el
   producto. Si la app que audita no puede demostrar quién cambió qué, no sirve.

9. **TypeScript: cero `any`.** Todos los tipos salen de `src/types/database.ts`.
   Si agregas una tabla, agrega su interface ahí **antes** de usarla.

10. **Estilos:** inline styles con variables CSS es el patrón del proyecto. **No
    mezclar Tailwind en componentes existentes.** Los nuevos de
    `src/components/ui/` pueden usarlo si respetan las variables. §5.

11. **Sin interruptores muertos.** Un campo de catálogo, un sub-evento o un flag
    que nadie pinta no se registra hasta que alguien lo consuma.

12. **El texto de una norma NO se copia al repositorio.** Las normas ISO son obra
    protegida y la firma las tiene bajo licencia. En la base viven **la estructura
    de cláusulas** (número, título, resumen redactado por Summit) y las
    referencias; el texto íntegro entra sólo como archivo del cliente en un bucket
    privado, con su licencia. Un `INSERT` sembrando párrafos de la ISO 9001 es un
    problema legal, no una comodidad. §8.6.

13. **Un hallazgo no se borra.** Se cierra, se reclasifica o se anula **con
    motivo y firma**, y la versión anterior queda. `hallazgos` es aditiva:
    `estado` + `hallazgos_historial`. Un `DELETE` sobre un hallazgo destruye la
    trazabilidad de la auditoría — que es exactamente lo que un auditor externo
    va a venir a revisar. §8.7.

---

## Reglas del offline — se rompen sin darte cuenta

Detalle en §8.9 a §8.12. **Aquí importan más que en JDM Built**: allá el mecánico
tenía WiFi malo; aquí el auditor está en un sótano de una planta industrial.

1. Cargar datos con `useQuery`, nunca `useEffect` + `useState`. Toda clave sale de
   `src/lib/query/keys.ts`.
2. **La caché es la fuente de verdad.** Nunca copies `data` a un `useState` del
   componente: la caché es lo único que se persiste, así que al remontar reaparece
   lo viejo aunque el cambio siga en la cola.
3. **Los desplegables de un formulario también son datos**: por `useQuery`. Si no,
   sin señal llegan vacíos y el guardado muere en la validación *antes* de
   encolarse. Aplica en especial al selector de cláusula de un hallazgo: sin él,
   no hay hallazgo.
4. Toda escritura pasa por `offlineWrite` (`src/lib/offline/mutate.ts`) con
   etiqueta en español legible, nunca un UUID.
5. `getSession()` (local), nunca `getUser()` (pega a la red y sin señal cuelga).
6. **El SW está apagado en dev:** el offline sólo se prueba con
   `npm run build && npm run start`.
7. **Una auditoría se descarga entera antes de entrar a planta.** El plan, sus
   cláusulas, la lista de verificación y los hallazgos previos se precargan en la
   caché al abrir la auditoría con señal. Si esto no pasa, el auditor llega al
   piso con una pantalla vacía. §8.11.

**Excepciones conscientes:** los adjuntos tienen cola propia (pesan megabytes y
van en dos fases); crear y revocar el link del portal no pasa por `offlineWrite`.

---

## Trampas heredadas — ya costaron caro en JDM Built, no las repitas

Esta sección no es teoría. Cada punto es un bug que ya se pagó en el proyecto
hermano y que **este código puede volver a cometer idéntico**.

- **`crypto.randomUUID()` NO existe fuera de contexto seguro.** No es soporte del
  navegador: es una API restringida a HTTPS y `localhost`. Desde una IP de red
  local el objeto `crypto` está y el método no. Como el id local es lo primero que
  calcula un insert, se lleva por delante **toda escritura nueva de la app**. Usa
  siempre `uuid()` de `src/lib/utils/uuid.ts`, que cae a `crypto.getRandomValues`.
  Producción no lo ve nunca: Vercel es HTTPS. Desarrollo sí.

- **Un catálogo en código que se lee sin valor por defecto tumba la pantalla
  entera.** `TIPOS_HALLAZGO[finding.tipo]` devolviendo `undefined` y un `.color`
  después revienta el render — y como las tarjetas se pintan **en bucle, un solo
  hallazgo raro se lleva los cuarenta**. El auditor no ve "un hallazgo con un
  problema", ve la página de error y ninguno de sus hallazgos. Todo catálogo
  indexado por un valor que viene de la base **nunca devuelve `undefined`** y
  degrada enseñando el valor crudo. El tipo de TypeScript es una promesa sobre ese
  texto, no una garantía.

- **Un `catch` vacío convierte un bug en "error".** Si un guardado puede fallar,
  el motivo se pinta.

- **Un DELETE o UPDATE bloqueado por RLS no es un error.** Un INSERT rechazado
  devuelve 42501 y se ve; un DELETE/UPDATE sobre filas que la política no deja
  tocar **afecta a cero filas** y PostgREST responde 200 con lista vacía. Síntoma:
  *"lo cierro, desaparece, lo refresco y vuelve"*. Receta: pide `.select()` y trata
  `0 filas` como error. **Con el RLS cerrado de SummitApp esto va a pasar más
  seguido que en JDM** — trátalo como el caso normal, no como la excepción.

- **`fecha::text` NO es IMMUTABLE.** Una columna generada o un índice de expresión
  con una fecha a texto revienta con 42P17: el resultado depende del `DateStyle`
  de la sesión. Se resuelve con la resta de fechas (`fecha - DATE '2000-01-01'`).
  `numeric::text` y `uuid::text` sí son inmutables.

- **`npx tsc --noEmit` puede mentir.** `tsconfig.json` incluye los tipos generados
  de `.next`; si `routes.d.ts` quedó truncado por un `dev` interrumpido, su error
  de sintaxis **aborta el análisis semántico de todo el proyecto** y tsc calla los
  errores reales. `npm run build` no tiene el problema.

- **Una columna `date` no se formatea con `new Date()`.** Corre un día en México.
  Usa `formatDateOnly` / `toISODate` de `lib/utils/dates.ts`; `formatDate` es para
  `timestamptz`. Aplica a **todas** las fechas de vencimiento normativo, que es
  justo donde un día de diferencia cambia si algo está vencido o no.

- **Las altas de valores de enum van en su propia migración.** Postgres no deja
  usar un valor de enum en la transacción que lo crea. **Decisión de proyecto: los
  catálogos de dominio NO usan enum.** Van `text` + `CHECK`, para que la trampa no
  aplique nunca. Los `CHECK` son listas cerradas a propósito: abrir un valor nuevo
  obliga a pasar por una migración, y esa fricción es deliberada.

- **No corras `npm run build` con un `npm run dev` encendido sobre el mismo repo.**
  Los dos escriben en `.next` y el build le pisa al dev los chunks: a partir de ahí
  el navegador ejecuta código viejo mezclado con nuevo y salen errores **cuyo
  número de línea no corresponde al archivo**. Para salir: parar el dev,
  `rm -rf .next`, arrancarlo otra vez.

---

## Estructura

```
src/
  app/(auth)/          → login + mfa
  app/(dashboard)/     → todo lo protegido por sesión
    cartera/           → organizaciones + proyectos + contactos
    sistemas/          → documentos + requisitos + indicadores + riesgos
    auditorias/        → programa + auditorías + hallazgos
    cumplimiento/      → matriz NOM + vencimientos + dictámenes
    capacitacion/      → cursos + programa + sesiones + constancias
    acciones/          → planes de acción y su seguimiento
    admin/             → metas + finanzas + facturación + usuarios + bitácora + config
    auditorias/[id]/ acciones/[id]/ cartera/[id]/   (sólo detalle)
    asistente/         → oficina del asistente (URL `/asistente`, ver abajo)
  app/portal/[token]   → portal público del cliente, sin sesión
  app/api/             → users, push/*, cron/*, fiscal/*, asistente/*, graph/*
  components/          → por dominio; ui/ es la biblioteca común
  lib/queries/         → todas las consultas Supabase
  lib/supabase/        → client.ts (browser) + server.ts
  lib/offline/         → cola, caché, adjuntos, dictados y sincronía
  lib/normas/          → catálogo de normas, cláusulas y NOMs
  lib/asistente/       → proveedor, esquemas Zod, instrucciones, herramientas
  lib/plantillas/      → informes y documentos imprimibles
  lib/utils/           → helpers puros
  types/database.ts    → todos los tipos
worker/index.js        → oyentes push del service worker
supabase/migrations/   → esquema versionado, aditivo
docs/ guias/           → la documentación de arriba
```

**Los siete dominios son páginas con pestañas, no carpetas por entidad.** Se
navega con query string (`/auditorias?tab=hallazgos`) desde el Sidebar y la
BottomNav. Agregar una sección = una pestaña más en su dominio, **no** una carpeta
nueva. Las únicas rutas propias son las de detalle, el portal y la oficina del
asistente.

⚠️ **`/asistente` es una excepción consciente**: cruza los siete dominios, así que
no pertenece a ninguno. Se entra desde el 🤖 del header, junto al buscador global.
**La `BottomNav` tiene cinco destinos y no hay un sexto** — en móvil los dominios
que no caben viven en el buscador y en el menú del header.

⚠️ **Vive en `src/app/(dashboard)/asistente/`, no en `src/app/asistente/`.** La URL
es la misma —el grupo de ruta no aparece—, pero dentro del grupo hereda el guard
de sesión de `proxy.ts` y el armazón fijo. Fuera saldría sin cabecera, sin sidebar
y sin barra inferior.

---

## Módulos apagados de fábrica

Igual que en JDM Built, hay módulos que existen en el código y **no se encienden**
hasta que el dueño lo pide, en `MODULOS_APAGADOS_POR_DEFECTO`:

`facturacion` · `asistente` · `automatizacion` (MS Graph) · `comercializadora`

Un módulo apagado no pinta pestaña, no registra ruta en la navegación y sus
consultas no se disparan. Encenderlo es una casilla en `/admin?tab=config`, no un
deploy.

---

## Cómo trabajar

**Antes:** (1) lee la sección relevante de `docs/03_ARQUITECTURA.md`; (2)
`git pull origin main`; (3) si tocas Supabase, valida contra
`src/types/database.ts` y el esquema; (4) si dudas del patrón visual, mira 2-3
componentes similares del mismo módulo antes de crear uno nuevo; (5) si el cambio
afecta comportamiento documentado, actualiza el documento en el mismo commit.

**Después:** (1) `npm run lint`; (2) `npm run build` (usa `--webpack`, no lo
cambies); (3) commit `feat|fix|chore: descripción corta`; (4) `git push` — Vercel
despliega solo.

**Idioma:** el producto, la interfaz, los nombres de columna, los comentarios y
los commits van **en español**. Es el idioma de la firma y de sus clientes. Sin
`snake_case` en inglés a medias: `fecha_compromiso`, no `commitment_date`.
Excepción: los nombres que vienen del framework o del proveedor
(`created_at`, `user_id`, `auth.uid()`).
