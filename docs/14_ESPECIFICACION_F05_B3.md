# 14 · Especificación · F05·B3 · Capacitación

> **Escrita y construida el 23 sep 2026**, con las cuatro respuestas de Summit a
> la tarea `F03`. A diferencia de `docs/13`, **se escribió junto con el código**:
> describe lo que existe, no lo que falta. Migración:
> `20260924120000_capacitacion.sql` (tarea `F00c`).

---

## 1 · Las cuatro respuestas que fijan el diseño

| # | Pregunta | Respuesta de Summit | Consecuencia |
|---|---|---|---|
| 0 | ¿Summit emite el DC-3? | **No.** Lo expide un agente capacitador externo que Summit **contrata** | La app **registra** DC-3, no los **genera**. Sin formato oficial, sin registro STPS de la firma, sin catálogos STPS, sin bucket `constancias` |
| 1 | ¿Quién imparte? | **El instructor es externo**, y es quien imparte | `sesiones.instructor` es **texto**, no un usuario de la firma |
| 2 | ¿Uno o varios proveedores? | **Un catálogo** | `proveedores_capacitacion`, de la firma, con su **registro STPS** |
| 3 | ¿Qué pide el proveedor para expedir? | **Una lista genérica** | CSV armado en el navegador: trabajador + empresa + curso + agente, un renglón por persona |
| 4 | ¿Constancia propia de Summit? | **No: sólo el DC-3** | Nada imprimible en B3. Lo que hubiera sido un generador es un registro |

## 2 · El modelo

**De la firma, sin `org_id`, con partición de pruebas** (patrón de `noms`; nacen
**vacías**, las llena el socio, se dan de baja y nunca se borran):

- **`proveedores_capacitacion`**: nombre, razón social, RFC, **`registro_stps`**,
  contacto, correo, teléfono, notas, `activo`.
- **`cursos`**: clave, nombre, tipo (`normatividad · brigada · sistema_gestion ·
  otro`), **`nom_id`** (de la biblioteca de F05·B1, misma partición), duración en
  horas, temario, modalidad (`presencial · en_linea · mixta`), `activo`.

**Del cliente, con `org_id` y `mis_organizaciones()` a secas:**

- **`dnc`** — el programa anual: año, mes, curso, sitio, participantes,
  `cancelada` + motivo (CHECK). ⚠️ **«Impartido» NO se guarda**: se deriva de que
  una sesión impartida lo cite (`sesiones.dnc_id`).
- **`sesiones`** — curso, renglón del programa, **proveedor**, **instructor
  (texto)**, inicio y término (CHECK: término ≥ inicio), horas, sede, sitio,
  estado (`programada · impartida · cancelada`, cancelar exige motivo).
- **`asistentes`** — `org_id` heredado de la sesión; nombre, **CURP** (CHECK con
  el formato de RENAPO), puesto, ocupación específica, `asistio`, **calificación
  0–100 que captura el instructor**, **`folio_dc3`** y **`dc3_recibido_en`**.
  CHECK: sin DC-3 para quien no asistió; sin fecha de recepción sin folio.
- **`adjuntos.asistente_id`** (el PDF del DC-3) y **`adjuntos.sesion_id`** (fotos,
  lista firmada). Orden de campo dominante: … → obligación → **asistente →
  sesión** → documento.

**Validaciones** (`validar_capacitacion()`): el sitio es del cliente; el curso y
el proveedor son de **la partición** del cliente —los catálogos no tienen
`org_id`, así que lo que se compara es `es_demo`—; y una sesión colgada de un
renglón del programa es **de ese cliente y de ese curso**.

**Lo que no se borra** (políticas de DELETE):

| Tabla | Se quita sólo si… |
|---|---|
| `dnc` | Ninguna sesión la cita (si no, se **cancela** con motivo) |
| `sesiones` | No está impartida, no tiene asistentes ni evidencia |
| `asistentes` | No tiene folio de DC-3 ni PDF adjunto |
| organización | …no tiene **sesiones impartidas** (`puedo_borrar_org()`) |

## 3 · El estado del DC-3 — derivado, no guardado

`estadoDc3()` en `src/lib/capacitacion/catalogos.ts`:

| Estado | Cuándo |
|---|---|
| `no_asistio` | `asistio = false` |
| `recibido` | Tiene `folio_dc3` |
| `reforzamiento` | Calificación capturada **< 80** (`SGI-P-RH-01` §5.4). ⚠️ **No reprueba**: no se le pide DC-3 todavía |
| `pendiente` | Todo lo demás — y es lo que entra en la solicitud |

## 4 · La solicitud al proveedor

`solicitudCsv()`: **CSV con BOM** (sin él Excel rompe los acentos), fechas
`YYYY-MM-DD`, una fila por trabajador con los datos de la empresa, el curso y el
agente repetidos —se pegan en cualquier formato de proveedor sin reacomodar—.
Lleva **sólo a los `pendiente`**. Se construye en el navegador: **sale sin
señal**. La pantalla la ofrece cuando la sesión está impartida y tiene proveedor,
y **avisa cuántos van sin CURP**, porque sin ella el proveedor no expide.

## 5 · Pantallas — `/capacitacion`, tres pestañas

| Pestaña | Qué hace |
|---|---|
| **Sesiones** (`?org=`) | Lista con filtros en memoria (todas · programadas · con DC-3 pendientes). La ficha se abre con **`?sesion=<id>`** —sin ruta propia, §2.1—: datos, «Marcar impartida», **captura rápida de asistentes en una fila** (veinte seguidos sin abrir un modal por persona), el DC-3 de cada quien con su PDF, la solicitud y la evidencia |
| **Programa anual** (`?org=`) | Por año; estado derivado; **«Programar sesión»** desde el renglón con curso y renglón puestos; cancelar con motivo |
| **Cursos y proveedores** | La biblioteca; sólo el socio escribe |

## 6 · Offline

Es trabajo mayormente de oficina, **pero la lista de asistencia se captura en la
sala de capacitación de una planta**: toda escritura va por `offlineWrite`, los
desplegables salen de `useQuery` y los filtros son en memoria. **No hay
precarga** ni RPC: el día que la lista de asistencia se tenga que capturar sin
haber abierto nunca la sesión con señal, hará falta una, como la del recorrido.

## 7 · Advertencias de datos personales (hueco 42)

La CURP es un dato personal. Va **una línea corta junto a la captura** y otra en
el adjunto del DC-3 (que la lleva impresa). No bloquean. `docs/08` §7.

## 8 · Lo que NO entra

- **Vigencia de la capacitación** (una brigada que hay que repetir cada año): no
  se modeló, porque nada la leería (regla 11). Si hace falta, se registra como
  **vencimiento** de tipo «Capacitación» en `/cumplimiento`, que ya avisa.
- **Aviso de DC-3 pendientes** al teléfono: tampoco; la pestaña ya los filtra.

## 9 · Criterio de cierre de B3

> Se imparte un curso de brigada contra incendios a 20 personas de un cliente,
> con un proveedor del catálogo. Se capturan los 20 en la sala, se marca
> impartida, **se descarga la solicitud** y se le manda al proveedor. Cuando
> llegan sus DC-3, **se registran con folio y PDF**, y la sesión deja de salir en
> «Con DC-3 pendientes».
