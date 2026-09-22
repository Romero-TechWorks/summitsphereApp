# Cliente 02 · César Roel Abogados — el SGI multinorma

> Quinta tanda, **22 sep 2026**. 164 archivos en `docs/nuevosFormatos/` (72 MB,
> **no se commitean**). Es la primera entrega de un **segundo cliente**, y eso
> cambia más cosas que su contenido.

---

## 1 · ⚠️ Esto NO es más documentación de ATELIER

| | Cliente 01 | Cliente 02 |
|---|---|---|
| Quién | **GRUPO ATELIER / ATELIER TEA** | **César Roel Abogados (SABOLA)** |
| Giro | Constructora — supervisión y gestión de obras | **Despacho jurídico**, derecho laboral |
| Sede | — | Av. Paseo del Pedregal 817, Álvaro Obregón, CDMX |
| Normas | **ISO 9001:2015** sola | **ISO 9001:2015 + ISO/IEC 27001:2022 + ISO 37001:2016 + ISO 37301:2021** (y 22301 asomando en continuidad) |
| Sistema | SGC — Sistema de Gestión de **Calidad** | **SGI** — Sistema de Gestión **Integral** |
| Codificación | `P-SG-03`, `F-SG-12` | `SGI-P-CA-03`, `SGI-F-CA-12` |
| Proyecto | — | Arrancó **may 2025**, corte **8 jul 2026**: 14 meses |

⚠️ **La consecuencia grande: la multi-tenencia deja de ser teórica.** Hasta ahora
la regla 1 estaba escrita y probada con datos sembrados, pero la cartera real
tenía **un** cliente. Ahora hay dos, de giros distintos, con catálogos
documentales distintos y **normas distintas** — y el expediente de uno no puede
aparecerle al otro. El criterio de cierre de la Fase 01 («la prueba con datos
reales y una segunda cuenta») por fin tiene con qué hacerse.

## 2 · ✅ Lo que este cliente VALIDA de lo ya construido

### 2.1 · El catálogo de formatos de Summit es una PLANTILLA, no el de un cliente

`SGI-F-CA-01` es la Lista Maestra, `SGI-F-CA-06` el Reporte de No Conformidad,
`SGI-F-CA-07` el 5 ¿Por qué?, `SGI-F-CA-09` el Programa Anual, `SGI-F-CA-11` la
Planeación y Agenda, `SGI-F-CA-12` el Reporte Final, `SGI-F-CA-16` el Plan de
Mejora, `SGI-F-CA-17` la Base de Datos de NC, `SGI-F-CA-24` la Gestión de
Cambios. **Son los mismos formatos de ATELIER con otro prefijo.**

✅ Confirma la decisión de `F03·B2`: la plantilla de listas de verificación vive
en `config_firma.plantillas`, no en una tabla por cliente. **Summit reusa su
propio catálogo** y lo recodifica al entrar a cada cliente.
⚠️ Y confirma el **hueco 2**: la clave del cliente (`AI-01-25`, `SGI-P-CA-03`)
no compite con nuestro folio — convive.

### 2.2 · El modelo de la Fase 03 y la Fase 04 aguantó el cambio de giro

Ni `auditorias`, ni `hallazgos`, ni `acciones`, ni el ciclo de mejora necesitan
un solo cambio para este cliente. Lo único que se amplía es el **criterio** de
auditoría —ahora es por norma— y eso ya vive en `auditoria_normas`.

### 2.3 · El `alcance` y las exclusiones, otra vez

`SGI-P-CA-03` audita «frente a las **cuatro** normas de referencia», con criterios
distintos por norma: el **Anexo A / SoA** para 27001, los controles antisoborno
para 37001, las **obligaciones de compliance** para 37301. Es exactamente el caso
que el `README` §1.2 anticipó («el informe agrupa por norma cuando el alcance
tiene más de una») y que el original de ATELIER nunca necesitó.

⚠️ **Y trae un requisito de competencia del auditor POR NORMA**: además de auditor
interno (ISO 19011:2018), hay que acreditar interpretación de 27001, 37001 o 37301
«según corresponda al alcance asignado». Eso es `auditoria_equipo` con una
condición que hoy no existe, y el perfil de auditor de `F06·B3`.

## 3 · ⚠️ Lo que este cliente ROMPE o amplía

### 3.1 · Cuatro categorías de aviso más, y salen gratis HOY

La matriz de comunicación del `SGI-P-CA-08` integrado pasó de **doce renglones a
dieciséis**. Las cuatro nuevas:

| Qué comunicar | Cuándo | A quién |
|---|---|---|
| Política antisoborno y de compliance | Al ingreso y ante cambios | Todo el personal **y terceros** |
| Canal de denuncias y no represalias | Al ingreso y **permanente** | Todo el personal y terceros |
| Incidentes de seguridad de la información | **Por evento** | TI / Coordinador / Dirección |
| Obligaciones de compliance y su cumplimiento | Periódico y ante cambios | Dirección y responsables |

⚠️ **`20260909120000` SIGUE SIN APLICARSE, así que ampliar su CHECK cuesta cero.**
Tiene trece valores; con éstos son diecisiete. Aplicada, serían otra migración.
Es el mismo aviso que se dio con `E00` y las cuatro `fuente_nc` — aquella vez se
aplicó antes y costó. **Hueco 29.**

### 3.2 · Una quinta escala de riesgo — y ésta SUSTITUYE a las cuatro

Ver la ficha [`SGI-F-CA-23`](SGI-F-CA-23_matriz_de_riesgos.md). En resumen:
`P-SG-04` traía cuatro escalas incompatibles; el `SGI-F-CA-23` trae **una sola**,
5×5 con inherente y residual, y **la regla de reducción por efectividad del
control es computable**. Es mejor metodología y es más reciente (26 ago 2026).

### 3.3 · Dos dominios que no están en ninguna fase

- **Continuidad del negocio** (`SGI-P-CA-09` + cuatro formatos): BIA con
  MTPD/RTO/RPO, bitácora de activación con folio, árbol de llamadas, programa de
  ejercicios. Ver [su ficha](SGI-P-CA-09_continuidad.md).
- **Privacidad y datos personales** (`SGI-P-COM-10` + cinco formatos): inventario,
  avisos, **derechos ARCO con plazos en días hábiles**, bitácora de
  vulneraciones. Ver [su ficha](SGI-P-COM-10_privacidad_y_arco.md).

### 3.4 · `procesos` de un despacho no son `procesos` de una planta

Dirección · Calidad · Finanzas · Corresponsalía · Litigio · Cumplimiento ·
Mantenimiento · RH · TI · Recepción · Archivo · Control de Calidad · Amparos.
Nuestro `procesos.tipo` es `estrategico/operativo/soporte` y aguanta, pero
`procesos.codigo` —la tarea `E05` del dueño, que en ATELIER sigue con **uno de
doce** lleno— aquí ya viene **resuelto en el papel**: es la tabla de arriba.

## 4 · Los números del proyecto, que valen como dimensionamiento

Del `Informe General de Avances SGI 2025-2026` (corte 8 jul 2026):

| | |
|---|---|
| Sesiones de trabajo documentadas | **61** (may 2025 – jul 2026) |
| Análisis y Diagnóstico por área (A&D) | 17 |
| Descriptivos de puesto | **26** |
| Procedimientos operativos por área | 11 |
| Documentos rectores (Manual + 8 `CA`) | 9 |
| POE de TI | 20 (borrador) |
| Formatos y registros | **50+** |
| Diagramas de flujo | **70+** |
| **Riesgos identificados** | **197** → **249** en la matriz de ago 2026 |
| **Indicadores propuestos** | **95** |

⚠️ **249 riesgos y 95 indicadores en UN cliente.** Las pantallas de riesgos e
indicadores de `/sistemas` se diseñaron sin un número delante; con esto, la lista
de riesgos de una organización es de **cientos de filas** y necesita el mismo
trato que la cartera: descarga completa y **filtro en memoria** (regla offline 7),
nunca una consulta por filtro.

## 5 · ⚠️ Tres cosas que hay que hacer con la carpeta, no con el código

1. **`docs/nuevosFormatos/` NO está en `.gitignore` y son 72 MB.** Un `git add .`
   los mete al repositorio. Va al `.gitignore` en el mismo commit que estas
   fichas, igual que `docsFase4/` y `formatosNuevos/`.
2. ⚠️ **`Normas/` contiene el TEXTO ÍNTEGRO de ISO 9001, 27001, 37001 y 37301** —
   y el PDF de 27001 lleva en sus metadatos `TOAZ.INFO`, un sitio de descargas
   piratas. **Regla 12**: el texto de una norma no entra al repositorio ni a la
   base. Lo que entra es la **estructura de cláusulas con el resumen de Summit**,
   por el importador de `/sistemas`; el PDF licenciado va al bucket privado con
   su licencia. Hay que preguntarle a Summit **de dónde salieron** y si tienen
   licencia — no es una cuestión de comodidad.
3. El `Informe SGI Julio 2025.pdf` y `Mayo y Junio 2025.pdf` son entregables
   previos; su contenido está consolidado en el Informe General, así que no hacen
   falta para especificar nada.

## 6 · Erratas del cliente y de la consultoría en esta tanda

| Dónde | Dice | Debería |
|---|---|---|
| `SGI-P-COM-02`, portada interior | `SGI-P-SGI-02` | `SGI-P-COM-02` (el nombre del archivo) |
| `SGI-P-COM-02` §5.1 | Matriz de obligaciones `SGI-F-SGI-18` | El archivo entregado es `SGI-F-COM-18` |
| `SGI-P-COM-02` §5.6 | Plan de tratamiento `SGI-F-SGI-20` | **No existe** en la entrega (llega hasta `F-SGI-17`) |
| `SGI-P-CA-01` tabla de codificación | `CP` = Corresponsalía **y** Cumplimiento | Lo señala el propio análisis de brechas: sugiere `CU` o `AS` |
| `SGI-P-CA-05/06/07`, portada | `P-SG-0X` | `SGI-P-CA-0X` — código viejo sin homologar |
| Procedimientos vs perfiles | «Coordinador **ESG**» vs «Coordinador del **SGI**» | Un solo nombre de rol |
| `SGI-P-CA-04` | «`SGI-F-OP-14` Matriz IPERC» | Prefijo `OP` ajeno a este cliente — **es de ATELIER** |
| `F-CA-01`, columna `Días por vencer` | `404` en todos los renglones | Fórmula contra «Fecha de hoy» congelada |
| `F-COM-18`, hoja Resumen | `#REF!` en las tres cuentas | Fórmula rota |

⚠️ **La del IPERC importa.** `SGI-P-CA-04` de este cliente **arrastra la
referencia al formato de la constructora**. Es la prueba de que el catálogo se
recicla entre clientes sin depurar del todo — y es exactamente el trabajo que la
app evita cuando la plantilla vive en `config_firma` y no en un Word.
