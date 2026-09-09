# P-SG-06 · Medición, Análisis y Mejora Continua  (+ F-SG-15 · F-SG-19)

> Transcripción del `.docx` y los dos formatos (cuarta tanda, 7 sep 2026).
> Versión 0. ⚠️ **Es de la Fase 02** (`indicadores` y `mediciones` existen desde
> `F02·B4`), con una boca hacia la Fase 04.

---

## 1 · La regla que conecta la Fase 02 con la Fase 04

> §5.1 — «detectar incumplimientos a objetivos o bajas tendencias, así como
> determinar las acciones correspondientes… esto debe de realizarse conforme al
> **P-SG-05** Procedimiento de Acciones Correctivas.»

✅ **Confirma `fuente_nc = 'indicador'`.** Un indicador bajo meta **es** una NC y
entra al mismo ciclo. Ya está en el CHECK de `20260902120000`.

⚠️ Y añade una segunda ruta que no teníamos: «acciones **preventivas** cuando se
requiera mejora» (§5.1, junta trimestral). Es `acciones.tipo = 'preventiva'`, que
ya está en el plan y que el `F-SG-17` confirma con su columna `PREV / CORR`.

---

## 2 · Cadencias — y son cuatro distintas

| Qué | Cada cuánto | Formato |
|---|---|---|
| Reporte de indicadores al Coordinador SGC | **mensual**, por correo | — |
| Integración y publicación en tablero | mensual | `F-SG-15` |
| **Junta de calidad** con responsables de proceso | **trimestral** | `F-SG-20` |
| Revisión por la Dirección | anual | `F-SG-18` |

⚠️ **El reporte mensual incluye tres cosas, no una:** medición, **análisis** y
**acciones de mejora propuestas en caso de no cumplir el objetivo**. Hoy
`mediciones` guarda el valor del periodo. Faltan `analisis text` y el enlace a la
acción — y sin ellos, el incumplimiento de meta no deja rastro de por qué.

---

## 3 · F-SG-19 · Procesos, Indicadores y Objetivos — el catálogo

Once indicadores con **META** y **PERIODO**, y el periodo **no es un enum de
calendario**:

| # | Proceso | Indicador | Meta | Periodo |
|---|---|---|---|---|
| 1 | Dirección & Administración | % licitaciones ganadas / presentadas | 90 | **Anual** |
| 2 | Operación | % proyectos concluidos sin salidas no conformes | 95 | **Al finalizar un proyecto** |
| 3 | Operación | % costo de materiales desperdiciados | 4 | Al finalizar un proyecto |
| 4 | Contabilidad & Operación | % cumplimiento del presupuesto de obra | 95 | Al finalizar un proyecto |
| 5 | Compras | % cumplimiento de especificaciones de materiales | 90 | Al finalizar un proyecto |
| 6 | Compras & Operación | Evaluación de proveedores y contratistas | 95 | Al finalizar un proyecto |
| 7 | SGC | % cumplimiento del programa de capacitación | 90 | Anual |
| 8 | SGC | % satisfacción del cliente | 90 | Al finalizar un proyecto |
| 9 | SGC | **% acciones correctivas cerradas** | 95 | Al finalizar un proyecto |
| 10 | Transporte y Almacén & Compras | % entrega de materiales en tiempo y forma | 90 | Al finalizar un proyecto |
| 11 | Transporte y Almacén | % recuperación de stock mínimo al término de obra | 95 | Al finalizar un proyecto |

**Dos objetivos** por encima de los indicadores: Satisfacción de clientes (90,
anual) y **Nivel de Servicio** (90, anual).

> Nota del formato: «El **Nivel de Servicio** se obtiene promediando los
> indicadores **2, 4, 8 y 10**.»

⚠️ **Un objetivo es un indicador COMPUESTO de otros indicadores, por lista
explícita.** Hoy `indicadores` no puede expresarlo. Es una tabla
`objetivo_indicadores` (N:N) y el valor **se calcula, no se captura**.

⚠️ **Tres cosas más que rompen el modelo actual:**
1. **`periodo` no es mensual/trimestral/anual.** «Al finalizar un proyecto» es un
   **evento**, no un calendario. `mediciones (indicador_id, periodo)` con índice
   único —§6.1— asume periodos de calendario: dos proyectos cerrados el mismo mes
   chocarían. Hace falta `mediciones.proyecto_id` en la clave.
2. **Un indicador puede tener dos procesos responsables** («Contabilidad &
   Operación», «Compras & Operación»). Hoy es `proceso_id` singular.
3. **El indicador 9 mide la Fase 04 desde la Fase 02**: «% de acciones correctivas
   cerradas», meta 95. La app **calcula ese número sola** en cuanto exista
   `acciones`. Es el primer indicador que SummitApp puede llenar sin captura.

---

## 4 · F-SG-15 · Desempeño de los Procesos del SGC

La hoja de captura mensual: `No. · PROCESO · INDICADOR · RESPONSABLE · ENE…DIC ·
REAL · META`, más una segunda hoja **Gráficas** (vacía en la plantilla) y un
bloque de **Objetivo** al pie con Nivel de Servicio y Satisfacción del cliente.

⚠️ **Los meses son doce columnas y el resultado es una sola fila por indicador.**
Es exactamente la parrilla del `F-SG-09` y del `F-SG-16`: **`jsonb`, no tabla
hija** (ver `D06`). Pero aquí ya existe `mediciones` como tabla — y está bien,
porque una medición lleva análisis, evidencia y acción colgando, y un mes del
programa anual no lleva nada. **No unificarlas.**

⚠️ **La plantilla trae los meses desordenados** (`ENE FEB MZO ABR ABR MAY JUN JUL
MAY JUN JUL AGO SEP OCT NOV DIC` — dieciséis encabezados con repeticiones). Es un
error del `.xlsx` del cliente, no una regla. **Si se imprime, se imprime corregido
y se le avisa a Summit.**

---

## 5 · Lo que falta fuera del alcance entregado

§5.2 remite a **`P-CO-02` Procedimiento para Selección y Evaluación de
Proveedores** para la mejora del desempeño de proveedores externos. **No llegó**,
y es el respaldo de `fuente_nc = 'evaluacion_proveedor'` y del indicador 6.
