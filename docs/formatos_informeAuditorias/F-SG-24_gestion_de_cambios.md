# F-SG-24 · Gestión de Cambios en SGC y Procesos

> Transcripción del `.docx` (cuarta tanda, 7 sep 2026). Versión 0, 10-Feb-2025.
>
> El segundo de los **dos formatos que nadie sabía que faltaban**. CLAUDE.md ya
> avisaba: «`acciones.cambio_sgc = true` **dispara otro documento**, no es una
> casilla informativa». Éste es el documento.

---

## 1 · Tres disparadores, no uno

| Quien lo invoca | Cuándo |
|---|---|
| `P-SG-05` §5.5 | Al determinar acciones correctivas: «¿es necesario hacer cambios al SGC?» |
| `P-SG-01` §5.7 | **Solicitud de cambio de un documento publicado** |
| `P-SG-07` §5.5.2 | Una sugerencia procedente de cliente (o el `F-SG-16`) |

⚠️ **El segundo no lo esperábamos y es de la Fase 02, no de la 04.** Hoy el ciclo
documental de `documento_versiones` va de `borrador` → `en_revision` →
`aprobada`, y **el cambio se pide fuera de la app**, por correo. Este formato es
la solicitud formal, con su justificación y su respuesta de aceptación o rechazo.

---

## 2 · Estructura del original

```
  I.- Descripción General
      No. Proy. ______        Fecha ________
      ┌──────────────────────────┬────────────────────────────────┐
      │ Nombre del proyecto      │                                │
      │ Descripción del proyecto │                                │
      │ Alcance y principales    │                                │
      │ cambios                  │                                │
      └──────────────────────────┴────────────────────────────────┘

  II.- Justificación
      ☐ SGC     ☐ PROCESOS     ☐ Otro          ← tres casillas
      ┌─────────────────────────────────────────────────────────┐
      │ Descripción de la justificación del cambio.             │
      └─────────────────────────────────────────────────────────┘

  III.- Riesgos Identificados            ← un bloque libre

  IV.- Documentación del SGC y/o de procesos relacionados   (siete renglones)

  V.- Recursos

  VI.- Asignación de Responsabilidades y autoridades
      ┌────────────┬─────────────┬────────┐
      │ ACTIVIDAD  │ RESPONSABLE │ FECHA  │      (once renglones)
      └────────────┴─────────────┴────────┘

  Elaboró ______   Revisó ______   Autorizó ______
```

---

## 3 · Lo que enseña sobre el modelo

1. **Las «Actividades» de §VI son `acciones`.** Actividad + responsable + fecha
   es exactamente `acciones.descripcion` / `responsable_id` / `fecha_compromiso`.
   Un cambio de SGC **no necesita tabla de tareas propia**: es un contenedor de
   acciones, igual que el `F-SG-16`.
2. **§III «Riesgos Identificados» ata este formato con `P-SG-04`.** Las dos
   preguntas de impacto del `F-SG-06` **convergen aquí**: el cambio al SGC y la
   actualización de riesgos son el mismo documento, no dos ramas separadas.
3. **§IV lista la documentación afectada.** Es una relación N:N contra
   `documentos` — qué documentos hay que reeditar por este cambio.
4. **Tres firmas**, como el `F-SG-16`: Elaboró · Revisó · Autorizó.

**Tabla nueva mínima:** `cambios_sgc` (`org_id`, `proyecto_id` nullable,
`nombre`, `descripcion`, `alcance`, `ambito` CHECK `sgc`·`procesos`·`otro`,
`justificacion`, `riesgos`, `recursos`, firmas selladas) +
`cambios_sgc_documentos` (N:N) + `acciones.cambio_sgc_id`.

⚠️ **Es de la Fase 04 sólo a medias.** El disparador de `P-SG-05` sí; el de
`P-SG-01` es control documental (Fase 02) y el de `P-SG-07` es satisfacción
(Fase 05/06). **Construirlo entero en F04·B1 es lo barato** — las tres bocas
escriben en la misma tabla.
