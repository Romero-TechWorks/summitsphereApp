# SGI-F-CA-23 · Matriz de Riesgos y Oportunidades — la escala que sustituye a las cuatro

> Quinta tanda, 22 sep 2026. Emisión del formato: **26-Ago-2026, versión 1**.
> Dos archivos: el de proceso (`SGI/Formatos/`) y el general (`Matriz de Riesgos/`),
> que es el bueno: **ocho hojas y 249 riesgos cargados**.
>
> Sustituye para efectos de diseño a lo descrito en
> [`P-SG-04`](P-SG-04_riesgos_y_oportunidades.md) §1–§5, que sigue siendo válido
> como historia del cliente 01.

---

## 1 · ⚠️ La decisión: hay UNA escala, no cuatro

`P-SG-04` (ATELIER, feb 2025) traía cuatro metodologías incompatibles —proceso
A/M/B→1-9 por *lookup asimétrico*, contexto 1-4→1-16, parte interesada directa,
IPERC (A+B+C+D)×sev→4-36— y el **hueco 23** las anotó como un problema abierto.

`SGI-F-CA-23` (ago 2026) las reemplaza por **una sola, 5×5**, declarada contra
ISO 31000:2018 y mapeada a las cinco normas. **Es más reciente, es de la propia
consultoría y es computable.** Manda ésta.

| | Escala |
|---|---|
| **Probabilidad 1-5** | 1 Muy baja (<1 vez/10 años) · 2 Baja (1 vez/5-10 años) · 3 Media (1 vez/1-5 años) · 4 Alta (≥1 vez/año) · 5 Muy alta (varias veces/año) |
| **Severidad 1-5** | 1 Sin efecto · 2 Efecto interno menor · 3 Afecta el servicio o costo moderado · 4 Afecta a un cliente, sanción o daño reputacional · 5 Pérdida irreversible de derechos del cliente, responsabilidad legal o penal |
| **Nivel = P × S** | 1–25 |
| **Bandas** | **BAJO 1-4** revisión anual · **MODERADO 5-9** monitoreo semestral · **ALTO 10-16** plan de tratamiento **obligatorio**, monitoreo trimestral · **CRÍTICO 17-25** acción inmediata, **escalamiento a Dirección**, monitoreo mensual |

✅ **La banda no es decorativa: define la cadencia de monitoreo y si el plan de
tratamiento es obligatorio.** Es una columna generada con un `CASE` sobre
enteros, igual que `programa_procesos.auditorias_requeridas` — y por el mismo
motivo es segura (`IMMUTABLE`).

## 2 · ⚠️ Riesgo inherente y residual — y la regla de reducción es ARITMÉTICA

Esto es lo que no teníamos y cambia el esquema:

> «Un control de efectividad **Alta reduce dos puntos la probabilidad**, uno de
> efectividad **Media reduce un punto**, y uno de efectividad **Baja no la
> reduce**. **La severidad no se reduce por el control**, salvo justificación
> documentada.»

```
p_residual = greatest(1, p_inherente - case efectividad
                              when 'alta'  then 2
                              when 'media' then 1
                              else 0 end)
s_residual = s_inherente            -- salvo justificación
```

✅ **Se comprueba con los datos cargados**: `R-LT-01` va de P2×S5=10 (Alto) con
control de efectividad Media a P1×S5=5 (Moderado). `R-LT-02`, de 3×3=9 a 2×3=6.

⚠️ **Pero `p_residual` NO puede ser columna generada sin más.** El propio formato
admite la excepción («salvo justificación documentada») para la severidad, y
`P-SG-04` §5 ya exigía verificación de eficacia. La forma buena: **las cuatro
columnas se guardan**, la app **propone** el residual con la fórmula, y un CHECK
impide que el residual quede por encima del inherente. Misma decisión que
`programa_procesos.nc_previas` (F03·B6): un número que la Dirección aprobó no se
recalcula solo.

## 3 · Las 22 columnas de la matriz

```
ID | Proceso | Etapa del proceso | Riesgo identificado | Impacto potencial |
Tipo de riesgo | Fuente | P inh. | S inh. | Nivel inh. | Banda inh. |
Control existente / propuesto | Efectividad | P res. | S res. | Nivel res. |
Banda res. | Estrategia | Acción adicional / plan de tratamiento | Normas |
Responsable | Indicador asociado | Estado
```

Contra nuestra tabla `riesgos` (F02), que hoy tiene `descripcion · causa ·
consecuencia · probabilidad · impacto · nivel · tipo · tratamiento · plan ·
proceso_id · responsable_id · fecha_revision`:

| Columna del formato | En `riesgos` hoy | Qué falta |
|---|---|---|
| `ID` (`R-LT-01`) | — | **Folio por proceso**, `R-` + código de proceso + consecutivo. Misma mecánica que `acciones.folio_cliente` |
| `Etapa del proceso` | — | ⚠️ **Hueco 21** por cuarta vez. `proceso_etapas` |
| `Impacto potencial` | `consecuencia` | ✅ |
| `Tipo de riesgo` | `tipo` | ⚠️ El CHECK tiene que cubrir **19 valores**, §4 |
| `Fuente` | — | De dónde salió: taller, incidente, auditoría, queja, cambio normativo, contexto |
| P/S/Nivel/Banda **inherente** | `probabilidad`/`impacto`/`nivel` | Son los *inherentes*; falta nombrarlos así |
| `Control existente` + `Efectividad` | — | **Las dos.** `efectividad` es `alta/media/baja` |
| P/S/Nivel/Banda **residual** | — | **Las cuatro** |
| `Estrategia` | `tratamiento` | ✅ `mitigar · aceptar · transferir · evitar` |
| `Plan de tratamiento` | `plan` | ✅ |
| `Normas` | — | N:N contra `normas` — un riesgo impacta varias |
| `Indicador asociado` | — | FK a `indicadores` |
| `Estado` | — | `vigente` · … |

## 4 · El catálogo de 19 tipos de riesgo, con su norma

Es un catálogo cerrado y **cada tipo declara a qué normas impacta** — lo que lo
vuelve el puente entre el riesgo y el alcance del proyecto:

| # | Tipo | Normas |
|---|---|---|
| 1 | Legal / Procesal | 9001, 37301 |
| 2 | Calidad del servicio | 9001 |
| 3 | Operativo | 9001 |
| 4 | Seguridad de la información | 27001 |
| 5 | Privacidad y datos personales | 27001, 37301 |
| 6 | Tecnológico | 27001, 9001 |
| 7 | Cumplimiento regulatorio | 37301 |
| 8 | Fiscal | 37301 |
| 9 | Soborno y corrupción | 37001, 37301 |
| 10 | Penal corporativo | 37001, 37301 |
| 11 | Lavado de dinero | 37301 |
| 12 | Ético / Conducta | 37001, 37301 |
| 13 | Reputacional | 9001, 37001, 37301 |
| 14 | Financiero | 9001, 37001 |
| 15 | Terceros y proveedores | 9001, 37001, 37301 |
| 16 | Talento y personas | 9001 |
| 17 | **Ocupacional (SST)** | 37301 |
| 18 | Continuidad | **22301**, 9001 |
| 19 | Ambiental / Climático | 22301, 9001 |

⚠️ **El 17 es la bisagra con la Fase 05**: el riesgo ocupacional es el que la
Matriz IPERC del cliente 01 detalla y el que el levantamiento STPS evalúa. Un
mismo modelo de riesgo sirve a los dos, con distinto nivel de detalle.
⚠️ **Y el 18/19 citan ISO 22301**, que no está en ninguna fase — ver
[`SGI-P-CA-09`](SGI-P-CA-09_continuidad.md).

## 5 · Las otras siete hojas

| Hoja | Qué es | Dónde cae |
|---|---|---|
| Instrucciones | La metodología completa, en prosa | Es la ayuda en pantalla, como `CRITERIO_HALLAZGO` |
| Criterios de Evaluación | Las dos escalas 1-5 y el mapa de calor | Catálogo en código |
| Tipos de Riesgo | §4 | CHECK |
| **Matriz de Riesgos** | 249 filas | `riesgos` |
| **Oportunidades** | `Ámbito · Oportunidad · Probabilidad · Beneficio · Acción · Responsable · Indicador · Estado` | ⚠️ **Tabla propia.** No es un riesgo con signo cambiado: no tiene severidad ni control |
| Resumen | Conteos por banda | En memoria, como los widgets |
| **Programa de Acciones** | Sólo bandas Alta y Crítica: `Acción · Recursos · Responsable · Fecha compromiso · Estatus · Evidencia de cierre · Fecha de evaluación de eficacia · ¿Fue eficaz?` | ✅ **Es `acciones`, tal cual** — con `accion_origen_id` apuntando al riesgo |
| Control de Cambios | Versionado | `audit_logs` |

✅ **La hoja «Programa de Acciones» cierra el círculo con la Fase 04**: un riesgo
Alto o Crítico **genera una acción**, con fecha compromiso, evidencia de cierre y
**verificación de eficacia con su propia fecha** — exactamente el ciclo de
`P-SG-05` §5.7 que ya está construido. No hay que inventar nada: hace falta que
`acciones.origen` acepte `riesgo` y una FK.

## 6 · La regla que el formato deja escrita y hay que respetar

> «La probabilidad, la severidad y la efectividad del control **precargadas son
> una propuesta técnica** derivada de los procedimientos documentados. Deben
> **validarse en taller** con cada responsable de proceso y **aprobarse por la
> Dirección** antes de considerarse la evaluación oficial.»

✅ Es el mismo reparto de `programa_procesos`: **la app propone, la persona
decide, y lo decidido se guarda.** Un riesgo tiene que poder distinguir
«propuesto por la consultoría» de «validado en taller» de «aprobado por
Dirección» — es `estado`, y es el que hace que la matriz sea evidencia.
