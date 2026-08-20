# `scripts/` — utilidades fuera de la aplicación

Scripts de Node que se corren a mano, no en tiempo de ejecución.

Previstos:

| Script | Fase | Para qué |
|---|---|---|
| `sembrar_normas.mjs` | 02 | Carga el árbol de cláusulas de las siete normas |
| `sembrar_noms.mjs` | 05 | Carga el catálogo de NOMs y sus requisitos |
| `condensar_clausulas.mjs` | 07 | Genera la forma *Token Diet* de cada cláusula |
| `verificar_aislamiento.mjs` | continuo | ⚠️ Prueba que un consultor no ve organizaciones que no le tocan |
| `generar_catalogos_sat.mjs` | 06 | Sólo si se enciende facturación |

⚠️ **La salida de `sembrar_normas.mjs` y `sembrar_noms.mjs` la revisa un auditor
líder antes de aplicarse** (tareas del dueño `C01` y `F01`). Es el criterio técnico
de la firma, y va a aparecer en cada informe que Summit entregue.
