# 10 · Glosario

Del vocabulario de la firma al nombre en la base de datos. Sirve para dos cosas:
que un programador entienda lo que le piden, y que un consultor entienda lo que le
enseña la pantalla.

---

## Sistemas de gestión

| Término | Qué es | En la app |
|---|---|---|
| **SGC / SGA / SGSST** | Sistema de Gestión de Calidad / Ambiental / de Seguridad y Salud | El conjunto de `documentos` + `procesos` + `requisitos` de una organización |
| **Alcance** | Qué partes de la organización cubre el sistema | `proyecto_normas` + `proyecto_sitios` |
| **Cláusula / requisito de la norma** | Cada punto numerado de una norma (`8.5.1`) | `norma_clausulas` |
| **Cláusula auditable** | Las que se verifican; los capítulos 0-3 son introductorios | `norma_clausulas.auditable` |
| **No aplica / exclusión** | Una cláusula que la organización justifica no aplicar | `requisitos.estado = 'no_aplica'` + `justificacion` **obligatoria** |
| **Información documentada** | El nombre que ISO le da a documentos y registros desde 2015 | `documentos` + `documento_versiones` |
| **Control documental** | Que exista una sola versión vigente, aprobada y localizable | El ciclo `borrador → en_revision → aprobado → obsoleto` |
| **Lista maestra de documentos** | El índice de todo lo vigente | Vista generada, no una tabla |
| **Mapa de procesos** | Los procesos y cómo se enlazan | `procesos` con su tipo |
| **Partes interesadas** | Clientes, personal, autoridad, comunidad, proveedores | Se documenta en el contexto del proyecto |
| **Revisión por la dirección** | La reunión anual donde la dirección evalúa el sistema | Entregable imprimible; se alimenta de indicadores + hallazgos |

## Auditoría

| Término | Qué es | En la app |
|---|---|---|
| **Auditoría de primera parte** | Interna, la organización se audita a sí misma (o Summit por ella) | `auditorias.tipo = 'interna'` |
| **Auditoría de segunda parte** | A un proveedor | `tipo = 'proveedor'` |
| **Auditoría de tercera parte** | La del organismo certificador | `tipo = 'certificacion_acompanamiento'` — Summit acompaña, no la ejecuta |
| **Criterios de auditoría** | Contra qué se audita: la norma, la ley, los procedimientos propios | `auditorias.criterios` |
| **Evidencia objetiva** | Lo que se vio, dónde y cuándo. Verificable | `hallazgos.evidencia_objetiva`, **obligatorio** |
| **Lista de verificación / checklist** | Las preguntas del recorrido | `auditoria_items`, generada desde el alcance |
| **Reunión de apertura / cierre** | Inicio y fin de la auditoría con el auditado | Entradas de `auditoria_agenda` |
| **Hallazgo** | El resultado de comparar evidencia contra criterio | `hallazgos` |
| **No conformidad mayor** | Ausencia total de un requisito, falla sistémica, o riesgo grave | `tipo = 'nc_mayor'` |
| **No conformidad menor** | Falla puntual que no compromete el sistema | `tipo = 'nc_menor'` |
| **Observación** | No incumple, pero puede llegar a hacerlo | `tipo = 'observacion'` |
| **Oportunidad de mejora (OM)** | Cumple, y podría hacerse mejor | `tipo = 'oportunidad_mejora'` |
| **Auditor líder** | Quien encabeza el equipo y firma el informe | `auditorias.auditor_lider_id` |

## Acciones

| Término | Qué es | En la app |
|---|---|---|
| **Corrección** | Apagar el fuego: arreglar lo que está mal ahora | `acciones.tipo = 'correccion'` |
| **Acción correctiva** | Eliminar la causa para que no vuelva a pasar | `tipo = 'accion_correctiva'` |
| **Análisis de causa raíz** | Por qué pasó de verdad | `causa_analisis jsonb`, estructurado |
| **5 porqués** | Preguntar "¿por qué?" cinco veces | `causa_metodo = 'cinco_porques'` |
| **Ishikawa / espina de pescado / 6M** | Causas por método, máquina, material, mano de obra, medio ambiente, medición | `causa_metodo = 'ishikawa'` |
| **Verificación de eficacia** | Comprobar, meses después, que la acción sirvió | `eficacia_verificada_en` + `eficacia_resultado`. **Sin esto no se cierra** |
| **Fecha compromiso** | Cuándo se comprometió el cliente a resolver | `fecha_compromiso` |

⚠️ **Corrección ≠ acción correctiva.** Es la confusión más común en los SGC
reales y la app la separa a propósito. Cambiar el extintor vencido es una
corrección; que exista un programa de recargas es la acción correctiva.

## Cumplimiento normativo

| Término | Qué es | En la app |
|---|---|---|
| **NOM** | Norma Oficial Mexicana. **Obligatoria por ley**, a diferencia de una ISO | `noms` |
| **STPS** | Secretaría del Trabajo y Previsión Social | `noms.autoridad = 'stps'` |
| **SEMARNAT** | Secretaría de Medio Ambiente y Recursos Naturales | `autoridad = 'semarnat'` |
| **Matriz de aplicabilidad** | Qué NOMs le aplican a esta empresa y por qué | `org_noms` |
| **Evaluación de cumplimiento** | Punto por punto: cumple / no cumple | `org_nom_requisitos` |
| **Estudio** | Medición técnica con vigencia: ruido, iluminación, térmicas | `obligaciones.tipo = 'estudio'` |
| **Dictamen** | Certificación de un tercero acreditado: eléctrico, estructural | `tipo = 'dictamen'` |
| **CSH / Comisión de Seguridad e Higiene** | Comisión mixta obligatoria (NOM-019) | Se registra como obligación con su acta |
| **PIPC** | Programa Interno de Protección Civil | `tipo = 'permiso'`, autoridad Protección Civil |
| **Prima de riesgo** | Lo que la empresa paga al IMSS según su siniestralidad | Beneficio del servicio; no es un dato de la app |

### Las NOMs que más aparecen

| NOM | Tema |
|---|---|
| **NOM-002** | Prevención y protección contra incendios |
| **NOM-009 / 033** | Trabajos en altura / espacios confinados |
| **NOM-011** | Ruido |
| **NOM-015** | Condiciones térmicas |
| **NOM-017** | Equipo de protección personal |
| **NOM-018** | Comunicación de peligros — GHS |
| **NOM-019** | Comisiones de seguridad e higiene |
| **NOM-022 / 029** | Electricidad estática / instalaciones eléctricas |
| **NOM-024** | Vibraciones |
| **NOM-025** | Iluminación |
| **NOM-026** | Colores y señales de seguridad |
| **NOM-030** | Servicios preventivos de seguridad y salud |
| **NOM-035** | Factores de riesgo psicosocial |
| **NOM-036** | Factores de riesgo ergonómico |

## Capacitación

| Término | Qué es | En la app |
|---|---|---|
| **DNC** | Detección de Necesidades de Capacitación | `dnc` |
| **DC-3** | Constancia oficial de competencias, formato STPS | `asistentes.folio_dc3` |
| **Agente capacitador externo** | Registro de la firma ante la STPS para emitir DC-3 | `config_firma` |
| **Brigada** | Grupo entrenado para emergencias | Cursos `tipo = 'brigada'` |

## Términos de la app

| Término | Qué es |
|---|---|
| **Organización** | El cliente. La raíz de todo: cada dato del sistema le pertenece a una |
| **Sitio** | Un centro de trabajo. Una organización puede tener varios, y el alcance cubrir sólo algunos |
| **Proyecto** | El contrato. Tiene tipo, alcance, líder y **etapa** |
| **Etapa** | Una de las seis de la metodología de Summit. El embudo del tablero |
| **Requisito** | Una cláusula aplicada a un proyecto, con su estado de avance. La **matriz** |
| **Obligación** | Algo que vence: un estudio, un dictamen, una licencia, una recarga |
| **Traza** | El registro de cada cosa que hizo el asistente y si se confirmó |
| **Propuesta** | Lo que el asistente sugiere. **Todavía no existe en la base** hasta que alguien confirma |
| **Portal** | La vista pública del cliente, por link, sin cuenta |
| **Salud del SGC** | El puntaje 0–1000 de la Fase 08 |
| **`offlineWrite`** | Por donde pasa **toda** escritura. Si hay señal viaja, si no se encola |
| **Outbox** | La cola de cambios esperando señal |
| **Precarga** | Bajar una auditoría entera a la caché antes de entrar a planta |

## Términos técnicos que aparecen en la documentación

| Término | Qué significa aquí |
|---|---|
| **RLS** | Row Level Security. Las reglas de Postgres que impiden que un consultor vea un cliente que no le toca |
| **RPC** | Una función de la base a la que la app llama directo |
| **`security_invoker`** | La propiedad que hace que una vista respete el RLS de quien la consulta. Sin ella, la vista lo salta |
| **`SECURITY DEFINER`** | Una función que corre con los permisos de quien la creó. Potente y peligrosa; se usa poco y auditada |
| **PWA** | Aplicación web instalable. Se agrega a la pantalla de inicio y funciona sin señal |
| **Service worker** | El programa que hace que la PWA funcione sin señal y reciba notificaciones |
| **RAG** | Buscar el fragmento correcto de un documento y pasárselo al modelo, en vez de mandarle el documento entero |
| **Embedding** | La representación numérica de un texto, que permite buscar por significado y no por palabra exacta |
| **RRF** | La forma de fundir dos listas de resultados —por significado y por palabra— en una sola |
| **Token** | La unidad con la que cobran los modelos. La *Token Diet* del Módulo B es reducir cuántos se gastan |
| **OpenXML** | El formato interno de un `.docx`: un ZIP con archivos XML dentro |
| **MS Graph** | La API con la que Microsoft expone Teams, Outlook, Planner y To Do |
| **CFDI** | Comprobante Fiscal Digital por Internet. La factura electrónica del SAT |
| **PAC** | Proveedor Autorizado de Certificación. Quien timbra las facturas ante el SAT |
| **CSD** | Certificado de Sello Digital. Los archivos `.cer` y `.key` con los que se firma una factura |
