# Documentos que faltan por pedir al cliente

> Derivado el 7 sep 2026 de la **`F-SG-01` Lista Maestra de Documentos Internos y
> Externos**, que es el catálogo autoritativo del propio cliente.
>
> **105 documentos en el catálogo · 60 entregados · 45 faltan.** Ninguno de los
> entregados está fuera del catálogo, así que la carpeta es un subconjunto limpio
> y esta cuenta es exacta.

---

## Cómo leer esta lista

⚠️ **Pedir los 45 de golpe es correcto para archivarlos y equivocado para
priorizar.** La mayoría son formatos operativos de una constructora que
SummitApp **nunca va a modelar** (regla 11): hacen falta como *contenido* —para
que el expediente documental del cliente esté completo dentro de la app— pero no
especifican nada que haya que construir.

Los tres bloques van por lo que desbloquean, no por su código:

| Bloque | Qué son | Cuántos |
|---|---|---|
| **1 · Pedir ya** | Especifican algo que estamos construyendo o vamos a construir | **9** |
| **2 · Pedir junto** | Completan el mapa de una fase futura | **6** |
| **3 · Pedir en bloque** | El catálogo operativo. Contenido, no especificación | **30** |

**9 + 6 + 30 = 45.** Los tres bloques son una partición exacta de los faltantes:
verificado con `comm` contra la lista maestra, sin sobras ni repetidos.

---

## Bloque 1 · Pedir ya  (9 documentos)

### 1.1 · Proveedores — desbloquea Fase 04 y cierra una fuente de NC

| Código | Título | Por qué |
|---|---|---|
| **`P-CO-02`** | Procedimiento para Selección y Evaluación de Proveedores | ⚠️ **Es el único documento faltante que cita un procedimiento del SGC ya entregado** (`P-SG-06` §5.2). Respalda `fuente_nc = 'evaluacion_proveedor'` —un valor que ya está en la base sin documento detrás—, el **indicador 6** del `F-SG-19` y la **entrada 4g** de la Revisión por la Dirección |
| **`F-CO-02`** | Desempeño de Proveedores | El registro donde se evalúa. Lo citan `P-OP-02` y `P-OP-03` |
| **`F-CO-03`** | Listado de Proveedores | El padrón del que se elige. Lo citan `P-OP-01` y `P-OP-02` |

### 1.2 · Recursos Humanos — es la Fase 05·B3 entera

| Código | Título | Por qué |
|---|---|---|
| **`P-RH-01`** | Procedimiento de Recursos Humanos y Competencia | ⚠️ **Cierra el hueco 11** (responsabilidad, autoridad y competencia del `F-SG-05`) y es el marco de `dnc`, `sesiones` y `asistentes` |
| **`F-RH-04`** | Programa de Capacitación | ⚠️ **Es literalmente `F05·B3`.** Y es el indicador 7 del `F-SG-19`, meta 90 % anual |
| **`F-RH-03`** | Descripción de Puesto | El perfil de puesto al que apunta el hueco 11. Citado por `F-SG-05`, `F-SG-21` y el manual |
| **`F-RH-06`** | Examen de Conocimientos | La calificación del asistente en `F05·B3` |
| **`F-RH-07`** | Listado de Datos y Documentación de Personal | El expediente de personal — lo que la constancia DC-3 necesita para salir llena |

### 1.3 · El que nadie había visto y es Fase 05

| Código | Título | Por qué |
|---|---|---|
| **`F-CM-02`** | **Matriz de Requisitos Legales** | ⚠️ **Es `F05·B1` con otro nombre.** Es donde el cliente lleva su cumplimiento normativo, y el `F-SG-22` lo nombra como la **estrategia** frente a Gobierno para tres necesidades: obligaciones fiscales, prestaciones de ley y seguridad ocupacional, y regulaciones ambientales. Encaja con el `REQUISITO LEGAL` por peligro de la Matriz IPERC |

---

## Bloque 2 · Pedir junto  (6 documentos)

No bloquean nada hoy, pero completan una fase que ya está planeada.

| Código | Título | Para qué |
|---|---|---|
| `F-RH-01` | Organigrama ATELIER | Los puestos reales del cliente, que es lo que `contactos.puesto` y la pestaña Equipo capturan a mano hoy |
| `F-RH-02` | Solicitud de Personal | El alta de personal. El `F-SG-23` lo nombra como el registro que controla el riesgo «selección de candidatos inadecuados» |
| `F-RH-05` | Evaluación de Ambiente de Trabajo | ⚠️ Huele a **NOM-035-STPS** (factores de riesgo psicosocial). Si lo es, es Fase 05 y no un formato de RH |
| `P-MT-01` | Procedimiento de Mantenimiento | El marco de lo que vence y hay que renovar |
| `F-MT-01` | Programa de Mantenimiento Preventivo | ⚠️ **Es el patrón de `F05·B2`**: mantenimientos con vigencia. Citado por el manual y por el `F-SG-21` como control de un riesgo |
| `F-MT-02` | Control Interno de Vehículos | Verificaciones vehiculares con vencimiento — mismo patrón |

---

## Bloque 3 · Pedir en bloque  (30 documentos)

**Contenido, no especificación.** Van al expediente documental del cliente dentro
de la app (Fase 02) y hacen falta el día que Summit **audite** ese proceso — para
auditar un proceso hay que tener su procedimiento y sus formatos—. No se modelan.

**Administración (6)** — `P-AD-01` Planificación de Licitaciones y Concursos ·
`P-AD-02` Administración · `F-AD-01` Control de Archivo General · `F-AD-02`
Relación de Estimaciones · `F-AD-03` Resumen de Pago de las Obras Activas ·
`F-AD-04` Expediente Final

**Comercialización (2)** — `P-CM-01` Comercialización · `F-CM-01` Oferta Comercial

**Compras (3)** — `P-CO-01` Compras · `F-CO-01` Orden de Compra · `F-CO-04`
Solicitud de Pedido

**Contaduría (6)** — `P-CN-01` Contaduría · `F-CN-01` Solicitud de Pago ·
`F-CN-02` Solicitud de Reembolso · `F-CN-03` Control de Gastos · `F-CN-04`
Comprobación de Gastos · `F-CN-05` Nómina

**Transporte y Almacén (9)** — `P-AM-01` Transporte y Almacén · `F-AM-01` Control
de Inventario · `F-AM-02` Ingreso de Material a Almacén · `F-AM-03` Verificación
Vehicular de Salida · `F-AM-04` Guía de Despacho · `F-AM-05` Gestión de Material
no Conforme · `F-AM-06` Especificación de Vehículos · `F-AM-07` Movimiento de
Material · `F-AM-08` Devoluciones

**Diseño (2)** — `P-SD-01` Diseño · `F-SD-01` Alcances del Proyecto

**Facturación (2)** — `P-FA-01` Facturación · `F-FA-01` Generador de Pago por los
Servicios Ejecutados

⚠️ **`F-AM-05` merece un vistazo cuando llegue.** El catálogo lo titula «Gestión
de Material no Conforme», que **no es lo mismo** que el `F-SG-14` Control de
Servicio No Conforme. Si es un ciclo paralelo para materiales, puede que
`fuente_nc` necesite un valor más.

---

## Lo que NO es un documento por pedir, y hay que decirlo

### ⚠️ La Lista Maestra de Documentos **Externos** está vacía

La `F-SG-01` tiene una segunda hoja, «Externos», con sus ocho encabezados
—`Código · Título · Responsable · No. Versión · Fecha última revisión ·
Almacenamiento · No. de Copias · Proceso`— y **cero renglones**.

El `P-SG-01` §5.10 la exige: ahí van «normas, leyes, reglamentos, catálogos de
proveedores, documentos de clientes». Vacía significa que el cliente **no tiene
registrada ni la propia ISO 9001:2015** contra la que se certifica, ni una sola
NOM, ni un reglamento.

**No lo pidas como documento: es un hallazgo.** Es una no conformidad que Summit
le puede levantar a su cliente —fuente `informacion_documentada`, una de las nueve
etapas del `P-SG-05` §5.1— y es exactamente el trabajo que la firma vende.

### ⚠️ Cinco diagramas de flujo en blanco

`P-SG-02`, `P-SG-04`, `P-SG-05`, `P-SG-06` y `P-SG-07` tienen la sección
«Diagrama de flujo del proceso» y **la página está vacía en el `.docx` original**.
Si el cliente los tiene aparte, valen para la Fase 07; si no los tiene, es el
mismo caso que el anterior.

### ⚠️ Dos códigos que el propio catálogo se contradice

- **Diseño**: la `F-SG-01` dice `P-SD-01` / `F-SD-01`, la `F-SG-02` dice `P-DS-01`
  y la regla de codificación del `P-SG-01` §5.2 asigna **`DS`** a Diseño.
  **Pídelos por el título, no por el código**, o el cliente va a buscar el que no
  es.
- **`F-SG-15`** aparece en la lista maestra como «Desempeño de los Procesos del
  Sistema de Gestión de la Calidad» y el archivo entregado se llama
  `F-SG-15 Desempeño de los Procesos del SGC **(1)**.xlsx` — el `(1)` es de una
  descarga duplicada. **Confirma que es la versión vigente.**

---

## Texto listo para mandar

> Nos falta completar el expediente documental. Del catálogo de su `F-SG-01`
> (105 documentos) tenemos 60; les pedimos los 45 restantes.
>
> **Con prioridad**, porque son los que necesitamos para la siguiente etapa:
> `P-CO-02`, `F-CO-02` y `F-CO-03` (selección y evaluación de proveedores);
> `P-RH-01`, `F-RH-03`, `F-RH-04`, `F-RH-06` y `F-RH-07` (recursos humanos y
> capacitación); y la **Matriz de Requisitos Legales** (`F-CM-02`).
>
> **Después**, el resto: las series `AD`, `AM`, `CM`, `CN`, `CO`, `FA`, `MT` y
> `SD` completas, más `F-RH-01`, `F-RH-02` y `F-RH-05`.
>
> Tres cosas más:
> 1. La segunda hoja de la `F-SG-01`, **Lista Maestra de Documentos Externos**,
>    está sin renglones. ¿Existe en otro archivo, o está pendiente de llenar?
> 2. Los procedimientos `P-SG-02`, `P-SG-04`, `P-SG-05`, `P-SG-06` y `P-SG-07`
>    tienen la sección de diagrama de flujo **en blanco**. ¿Los tienen aparte?
> 3. El procedimiento de Diseño aparece como `P-SD-01` en la lista maestra y como
>    `P-DS-01` en la distribución de copias. ¿Cuál es el vigente?
