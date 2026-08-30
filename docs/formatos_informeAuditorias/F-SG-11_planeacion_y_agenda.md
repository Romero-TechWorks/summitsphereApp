# F-SG-11 · Planeación y Agenda de Auditoría Interna

> Transcripción del `.xlsx` que entregó Summit (30 ago 2026). Versión vigente 0,
> emitido el 10-Feb-2025. Dos hojas: *Planeación y Agenda* y *Control de Cambios*.
>
> **Lo genera el Coordinador del SGC y se envía por correo al personal antes de la
> visita** (P-SG-03 §5.3). Para nosotros ya está construido —F03·B1— y lo que
> falta es **imprimirlo**: es un entregable que el cliente recibe, no una pantalla.
>
> Los «huecos» numerados que se citan aquí están en el [índice y análisis](README.md).

---

## 1 · Encabezado del formato

Va en todas las páginas, como encabezado de la hoja:

```
[logo]  Planeación y Agenda de Auditoría Interna   Fecha de Elaboración: 10-Feb-2025
        F-SG-11                                    Versión vigente: 0
                                                   Fecha de actualización: 10-Feb-2025
```

⚠️ El logo y el código del formato son **de la firma que emite**, no del cliente
auditado. En nuestra app salen de `config_firma` (`razon_social`, `logotipo_url`)
y de una constante del código para el número de formato y su versión.

## 2 · Bloque de planeación

Título de la hoja: **PLANEACIÓN Y AGENDA DE AUDITORIA INTERNA**

| Campo | Ejemplo real del archivo | De dónde sale |
|---|---|---|
| **Fecha** | 14-Feb-2025 | Fecha de emisión del plan. `auditorias.creado_en`, o la del día que se imprime |
| **Objetivo** | «Evaluar el grado de cumplimiento contra lo establecido en el SGC.» | ⚠️ **`auditorias.objetivo` NO EXISTE** — hueco 1 |
| **Alcance** | «Todo el personal de GRUPO ATELIER, compuesto por ATELIER TEA, MODULOR y PETRA.» | `auditorias.alcance` |
| **Criterios** | «Norma ISO 9001:2015, así como los procedimientos, políticas, indicadores y formatos establecidos en el SGC.» | `auditorias.criterios` + las normas de `auditoria_normas` |
| **Fecha ejecución** | «2/27/2025 y 2/28/2025» | `auditorias.fecha_inicio` – `fecha_fin`, y las `fecha` distintas de `auditoria_agenda` |
| **Procesos** | «Comercialización, Operación, Diseño, Compras, Mantenimiento, Transporte y Almacén, Administración, Recursos Humanos, Facturación, Contaduría, Sistema de Gestión de Calidad.» | `auditoria_procesos` → `procesos.nombre`, en lista separada por comas |
| **Equipo auditor** | «Auditor Líder Juan Manuel García Maya (JMGM)» · «Observadora Amara Fernanda Romero Cruz (AFRC)» | `auditoria_equipo` + `usuarios.nombre`, con el papel delante |

⚠️ **El «Alcance» del ejemplo son SITIOS, no procesos.** «ATELIER TEA, MODULOR y
PETRA» son las tres unidades del grupo. Nosotros tenemos `auditoria_sitios` para
eso, y `auditorias.alcance` para la redacción libre. Al imprimir conviene
componer: el texto de `alcance` y, debajo, los sitios de `auditoria_sitios` — así
el plan dice a qué planta va el auditor, que es lo que el cliente necesita saber.

### 2.1 · Las iniciales del auditor — se derivan, no se guardan

El formato escribe el nombre completo con las iniciales entre paréntesis, y
después usa **sólo las iniciales** en cada renglón de la agenda («JMGM/AFRC»),
porque la columna es angosta.

No hace falta una columna nueva: se derivan de `usuarios.nombre` tomando la
primera letra de cada palabra, en mayúscula, ignorando partículas (`de`, `del`,
`la`, `los`, `y`). «Juan Manuel García Maya» → `JMGM`.

⚠️ Dos auditores pueden colisionar en las mismas iniciales. En un equipo de dos o
tres es raro y el nombre completo está arriba, en el bloque de planeación, así que
la colisión se resuelve leyendo. No vale la pena una columna para eso.

## 3 · La agenda

Se repite un bloque **por cada día** de la auditoría. Encabezado del bloque:

```
H = HORARIO    A = AUDITOR                 [fecha del día]        Comentarios
No. | Áreas | Responsable | (H/A) | (horario / auditores) | Comentarios
```

Cada renglón de la agenda ocupa **dos filas del papel**: la de arriba lleva `H` y
el horario, la de abajo lleva `A` y las iniciales de los auditores. Es una
peculiaridad de presentación del Excel, no del dato — al imprimirlo nosotros son
dos columnas normales.

### 3.1 · Ejemplo real completo

**Día 1 — 27-Feb-2025**

| No. | Área | Responsable | Horario | Auditores | Comentarios |
|---|---|---|---|---|---|
| 1 | Reunión de Apertura | Todos | 9:00–9:30 | Todos | Todo el personal de GRUPO ATELIER |
| 2 | Comercialización | Jefe de Operaciones / Dirección | 9:30–10:15 | JMGM/AFRC | |
| 3 | Administración | Encargado de Administración | 10:15–11:15 | JMGM/AFRC | |
| 4 | Diseño | Jefe de Operaciones / Superintendente | 11:15–12:00 | JMGM/AFRC | |
| 5 | Operación | Jefe de Operaciones / Superintendente | 12:00–14:00 | JMGM/AFRC | |
| — | **COMIDA** | | 14:00–15:00 | | |
| 6 | Compras | Encargado de Compras / Auxiliar de Compras | 15:00–16:00 | JMGM/AFRC | |
| 7 | Transporte y Almacén | Encargado de Almacén | 16:00–16:45 | JMGM/AFRC | |

**Día 2 — 28-Feb-2025**

| No. | Área | Responsable | Horario | Auditores | Comentarios |
|---|---|---|---|---|---|
| 8 | Mantenimiento | Auxiliar de Compras | 9:30–10:15 | JMGM/AFRC | |
| 9 | Contaduría | Contadora | 10:15–11:15 | JMGM/AFRC | |
| 10 | Facturación | Encargado de Administración | 11:15–12:00 | JMGM/AFRC | |
| 11 | SGC | Coordinador del SGC | 12:00–14:00 | JMGM/AFRC | |
| 12 | Recursos Humanos | Coordinador del SGC | 14:00–15:00 | JMGM/AFRC | |
| 13 | Reunión de Cierre | Todos | 15:30 | JMGM/AFRC | Todo el personal de GRUPO ATELIER |

### 3.2 · Mapeo a `auditoria_agenda`

| Columna del formato | Columna de la tabla |
|---|---|
| No. | `orden` |
| *(el día del bloque)* | `fecha` |
| Áreas | `tema`, y `proceso_id` cuando el área es un proceso capturado |
| Responsable | `auditado` (texto libre) y `contacto_id` si se sabe quién |
| Horario | `hora_inicio` – `hora_fin` (`time`, horario de pared) |
| Auditores | `auditor_id` |
| Comentarios | `nota` |
| *(no está en el formato)* | `cumplido`, `sitio_id` |

**Cuatro cosas que el ejemplo real enseña y que el código tiene que aguantar:**

1. ⚠️ **«Responsable» son PUESTOS, no personas.** «Jefe de Operaciones»,
   «Encargado de Almacén». Es exactamente el motivo por el que
   `auditoria_agenda.auditado` es texto libre: la agenda se manda semanas antes,
   cuando todavía no se sabe el nombre de quien va a estar. La decisión ya estaba
   tomada y el ejemplo la confirma.
2. ⚠️ **«COMIDA» es un renglón sin número, sin responsable y sin auditor.** Un
   renglón de agenda tiene que poder existir con `tema` y horas y nada más. Ya
   funciona —sólo `tema` y `fecha` son NOT NULL—, pero al imprimir hay que dejar
   las celdas vacías en blanco, no poner guiones ni «sin asignar».
3. ⚠️ **Apertura y cierre son renglones de la agenda**, el primero y el último, y
   su responsable es «Todos». No hacen falta campos aparte en `auditorias`: son
   `auditoria_agenda` como cualquier otro renglón, y por ahí es por donde el
   informe F-SG-12 saca su sección «Reunión de Apertura».
4. ⚠️ **Todos los renglones llevan a los DOS auditores.** Nuestro `auditor_id` es
   uno solo — hueco 8. En la práctica el equipo entero recorre junto, así que la
   regla de impresión es: si `auditor_id` viene vacío, se imprimen las iniciales
   **del equipo completo**; si viene lleno, sólo las de ése. Cubre el caso real
   sin tocar el esquema.

## 4 · Hoja «Control de Cambios»

Tabla de tres columnas — Fecha · Edición · Cambio realizado — con un solo
renglón: `10-Feb-2025 · 0 · Se da de alta el formato`.

Es el control de versiones **del formato**, no de la auditoría. En nuestra app no
se imprime: el versionado del formato vive en el código, y quién cambió qué en la
auditoría vive en `audit_logs`, que es más fuerte.

## 5 · Lo que este formato NO trae y nosotros sí

No es un hueco — es sitio donde la app ya da más que el papel, y conviene no
perderlo al imprimir:

- **La lista de verificación.** P-SG-03 §5.3 la menciona como opcional y el Excel
  no le dedica ni una celda. Nosotros la generamos del alcance y es la mitad del
  producto.
- **`cumplido` por renglón.** El Excel es un plan; nunca vuelve a tocarse para
  registrar qué pasó. Nuestro `cumplido` es lo que alimenta la «agenda cumplida»
  del informe.
- **Los sitios como tabla** (`auditoria_sitios`), en vez de una frase dentro del
  alcance.
