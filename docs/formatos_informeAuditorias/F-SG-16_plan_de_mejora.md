# F-SG-16 · Plan de Mejora

> Transcripción del `.xlsx` (cuarta tanda, 7 sep 2026). Versión 0, 10-Feb-2025.
>
> Cierra uno de los **dos formatos que nadie sabía que faltaban**, destapados por
> el `F-SG-05` el 2 sep 2026. El otro es el `F-SG-24`.

---

## 1 · Cuándo se usa — y es CONDICIONAL

Dos disparadores, los dos por referencia explícita:

- **`P-SG-05` §5.5** — «Cuando las acciones correctivas requieran de una
  planeación de mayor complejidad para su entendimiento y cierre efectivo se
  aplicará el F-SG-16 Plan de Mejora.»
- **`P-SG-07` §5.5.2** — una **sugerencia procedente** de un cliente se atiende
  con el `F-SG-24` **o** con el `F-SG-16`.

⚠️ **No es «acciones con tipo = mejora», como decía el índice.** Es un
**contenedor de varias acciones con calendario anual**: el `F-SG-17` sigue el
seguimiento acción por acción; el `F-SG-16` planifica un conjunto a doce meses.

---

## 2 · Estructura del original

```
┌────────────────────────────────────────────────────────────────────┐
│ [logo]  Plan de Mejora            Fecha de elaboración: 10-Feb-2025│
│         F-SG-16                   Versión vigente: 0               │
└────────────────────────────────────────────────────────────────────┘
  ALCANCE:    ______________________________________________________
  OBJETIVO:   ______________________________________________________
  PROGRAMA DE: _____________________________________________________

                                    AÑO 2025
  ┌────────┬────────────┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬────────┬──────────┐
  │ ACCIÓN │RESPONSABLE │ENE│FEB│MAR│ABR│MAY│JUN│JUL│AGO│SEP│OCT│NOV│DIC│ AVANCE │ EVIDENCIA│
  ├────────┼────────────┼───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┼────────┼──────────┤
  │        │            │ P  ← programado                              │   0    │          │
  │        │            │ R  ← real                                    │        │          │
  └────────┴────────────┴──────────────────────────────────────────────┴────────┴──────────┘
                              (cinco renglones P/R)

  ELABORÓ: ____________            APROBÓ: ____________
```

---

## 3 · ⚠️ Es la MISMA forma que el `F-SG-09`, y eso ya está resuelto

Doce meses en cuadrícula, un renglón por acción, `AVANCE` calculado y firmas al
pie. **Es la parrilla de `programa_procesos`** que se construyó en `F03·B6b`.

Aplica idéntica la decisión de `D06`:

> ⚠️ **Los meses van en una columna `jsonb`, no en una tabla hija.** Una tabla
> `(renglón, mes)` necesitaría un índice único que no es la PK, y ahí la cola
> resuelve sus `upsert` por la PK (§6.1). Además marcar seis meses serían seis
> operaciones de la cola en vez de una.

**La diferencia con el F-SG-09:** aquí cada renglón tiene **dos** líneas de meses,
`P` (programado) y `R` (real). El `jsonb` guarda dos arreglos, no uno:
`{"p": [1,0,1,…], "r": [1,0,0,…]}`.

---

## 4 · Mapeo

| Campo del formato | Dónde vive |
|---|---|
| ALCANCE · OBJETIVO · PROGRAMA DE | Cabecera del plan → tabla `planes_mejora` |
| AÑO | `anio int` |
| ACCIÓN | `acciones.descripcion`, con `plan_mejora_id` |
| RESPONSABLE | `acciones.responsable_id` / `responsable_contacto_id` |
| ENE…DIC (P/R) | `jsonb` en el renglón del plan |
| AVANCE | ⚠️ `acciones.avance_pct` — el mismo que pide el `F-SG-17` |
| EVIDENCIA | `adjuntos` con `accion_id` |
| ELABORÓ / APROBÓ | Sellados por la base, como `programa_auditorias` |

**Tabla nueva mínima:** `planes_mejora` (`org_id`, `alcance`, `objetivo`,
`programa_de`, `anio`, `aprobado_por_id`, `aprobado_en`) y
`acciones.plan_mejora_id` nullable. El calendario P/R cuelga de la acción.

⚠️ **Se imprime.** Lleva firmas de Elaboró y Aprobó: es un entregable, y va por
`src/lib/plantillas/` con `membrete()` y `pieConfidencial()` compartidos, como los
otros cuatro.
