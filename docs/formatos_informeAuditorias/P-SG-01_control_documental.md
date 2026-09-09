# P-SG-01 · Control de Información Documentada  (+ F-SG-01 · F-SG-02)

> Transcripción del `.docx` y los dos formatos (cuarta tanda, 7 sep 2026).
> Versión 0.
>
> ⚠️ **Es de la Fase 02, ya construida** (`F02·B2`, 22 ago 2026). Llega **después**
> del código y confirma casi todo — pero abre cinco huecos concretos.

---

## 1 · Lo que confirma de `F02·B2`

| Regla del procedimiento | Ya está |
|---|---|
| Elaborar → revisar → autorizar → publicar, en ese orden (§5.3) | `borrador` → `en_revision` → `aprobada` |
| Sólo el autorizado se publica y se consulta en sólo lectura (§5.4) | `proteger_version_aprobada()` |
| Al publicar una versión nueva, **la anterior pasa a obsoleta** (§5.8) | `jubilar_version_anterior()` |
| Quien elabora ≠ quien revisa ≠ quien autoriza (§5.3) | `elaboro_id` / `reviso_id` capturables, aprobación sellada |
| Un documento obsoleto **se retiene, no se destruye**, si hay razón legal (§5.8) | `estado = 'obsoleta'`, nunca DELETE |
| «OBSOLETO PARA CONSERVAR» (§5.8) | ⚠️ ver §3 |

✅ **La decisión de `elaboro_id`/`reviso_id` sin sellar queda respaldada por el
texto**: §5.3 dice que quien elabora *solicita* la revisión, así que la firma del
revisor es una captura, no un evento de sistema. CLAUDE.md ya lo decía; ahora hay
fuente.

---

## 2 · La codificación `A-BB-##`  (§5.2)

```
   P    -    SG    -    01
   │         │          └─ consecutivo de emisión del proceso, 01 a 99
   │         └─ dos letras del PROCESO que lo emite
   └─ una letra del TIPO de documento
```

| Tipo | Letra | | Proceso | Letras |
|---|---|---|---|---|
| Manual | `M` | | Dirección | `DI` |
| Diagrama / Mapa | `D` | | Sistema de Gestión de Calidad | `SG` |
| Procedimiento | `P` | | Compras | `CO` |
| Plan de Calidad | `L` | | Operación | `OP` |
| Formato / Registro | `F` | | Facturación | `FA` |
| *(Política — ver abajo)* | `C` | | Contabilidad | `CN` |
| | | | Mantenimiento | `MT` |
| | | | Recursos Humanos y Competencia | `RH` |
| | | | Transporte y Almacén | `AM` |
| | | | Administración | `AD` |
| | | | Diseño | `DS` |

⚠️ **`C` no está en la tabla del procedimiento pero existe en la práctica**:
`C-SG-01 Política de Calidad` aparece en la `F-SG-01` y en la carpeta. La tabla de
§5.2 está incompleta — **no cerrar el catálogo con un CHECK**.

✅ **Las mismas dos letras de proceso son las del folio de acción correctiva**
`AC-**FA**-01-25` (`P-SG-05` §5.2). Un solo catálogo sirve a los dos.

---

## 3 · Los cinco huecos que abre en `documentos`

| # | Falta | De dónde sale |
|---|---|---|
| 1 | **`codigo`** con la forma `A-BB-##` y su proceso emisor | §5.2 · `F-SG-01` col. `Codigo` |
| 2 | **`proxima_revision`** (fecha) y **`dias_por_vencer`** | `F-SG-01` cols. `G` y `L` — la hoja lo calcula |
| 3 | **`tiempo_archivo`** (retención) | `F-SG-01` col. `I` · §5.5 mínimo **5 años** por ley |
| 4 | **`almacenamiento`** (Electrónico / Físico / ambos) | `F-SG-01` col. `H` |
| 5 | **Copias controladas** — tabla propia | `F-SG-02`, ver §5 |

**Vigencia y revisión (§5.6 y §5.9), y son dos plazos distintos:**
- **Cada 3 años** el documento se revisa y reautoriza aunque no haya cambiado.
- **Cada año y medio** el Coordinador consulta a los responsables si requieren
  cambios. → Es el `1 año 6 meses` de la columna `Tiempo de Archivo`.

⚠️ **`dias_por_vencer` es exactamente el patrón de `F05·B2`** (vencimientos y
obligaciones), y CLAUDE.md ya avisa: son columnas `date`, y `new Date()` las corre
un día en México. Mismo helper, `formatDateOnly` / `toISODate`.

⚠️ **«OBSOLETO PARA CONSERVAR» es un estado más**, distinto de `obsoleta`: es el
documento obsoleto que se retiene a propósito. Hoy no se distingue del que caducó
sin más, y la diferencia importa en auditoría.

---

## 4 · Solicitud de cambio → `F-SG-24`  (§5.7)

> «Cuando se ha enviado una solicitud de cambio del documento en el formato de
> **F-SG-24** Gestión de Cambios en Sistema de Gestión de Calidad y Procesos, el
> propietario del documento dará respuesta a través del mismo medio, **si ha sido
> aceptada** la solicitud y cuándo se realizarán los cambios sugeridos; o en su
> defecto, **la rechazará con la correspondiente justificación**.»

⚠️ **Hoy el cambio se pide fuera de la app.** El ciclo de `documento_versiones`
empieza cuando alguien ya decidió cambiar. Esto añade un paso **antes**, con
aceptación o rechazo justificado. Ver `F-SG-24_gestion_de_cambios.md` §1.

---

## 5 · F-SG-01 y F-SG-02

**`F-SG-01` Lista Maestra de Documentos Internos y Externos** — doce columnas:
`Requisito · Codigo · Título · Responsable · No. Versión · Fecha última revisión ·
Próxima revisión · Almacenamiento · Tiempo de Archivo · No. de Copias · Proceso ·
Días por vencer`, más un total de copias controladas asignadas y **una hoja
aparte para documentos externos** (normas, leyes, reglamentos, catálogos de
proveedores, documentos de clientes — §5.10).

✅ **Es una vista de `documentos`, no una tabla nueva** — en cuanto existan las
cinco columnas de §3. Y **la hoja de externos ya tiene dónde vivir**:
`documentos.tipo` distingue interno de externo.

**`F-SG-02` Distribución de Copias Controladas** — `Documento · Versión · Nombre ·
Puesto · Proceso · No. de CC · Fecha · Firma`. Una copia **en papel**, entregada y
firmada. Tabla `copias_controladas` (`documento_version_id`, `contacto_id`,
`numero`, `entregada_en`, `recuperada_en`).

⚠️ **§5.8 dice que al obsoletar hay que RECOGER las copias controladas.** Sin
`recuperada_en` no se puede demostrar que se recogieron, y eso es un hallazgo
típico de auditoría externa.

---

## 6 · ⚠️ El catálogo documental completo del cliente está en la `F-SG-02`

La hoja lista **18 procedimientos** con copia controlada asignada. Los que **no
llegaron** en ninguna tanda:

`P-AD-01` Planificación de Licitaciones y Concursos · `P-AD-02` Administración ·
`P-AM-01` Transporte y Almacén · `P-CM-01` Comercialización · `P-CN-01`
Contaduría · `P-CO-01` Compras · **`P-CO-02` Selección y Evaluación de
Proveedores** · `P-DS-01` Diseño · `P-FA-01` Facturación · `P-MT-01`
Mantenimiento · `P-RH-01` Recursos Humanos y Competencia.

Y por referencia cruzada en otros documentos, estos formatos tampoco:
`F-RH-02` Solicitud de Personal · `F-RH-03` Descripción de Puesto · `F-RH-04`
Programa de Capacitación · `F-RH-06` Examen de Conocimientos · `F-RH-07` Listado
de Datos y Documentación del Personal · `F-CO-01` Orden de Compra · `F-CO-02`
Desempeño de Proveedores · `F-CO-03` Listado de Proveedores · `F-CO-04` Solicitud
de Pedido · `F-AM-01` Control de Inventario · `F-AM-02` Ingreso de Materiales ·
`F-AM-05` Guía de Despacho · `F-AM-07` Movimiento de Material · `F-AM-08`
Devoluciones · `F-MT-01` Programa de Mantenimiento Preventivo.

**Ver `README.md` § «Lo que sigue faltando».**
