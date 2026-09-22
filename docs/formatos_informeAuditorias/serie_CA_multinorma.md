# Serie `SGI-P-CA` integrada + el Análisis de Brechas — lo que cambia con cuatro normas

> Quinta tanda, 22 sep 2026. Los ocho procedimientos rectores en **dos
> versiones** —la original (jul 2025) y la **integrada multinorma** (25-Ago-2026)—
> más el `Análisis de Brechas Documentales`, que es el mapa de ruta.

---

## 1 · Los ocho son los nuestros, con otro nombre

| Integrado | Equivale a | Ficha existente |
|---|---|---|
| `SGI-P-CA-01` Control de Información Documentada | `P-SG-01` | [ficha](P-SG-01_control_documental.md) |
| `SGI-P-CA-02` Servicio No Conforme | `P-SG-02` | [ficha](P-SG-02_servicio_no_conforme.md) |
| `SGI-P-CA-03` Auditorías Internas | `P-SG-03` | [ficha](P-SG-03_procedimiento.md) |
| `SGI-P-CA-04` Riesgos y Oportunidades | `P-SG-04` | [ficha](P-SG-04_riesgos_y_oportunidades.md) · **y [`SGI-F-CA-23`](SGI-F-CA-23_matriz_de_riesgos.md) lo supera** |
| `SGI-P-CA-05` Acciones Correctivas | `P-SG-05` | [ficha](P-SG-05_procedimiento_acciones_correctivas.md) |
| `SGI-P-CA-06` Medición, Análisis y Mejora | `P-SG-06` | [ficha](P-SG-06_medicion_indicadores_y_mejora.md) |
| `SGI-P-CA-07` Satisfacción de Clientes | `P-SG-07` | [ficha](P-SG-07_satisfaccion_quejas_y_sugerencias.md) |
| `SGI-P-CA-08` Comunicación | `P-SG-08` | [ficha](P-SG-08_comunicacion.md) |

✅ **Nada de la Fase 03 ni de la Fase 04 se invalida.** Lo que cambia es el
*alcance* de cada uno, no su mecánica. Las fichas existentes siguen vigentes.

## 2 · Lo que la integración multinorma añade, procedimiento por procedimiento

| Procedimiento | Qué añade y a qué afecta |
|---|---|
| **CA-01** Documentada | **Clasificación de la información**: `Público · Interno · Confidencial · Restringido`, con nivel de acceso y retención **en la lista maestra**. Y un rol nuevo, **«propietario de la información»**. ⚠️ Es el hueco 24 con dos columnas más |
| **CA-02** Servicio no conforme | Se amplía a **incidentes de SI, incumplimientos de compliance y señales de soborno**. Refuerza «toda salida no conforme es una NC» |
| **CA-03** Auditorías | ⚠️ **Criterios por norma**: Anexo A/SoA para 27001, controles antisoborno para 37001, obligaciones de compliance para 37301. Y **competencia del auditor por norma** (ISO 19011:2018) |
| **CA-04** Riesgos | Metodologías de riesgo de SI (27001 6.1.2/6.1.3), de soborno (37001 4.5) y de compliance (37301 4.6) en un solo marco |
| **CA-05** Acciones | **Reacción ante incidentes** y **no represalias** |
| **CA-06** Medición | **Evaluación del cumplimiento por norma** |
| **CA-07** Satisfacción | ⚠️ **Distingue queja de cliente de DENUNCIA.** No son lo mismo y no van al mismo sitio |
| **CA-08** Comunicación | **Canal de denuncias** (37001 8.9 / 37301 8.3), no represalias, comunicación de incidentes. **Cuatro categorías nuevas** — ver [cliente 02](cliente_02_cesar_roel.md) §3.1 |

### ⚠️ Dos que tocan cosas ya construidas

1. **`CA-03` · criterios por norma.** Nuestra `generar_lista_verificacion()` toma
   las cláusulas hoja del alcance. Con 27001 el criterio **no son las cláusulas:
   son los 93 controles del Anexo A declarados aplicables en el SoA**. Un punto
   de lista de verificación tiene que poder colgar de un **control**, no sólo de
   una cláusula. Es aditivo (`auditoria_items.control_id` nullable) pero no es
   gratis. **Hueco 36.**
2. **`CA-07` · queja ≠ denuncia.** `PanelQuejas` (F04·B1) trata toda queja igual.
   Una **denuncia de la línea ética** es anónima o confidencial, va a un canal
   independiente, **no puede verla el jefe del denunciado** y tiene protección
   contra represalias. Meterla en `quejas` sería una fuga de las serias: el RLS
   de `quejas` filtra por `org_id`, y aquí hace falta filtrar por **persona**.
   **Hueco 37**, y es de seguridad.

## 3 · El Análisis de Brechas — el entregable que la app debería producir

Documento de la consultoría (25-Ago-2026, v1.0). Su estructura:

1. Objetivo y alcance
2. **Qué quedó cubierto** con los procedimientos integrados — tabla
   `procedimiento → requisitos que cubre en las 4 normas`
3. **Resumen de brechas prioritarias** — tabla `# · documento a crear · norma(s) ·
   prioridad (Alta/Media)`, **20 renglones**
4. **Detalle por norma** — 27001, 37001, 37301
5. **Formatos nuevos referenciados** que hay que crear
6. **Hallazgos y observaciones** de la documentación existente
7. **Hoja de ruta en cuatro etapas**

⚠️ **Esto es la matriz de requisitos de `F02·B3` vista desde el otro lado.**
Nuestra matriz responde *«¿qué requisito de la norma cubre este documento?»*; el
análisis de brechas responde *«¿qué requisito no cubre ninguno?»*. **Es la misma
tabla con un filtro distinto** — `requisitos` con `estado = 'no_cubierto'`.

✅ **Y es un entregable vendible que sale gratis** si la matriz de requisitos se
llena: hoy Summit lo escribe a mano en Word. Vale para `G01`.

⚠️ **La prioridad no es nuestra `estado`.** «Alta corresponde a documentación
exigida de forma explícita por la norma y sin la cual **no es posible
certificar**». Es un dato del requisito, no del avance. `requisitos` necesita
saber si un punto es **obligatorio para certificar**. **Hueco 38.**

## 4 · Las 20 brechas, agrupadas — porque son el catálogo de servicios

| Grupo | Documentos | Norma |
|---|---|---|
| **Rectores** | Alcance del SGI · Política de SI · Política Antisoborno · Política de Compliance · Código de Ética | 27001, 37001, 37301 |
| **Riesgos y obligaciones** | **Declaración de Aplicabilidad (SoA)** · Plan de Tratamiento de Riesgos de SI · **Registro de Obligaciones de Compliance** · Objetivos con indicadores por norma | 27001, 37301 |
| **Gobierno** | Designación de la función de compliance/antisoborno · Procedimiento de Revisión por la Dirección | 37001, 37301, todas |
| **Controles** | Debida diligencia · Política de regalos y conflictos · Canal de denuncias · Controles financieros y no financieros | 37001, 37301 |
| **Registros** | Inventario de activos y su clasificación · Bitácora de incidentes de SI | 27001 |
| **Transversal** | Programa de concientización · Ampliar contexto y partes interesadas · Manual integrado | todas |

⚠️ **La `Declaración de Aplicabilidad` merece atención aparte.** Es la lista de
los **93 controles del Anexo A de 27001** con *aplica / no aplica*, su
**justificación** y su estado de implementación. Estructuralmente es **idéntica a
`requisitos`** de `F02·B3` —cláusula, aplica, justificación obligatoria, avance—
sólo que el catálogo no es de cláusulas sino de controles. ✅ **El importador de
normas ya sabe leer un árbol: el Anexo A es un árbol.** Probablemente no haga
falta modelo nuevo, sólo cargarlo como una «norma» más.

## 5 · La codificación `AAA-B-CC-##`, confirmada y ampliada

`SGI-P-CA-01` §5.2: tres letras del sistema · tipo de documento (`M` manual,
`P` procedimiento, `F` formato, `DP` diagrama, `L` plan de calidad, `G` guía,
`OF` oficio) · **dos letras del proceso** · consecutivo de dos dígitos.

Procesos: `DI` Dirección · `CA` Calidad · `FN` Finanzas · `CP` Corresponsalía ·
`LT` Litigio · `CM` Cumplimiento/Antisoborno · `MT` Mantenimiento · `RH` RH ·
`TI` TI · `RC` Recepción · `AH` Archivo · `CC` Control de Calidad · `AP` Amparos.

✅ **Es el hueco 24 (`documentos.codigo` `A-BB-##`) con el prefijo del sistema
delante**, y confirma que el prefijo es **por cliente**: `SGI-` aquí, nada en
ATELIER. Va en `config_firma` o en `organizaciones`, no en el código.
⚠️ Y trae su propio defecto: **`CP` significa dos cosas** (Corresponsalía y
Cumplimiento). Un `unique (org_id, codigo)` lo habría impedido el primer día.
