# F-SG-17 · Base de Datos de No Conformidades

> Transcripción del `.xlsx` (cuarta tanda, 7 sep 2026). Versión 0, 10-Feb-2025.
> Dos hojas: **Control de Acciones** y Control de Cambios.
>
> **Es el tablero de seguimiento de la Fase 04.** `P-SG-05` §5.6 dice que el
> avance de las acciones se documenta **aquí**, no en el F-SG-06.

---

## 1 · Estructura del original

```
┌──────────────────────────────────────────────────────────────────────┐
│ [logo]   Base de Datos de No Conformidades    Fecha elab.: 10-Feb-25 │
│          F-SG-17                              Última versión: 0      │
└──────────────────────────────────────────────────────────────────────┘
                                        ABIERTA │ 7        ← contador vivo
                                        CERRADA │ 0
                                  FECHA │ 45707 │ 7
```

Un renglón de encabezado y luego **un bloque por NC**, con las columnas de la NC
combinadas verticalmente sobre **varios renglones de acción**:

| Col | Encabezado | Ámbito | Nuestra columna |
|---|---|---|---|
| A | `#` | NC | consecutivo de la lista, no del folio |
| B | `FECHA` | NC | `hallazgos.detectado_en` |
| C | `PREV / CORR` | NC | **preventiva o correctiva** → `acciones.tipo` |
| D | `NO.` | NC | el folio de la acción (`AC-FA-01-25`) |
| E | `NC` | NC | el número de la no conformidad |
| F | `PROCESO` | NC | ⚠️ **no existe** en `hallazgos` |
| G | `DESCRIPCION` | NC | `hallazgos.descripcion` |
| H | `RESP.` | NC | responsable de la NC |
| I | `CLIENTE (INT/EXT)` | NC | ⚠️ **cliente interno vs externo** — no existe |
| J | `ACCIONES CORRECTIVAS` | **acción** | `acciones.descripcion` |
| K | `RESPONSABLE` | **acción** | `acciones.responsable_id` |
| L | `FECHA` | **acción** | `acciones.fecha_compromiso` |
| M | `% DE AVANCE` | **acción** | ⚠️ `acciones.avance_pct` — no existe |
| N | `MONITOREO` | acción | nota de seguimiento |
| O | `STATUS` | NC | `ABIERTA` / `CERRADA` |
| P | `RESULTADO DE LAS ACCIONES TOMADAS` | NC | `acciones.eficacia_evidencia` |
| Q | `FECHA DE CIERRE` | NC | `hallazgos.cerrado_en` |

---

## 2 · Las tres reglas que la hoja impone

### 2.1 · Una NC tiene VARIAS acciones, y las columnas se reparten
Las celdas combinadas lo dicen sin ambigüedad: `A16:A23`, `B16:B23`… son de la
NC; `J`, `K`, `L`, `M`, `N` corren libres renglón por renglón. **Confirma
`acciones` como tabla hija de `hallazgos`**, que ya es el plan. Los bloques del
original tienen 6 y 8 renglones — no es un número fijo.

### 2.2 · El avance de una NC es el PROMEDIO del avance de sus acciones
Cada bloque cierra con un renglón `PROMEDIO DE AVANCE` que agrega la columna `M`.

⚠️ **Se calcula en memoria, no en la base**, por la misma razón que los widgets
del tablero y `TableroHallazgos`: es una agregación sobre una lista que la caché
ya tiene, y una vista sería otra clave que puede faltar sin señal. CLAUDE.md ·
«El tablero del lunes NO tiene vista en la base».

### 2.3 · El contador ABIERTA / CERRADA va arriba y es lo primero que se mira
Dos celdas en el encabezado. Es el widget `acciones_semana` de
`src/lib/tablero/widgets.ts`, que sigue siendo `PantallaPendiente` [F04].

---

## 3 · Lo que este formato añade al modelo

| Falta | Por qué importa |
|---|---|
| `acciones.proceso_id` | Col. `F`. Además el folio del cliente cuenta **por proceso** (`P-SG-05` §5.2) |
| `acciones.avance_pct` (0-100) | Col. `M`. Sin él no hay promedio ni tablero |
| `hallazgos.cliente_tipo` (`interno`/`externo`) | Col. `I`. Una NC de un proceso interno no se le reporta al cliente igual que una que tocó a su cliente final |
| `acciones.monitoreo` | Col. `N`. Es la nota de seguimiento del Coordinador, distinta de la evidencia de cierre |

---

## 4 · Lo que ya está cubierto

`TableroHallazgos.tsx` ya es la mitad de arriba de esta hoja: agrupa, calcula
antigüedad en memoria y filtra sin tocar la red. Lo que falta es **la mitad de la
derecha** — de la columna `J` en adelante —, que es literalmente `F04·B1`.

⚠️ **No se imprime.** A diferencia del `F-SG-09` o el `F-SG-12`, esta hoja es un
tablero de trabajo interno del Coordinador SGC, no un entregable con firmas. Si
alguna vez se imprime, va por `src/lib/plantillas/` como las otras cuatro.
