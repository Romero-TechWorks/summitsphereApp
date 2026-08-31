# F-SG-03 · Lista de Asistencia o Implementación

> Transcripción del `.docx` que entregó Summit (31 ago 2026). Versión vigente 0,
> emitido y actualizado el 10-Feb-2025. Una página, pie «Página 1 de 1».
>
> El más simple de los siete, y el más transversal: **no es un formato de
> auditoría**, es la hoja de firmas de cualquier evento de la firma. Cierra el
> **hueco 4** del [índice](README.md).
>
> ⚠️ **No necesita ni una columna nueva.** Es puro imprimir. Ver §4.
>
> ✅ **Construido el 31 ago 2026** (F03·B6d): un botón *Asistencia* en cada renglón
> de la pestaña Agenda, con su vista previa. La plantilla es
> `src/lib/plantillas/listaAsistencia.ts`.

---

## 1 · Estructura del original

```
┌─ encabezado ────────────────────────────────────────────────────┐
│ [logo]  Lista de Asistencia o Implementación  Fecha Elab.: …    │
│         F-SG-03                               Versión vigente: 0 │
└─────────────────────────────────────────────────────────────────┘

  EVENTO:    ______________________________________________
  OBJETIVO:  ______________________________________________
  FECHA:     ______________________________________________
  LUGAR:     ______________________________________________

  ┌──────────────────┬──────────────────┬──────────────────┐
  │ NOMBRE           │ PUESTO           │ FIRMA            │
  ├──────────────────┼──────────────────┼──────────────────┤
  │                  │                  │                  │   × 18
  └──────────────────┴──────────────────┴──────────────────┘

  Dirigió el Evento: ______________________________________

                                                  Página: 1 de 1
```

---

## 2 · Dónde se usa — tres sitios, y sólo uno es la Fase 03

El título dice **«o Implementación»**, y eso no es relleno: la firma usa esta hoja
para todo evento donde haga falta constancia de quién estuvo.

| Uso | Fase | Qué lo pide |
|---|---|---|
| **Reunión de apertura** de una auditoría | **F03** | P-SG-03 §5.4.1, textual: «se registra en el F-SG-03 Lista de Asistencia, con el tema *Reunión de Apertura de Auditoría Interna* y la fecha» |
| **Reunión de clausura** de una auditoría | **F03** | §5.4.5. El procedimiento no lo dice con estas palabras, pero es la misma reunión al revés y el diagrama de flujo lista F-SG-03 entre los formatos del nodo «Ejecutar la auditoría» |
| **Sesión de capacitación** | F05 | `sesiones` + `asistentes`. Es literalmente esta tabla: nombre, puesto, asistencia |
| Evento de implementación (arranque de proyecto, entrega de un procedimiento) | — | No está planeado en ninguna fase. Cae solo cuando exista: es el mismo documento con otro `EVENTO` |

⚠️ **Lo que lo hace fácil es que la firma no la captura, la recoge.** Nadie va a
teclear dieciocho nombres en un teléfono en una sala de juntas. El flujo real es:
se imprime, se pasa por la mesa, se firma con pluma, se fotografía y la foto entra
como adjunto. Eso ya lo sabemos hacer.

---

## 3 · La regla que decide si sirve: **se imprime llena, no en blanco**

Es la misma lección que F-SG-06 dejó con las casillas ☐, y aquí vale más todavía.

**Si la app imprime la parrilla vacía, no ha hecho nada** — es un PDF que
cualquiera saca de un Word. Lo que la app aporta es que **ya sabe la mitad de la
hoja**:

| Campo | Se imprime lleno con |
|---|---|
| **EVENTO** | «Reunión de Apertura de Auditoría Interna» + `auditorias.folio` y `titulo` |
| **OBJETIVO** | `auditorias.objetivo` — la columna que llegó con `D05`. Es exactamente para lo que sirve |
| **FECHA** | La del renglón de agenda de la apertura, o `auditorias.fecha_inicio`. ⚠️ Columna `date`: `formatDateOnly`, nunca `new Date()` |
| **LUGAR** | Los sitios de `auditoria_sitios` → `sitios.nombre` (+ `municipio`) |
| **NOMBRE / PUESTO** | Prellenados: el equipo auditor de `auditoria_equipo` con su papel de puesto, y los auditados de `auditoria_agenda` (`contacto_id` → `contactos.nombre`/`puesto`; si no hay contacto, el texto libre de `auditado`, que ya es un puesto — «Jefe de Almacén») |
| **FIRMA** | **Siempre en blanco.** Es lo único que el papel aporta |
| **Dirigió el Evento** | `auditorias.auditor_lider_id` → `usuarios.nombre` |

⚠️ **Y quedan renglones vacíos a propósito.** Se prellena a quien se espera y se
dejan al menos seis en blanco: a una reunión de apertura siempre llega gente que
no estaba en la agenda, y una hoja sin renglones libres obliga a escribir en el
margen.

⚠️ `auditoria_agenda.auditado` es texto libre **con el puesto**, no con el nombre —
la agenda se manda semanas antes—. Eso encaja exacto con la columna PUESTO de este
formato: se imprime el puesto aunque el nombre todavía no se sepa, y la persona
escribe el suyo al firmar. Es el mismo hueco que F-SG-06 llamaba
`puesto_responsable`, resuelto por una columna que ya existía.

---

## 4 · Modelo: **ninguno**

No hay tabla nueva, ni columna nueva, ni clave de caché nueva. Todo sale de
`auditorias`, `auditoria_equipo`, `auditoria_agenda` y `auditoria_sitios`, que ya
están en la precarga desde F03·B3.

⚠️ **Y eso último importa: se imprime sin señal.** La reunión de apertura pasa en
la planta, con el auditor recién llegado. Si generar esta hoja necesitara una
consulta nueva, saldría en blanco justo el día que se usa — es la misma regla que
gobernó el informe en B5: **no introduce ni una clave de consulta nueva**.

La única decisión de diseño es dónde vive el botón. Va en la **pestaña Agenda**
del expediente de la auditoría, sobre el renglón de la reunión: «Imprimir lista de
asistencia». Desde ahí sabe qué reunión es —apertura o clausura— y con qué fecha,
sin preguntar nada.

⚠️ **No inventar un catálogo de tipos de reunión.** El renglón de agenda ya tiene
`tema`, que es texto libre, y ése es el `EVENTO`. Un CHECK con
`('apertura','clausura')` sería un interruptor que sólo sirve para dos de los
cuatro usos de la hoja (regla 11).

---

## 5 · Lo que la foto firmada cierra

La hoja escaneada vuelve como `adjuntos` con `auditoria_id` — que es lo que el
README ya proponía como provisional en el hueco 4, y sigue siendo lo correcto
ahora que tenemos el formato. Lo que cambia es que **antes se subía una hoja
llenada a mano y ahora se sube la que la app imprimió**, con el objetivo, el folio
y los puestos ya escritos.

⚠️ Y con eso la evidencia de las reuniones de apertura y clausura deja de ser un
hueco: P-SG-03 las exige y un certificador las pide. Hoy la app no tiene forma de
demostrar que la reunión de apertura ocurrió.

---

## 6 · Al imprimirlo

- Encabezado y pie iguales a los del F-SG-12. El pie del original numera páginas
  («Página: 1 de 1») — si la lista prellenada pasa de dieciocho renglones, se
  continúa en una segunda hoja con el encabezado repetido.
- Va a `src/lib/plantillas/`, devuelve una cadena y no consulta.
- ⚠️ La columna FIRMA necesita **alto de renglón de verdad**, no una línea: se
  firma con pluma sobre una mesa. En `@page` eso es una altura mínima por fila, y
  se ve en la vista previa del `<iframe sandbox>` antes de gastar papel.
