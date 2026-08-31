# F-SG-07 · Análisis de Causa Raíz 5 ¿Por qué?

> Transcripción del `.docx` que entregó Summit (31 ago 2026). Versión vigente 0,
> emitido y actualizado el 10-Feb-2025.
>
> **Es la Fase 04 y es el que le da forma a `acciones.causa_analisis`.** Lo llena
> el responsable del proceso —gente del cliente, no de la firma— dentro de los
> **15 días hábiles** que da P-SG-03 §5.5, junto con el F-SG-06.
>
> ⚠️ Cierra el **hueco 7** del [índice](README.md) y confirma el **6**. El
> procedimiento que gobierna esta fase, `P-SG-05`, **sigue sin llegar**.

---

## 1 · Estructura del original

```
┌─ encabezado ────────────────────────────────────────────────────┐
│ [logo]  Análisis de Causa Raíz 5 ¿Por qué?   Fecha Elab.: …     │
│         F-SG-07                              Versión vigente: 0  │
└─────────────────────────────────────────────────────────────────┘

  No. de Folio: ______        │  Fecha de Elaboración: ______
  Departamento: │ Área: │ Personal/Material/Equipo/Vehículo:
  ─────────────────────────────────────────────────────────────────
  Información de la No Conformidad:
  ─────────────────────────────────────────────────────────────────
  Acción inicial para contener la No Conformidad:
  ─────────────────────────────────────────────────────────────────
  Determinación de la Causa Raíz de la No Conformidad:
  Participantes: ______
      │ 5 ¿Por qué? y Respuestas │ Evidencia de la respuesta a la cuestión
    1 │                          │
    2 │                          │
    3 │                          │        (cinco renglones)
    4 │                          │
    5 │                          │
  ─────────────────────────────────────────────────────────────────
  Cierre del ciclo
    Se requiere más información     ☐ Sí → No estoy seguro de la causa raíz
                                    ☐ No → Causa raíz hallada
    Se requieren acciones           ☐ Sí → Se requiere seguimiento
    correctivas                     ☐ No → No se requiere seguimiento
  ─────────────────────────────────────────────────────────────────
  Acciones correctivas que se requieren:
  Descripción de la Causa Raíz: ______
      │ Estrategia │ Fecha programada de Entrega │ Responsable
    1 │            │                             │
    2 │            │                             │
    3 │            │                             │      (cinco renglones)
    4 │            │                             │
    5 │            │                             │
  ─────────────────────────────────────────────────────────────────
  ¿Existe un nuevo riesgo para el modelo del SGC?  ☐ Sí  Descripción: ___  ☐ No
  ¿Se requieren de Recursos?                       ☐ Sí  Descripción: ___  ☐ No
  ─────────────────────────────────────────────────────────────────
  Fecha de Cierre: ______
  ─────────────────────────────────────────────────────────────────
  Detecta:          │ Elabora:
    Nombre:         │   Nombre:
    Puesto:         │   Puesto:
  Revisa:           │ Autoriza:
    Nombre:         │   Nombre:
    Puesto:         │   Puesto:
```

---

## 2 · Lo que este formato resuelve, y que el plan tenía en el aire

`docs/02` decía «análisis de causa: 5 porqués e Ishikawa, guardados
estructurados». Eso era una intención sin forma. Cuatro cosas que ahora se saben:

1. **La firma usa 5 porqués.** Ishikawa (6M) no aparece en ningún formato ni en el
   procedimiento. `causa_metodo` conserva sus tres valores —el CHECK ya está
   planeado así— pero **`cinco_porques` es el camino principal** y es el único que
   tiene formato impreso. Ishikawa se queda como opción sin plantilla.
2. **Cada «por qué» lleva su propia evidencia.** Ésta es la que cambia el diseño:
   no son cinco cadenas, son cinco pares. Ver §3.
3. **El análisis puede terminar sin causa raíz.** El bloque «Cierre del ciclo»
   admite explícitamente *«no estoy seguro de la causa raíz»*. Nuestro modelo daba
   por hecho que siempre se llega. Ver §4.
4. **Cuatro firmas, cada una con puesto.** Ver §7.

---

## 3 · `causa_analisis` — la forma del jsonb

El formato da **una sola celda** para «5 ¿Por qué? y Respuestas» y otra para su
evidencia. En la app conviene separar pregunta y respuesta, porque es lo que hace
que la cadena funcione: cada «por qué» interroga la **respuesta anterior**, y con
un solo campo de texto la gente escribe cinco causas sueltas en vez de una cadena.

```jsonc
{
  "metodo": "cinco_porques",
  "participantes": "Juan Pérez (Almacén), María López (SGC)",
  "porques": [
    {
      "n": 1,
      "pregunta": "¿Por qué el extintor estaba descargado?",
      "respuesta": "No se recargó en la fecha programada.",
      "evidencia": "Bitácora de mantenimiento, folio 2026-114"
    }
    // … hasta 5
  ]
}
```

⚠️ **Al imprimir se juntan otra vez:** la celda del papel lleva
`pregunta — respuesta`, para que el documento salga idéntico al que el cliente
conoce. Un formato propio nuestro con dos columnas donde el suyo tiene una es un
formato que el auditor externo va a preguntar.

⚠️ **Cinco no es un límite, es lo que cabe en la hoja.** Igual que los cuatro
renglones de acción correctiva del F-SG-06. `porques` es un array: si un análisis
necesita siete, se guardan siete y al imprimir se continúa. Lo que sí es cierto es
que **menos de cinco es lo normal** —la metodología dice «hasta que dejes de
aprender»—, así que la pantalla no exige los cinco.

⚠️ **`participantes` es texto libre, no una lista de contactos.** Es gente del
cliente reunida una tarde; obligar a darlos de alta como `contactos` para poder
escribir un análisis convierte diez minutos en media hora. Misma decisión que
`auditoria_agenda.auditado`.

---

## 4 · «Cierre del ciclo» — dos decisiones, y la segunda es la compuerta

Son dos preguntas Sí/No, cada una con su consecuencia impresa al lado:

| Pregunta | Sí | No |
|---|---|---|
| ¿Se requiere más información? | *No estoy seguro de la causa raíz* | *Causa raíz hallada* |
| ¿Se requieren acciones correctivas? | *Se requiere seguimiento* | *No se requiere seguimiento* |

**Lo que esto significa para el modelo:**

- ⚠️ **`causa_raiz` puede estar legítimamente vacía.** Un análisis con «se requiere
  más información» es un análisis **en curso**, no uno mal llenado. Si la pantalla
  exige la causa raíz para guardar, la gente inventa una — y ése es exactamente el
  vicio que un análisis de causa existe para evitar. Se guarda incompleto, y lo que
  la app impide es **cerrar** con él así.
- **La segunda pregunta es la compuerta hacia las acciones correctivas.** «No se
  requieren» es una respuesta válida y frecuente: una corrección puntual sin causa
  sistémica no genera acción correctiva. Sin esta casilla, la app obligaría a
  inventar una acción para poder cerrar el hallazgo.
- **Y enlaza con la verificación de eficacia**: «se requiere seguimiento» es
  literalmente lo que después se verifica. Las dos casillas del papel son el mismo
  hecho que `eficacia_verificada_en` comprueba meses más tarde.

Dos booleanos:

```
requiere_mas_informacion  boolean not null default false
requiere_acciones         boolean not null default true
```

⚠️ Los rótulos («causa raíz hallada», «se requiere seguimiento») **se derivan al
pintar y al imprimir, no se guardan.** Guardar la etiqueta junto al booleano es
tener dos fuentes para el mismo hecho, y tarde o temprano discrepan.

---

## 5 · El plan — «Estrategia / Fecha / Responsable»

La tabla de abajo son las `acciones` del plan y no hace falta modelo nuevo:

| Columna del formato | Dónde cae |
|---|---|
| Estrategia | `acciones.descripcion` con `tipo = 'accion_correctiva'` |
| Fecha programada de Entrega | `acciones.fecha_compromiso` |
| Responsable | `acciones.responsable_contacto_id` (gente del cliente) o `responsable_id` |

Y arriba, **«Acción inicial para contener la No Conformidad»** es la otra mitad,
la que el plan ya distinguía bien: `acciones` con `tipo = 'correccion'`.

⚠️ **Es la misma distinción de norma que `docs/06` ya defiende** —corrección
(apagar el fuego) vs acción correctiva (que no vuelva a pasar)— y aquí está en el
papel de la firma, en dos bloques separados por el análisis de causa. Confirma que
la distinción no era purismo nuestro.

⚠️ **Un F-SG-07 produce varias `acciones`, y todas apuntan al mismo hallazgo.** El
análisis de causa **no es** una entidad aparte: vive en el hallazgo o en la acción
que lo motivó, y las estrategias son sus hermanas. Una tabla `analisis_causa`
propia obligaría a decidir a cuál de las cinco acciones pertenece.

---

## 6 · Las dos preguntas de impacto — y una es nueva

```
¿Existe un nuevo riesgo para el modelo del SGC?   Sí/No + Descripción
¿Se requieren de Recursos?                        Sí/No + Descripción
```

**La primera es la misma de F-SG-06** («¿Es necesario actualizar el Análisis de
Riesgo?»). Dos formatos independientes la piden: ya no es una idea del README, es
un requisito. Apunta a `riesgos`, que existe desde la Fase 02.

**La segunda no estaba en ningún lado y es de las buenas.** «¿Se requieren
recursos?» es la pregunta que decide si la acción correctiva se puede ejecutar o
va a morir por falta de presupuesto — y es lo que ISO 9001 §10.2 quiere decir con
«implementar cualquier acción necesaria». Es la que convierte el papel en algo que
la Dirección tiene que firmar.

Cuatro columnas en `acciones`:

```
nuevo_riesgo            boolean not null default false
nuevo_riesgo_desc       text
requiere_recursos       boolean not null default false
requiere_recursos_desc  text
```

⚠️ **Con un CHECK que exige la descripción cuando el booleano es cierto.** Un «Sí»
sin descripción es una casilla que alguien palomeó; el valor de la pregunta está
entero en el texto de al lado. Misma regla que `motivo_anulacion` en `hallazgos` y
que la justificación de `no aplica` en `requisitos`.

⚠️ **Y `nuevo_riesgo` quiere un enlace, no sólo un texto.** Marcarlo y no poder
llegar al riesgo desde ahí deja el mecanismo a medias: es justo el punto donde una
no conformidad **retroalimenta el sistema de gestión** en vez de morir en su propia
acción. Un `riesgo_id` nullable, y la pantalla ofrece «abrir el riesgo» o «crearlo».
Lo mismo aplicaría a `documento_id` para la pregunta hermana de F-SG-06 («¿cambios
en el SGC?»).

---

## 7 · Las cuatro firmas — quién es cada una

El pie tiene cuatro bloques, cada uno con **Nombre y Puesto**:

| Bloque | Quién es | De dónde sale |
|---|---|---|
| **Detecta** | El auditor que levantó la NC | `hallazgos.creado_por` → `usuarios.nombre`. El «puesto» es su papel en la auditoría (`auditoria_equipo.papel` → «Auditor Líder») |
| **Elabora** | El responsable del proceso, del cliente | `contactos` — el que P-SG-03 §5.5 obliga a responder en 15 días |
| **Revisa** | Coordinador del SGC del cliente | `contactos` con `papel = 'coordinador_sgc'` |
| **Autoriza** | Dirección del cliente | `contactos` con `papel = 'representante_direccion'` |

⚠️ **Tres de las cuatro son del CLIENTE.** Sólo «Detecta» es de la firma. Es el
mismo reparto que `procesos.dueno_contacto_id`: quien opera el sistema es el
cliente, la firma audita y acompaña. Un modelo que apuntara las cuatro a `usuarios`
obligaría a dar de alta cuentas para gente que nunca va a entrar a la app.

⚠️ **No hace falta `usuarios.puesto`.** Es la duda razonable al ver «Puesto» cuatro
veces. `contactos.puesto` ya existe y cubre las tres del cliente; la nuestra se
deriva del papel en la auditoría, que es lo que el documento quiere decir de todas
formas —«Auditor Líder», no «Consultor Senior»—.

⚠️ Y **la firma es una línea impresa**, como en F-SG-06 y F-SG-12. La app no captura
rúbricas: imprime el nombre y el puesto, y deja el renglón. La hoja firmada vuelve
como adjunto.

---

## 8 · Los campos de contexto

| Campo | Dónde cae |
|---|---|
| **No. de Folio** | `acciones.folio` — `ACC-2026-105`. ⚠️ El del papel es del análisis; el nuestro es de la acción. Al imprimir se usa el del hallazgo (`AUD-2026-014 / H-03`), que es el que el cliente ya vio en el F-SG-06 |
| **Fecha de Elaboración** | `acciones.creado_en` |
| **Departamento** / **Área** | `hallazgos.proceso_id` → `procesos.nombre` y `hallazgos.sitio_id` → `sitios.nombre` |
| **Personal/Material/Equipo/Vehículo** | ❌ No existe. Es *qué* estuvo involucrado. Texto libre corto en `acciones`, o nada — ver abajo |
| **Información de la No Conformidad** | `hallazgos.descripcion` + `evidencia_objetiva` |
| **Fecha de Cierre** | `acciones.eficacia_verificada_en`, o `hallazgos.cerrado_en` |

⚠️ **«Personal/Material/Equipo/Vehículo» es el único campo de este formato que
recomiendo NO modelar todavía** (regla 11). En el original es una celda con cuatro
palabras separadas por diagonales y ninguna casilla: no se sabe si es un catálogo
cerrado, un texto libre, o una lista de la que se tacha lo que no aplica. Al
imprimir se deja el renglón en blanco, como en el papel, hasta que la firma diga
qué esperaba ahí. Preguntarlo es una línea de correo; adivinarlo es una columna
muerta.

---

## 9 · Al imprimirlo

Uno por no conformidad, junto al F-SG-06 — el procedimiento los cita siempre en
pareja (§5.5 y el diagrama de flujo, nodo C1).

- Encabezado y pie iguales a los del F-SG-12: `config_firma` para la identidad,
  constante del código para `F-SG-07` y su versión.
- ⚠️ **Las casillas ☐ se imprimen marcadas.** Misma regla que F-SG-06: si salen en
  blanco, alguien las llena con pluma delante del cliente y ese dato ya no vuelve
  a la app.
- ⚠️ **`esc()` en cada interpolación.** La descripción de una causa raíz la
  escribió una persona, y ahí no protege React.
- Va a `src/lib/plantillas/`, devuelve una cadena y no consulta.
