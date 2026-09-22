# SGI-P-COM-02 + SGI-F-COM-18 · Obligaciones de Compliance — `F05·B1` sin NOMs

> Quinta tanda, 22 sep 2026. Procedimiento de Gestión de Obligaciones, Riesgos y
> Controles de Compliance, y su matriz (emisión **10-Ago-2026**, sección
> Privacidad, **18 obligaciones cargadas**).
>
> ⚠️ **Es la generalización de `F05·B1`**: lo que la Fase 05 llamaba «matriz de
> aplicabilidad NOM» es un caso particular de **matriz de obligaciones**.

---

## 1 · La corrección de fondo al plan

`docs/02` modeló `F05·B1` como `noms` + `nom_requisitos` + `org_noms`: el
universo es **la NOM**. Pero un despacho jurídico no tiene NOMs de agentes
físicos; tiene la **LFPDPPP**, el **CFF**, la **LFPIORPI**, la deontología
profesional y **cláusulas de contratos con clientes**. Y una constructora tiene
las dos cosas.

> «Todas las obligaciones **legales, regulatorias, contractuales y voluntarias**
> aplicables al despacho (laborales, fiscales, protección de datos,
> anticorrupción, prevención de lavado, deontología profesional)» — §2 Alcance.

✅ **La tabla que hay que construir es `obligaciones_compliance`, y `noms` es su
catálogo de fuentes, no su eje.** La NOM-002-STPS y el art. 28 de la LFPDPPP son
el mismo tipo de fila: *algo que hay que cumplir, con una fuente, un responsable,
una evidencia y una cadencia*.

⚠️ **Y no choca con `obligaciones` de `F05·B2`, que es otra cosa**: `B2` son las
cosas **que caducan** (un dictamen, un extintor, un examen médico) y `B1` son las
**obligaciones permanentes** que se verifican con una cadencia. Una obligación
genera cero, una o muchas cosas que vencen.

## 2 · Las nueve columnas de `SGI-F-COM-18`

```
No. | Obligación | Fuente (norma y artículo) | Tipo | Aplicación en el despacho |
Responsable (owner) | Control / documento del SGI | Evidencia de cumplimiento |
Frecuencia de verificación
```

| Columna | Nota para el modelo |
|---|---|
| `Obligación` | El texto, redactado como deber: «Contar con…», «Atender…», «Notificar…» |
| **`Fuente`** | ⚠️ **No es una clave, es una cita**: «LFPDPPP (DOF 20-Mar-2025), arts. 3 fracc. I, 26 y 27». Texto libre + FK opcional a `normas` |
| **`Tipo`** | `Legal` · `Norma` · `Contractual` · `Voluntaria`, **y se combinan**: «Legal / Norma», «Legal / Contractual». Es un arreglo, no un CHECK de un valor |
| `Aplicación` | Por qué y dónde aplica **en esta organización** — es la `justificacion` obligatoria de `org_noms`, y aquí aplica en un solo sentido porque lo que no aplica no entra |
| `Responsable (owner)` | Por **puesto**, no por persona: «Oficial de Cumplimiento», «RRHH / Oficial de Cumplimiento» |
| **`Control / documento del SGI`** | ⚠️ **FK a `documentos`**, y a una sección: «SGI-P-COM-10 §5.2; SGI-F-COM-31». Es lo que engancha el cumplimiento con el control documental de la Fase 02 |
| `Evidencia de cumplimiento` | Qué prueba que se cumple. Con `adjuntos` detrás |
| **`Frecuencia de verificación`** | `Anual` · `Semestral` · `Trimestral` · **`Por evento`** · **`Única vez y ante cambios`** · combinada: «Por evento; revisión trimestral» |

Hoja `Resumen`: **`Cumplida` · `En proceso` · `Pendiente`** — tres estados, con
su comentario («Con evidencia disponible» / «Control diseñado, evidencia parcial»
/ «Documentado, sin operar»).

⚠️ **`Frecuencia de verificación` NO es `vence_en`.** Es una cadencia, como las
categorías de `P-SG-08`. La obligación no vence: lo que vence es **la próxima
verificación**, y eso sí es una fecha calculada que el cron puede barrer. Mismo
patrón que `documentos.proxima_revision` del hueco 24.

## 3 · ⚠️ Plazos en DÍAS HÁBILES, y ahora son obligatorios

La obligación 6: *«comunicar la determinación en **20 días hábiles** y ejecutarla
en **15 días hábiles**»*. El `SGI-F-COM-32` añade *«dentro de **5 días hábiles**»*
para pedir información adicional.

✅ **`E03` ya decidió días hábiles** (2 sep 2026) y sembró
`config_firma.plazos_default` con `{"unidad":"habiles", …}`.
⚠️ **Pero `CLAUDE.md` sigue diciendo: «Falta el calculador de días hábiles con
festivos de México — nadie lo lee todavía».** Con esto ya lo lee alguien: un
plazo ARCO mal contado es un incumplimiento ante autoridad, no una molestia de
interfaz. **Sube de prioridad y deja de ser interruptor muerto (regla 11).**

## 4 · La gestión de cambios normativos — un subsistema entero

§5.3 del procedimiento, y es lo que ninguna fase modela:

- **Monitoreo continuo** de DOF, SCJN, STPS, INAI y SAT.
- **Evaluación de impacto** del cambio sobre obligaciones, riesgos, controles y
  documentos del SGI **en un máximo de 30 días naturales**.
- Actualización de la matriz y de los documentos afectados, **con comunicación a
  las áreas**.
- Registro del cambio y de sus acciones en la propia matriz.

✅ Hay un ejemplo real en la entrega: `MEMO-SGI-2026-01 Actualización Normativa en
Privacidad`, por la **LFPDPPP publicada el 20-Mar-2025**. Y la propia matriz lo
recoge como obligación 17, con frecuencia trimestral.

⚠️ **Es un tercer disparador para `cambios_sgc`**, que hoy tiene tres
(`F-SG-24`: acción correctiva, solicitud de cambio de documento, sugerencia de
cliente). **El cuarto es el cambio normativo**, y es el único que nace fuera de
la organización. **Hueco 31.**

## 5 · El modelo de gobierno: tres líneas de defensa

| Línea | Quién | Qué hace |
|---|---|---|
| **1ª** | Gerencias de proceso | Identifican y gestionan sus riesgos; **operan los controles** |
| **2ª** | Oficial de Cumplimiento | Define metodología, consolida matrices, monitorea KRIs |
| **3ª** | Auditoría interna del SGI | Evalúa con independencia la efectividad de los controles |

⚠️ **La tercera línea es nuestra Fase 03.** «Evaluar de forma independiente la
efectividad de los controles internos (conforme a `SGI-P-CA-03`)» — una auditoría
interna que **verifica controles**, no sólo cláusulas. Eso es `auditoria_items`
apuntando a un control además de a una cláusula.

## 6 · Matriz de controles internos — la tercera tabla

§5.7. Cada control con: identificador, **riesgo(s) que mitiga** (N:N), tipo
(`preventivo` · `detectivo` · `correctivo`), descripción, responsable de
ejecución, frecuencia, evidencia que genera.

- **Controles clave** = los que mitigan riesgos Altos o Críticos → **se prueban al
  menos una vez al año**.
- Efectividad `Alta/Media/Baja` según pruebas, auditorías e incidentes.
- **Efectividad Baja → plan de rediseño** obligatorio.

✅ Es la columna `Control existente / propuesto` + `Efectividad` de
[`SGI-F-CA-23`](SGI-F-CA-23_matriz_de_riesgos.md), normalizada. Y cierra el
circuito: obligación → riesgo → control → prueba del control → hallazgo →
acción.

## 7 · KRI — indicadores de alerta temprana

> «KRI: indicador de **alerta temprana que anticipa** el aumento de exposición a
> un riesgo.»

⚠️ **No es un `indicador` más.** Un indicador mide lo que pasó; un KRI tiene
**umbral** y dispara cuando se cruza («los KRIs fuera de umbral» van al Comité).
En el modelo, `indicadores` necesita `es_kri` + `umbral_alerta`, y el cruce del
umbral es una categoría de aviso. **Hueco 32.**

## 8 · Qué queda para el plan

| Bloque | Qué entra |
|---|---|
| **`F05·B1`** | `obligaciones_compliance` con las nueve columnas; `noms`/`nom_requisitos` como catálogo de fuentes; el veredicto de tres/cinco estados |
| **`F05·B2`** | La cadencia de verificación con su próxima fecha; el cron que barre; los avisos 90/30/7 |
| **F02** (riesgos) | Inherente/residual, control, efectividad, 19 tipos, KRI |
| **F04** | `acciones.origen = 'riesgo'`; el cuarto disparador de `cambios_sgc` |
| **Sin fase** | Matriz de controles internos y prueba de controles |
