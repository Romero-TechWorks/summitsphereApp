# P-SG-08 · Procedimiento de Comunicación

> Transcripción del `.docx` (cuarta tanda, 7 sep 2026). Versión 0.
>
> **Es la especificación de las categorías de notificación de `F04·B3`.** Llegó
> justo a tiempo: el plan tenía seis categorías inventadas.

---

## 1 · La Matriz de Comunicación Interna (§5.5) — doce renglones con cadencia

`P-SG-08` tabula **qué se comunica, cuándo, a quién, cómo y quién comunica**. Es
literalmente la tabla de preferencias de notificación:

| Qué comunicar | Cuándo | A quién | Quién comunica |
|---|---|---|---|
| Política y objetivos de Calidad | **Anual** y ante cambios, personal de nuevo ingreso | Toda la organización | Dirección / Coord. SGC |
| Manual del SGC | Ante aprobación y cambios | Responsables de procesos | Coord. SGC |
| Procedimientos del SGC | Ante aprobación y cambios | Responsables de procesos | Coord. SGC |
| Descripciones de puesto | Ante aprobación y cambios | Todo el personal | Coord. SGC |
| **Resultados de indicadores** | **Mensual** | Todo el personal | Coord. SGC |
| **Resultados de Auditorías** | **Por evento** | Responsables de procesos | Coord. SGC |
| Resultados de Satisfacción de clientes | Por evento | Responsables de procesos | Coord. SGC |
| **Quejas de clientes** | **Por evento** | Dirección / Coord. SGC | Responsable de proceso |
| **Estado de las NC** | **Bimestral** | Personal involucrado | Coord. SGC |
| Análisis de Contexto | Ante aprobación y cambios | Responsables de procesos | Coord. SGC |
| Partes Interesadas | Ante aprobación y cambios | Todo el personal | Coord. SGC |
| Análisis de Riesgos y oportunidades | Ante aprobación y cambios | Todo el personal | Coord. SGC |

---

## 2 · Lo que esto cambia en `F04·B3`

El plan tiene seis categorías: *hallazgo asignado · acción por vencer · acción
vencida · documento por aprobar · vencimiento normativo próximo · resumen
diario*. Puestas contra la matriz:

| Categoría del plan | ¿La pide el cliente? |
|---|---|
| hallazgo asignado | ✅ «Resultados de Auditorías», por evento |
| acción por vencer / vencida | ⚠️ **no está como evento**; el cliente pide **«Estado de las NC» BIMESTRAL** |
| documento por aprobar | ✅ «Procedimientos del SGC», ante aprobación y cambios |
| vencimiento normativo próximo | ⚠️ no está — es criterio de Summit, no del cliente |
| resumen diario | ⚠️ no está; el cliente vive en **mensual / bimestral / por evento** |

**Faltan cuatro categorías que el cliente sí pide** y ninguna estaba en el plan:
- **Resultados de indicadores**, mensual → engancha con `F-SG-15`
- **Queja de cliente recibida**, por evento, **a Dirección** → `P-SG-07`
- **Satisfacción de clientes**, por evento
- **Documento publicado / cambiado**, a los responsables de proceso

⚠️ **Tres cadencias que no son «diario»**: mensual, bimestral y trimestral (la
junta de calidad). El plan Hobby de Vercel da **dos crons** (CLAUDE.md), así que
todo esto se cuelga del diario con su propia comprobación de fecha — no son crons
nuevos.

⚠️ **Y hay una dimensión que el plan no tiene: el DESTINATARIO no siempre es un
usuario de la app.** «Toda la organización», «responsables de procesos»,
«Dirección» son roles del cliente, no cuentas de Summit. La notificación va a
`contactos` con su `puesto`, y eso ya existe desde `F01·B1`.

---

## 3 · Canales declarados (§5.2)

Reuniones **documentadas en el `F-SG-20`** · correo electrónico corporativo ·
**Microsoft Teams** · comunicación personal · teléfono · **WhatsApp**.

⚠️ **Microsoft Teams está en el procedimiento del cliente.** Es la justificación
de negocio del módulo `automatizacion` (MS Graph) de la Fase 08, que hoy está
apagado de fábrica.

---

## 4 · Comunicación externa y con contratistas (§5.3 y §5.4)

- La documentación cliente↔empresa se intercambia **en reuniones**, y lo que salga
  se resguarda en la carpeta del proyecto.
- El **`F-SG-25` Directorio de Obras** es el directorio de contacto
  cliente/obra/supervisión: `Clave Interna de la Obra · No. de Contrato · Fecha de
  Inicio · Fecha programada de Cierre · Nombre del Plantel · Zona · Municipio ·
  Supervisor · Teléfono · Superintendente · Teléfono · Director de Plantel ·
  Teléfono`. ✅ **Es `sitios` + `contactos` de `F01·B1`, sin esquema nuevo.**
- **Charla de Inducción** al contratista el primer día de obra.

## 5 · ⚠️ Protocolo de emergencia (§5.4) — no hay nada de esto en el plan

El procedimiento define **qué es una emergencia en obra** (accidente grave o
fatal, siniestro de equipo, fenómeno climático, condición que ponga en peligro a
personal o instalaciones), la cadena de mando, el cierre del área, quién declara
el fin de la emergencia, y que **el Residente de Obra elabora un informe** que va
al Coordinador SGC, **quien decide si hay que actualizar el análisis de riesgo**.

✅ **Es `fuente_nc = 'incidente'`, el único de los once valores que se puso «sin
formato en este cliente».** Ya no: tiene procedimiento, aunque el informe se
levante en el `F-SG-20`. Es el flujo natural de Protección Civil y STPS.

⚠️ **Errata del cliente**: §5.4 dice «informe en la **F-SG-26** Minuta de Junta de
Calidad». La Minuta de Junta de Calidad es la **`F-SG-20`**; la `F-SG-26` es el
Checklist de Seguimiento Interno.
