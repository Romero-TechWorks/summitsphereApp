# P-SG-02 · Control de Servicio No Conforme  (+ F-SG-14)

> Transcripción del `.docx` y del `.xlsx` (cuarta tanda, 7 sep 2026). Versión 0.

---

## 1 · La frase que decide el modelo  (§5.2)

> «**Toda salida no conforme debe ser identificada como una No Conformidad
> (N.C.)** y debe monitorearse hasta su cierre efectivo.»

Se documenta en el **`F-SG-06`**, según el **`P-SG-05`**, y se sigue en el
`F-SG-17` **y** en el `F-SG-14`.

✅ **Confirma `fuente_nc = 'servicio_no_conforme'` como una fuente de `hallazgos`,
no como una tabla aparte.** El `F-SG-14` es un **registro paralelo**, no un ciclo
distinto: la NC es la misma fila.

---

## 2 · F-SG-14 · Control de Servicio No Conforme

Siete columnas, una hoja plana:

| Col | Encabezado | Dónde vive |
|---|---|---|
| A | `FECHA` | `hallazgos.detectado_en` |
| B | `INCUMPLIMIENTO` | `hallazgos.descripcion` |
| C | `ETAPA DEL SERVICIO` | ⚠️ la etapa del proceso — ver `P-SG-04` §5.1.1, que también identifica riesgos **por etapa** |
| D | `CAUSAS` | `acciones.causa_raiz` |
| E | `ACCIONES` | `acciones.descripcion` |
| F | `RESPONSABLE(S)` | `acciones.responsable_*` |
| G | `N° DE NC` | `hallazgos.folio` — **la llave de unión** |

**Cero esquema nuevo.** Es una vista filtrada de `hallazgos` por
`fuente_nc = 'servicio_no_conforme'` con sus acciones, más `etapa`.

⚠️ **`etapa` aparece por tercera vez** —aquí, en `P-SG-04` §5.1.1 y en el
`F-SG-23`— y en las tres es «la etapa del proceso». Es una columna de `procesos`
o una tabla `proceso_etapas`, y **si se modela una vez sirve a las tres**. Ver
`P-SG-04_riesgos_y_oportunidades.md` §4.

---

## 3 · Los 17 supuestos de servicio no conforme (§5.1)

El procedimiento los **enumera**, y es el catálogo de ayuda que se pinta al
clasificar —misma lógica que `CRITERIO_HALLAZGO` en
`src/lib/auditorias/catalogos.ts`:

Errores de diseño · Materiales inadecuados · Desviaciones del cronograma ·
Documentación incompleta · **Cumplimiento normativo fallido** · Fallas de
supervisión · Cambios no documentados · Comunicación deficiente · Fallos en la
evaluación de riesgos · Problemas de compatibilidad · Estimaciones de costos
inexactas · Incumplimiento de plazos · Calidad de presentación deficiente ·
Fugas de información · Insatisfacción del cliente · **Seguridad inadecuada en el
sitio** · Falta de materiales.

⚠️ **Son de una constructora.** No se codifican en un CHECK: van como texto de
ayuda de la firma, por cliente. Regla 12 aplica por analogía — el criterio
técnico no se hornea en Git.

---

## 4 · Las cuatro preguntas de §5.2 son la ficha de un hallazgo

> a) Definir la NC: **¿qué etapa del proceso se incumple? ¿quién? ¿cuándo? ¿en
> qué documento? ¿qué requisito?**
> b) Implementar y validar corrección/acción inmediata **con fecha de
> vencimiento**
> c) Realizar el análisis de causa raíz
> d) Definir las acciones correctivas

Las cinco preguntas de (a) ya están en `hallazgos`: `proceso_id` (etapa no),
`responsable`, `detectado_en`, `documento_id`, `clausula_id`.
⚠️ **(b) confirma que la corrección inmediata TAMBIÉN lleva fecha compromiso.**
No es un campo de texto del hallazgo: es una `accion` con
`tipo = 'correccion'` y su propia `fecha_compromiso`.
