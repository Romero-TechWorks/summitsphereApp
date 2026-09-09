# F-SG-05 · Ficha Técnica de Proceso

> Transcripción del `.pptx` que entregó Summit (**2 sep 2026**). Versión vigente 0,
> emitido el 10-Feb-2025, actualizado el 10-Feb-2025; el archivo se guardó por
> última vez el 24-Feb-2025. **Doce diapositivas, una por proceso**, del mismo
> cliente de construcción que los otros siete formatos.
>
> **Es el octavo documento de la firma y el primero que NO es de auditoría.** Es
> el mapa de procesos del cliente: qué procesos hay, qué entra y qué sale de cada
> uno, quién los opera, con qué recursos, con qué indicadores y contra quién
> interactúan.
>
> ⚠️ **Llegó en la carpeta de la Fase 04 y su modelo es de la Fase 02.** Lo que sí
> aporta a la Fase 04 es la pieza que faltaba para cerrar el **hueco 6**
> (`fuente_nc`): el catálogo documental completo del cliente, que dice de dónde
> nacen las no conformidades cuando no nacen de una auditoría. Ver §5.
>
> ⚠️ **Sigue sin llegar `P-SG-05`**, el procedimiento de control de acciones
> correctivas, que es el que gobierna la Fase 04. Ver [`README`](README.md).

---

## 1 · Estructura del original

Una diapositiva por proceso, con el nombre del proceso en un pentágono al centro
y nueve bloques alrededor. El encabezado es el mismo de los otros formatos.

```
┌─ encabezado ────────────────────────────────────────────────────────────┐
│ [logo]   FICHA TÉCNICA DE PROCESO  F-SG-05    Versión vigente: 0        │
│                                               Fecha de Elab.: 10-Feb-25 │
│                                               Fecha de Act.:  10-Feb-25 │
└─────────────────────────────────────────────────────────────────────────┘

  PROCESO: <nombre>

  ┌─ Planificación ───────────────┐   ┌─ Recursos ──────────────────────┐
  │ Código │ Procedimiento        │   │ Materiales / Equipo / Maquinaria │
  │────────┼──────────────────────│   │ Infraestructura / Servicios /    │
  │ P-XX-01│ …                    │   │ Intangibles / Normatividad       │
  └────────┴──────────────────────┘   │  ▪ … ▪ … ▪ … ▪ …                 │
                                      └──────────────────────────────────┘
  ┌─ Entrada ─────────┐   ╭───────────╮   ┌─ Salida ────────────────────┐
  │ …                 │──▶│  PROCESO  │──▶│ …                           │
  │ …                 │   ╰───────────╯   │ …                           │
  └───────────────────┘   (pentágono)     └─────────────────────────────┘

  ┌─ Indicador ───────────────────┐   ┌─ Riesgos del Proceso ───────────┐
  │ …                             │   │ F-SG-23 │ Matriz de Riesgos …   │
  └───────────────────────────────┘   └─────────┴───────────────────────┘

  ┌─ Responsabilidad y Autoridad ─┐   ┌─ Interacción ───────────────────┐
  │ Puestos │ Competencia         │   │ <proceso> │ <proceso>            │
  │─────────┼─────────────────────│   │ <proceso> │ <parte interesada>   │
  └─────────┴─────────────────────┘   └───────────┴──────────────────────┘
```

**No hay pie de página ni leyenda de confidencialidad** — a diferencia del resto
de los formatos, que son `.docx`/`.xlsx`. Éste es una presentación: se proyecta.

---

## 2 · Qué es, y por qué importa que sea de la Fase 02

El F-SG-05 es **el mapa de procesos del cliente**: lo que ISO 9001 §4.4 pide
(«determinar los procesos, sus entradas, salidas, secuencia e interacción,
criterios, recursos, responsabilidades y riesgos»). Es literalmente la tabla
`procesos` de la Fase 02, más tres bloques que hoy no tienen dónde vivir.

Y es la pieza de la que **cuelga media app**:

- El **programa anual** del `F-SG-09` se arma por proceso (`programa_procesos`),
  y su columna «valor» —del servicio vs de soporte— es un juicio sobre esta
  ficha.
- La **agenda** de una auditoría (`auditoria_procesos`, `auditoria_agenda.area`)
  recorre procesos.
- Un **hallazgo** apunta a un proceso (`hallazgos.proceso_id`).
- Los **riesgos** y los **indicadores** de la Fase 02 cuelgan de un proceso.

⚠️ **Es decir: el F-SG-05 es la entrada de todo lo demás, y llega el octavo.** No
es un problema —el modelo aguantó— pero explica por qué tres de sus nueve bloques
no tienen columna: se dedujeron los que hacían falta aguas abajo, no los que el
formato pide.

---

## 3 · Mapeo campo por campo contra `procesos`

| Bloque del formato | Dónde vive hoy | Estado |
|---|---|---|
| **PROCESO** (pentágono) | `procesos.nombre` | ✅ |
| — | `procesos.codigo` | ✅ Existe, y el formato **no lo usa**: el cliente nombra sus procesos, no los numera. Se queda opcional |
| — | `procesos.tipo` (`estrategico`/`operativo`/`soporte`) | ✅ El formato **no lo trae**. Es clasificación nuestra, y por eso el valor del `F-SG-09` se **guarda** en vez de derivarse (CLAUDE.md) |
| **Entrada** (lista) | `procesos.entradas` `text` | ⚠️ Es una **lista**, hoy es un párrafo. Ver §4·1 |
| **Salida** (lista) | `procesos.salidas` `text` | ⚠️ Igual |
| **Planificación** (código + procedimiento) | `documentos` con `proceso_id` | ✅ **Ya se puede**: `documentos.proceso_id` existe desde F02·B2 y `documentos.codigo` es justo la columna «Código». Es una consulta, no una columna nueva |
| **Indicador** (lista) | `indicadores` con `proceso_id` | ✅ Tabla completa, y con más de lo que el formato pide (`meta`, `sentido`, `frecuencia`) |
| **Riesgos del Proceso** | `riesgos` con `proceso_id` | ✅ Tabla completa. En once de doce fichas el bloque **sólo referencia al `F-SG-23`** — la matriz, que es nuestra tabla. Ver §8·2 |
| **Responsabilidad y Autoridad** (puesto + competencia) | ❌ **No existe** | Ver §4·2 |
| **Recursos** (materiales/equipo/…) | ❌ **No existe** | Ver §4·3 |
| **Interacción** (con qué procesos y partes) | ❌ **No existe** | Ver §4·4 |
| — | `procesos.objetivo` | ✅ Existe, y el formato **no lo trae**. Es nuestro, y está bien: es lo que el `F-SG-19` («Procesos, Indicadores y Objetivos») guarda del otro lado |
| — | `procesos.dueno_contacto_id` | ✅ Existe. El formato lo resuelve con la tabla de puestos, sin nombrar a nadie — misma razón que el `F-SG-06` (§4·2) |

**Cinco de nueve bloques ya están cubiertos, y tres de los cinco por tablas
enteras.** El modelo de la Fase 02 se sostuvo contra un formato que no había
visto.

---

## 4 · Los cuatro huecos que descubre

Ninguno bloquea la Fase 04. Se anotan para que no se redescubran tarde, y **tres
de los cuatro son de la Fase 02**.

### 4·1 · `entradas` y `salidas` son listas, no párrafos

`procesos.entradas` y `.salidas` son `text`. En el formato son **listas de
renglones**, y la mitad de los renglones son **referencias a documentos con
código** (`F-CO-01 Orden de compra`, `F-OP-02 Levantamiento de Obra`).

⚠️ **Y las salidas de un proceso son las entradas de otro.** `F-CO-01 Orden de
compra` es salida de Compras y entrada de Transporte y Almacén; `F-OP-18` es
salida de Operaciones y entrada de Administración. Eso no es una lista de texto:
es el grafo del sistema de gestión, y es de donde sale el diagrama de tortuga que
un certificador pide.

**Recomendación: no tocarlo todavía.** Un `text` con un renglón por línea imprime
la ficha igual de bien, y convertirlo en tabla hija (`proceso_flujos`, con
`documento_id` nullable para lo que no tiene código) sólo se paga cuando alguien
quiera navegar el grafo. **Es Fase 02 y no urge**; se anota aquí para que la
decisión se tome a la vista del formato y no de memoria.

### 4·2 · «Responsabilidad y Autoridad» — puesto + competencia

El bloque más ausente, y el que enlaza tres fases:

| Puesto | Competencia |
|---|---|
| Encargado de Compras | Licenciatura en relaciones internacionales, finanzas, comercio, afín. |
| Auxiliar de Compras | Preparatoria, bachillerato… titulado, carrera trunca o finalizada sin título. |

Es el **perfil de puesto**, y es lo que ISO 9001 §7.2 llama competencia. Enlaza:

- Con el **`F-SG-06`** y su «Puesto Responsable» — el hueco 6, que se dio por
  resuelto con `contactos.puesto`. ✅ Sigue resuelto **para nombrar** al
  responsable, pero esta ficha muestra que el puesto también es una entidad con
  requisitos propios, no sólo un campo de texto en un contacto.
- Con el **`F-RH-03` Descripción de Puesto** del cliente (§6).
- Con la **Fase 05**, que ya planea `asistentes.puesto` y las constancias DC-3: la
  capacitación existe para cerrar la brecha entre la competencia requerida y la
  que hay.

**Recomendación: no crear `puestos` todavía.** Es una tabla de catálogo por
organización (`org_id`, `nombre`, `competencia`, `proceso_id`) barata de añadir, y
es tentadora — pero hasta que la Fase 05 la consuma no la pinta nadie, y eso es
un interruptor muerto (regla 11). Se deja escrita aquí y se decide **con la Fase
05**, donde `dnc` y `asistentes` le dan uso el mismo día.

### 4·3 · «Recursos» — cuatro a seis renglones de texto

`Computadora · Vehículo · Impresora · EPP`. Es el inventario mínimo del proceso,
y lo pide ISO 9001 §7.1.

Es el hueco **más barato y menos urgente**: una columna `recursos text` en
`procesos`, con un renglón por línea, y la ficha imprime. No hay nada aguas abajo
que lo consulte. **Va con la Fase 02 el día que se imprima la ficha, no antes.**

### 4·4 · «Interacción» — con qué procesos y con qué partes interesadas

Dos a once entradas por ficha, y **mezcla dos cosas distintas**:

- **Procesos internos**: `Dirección`, `Operaciones`, `SGC`, `Compras`…
- **Partes interesadas externas**: `Clientes`, `Proveedores`, `Contratistas`,
  `Empleados`.

⚠️ Y las externas apuntan a un formato que el cliente ya tiene: **`F-SG-22`
Partes Interesadas** (§6). O sea que la interacción externa no es texto libre; es
una FK a un catálogo que todavía no existe en nuestro modelo.

**Recomendación: aplazado, y con motivo.** La relación proceso↔proceso es
simétrica y el original la captura **inconsistentemente** (§8·4), así que
digitalizarla tal cual copiaría el error. El día que se construya, es
`proceso_interacciones (proceso_id, otro_proceso_id | parte_id)` y se **deriva**
del grafo de entradas/salidas del §4·1 en vez de capturarse dos veces.

---

## 5 · Lo que SÍ aporta a la Fase 04 — `fuente_nc`, con evidencia

> ✅ **CONSTRUIDO el 2 sep 2026**, el mismo día que llegó este documento:
> `supabase/migrations/20260902120000_fuente_de_no_conformidad.sql` (F04·B0).
> Probada en Docker con las catorce anteriores en orden y con datos sembrados
> antes de aplicarla: **41 comprobaciones**, veinte de regresión.
> ✅ **Aplicada el 7 sep 2026** (tarea `E00`).
>
> ⚠️ **Y los once valores no bastan** (hueco 15): `P-SG-05` llegó ese mismo día y
> su §5.1 tabula **nueve etapas**, de las que estos once sólo cubren cinco. El
> razonamiento de abajo sigue siendo correcto —cada valor tiene su formato
> detrás—; lo que falló fue **dar por completo un catálogo derivado de un mapa
> documental cuando el procedimiento que lo enumera todavía no había llegado**.
>
> Lo que sigue es el razonamiento con el que se escribió; se conserva porque es
> el que justifica cada uno de los once valores.

El **hueco 6** del [índice](README.md) lleva abierto desde el 30 ago 2026, y es el
único de los diez que sigue en pie:

> `hallazgos.auditoria_id` es **NOT NULL**, así que hoy *todo* hallazgo cuelga de
> una auditoría — y una NC de una queja no tiene dónde vivir. Hay que decidirlo
> **antes** de la Fase 04.

Lo que faltaba no era la decisión de esquema: era **saber qué valores lleva la
lista**, sin inventarlos. El catálogo documental del §6 los da, porque cada fuente
de no conformidad del cliente tiene su formato con nombre y número:

| Valor propuesto | De dónde sale, en los documentos del cliente |
|---|---|
| `auditoria_interna` | `F-SG-11` · `F-SG-12` · `P-SG-03`. **El caso de hoy** |
| `auditoria_externa` | La del organismo certificador, con Summit acompañando: `auditorias.tipo = 'certificacion_acompanamiento'`. No tiene formato del cliente porque el documento lo emite el certificador |
| `queja_cliente` | `F-SG-08` Control y Seguimiento a Quejas y Sugerencias · `F-SG-10` Registro de Atención a Quejas · `P-SG-07` |
| `servicio_no_conforme` | `P-SG-02` Control de Servicio No Conforme · `F-SG-14` · `F-AM-05` Gestión de material no conforme |
| `revision_direccion` | `F-SG-18` Minuta de Revisión por la Dirección |
| `seguimiento_interno` | `F-SG-26` Checklist Seguimiento Interno |
| `indicador` | `F-SG-15` Desempeño de los Procesos del SGC · `F-SG-19` Procesos, Indicadores y Objetivos. Un indicador bajo meta **es** una no conformidad potencial |
| `auditoria_proveedor` | `auditorias.tipo = 'proveedor'` — la auditoría que la firma le hace a un proveedor del cliente |
| `evaluacion_proveedor` | `P-CO-02` Selección y Evaluación de Proveedores, **sin auditoría de por medio** |
| `incidente` | Sin formato en este cliente. Va porque en los clientes de STPS/PC de Summit es la fuente número uno |
| `otro` | La válvula. Con `fuente_detalle text` al lado |

⚠️ **Once valores, y nueve tienen un documento del cliente detrás.** Eso convierte
`fuente_nc` de una lista inventada en una lista **derivada**, que es la diferencia
entre un CHECK que aguanta y uno que hay que abrir con una migración en tres
meses.

### El esquema, y sus tres consecuencias

**Se aflojó `auditoria_id` a nullable y se añadió `fuente_nc` NOT NULL**, que es
la opción que el `F-SG-06` §4 ya prefería («más simple y no rompe nada
existente»). Lo que quedó, con **tres** CHECK y no uno:

```sql
alter table public.hallazgos alter column auditoria_id drop not null;
alter table public.hallazgos add column fuente_nc text, add column fuente_detalle text;

-- El relleno DERIVA la fuente de auditorias.tipo; no la pone toda en interna.
update public.hallazgos h
   set fuente_nc = case a.tipo
                     when 'certificacion_acompanamiento' then 'auditoria_externa'
                     when 'proveedor'                    then 'auditoria_proveedor'
                     else                                     'auditoria_interna' end
  from public.auditorias a where a.id = h.auditoria_id;

alter table public.hallazgos
  alter column fuente_nc set default 'auditoria_interna',
  alter column fuente_nc set not null;

alter table public.hallazgos
  add constraint hallazgos_fuente_valida check (fuente_nc in (
    'auditoria_interna','auditoria_externa','auditoria_proveedor',
    'queja_cliente','servicio_no_conforme','revision_direccion',
    'seguimiento_interno','indicador','evaluacion_proveedor','incidente','otro')),
  add constraint hallazgos_fuente_coherente check (
    (auditoria_id is not null)
    = (fuente_nc in ('auditoria_interna','auditoria_externa','auditoria_proveedor'))),
  add constraint hallazgos_item_solo_con_auditoria check (
    item_id is null or auditoria_id is not null);
```

⚠️ **Dos cosas cambiaron respecto de la primera propuesta, al escribirla:**

- **`proveedor` se partió en dos.** `auditoria_proveedor` (hay auditoría) y
  `evaluacion_proveedor` (no la hay). Con un solo valor, el CHECK de coherencia
  no podía ser una partición limpia: `auditorias.tipo` ya incluye `'proveedor'`,
  así que un hallazgo de una auditoría a proveedor tiene `auditoria_id` y el
  valor tenía que caer del lado de las que sí la tienen.
- **El CHECK no compara contra `'auditoria_interna'` a secas.** Compara contra
  las **tres** fuentes de auditoría, porque `auditorias.tipo` también tiene
  `certificacion_acompanamiento`. Con la versión de la propuesta, un hallazgo de
  un acompañamiento a certificación —que ya existe en la base del cliente— habría
  sido imposible de guardar.

⚠️ **Tres cosas se rompían si no se tocaban en la misma migración.** Ninguna era
grave, y las tres se veían venir sólo mirando el código de la Fase 03:

1. **El folio.** ✅ `sellar_folio_hallazgo()` leía
   `select folio from auditorias where id = new.auditoria_id` y **lanzaba `23503`
   si no existía**. Ahora tiene dos ramas: la de siempre, y `NC-2026-007` contada
   **por organización y año** con su propio `pg_advisory_xact_lock` y la misma
   regla de **renumerar en vez de rechazar** — la NC de una queja también se
   levanta sin señal.
   ⚠️ **Y como cuelga de `org_id`, la partición de pruebas sale gratis**: una
   organización de demostración es otra organización, al revés que el folio de
   una auditoría, que es el consecutivo de la firma y `A10` tuvo que partir a
   mano. El prefijo `DEMO-NC-` se conserva sólo para poder contestar «¿esto que
   estoy borrando es del cliente o es de mentira?».
2. **`org_id`.** ✅ Lo ponía `heredar_org_de_la_auditoria()`, que **comparten seis
   tablas más**. Se dejó intacta y `hallazgos` estrena
   `resolver_org_del_hallazgo()`: de la auditoría cuando la hay, de la fila cuando
   no, con la política de INSERT decidiendo si esa organización es tuya. **El
   candado no se aflojó, cambió de sitio** — y encima quedó que en un UPDATE sin
   auditoría la `org_id` ya no se mueve.
   ⚠️ **El trigger conserva su nombre**, `hallazgos_org`: Postgres dispara los
   BEFORE en orden alfabético y de ahí depende que `hallazgos_valida` compare
   contra una `org_id` ya puesta.
3. **La lista de verificación y la precarga.** ⚠️ **Esto es lo único que queda
   pendiente, y es de B1.** `item_id` ya era nullable, y se le puso el CHECK que
   le faltaba —una NC sin auditoría no puede citar el punto de la lista de otra—.
   Lo que sigue abierto es `siguienteConsecutivo`, que cuenta sobre la caché **por
   auditoría**: con una serie por organización cuenta sobre otra clave, y esa
   clave tiene que entrar en `piezasDeLaPrecarga()` o el folio no sale sin red
   (§8.11 y CLAUDE.md). **No urge todavía porque no hay pantalla que levante una
   NC sin auditoría**; el día que la haya, es lo primero.

⚠️ **Y una cuarta que apareció al escribirla:** el historial. Reclasificar la
**fuente** mueve el hallazgo dentro o fuera del informe de una auditoría, así que
`registrar_historial_hallazgo()` ahora sigue también `fuente_nc`, `fuente_detalle`
y `auditoria_id`. Sin esos renglones, una NC podría entrar al `F-SG-12` de una
auditoría ya emitida sin dejar rastro de que antes era una queja.

**Esto fue lo primero de la Fase 04 y fue antes que `acciones`.** Una acción
cuelga de un hallazgo; si el hallazgo todavía no sabe nacer de una queja, la mitad
del ciclo de acciones nace amputado.

---

## 6 · El catálogo documental completo del cliente

Lo trae la ficha del proceso **Sistema de Gestión de Calidad** (§7·2), que lista
todo lo que entra y sale del SGC. Es el mapa más completo que la firma ha
entregado, y vale por sí solo:

### Procedimientos del SGC — los ocho, completos

| Código | Nombre | Nos toca |
|---|---|---|
| `M-SG-01` | Manual del Sistema de Gestión de Calidad | — |
| `P-SG-01` | Control de Información Documentada | **F02·B2** ✅ construido |
| `P-SG-02` | Control de Servicio No Conforme | F04 · fuente de NC (§5) |
| `P-SG-03` | Auditorías Internas | **F03** ✅ [transcrito](P-SG-03_procedimiento.md) |
| `P-SG-04` | Identificación y Evaluación de Riesgos y Oportunidades | F02 · `riesgos` |
| `P-SG-05` | **Acciones Correctivas** | ❌ **F04. EL QUE FALTA** |
| `P-SG-06` | Medición, Análisis y Mejora Continua | F02 · `indicadores` |
| `P-SG-07` | Evaluación de Satisfacción de Clientes | F04 · fuente de NC |
| `P-SG-08` | Comunicación | — |

⚠️ **Ahora se sabe que `P-SG-05` existe y cómo se llama exactamente.** Antes era
una inferencia del `P-SG-03`; ahora está en el mapa documental del cliente, entre
el 04 y el 06. Se puede pedir por su nombre.

### Formatos del SGC — 24 de 26 identificados

| Código | Nombre | Estado |
|---|---|---|
| `F-SG-01` | Lista Maestra de Documentos Internos y Externos | F02 · lo genera `documentos` |
| `F-SG-02` | Distribución de Copias Controladas | No planeado |
| `F-SG-03` | Lista de Asistencia o Implementación | ✅ [transcrito](F-SG-03_lista_de_asistencia.md) · F03·B6d |
| `F-SG-04` | *(no aparece)* | Desconocido |
| **`F-SG-05`** | **Ficha Técnica de Proceso** | **Este documento** |
| `F-SG-06` | Reporte de No Conformidad | ✅ [transcrito](F-SG-06_reporte_no_conformidad.md) · F03 + F04 |
| `F-SG-07` | Análisis de Causa Raíz 5 Por Qué | ✅ [transcrito](F-SG-07_analisis_causa_raiz.md) · **F04·B1** |
| `F-SG-08` | Control y Seguimiento a Quejas y Sugerencias | ❌ F04 · fuente de NC |
| `F-SG-09` | Programa Anual de Auditorías Internas | ✅ [transcrito](F-SG-09_programa_anual.md) · F03·B6 |
| `F-SG-10` | Registro de Atención a Quejas | ❌ F04 · fuente de NC |
| `F-SG-11` | Planeación y Agenda de Auditoría Interna | ✅ [transcrito](F-SG-11_planeacion_y_agenda.md) · F03 |
| `F-SG-12` | Reporte Final de Auditoría Interna | ✅ [transcrito](F-SG-12_reporte_final.md) · F03·B5 |
| `F-SG-13` | Evaluación de Satisfacción al Cliente | No planeado |
| `F-SG-14` | Control de Servicio No Conforme | ❌ F04 · fuente de NC |
| `F-SG-15` | Desempeño de los Procesos del SGC | F02 · `mediciones` |
| `F-SG-16` | **Plan de Mejora** | ❌ **F04** · es `acciones` con `tipo = 'mejora'` |
| `F-SG-17` | **Base de Datos de No Conformidades** | ❌ **F03·B4 + F04** · es el tablero del lunes |
| `F-SG-18` | Minuta de Revisión por la Dirección | ❌ F04 · fuente de NC |
| `F-SG-19` | Procesos, Indicadores y Objetivos | F02 · `procesos` + `indicadores` |
| `F-SG-20` | Minuta de Junta de Calidad | No planeado |
| `F-SG-21` | Análisis de Contexto | No planeado |
| `F-SG-22` | Partes Interesadas | Sin modelo. Ver §4·4 |
| `F-SG-23` | Matriz de Identificación y Evaluación de Riesgos y Oportunidades de Proceso | F02 · `riesgos` ✅ |
| `F-SG-24` | **Gestión de Cambios en SGC y Procesos** | ❌ **F04** · ver abajo |
| `F-SG-25` | *(no aparece)* | Desconocido |
| `F-SG-26` | Checklist Seguimiento Interno | ❌ F04 · fuente de NC |

⚠️ **`F-SG-24` cierra la segunda pregunta de impacto del `F-SG-06`.** El formato
de NC pregunta *«¿Es necesario realizar cambios en el SGC?»* y hasta hoy no se
sabía a dónde apuntaba esa respuesta. Apunta aquí: el cliente tiene un formato de
**gestión de cambios**. O sea que `acciones.cambio_sgc = true` no es una casilla
informativa — **dispara otro documento**. Confirma la columna planeada en el
`F-SG-06` §4·3 y le da destino.

### Los formatos departamentales

Aparecen como entradas y salidas de los otros once procesos. **No son nuestros**
—son del cliente— pero explican qué documentos va a subir a `documentos` y con qué
`codigo`, que es exactamente lo que la pestaña Documentos de `/sistemas` va a
recibir:

| Prefijo | Área | Procedimientos | Formatos vistos |
|---|---|---|---|
| `AD` | Administración | `P-AD-01`, `P-AD-02` | `F-AD-01` … `F-AD-04` |
| `OP` | Operaciones | `P-OP-01` … `P-OP-03` | `F-OP-01` … `F-OP-19` (incluye `F-OP-14` Matriz IPERC) |
| `CO` | Compras | `P-CO-01`, `P-CO-02` | `F-CO-01`, `F-CO-03`, `F-CO-04` |
| `AM` | Transporte y Almacén | `P-AM-01` | `F-AM-01` … `F-AM-08` |
| `CN` | Contaduría | `P-CN-01` | `F-CN-01` … `F-CN-05` |
| `FA` | Facturación | `P-FA-01` | `F-FA-01` |
| `DS` | Diseño | `P-DS-01` | `F-DS-01` |
| `CM` | Comercialización | `P-CM-01` | `F-CM-01`, `F-CM-02` |
| `RH` | Recursos Humanos | `P-RH-01` | `F-RH-02` … `F-RH-07` |
| `MT` | Mantenimiento | `P-MT-01` | `F-MT-01`, `F-MT-02` |

⚠️ **La convención es `<tipo>-<área>-<consecutivo>`**, con el área en dos letras.
No la codifiquemos: `documentos.codigo` es texto libre a propósito, y el siguiente
cliente numerará distinto. Se anota porque **explica el `F-SG-01` Lista Maestra**:
esa lista es un `select` sobre `documentos` ordenado por código, y ya la podemos
generar.

---

## 7 · Los doce procesos, transcritos

Se transcriben completos —son el ejemplo real, y es lo que el original aporta que
un párrafo no—. **Nada de esto se codifica**: es de un cliente de construcción,
igual que «GRUPO ATELIER» en los otros formatos ([`README`](README.md) §1).

### 7·1 · Dirección

| Bloque | Contenido |
|---|---|
| **Planificación** | *(sin código)* Invitación a concurso · Licitación ganada · Prospección de clientes |
| **Recursos** | Carro · Celular · Computadora · Tablet |
| **Entrada** | Licitación ganada para inicio de obra |
| **Salida** | ⚠️ `F-MT-01` Programa de Mantenimiento Preventivo · `F-MT-02` Control Interno de Vehículos · Facturas/Comprobante de Servicio **— errata, ver §8·1** |
| **Indicador** | Reportes de avance de obra · Porcentaje de avance de obra |
| **Riesgos** | Seguimiento → Falla en el seguimiento de actividades · Comunicación → Falta de comunicación con el personal · Tiempo → No cumplir con los tiempos de entrega |
| **Responsabilidad y Autoridad** | Residentes de obra → Le entregan el porcentaje de avance de las obras en curso · Compras → Le solicita el control de gastos de proveedores y contratistas · Facturación → Solicita emitir las facturas correspondientes · Administración → Solicita el seguimiento y armado de los expedientes de las obras |
| **Interacción** | Clientes · Proveedores · Contratistas · Empleados |

### 7·2 · Sistema de Gestión de Calidad

| Bloque | Contenido |
|---|---|
| **Planificación** | `M-SG-01` Manual del SGC · `P-SG-01` Control de Información Documentada · `P-SG-02` Control de Servicio No Conforme · `P-SG-03` Auditorías Internas · `P-SG-04` Identificación y Evaluación de Riesgos y Oportunidades · `P-SG-05` Acciones Correctivas · `P-SG-06` Medición, Análisis y Mejora Continua · `P-SG-07` Evaluación de Satisfacción de Clientes · `P-SG-08` Comunicación |
| **Recursos** | Computadora · Vehículo · Archiveros · Impresora |
| **Entrada** | Requerimientos de cliente interno · `F-SG-03` Lista de Asistencia o Implementación · `F-SG-06` Reporte de No Conformidad · `F-SG-09` Programa Anual de Auditorías Internas · `F-SG-10` Registro de Atención a Quejas · `F-SG-11` Planeación y Agenda de Auditoría Interna · `F-SG-15` Desempeño de los Procesos del SGC · `F-SG-18` Minuta de Revisión por la Dirección · `F-SG-19` Procesos, Indicadores y Objetivos · `F-SG-20` Minuta de Junta de Calidad · `F-SG-22` Partes Interesadas · `F-SG-26` Checklist Seguimiento Interno |
| **Salida** | Nuevo procedimiento, formato · `F-SG-01` Lista Maestra de Documentos Internos y Externos · `F-SG-02` Distribución de Copias Controladas · `F-SG-07` Análisis de Causa Raíz 5 Por Qué · `F-SG-08` Control y Seguimiento a Quejas y Sugerencias · `F-SG-12` Reporte Final de Auditoría Interna · `F-SG-13` Evaluación de Satisfacción al Cliente · `F-SG-14` Control de Servicio No Conforme · `F-SG-16` Plan de Mejora · `F-SG-17` Base de Datos de No Conformidades · `F-SG-21` Análisis de Contexto · `F-SG-23` Matriz de Identificación y Evaluación de Riesgos y Oportunidades de Proceso · `F-SG-24` Gestión de Cambios en SGC y Procesos |
| **Indicador** | % de cumplimiento del programa de capacitación · % de satisfacción del cliente · % de acciones correctivas cerradas |
| **Riesgos** | `F-SG-23` Matriz de Identificación y Evaluación de Riesgos y Oportunidades de Proceso |
| **Responsabilidad y Autoridad** | Coordinador del SGC → Ingeniero industrial, licenciatura en negocios internacionales, administración, gestión empresarial, afín. |
| **Interacción** | Dirección · Operaciones · Administración · Transporte y Almacén · Compras · Mantenimiento · Contaduría · Diseño · Recursos Humanos · Comercialización *(los diez restantes: el SGC toca todo)* |

⚠️ **«% de acciones correctivas cerradas» es el indicador de la Fase 04**, y ya
está escrito por el cliente. Es lo que el widget `acciones_semana` y el cron
diario tienen que poder alimentar.

### 7·3 · Administración

| Bloque | Contenido |
|---|---|
| **Planificación** | `P-AD-01` Planificación de Licitaciones y Concursos · `P-AD-02` Administración |
| **Recursos** | Impresora · Copiadora · Archiveros · Vehículo · Computadora · Scanner |
| **Entrada** | Notificación de Dirección sobre bases · Invitación a concursos · `F-OP-18` Cédula para la Elaboración de Estimación de Obra · `F-OP-19` Generador para la Elaboración de Estimación de Obra · Expedientes de todas las áreas de la organización |
| **Salida** | Expediente para concurso · `F-AD-01` Control de archivo General · `F-AD-02` Relación de Estimaciones · Contratos · `F-AD-03` Resumen de pago de las obras Activas · `F-AD-04` Expediente Final |
| **Indicador** | % de propuestas ganadas sobre el total de propuestas presentadas |
| **Riesgos** | `F-SG-23` |
| **Responsabilidad y Autoridad** | Encargado de Administración → Licenciatura en negocios internacionales, administración, contabilidad o afín. · Administración → Administración, desarrollo de negocios, contaduría o afín; titulado, carrera trunca o finalizada sin título |
| **Interacción** | Dirección · Facturación · Operaciones · Comercialización · Contaduría · SGC · Recursos Humanos |

### 7·4 · Operaciones

| Bloque | Contenido |
|---|---|
| **Planificación** | `P-OP-01` Levantamiento de Obra · `P-OP-02` Ejecución de Obra · `P-OP-03` Cierre de Obra |
| **Recursos** | Computadora · Vehículo · Impresora · EPP |
| **Entrada** | `F-OP-02` Levantamiento de Obra · `F-OP-17` Formato de Catálogo · Requerimientos de Diseño · Contrato · Solicitud comercial |
| **Salida** | `F-OP-01` Reporte Semanal · `F-OP-03` a `F-OP-13` Listas de Verificación de Actividades · `F-OP-14` Matriz IPERC · `F-OP-18` Cédula para la Elaboración de Estimación de Obra · `F-OP-19` Generador para la Elaboración de Estimación de Obra |
| **Indicador** | % de proyectos concluidos sin salidas no conformes · % de costo de materiales desperdiciados · % de cumplimiento del presupuesto asignado para la obra · Evaluación a contratistas |
| **Riesgos** | `F-SG-23` · **`F-OP-14` Matriz IPERC** |
| **Responsabilidad y Autoridad** | Jefe de Operaciones → Licenciatura en arquitectura, ingeniería civil, ingeniería industrial, afín. · Superintendente de Obra → Arquitectura, ingeniería civil, ingeniería industrial, afín; titulado, carrera trunca o finalizada sin título. |
| **Interacción** | Dirección · Contaduría · Administración · Transporte y Almacén · Compras · Recursos Humanos · Diseño · Comercialización · Proveedores · Contratistas · SGC |

⚠️ **El único proceso con dos fuentes de riesgo**: la matriz del SGC y la **IPERC**
(Identificación de Peligros, Evaluación de Riesgos y Controles), que es de
seguridad y salud. `riesgos.tipo` sólo distingue `riesgo`/`oportunidad`; el día
que Summit lleve ISO 45001 a un cliente, esa tabla necesita saber **de qué matriz
viene** cada renglón. **Es Fase 05, y se anota aquí porque es la primera vez que
aparece por escrito.**

### 7·5 · Compras

| Bloque | Contenido |
|---|---|
| **Planificación** | `P-CO-01` Compras · `P-CO-02` Selección y Evaluación de Proveedores |
| **Recursos** | Computadora · Vehículo · Impresora · Scanner |
| **Entrada** | `F-CO-04` Solicitud de pedido · `F-CO-03` Listado de Proveedores · Evaluación de proveedores |
| **Salida** | `F-CO-01` Orden de compra · ⚠️ `F-OP-02` Desempeño de proveedores **— errata, ver §8·1** |
| **Indicador** | % de cumplimiento de las especificaciones de los materiales solicitados por superintendente · Evaluación de proveedores · % de entrega de materiales en tiempo y forma |
| **Riesgos** | `F-SG-23` |
| **Responsabilidad y Autoridad** *(el original rotula «Responsabilidad»)* | Encargado de Compras → Licenciatura en relaciones internacionales, finanzas, comercio, afín. · Auxiliar de Compras → Preparatoria, bachillerato, relaciones internacionales, comercio, finanzas, afín; titulado, carrera trunca o finalizada sin título. |
| **Interacción** | Operación · Transporte y Almacén · Administración · Proveedores · Contaduría · SGC |

### 7·6 · Transporte y Almacén

| Bloque | Contenido |
|---|---|
| **Planificación** | `P-AM-01` Transporte y Almacén |
| **Recursos** | Computadora · Celular · Unidades de transporte · EPP |
| **Entrada** | `F-AM-02` Ingreso de Material a Almacén · `F-CO-01` Orden de compra · `F-AM-07` Movimiento de Material · `F-AM-08` Devoluciones · `F-CO-04` Solicitud de Pedido |
| **Salida** | `F-AM-04` Guía de despacho · `F-AM-01` Control de Inventario · `F-AM-05` Gestión de material no conforme · `F-AM-03` Verificación Vehicular de Salida |
| **Indicador** | % de entrega de materiales en tiempo y forma · % de recuperación de stock mínimo en almacén al término de la obra (equipo, herramientas, EPP) |
| **Riesgos** | `F-SG-23` |
| **Responsabilidad y Autoridad** *(rotulado «Responsabilidad»)* | Encargado de Almacén → Carrera técnica, preparatoria concluida, etc. · Conductor de Vehículo → Carrera técnica, preparatoria concluida, etc. |
| **Interacción** | Operación · Contaduría · Proveedores · Administración · SGC · Mantenimiento · Compras |

### 7·7 · Contaduría

| Bloque | Contenido |
|---|---|
| **Planificación** | `P-CN-01` Contaduría |
| **Recursos** | Impresora · Vehículo · Computadora · Fondos |
| **Entrada** | `F-CN-01` Solicitud de Pago · `F-CN-02` Solicitud de Reembolso · `F-CN-04` Comprobación de Gastos · `F-CO-01` Orden de Compra · `F-CO-04` Solicitud de Pedido |
| **Salida** | ⚠️ `F-CN03` Control de Gastos *(sic, sin el segundo guion)* · `F-CN-05` Nómina |
| **Indicador** | % de cumplimiento del presupuesto asignado para la obra |
| **Riesgos** | `F-SG-23` |
| **Responsabilidad y Autoridad** *(rotulado «Responsabilidad»)* | Encargado de Contaduría → Licenciatura en contaduría, administración de empresas, finanzas, comercio, afín; titulado, carrera trunca o finalizada sin título. · Auxiliar de Contaduría → Licenciatura en negocios internacionales, licenciatura en contaduría, administración de empresas, finanzas, afín; titulado, carrera trunca o finalizada sin título. |
| **Interacción** | Operación · Compras · Administración · SGC · Contratistas |

### 7·8 · Facturación

| Bloque | Contenido |
|---|---|
| **Planificación** | `P-FA-01` Facturación |
| **Recursos** | Impresora · Copiadora · Archiveros · Vehículo · Computadora |
| **Entrada** | Requerimiento de factura · Solicitud de factura y pago por transferencia |
| **Salida** | Facturas · `F-FA-01` Generador de pago por los servicios ejecutados · Anexo de factura de ingreso · Anexo de la factura de egreso |
| **Indicador** | ⚠️ **vacío en el original — ver §8·3** |
| **Riesgos** | `F-SG-23` |
| **Responsabilidad y Autoridad** | Encargado de Administración → Licenciatura en negocios internacionales, administración, contabilidad o afín. |
| **Interacción** | Clientes · Administración · Operaciones · SGC |

### 7·9 · Diseño

| Bloque | Contenido |
|---|---|
| **Planificación** | `P-DS-01` Diseño |
| **Recursos** | Impresora · Copiadora · Computadora · Vehículo |
| **Entrada** | `F-DS-01` Alcances del Proyecto · Requerimientos del cliente · Contrato · `F-OP-02` Levantamiento de Obra |
| **Salida** | Propuesta |
| **Indicador** | N/A |
| **Riesgos** | `F-SG-23` |
| **Responsabilidad y Autoridad** | Jefe de Operaciones → Licenciatura en arquitectura, ingeniería civil, ingeniería industrial, afín. · Superintendente de Obra → Arquitectura, ingeniería civil, ingeniería industrial, afín; titulado, carrera trunca o finalizada sin título. |
| **Interacción** | Administración · SGC · Operaciones · Comercialización |

### 7·10 · Comercialización

| Bloque | Contenido |
|---|---|
| **Planificación** | `P-CM-01` Comercialización |
| **Recursos** | Impresora · Scanner · Computadora · Vehículo |
| **Entrada** | Requerimiento del cliente · `F-OP-02` Levantamiento de Obra · `F-CM-02` Matriz de Requisitos Legales |
| **Salida** | `F-CM-01` Oferta Comercial |
| **Indicador** | N/A |
| **Riesgos** | `F-SG-23` |
| **Responsabilidad y Autoridad** | Dirección → *(vacío)* · Jefe de Operaciones → Licenciatura en arquitectura, ingeniería civil, ingeniería industrial, afín. |
| **Interacción** | ⚠️ Jefe de Operaciones · Dirección · Administración · SGC **— errata, ver §8·4** |

⚠️ **`F-CM-02` Matriz de Requisitos Legales** es lo más cercano que este cliente
tiene a la matriz NOM de la **Fase 05**, y vive en Comercialización porque para
una constructora los requisitos legales entran con el contrato. Anotado: cuando
se construya `org_noms`, este formato es el punto de comparación.

### 7·11 · Recursos Humanos

| Bloque | Contenido |
|---|---|
| **Planificación** | `P-RH-01` Recursos Humanos y Competencia |
| **Recursos** | Impresora · Copiadora · Archiveros · Vehículo · Computadora |
| **Entrada** | `F-RH-02` Solicitud de Personal · `F-RH-05` Evaluación de Ambiente de Trabajo · `F-RH-06` Examen de Conocimiento · `F-RH-07` Listado de Datos y Documentos de personal |
| **Salida** | `F-RH-03` Descripción de Puesto · ⚠️ `R-RH-04` Programa de Capacitación *(sic, «R-» en vez de «F-»)* · Expedientes de Personal · Resultados de Ambiente Laboral · Resultados de Examen de Conocimientos |
| **Indicador** | Cumplimiento del Programa de Capacitación |
| **Riesgos** | `F-SG-23` |
| **Responsabilidad y Autoridad** | ⚠️ Coordinador del SGC → Ingeniero industrial, licenciatura en negocios internacionales, administración, gestión empresarial, afín. **— errata probable, ver §8·5** |
| **Interacción** | Administración · Compras · Operación · Contaduría · SGC · Dirección · Transporte y Almacén · Comercialización · Mantenimiento · Facturación · Diseño *(los once restantes)* |

⚠️ **`F-RH-03` Descripción de Puesto y `F-RH-04` Programa de Capacitación son la
Fase 05 entera**, vistos desde el lado del cliente: el primero es el catálogo de
puestos del §4·2 y el segundo es nuestro `dnc`.

### 7·12 · Mantenimiento

| Bloque | Contenido |
|---|---|
| **Planificación** | `P-MT-01` Mantenimiento |
| **Recursos** | Impresora · Copiadora · Archiveros · Vehículo · Computadora |
| **Entrada** | `F-MT-01` Programa de Mantenimiento Preventivo · Solicitud de mantenimiento a equipos de cómputo o a la infraestructura · Solicitud de mantenimiento a los vehículos |
| **Salida** | `F-MT-01` Programa de Mantenimiento Preventivo · `F-MT-02` Control Interno de Vehículos · Facturas/Comprobante de Servicio del Mantenimiento |
| **Indicador** | Cumplimiento del Programa de Mantenimiento |
| **Riesgos** | `F-SG-23` |
| **Responsabilidad y Autoridad** | Auxiliar de Compras → Preparatoria, bachillerato, relaciones internacionales, comercio, finanzas, afín; titulado, carrera trunca o finalizada sin título. |
| **Interacción** | Operación · Transporte y Almacén · SGC |

⚠️ **`F-MT-01` es entrada y salida de sí mismo**, y está bien: el programa entra
como plan y sale actualizado con lo ejecutado. Es el mismo patrón que nuestro
`programa_auditorias`.

---

## 8 · Erratas del original — y por qué se anotan

El deck tiene seis inconsistencias. **Se anotan porque la app va a digitalizar
esto, y una app que copia fielmente propaga el error con más autoridad que el
PowerPoint.** Ninguna se corrige por nuestra cuenta: se le preguntan al dueño.

1. **La «Salida» de Dirección es la de Mantenimiento** (§7·1). Los tres renglones
   —`F-MT-01`, `F-MT-02`, Facturas/Comprobante— son idénticos a los de la ficha
   12. Es una diapositiva copiada a la que no le cambiaron ese bloque. **Dirección
   se quedó sin salidas.** Y en Compras (§7·5) la salida dice `F-OP-02 Desempeño de
   proveedores`, pero `F-OP-02` es «Levantamiento de Obra» en otras cuatro fichas:
   casi seguro es `F-CO-02`.
2. **Sólo Dirección lista riesgos concretos**; los otros once remiten al
   `F-SG-23`. No es errata, es evolución del formato — y **confirma nuestro
   diseño**: los riesgos viven en una matriz aparte (`riesgos`), no dentro de la
   ficha. La ficha los *consulta*. Cuando la imprimamos, el bloque se llena con un
   `select` de `riesgos where proceso_id = …`, no con texto capturado.
3. **Facturación no tiene indicador** (§7·8), y Diseño y Comercialización dicen
   `N/A`. Tres de doce procesos sin manera de medirse. **Un auditor levanta una NC
   por eso** (ISO 9001 §9.1.1). Es exactamente el tipo de hallazgo que la app
   debería poder detectar sola — se anota para la **Fase 08** (`salud_sgc`).
4. **«Interacción» mezcla procesos con puestos.** En Comercialización (§7·10) el
   primer renglón dice «Jefe de Operaciones», que es un puesto, no un proceso. Y
   las relaciones **no son simétricas**: Compras se interacciona con Contaduría,
   pero Contaduría no lista a Compras en cuatro de las fichas donde debería.
   ⚠️ **Ésta es la razón concreta para no digitalizar el bloque tal cual** (§4·4):
   capturarlo a mano garantiza que quede así.
5. **Recursos Humanos y Mantenimiento tienen el puesto equivocado** (§7·11,
   §7·12): RH dice «Coordinador del SGC» y Mantenimiento dice «Auxiliar de
   Compras». Puede ser real —en una empresa chica una persona lleva dos áreas— o
   puede ser copiar-pegar. Hay que preguntar.
6. **Códigos mal escritos**: `F-CN03` sin el segundo guion (§7·7) y `R-RH-04` con
   `R-` en vez de `F-` (§7·11). Trivial, pero es justo lo que rompe un `upsert`
   por `codigo` si algún día se importa esta lista.

⚠️ **Y la lección general, que ya es la tercera vez que aparece:** los formatos de
la firma son artefactos vivos con erratas, no especificaciones. **Manda el
formato sobre la prosa** ([`README`](README.md) · precedente del `F-SG-09`), pero
el formato tampoco es infalible — cuando dos fichas se contradicen entre sí, se
pregunta.

---

## 9 · Al imprimirlo

**No hay nada que imprimir todavía, y es la conclusión correcta.**

Los cuatro documentos de `src/lib/plantillas/` existen porque la firma **entrega**
esos papeles: el programa anual se aprueba, la agenda se manda, la lista de
asistencia se firma con pluma, el informe se le da al cliente. La ficha técnica
de proceso es distinta: **es un entregable de consultoría, no de auditoría**, y se
entrega una vez al montar el sistema de gestión.

Cuando se construya —Fase 02, con los tres huecos del §4 cerrados— comparte todo
con lo que ya está: `membrete()`, `pieConfidencial()`, `tituloSeccion()` y
`rotulo()` de `impresion.ts`, la misma cadena en el `<iframe sandbox>`, `esc()` en
cada interpolación. **Una página por proceso, apaisada**, que es como está el
original.

⚠️ **El pentágono central se dibuja con CSS, no con una imagen.** Un `clip-path`
sobre un `div` con el nombre del proceso; ya se decidió que no hay librería de
gráficas (`F-SG-12` §«Gráficos de resultados») y esto no es motivo para cambiarlo.
