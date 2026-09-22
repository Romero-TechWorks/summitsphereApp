# Levantamiento de Cumplimiento Normativo STPS — el formato que destraba `F05·B1`

> `Informe SGI César Roel Abogados STPS`, emitido el **10-Jul-2025** por Summit.
> Quinta tanda, 22 sep 2026.
>
> ⚠️ **Es lo que la sección «Fase 05» de [`DOCUMENTOS_POR_PEDIR`](DOCUMENTOS_POR_PEDIR.md)
> pedía como `A3` (diagnóstico y semáforo) y en parte como `A1` (catálogo de
> NOMs) — y llegó sin pedirlo, lleno y de un cliente real.**

---

## 1 · Qué es

El entregable con el que Summit vende el servicio de cumplimiento: un **recorrido
por el centro de trabajo** contra las NOM-STPS aplicables, con el veredicto por
elemento. No es una matriz de aplicabilidad teórica: es una **auditoría de
cumplimiento legal hecha caminando**, con el mismo gesto que un auditor de la
Fase 03.

✅ **Y eso es lo que decide el modelo de datos**: `F05·B1` no es una pantalla de
escritorio, es **una pantalla de campo**, y le aplican las ocho reglas del
offline. La evaluación de un elemento la manda **el reloj del teléfono** (regla
de fechas de la Fase 03: acción de campo), no el servidor.

## 2 · Su estructura, sección por sección

| Sección | Contenido | Dónde vive en el modelo |
|---|---|---|
| Membrete | Razón social + domicilio del cliente | `organizaciones` + `sitios` · `firma.identidad()` |
| Encabezado | **Fecha del informe · Nombre del proyecto · Elaborado por** (varios) | `proyectos` + equipo |
| **Objetivo del recorrido** | Un párrafo | Igual que `auditorias.objetivo` (hueco 1) |
| **Áreas recorridas** | Lista: recepción, sala de juntas, oficinas privadas, área común, sanitarios, site, comedor | ⚠️ **No hay tabla.** Ver §4 |
| **La tabla** | Ver §3 | El corazón de `F05·B1` |
| A&D · Desafíos u obstáculos | `detalle · asignado a · categoría · notas` | Genérico del template |
| Próximos pasos | `detalle · asignado a · fecha` | → `acciones` |
| **Hallazgos relevantes** | Prosa, 3 puntos | → `hallazgos`, `fuente_nc = 'incumplimiento_legal'` |
| **Recomendaciones** | Lista de 9 | → `acciones` u `oportunidad_mejora` |
| Anexos | Anexo A (fotos) | `adjuntos` |

## 3 · ⚠️ La tabla: cuatro columnas, y ninguna es la que el plan suponía

```
ÁREA / ELEMENTO | NORMATIVIDAD APLICABLE | OBSERVACIÓN | CUMPLE / NO CUMPLE / PARCIAL
```

**El plan de `docs/02` suponía `nom_requisitos` por numeral** (`5.1`, `7.2`).
El formato real **no evalúa numerales: evalúa ELEMENTOS FÍSICOS Y DOCUMENTALES**
—«Extintores», «Estudio de riesgo de incendio», «Carpeta Normativa», «Comisión de
seguridad e higiene»— y cuelga cada uno de su NOM. Es la diferencia entre
auditar un papel y auditar una planta.

✅ **`org_nom_requisitos` sigue sirviendo**, pero su clave no es el numeral: es el
**elemento verificable**, y `nom_requisitos` guarda `elemento` + el numeral como
referencia. La `descripcion` del requisito es **el texto de la obligación**, que
en el formato viene copiado casi literal de la NOM.

### Los tres veredictos, y el cuarto que falta

El formato usa **Cumple · No cumple · Parcial**. Nuestro CHECK planeado tiene
cinco (`cumple · parcial · no_cumple · en_proceso · sin_evaluar`).
⚠️ **Los dos que sobran hacen falta igual**: en el documento real hay un renglón
—«Comisión de seguridad e higiene»— **con el veredicto en blanco**, que es
`sin_evaluar`; y el `F-COM-18` del mismo cliente usa `Cumplida / En proceso /
Pendiente`. Los cinco se quedan.

⚠️ **Y «Parcial» viene con su motivo pegado**: *«Parcial (no presentó
documentación)»*. El veredicto parcial **exige observación**, igual que
`no aplica` exige justificación en `requisitos` (F02·B3). Va en un CHECK.

## 4 · ⚠️ `sitio_id` no basta: la unidad de evaluación es el ÁREA

`docs/04` planeó `org_noms (nom_id, sitio_id)`. Pero el recorrido va por
**áreas dentro del sitio** —site de telecomunicaciones, comedor, sanitarios— y
un extintor falta *en un área*, no *en el domicilio*.

**Resolución propuesta:** `sitios` ya existe y es el domicilio; hace falta
`sitio_areas (sitio_id, nombre, orden)`, y la evaluación cuelga del área cuando
la hay. Es la misma forma que `auditoria_items` ↔ recorrido.
⚠️ **Y es hermana del hueco 21** (`proceso_etapas`): tres formatos pedían «etapa
del proceso» y ahora un cuarto pide «área del sitio». No son la misma tabla —una
cuelga de `procesos` y otra de `sitios`— pero se deciden juntas. **Hueco 30.**

## 5 · ✅ El catálogo de NOMs que trae, y lo que le falta

Ocho NOMs, con el **texto de la obligación verificable** ya redactado:

| NOM | Elemento(s) evaluados | Lo que exige, según el formato |
|---|---|---|
| **NOM-001-STPS-2008** | Ventilación / aire acondicionado · Carpeta normativa | Programa anual de mantenimiento; **conservar resultados un año** en bitácora |
| **NOM-002-STPS-2010** | Extintores · Estudio de riesgo de incendio · Carpeta normativa | Clasificar el riesgo de incendio conforme al **Apéndice A** |
| **NOM-019-STPS-2011** | Comisión de seguridad e higiene · Carpeta normativa | Constituir la comisión conforme al **Capítulo 7** |
| **NOM-025-STPS-2008** | Iluminación | Informe de resultados conforme a **5.2 y 10.4**; conservarlo mientras duren las condiciones |
| **NOM-026-STPS-2008** | Colores y señales · Carpeta normativa | Mantenimiento que asegure visibilidad y legibilidad |
| **NOM-030-STPS-2009** | Diagnóstico de servicios preventivos · Carpeta normativa | Diagnóstico integral o por área conforme al **Capítulo 6** |
| **NOM-035-STPS-2018** | Factores de riesgo psicosocial · Carpeta normativa | Numerales **7.1 a) y 7.2**, ⚠️ **para centros de 16 a 50 trabajadores** |
| **NOM-037-STPS-2023** | Teletrabajo · Carpeta normativa | **Listado de once campos** por persona en teletrabajo |

**Tres cosas que este catálogo enseña y el plan no tenía:**

1. ⚠️ **«Carpeta normativa» es un elemento por NOM, no uno global.** Siete de las
   ocho lo repiten. Es el expediente documental de esa norma, y es el renglón que
   más veces sale «No cumple». En el modelo es un `nom_requisito` más — **no** una
   columna de `org_noms`.
2. ✅ **La condición de aplicabilidad está ahí, dentro del texto**: «centros de
   trabajo que tengan **entre 16 y 50 trabajadores**». Confirma `nom_requisitos.aplica_si`
   y confirma que es **por requisito**, no por NOM: la 035 aplica siempre, pero
   *qué* exige depende del tamaño.
3. ⚠️ **La NOM-037 de teletrabajo no estaba en la lista del plan**, que nombraba
   002, 009, 011, 015, 017, 018, 019, 022, 024, 025, 029, 033, 035 y 036. Aquí
   entran **001, 026, 030 y 037**, y faltan las de agentes físicos porque un
   despacho no las tiene. El catálogo de la firma **no es fijo: depende del giro**,
   que es exactamente `nom_requisitos.aplica_si`.

## 6 · Lo que el resultado se convierte en, y ya existe

> «El resultado fue de **16 incumplimientos frente a 8 NOM**» — Informe General,
> Fase 2.

Esos 16 son **hallazgos**, con `fuente_nc = 'incumplimiento_legal'` —el valor que
entró en el CHECK con `F04·B1` justamente por esto— y con su `hallazgos_historial`.
No hace falta una tabla de «incumplimientos»: **un incumplimiento legal es una no
conformidad**, igual que en `P-SG-02` toda salida no conforme lo era.

⚠️ **Y trae la lección de negocio del año, escrita por el propio informe:**

> «a la fecha de corte estos hallazgos **no cuentan con un plan de atención formal
> aprobado**» — catorce meses después.

Dieciséis incumplimientos ante la autoridad laboral, sin plan, porque el informe
nunca se revisó. **Eso es `acciones` + `F04·B3` + el portal de `F06`**, y es el
argumento comercial de la app entero en un renglón.

## 7 · Lo que sigue faltando para `F05·B2`

Este formato cubre **`B1` casi entero** y deja `B2` a medias: las NOMs dicen
«conservar un año», «mientras se mantengan las condiciones», pero **no hay ni un
documento con fecha de emisión y de vencimiento**. Sigue haciendo falta `A4` de
[`DOCUMENTOS_POR_PEDIR`](DOCUMENTOS_POR_PEDIR.md#lo-que-sigue-faltando--cinco-cosas) `2a`
y `2b`: el control de vencimientos y la tabla de vigencias.
