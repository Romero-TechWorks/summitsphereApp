# Formatos de auditoría de la firma — análisis y mapeo

Summit entregó cuatro archivos de trabajo (30 ago 2026): el procedimiento que
gobierna todo el ciclo y tres formatos. En sus palabras:

> «Te adjunto los documentos de referencia relacionados con la planificación y
> ejecución de las auditorías, el procedimiento explica todo el ciclo de la
> actividad y también te adjunto los formatos que usamos para la planificación y
> la del reporte final. Todo esto lo diseñamos para una empresa, pero así se
> comporta para todos los sectores.»

**Los `.docx` y `.xlsx` originales no se commitean.** Estos Markdown son su
sustituto fiel y completo: todo lo que hace falta para escribir el código está
transcrito aquí, incluido el diagrama de flujo. Si algún día hay que volver al
original, el dueño lo tiene.

| Archivo | Original | Qué es |
|---|---|---|
| [`P-SG-03_procedimiento.md`](P-SG-03_procedimiento.md) | `P-SG-03 …docx` | **El procedimiento.** Manda sobre los otros tres |
| [`F-SG-11_planeacion_y_agenda.md`](F-SG-11_planeacion_y_agenda.md) | `F-SG-11 …xlsx` | Planeación y agenda, con un ejemplo real lleno |
| [`F-SG-12_reporte_final.md`](F-SG-12_reporte_final.md) | `F-SG-12 …docx` | **El informe. Es F03·B5** |
| [`F-SG-06_reporte_no_conformidad.md`](F-SG-06_reporte_no_conformidad.md) | `F-SG-06 …docx` | Reporte de NC. Mitad Fase 03, mitad Fase 04 |

---

## Lo primero: estos formatos son de UN cliente, y la app sirve a muchos

Los cuatro se diseñaron para **GRUPO ATELIER**, contra **ISO 9001:2015**, con la
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

Están detallados en la ficha de cada formato. En resumen:

| # | Hueco | Dónde | Resolución |
|---|---|---|---|
| 1 | **`auditorias.objetivo` no existía** | F-SG-11 y F-SG-12 lo piden de primero | ✅ Columna añadida en `20260830120000_informe_de_auditoria.sql` (`D05`) |
| 2 | La clave del cliente `AI-01-25` vs nuestro `AUD-2026-001` | P-SG-03 §5.1 | ✅ El folio de la firma manda; la clave del cliente va en `titulo`. Sin cambio de esquema |
| 3 | `informe_emitido_en` no lo sellaba nadie | `auditorias` | ✅ `sellar_emision_informe()`, en la misma migración |
| 4 | **F-SG-03 Lista de Asistencia no llegó** | Apertura y cierre, exigidas por §6.1 y §6.3 | Provisional: foto del acta firmada como adjunto. Falta el formato |
| 5 | **F-SG-09 Programa Anual y su regla de frecuencia** | P-SG-03 §5.2 | `programa_auditorias` no tiene renglón por proceso. F03·B1 ya cerrado → backlog |
| 6 | `fuente_nc` y `puesto_responsable` | F-SG-06 | Fase 04, con el resto del formato |
| 7 | ¿Actualizar análisis de riesgo? ¿Cambios al SGC? | F-SG-06 | Enlaza con `riesgos` (Fase 02). No está planeado en ninguna fase |
| 8 | Varios auditores por renglón de agenda | `auditoria_agenda.auditor_id` es uno | Para el informe: si viene vacío se imprime el equipo entero. Sin esquema |

**Los tres primeros se resolvieron al construir B5** (30 ago 2026); del 4 al 8 son
de otras fases y siguen abiertos. Ninguno bloqueaba nada.

⚠️ Y apareció un noveno al escribir el informe, que **ya está cerrado**: la
identidad de la firma (`config_firma`) no tenía clave de caché ni entraba en la
precarga, así que el documento habría salido **sin membrete** en la reunión de
cierre. Es `src/lib/queries/firma.ts` y la undécima pieza de la precarga.

---

## Dónde cae cada formato, por fase

| Formato | Fase | Estado |
|---|---|---|
| **F-SG-11** Planeación y Agenda | F03·B1 ✅ | El código ya lo cubre. El Markdown sirve para **imprimirlo**: se manda al cliente antes de la visita |
| **F-SG-12** Reporte Final | **F03·B5** ✅ | **Construido** el 30 ago 2026: la pestaña Informe. Especificación en su ficha |
| **F-SG-06** Reporte de NC | F03·B4 ✅ (mitad) + **F04·B1** | La mitad de arriba ya existe en `hallazgos`. La de abajo —causa raíz, acciones, cierre— es la Fase 04 |
| **F-SG-07** 5 ¿Por qué? | F04·B1 | Ya planeado («5 porqués e Ishikawa»). Ahora se sabe que la firma usa 5 porqués |
| **F-SG-09** Programa Anual | F03·B1 ✅ (parcial) | La regla de frecuencia no está. Backlog |
| **F-SG-17** Base de Datos de NC | F03·B4 ✅ + F04 | Es el tablero del lunes (`TableroHallazgos`) más el seguimiento de la Fase 04 |
| **F-SG-03** Lista de Asistencia | — | **No llegó.** Ver hueco 4 |
| Perfil de auditor (P-SG-03 §7) | F06·B3 | Alta de usuarios. Puede validar quién es elegible como `lider` |
| Plazo de 15 días hábiles | F04 (`E03`) | Va a `config_firma.plazos_default` |

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
