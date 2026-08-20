# SummitApp

Aplicación de gestión para **Summit-Sphere** — consultoría en Sistemas de Gestión,
Auditorías, Cumplimiento Normativo, Capacitación y Automatización.

Es una **PWA** (Next.js 16 + TypeScript + Supabase) que lleva a la app la forma de
trabajar de la firma: la cartera de clientes, el sistema de gestión de cada uno,
el ciclo completo de auditoría, los hallazgos y sus acciones correctivas, el
cumplimiento de NOMs, la capacitación y —al final— un asistente que lee la norma,
juzga la evidencia y redacta el procedimiento.

> **Estado: documentación.** Todavía no hay código. Este repositorio contiene el
> plan, la arquitectura y las guías de infraestructura. La Fase 00 lo convierte
> en una aplicación que arranca.

---

## Por dónde empezar

| Si eres… | Lee esto |
|---|---|
| **El dueño / socio de Summit-Sphere** | [`docs/01_VISION_Y_ALCANCE.md`](docs/01_VISION_Y_ALCANCE.md) y luego [`docs/09_TAREAS_DEL_DUENO.md`](docs/09_TAREAS_DEL_DUENO.md) |
| **Quien monta la infraestructura** | [`guias/00_INDICE_INFRAESTRUCTURA.md`](guias/00_INDICE_INFRAESTRUCTURA.md) — es un checklist en orden |
| **Quien va a programar** | [`CLAUDE.md`](CLAUDE.md) completo, luego [`docs/02_PLAN_DE_FASES.md`](docs/02_PLAN_DE_FASES.md) |
| **Un agente de código (Claude, Codex…)** | [`CLAUDE.md`](CLAUDE.md). Es obligatorio y manda sobre cualquier costumbre |

---

## Índice de documentación

### `docs/` — el producto

| Archivo | Para qué |
|---|---|
| [`00_INDICE.md`](docs/00_INDICE.md) | Mapa de toda la documentación |
| [`01_VISION_Y_ALCANCE.md`](docs/01_VISION_Y_ALCANCE.md) | Qué es SummitApp, para quién, y qué **no** es |
| [`02_PLAN_DE_FASES.md`](docs/02_PLAN_DE_FASES.md) | **El plan.** Nueve fases, sus bloques, entregables y criterios de cierre |
| [`03_ARQUITECTURA.md`](docs/03_ARQUITECTURA.md) | Stack, estructura de carpetas, patrones heredados y decisiones |
| [`04_MODELO_DE_DATOS.md`](docs/04_MODELO_DE_DATOS.md) | Todas las tablas, vistas y RPC, ordenadas por la fase que las crea |
| [`05_SISTEMA_DE_DISENO.md`](docs/05_SISTEMA_DE_DISENO.md) | Tokens, paleta validada en contraste, tipografía y reglas de UI |
| [`06_MODULOS_FUNCIONALES.md`](docs/06_MODULOS_FUNCIONALES.md) | Cómo se usa cada módulo, en el lenguaje de la firma |
| [`07_ASISTENTE_Y_AUTOMATIZACION.md`](docs/07_ASISTENTE_Y_AUTOMATIZACION.md) | Los Módulos A, B y C del plan de automatización, aterrizados |
| [`08_SEGURIDAD_Y_RLS.md`](docs/08_SEGURIDAD_Y_RLS.md) | Roles, políticas, portal público, manejo de secretos |
| [`09_TAREAS_DEL_DUENO.md`](docs/09_TAREAS_DEL_DUENO.md) | Lo que sólo puede hacer el dueño, escrito sin jerga |
| [`10_GLOSARIO.md`](docs/10_GLOSARIO.md) | Vocabulario ISO y normativo → nombre en la base de datos |

### `guias/` — la infraestructura

| Archivo | Para qué |
|---|---|
| [`00_INDICE_INFRAESTRUCTURA.md`](guias/00_INDICE_INFRAESTRUCTURA.md) | **Empieza aquí.** Orden de ejecución y checklist maestro |
| [`01_GITHUB.md`](guias/01_GITHUB.md) | Organización, repositorio, ramas, secretos, Actions de respaldo |
| [`02_SUPABASE.md`](guias/02_SUPABASE.md) | Proyecto, base de datos, Auth, Storage, migraciones, respaldos |
| [`03_VERCEL.md`](guias/03_VERCEL.md) | Proyecto, variables, dominios, crons, previews |
| [`04_CLOUDFLARE.md`](guias/04_CLOUDFLARE.md) | DNS, Turnstile, R2 para respaldos, correo, WAF |
| [`05_VARIABLES_DE_ENTORNO.md`](guias/05_VARIABLES_DE_ENTORNO.md) | Tabla maestra: cada secreto, de dónde sale y dónde vive |

---

## Arranque rápido (cuando exista código)

```bash
npm install
cp .env.example .env.local     # y llénalo — ver guias/05_VARIABLES_DE_ENTORNO.md
npm run dev                    # http://localhost:3000
```

Para probar la capa **offline** y las notificaciones push no sirve `npm run dev`:
el service worker está apagado en desarrollo. Hay que `npm run build && npm run start`.

---

## Contacto

Summit-Sphere · Metepec, Estado de México
manuel.garcia@summit-sphere.com · 722 173 9808
