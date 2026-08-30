# F-SG-06 · Reporte de No Conformidad

> Transcripción del `.docx` que entregó Summit (30 ago 2026). Versión vigente 0,
> emitido el 10-Feb-2025. El original es una plantilla vacía: sólo las etiquetas.
>
> **Es el formato que cruza dos fases.** La mitad de arriba la llena el auditor en
> planta y ya existe en `hallazgos` (F03·B4); la mitad de abajo la llena el
> cliente después y es la **Fase 04** entera. Se transcribe ahora porque define
> qué campos van a hacer falta, y porque **dos de ellos no están planeados en
> ninguna fase**.
>
> Contexto y reparto por fases: el [índice y análisis](README.md). El ciclo completo:
> el [procedimiento P-SG-03](P-SG-03_procedimiento.md).

---

## 1 · Estructura del original

```
┌─ encabezado ────────────────────────────────────────────────────┐
│ [logo]  Reporte de No Conformidad   Fecha de Elaboración: …     │
│         F-SG-06                     Versión vigente: 0           │
└─────────────────────────────────────────────────────────────────┘

  Fecha:          │ Fuente de la NC:      │ Quién identificó la NC:
  ────────────────┴───────────────────────┴────────────────────────
  ☐ N.C. Mayor    │ ☐ N.C. Menor  │ Requisito / Documento: │ Puesto Responsable:
  ─────────────────────────────────────────────────────────────────
  No Conformidad Observada:                              │ No.:
  ─────────────────────────────────────────────────────────────────
  Corrección / Acción Inmediata:
  ─────────────────────────────────────────────────────────────────
  Responsable de esta No conformidad:                    │ Firma:
  ─────────────────────────────────────────────────────────────────
  Análisis de Causa Raíz:            │ Formato de Análisis de Causa
  ─────────────────────────────────────────────────────────────────
  Acción(es) Correctiva(s):  │ Responsable: │ Evidencia │ Fecha:
    ·                        │              │           │
    ·                        │              │           │      (4 renglones)
    ·                        │              │           │
    ·                        │              │           │
  ─────────────────────────────────────────────────────────────────
  ¿Es necesario actualizar Análisis de Riesgo?  ☐ SI  Especifique: ___  ☐ NO
  ¿Es necesario realizar cambios en el SGC?     ☐ SI  Especifique: ___  ☐ NO
  ─────────────────────────────────────────────────────────────────
  Reporte de Cierre
  No Conformidad aceptada:   ☐ Sí     ☐ No
  ─────────────────────────────────────────────────────────────────
  ¿Fue efectiva? │ Fecha Cierre │ Coordinador de SGC
                 │              │
```

**Se llena en tres momentos y por tres personas distintas**, y esa es la clave
para repartirlo entre fases:

1. **En planta, el auditor** (P-SG-03 §5.4.2): hasta «No Conformidad Observada».
2. **Dentro de 15 días hábiles, el responsable de proceso del cliente**
   (P-SG-03 §5.5): corrección, causa raíz, acciones correctivas.
3. **Al verificar, el Coordinador del SGC del cliente**: el reporte de cierre.

---

## 2 · Mitad de arriba — **ya existe** (F03·B4)

| Campo del formato | Columna | Estado |
|---|---|---|
| Fecha | `hallazgos.detectado_en` | ✅ ⚠️ El reloj del **teléfono** del auditor, no el del servidor |
| **Fuente de la NC** | — | ❌ **No existe.** Ver §4 |
| Quién identificó la NC | `hallazgos.creado_por` → `usuarios.nombre` | ✅ Lo sella la base |
| ☐ N.C. Mayor / ☐ N.C. Menor | `hallazgos.tipo` | ✅ Y con tres valores más que el original |
| Requisito / Documento | `hallazgos.clausula_id` + `requisito_incumplido` | ✅ La cláusula es **obligatoria** |
| **Puesto Responsable** | `responsable_contacto_id` → `contactos` | ⚠️ Parcial. Ver §4 |
| No Conformidad Observada | `hallazgos.descripcion` + `evidencia_objetiva` | ✅ Los dos con CHECK de no-vacío |
| No.: *(folio)* | `hallazgos.folio` / `consecutivo` | ✅ `AUD-2026-014 / H-03` |
| Responsable de esta NC + Firma | `responsable_contacto_id` | ✅ La firma es una línea impresa |

⚠️ **El original tiene dos casillas —mayor y menor— y nosotros cinco tipos.** No
es un conflicto: `observacion` y `oportunidad_mejora` no generan un F-SG-06 en el
procedimiento original (§3: la observación «se deja documentada en el reporte…
sin ser documentada como una no conformidad»), y `conformidad` menos. **Este
formato se imprime sólo para `nc_mayor` y `nc_menor`** — que es exactamente
`TIPOS_QUE_EXIGEN_ACCION` en `src/lib/auditorias/catalogos.ts`, ya definido y con
esos dos valores. El catálogo se adelantó al formato.

---

## 3 · Mitad de abajo — **Fase 04**

| Campo del formato | Dónde caerá | Estado |
|---|---|---|
| Corrección / Acción Inmediata | `acciones` con `tipo = 'correccion'` | Planeado F04·B1 |
| Análisis de Causa Raíz | Los 5 porqués, estructurados | Planeado F04·B1. ⚠️ La firma usa **5 porqués** (F-SG-07), no Ishikawa |
| «Formato de Análisis de Causa» | Referencia al F-SG-07 | ❌ Ese formato no llegó |
| Acción(es) Correctiva(s) × 4 | `acciones` con `tipo = 'accion_correctiva'` | Planeado F04·B1 |
| — Responsable | `acciones.responsable` | Planeado |
| — Evidencia | `adjuntos` con `accion_id` | ⚠️ `adjuntos` **no tiene `accion_id`** todavía. Es la FK que falta, y F04·B2 dice justo eso: «conectarla a las acciones» |
| — Fecha | `acciones.fecha_compromiso` | Planeado. Por defecto **15 días hábiles** (P-SG-03 §5.5) |
| **¿Actualizar Análisis de Riesgo?** SI/NO + especifique | — | ❌ **No planeado.** Ver §4 |
| **¿Cambios en el SGC?** SI/NO + especifique | — | ❌ **No planeado.** Ver §4 |
| No Conformidad aceptada ☐ Sí ☐ No | — | ❌ No planeado. Ver §4 |
| ¿Fue efectiva? | Verificación de eficacia | ✅ Planeado F04·B1, y bien: «una acción no se cierra sin esto» |
| Fecha Cierre | `hallazgos.cerrado_en` | ✅ Ya existe, lo sella la base |
| Coordinador de SGC *(firma)* | Un contacto del cliente | Planeado |

⚠️ **Sólo cuatro renglones de acción correctiva** en el papel. No es un límite
real —es lo que cabe en una hoja— y la app no debe copiarlo: `acciones` es una
tabla y admite las que haga falta. Al **imprimir** el formato, si hay más de
cuatro se continúa en una segunda página, no se recortan.

---

## 4 · Los cuatro campos que este formato descubre

Ninguno afecta a B5. Se anotan aquí para que la Fase 04 no los redescubra tarde.

**1 · `fuente_nc` — de dónde salió la no conformidad.** El formato lo pregunta de
primero, y con razón: no toda NC nace en una auditoría. Nace de una queja del
cliente, de una revisión por la dirección, de un incidente, de un proveedor.
Nuestro `hallazgos.auditoria_id` es **NOT NULL**, así que hoy *todo* hallazgo
cuelga de una auditoría — y una NC de una queja no tiene dónde vivir.
⚠️ **Esto es más grande de lo que parece y hay que decidirlo antes de la Fase 04**,
no dentro: o `auditoria_id` se afloja a nullable con una `fuente` que lo explique,
o las NC de otras fuentes viven en otra tabla. Lo primero es más simple y no
rompe nada existente; lo segundo duplica todo el ciclo de acciones.

**2 · `puesto_responsable`.** El formato pide el **puesto**, no la persona
—«Encargado de Almacén»— por la misma razón que la agenda de F-SG-11: se llena
antes de saber quién. `contactos` tiene la persona; habría que imprimir su puesto
o dejar un texto libre paralelo, como `auditoria_agenda.auditado`.

**3 · Las dos preguntas de impacto**, y son las interesantes:

> ¿Es necesario **actualizar el Análisis de Riesgo**? SI / NO + especifique
> ¿Es necesario **realizar cambios en el SGC**? SI / NO + especifique

⚠️ **No están planeadas en ninguna fase, y enlazan hacia atrás con la Fase 02.**
La primera apunta a `riesgos`, que ya existe; la segunda, a `documentos` y
`procesos`. Es el mecanismo por el que una no conformidad **retroalimenta el
sistema de gestión** en vez de morir en su propia acción correctiva — que es
justo lo que ISO 9001 §10.2 pide y lo que un certificador revisa. Dos booleanos y
dos textos en `acciones`, y en la app un enlace al riesgo o al documento que se
tocó. Barato, y es de las cosas que distinguen un SGC vivo de uno de papel.

**4 · «No Conformidad aceptada: Sí / No».** El auditado puede **rechazar** la no
conformidad. No lo teníamos previsto: `hallazgos.estado` va de `abierto` a
`cerrado` sin pasar por «el cliente no está de acuerdo». No es lo mismo que
`anulado` —anular es que el auditor se equivocó; rechazar es que el cliente
discrepa y el hallazgo sigue en pie hasta que se resuelva—. Se resuelve dentro de
la Fase 04 con el ciclo de acciones, sin tocar `hallazgos`: la discrepancia es un
renglón del historial con su motivo, que ya sabemos escribir.

---

## 5 · Al imprimirlo

Cuando llegue la Fase 04, este formato se imprime **uno por no conformidad**,
para adjuntarlo al informe o entregarlo suelto al responsable de proceso. Dos
notas que se saben desde ahora:

- El encabezado y el pie son los mismos que los del F-SG-12: identidad de la
  firma desde `config_firma`, código y versión del formato desde una constante.
- ⚠️ **Las casillas ☐ se imprimen marcadas, no vacías.** El papel se llenaba a
  mano; nosotros ya sabemos el tipo, y un formato impreso con las dos casillas en
  blanco delante del cliente es un formato que alguien va a llenar con pluma —y
  ese dato ya no vuelve a la app.
