# `src/` — el código de la aplicación

La estructura completa y sus razones están en
[`../docs/03_ARQUITECTURA.md`](../docs/03_ARQUITECTURA.md) §2.

⚠️ Antes de tocar nada, lee [`../CLAUDE.md`](../CLAUDE.md).

## Lo que ya existe — Fase 00 completa y F01·B0, B1, B2 y B2b

```
src/
  proxy.ts                    ⚠️ el middleware — NO se llama middleware.ts
  instrumentation.ts          Sentry en servidor y edge
  instrumentation-client.ts   Sentry en el navegador
  app/
    layout.tsx                fuentes + metadata + manifest
    globals.css               los tokens de Summit
    not-found.tsx             404 con salida al inicio
    global-error.tsx          el último recurso, reporta a Sentry
    ~offline/                 pantalla de respaldo del service worker
    (auth)/login/ (auth)/mfa/ entrada a la aplicación y segundo factor
    (dashboard)/
      layout.tsx              ⚠️ EL ARMAZÓN FIJO
      page.tsx                el tablero — la plantilla visual del resto
      cartera/                organizaciones · contactos · [id] (expediente)
      sistemas/ auditorias/ acciones/
      cumplimiento/ capacitacion/ admin/
  components/
    layout/                   Sidebar · Navbar · BottomNav · EstadoConexion ·
                              ScrollReset · PantallaPendiente
    tablero/                  RejillaTablero · ContenidoWidget
    normas/                   PantallaSistemas · ImportadorNormas · ArbolNormas
    cartera/                  PantallaCartera · ExpedienteOrganizacion ·
                              DirectorioContactos · PanelEquipo ·
                              PanelProyectos · DetalleProyecto · PanelAlcance ·
                              ListaProyectosCartera · formularios
    ui/                       Button · Badge · Skeleton · EstadoVacio · Logo ·
                              Iconos · EncabezadoPagina · Aviso · Lista ·
                              Campo · Input · Select · Textarea · Checkbox ·
                              Modal · Pestanas
    ProveedorConsultas.tsx    React Query + caché persistida
  lib/
    navegacion.ts             los destinos, en un solo sitio
    auth/roles.ts             los cinco roles, espejo del CHECK de la base
    supabase/                 entorno · client · server · admin · errores
    query/                    keys.ts (⚠️ TODAS las claves) · cliente · cache
    queries/                  sesion · usuarios · tablero · cartera · proyectos · normas
    normas/importador.ts      analizador del catálogo (.md → normas)
    cartera/catalogos.ts      los CHECK de la base, en TypeScript
    offline/                  idb · cola · mutate · sync · persistencia · estado
    tablero/widgets.ts        el catálogo de widgets por rol
    utils/                    appScroll · uuid · a11y · dates · texto · useEsMovil
  types/database.ts           generado con `npx supabase gen types`
```

⚠️ **No hay `Card`, y es a propósito.** Desde F01·B0 no hay tarjetas en ninguna
pantalla: el contenido va como texto sobre el fondo, delimitado por la hairline
verde de `ui/Lista.tsx`. Los `<input>` y `<select>` sí conservan su marco — son
controles, no contenedores. [`../docs/05_SISTEMA_DE_DISENO.md`](../docs/05_SISTEMA_DE_DISENO.md) §4.3.

## Lo que falta y en qué bloque llega

| Carpeta | Bloque | Qué va |
|---|---|---|
| bitácora del proyecto | F01·B4 | Línea de tiempo por proyecto |
| `lib/normas/` (NOMs) | F05 | Catálogo de obligaciones normativas |
| `lib/plantillas/` | F03 | Entregables imprimibles |
| `app/api/` | F04 en adelante | users · push · cron · fiscal · asistente · graph |
| `app/portal/[token]/` | F06 | Portal público del cliente, sin sesión |
| `lib/asistente/` | F07 | Proveedor, esquemas Zod, instrucciones, herramientas |

## Cuatro cosas que se rompen sin darse cuenta

1. **El documento no scrollea.** `window.scrollTo()` no hace nada dentro del
   dashboard: quien scrollea es el div que marca `lib/utils/appScroll.ts`.
2. **Nada mide `100vh` en crudo** — va `var(--vh-full)`.
3. **`crypto.randomUUID()` no existe fuera de contexto seguro.** Usa `uuid()` de
   `lib/utils/uuid.ts` o toda escritura muere al probar desde un teléfono en la
   red local.
4. **Una columna `date` no se formatea con `new Date()`** — corre un día en
   México. `formatDateOnly` / `toISODate` de `lib/utils/dates.ts`.
