# Los informes de avance — el entregable de Summit, y `G01` de la Fase 06

> Quinta tanda, 22 sep 2026. `Template Informe`, `Informe General de Avances SGI
> 2025-2026` (corte 8-Jul-2026), `Informe SGI Julio 2025`, `Informe SGI Mayo y
> Junio 2025` y el `Informe ... STPS`.
>
> ⚠️ **Es la tarea `G01` del dueño** («Aportar los formatos de los entregables ·
> Bloquea: los reportes»), y llegó sin pedirla.

---

## 1 · Hay UNA plantilla, y todos los informes son ella

El `Template Informe.docx` trae el armazón vacío —con texto de relleno tecleado
al azar, señal de que es la plantilla de trabajo real— y **los cuatro informes
entregados lo siguen renglón por renglón**, incluido el de cumplimiento STPS:

| Sección | Contenido |
|---|---|
| **Membrete** | Razón social + domicilio del cliente |
| **Título** | «Informe de estado de proyecto» / «Reporte de levantamiento» / «Informe General de Avances» |
| **Cabecera** | Fecha del informe · Nombre del proyecto · **Elaborado por** (varias personas) |
| **Objetivo del proyecto** | Un párrafo |
| **Información general del proyecto** | Un párrafo largo de contexto |
| **Tabla de actividades** | `actividades · % hecho · fecha de vencimiento · estado · notas` |
| **A&D — Desafíos u obstáculos** | `detalle · asignado a · categoría · notas` |
| **Próximos pasos** | `detalle · asignado a · fecha` |
| **Conclusiones y recomendaciones** | Prosa |
| **Anexos** | Anexo A, B, C… |

✅ **Es un `src/lib/plantillas/` más**, con la misma mecánica que
`informeAuditoria.ts`: una cadena, `esc()` en cada interpolación, membrete y pie
compartidos, vista previa en el `<iframe sandbox>`. **Cero esquema nuevo** para
el armazón.

⚠️ **Y `Elaborado por` es una LISTA de personas**, igual que el equipo auditor.
No es `creado_por`.

## 2 · De dónde sale cada sección, y qué falta

| Sección | Origen en la app | ¿Existe? |
|---|---|---|
| Membrete | `firma.identidad()` + `organizaciones` + `sitios` | ✅ |
| Nombre del proyecto | `proyectos.nombre` | ✅ ⚠️ el real lleva número: «379130127-140325 Implantación de SGI» — es el **folio del cliente**, otra vez |
| Objetivo | ⚠️ `proyectos` **no tiene `objetivo`** — `auditorias` sí (hueco 1) | ❌ **Hueco 35** |
| **Tabla de actividades** | `tareas_etapa` con `% hecho` | ⚠️ `tareas_etapa` es booleana: hecha o no. El informe necesita **porcentaje** — igual que `acciones.avance_pct` (hueco 19) |
| Fecha de vencimiento / Estado | `tareas_etapa` | ⚠️ Faltan las dos |
| **A&D / Desafíos** | Nada | ❌ Es el registro de obstáculos del proyecto. Se parece a `riesgos` pero es del **proyecto**, no del proceso |
| **Próximos pasos** | `acciones` | ✅ `detalle · asignado a · fecha` es exactamente `acciones` |
| Conclusiones | Texto del consultor | — |
| Anexos | `adjuntos` | ✅ |

⚠️ **El hallazgo del contraste: `tareas_etapa` se queda corta para el entregable
que la firma cobra.** Se diseñó en `F01·B5` como lista de comprobación por etapa
—hecha / no hecha, con evidencia—, y el informe mensual necesita
`% hecho · fecha de vencimiento · estado · notas` por actividad. Son tres
columnas y un CHECK: barato ahora, y es lo que convierte el tablero en informe.

## 3 · ⚠️ El informe consolidado es un caso distinto, y enseña el modelo de negocio

El `Informe General de Avances 2025-2026` **no es el informe del mes**: consolida
**tres informes previos que la Dirección del cliente nunca revisó**, más catorce
meses de trabajo, para forzar una sola sesión de aprobación.

Sus secciones extra sobre la plantilla:
- **Avance cronológico en cinco fases**, con la fuente de cada una.
- **Tabla de estado documental** — 11 procedimientos, 9 rectores, 20 POE, 50+
  formatos, 70+ diagramas, 26 descriptivos, 17 A&D, **197 riesgos**, **95
  indicadores**, **61 minutas**.
- **Anexo A** (las 61 sesiones), **Anexo B** (inventario por proceso),
  **Anexo C** (los 16 hallazgos STPS).

✅ **Esa tabla de estado documental es el tablero de la firma, impreso.** Todos sus
números salen de tablas que ya existen o están especificadas: `documentos`,
`procesos`, `riesgos`, `indicadores`, `hallazgos`, `tareas_etapa`. **El widget
que falta no es de datos: es de conteo por tipo de documento**, y es lo que
convierte «llevamos catorce meses» en una cifra defendible.

## 4 · La lección de negocio, escrita por el propio informe

> «Los tres informes previos **no fueron revisados por la Dirección**; decisiones
> clave del sistema (política, objetivos, indicadores) siguen sin aprobación
> formal.»
>
> «16 hallazgos de cumplimiento ante NOM-STPS **sin plan de atención autorizado**
> … Exposición ante inspección de la autoridad laboral.»
>
> «Alta dependencia de la Coordinadora ESG como **canal único** de comunicación y
> gestión documental.»

Tres obstáculos declarados por la consultoría, y **los tres los resuelve la app**:
un informe que se lee en el portal en vez de en un adjunto de correo; hallazgos
con responsable, fecha compromiso y **aviso al teléfono** (`F04·B3`); y un
expediente que no vive en la carpeta de una persona.

⚠️ **Y uno que la app empeora si se descuida**: «Códigos documentales por
homologar». Es el hueco 24 (`documentos.codigo`), y aquí ya causó daño real en un
cliente que paga.

## 5 · Qué pedirle a Summit sobre esto

Nada nuevo de formato — `G01` está cubierta. Las preguntas que quedan son de
alcance:

1. ¿El informe de avance lo genera la app **completo**, o sólo sus tablas y el
   consultor escribe la prosa? (La respuesta cambia si `conclusiones` es una
   columna o un archivo.)
2. ¿Los **anexos** se adjuntan o se generan? El Anexo C —los 16 hallazgos— la app
   lo genera solo; el Anexo A —61 minutas— no sabemos si existe como dato.
3. ¿Hay un informe **mensual** pactado por contrato, o sólo por hito? De eso
   depende si el informe es una entidad con calendario o un botón de impresión.
