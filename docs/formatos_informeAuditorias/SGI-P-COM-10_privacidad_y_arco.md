# SGI-P-COM-10 · Privacidad y Datos Personales — un dominio que no está en ninguna fase

> Quinta tanda, 22 sep 2026. Procedimiento de Protección de Datos Personales y
> Respuesta a Incidentes de Privacidad + `F-COM-30/31/32/33` + `OF-COM-01`, más
> dos respuestas a la debida diligencia de un cliente corporativo (`DR3`, `DR6`)
> y el `MEMO-SGI-2026-01`.

---

## 1 · Por qué esto importa aunque no esté en el plan

Marco: **LFPDPPP publicada en el DOF el 20-Mar-2025, vigente desde el
21-Mar-2025**; autoridad, la **Secretaría Anticorrupción y Buen Gobierno**. Es
ley nueva, y Summit ya está vendiendo el servicio de adecuarse a ella: el
`MEMO-SGI-2026-01` es exactamente eso.

⚠️ **Y la app va a tener que cumplirla ella misma.** SummitApp guarda expedientes
laborales de terceros, nombres, puestos, correos y fotos de campo de los clientes
de sus clientes. El `F-COM-30` del despacho lista *«expedientes laborales de
trabajadores de empresas clientes»* con datos de salud, en carácter de
**Encargado**. Cuando Summit meta eso en la app, **Summit es encargado y la app
es el medio**: retención, supresión y notificación de vulneraciones dejan de ser
un dominio del cliente y pasan a ser requisitos de `docs/08`.

## 2 · Derechos ARCO — plazos en días hábiles, y el modelo entero

`SGI-F-COM-32`, con folio propio `ARCO-____-____`:

| Bloque | Campos |
|---|---|
| 1 · Solicitud | Folio · Fecha de recepción · Medio · **Fecha límite de respuesta (20 días hábiles)** |
| 2 · Titular | Nombre · **Relación** (Colaborador / Cliente / Proveedor / Otro) · Identificación · Medio para responder · Representante y documento que lo acredita |
| 3 · Derecho | ☐ Acceso ☐ Rectificación ☐ Cancelación ☐ Oposición ☐ **Oposición a decisiones automatizadas** ☐ Revocación del consentimiento · Descripción · Documentos que aporta |
| 4 · Determinación | Área que trata los datos · **¿Se requirió información adicional? (dentro de 5 días hábiles)** · **Determinación**: Procedente / Parcialmente procedente / Improcedente · Fundamento · **Fecha de ejecución (15 días hábiles)** · Evidencia |
| 5 · Firmas | Oficial de Cumplimiento · **Visto bueno de Dirección en caso de negativa** |

Más **seis causales de improcedencia** tabuladas, incluida «obligación legal o
profesional de conservación, incluido el **secreto profesional**».

⚠️ **Tres plazos distintos en días hábiles sobre la misma fila** (20 para
determinar, 5 para pedir más información, 15 para ejecutar), y **el reloj se
pausa** mientras el titular responde. Esto **no** se resuelve con
`fecha_compromiso`: necesita el calculador de días hábiles con festivos de México
que `E03` dejó pendiente, y necesita que el plazo sepa suspenderse.

⚠️ **«Oposición a decisiones automatizadas» apunta a la Fase 07.** La obligación 7
de la matriz lo dice: *«Aplicable si se emplean herramientas de IA (TEMIS) o
perfilamiento en decisiones»*. El día que el asistente de SummitApp proponga algo
que afecte a una persona, esto aplica a la propia app.

## 3 · Bitácora de vulneraciones — `SGI-F-COM-33`

Folio `VDP-____-____`, y es un expediente de incidente completo:

1. **Identificación** — detección y **calificación** con hora; quién reportó;
   **folio del incidente de TI relacionado**.
2. **Naturaleza** — tipo (pérdida · robo · copia no autorizada · acceso no
   autorizado · daño/alteración) · soporte (físico / electrónico / ambos) ·
   categorías de datos · **¿sensibles?** · nº de titulares · **¿estaban
   cifrados?** · a quién afecta · **cliente(s) involucrado(s)**.
3. **Línea de tiempo** de contención, con evidencia por renglón.
4. **Evaluación de impacto** — ⚠️ *«¿Afecta significativamente derechos
   patrimoniales o morales?»* → **Sí ⇒ notificación INMEDIATA y obligatoria**;
   No ⇒ se documenta la justificación.
5. **Notificaciones** a cuatro destinatarios, cada uno con ¿procede? · fecha y
   hora · medio · **acuse**: titulares · cliente · **Secretaría Anticorrupción y
   Buen Gobierno** · fiscalía. ⚠️ **Al cliente, 72 horas desde la calificación**
   si no hay plazo contractual.
6. **Remediación** — causa raíz · **acción correctiva con folio de `SGI-P-CA-05`**
   · verificación de eficacia · lecciones aprendidas · cierre.

✅ **El punto 6 es literalmente nuestro ciclo de la Fase 04.** Una vulneración es
una `fuente_nc` que no tenemos: las quince actuales no la cubren —
`incumplimiento_legal` se le acerca pero pierde la naturaleza de incidente.
**Hueco 34.**

⚠️ **Y trae un reloj de horas, no de días.** «Inmediata», «72 horas desde la
calificación». Todos nuestros plazos son `date`; éste necesita `timestamptz` y no
se puede formatear con `formatDateOnly`. Es la trampa de las fechas al revés.

## 4 · Inventario de datos personales — `SGI-F-COM-30`

`Base o flujo · Proceso/área · Finalidades · Categorías de datos · ¿Sensibles? ·
Soporte y ubicación · Encargados/transferencias · Carácter · Conservación`

Cinco bases cargadas como ejemplo. Dos columnas que importan al modelo:

- **`Carácter`**: `Responsable` / `Encargado` / «según contrato». Es la figura
  jurídica y cambia qué obligaciones aplican.
- **`Conservación`**: «Relación + 5 años», «Según contrato + plazo legal»,
  «10 años desde el fin del contrato», **«Máximo 90 días»** (videovigilancia).
  ✅ Es el `tiempo_archivo` del **hueco 24**, confirmado por un segundo cliente
  — y aquí con consecuencia legal: la obligación 14 exige **suprimir o bloquear**
  al concluir el plazo, con acta de depuración.

## 5 · Los dos cuestionarios de cliente — `DR3` y `DR6`

Respuestas del despacho a la **debida diligencia de privacidad de un cliente
corporativo**: programa de respuesta a incidentes y gestión de obligaciones.

⚠️ **Esto es un patrón de negocio que la app no contempla: el cliente de tu
cliente te audita.** La obligación 18 lo tabula: *«Atender los requerimientos y
cuestionarios de privacidad de clientes en procesos de debida diligencia»*, por
evento. Para Summit es un entregable recurrente y hoy se contesta a mano copiando
del SGI.

✅ **Es exactamente el caso de uso del portal de `F06·B1`** girado 180°: en vez de
que el cliente mire su expediente, un tercero autorizado mira **una vista
acotada** del cumplimiento del cliente. Misma mecánica de lista blanca, mismo
`portal_tokens`. Vale anotarlo antes de diseñar el portal, no después.

## 6 · Lo que hay que decidir, y no es sólo de producto

| Decisión | Por qué ahora |
|---|---|
| ¿SummitApp entra al alcance de privacidad de Summit? | Si guarda datos de trabajadores de empresas cliente, sí. Cambia `docs/08` |
| Retención y supresión en la base | La obligación 14 exige plazo y acta. Hoy nada caduca en SummitApp |
| Notificación de vulneraciones | Si hay una fuga en la app, Summit tiene 72 h con sus clientes |
| `fuente_nc = 'vulneracion_datos'` | Hueco 34 |
| Plazos en horas | El modelo asume días |
