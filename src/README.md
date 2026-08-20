# `src/` — el código de la aplicación

Vacío a propósito: lo llena la **Fase 00, bloque 1**. La estructura completa está
en [`../docs/03_ARQUITECTURA.md`](../docs/03_ARQUITECTURA.md) §2.

```
src/
  app/(auth)/          login · mfa
  app/(dashboard)/     los siete dominios + el asistente
  app/portal/[token]/  portal público del cliente
  app/api/             users · push · cron · fiscal · asistente · graph
  components/          por dominio; ui/ es la biblioteca común
  lib/queries/         TODA consulta a Supabase
  lib/supabase/        client.ts (navegador) · server.ts (servidor)
  lib/offline/         cola, caché, adjuntos, sincronía
  lib/normas/          catálogo de normas, cláusulas y NOMs
  lib/asistente/       proveedor, esquemas, instrucciones, herramientas
  lib/plantillas/      entregables imprimibles
  lib/utils/           helpers puros
  types/database.ts    generado con `npx supabase gen types`
  proxy.ts             ⚠️ el middleware — NO se llama middleware.ts
```

⚠️ Antes de crear el primer archivo, lee [`../CLAUDE.md`](../CLAUDE.md).
