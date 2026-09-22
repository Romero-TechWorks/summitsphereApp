# SGI-P-CA-09 · Continuidad del Negocio — el dominio que falta entero

> Quinta tanda, 22 sep 2026. Plan de Continuidad + `SGI-F-CA-26` (BIA),
> `-27` (directorio de emergencia y árbol de llamadas), `-28` (bitácora de
> activación) y `-29` (programa de ejercicios). Emisión **24-Ago-2026**.
>
> ⚠️ **No está en ninguna de las ocho fases de `docs/02`.** Se documenta aquí
> para que no se redescubra tarde, no para construirlo ahora.

---

## 1 · Qué es y por qué apareció

ISO 22301:2019 asoma por dos lados: el `SGI-F-CA-23` lista **Continuidad** y
**Ambiental/Climático** como tipos de riesgo 18 y 19 con la norma 22301 al lado,
y `SGI-F-CA-23` declara atender su cláusula 8.2.3. Es el quinto sistema de
gestión de este cliente, aunque no esté en su alcance de certificación.

## 2 · `SGI-F-CA-26` · Análisis de Impacto al Negocio (BIA)

```
Actividad crítica | Proceso | Servicio o entregable afectado |
Impacto de la interrupción (legal, económico, reputacional) |
MTPD | RTO | RPO | Recursos indispensables | Dependencias externas |
Estrategia de continuidad | Responsable
```

- **MTPD** — máximo periodo tolerable de disrupción.
- **RTO** — tiempo objetivo de recuperación.
- **RPO** — máxima pérdida de datos aceptable.

Las siete actividades críticas priorizadas, con sus tiempos:

| # | Actividad | MTPD | RTO | RPO |
|---|---|---|---|---|
| 1 | **Notificaciones, actuarios y control de términos** | 24 h | **4 h** | 24 h |
| 2 | Promociones y audiencias | 24 h | 8 h | 24 h |
| 3 | Acceso al expediente físico y digital | 48 h | 8 h | 24 h |
| 4 | Consultas urgentes y contact center | 72 h | 24 h | 24 h |
| 5 | Coordinación de corresponsales | 72 h | 24 h | — |
| 6 | Facturación, cobranza y nómina | 15 días | 72 h | 24 h |
| 7 | Gestión documental y soporte | 15 días | 5 días | — |

⚠️ **El impacto está clasificado en texto, no en la escala 1-5**: «CRÍTICO. El
vencimiento de un término es **irreversible**: precluye el derecho». Es la misma
severidad 5 del `SGI-F-CA-23` («pérdida irreversible de derechos del cliente»)
dicha en prosa. Si esto se modela, la severidad sale de ahí y no se captura dos
veces.

## 3 · `SGI-F-CA-28` · Bitácora de activación — un incidente con folio

Folio `BCP-____-____` y tres hojas: **datos de la activación**, **línea de
tiempo** y **términos en riesgo**.

| Campo | Valores |
|---|---|
| **Escenario** | Clima extremo · Sismo · Incendio · Falla eléctrica o de telecomunicaciones · **Incidente cibernético** · Pérdida de acceso al inmueble · Ausencia de personal · Falla de proveedor |
| **Nivel declarado** | Nivel 1 menor · Nivel 2 mayor · Nivel 3 crítico |
| Quién declara | La activación **y el cierre**, por separado |
| Afectación | Personas · instalaciones · sistemas · **expedientes** · actividades críticas |
| ⚠️ **¿Involucra datos personales?** | **Sí ⇒ activa `SGI-P-COM-10`** |
| Clientes a notificar | |

✅ **El enlace con privacidad está en el formato**, no en la cabeza de alguien:
una activación con datos personales **dispara el otro procedimiento y su reloj de
72 horas**. Es el tipo de regla que la app haría bien y un Word no hace.

⚠️ **La hoja «Términos en riesgo» no tiene equivalente en ningún modelo nuestro**:
durante una disrupción hay que listar los plazos procesales que vencen mientras
dura. Es específica de un despacho, y es el mejor ejemplo de por qué el
`obligaciones` de `F05·B2` **no puede asumir que todo lo que vence es un
dictamen**.

## 4 · `SGI-F-CA-29` · Programa de ejercicios

> «**Un plan no probado no es confiable.**»

```
Ejercicio | Tipo | Objetivo | Alcance y participantes | Frecuencia mínima |
Mes programado | Responsable | Estatus
```

Tipos: **Escritorio · Comunicación · Técnico · Simulacro · Operativo**.
Siete ejercicios cargados, con frecuencias **anual, semestral y trimestral**.

✅ **Es la misma forma que `programa_auditorias` + `programa_procesos`**: una
parrilla anual con mes programado, responsable y estatus. El widget del
`F-SG-09`, otra vez. Si esto se construye, reusa esa pantalla.

⚠️ Y el ejercicio 5 es un **simulacro de evacuación con brigadas** — que es
Protección Civil, es decir **`F05·B2`**. El programa de ejercicios de continuidad
y el calendario de obligaciones de cumplimiento **se solapan** y hay que decidir
si son una tabla o dos antes de construir `B2`.

## 5 · `SGI-F-CA-27` · Directorio de emergencia y árbol de llamadas

Contactos con orden de llamada. Es `contactos` con dos columnas más (orden y
suplente) — no justifica tabla propia.

## 6 · Qué haría falta si esto entra al producto

| Pieza | Nota |
|---|---|
| `actividades_criticas` (BIA) | 7 columnas + MTPD/RTO/RPO, por organización |
| `activaciones` | Folio, escenario, nivel, línea de tiempo, cierre |
| `ejercicios_continuidad` | Parrilla anual — reusa la del programa |
| Enlace a privacidad | «¿Involucra datos personales?» dispara el expediente `VDP-` |

⚠️ **CORREGIDO EL 22 SEP 2026 POR DECISIÓN DEL DUEÑO.** Aquí decía «no abrirlo
como fase: con un solo cliente es un interruptor muerto». **Es al revés:**

> «La Continuidad es un **Servicio Aparte que se vende**. Tener un apartado de
> Servicios Extras que se ofrecen y **en qué clientes están activos** es una
> excelente idea.»

✅ **No es un dominio, es una línea de servicio**, y eso resuelve justo la
objeción de la regla 11: el módulo **no se pinta para todos, se pinta para quien
lo contrató**. Hacen falta `servicios` (catálogo de la firma, sin `org_id`) y
`org_servicios` (quién lo tiene activo, desde cuándo, con qué alcance y quién lo
lleva). **Hueco 39** · [decisión completa](DECISIONES_22_SEP_2026.md#5--continuidad-es-un-servicio-y-eso-abre-algo-más-grande).

**Sigue valiendo, y es lo barato de hacer ya:** que **`riesgos.tipo` acepte
`continuidad` y `ambiental`** —cuesta dos valores de CHECK— para que los 249
riesgos de este cliente entren completos cuando se carguen.
