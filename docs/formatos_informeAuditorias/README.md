# Catálogo documental del cliente — análisis y mapeo

> ⚠️ **La carpeta se llama `formatos_informeAuditorias` por historia, no por
> alcance.** Nació con los siete formatos de auditoría; desde la cuarta tanda
> (7 sep 2026) contiene **el sistema de gestión completo de GRUPO ATELIER** —
> 60 documentos que tocan las Fases 02 a 06. No se renombra porque `docs/02`,
> `docs/04`, `docs/09` y `CLAUDE.md` la citan por su ruta.

Summit entregó **68** archivos de trabajo, en cuatro tandas. La primera, el
30 ago 2026: el procedimiento que gobierna todo el ciclo y tres formatos. En sus
palabras:

> «Te adjunto los documentos de referencia relacionados con la planificación y
> ejecución de las auditorías, el procedimiento explica todo el ciclo de la
> actividad y también te adjunto los formatos que usamos para la planificación y
> la del reporte final. Todo esto lo diseñamos para una empresa, pero así se
> comporta para todos los sectores.»

La segunda, el **31 ago 2026**: tres de los cuatro documentos que la sección
«Faltan cuatro documentos» de [`P-SG-03`](P-SG-03_procedimiento.md) §8 pedía por
orden de utilidad. Llegaron **F-SG-07**, **F-SG-09** y **F-SG-03**.

La tercera, el **2 sep 2026**: **F-SG-05**, la ficha técnica de proceso, en un
`.pptx` de doce diapositivas. Es el primero que **no es un formato de auditoría**
—su modelo es el de la Fase 02— pero trae el catálogo documental completo del
cliente, y con él la lista de valores de `fuente_nc`, que es lo único que faltaba
para cerrar el hueco 6. Ver [su ficha](F-SG-05_ficha_tecnica_de_proceso.md) §5.

La cuarta, el **7 sep 2026**: **una carpeta con 60 archivos** — el SGC entero del
cliente. Trae los ocho procedimientos `P-SG-01`…`P-SG-08`, los tres de operación
`P-OP-01`…`P-OP-03`, los 26 formatos `F-SG-*`, los 21 `F-OP-*`, el manual
`M-SG-01`, la política, el alcance y el mapa de procesos.

✅ **Y trae `P-SG-05`, que es lo que destraba la Fase 04.** El bloque `F04·B1`
estaba detenido desde el 2 sep 2026 esperando exactamente ese archivo —decisión
del dueño ese mismo día—. Ficha en
[`P-SG-05_procedimiento_acciones_correctivas.md`](P-SG-05_procedimiento_acciones_correctivas.md).

⚠️ **Y trae una decisión que hay que tomar ANTES de aplicar `E00`**: el CHECK de
`fuente_nc` cubre cinco de las nueve etapas que `P-SG-05` §5.1 tabula, y el folio
real del cliente es `AC-FA-01-25`, no `NC-2026-007`. Ver §«Lo que la cuarta tanda
cambia» al final.

**Los `.docx` y `.xlsx` originales no se commitean.** Estos Markdown son su
sustituto fiel y completo: todo lo que hace falta para escribir el código está
transcrito aquí, incluido el diagrama de flujo. Si algún día hay que volver al
original, el dueño lo tiene.

| Archivo | Original | Qué es |
|---|---|---|
| [`P-SG-03_procedimiento.md`](P-SG-03_procedimiento.md) | `P-SG-03 …docx` | **El procedimiento.** Manda sobre los otros seis |
| [`F-SG-11_planeacion_y_agenda.md`](F-SG-11_planeacion_y_agenda.md) | `F-SG-11 …xlsx` | Planeación y agenda, con un ejemplo real lleno |
| [`F-SG-12_reporte_final.md`](F-SG-12_reporte_final.md) | `F-SG-12 …docx` | **El informe. Es F03·B5** |
| [`F-SG-06_reporte_no_conformidad.md`](F-SG-06_reporte_no_conformidad.md) | `F-SG-06 …docx` | Reporte de NC. Mitad Fase 03, mitad Fase 04 |
| [`F-SG-09_programa_anual.md`](F-SG-09_programa_anual.md) | `F-SG-09 …xlsx` | Programa anual. **Trae la regla de frecuencia, con fórmulas** |
| [`F-SG-07_analisis_causa_raiz.md`](F-SG-07_analisis_causa_raiz.md) | `F-SG-07 …docx` | 5 ¿Por qué? **Le da forma a `causa_analisis`. Es F04·B1** |
| [`F-SG-03_lista_de_asistencia.md`](F-SG-03_lista_de_asistencia.md) | `F-SG-03 …docx` | Lista de asistencia. **Puro imprimir, sin modelo** |
| [`F-SG-05_ficha_tecnica_de_proceso.md`](F-SG-05_ficha_tecnica_de_proceso.md) | `F-SG-05 …pptx` | Ficha técnica de proceso. **Fase 02**, y trae el catálogo documental del cliente |

### Cuarta tanda — 7 sep 2026

| Archivo | Cubre | Fase |
|---|---|---|
| [`P-SG-05_procedimiento_acciones_correctivas.md`](P-SG-05_procedimiento_acciones_correctivas.md) | `P-SG-05` | **F04 · el que gobierna la fase** |
| [`F-SG-17_base_de_datos_nc.md`](F-SG-17_base_de_datos_nc.md) | `F-SG-17` | **F04** · el tablero de seguimiento |
| [`F-SG-16_plan_de_mejora.md`](F-SG-16_plan_de_mejora.md) | `F-SG-16` | **F04** · plan anual de acciones |
| [`F-SG-24_gestion_de_cambios.md`](F-SG-24_gestion_de_cambios.md) | `F-SG-24` | **F04** (+F02) · cambios al SGC y a documentos |
| [`P-SG-02_servicio_no_conforme.md`](P-SG-02_servicio_no_conforme.md) | `P-SG-02` · `F-SG-14` | **F04** · fuente de NC |
| [`P-SG-07_satisfaccion_quejas_y_sugerencias.md`](P-SG-07_satisfaccion_quejas_y_sugerencias.md) | `P-SG-07` · `F-SG-08` · `F-SG-10` · `F-SG-13` | **F04** (quejas) + F06 (encuesta) |
| [`P-SG-08_comunicacion.md`](P-SG-08_comunicacion.md) | `P-SG-08` · `F-SG-25` | **F04·B3** · las categorías de notificación |
| [`P-SG-06_medicion_indicadores_y_mejora.md`](P-SG-06_medicion_indicadores_y_mejora.md) | `P-SG-06` · `F-SG-15` · `F-SG-19` | F02 · indicadores y objetivos |
| [`P-SG-04_riesgos_y_oportunidades.md`](P-SG-04_riesgos_y_oportunidades.md) | `P-SG-04` · `F-SG-21` · `F-SG-22` · `F-SG-23` · `F-OP-14` | F02 (riesgos) + **F05 (IPERC)** |
| [`P-SG-01_control_documental.md`](P-SG-01_control_documental.md) | `P-SG-01` · `F-SG-01` · `F-SG-02` | F02 · control documental |
| [`F-SG-18_revision_por_la_direccion.md`](F-SG-18_revision_por_la_direccion.md) | `F-SG-18` · `F-SG-20` | F06 · y **consume a todos los demás** |
| [`serie_OP_operacion.md`](serie_OP_operacion.md) | `P-OP-01/02/03` · `F-OP-01`…`F-OP-20` · `M-SG-01` · alcance | Fuera de alcance, **con dos excepciones** |

---

## Lo primero: estos formatos son de UN cliente, y la app sirve a muchos

Los siete se diseñaron para **GRUPO ATELIER**, contra **ISO 9001:2015**, con la
numeración documental de esa empresa (`P-SG-03`, `F-SG-11`) y su leyenda de
confidencialidad en el pie. Summit dice que «así se comporta para todos los
sectores», y es cierto para la *estructura* — no para el contenido. Tres
consecuencias que valen para todo lo que se escriba a partir de aquí:

1. **Nada de esto se codifica literal.** Ni «GRUPO ATELIER», ni «Sistema de
   Gestión de Calidad», ni «ISO 9001:2015». El informe habla de *la organización
   auditada* y de *las normas del alcance*, que salen de `auditoria_normas`.
   Estos formatos dicen «SGC» en todas partes porque ese cliente sólo tiene
   calidad; el nuestro puede tener ISO 9001 + 14001 + 45001 a la vez.
2. **El informe agrupa por norma cuando el alcance tiene más de una.** El
   original no lo contempla porque nunca lo necesitó.
3. **El pie de confidencialidad es de Summit, no del cliente.** El del original
   protege a Grupo Atelier de sus propios empleados; el nuestro protege el
   expediente que la firma le entrega a su cliente.

---

## Qué cubre lo que ya está construido, y qué no

### Ya cubierto — el modelo aguantó el contraste

`auditorias`, `auditoria_normas` · `_sitios` · `_procesos`, `auditoria_equipo`,
`auditoria_agenda`, `auditoria_items` y `hallazgos` cubren F-SG-11 y F-SG-12 casi
campo por campo. Tres aciertos que se confirman leyendo los originales:

- **`auditoria_agenda` en filas y no en un texto.** F-SG-11 es exactamente eso:
  trece renglones con hora, área, responsable y auditor, agrupados por día. El
  `cumplido` de cada renglón es lo que el informe llama «agenda cumplida».
- **`hallazgos.tipo = 'conformidad'`.** El informe tiene una sección
  **«Fortalezas del SGC»**, y sin ese tipo no habría de dónde sacarla. Estaba
  puesto por la razón correcta (§`catalogos.ts`) y resulta que el formato de la
  firma lo exige.
- **`usuarios.certificaciones`.** El comentario de la migración decía «se
  imprimen en el informe». F-SG-11 escribe «Auditor Líder Juan Manuel García Maya
  (JMGM)» y el perfil de auditor de P-SG-03 §7 exige constancia de ISO 9001 y de
  19011 para ser líder. Es lo mismo.

### Huecos reales

Están detallados en la ficha de cada formato. En resumen.

⚠️ **Cómo se citan.** El resto de la documentación —`CLAUDE.md`, `docs/02`,
`docs/04`— los llama **«hueco 6», «hueco 15»…** y ese número es la **primera
columna** de esta tabla. No hay otro sitio donde busquen: si vienes de una
referencia a un «hueco N», es este renglón N.

| # | Hueco | Dónde | Resolución |
|---|---|---|---|
| 1 | **`auditorias.objetivo` no existía** | F-SG-11 y F-SG-12 lo piden de primero | ✅ Columna añadida en `20260830120000_informe_de_auditoria.sql` (`D05`) |
| 2 | La clave del cliente `AI-01-25` vs nuestro `AUD-2026-001` | P-SG-03 §5.1 | ✅ El folio de la firma manda; la clave del cliente va en `titulo`. Sin cambio de esquema |
| 3 | `informe_emitido_en` no lo sellaba nadie | `auditorias` | ✅ `sellar_emision_informe()`, en la misma migración |
| 4 | **F-SG-03 Lista de Asistencia no llegó** | Apertura y cierre, exigidas por §6.1 y §6.3 | ✅ **Cerrado** (31 ago 2026): [ficha](F-SG-03_lista_de_asistencia.md) y construido en F03·B6d. Se imprime prellenado desde la pestaña Agenda |
| 5 | **F-SG-09 Programa Anual y su regla de frecuencia** | P-SG-03 §5.2 | ✅ **Cerrado** (31 ago 2026): [ficha](F-SG-09_programa_anual.md), `programa_procesos` en `20260831120000` y la parrilla en F03·B6b/B6c |
| 6 | `fuente_nc` y `puesto_responsable` | F-SG-06 | ⚠️ `puesto_responsable` **resuelto**: `contactos.puesto` y `auditoria_agenda.auditado` ya lo cubren (F-SG-07 §7, F-SG-03 §3). ✅ **`fuente_nc` CERRADO el 2 sep 2026** (F04·B0) y **aplicado el 7 sep 2026** (tarea `E00`): once valores derivados del catálogo documental del cliente ([F-SG-05 §5](F-SG-05_ficha_tecnica_de_proceso.md)), probado en Docker con 41 comprobaciones. ⚠️ **Once no bastan** — ver hueco 15 |
| 7 | ¿Actualizar análisis de riesgo? ¿Cambios al SGC? | F-SG-06 | ✅ **Confirmado por un segundo formato** (F-SG-07 §6), que además añade *¿se requieren recursos?*. Cuatro columnas en `acciones`, especificadas |
| 8 | Varios auditores por renglón de agenda | `auditoria_agenda.auditor_id` es uno | ✅ Resuelto al imprimir el F-SG-11 (B6e): si viene vacío se imprimen las iniciales del equipo entero. Sin tocar el esquema |
| 9 | **La identidad de la firma no estaba en ninguna clave de caché** | Apareció al escribir B5 | ✅ `src/lib/queries/firma.ts` y la undécima pieza de la precarga. Sin ella el informe salía **sin membrete**, delante del cliente |
| 10 | **`programa_auditorias.alcance` no existe** | F-SG-09 lo pide junto a criterios y objetivo | ✅ **Cerrado**: columna añadida en `20260831120000` (`D06`), **aplicada el 7 sep 2026**, y capturable en el formulario del programa |
| 11 | **«Responsabilidad y Autoridad»: puesto + competencia** | F-SG-05 | ⚠️ Sin modelo. Es el perfil de puesto, y enlaza con el `F-RH-03` del cliente. **Se decide con la Fase 05**, donde `dnc` y `asistentes` le dan uso el mismo día — antes sería un interruptor muerto (regla 11) |
| 12 | **«Recursos» del proceso** | F-SG-05 | ⚠️ Sin modelo. Una columna `recursos text` en `procesos`. Nada aguas abajo lo consulta: va con la Fase 02 el día que se imprima la ficha |
| 13 | **«Interacción» proceso↔proceso y proceso↔parte interesada** | F-SG-05 | ⚠️ Sin modelo, y **aplazado con motivo**: el original lo captura de forma asimétrica y mezclando puestos con procesos. Se **deriva** del grafo de entradas/salidas, no se captura dos veces |
| 14 | **`entradas`/`salidas` son listas de documentos, no párrafos** | F-SG-05 | ⚠️ Hoy son `text` y la mitad de sus renglones son códigos de documento. Es el grafo del SGC. **No urge**: el `text` imprime igual |
| 15 | **El CHECK de `fuente_nc` cubre 5 de las 9 etapas** | P-SG-05 §5.1 | ✅ **CERRADO** en `20260908120000` (F04·B1): quince valores, las nueve etapas cubiertas. Entraron `incumplimiento_legal` (núcleo de F05), `informacion_documentada`, `capacitacion` y `satisfaccion_cliente`. `E00` **ya está aplicada** (7 sep 2026): va en la migración de `F04·B1`, que hay que escribir igual — coste cero si entra ahí, otra migración si se olvida |
| 16 | **El folio del cliente es `AC-FA-01-25`, no `NC-2026-007`** | P-SG-05 §5.2 | ✅ **CERRADO** (8 sep 2026, decisión del dueño): **son cosas distintas** — el del cliente es de la ACCIÓN y el nuestro del hallazgo, así que conviven. `acciones.folio_cliente` lo compone la base desde `procesos.codigo`, por proceso y año. ⚠️ Requiere que el dueño llene `procesos.codigo` (tarea `E05`). Contexto original: Tipo + proceso + consecutivo **por proceso** + año, y es de la **acción**, no del hallazgo. `E00` ya está aplicada, pero **`B0` no trajo pantalla**: sin forma de levantar una NC sin auditoría, la rama `NC-` no la usa ninguna fila todavía. Sigue siendo barato **hasta que `F04·B1` tenga pantalla**. Decisión del dueño |
| 17 | **Una NC nace de otra NC por reincidencia** | P-SG-05 §5.7 | ✅ **CERRADO**: `hallazgos.nc_origen_id`, con CHECK de que no sea ella misma. `hallazgos.nc_origen_id`. Si las acciones no fueron efectivas se levanta un F-SG-06 **nuevo**, no se reabre el viejo |
| 18 | **`hallazgos.aceptada`** | F-SG-06 «No Conformidad aceptada Sí/No» | ✅ **CERRADO**: tres estados (NULL = no se ha preguntado) y motivo obligatorio al rechazar. El auditado puede **rechazar** la NC. No es `anulado` (regla 13): anular es del auditor, rechazar es del auditado |
| 19 | **`acciones` necesita `proceso_id`, `avance_pct` y `monitoreo`** | F-SG-17 cols. F, M, N | ✅ **CERRADO**, las tres. Sin `avance_pct` no hay promedio por NC ni tablero `acciones_semana` |
| 20 | **Reprogramar `fecha_compromiso` exige motivo y escala** | P-SG-05 §5.6 | ✅ **CERRADO en el esquema**: `sellar_accion()` exige un motivo NUEVO en cada demora y sella la fecha original; cada una queda en `audit_logs`. ⚠️ **La escalada a Dirección sigue abierta**: es aviso (F04·B3), no esquema. Justificación ante Coord. SGC; **ante Dirección** si hay reincidencia o queja de cliente. Es historial, no un `update` |
| 21 | **`proceso_etapas`** | P-SG-04 §5.1.1 · F-SG-23 · F-SG-14 · P-SG-05 §5.1 | ⚠️ Tres formatos piden «etapa del proceso». **Una tabla sirve a los tres.** Fase 02 |
| 22 | **El nivel de riesgo de proceso NO es un producto** | F-SG-23 · P-SG-04 §5.1.2.1 | ⚠️ Es un **lookup** asimétrico 1–9 (Alto×Bajo=4, Bajo×Alto=5). Columna generada con `CASE`. Fase 02 |
| 23 | **Cuatro escalas de riesgo distintas** | P-SG-04 | ⚠️ Proceso (A/M/B→1-9) · Contexto (1-4 ×→1-16) · Parte interesada (A/M/B directa) · IPERC ((A+B+C+D)×sev→4-36). Fases 02 y 05 |
| 24 | **`documentos` sin código, vigencia ni retención** | P-SG-01 §5.2, §5.5, §5.6 · F-SG-01 | ⚠️ `codigo` `A-BB-##`, `proxima_revision`, `tiempo_archivo`, `almacenamiento`, y **copias controladas** con su recuperación. Fase 02 |
| 25 | **Un objetivo es un indicador compuesto de otros** | F-SG-19 nota 1 | ⚠️ «Nivel de Servicio = promedio de los indicadores 2, 4, 8 y 10». Tabla N:N, valor calculado. Fase 02 |
| 26 | **`mediciones.periodo` asume calendario** | F-SG-19 col. PERIODO | ⚠️ Nueve de once indicadores miden **«al finalizar un proyecto»**. Dos proyectos cerrados el mismo mes chocarían contra el índice único (§6.1). Fase 02 |
| 27 | **Las categorías de aviso del plan no son las del cliente** | P-SG-08 §5.5 | ✅ **CERRADO** en `20260909120000` (F04·B3): trece valores en el CHECK, con las cuatro que faltaban y el «Estado de las NC» **bimestral**. El resumen diario se conserva como criterio de Summit, ya no como única cadencia. Contexto original: Faltan indicadores (mensual), queja recibida (por evento, **a Dirección**), satisfacción y documento publicado. Y el cliente no pide «resumen diario». **F04·B3** |
| 28 | **La plantilla de listas de verificación necesita una tercera clave** | F-OP-03…F-OP-13 | ⚠️ Hoy es por norma y por giro. Once listas del mismo giro y la misma norma, distintas **por actividad**. F03·B2, no urge |

**Los tres primeros se resolvieron al construir B5**, y el noveno apareció ahí
mismo (30 ago 2026). **La segunda tanda cerró el 7 y entregó los documentos del 4
y el 5** (31 ago 2026), dejó el 6 a medias y destapó el 10.

✅ **`F03·B6` los cerró el 31 ago 2026** (huecos 4, 5, 8 y 10). De los diez
primeros, el único que seguía abierto era el **6 a medias**: `fuente_nc`. **El
F-SG-05 lo especificó el 2 sep 2026** y es el primer trabajo de la Fase 04.

⚠️ **Los cuatro nuevos (11–14) los abre el F-SG-05 y ninguno es de la Fase 04.**
Tres son de la Fase 02 y uno de la 05. Se listan aquí para que no se
redescubran tarde, no para hacerlos ahora.

---

## Dónde cae cada formato, por fase

| Formato | Fase | Estado |
|---|---|---|
| **F-SG-11** Planeación y Agenda | F03·B1 ✅ + **B6e** ✅ | Se imprime desde la pestaña Agenda: se manda al cliente antes de la visita |
| **F-SG-12** Reporte Final | **F03·B5** ✅ | **Construido** el 30 ago 2026: la pestaña Informe. Especificación en su ficha |
| **F-SG-06** Reporte de NC | F03·B4 ✅ (mitad) + **F04·B0** ✅ + **F04·B1** | La mitad de arriba ya existe en `hallazgos`, y su **primer campo** —«Fuente de la NC»— desde F04·B0. La de abajo —causa raíz, acciones, cierre— es B1 |
| **F-SG-07** 5 ¿Por qué? | **F04·B1** | ✅ Llegó. [Ficha](F-SG-07_analisis_causa_raiz.md) — define `causa_analisis`, el bloque «cierre del ciclo» y las dos preguntas de impacto |
| **F-SG-09** Programa Anual | F03·B1 ✅ + **B6a·B6b·B6c** ✅ | [Ficha](F-SG-09_programa_anual.md). La parrilla vive en `?programa=<id>` y se imprime |
| **F-SG-17** Base de Datos de NC | F03·B4 ✅ + F04 | Es el tablero del lunes (`TableroHallazgos`) más el seguimiento de la Fase 04 |
| **F-SG-03** Lista de Asistencia | **F03·B6d** ✅ + F05 (capacitación) | [Ficha](F-SG-03_lista_de_asistencia.md) — cero esquema. Un botón por renglón de la agenda |
| **F-SG-05** Ficha Técnica de Proceso | **F02** (+ aporta a F04) | [Ficha](F-SG-05_ficha_tecnica_de_proceso.md). Cinco de sus nueve bloques ya existen; abre los huecos 11–14. **Lo que aporta a la Fase 04 es `fuente_nc`** |
| **F-SG-16** Plan de Mejora | F04 | ✅ **Llegó** (7 sep 2026). [Ficha](F-SG-16_plan_de_mejora.md). ⚠️ **No es «acciones con tipo mejora»**: es un contenedor con calendario anual P/R, la misma forma que el `F-SG-09` |
| **F-SG-24** Gestión de Cambios en SGC y Procesos | F04 (+F02) | ✅ **Llegó** (7 sep 2026). [Ficha](F-SG-24_gestion_de_cambios.md). ⚠️ **Tres disparadores, no uno**: acción correctiva, **solicitud de cambio de un documento** (`P-SG-01` §5.7) y sugerencia de cliente |
| Perfil de auditor (P-SG-03 §7) | F06·B3 | Alta de usuarios. Puede validar quién es elegible como `lider` |
| Plazo de 15 días hábiles | F04 (`E03`) | Va a `config_firma.plazos_default`, que ya existe como columna. ⚠️ **`P-SG-05` §5.4 los confirma sólo para el análisis de causa**; el 15/30/60/90 por tipo de hallazgo es criterio de Summit, no del cliente |
| **P-SG-05** Procedimiento para Acciones Correctivas | **F04** | ✅ **LLEGÓ** (7 sep 2026) y **destraba `F04·B1`**. [Ficha](P-SG-05_procedimiento_acciones_correctivas.md) |
| **F-SG-17** Base de Datos de NC | F03·B4 ✅ + **F04** | ✅ **Llegó**. [Ficha](F-SG-17_base_de_datos_nc.md). Aporta `proceso`, `% de avance` y `cliente INT/EXT` |
| **P-SG-02** Servicio No Conforme + **F-SG-14** | F04 | ✅ **Llegó**. [Ficha](P-SG-02_servicio_no_conforme.md). «Toda salida no conforme **es** una NC» |
| **P-SG-07** Satisfacción + **F-SG-08/10/13** | F04 (quejas) + F06 (encuesta) | ✅ **Llegó**. [Ficha](P-SG-07_satisfaccion_quejas_y_sugerencias.md). Dos series de folio nuevas |
| **P-SG-08** Comunicación | **F04·B3** | ✅ **Llegó**. [Ficha](P-SG-08_comunicacion.md). **Es la especificación de las categorías de aviso** |
| **P-SG-06** Medición + **F-SG-15/19** | F02 | ✅ **Llegó**. [Ficha](P-SG-06_medicion_indicadores_y_mejora.md). Objetivos compuestos y periodo por evento |
| **P-SG-04** Riesgos + **F-SG-21/22/23** + **F-OP-14** | F02 + **F05** | ✅ **Llegó**. [Ficha](P-SG-04_riesgos_y_oportunidades.md). **Cuatro escalas distintas** y la Matriz IPERC completa |
| **P-SG-01** Control Documental + **F-SG-01/02** | F02 | ✅ **Llegó**. [Ficha](P-SG-01_control_documental.md). Codificación, vigencia, retención y copias controladas |
| **F-SG-18** Revisión por la Dirección + **F-SG-20** | F06 | ✅ **Llegó**. [Ficha](F-SG-18_revision_por_la_direccion.md). **Doce de sus dieciséis entradas ya salen de la app** |
| Serie **`OP`** (23 documentos) | — | ✅ **Llegó**. [Ficha](serie_OP_operacion.md). **Fuera de alcance salvo la Matriz IPERC** y lo que valida de F03·B2 |
| **`P-CO-02`** Selección y Evaluación de Proveedores | F04 | ❌ **No ha llegado.** Respalda `fuente_nc = 'evaluacion_proveedor'`, el indicador 6 y la entrada 4g del `F-SG-18` |
| **`P-RH-01`** + **`F-RH-03/04`** Recursos Humanos | **F05** | ❌ **No han llegado.** Son el hueco 11 y el respaldo de `dnc`, `sesiones` y `asistentes` |

---

## Las dos tareas del dueño que esto cierra

**`D01` — Entregar el formato de informe de auditoría.** ✅ Llegó: es F-SG-12, y
está transcrito con su mapeo campo por campo. B5 se destraba.

**`D02` — Definir los criterios de clasificación.** ✅ Llegó, y en mejor forma de
la que se pidió: P-SG-03 §3 define **NC mayor**, **NC menor** y **Observación**
por escrito y con la frontera explícita. Eso reemplaza el texto de arranque de
`CRITERIO_HALLAZGO` en `src/lib/auditorias/catalogos.ts` — ver la §3 de la ficha
del procedimiento, que ya lo trae redactado para el tamaño de un campo de ayuda.

⚠️ Con un matiz que hay que decir: el procedimiento **no define
`oportunidad_mejora` ni `conformidad`**, porque ese cliente no los usa. Nuestro
catálogo tiene cinco tipos y el informe necesita los cinco —«Fortalezas del SGC»
sale de `conformidad`—. Los tres que la firma definió se reemplazan con su texto;
los otros dos se quedan con el de arranque hasta que el dueño diga otra cosa.

---

## La segunda tanda — qué cambió el 31 ago 2026

Tres documentos, y **sólo uno es de la Fase 04**. Conviene decirlo claro porque es
lo que decide en qué orden se trabaja:

- **F-SG-07 → F04·B1, de lleno.** Es el que destraba la fase: convierte «5 porqués
  guardados estructurados» —una intención sin forma— en un jsonb con su contrato,
  más dos booleanos de cierre de ciclo y cuatro columnas de impacto.
- **F-SG-09 → Fase 03.** `programa_auditorias` está cerrado desde F03·B1 y le falta
  el renglón por proceso. Es trabajo de auditorías, no de acciones.
- **F-SG-03 → Fase 03 y Fase 05.** Es la hoja de firmas de la reunión de apertura,
  y la misma hoja sirve para una sesión de capacitación.

### La decisión que la hoja de cálculo zanjó

⚠️ **P-SG-03 §5.2 y el archivo F-SG-09 se contradicen** sobre la regla de
frecuencia: el texto dice que `valor × NC` son las auditorías, y la hoja dice que
son *puntos*, con las auditorías saliendo de un umbral en 5. Con 4 NC en un proceso
de servicio, el texto pide 8 auditorías al año y la hoja pide 2.

**Manda la hoja** (decisión del dueño, 31 ago 2026): es el artefacto que la firma
usa de verdad, y el texto del procedimiento está mal redactado. El detalle y las
fórmulas literales, en [F-SG-09 §3.1](F-SG-09_programa_anual.md).

Vale como precedente para lo que venga: **cuando un formato de trabajo y la prosa
del procedimiento discrepen, gana el formato.** El papel que se llena todos los
días está probado; el párrafo que lo describe se escribió una vez.

---

## La tercera tanda — qué cambió el 2 sep 2026

Un solo documento, **F-SG-05 Ficha Técnica de Proceso**, y llegó en la carpeta de
la Fase 04. Conviene decir lo mismo que se dijo de la segunda, porque otra vez
decide en qué orden se trabaja:

- **Su modelo es de la Fase 02, no de la 04.** Es el mapa de procesos del
  cliente: `procesos`, `riesgos`, `indicadores` y `documentos.proceso_id`. Cinco
  de sus nueve bloques ya están cubiertos, tres de ellos por tablas enteras. **El
  modelo aguantó un formato que no había visto.**
- **Lo que sí destraba la Fase 04 es `fuente_nc`.** El hueco 6 llevaba abierto
  desde el 30 ago no porque faltara decidir el esquema, sino porque no se sabía
  **qué valores lleva la lista sin inventarlos**. El catálogo documental del
  cliente los da: nueve de los diez valores propuestos tienen un formato con
  nombre y número detrás.
- **Y confirma que faltan tres documentos de la Fase 04, no uno.** Además del
  `P-SG-05`, el cliente tiene **`F-SG-16` Plan de Mejora** y **`F-SG-24` Gestión
  de Cambios en SGC y Procesos**. El segundo importa: es el destino de la segunda
  pregunta de impacto del `F-SG-06`, así que `cambio_sgc = true` no es una casilla
  informativa — **dispara otro documento**.

### Lo que este documento enseña sobre los formatos de la firma

⚠️ **Tiene seis erratas** (§8 de su ficha): una diapositiva copiada a la que no le
cambiaron el bloque de salidas, códigos mal escritos, tres procesos sin indicador
y un bloque de «Interacción» que mezcla puestos con procesos y no es simétrico.

El precedente del `F-SG-09` sigue en pie —**cuando el formato y la prosa del
procedimiento discrepen, gana el formato**— pero éste le pone el límite: **el
formato tampoco es infalible.** Cuando dos fichas del mismo formato se
contradicen entre sí, se pregunta. Y sobre todo: **no se digitaliza un bloque cuya
captura manual garantiza el error** — que es exactamente por qué la «Interacción»
se aplaza y se deriva del grafo de entradas y salidas en vez de capturarse.

---

## La cuarta tanda — qué cambió el 7 sep 2026

**60 archivos de golpe: el sistema de gestión completo del cliente.** Es la tanda
que más cambia el plan, y no por volumen sino por tres cosas concretas.

### 1 · ✅ Llegó `P-SG-05` y la Fase 04 se destraba

Era el único documento que faltaba de los ocho procedimientos, y el que gobierna
la fase entera. `F04·B1` estaba detenido por decisión del dueño desde el 2 sep.
**Se puede empezar.**

Lo que trae que no se sabía, en [su ficha](P-SG-05_procedimiento_acciones_correctivas.md):
la tabla de nueve etapas donde nace una NC, el folio `AC-FA-01-25`, la corrección
inmediata como acción propia con su fecha, los 15 días hábiles del análisis de
causa, el equipo de trabajo como **lista** de participantes, el seguimiento a
cargo del **Auditor Interno** cuando la NC viene de auditoría, la justificación
obligatoria de una demora —que **escala a Dirección** si hay reincidencia o queja
de cliente—, la **segunda fecha** de verificación de eficacia fijada *después* de
concluir las acciones, y la NC nueva por reincidencia cuando las acciones no
fueron efectivas.

Y llegaron sus cinco referencias completas —`F-SG-06`, `F-SG-07`, `F-SG-16`,
`F-SG-17` y el manual—. **Es el primer procedimiento del cliente cuyo árbol de
referencias está entero en el repositorio.**

### 2 · ⚠️ Dos decisiones, y `E00` ya no las cubre

**Las quince migraciones están aplicadas** (7 sep 2026, `local = remote` en
`npx supabase migration list --linked`), `20260902120000` incluida. Así que estas
dos ya **no** caben en `E00`: van en la migración de `F04·B1`, que hay que
escribir de todas formas para `acciones`, `planes_mejora`, `cambios_sgc` y
`quejas`. **Metidas ahí cuestan cero; olvidadas cuestan una migración aparte.**

**(a) El CHECK de `fuente_nc` cubre cinco de las nueve etapas de `P-SG-05` §5.1.**
Caen en `otro`: **incumplimiento legal** —el núcleo de la Fase 05—, información
documentada, capacitación y satisfacción del cliente (que no es lo mismo que una
queja: es el `F-SG-13` bajo meta). Y la novena, «acciones que no son efectivas»,
no es una fuente sino una **NC enlazada a otra NC**, que pide
`hallazgos.nc_origen_id`. Los cuatro valores son **aditivos**: ampliar un CHECK no
rechaza ninguna fila que antes pasaba.

**(b) El folio del cliente es `AC-FA-01-25`, no `NC-2026-007`.** Tipo de acción +
proceso + consecutivo **por proceso** + año, y es el folio de **la acción**, no
del hallazgo. Mismo caso que el hueco 2: nuestro folio manda para el expediente,
pero el del cliente tiene que caber en algún lado — como cupo la clave `AI-01-25`
en `auditorias.titulo`. **Decisión del dueño.**

⚠️ **Ésta tiene fecha de caducidad y la otra no.** `B0` se aplicó sin pantalla —a
propósito—, así que **hoy ninguna fila usa la rama `NC-`**: no hay forma de
levantar una NC sin auditoría. En cuanto `F04·B1` la tenga, empiezan a existir
folios emitidos, y un folio emitido **no se recalcula** (misma regla que
`sellar_folio_hallazgo()` ya aplica al mover un hallazgo de auditoría). Conviene
confirmarlo con `select count(*) from hallazgos where auditoria_id is null;`
antes de decidir.

### 3 · El SGC entero encaja mejor de lo esperado, y en más fases de las previstas

De los 60 documentos, **48 son del SGC** (series `SG` y los procedimientos) y
**23 son de operación de una constructora** (serie `OP`), que queda fuera de
alcance salvo la Matriz IPERC. Repartidos por fase:

| Fase | Qué aporta la tanda |
|---|---|
| **F02** documental | Codificación `A-BB-##`, vigencia y próxima revisión, tiempo de archivo, copias controladas, solicitud de cambio previa. [Ficha](P-SG-01_control_documental.md) |
| **F02** procesos | La columna **`etapa`**, que piden tres formatos distintos. [Ficha](P-SG-04_riesgos_y_oportunidades.md) §4 |
| **F02** riesgos | **Cuatro metodologías de evaluación distintas**, y sólo dos son productos. [Ficha](P-SG-04_riesgos_y_oportunidades.md) §1 |
| **F02** indicadores | Objetivos compuestos por lista, periodo **por evento** («al finalizar un proyecto»), dos procesos por indicador. [Ficha](P-SG-06_medicion_indicadores_y_mejora.md) §3 |
| **F03** listas | Once listas de oficio confirman `auditoria_items` y piden una **tercera clave de plantilla: por actividad**. [Ficha](serie_OP_operacion.md) §3.2 |
| **F04** acciones | Todo lo de §1, más `proceso_id`, `avance_pct`, monitoreo, recursos y plan de mejora |
| **F04** fuentes | Quejas con **dos series de folio** (`Q-XX-ZZ`, `S-XX-ZZ`), servicio no conforme, indicador, incidente con protocolo |
| **F04·B3** avisos | **La matriz de comunicación del cliente**, con doce renglones y sus cadencias reales. [Ficha](P-SG-08_comunicacion.md) |
| **F05** cumplimiento | **La Matriz IPERC completa**, con NIP = A+B+C+D, jerarquía de controles, riesgo residual y **requisito legal por peligro**. [Ficha](P-SG-04_riesgos_y_oportunidades.md) §6 |
| **F06** reportes | La Revisión por la Dirección, cuyas **doce de dieciséis entradas ya salen de consultas que existen**. [Ficha](F-SG-18_revision_por_la_direccion.md) |
| **F08** automatización | **Microsoft Teams está en el procedimiento del cliente** — justificación de negocio del módulo apagado |

### 4 · ✅ Lo que la tanda VALIDA de lo ya construido

- **`F02·B3`**: el `Alcance del SGC` trae dos exclusiones reales —7.1.5.2 y 8.3—
  **con su justificación**, que es el caso de prueba de la migración palabra por
  palabra. [Ficha](serie_OP_operacion.md) §5.
- **`F02·B2`**: `P-SG-01` confirma el ciclo, la jubilación de la versión anterior
  y la decisión de **no sellar** `elaboro_id` / `reviso_id`.
- **`F03·B2`**: las once listas de oficio tienen exactamente la forma de
  `auditoria_items`, veredicto ternario incluido.
- **`F04`**: `acciones.tipo` con cuatro valores queda confirmado por tres fuentes
  independientes (§5.3 corrección, §5.5 correctiva, `F-SG-17` col. `PREV/CORR`,
  `F-SG-16` mejora).
- **La verificación de eficacia es transversal**: `F-SG-21`, `F-SG-22` y `F-SG-23`
  cierran con la misma tripleta que `acciones.eficacia_*`.

### 5 · Lo que sigue faltando

> 📋 **La lista completa, lista para mandar, está en
> [`DOCUMENTOS_POR_PEDIR.md`](DOCUMENTOS_POR_PEDIR.md)** — los **45** que faltan,
> derivados de la `F-SG-01` (105 en el catálogo, 60 entregados), en tres bloques
> por lo que desbloquean, más las tres preguntas que hay que hacerle al cliente.

Lo que bloquea algo, en resumen:

| Falta | Por qué importa | Fase |
|---|---|---|
| **`P-CO-02`** Selección y Evaluación de Proveedores | Es el respaldo de `fuente_nc = 'evaluacion_proveedor'`, del indicador 6 y de la entrada 4g del `F-SG-18`. Lo citan `P-SG-06`, `P-OP-02` y `P-OP-03` | F04 |
| **`P-RH-01`** Recursos Humanos y Competencia | Es el **hueco 11** (responsabilidad, autoridad y competencia del `F-SG-05`) y el respaldo de `dnc` y `asistentes` | **F05** |
| `F-RH-03` Descripción de Puesto | El perfil de puesto al que apunta el hueco 11 | F05 |
| `F-RH-04` Programa de Capacitación | Es literalmente `F05·B3` | **F05** |
| `P-CO-01` Compras · `P-AM-01` Transporte y Almacén · `P-MT-01` Mantenimiento · `P-AD-01/02` · `P-CN-01` · `P-CM-01` · `P-DS-01` | Procesos del cliente. **Sólo hacen falta si se audita ese proceso** | — |
| Los diagramas de flujo | **Cinco procedimientos** (`P-SG-02`, `P-SG-04`, `P-SG-05`, `P-SG-06`, `P-SG-07`) dicen «Diagrama de flujo del proceso» y **la página está vacía en el `.docx`** | — |

⚠️ **Los diagramas vacíos no son un descuido nuestro: están vacíos en el
original.** Si Summit los tiene aparte, valen para el asistente de la Fase 07;
si no los tiene, **es un hallazgo que la firma le puede levantar a su cliente**.

### 6 · Erratas del cliente encontradas en esta tanda

El precedente del `F-SG-05` —«el formato tampoco es infalible»— se confirma:

| Dónde | Dice | Debe decir |
|---|---|---|
| `P-OP-01` §5.1 | `F-SG-14` Matriz IPERC | `F-OP-14` |
| `P-SG-08` §5.4 | informe en la `F-SG-26` Minuta de Junta de Calidad | `F-SG-20` |
| `P-SG-07` encabezado | `P-SGC-07` | `P-SG-07` |
| `F-SG-26` r17, r21, r22 | `F-OP-13` catálogo · `F-OP-12` carta responsiva · `F-OP-20` recursos | `F-OP-17` · `F-OP-15` · `F-OP-16` |
| `F-SG-21` hoja EV-INT | `F-SG-20` en el encabezado | `F-SG-21` |
| `F-SG-15` fila 10 | dieciséis encabezados de mes, con `ABR`, `MAY`, `JUN` y `JUL` repetidos | doce |
| Nombre de la empresa | «GRUPO ATELIER» y «ATELIER TEA» según el documento | — |

**Ninguna se corrige en la app**: se transcriben tal cual y se anotan. Corregir
en silencio el documento del cliente es exactamente lo que un auditor no debe
hacer.


---

## La Fase 04 quedó construida — 8 sep 2026

`F04·B1` se escribió el día siguiente a recibir `P-SG-05`. La migración
`20260908120000_acciones_y_ciclo_de_mejora.sql` cierra **los huecos 15, 17, 18 y
19 enteros y el 20 a medias**, y crea las cuatro tablas que la cuarta tanda
destapó: `acciones`, `planes_mejora`, `cambios_sgc` y `quejas`.

### Lo que los formatos cambiaron del plan, y no al revés

Cinco decisiones de diseño salieron de leer los documentos del cliente, no de lo
que `docs/02` y `docs/04` tenían escrito:

1. **El análisis de causa vive en el HALLAZGO.** `docs/04` lo ponía en `acciones`.
   Lo que decide es el `F-SG-07` §4: un análisis puede concluir que **no se
   requieren acciones correctivas**, y ahí no tendría dónde vivir.
2. **`tareas` no se creó.** Ninguno de los cinco formatos del ciclo tiene
   sub-pasos, y el `F-SG-16` enseña que la respuesta del cliente a «esto necesita
   planeación» es un contenedor con más acciones.
3. **`acciones_historial` tampoco**: `audit_logs` ya guarda `antes`/`despues`.
4. **Los dos folios conviven** porque son de cosas distintas — el hueco 16 se
   resolvió leyendo con cuidado, no eligiendo.
5. **Las tres preguntas de impacto son del hallazgo, no de la acción**: los dos
   formatos las hacen una vez por NC.

### ✅ La Fase 04·B1 se cerró el 9 sep 2026

Los pendientes que quedaban del 8 sep están construidos:

| Ya está | Dónde |
|---|---|
| **Pantalla de quejas y sugerencias**, con sus dos ramas | `PanelQuejas` · pestaña *Quejas y sugerencias* |
| **Levantar una NC desde una queja procedente** | `LevantarNCDeQueja` — la primera pantalla que usa la rama `NC-` de `B0` |
| **Enlazar una sugerencia** con un cambio o un plan | `P-SG-07` §5.5.2, cerrado |
| **Planes de mejora** con la parrilla anual P/R | `PanelPlanesMejora` |
| **Cambios al SGC** con sus tres orígenes | `PanelCambiosSgc` |
| **Impresión del `F-SG-06` + `F-SG-07` en pareja** | `src/lib/plantillas/reporteNoConformidad.ts` |

⚠️ **El hueco 16 caducó como estaba previsto.** `B0` se aplicó sin pantalla, así
que la rama `NC-` no la usaba ninguna fila; desde el 9 sep **hay folios emitidos**
y ya no se recalculan. La decisión del 8 sep —nuestro folio para el hallazgo, el
del cliente para la acción— queda firme.

⚠️ **Y apareció un fallo de datos que ya existía y nadie había visto**:
`crearHallazgo` no mandaba `fuente_nc`, así que la base ponía `auditoria_interna`
y un hallazgo de un **acompañamiento a certificación** o de una **auditoría a
proveedor** quedaba contado como interno. Lo arregla `fuenteDeLaAuditoria()`,
que lo deriva de `auditorias.tipo` — exactamente lo que el relleno de la migración
hizo con el histórico.

### Lo que sigue faltando de la Fase 04

| Falta | Por qué |
|---|---|
| **Impresión** del `F-SG-16` | Lleva firmas de Elaboró y Aprobó: es un entregable. La parrilla ya está en pantalla |
| **`F-SG-10`** Registro de Atención a Quejas | El expediente impreso de **una** queja procedente, prellenado desde `organizaciones` + `contactos` |
| **`cambios_sgc_documentos`** | La tabla existe; falta la pantalla que dice qué documentos hay que reeditar (§IV del formato) |
| La **escalada a Dirección** de `P-SG-05` §5.6 | La categoría `queja_recibida` ya existe en el CHECK —`P-SG-08` la dirige a Dirección—, pero **falta el disparador**: hoy nadie la genera |
| **`P-CO-02`** Selección y Evaluación de Proveedores | Respalda `fuente_nc = 'evaluacion_proveedor'` |
