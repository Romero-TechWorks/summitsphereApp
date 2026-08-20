# 03 · Arquitectura

Las referencias **§X.Y** que aparecen en `CLAUDE.md` y en el resto de la
documentación apuntan a las secciones de este archivo.

---

## §1 · Stack

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Servidor y cliente en un repo; Vercel despliega en cada push |
| Lenguaje | **TypeScript**, cero `any` | Los tipos salen del esquema de la base y atrapan los errores caros |
| Base de datos | **Supabase** (PostgreSQL 17) | Postgres real con RLS, Auth, Storage y `pgvector` en el mismo lugar |
| Estado servidor | **TanStack React Query 5** | Es la caché, y la caché es la fuente de verdad offline |
| Persistencia local | **IndexedDB** | Sobrevive al cierre de la app; `localStorage` no aguanta el volumen |
| PWA | **@ducanh2912/next-pwa** | Fork mantenido de `next-pwa`, con `customWorkerSrc` |
| Estilos | **Variables CSS + estilos inline**, Tailwind 4 sólo en `ui/` | §5 |
| Validación | **Zod 4** | Las propuestas del asistente se validan antes de tocar la base |
| Errores | **Sentry** | Los fallos de campo no se reportan solos |
| Arrastrar y soltar | **@dnd-kit** | Widgets del tablero y orden de la lista de verificación |

### Dependencias exactas (F00·B1)

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@ducanh2912/next-pwa": "^10.2.9",
    "@sentry/nextjs": "^10.66.0",
    "@supabase/ssr": "^0.10.2",
    "@supabase/supabase-js": "^2.104.0",
    "@tanstack/react-query": "^5.101.2",
    "next": "^16.2.6",
    "pdfjs-dist": "^5.7.284",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "web-push": "^3.6.7",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/web-push": "^3.6.4",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "sharp": "^0.34.5",
    "supabase": "^2.109.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  },
  "scripts": {
    "dev": "next dev -H 0.0.0.0 --webpack",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint"
  }
}
```

⚠️ **`--webpack` no se quita.** El fork de PWA no funciona con Turbopack en esta
versión.

---

## §2 · Estructura de carpetas

```
src/
  app/(auth)/           login · mfa
  app/(dashboard)/      todo lo que exige sesión
    page.tsx            tablero con widgets
    cartera/            organizaciones · proyectos · contactos
    cartera/[id]/       expediente de una organización
    sistemas/           documentos · requisitos · procesos · riesgos · indicadores
    auditorias/         programa · auditorías · hallazgos
    auditorias/[id]/    ejecución de una auditoría
    cumplimiento/       matriz NOM · obligaciones · dictámenes
    capacitacion/       cursos · programa · sesiones · constancias
    acciones/           planes de acción
    acciones/[id]/      una acción con su causa y sus tareas
    admin/              metas · finanzas · facturación · usuarios · bitácora · config
    asistente/          la oficina (excepción consciente, ver §2.1)
  app/portal/[token]/   portal público del cliente, sin sesión
  app/api/
    users/              alta de usuarios con service_role
    push/               subscribe · send · test
    cron/               diario · resumen
    fiscal/             credenciales · sellar · timbrar · cancelar
    asistente/          interpretar · chat · informe · embeber · transcribir
    graph/              webhook · suscripciones   [Fase 08]
  components/           por dominio; ui/ es la biblioteca común
  lib/
    queries/            TODA consulta a Supabase vive aquí
    supabase/           client.ts (navegador) · server.ts (servidor)
    offline/            db · outbox · mutate · sync · adjuntos · dictados
    query/              keys.ts · QueryProvider.tsx
    normas/             catálogo de normas, cláusulas y NOMs
    asistente/          proveedor · esquemas · instrucciones · herramientas
    plantillas/         catálogo · datos · render
    utils/              helpers puros
    validation/         esquemas Zod compartidos
  types/database.ts     todos los tipos, generados desde el esquema
  proxy.ts              el middleware (§7.1)
worker/index.js         oyentes push del service worker
supabase/migrations/    esquema versionado y aditivo
```

### §2.1 · Los dominios son pestañas, no carpetas

Se navega con query string: `/auditorias?tab=hallazgos`. **Agregar una sección es
una pestaña más en su dominio, no una carpeta nueva.** Las únicas rutas propias
son las de detalle (`[id]`), el portal y `/asistente`.

`/asistente` es una excepción consciente: cruza los siete dominios, así que no
pertenece a ninguno. Vive en `src/app/(dashboard)/asistente/` —dentro del grupo de
ruta— para heredar el guard de sesión y el armazón. Se entra desde el 🤖 del
header. **La `BottomNav` tiene cinco destinos y no hay un sexto.**

---

## §3 · Multi-tenencia

La decisión de arquitectura más importante del proyecto.

**Una sola instancia sirve a toda la cartera de Summit.** No hay un despliegue por
cliente. Esto la separa de JDM Built, donde cada taller tiene su clon y su
Supabase, y donde por eso el RLS operativo podía estar abierto.

### Cómo se garantiza el aislamiento

```
auth.uid()
   │
   ▼
usuarios_organizaciones (usuario_id, org_id)
   │
   ▼
mis_organizaciones()  ← función SQL STABLE, SECURITY DEFINER
   │
   ▼
POLICY ... USING (org_id IN (SELECT mis_organizaciones()))
```

Tres reglas, sin excepciones:

1. **Toda tabla de dominio lleva `org_id NOT NULL`** con FK a `organizaciones`.
2. **Toda tabla de dominio tiene RLS activo** y sus políticas filtran por
   `mis_organizaciones()`.
3. **El rol `socio` ve todo** — pero por una rama explícita de la política
   (`OR es_socio()`), no por ausencia de política.

⚠️ Una tabla nueva sin `org_id` y sin política **es una fuga, no un pendiente**.
Detalle y plantillas de política en [`08_SEGURIDAD_Y_RLS.md`](08_SEGURIDAD_Y_RLS.md).

---

## §4 · Modelo de datos

Ver [`04_MODELO_DE_DATOS.md`](04_MODELO_DE_DATOS.md) para el detalle tabla por
tabla. Aquí, las decisiones estructurales:

### §4.1 · Migraciones aditivas y versionadas

`supabase/migrations/AAAAMMDDHHMMSS_descripcion.sql`. **Aditivas**: se agrega, no
se reescribe. Una migración aplicada no se edita — se corrige con otra.

### §4.2 · Catálogos: `text` + `CHECK`, nunca `enum`

Postgres no permite usar un valor de enum en la misma transacción que lo crea, lo
que obliga a partir migraciones en dos y ya costó caro en el proyecto hermano.
**Decisión de proyecto: cero enums de dominio.** Todos los catálogos son
`text` con `CHECK (col IN (...))`.

Los `CHECK` son listas cerradas **a propósito**: abrir un valor nuevo obliga a
pasar por una migración, y esa fricción evita que aparezcan estados que nadie
pinta.

### §4.3 · Nada se borra

- `audit_logs` sin UPDATE ni DELETE en RLS.
- `hallazgos` y `acciones`: `estado` + tabla de historial. Anular es un estado.
- `documento_versiones`: aprobar una nueva marca la anterior obsoleta; no la
  sustituye.

En una firma de auditoría esto no es higiene, es el producto.

### §4.4 · Las vistas llevan `security_invoker = true`

Sin eso, una vista corre con los permisos de quien la creó y se convierte en la
puerta trasera de la multi-tenencia. Al recrear una vista, se mantiene la
propiedad.

---

## §5 · Estilos

El patrón del proyecto es **estilos inline con variables CSS**:

```tsx
<div style={{
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
}}>
```

**No mezclar Tailwind en componentes existentes.** Los nuevos de
`src/components/ui/` pueden usarlo si respetan las variables. Todo lo que hace
falta saber está en [`05_SISTEMA_DE_DISENO.md`](05_SISTEMA_DE_DISENO.md).

---

## §6 · Consultas

Toda consulta a Supabase vive en `src/lib/queries/`. Un componente **nunca**
importa el cliente de Supabase directamente.

```ts
// lib/queries/hallazgos.ts
export async function listarHallazgosAbiertos(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('hallazgos')
    .select('*, clausula:norma_clausulas(numero, titulo)')
    .eq('org_id', orgId)
    .in('estado', ['abierto', 'en_accion'])
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data
}
```

Y se consume siempre con `useQuery` y una clave de `lib/query/keys.ts`:

```ts
const { data, isLoading } = useQuery({
  queryKey: queryKeys.hallazgos.abiertos(orgId),
  queryFn: () => listarHallazgosAbiertos(orgId),
})
```

⚠️ **Nunca `useEffect` + `useState` para cargar datos.** Sin señal no hay caché, y
sin caché no hay app en campo.

---

## §7 · Rutas y guardas

### §7.1 · `src/proxy.ts`

El middleware de Next.js 16 se llama `proxy.ts` y exporta `proxy`. Hace tres
cosas: refresca la sesión de Supabase, redirige a `/login` sin sesión, y exige
`aal2` a los roles `socio` y `administracion`.

Su `matcher` **excluye**:

| Excluido | Por qué |
|---|---|
| `sw.js`, `workbox-*`, `worker-*`, `swe-worker-*`, `manifest.json` | Si el guard los redirige, el navegador recibe HTML donde espera JS y **el service worker no se registra en la pantalla de login** |
| `monitoring` | Túnel de Sentry, va sin sesión a propósito |
| `api/cron` | Lo dispara Vercel, llega sin sesión; se autentica con `CRON_SECRET` |
| `portal` | El portal del cliente es público por definición |
| `_next/static`, `_next/image`, imágenes | Estáticos |

⚠️ **Toda ruta pública nueva se suma a esta lista en el mismo commit que la crea.**

---

## §8 · Notas por área

### §8.1 · Armazón fijo

El `div` raíz mide la ventana y recorta. El documento **no scrollea**; el único
elemento con scroll es el que marca `src/lib/utils/appScroll.ts`. Sin esto, el
navegador móvil recoge su barra de URL al scrollear y el header y la barra
inferior se mueven — `dvh` no lo arregla, porque corrige cuánto miden las cosas,
no contra qué se anclan.

- `window.scrollTo` **no hace nada** dentro del dashboard: usa `getAppScroller()`.
- Ningún `vh` crudo: `var(--vh-full)`.
- Un contenedor con scroll dentro de un flex necesita `minHeight: 0`.
- Para librar la barra inferior: `var(--bottom-nav-total)`.

### §8.2 · RLS por organización

Ver §3 y [`08_SEGURIDAD_Y_RLS.md`](08_SEGURIDAD_Y_RLS.md).

### §8.3 · Secretos

Sólo `NEXT_PUBLIC_*` llega al navegador. `SUPABASE_SERVICE_ROLE_KEY` salta todo
el RLS y **sólo** se usa en API routes. Tabla completa en
[`../guias/05_VARIABLES_DE_ENTORNO.md`](../guias/05_VARIABLES_DE_ENTORNO.md).

### §8.4 · Bitácora

Trigger genérico `registrar_bitacora()` enganchado a cada tabla de dominio.
Registra tabla, id, operación, `auth.uid()`, y el `jsonb` de antes y después. Se
consulta traducida a lenguaje natural en `/admin?tab=bitacora`.

### §8.5 · Portal del cliente

`/portal/[token]` es público y va excluido del matcher. El rol `anon` **no está en
ninguna política operativa**: todo el portal entra por **una sola** función
`SECURITY DEFINER`, `portal_organizacion(p_token)`, que devuelve un `jsonb` armado
a mano — **lista blanca, no filtro**. El `service_role` sólo firma las fotos.

⚠️ Nunca se consultan tablas desde el navegador del cliente ni se le abren
políticas a `anon`: vería la cartera entera.

### §8.6 · Normas bajo licencia

En la base viven número, título, resumen propio y relaciones. **El texto íntegro
no.** El PDF licenciado del cliente entra a su bucket privado. Ver CLAUDE.md
regla 12.

### §8.7 · Hallazgos

Numeración estable y calculable **sin red** (`AUD-2026-014 / H-03`): se compone
del folio de la auditoría, que ya existe en la caché, más un consecutivo local.
Un hallazgo no se borra: se anula con motivo o se reclasifica, y queda su
historial.

### §8.8 · Adjuntos — cuatro reglas

1. El bucket es **privado** (guarda evidencia de auditoría). Se lee con URL
   firmada, así que **las fotos ya subidas no se ven sin señal**; tomarlas sí.
2. Tienen **cola propia** (`src/lib/offline/adjuntos.ts`), no el `outbox`: una
   subida no es una escritura de tabla, va en dos fases y pesa megabytes. Se vacía
   **después** de los datos.
3. La lista local y la del servidor filtran con `campoDominante()`
   (tarea → acción → hallazgo → documento → organización), **nunca con un OR**.
4. **`subirAdjunto()` sólo encola; subir es `sincronizarAdjuntos()` y hay que
   esperarlo** — refrescar sin esperar es el "hay que subirla dos veces".

### §8.9 · Capa offline

```
componente
   │ useQuery / offlineWrite
   ▼
lib/queries/*  ──── online ────▶ Supabase
   │
   └─ sin señal ─▶ outbox (IndexedDB) ─▶ sync al volver la red
```

`offlineWrite` recibe `table`, `op`, `payload`, `match`, una etiqueta legible en
español, el camino `online` y la fila optimista `offline`. Devuelve la fila y
además dice si viajó o si se encoló.

### §8.10 · Claves de caché

Todas en `src/lib/query/keys.ts`. Una clave inventada en un componente es un dato
que no se invalida cuando debe.

### §8.11 · Precarga de auditoría

⚠️ Regla propia de este proyecto. Al abrir una auditoría **con señal**, se
precargan en la caché: la auditoría, su agenda, sus ítems, las cláusulas de su
alcance, los hallazgos previos del cliente y los documentos aprobados relevantes.
Un aviso explícito confirma "lista para trabajar sin señal". Sin esto, el auditor
llega a planta con una pantalla vacía y la Fase 03 no sirve.

### §8.12 · Reglas del offline

Las seis de CLAUDE.md. La que más se rompe: **copiar `data` a un `useState`**.

### §8.13 · Notificaciones push

`public/sw.js` lo **regenera el build**: los oyentes propios van en
`worker/index.js` (`customWorkerSrc`). El push exige **HTTPS o `localhost`** — no
se prueba desde una IP de red local.

### §8.14 · Cron

Dos rutas y **el plan Hobby de Vercel permite exactamente dos crons**: lo que
necesite tiempo se cuelga del diario. Toda la lógica vive en la RPC
`correr_avisos_programados()`; la ruta sólo hace el fan-out de push y se autentica
con `CRON_SECRET`.

### §8.15 · Plantillas y reportes

Catálogo en código (`src/lib/plantillas/catalogo.ts`) + configuración en
`config_firma.plantillas jsonb` + render **sin dependencias con colores
literales** — la ventana de impresión no hereda `globals.css`. Los recolectores de
`datos.ts` sólo consultan los campos encendidos: al agregar un campo al catálogo
hay que sumar su rama ahí, o saldrá siempre como "sin registros".

### §8.16 · Buscador global

Vista `indice_busqueda_global` + RPC `buscar_global`. Por **prefijo**
(`'calibr':*`), no `websearch_to_tsquery`: se teclea a medias palabras. Vive en la
Navbar, no en un FAB.

### §8.17 · El asistente

Ver [`07_ASISTENTE_Y_AUTOMATIZACION.md`](07_ASISTENTE_Y_AUTOMATIZACION.md). Las
tres reglas que no se negocian: **propone, no escribe**; **cita siempre**; **todo
deja traza**.

---

## §9 · Entornos

| Entorno | Dónde | Para qué |
|---|---|---|
| **Local** | `npm run dev` en `localhost:3000` | Desarrollo diario |
| **Preview** | Vercel, una URL por rama | Revisar un cambio antes de fusionar |
| **Producción** | `app.summit-sphere.com` | La firma |

⚠️ **Preview apunta al mismo Supabase que producción.** Una rama que borre datos
los borra de verdad. Cuando el volumen lo justifique, se abre un proyecto de
Supabase de staging (ver [`../guias/02_SUPABASE.md`](../guias/02_SUPABASE.md)).

---

## §10 · Cómo se trabaja

**Antes:** lee la sección relevante · `git pull origin main` · si tocas Supabase
valida contra `src/types/database.ts` · si dudas del patrón visual mira 2-3
componentes similares · si el cambio afecta documentación, actualízala en el mismo
commit.

**Después:** `npm run lint` · `npm run build` · commit
`feat|fix|chore: descripción corta` · `git push`.

⚠️ **No corras `npm run build` con un `npm run dev` encendido sobre el mismo
repo.** Los dos escriben en `.next` y el resultado son errores en tiempo de
ejecución cuyo número de línea no corresponde al archivo.
