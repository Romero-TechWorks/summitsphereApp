# 01 · Visión y alcance

## El problema

Summit-Sphere vende **método**: diagnostica, documenta, capacita, implementa,
audita y acompaña hasta el certificado. Ese método hoy vive repartido entre
carpetas de Drive, hilos de correo, hojas de Excel por cliente, fotos en WhatsApp
y la memoria de los consultores.

Eso tiene tres costos concretos:

1. **El seguimiento se cae entre reuniones.** Un hallazgo de auditoría se comenta,
   se asigna verbalmente y nadie sabe si se cerró hasta la siguiente visita.
2. **La evidencia no está donde se necesita.** El auditor pide el registro de
   calibración; el cliente lo busca veinte minutos en un correo de hace ocho meses.
3. **El valor entregado es invisible.** El cliente paga una implementación de un
   año y sólo *siente* el resultado el día del certificado. En el medio, no ve
   avance — y lo que no se ve, se renegocia.

## La solución

**SummitApp es el sistema de gestión de la firma que gestiona sistemas de gestión.**

Una PWA donde:

- Cada **organización cliente** tiene su expediente vivo: su alcance, sus normas,
  sus documentos, sus procesos, sus riesgos, sus indicadores.
- Cada **auditoría** se planea, se ejecuta *en planta y sin señal*, y sale con su
  informe firmado el mismo día.
- Cada **hallazgo** tiene cláusula citada, evidencia adjunta, responsable, fecha
  compromiso, análisis de causa y verificación de eficacia. No se cierra solo y no
  se pierde.
- Cada **obligación normativa** (una NOM, un dictamen, una recarga de extintores,
  una constancia DC-3) tiene fecha de vencimiento y avisa antes, no después.
- El **cliente ve su propio avance** desde un link, sin cuenta y sin instalar nada.
- Y, al final, un **asistente** lee la norma, juzga la evidencia que llega por
  correo y redacta el procedimiento — la parte que hoy consume las horas caras de
  los consultores.

## A quién sirve

| Persona | Qué hace en la app | Dónde la usa |
|---|---|---|
| **Socio / Director** | Ve la cartera completa, la rentabilidad por proyecto, la carga del equipo. Aprueba. Factura | Escritorio |
| **Consultor líder** | Implementa: documenta el SGC del cliente, sube procedimientos, capacita, da seguimiento a las acciones | Escritorio y tablet |
| **Auditor** | Planea y ejecuta auditorías, levanta hallazgos con evidencia, emite el informe | **Teléfono, en planta, sin señal** |
| **Administración** | Contratos, facturación, cobranza. No entra a expedientes técnicos | Escritorio |
| **Cliente (contacto)** | Ve su avance, sus hallazgos abiertos, sus vencimientos. Sube evidencia | Teléfono, por link público |

## Qué NO es

Decir esto ahorra discusiones más adelante:

- **No es un LMS.** La academia (`academia.summit-sphere.com`) es un producto
  aparte. SummitApp registra *que* una capacitación ocurrió, quién asistió y qué
  constancia se emitió — no imparte el curso.
- **No es un ERP ni un sistema contable completo.** Lleva las finanzas de la firma
  (proyectos, ingresos, gastos, facturación CFDI) al nivel que necesita una
  consultoría de su tamaño, no el de una manufacturera.
- **No es una biblioteca de normas.** El texto íntegro de las normas ISO es obra
  protegida. La app guarda la **estructura de cláusulas** y el resumen redactado
  por Summit; el texto licenciado del cliente vive en su bucket privado.
- **No emite certificados.** Summit implementa y audita internamente; certifica un
  organismo acreditado. La app prepara y acompaña esa auditoría de tercera parte,
  no la sustituye.
- **No sustituye el criterio del auditor.** El asistente propone; una persona
  confirma. **Ninguna escritura del asistente llega a la base sin una pantalla de
  confirmación.** Un hallazgo firmado por un modelo y no por un auditor no vale
  nada ante un organismo certificador.

## El alcance normativo que cubre

**Siete normas ISO certificables**, que son las que la firma maneja:

| Norma | Sistema de gestión |
|---|---|
| **ISO 9001** | Calidad |
| **ISO 14001** | Ambiental |
| **ISO 45001** | Seguridad y salud en el trabajo |
| **ISO 13485** | Dispositivos médicos |
| **ISO 27001** | Seguridad de la información |
| **ISO 37001** | Antisoborno |
| **ISO 37301** | Compliance |

**Cumplimiento normativo mexicano:**

- **STPS — seguridad industrial:** NOM-001 a NOM-036 (incendio, maquinaria,
  sustancias químicas, alturas, espacios confinados, soldadura, eléctricos).
- **STPS — higiene industrial:** NOM-011 (ruido), 015 (térmicas), 024
  (vibraciones), 025 (iluminación), 030, 035 (psicosocial), 036 (ergonómico).
- **SEMARNAT:** NOMs ambientales, licencias ambientales y de funcionamiento.
- **Protección Civil:** programas internos, brigadas, sistemas contra incendio.
- **Gestiones y dictámenes:** eléctricos, estructurales, cédulas de zonificación,
  uso de suelo.

## La metodología, tal como la vende Summit

Las **seis etapas** del proceso de implementación de la firma son un campo de
primera clase en la base de datos (`proyectos.etapa`), no una nota en un
documento. El tablero de la firma **es** este embudo:

| # | Etapa | Qué produce en la app |
|---|---|---|
| 1 | **Diagnóstico inicial** | Matriz de brecha contra la norma: qué existe, qué falta |
| 2 | **Planificación** | Metas SMART, cronograma, responsables |
| 3 | **Documentación y capacitación** | Documentos del SGC + sesiones impartidas + constancias |
| 4 | **Implementación y seguimiento** | Informes mensuales de avance automáticos |
| 5 | **Auditoría interna** | Auditoría, hallazgos, acciones correctivas, revisión por la dirección |
| 6 | **Certificación y soporte** | Acompañamiento a la auditoría externa + 1 año de soporte |

## Principios de diseño

1. **Sin señal tiene que funcionar.** Es el requisito duro, no una mejora. Una
   auditoría se levanta en un sótano industrial.
2. **La evidencia manda.** Todo hallazgo, toda acción cerrada y todo requisito
   cumplido apunta a un archivo o a un registro. Sin evidencia, es una opinión.
3. **Nada se borra.** Se cierra, se anula o se reemplaza, y queda el rastro. Es
   una firma de auditoría: la bitácora es el producto.
4. **El cliente ve su avance sin fricción.** Un link, sin cuenta, sin instalar.
5. **El asistente propone; la persona firma.** Siempre, sin excepción.
6. **Una instancia, muchas organizaciones.** Y los datos de una jamás se le
   aparecen a otra. Esto se garantiza en la base de datos, no en el frontend.

## Referencia: de dónde sale este proyecto

SummitApp toma su arquitectura de **JDM Built**, la PWA de gestión de taller de
autos de carrera que el mismo equipo ya construyó y opera. Se hereda **el
esqueleto probado** —armazón fijo, capa offline, tokens de diseño, patrón de
consultas, bitácora inmutable, portal público, oficina del asistente— y se cambia
**todo el dominio**: donde JDM tiene autos, hojas de trabajo y telemetría,
SummitApp tiene organizaciones, auditorías y hallazgos.

Lo que **no** se hereda, y es la decisión de arquitectura más importante de este
proyecto: JDM Built es de **una instancia por taller** con RLS operativo abierto.
SummitApp es de **una instancia para toda la cartera** con RLS cerrado por
organización. Ver [`08_SEGURIDAD_Y_RLS.md`](08_SEGURIDAD_Y_RLS.md).

Y del plan `Automatización/` se hereda el destino: los **Módulos A, B y C**
(orquestación Microsoft, RAG documental y auditoría multimodal con gamificación)
son las Fases 07 y 08 de este plan. Ver
[`07_ASISTENTE_Y_AUTOMATIZACION.md`](07_ASISTENTE_Y_AUTOMATIZACION.md).
