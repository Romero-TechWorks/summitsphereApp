# `src/` — el código de la aplicación

La estructura completa y sus razones están en
[`../docs/03_ARQUITECTURA.md`](../docs/03_ARQUITECTURA.md) §2.

⚠️ Antes de tocar nada, lee [`../CLAUDE.md`](../CLAUDE.md).

## Lo que ya existe — F00·B1 y B2

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
    (auth)/login/             entrada a la aplicación
    (dashboard)/
      layout.tsx              ⚠️ EL ARMAZÓN FIJO
      page.tsx                el tablero
      cartera/ sistemas/ auditorias/ acciones/
      cumplimiento/ capacitacion/ admin/
  components/
    layout/                   Sidebar · Navbar · BottomNav · ScrollReset
    ui/                       Button · Card · Badge · Skeleton · EstadoVacio · Logo · Iconos
  lib/
    navegacion.ts             los destinos, en un solo sitio
    supabase/                 entorno · client · server · admin
    utils/                    appScroll · uuid · a11y
```

## Lo que falta y en qué bloque llega

| Carpeta | Bloque | Qué va |
|---|---|---|
| `app/(auth)/mfa/` | F00·B3 | Enrolamiento y reto TOTP |
| `lib/query/` | F00·B4 | `keys.ts` y `QueryProvider` |
| `lib/offline/` | F00·B4 | Cola, caché en IndexedDB, adjuntos, sincronía |
| `types/database.ts` | F00·B5 | Generado con `npx supabase gen types` |
| `lib/queries/` | F01 en adelante | **TODA** consulta a Supabase |
| `app/portal/[token]/` | F06 | Portal público del cliente, sin sesión |
| `app/api/` | F04 en adelante | users · push · cron · fiscal · asistente · graph |
| `lib/normas/` | F02 | Catálogo de normas, cláusulas y NOMs |
| `lib/asistente/` | F07 | Proveedor, esquemas Zod, instrucciones, herramientas |
| `lib/plantillas/` | F03 | Entregables imprimibles |

## Tres cosas que se rompen sin darse cuenta

1. **El documento no scrollea.** `window.scrollTo()` no hace nada dentro del
   dashboard: quien scrollea es el div que marca `lib/utils/appScroll.ts`.
2. **Nada mide `100vh` en crudo** — va `var(--vh-full)`.
3. **`crypto.randomUUID()` no existe fuera de contexto seguro.** Usa `uuid()` de
   `lib/utils/uuid.ts` o toda escritura muere al probar desde un teléfono en la
   red local.
