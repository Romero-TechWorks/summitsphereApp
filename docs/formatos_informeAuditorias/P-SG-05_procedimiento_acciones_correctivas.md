# P-SG-05 · Procedimiento para Acciones Correctivas

> Transcripción del `.docx` que entregó Summit en la **cuarta tanda** (7 sep 2026).
> Versión vigente 0, emitido y actualizado el 10-Feb-2025. Elaboró Coordinador de
> SGC; revisó y aprobó Dirección.
>
> ⚠️ **ES EL DOCUMENTO QUE DESTRABA LA FASE 04.** `F04·B1` estaba detenido desde
> el 2 sep 2026 esperando exactamente este archivo — decisión del dueño ese mismo
> día. Ya llegó y **gobierna todo el ciclo de `acciones`**.

---

## 1 · Qué gobierna, y dónde encaja

Cubre el ciclo entero **desde que se detecta una No Conformidad hasta que se
verifica la eficacia de las acciones y se cierra**. Es el procedimiento al que
apuntan, por referencia explícita, otros cuatro del cliente:

| Quien lo invoca | Para qué |
|---|---|
| `P-SG-02` §5.2 | Toda salida no conforme **es** una NC y se trata por aquí |
| `P-SG-06` §5.1 y §5.2 | Un indicador bajo meta se trata por aquí |
| `P-SG-07` §5.5.1 | Una queja procedente se trata por aquí |
| `P-SG-03` | Las NC de auditoría interna caen aquí al salir del informe |

**Cuatro de los once valores de `hallazgos.fuente_nc` quedan confirmados por
referencia cruzada, no por inferencia nuestra.**

---

## 2 · Las nueve etapas donde nace una NC  (§5.1)

El procedimiento **tabula** de dónde sale una no conformidad. Es la tabla que hay
que poner contra el CHECK de `fuente_nc`:

| # | Etapa | Descripción | Responsable de identificación |
|---|---|---|---|
| 1 | Servicios entregados a clientes | Servicios fuera de los requisitos del cliente detectados **posterior a su entrega** | Personal Operativo / Coordinador SGC |
| 2 | Monitoreo y Medición | Incumplimiento a objetivos de calidad e indicadores de procesos | Responsables de proceso / Coordinador SGC |
| 3 | Información Documentada | Procedimientos o registros no actualizados o que faltan | Todo el personal |
| 4 | Revisión por la Dirección | Incumplimientos detectados en la Revisión por la Dirección | Coordinador SGC |
| 5 | Procesos | Procesos que no se ejecutan según las especificaciones | Todo el personal |
| 6 | Satisfacción de Clientes | Nivel de satisfacción **inferior al objetivo** | Coordinador SGC |
| 7 | Capacitación | Personal sin la capacitación necesaria para sus funciones | Coordinador SGC |
| 8 | Incumplimiento legal | Desviaciones en parámetros o requisitos **de la legislación aplicable** | Todo el personal |
| 9 | Mejora Continua | Acciones que no se implementan o **no son efectivas** para problemas recurrentes | Coordinador SGC |

⚠️ **Sólo cinco de las nueve caen limpio en el CHECK que escribimos.** Ver §8.

**Y todo el personal puede identificar una NC**, comunicándola por su jefe
inmediato al Coordinador del SGC. No es una facultad del auditor.

---

## 3 · El folio: `AC-FA-01-25`  (§5.2)

⚠️ **Esto contradice `NC-2026-007`, que es lo que genera hoy
`sellar_folio_hallazgo()` — migración `20260902120000`, aplicada el 7 sep 2026.**

El Coordinador de SGC asigna el consecutivo, **reiniciado cada año**, con cuatro
piezas separadas por guiones:

```
   AC   -   FA   -   01   -   25
   │        │        │        └─ año en curso (dos dígitos)
   │        │        └─ consecutivo de la NC **POR PROCESO**
   │        └─ dos letras del **proceso** donde se generó
   └─ dos letras del **tipo de acción a tomar**:  AC = ACCIÓN CORRECTIVA
```

> «AC-FA-01-25; es la acción correctiva número uno del proceso de facturación
> del año 2025.»

Las dos letras del proceso son las mismas de la codificación documental de
`P-SG-01` §5.2: `DI` Dirección · `SG` SGC · `CO` Compras · `OP` Operación ·
`FA` Facturación · `CN` Contabilidad · `MT` Mantenimiento · `RH` Recursos
Humanos · `AM` Transporte y Almacén · `AD` Administración · `DS` Diseño.

**Tres diferencias con lo que tenemos escrito, y las tres importan:**

1. **El consecutivo se cuenta por proceso, no por organización.** `AC-FA-01-25` y
   `AC-OP-01-25` conviven en el mismo año.
2. **Lleva el tipo de acción en el prefijo**, y `F-SG-17` confirma que hay al
   menos dos (columna `PREV / CORR`): `AC` correctiva y, por simetría, una
   preventiva.
3. **El folio es de la ACCIÓN, no del hallazgo.** El F-SG-06 tiene su propio
   campo «No.:» junto a «No Conformidad Observada». En `F-SG-17` son dos columnas
   distintas: `NO.` y `NC`.

⚠️ **Lo que esto NO invalida:** el folio de la firma (`AUD-2026-014/H-03`) sigue
siendo nuestro y sigue mandando — misma lógica del hueco 2. Lo que hay que
decidir es si `NC-2026-007` se conserva, se sustituye por la serie del cliente, o
conviven (nuestro folio para el expediente, el del cliente en un campo aparte,
como se hizo con `auditorias.titulo`). **Es una decisión del dueño.**

⚠️ **Y tiene fecha de caducidad.** `B0` se aplicó **sin pantalla**, a propósito, así
que hoy **ninguna fila usa la rama `NC-`**: no hay forma de levantar una NC sin
auditoría. En cuanto `B1` la tenga, empiezan a existir folios emitidos, y un folio
emitido **no se recalcula** — la propia migración lo dice de los de auditoría.
Comprobación: `select count(*) from hallazgos where auditoria_id is null;`

---

## 4 · El ciclo, paso a paso

### 4.1 · Registro  (§5.2)
Se documenta en el **`F-SG-06` Reporte de No Conformidad**. Cuando la NC viene de
una auditoría, **la descripción se toma literal del Reporte Final** — no se
reescribe. Eso es exactamente lo que ya hace `hallazgos.descripcion` → informe.

### 4.2 · Acciones inmediatas  (§5.3)
El responsable de la NC + el responsable del proceso y/o el Coordinador SGC
documentan **la corrección** en la sección «Acción inmediata» del F-SG-06:
controlar y corregir **mientras** se determinan las acciones correctivas.

⚠️ **Es un renglón distinto de la acción correctiva, no un estado de la misma.**
Justifica `acciones.tipo = 'correccion'` como valor separado — ya está en el plan.

### 4.3 · Análisis de causa  (§5.4)
- Plazo: **no mayor a 15 días hábiles**. ✅ Confirma `E03` en lo que toca al
  análisis. ⚠️ **El procedimiento no dice 15/30/60/90 por tipo de hallazgo** — ese
  escalonado sigue siendo criterio nuestro, no del cliente. Ver §8.
- Se conforma un **equipo de trabajo**: responsable(s) de proceso, personal
  involucrado en la NC, y quien pueda aportar a la investigación.
  → `F-SG-07` tiene el campo «Participantes». **Es una lista, no una persona.**
- Formato: **`F-SG-07` Análisis de Causa Raíz 5 ¿Por qué?**

### 4.4 · Acciones correctivas  (§5.5)
Se registran en la sección «Acciones» del F-SG-06 con tres campos por renglón:

| Campo del formato | Columna |
|---|---|
| Responsable | `acciones.responsable_id` / `responsable_contacto_id` |
| Fecha Compromiso (fecha límite de cumplimiento) | `acciones.fecha_compromiso` |
| Evidencia de la acción realizada y/o implantada | `adjuntos` con `accion_id` |

**Si hacen falta recursos**, responsable de proceso + Coordinador SGC lo presentan
a **Dirección**, que aprueba y asigna. → Es la tercera pregunta de impacto que ya
trae el `F-SG-07` («¿Se requieren de Recursos?»).

**Durante la determinación se debe considerar** — las dos preguntas del F-SG-06:
- ¿Es necesario hacer **cambios al SGC**? → dispara el **`F-SG-24`**
- ¿Es necesario **actualizar los riesgos y oportunidades**? → dispara el
  **`F-SG-23`** vía `P-SG-04`

⚠️ **Y una tercera vía que no conocíamos:** cuando las acciones requieran
«planeación de mayor complejidad para su entendimiento y cierre efectivo» se
aplica el **`F-SG-16` Plan de Mejora**. Es **condicional**, no siempre.

### 4.5 · Seguimiento  (§5.6)
- El Coordinador SGC verifica y documenta avances **en el `F-SG-17`**, no en el
  F-SG-06.
- ⚠️ **Quién da seguimiento depende del origen:** si la NC viene de **auditoría
  interna**, el seguimiento lo hace **el Auditor Interno**, que retroalimenta al
  Coordinador SGC. En los demás casos, el Coordinador SGC. Se repite idéntico en
  §5.7.
  → Hay **dos responsables de seguimiento distintos según `fuente_nc`**. No es un
  solo `responsable_seguimiento_id` fijo.
- **Demoras:** el responsable del proceso **justifica ante el Coordinador SGC** y
  **propone nueva fecha**. Si hay **reincidencia** o **involucra queja de
  cliente**, la justificación **escala a Dirección**.
  → Reprogramar `fecha_compromiso` **exige un motivo** y cambia de interlocutor
  según dos condiciones. Es un renglón de historial, no un `update` silencioso.

### 4.6 · Resultados y verificación  (§5.7)
- Concluidas las acciones, el Coordinador SGC revisa resultado y seguimiento y
  **después establece una NUEVA fecha de verificación de la efectividad**.
  → **Son dos fechas, no una**: la de conclusión de la acción y la de
  verificación de eficacia, que se fija *después*.
- El resultado se registra en «resultado de acciones correctivas» del F-SG-06.
- ⚠️ **Si el incumplimiento se repite, las acciones NO fueron efectivas y se
  aplica un F-SG-06 NUEVO.** No se reabre el anterior.
  → Hace falta un enlace **NC → NC por reincidencia**, y es la etapa 9 de §5.1.

### 4.7 · Cierre  (§5.8)
**Firma del Coordinador del SGC** en el F-SG-06, una vez revisada la correcta
aplicación de las acciones. El F-SG-06 añade dos campos que el procedimiento no
menciona: «**No Conformidad aceptada: Sí / No**» y «**¿Fue efectiva?**».

⚠️ **«No Conformidad aceptada»** es el auditado rechazando la NC. Hoy no existe en
`hallazgos`, y no es lo mismo que `anulado` (regla 13): anular es del auditor,
rechazar es del auditado.

---

## 5 · Mapeo campo por campo contra `acciones`

Lo que **ya está bien** en `docs/04_MODELO_DE_DATOS.md` § `acciones`:

| Columna planeada | Confirmada por |
|---|---|
| `tipo` (`correccion`·`accion_correctiva`·`preventiva`·`mejora`) | §5.3 corrección; §5.5 correctiva; `F-SG-17` col. `PREV/CORR`; `F-SG-16` mejora |
| `hallazgo_id` NULL | §5.5 vía F-SG-16, y `P-SG-07` §5.5.2 (sugerencia sin NC) |
| `fecha_compromiso` NOT NULL | §5.5, campo literal «Fecha Compromiso» |
| `causa_metodo` / `causa_analisis` / `causa_raiz` | §5.4 + `F-SG-07` |
| `eficacia_verificada_en` · `_por_id` · `_resultado` · `_evidencia` | §5.7 + F-SG-06 «¿Fue efectiva?» |
| CHECK: no cierra sin eficacia | §5.8 — el cierre es *después* de revisar la aplicación |

Lo que **falta** y sale de este procedimiento:

| Columna que hace falta | Por qué | Dónde |
|---|---|---|
| `proceso_id` | El folio del cliente cuenta **por proceso** y `F-SG-17` tiene columna `PROCESO` | §5.2 |
| `avance_pct` | `F-SG-17` col. `% DE AVANCE`, y el avance de la NC es el **promedio** de sus acciones | `F-SG-17` |
| `fecha_compromiso_original` + motivo de reprogramación | §5.6 exige justificar la demora y proponer nueva fecha | §5.6 |
| `requiere_recursos` + `recursos_detalle` | §5.5, y `F-SG-07` ya lo pregunta | §5.5 |
| `plan_mejora_id` (o `requiere_plan_mejora`) | §5.5, dispara el `F-SG-16` | §5.5 |
| `hallazgos.nc_origen_id` | §5.7, la NC por reincidencia es una NC nueva enlazada | §5.7 |
| `hallazgos.aceptada` | F-SG-06 «No Conformidad aceptada Sí/No» | F-SG-06 |
| `folio_cliente` | La serie `AC-FA-01-25` del cliente, junto a la nuestra | §5.2 |

---

## 6 · Lo que el procedimiento NO dice, y hay que decidir

1. **No define plazos por tipo de hallazgo.** Sólo los 15 días hábiles del
   análisis de causa. El 15/30/60/90 de `E03` es criterio de la firma: se queda,
   pero **como valor por defecto configurable**, no como regla del cliente.
2. **No define estados de la acción.** `F-SG-17` sólo tiene `ABIERTA` / `CERRADA`
   más un `% DE AVANCE`. Los cinco estados del plan (`abierta`, `en_proceso`,
   `por_verificar`, `cerrada`, `cancelada`) son nuestros y son más finos — se
   quedan, pero el reporte al cliente **tiene que colapsar a abierta/cerrada**.
3. **No hay diagrama de flujo.** §6 dice «Diagrama de flujo del proceso» y la
   página está vacía en el `.docx`. Igual que en `P-SG-02`, `P-SG-06`, `P-SG-07`.
4. **No dice qué pasa con una NC cuyo responsable se va.** Silencio.

---

## 7 · Referencias declaradas (§7)

`M-SG-01` Manual · `F-SG-06` Reporte de NC · `F-SG-17` Base de Datos de NC ·
`F-SG-07` Análisis de Causa Raíz · `F-SG-16` Plan de Mejora.

**Los cinco llegaron en esta tanda.** Es el primer procedimiento del cliente cuyo
árbol de referencias está completo en el repositorio.

---

## 8 · ⚠️ El hallazgo que hay que resolver ANTES de aplicar `E00`

`hallazgos_fuente_valida` tiene once valores. Puestos contra las nueve etapas de
§5.1:

| Etapa de P-SG-05 §5.1 | Valor de `fuente_nc` | ¿Cae? |
|---|---|---|
| 1 · Servicios entregados a clientes | `servicio_no_conforme` | ✅ |
| 2 · Monitoreo y Medición | `indicador` | ✅ |
| 3 · Información Documentada | — | ❌ cae en `otro` |
| 4 · Revisión por la Dirección | `revision_direccion` | ✅ |
| 5 · Procesos | — | ❌ cae en `otro` |
| 6 · Satisfacción de Clientes | `queja_cliente` **no es lo mismo** | ⚠️ una encuesta bajo meta no es una queja; es `F-SG-13` |
| 7 · Capacitación | — | ❌ cae en `otro` |
| 8 · **Incumplimiento legal** | — | ❌ cae en `otro`, **y es el núcleo de la Fase 05** |
| 9 · Mejora Continua (acción no efectiva) | — | ❌ es la **reincidencia** de §5.7 |

**Cinco de nueve limpio; cuatro etapas nombradas por el procedimiento del cliente
caen en `otro`.** Y `incumplimiento_legal` es la fuente que más va a pesar en
SummitApp: NOM STPS, SEMARNAT y Protección Civil son el servicio que más urgencia
genera (docs/02 · Fase 05).

⚠️ **`E00` ya está aplicada** (7 sep 2026), así que esto ya no cabe ahí. Pero
**`F04·B1` necesita su propia migración de todas formas** —`acciones`,
`planes_mejora`, `cambios_sgc`, `quejas`— y ampliar un CHECK es **aditivo**: no
rechaza ninguna fila que antes pasaba. **Metido ahí cuesta cero.** Olvidarlo sí
cuesta otra migración, y CLAUDE.md ya avisa que «los CHECK son listas cerradas a
propósito: abrir un valor nuevo obliga a pasar por una migración, y esa fricción
es deliberada».

**Propuesta** (decisión del dueño): añadir cuatro valores —
`incumplimiento_legal`, `informacion_documentada`, `capacitacion`,
`satisfaccion_cliente`— y una columna `nc_origen_id` para la reincidencia de §5.7.
`proceso` y `mejora_continua` **no** hacen falta como valores: el primero es
transversal a todas y el segundo es la reincidencia enlazada.
