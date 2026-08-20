# Índice de documentación — SummitApp

Este directorio describe **el producto**. La infraestructura que lo sostiene está
en [`../guias/`](../guias/00_INDICE_INFRAESTRUCTURA.md).

---

## Orden de lectura recomendado

```
                    ┌─────────────────────────┐
                    │ 01 · Visión y alcance   │  ¿Qué estamos construyendo
                    │    (empieza aquí)       │   y para quién?
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
     ┌────────────────┐ ┌──────────────┐ ┌────────────────┐
     │ 02 · Plan de   │ │ 06 · Módulos │ │ 10 · Glosario  │
     │      fases     │ │  funcionales │ │                │
     │  (el mapa)     │ │ (el uso)     │ │ (el idioma)    │
     └───────┬────────┘ └──────────────┘ └────────────────┘
             │
   ┌─────────┼──────────┬────────────┬──────────────┐
   ▼         ▼          ▼            ▼              ▼
┌───────┐┌────────┐┌─────────┐┌───────────┐┌─────────────┐
│  03 · ││  04 ·  ││  05 ·   ││   07 ·    ││    08 ·     │
│ Arqui-││ Modelo ││ Sistema ││ Asistente ││ Seguridad   │
│tectura││de datos││de diseño││   y auto- ││   y RLS     │
│       ││        ││         ││ matización││             │
└───────┘└────────┘└─────────┘└───────────┘└─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ 09 · Tareas del dueño   │  Lo manual, sin jerga
                    └─────────────────────────┘
```

---

## Los documentos

| # | Documento | Qué contesta |
|---|---|---|
| 01 | [Visión y alcance](01_VISION_Y_ALCANCE.md) | Qué es SummitApp, a quién sirve, qué **no** hace y por qué |
| 02 | [Plan de fases](02_PLAN_DE_FASES.md) | Qué se construye, en qué orden, con qué entregable y cómo se sabe que una fase cerró |
| 03 | [Arquitectura](03_ARQUITECTURA.md) | Stack, estructura de carpetas, patrones y las decisiones que no se discuten dos veces |
| 04 | [Modelo de datos](04_MODELO_DE_DATOS.md) | Cada tabla, vista y RPC, agrupada por la fase que la crea |
| 05 | [Sistema de diseño](05_SISTEMA_DE_DISENO.md) | Paleta validada en contraste, tipografía, tokens y reglas de interfaz |
| 06 | [Módulos funcionales](06_MODULOS_FUNCIONALES.md) | Cómo usa la app un consultor, un auditor y un cliente |
| 07 | [Asistente y automatización](07_ASISTENTE_Y_AUTOMATIZACION.md) | Los Módulos A, B y C del plan de automatización, convertidos en trabajo ejecutable |
| 08 | [Seguridad y RLS](08_SEGURIDAD_Y_RLS.md) | Roles, políticas por organización, portal público, secretos |
| 09 | [Tareas del dueño](09_TAREAS_DEL_DUENO.md) | Los pasos que ningún programa puede hacer por ti |
| 10 | [Glosario](10_GLOSARIO.md) | Del vocabulario ISO al nombre de la columna |

---

## Convenciones de esta documentación

- **Todo en español**, incluidos nombres de tabla y de columna. Es el idioma de la
  firma y de sus clientes.
- Las referencias tipo **§8.4** apuntan a una sección de
  [`03_ARQUITECTURA.md`](03_ARQUITECTURA.md).
- **⚠️** marca algo que ya se rompió antes o que se rompe sin darse cuenta.
- Un bloque marcado **`[Fase NN]`** indica en qué fase existe eso que se describe.
  Si lees sobre algo que no encuentras en el código, mira su fase antes de
  reportarlo como faltante.
