# SGI-P-RH-01 · Recursos Humanos y Competencia — `F05·B3` y el hueco 11

> Quinta tanda, 22 sep 2026. Procedimiento «REVISADO» + **catorce formatos** de
> la serie `RH` + **26 descriptivos de puesto**.
>
> ⚠️ **Es el documento que [`DOCUMENTOS_POR_PEDIR`](DOCUMENTOS_POR_PEDIR.md)
> pedía como `P-RH-01` desde el 7 sep**, y llegó con casi toda su serie.

---

## 1 · ✅ Hueco 11 CERRADO — `SGI-F-RH-03 Descriptivo de Puesto`

El hueco 11 («Responsabilidad y Autoridad: puesto + competencia» del `F-SG-05`)
llevaba abierto desde el 2 sep con la nota *«se decide con la Fase 05»*. Aquí
está el formato, con **plantilla en blanco y 26 ejemplos llenos**:

| Bloque | Campos |
|---|---|
| **Identificación** | Puesto · Jefe inmediato · Personas a cargo (Sí/No) · **Modalidad** (Presencial / Remoto / Híbrido) · ⚠️ **Nivel de Riesgo** (Bajo / Medio / Alto) |
| **Objetivo** | Un párrafo |
| **Generalidades** | Escolaridad · Idiomas · Habilidades y Competencia (con casillas de Office) |
| **Actividades** | «Enunciativas más no limitativas» |
| **Observaciones** | De dónde se derivan las actividades |
| Firma | **Nombre y Firma del Trabajador** |

**Tres cosas que no se habrían adivinado:**

1. ⚠️ **`Nivel de Riesgo` del PUESTO** — una sexta escala de riesgo, y ésta no
   cuelga de un proceso sino de una persona. Es el insumo de la **debida
   diligencia de personal** de ISO 37001 (§8.2): a mayor riesgo del puesto, más
   verificación antes de contratar. No es decorativo.
2. ⚠️ **`Modalidad`** enlaza directo con la **NOM-037-STPS-2023** de teletrabajo
   del [levantamiento STPS](levantamiento_cumplimiento_STPS.md) §5, que exige un
   *listado actualizado de personas en teletrabajo* con once campos. El
   descriptivo de puesto es donde nace ese dato.
3. **Lo firma el trabajador.** Es un registro con firma, no un catálogo interno:
   va con `adjuntos` y con su sello, como una versión de documento aprobada.

✅ **Dónde vive:** es `contactos.puesto` ascendido a entidad propia — `puestos`
por organización, y `contactos.puesto_id`. Hoy `puesto` es texto libre, y con 26
descriptivos por cliente eso ya no se sostiene.

## 2 · `F05·B3` — lo que el procedimiento define y lo que no

### ✅ Lo que define

| Cosa | Regla |
|---|---|
| **DNC** | Los responsables de proceso detectan necesidades y avisan al Coordinador del SGI; éste añade las que salen de la demanda de proyectos, de la mejora continua y de la **evaluación de desempeño anual** |
| **Programa de Capacitación** | `SGI-F-RH-04`, con: las capacitaciones detectadas, **fechas previstas**, **proceso que las requiere**, **tipo de capacitación** e **instructor** |
| **Examen** | `SGI-F-RH-06 Examen de Conocimientos`. ⚠️ **Aprobatorio ≥ 80 %** |
| **Reprobado** | **No se reprueba y ya**: se programa una **sesión de reforzamiento** y se repite «hasta que el tema quede claro». Es un bucle, no un estado final |
| **Capacitación externa** | Se le exige al proveedor su entregable: **DC-3**, constancia o reconocimiento |
| **Lista de asistencia** | `SGI-F-CA-03`, **la misma** que la de auditoría ✅ — responde la pregunta `A8` de `DOCUMENTOS_POR_PEDIR` |
| **Inducción** | También al **ascender de puesto**, no sólo al ingresar |

### ⚠️ Lo que NO define, y sigue faltando

- **`SGI-F-RH-04 Programa de Capacitación` NO VINO.** El procedimiento lo cita
  tres veces; la carpeta trae `RH-02, 03, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14,
  15` y el organigrama `RH-01`. **Falta justo el 04**, que es el que
  `DOCUMENTOS_POR_PEDIR` llamaba *«literalmente `F05·B3`»*. Sigue pedido.
- ✅ **`SGI-F-RH-06` llegó en `.docx` el 22 sep 2026**, y confirma lo que el dueño
  anticipó: **no aporta casi nada**. Es `PUESTO · NOMBRE · PROCESO · FECHA ·
  CALIFICACIÓN` y nueve renglones `1.- / R=`. Lo poco que sí aporta:
  ⚠️ **las preguntas son ABIERTAS, no de opción múltiple**, así que **la app no
  puede calificar** — `asistentes.calificacion` es un número que **captura el
  instructor**, y no hay que construir motor de exámenes. Y el examen se
  identifica **por proceso**, no por curso, que encaja con §5.4: la capacitación
  interna es sobre los documentos de un proceso.
- ⚠️ **El DC-3 aquí se RECIBE, no se emite.** Este cliente lo pide a sus
  proveedores de capacitación. **No dice nada del registro de Summit como agente
  capacitador ante la STPS** (`A6`/`F03`), que sigue siendo imprescindible y sin
  responder.

## 3 · ⚠️ La caracterización del proceso — un patrón que vale para TODO

Los once procedimientos operativos de este cliente terminan igual:

```
7. Caracterización del Proceso
   7.1 SIPOC
   7.2 Indicadores          ← tabla
   7.3 Análisis de Riesgos  ← tabla
8. Referencia
9. Registro de asignación de copias y cambios en el documento
```

✅ **Eso es la `F-SG-05` Ficha Técnica de Proceso metida dentro del
procedimiento**, y explica los 95 indicadores y 249 riesgos: **no se capturan
aparte, se derivan de los procedimientos**. El modelo ya lo soporta —`procesos`,
`indicadores`, `riesgos` con `proceso_id`— pero la pantalla debería poder
**imprimir la caracterización** como sección de un documento, no sólo listarla.

**Los 15 indicadores de RH**, que valen como ejemplo de lo que la app va a medir:

| # | Indicador | Frecuencia | Meta |
|---|---|---|---|
| 1 | Tiempo promedio de cobertura de vacantes | Mensual | ≤ 30 días |
| 2 | Índice de rotación | Trimestral | ≤ 10 % anual |
| 3 | Rotación temprana (< 6 meses) | Trimestral | ≤ 5 % |
| 4 | **Cumplimiento del programa de capacitación** | Trimestral | ≥ 90 % |
| 5 | **Eficacia de capacitación** (aprobados ≥80 % / evaluados) | Trimestral | ≥ 90 % |
| 6 | **Horas promedio por colaborador** | Trimestral | ≥ 12 h anuales |
| 7 | Cumplimiento de inducción | Mensual | 100 % |
| 8 | Satisfacción del ambiente laboral | Anual | ≥ 85 % |
| 9 | Participación en la encuesta | Anual | ≥ 90 % |
| 10 | Cumplimiento documental de expedientes | Trimestral | 100 % |
| 11 | **Baja y revocación de accesos en tiempo** | Bimestral | 100 % |
| 12 | Recuperación de activos en offboarding | Bimestral | 100 % |
| 13 | Incidencias por incumplimiento documental o normativo | Mensual | ≤ 2 % |
| 14 | Cumplimiento de vacaciones programadas | Mensual | 100 % |
| 15 | Acciones de mejora implementadas | Trimestral | ≥ 90 % |

⚠️ **Tres cosas del modelo de indicadores que esto confirma o rompe:**
- ✅ **Cadencias mixtas** (mensual, bimestral, trimestral, anual) — ya previsto.
- ⚠️ **`meta` no siempre es un porcentaje**: «≤ 30 días», «≥ 12 horas anuales»,
  «≤ 10 % anual». La meta necesita **unidad** y **sentido** (`≥` / `≤`), y hoy
  `indicadores` asume que más es mejor. **Hueco 33.**
- ⚠️ El 6 y el 2 tienen **cadencia trimestral y meta ANUAL**: se miden cuatro
  veces al año contra un acumulado de doce meses. Eso no es `mediciones.periodo`
  y es el mismo problema del hueco 26, por otro lado.

## 4 · Los otros formatos de la serie, y para qué sirven

| Formato | Qué es | Dónde cae |
|---|---|---|
| `F-RH-01` | Organigrama (`.png`) | ⚠️ Imagen; `documentos` la guarda como adjunto, el visor no la convierte |
| `F-RH-02` | Solicitud de Personal | — |
| **`F-RH-03`** | **Descriptivo de Puesto** | **Hueco 11** ✅ · §1 |
| `F-RH-05` | **Evaluación de Ambiente de Trabajo** | ⚠️ `DOCUMENTOS_POR_PEDIR` sospechaba **NOM-035**. **No lo es**: es clima laboral, anual, alimenta el Plan de Mejora `F-CA-16`. La NOM-035 sigue sin instrumento |
| `F-RH-06` | Examen de Conocimientos | `asistentes.calificacion`, ≥80 % |
| `F-RH-07` | Listado de Datos y Documentación de Personal | El expediente del que sale la CURP del DC-3 |
| `F-RH-08` | Índice de Rotación | Indicador 2 |
| `F-RH-09` | Evaluación a Candidatos | — |
| `F-RH-10/11` | Registro y Solicitud de Vacaciones | ⚠️ **15 días hábiles de anticipación** — otra vez días hábiles |
| **`F-RH-12`** | **Evaluación de desempeño** | ⚠️ Es una **«evaluación 180»**: jefe + par + subordinado + autoevaluación. Cuatro filas por persona, no una |
| `F-RH-13` | Programación de Inducción | — |
| `F-RH-14` | Check List Offboarding | ⚠️ Enlaza con TI: **revocación de accesos** (indicador 11) |
| `F-RH-15` | Valoración de Pruebas Psicométricas | Dato sensible — ver [privacidad](SGI-P-COM-10_privacidad_y_arco.md) |

⚠️ **`F-RH-14` y el indicador 11 son seguridad de la información, no RH.** La baja
de un colaborador dispara revocación de accesos con plazo y evidencia. Si la app
llega a modelar offboarding, es un `tareas_etapa` con `exige_evidencia`.
