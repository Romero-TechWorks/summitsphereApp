# Serie `OP` · Operación  (P-OP-01/02/03 + F-OP-01…F-OP-20)

> Transcripción y caracterización de los 23 documentos de Operación de la cuarta
> tanda (7 sep 2026). Versión 0, 10-Feb-2025.
>
> **Sí hay documentación de Operación** — de hecho es más de un tercio de la
> carpeta. Lo que pasa es que **casi nada de ella es de SummitApp**, y conviene
> ser explícito sobre por qué.

---

## 1 · Qué es esta serie

`GRUPO ATELIER` / `ATELIER TEA` es una **constructora**: supervisión y gestión de
obras (albañilería, impermeabilización, acabados, obra exterior, instalación
eléctrica/sanitaria/hidráulica, herrería y aluminio). La serie `OP` es **su
proceso de negocio**, en tres procedimientos:

| Doc | Cubre | Formatos que emite |
|---|---|---|
| `P-OP-01` Levantamiento de Obra | Revisión de info del cliente, medición y localización, catálogo y precios unitarios | `F-OP-02`, `F-OP-17`, `F-OP-18`, `F-OP-19` |
| `P-OP-02` Ejecución de Obra | Selección de contratistas, conciliación de catálogo, solicitud y seguimiento de materiales, almacén en obra, medición de avance, remesas, reporte semanal | `F-OP-01`, `F-OP-15`, `F-OP-16`, `F-OP-03`…`F-OP-13`, `F-OP-20` |
| `P-OP-03` Cierre de Obra | Inspección final, documentación completa, limpieza, **evaluación a contratistas**, entrega formal, archivo | `F-OP-10`, `F-CO-02` |

---

## 2 · ⚠️ La línea: esto es el SGC DEL CLIENTE, no el trabajo de Summit

SummitApp es la herramienta de **la consultoría**, no el ERP de la constructora.
Nada de esto entra al producto:

- `F-OP-17` Catálogo · `F-OP-18` Cédula de Estimación · `F-OP-19` Generador de
  Estimación · `F-OP-01` Reporte Semanal · `F-OP-02` Levantamiento — **son
  presupuestación y control de obra**. Es un ERP de construcción.
- `F-OP-03` a `F-OP-13` y `F-OP-20` — **once listas de verificación de oficio**
  (pintura, pisos, hidráulica, impermeabilización, eléctricas, albañilería,
  demolición, limpieza, cimentación, excavación, estructura, gestión de pintura).
- `F-OP-15` Carta Responsiva · `F-OP-16` Recursos e Insumos para la Seguridad —
  contratación de contratistas.

⚠️ **Regla 11 aplica en bloque**: modelar cualquiera de estos sería un
interruptor muerto. Un cliente de Summit que sea una planta de manufactura no
tiene nada de esto, y el siguiente tampoco.

---

## 3 · Lo que SÍ toca a SummitApp — y son cuatro cosas

### 3.1 · `F-OP-14` Matriz IPERC → **Fase 05**
Es el único formato `OP` que sí es de Summit: seguridad y salud en el trabajo, con
requisito legal por peligro. Está documentado aparte, en
[`P-SG-04_riesgos_y_oportunidades.md`](P-SG-04_riesgos_y_oportunidades.md) §6.

### 3.2 · Las once listas de oficio validan `F03·B2`
Todas tienen la **misma forma**: encabezado de proyecto (Nombre del Proyecto,
Fecha, No. de Contrato, Actividad), luego puntos agrupados por tema con tres
columnas `SI · NO · NA`, y al pie `Observaciones` y `Revisó`.

✅ **Es exactamente `auditoria_items`**: punto, agrupador, veredicto ternario,
observación. Y **es exactamente la plantilla de listas de verificación** de
`config_firma.plantillas.verificacion` — «el auditor deja bien la lista de un
cliente y un socio la guarda para los siguientes».

⚠️ **Confirma que la plantilla necesita una tercera clave.** Hoy se guarda por
**clave de norma** y por **giro normalizado**, con `general` de respaldo. Estas
listas no son por norma ni por giro: son **por actividad** (pintura, albañilería…).
Un cliente constructor tendría once plantillas dentro del mismo giro. Es un hueco
pequeño de `F03·B2` que no urge, pero que se ve mejor con estos formatos delante.

### 3.3 · `F-OP-01` Reporte Semanal alimenta `fuente_nc = 'incidente'`
Sus campos al pie: `INCIDENTES CON PROVEEDORES`, **`ACCIDENTES DEL PERSONAL EN
OBRA`**, `INCIDENTES/CAMBIOS EN OBRA`,
`OBSERVACIONES/RECOMENDACIONES/OPORTUNIDADES DE MEJORA`. Es donde el cliente
registra el hecho que después se convierte en NC por la vía de `P-SG-08` §5.4.

### 3.4 · `F-SG-26` Checklist de Seguimiento Interno — el mapa de evidencia
No es `OP` pero vive aquí: por cada obra, **43 preguntas** del tipo «¿se realizó
X?» con `Si·No·NA`, **el código del formato que lo evidencia**, el responsable, la
carpeta digital, la cantidad de entregables y el estatus.

✅ **Es `fuente_nc = 'seguimiento_interno'`**, ya en el CHECK.
✅ **Y es el modelo mental de `tareas_etapa`** de `F01·B5`, aplicado a un proyecto
del cliente: una lista de comprobación por etapa, con evidencia obligatoria.
⚠️ Su columna `Código del Formato` referencia formatos que **no llegaron**
(`F-CO-04`, `F-AM-01`, `F-AM-02`, `F-AM-05`, `F-AM-08`) y **usa códigos
desactualizados** para los que sí (dice `F-OP-13 Formato de catálogo` cuando es
`F-OP-17`; `F-OP-12 Carta responsiva` cuando es `F-OP-15`; `F-OP-20 Recursos e
insumos` cuando es `F-OP-16`). El propio cliente tiene el catálogo desalineado —
que es justo el problema que resuelve la `F-SG-01` en la app.

---

## 4 · Los tres documentos de identidad del SGC

| Documento | Qué es | Dónde encaja |
|---|---|---|
| `M-SG-01` Manual del SGC | 9 capítulos siguiendo ISO 9001:2015 cláusula por cláusula | Un `documento` más, tipo Manual |
| `C-SG-01` Política de Calidad | La política firmada | `documento`, y entrada 1 del `F-SG-18` |
| `D-SG-01` Modelo del SGC (`.png`) | El mapa de procesos | ⚠️ Es una **imagen**, no texto. `documentos` la guarda como adjunto; el visor de `src/lib/documentos/` no la convierte |
| `Alcance del SGC` | El alcance y **las exclusiones** | Ver §5 |

## 5 · ✅ El `Alcance del SGC` valida `F02·B3` palabra por palabra

> «Debido a la naturaleza de nuestros procesos se han determinado como
> **requisitos no aplicables**: **7.1.5.2** Trazabilidad de las mediciones y
> **8.3** Diseño y desarrollo de los productos y servicios. Debido a que ATELIER
> TEA no cuenta con instrumentos de seguimiento y medición que requieran
> verificación o calibración…, tampoco realiza actividades de diseño ya que los
> requerimientos se establecen en las bases de cada concurso.»

Es **literalmente** el caso de prueba de la migración de la Fase 02: *«`no aplica`
sin justificación»* rechazado. Aquí está el par cláusula↔justificación real, de un
cliente real, para dos cláusulas concretas. **La matriz de requisitos de `F02·B3`
se puede sembrar con este documento el día de la prueba con datos reales.**

⚠️ **Y el nombre del cliente no es estable**: el alcance y el `F-SG-13` dicen
«ATELIER TEA»; los procedimientos dicen «GRUPO ATELIER»; el `F-SG-04` dice las
dos. `organizaciones.nombre` guarda uno; el otro es un alias. No es un problema
de la app, pero explica por qué el buscador global (`F06·B4`) va a fallar si sólo
compara contra un campo.
