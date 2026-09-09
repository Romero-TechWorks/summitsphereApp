# F-SG-18 · Minuta de Revisión por la Dirección  (+ F-SG-20)

> Transcripción de los dos `.docx` (cuarta tanda, 7 sep 2026). Versión 0.
>
> **Es Fase 06** (`F06·B2` plantillas y reportes) y una **fuente de NC** de la
> Fase 04: `fuente_nc = 'revision_direccion'` ya está en el CHECK de
> `20260902120000`.

---

## 1 · Por qué importa más de lo que parece

La Revisión por la Dirección es **el documento que consume a todos los demás**.
Sus siete entradas son, una por una, la salida de un módulo de SummitApp:

| Entrada de la agenda | De dónde sale en la app |
|---|---|
| 1 · Revisión de la Política de Calidad | `documentos` (`C-SG-01`) |
| 2 · **Estado de las acciones de revisiones previas** | `acciones` — el F-SG-18 anterior |
| 3 · Cambios en cuestiones externas e internas | `F-SG-21` Análisis de Contexto |
| 4a · Satisfacción del cliente y partes interesadas | `F-SG-13` · `F-SG-22` |
| 4b · Grado de logro de los objetivos de calidad | `indicadores` · `F-SG-19` |
| 4c · Desempeño de los procesos y conformidad del servicio | `F-SG-15` · `F-SG-14` |
| 4d · **No conformidades y acciones correctivas** | `hallazgos` + `acciones` — **F04** |
| 4e · Resultados de seguimiento y medición | `mediciones` |
| 4f · **Resultados de la auditoría** | `auditorias` + `F-SG-12` — **F03 ✅** |
| 4g · Desempeño de los proveedores externos | `P-CO-02` — **no llegó** |
| 5 · Adecuación de los recursos | captura |
| 6 · Eficacia de las acciones sobre riesgos y oportunidades | `F-SG-23` cols. «¿Es eficaz?» |
| 7 · Nuevas oportunidades de mejora | `acciones` con `tipo = 'mejora'` |

**Salidas** (cuatro): oportunidades de mejora · necesidad de cambio en el SGC ·
necesidades de recursos · conclusión.

⚠️ **Es el argumento comercial de la app entero en una página.** Hoy un
Coordinador de SGC arma esta minuta a mano juntando siete archivos. Con las Fases
02-04 cerradas, **doce de sus dieciséis bloques salen de consultas que ya
existen**. Es el mejor candidato a «informe generado» de `F06·B2`, por encima de
cualquier otro.

---

## 2 · Estructura

Cabecera (`Fecha`, `Lugar`, `Objetivo` —**preescrito y fijo en el formato**—,
`Agenda` con las siete entradas y las cuatro salidas, `Asistentes` en cuatro
renglones), luego **un bloque de texto por cada punto**, y al pie
`ELABORADO POR: Coordinador de SGC`.

⚠️ **El «Objetivo» viene escrito en la plantilla**, no se captura: *«Verificar el
grado de cumplimiento e implantación del SGC de acuerdo con la norma ISO
9001:2015 y los requisitos de la organización…»*. Es texto de la firma, va en
`config_firma.plantillas` como la de tareas y la de verificación.

---

## 3 · F-SG-20 · Minuta de Junta de Calidad

La reunión **trimestral** de `P-SG-06` §5.1, y el registro de reuniones de
`P-SG-08` §5.2. Cuatro bloques:

```
  TEMA ______________              FECHA ______
  ASISTENTES (Nombre y Firma)          (cinco renglones)
  DESARROLLO DE LA REUNIÓN             (bloque libre)
  ┌─────────────┬─────────────┬──────────────┬──────────────────┬──────────┐
  │ COMPROMISOS │ RESPONSABLE │ FECHA ORIGEN │ FECHA COMPROMISO │ % Avance │
  │ PENDIENTES: │             │              │                  │          │
  └─────────────┴─────────────┴──────────────┴──────────────────┴──────────┘
                                (siete renglones)
```

⚠️ **`COMPROMISOS` con responsable, fecha compromiso y % avance son `acciones`.**
Tercera tabla que resulta ser un contenedor de acciones, junto al `F-SG-16` y al
`F-SG-24`. **Y `FECHA ORIGEN` separada de `FECHA COMPROMISO` confirma el par que
pide `P-SG-05` §5.6**: la fecha en que nació el compromiso y la fecha en que
vence, para poder ver la demora.

⚠️ **Los asistentes con nombre y firma son el `F-SG-03`**, que ya se imprime
prellenado desde `F03·B6d`. Mismo componente, otro encabezado.

---

## 4 · Lo que aporta al modelo

| Falta | Fase |
|---|---|
| Tabla `reuniones` (`tipo`: revisión dirección · junta de calidad, fecha, lugar, objetivo, desarrollo) con asistentes y **acciones colgando** | F06 (la minuta) / **F04** (los compromisos) |
| `acciones.fecha_origen` — distinta de `creado_en`, porque el compromiso puede venir de una reunión anterior | **F04** |
| Impresión del `F-SG-18` con sus doce bloques prellenados | F06·B2 |
