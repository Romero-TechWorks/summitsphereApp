# P-SG-07 · Satisfacción de Clientes  (+ F-SG-08 · F-SG-10 · F-SG-13)

> Transcripción del `.docx` y los tres formatos (cuarta tanda, 7 sep 2026).
> Versión 0. ⚠️ El encabezado del original dice `P-SGC-07`; el resto del catálogo
> y la `F-SG-01` dicen `P-SG-07`. **Es una errata del cliente.**

---

## 1 · Dos entradas, dos folios, dos destinos

```
   ENCUESTA (F-SG-13)                  QUEJA / SUGERENCIA
   al término de CADA proyecto         por teléfono, correo o presencial
          │                                       │
          │ calificación < objetivo               │ ¿procede?
          │ + comentarios                         ├── NO → se registra y se cierra
          ▼                                       ▼
   análisis de causa ──────────────► F-SG-08 Control y Seguimiento
   + acciones correctivas             ├── QUEJA  → folio  Q-XX-ZZ  → F-SG-10 → P-SG-05 (NC)
   (P-SG-05)                          └── SUGER. → folio  S-XX-ZZ  → F-SG-24 o F-SG-16
```

⚠️ **Una queja procedente genera NC. Una sugerencia procedente NO.** La sugerencia
va a gestión de cambios o a plan de mejora. Eso separa `fuente_nc = 'queja_cliente'`
de cualquier cosa que venga de una sugerencia.

---

## 2 · F-SG-08 · Control y Seguimiento a Quejas y Sugerencias

Dos hojas gemelas —**Quejas** y **Sugerencias**— con las mismas doce columnas:

| Col | Quejas | Sugerencias |
|---|---|---|
| A | `NÚMERO` — **`Q-XX-ZZ`** (Q + consecutivo + año) | **`S-XX-ZZ`** |
| B | `FECHA` | ídem |
| C | `CLIENTE` | ídem |
| D | `DESCRIPCIÓN` | ídem |
| E | `PROCESO` | ídem |
| F | `RESPONSABLE` | ídem |
| G | `PROCEDE` | ídem |
| H | **`NO CONFORMIDAD`** ← el folio de la NC | **`REGISTRO`** ← el F-SG-24 / F-SG-16 |
| I | `% AVANCE` | ídem |
| J | `ESTATUS` | ídem |
| K | `FECHA DE CIERRE` | ídem |
| L | `OBSERVACIONES` | ídem |

⚠️ **El consecutivo de queja es propio y anual** (`Q-01-25`), como el de la acción
correctiva (`AC-FA-01-25`) y a diferencia del de auditoría. **Tercera serie de
folio del cliente.** Ver `P-SG-05_procedimiento_acciones_correctivas.md` §3.

**Tabla nueva:** `quejas` (`org_id`, `folio`, `tipo` CHECK `queja`·`sugerencia`,
`fecha`, `contacto_id`, `descripcion`, `proceso_id`, `responsable_id`, `procede`
bool NULL, `hallazgo_id` NULL, `cambio_sgc_id` NULL, `avance_pct`, `estado`,
`cerrada_en`, `observaciones`).

---

## 3 · F-SG-10 · Registro de Atención a Quejas

El expediente de **una** queja procedente. Cabecera de cliente + cinco bloques:

```
  Nombre del cliente          │ No. de cliente/Contrato
  Domicilio del cliente       │ Ciudad/Estado
  Número de teléfono          │ Colonia
  Servicios que recibe
  Servicio que originó la queja
  ─────────────────────────────────────────────────────
  Fecha ______     Atendido por: ______
  Descripción de lo sucedido            (bloque libre)
  Investigación de la causa raíz        (bloque libre)
  Primera respuesta como acción correctiva
  Fecha de ejecución: ______
  Personas involucradas:   Nombre │ Firma      (cuatro renglones)
  Fecha de cierre
```

⚠️ **La cabecera de cliente sale de `organizaciones` + `contactos`, no se
recaptura.** Es un impreso prellenado, como el `F-SG-03` — misma lección de
`F03·B6d`: «una parrilla vacía es un PDF que cualquiera saca de un Word».

---

## 4 · F-SG-13 · Evaluación de Satisfacción al Cliente

**Se aplica al término de CADA proyecto** (§5.1), no anualmente. Trece preguntas
en cuatro escalas distintas:

| Escala | Preguntas |
|---|---|
| Excelente · Buena · Regular · Mala | expectativas, atención del personal, presentación |
| Mucho(1) … Muy poco(5) — **cinco puntos** | atención, tiempos de entrega, calidad de material, mano de obra, **normas de seguridad** |
| Sí / No | personal calificado, cumplió necesidades |
| Bastante probable · Probablemente · No lo recomendaría | recomendación (NPS de tres puntos) |
| Multiselección | expectativas: profesionalismo, confidencialidad, puntualidad, disciplina, presentación |
| Texto libre | causa de la no conformidad · sugerencia |

⚠️ **La escala 1-5 está invertida respecto a la intuición** (1 = Mucho, 5 = Muy
poco). Un promedio ingenuo dice lo contrario de lo que pasó. Va anotado en el
catálogo de la pregunta, no en la pantalla.

⚠️ **«¿Cómo calificaría el cumplimiento de las normas de seguridad?» es una
pregunta de encuesta de satisfacción que alimenta el expediente de cumplimiento.**
Es un puente Fase 05 ↔ Fase 06 que no estaba en el plan.

**Es de la Fase 06** (portal del cliente): el cliente la contesta, no la firma.
`F06·B1` ya prevé un portal público sin sesión — esta encuesta es su segundo uso.

---

## 5 · Lo que aporta al modelo

| Falta | Fase |
|---|---|
| Tabla `quejas` con las dos ramas y sus dos series de folio | **F04** — es una fuente de NC |
| `encuestas` + `encuesta_respuestas` + catálogo de preguntas por escala | F06 |
| `F-SG-22 Partes Interesadas` recibe las necesidades y expectativas de la encuesta (§5.2) | F02 |
| ⚠️ El **objetivo** de satisfacción es **90 %** (`F-SG-19`) y es un indicador del SGC | F02 |
