# 12 · Guía de pruebas — para el equipo que la va a usar

> **Para quién es esto:** las personas de Summit que van a probar la app antes de
> que se use con clientes de verdad. No hace falta saber nada técnico.
>
> **Cuánto tiempo lleva:** los siete recorridos completos, alrededor de dos horas y media.
> Se pueden hacer en días distintos; el **A** y el **E** necesitan un teléfono.
>
> **Qué se está probando:** las Fases 01 a 04. Lo demás **todavía no existe** y
> está en §2 para que nadie pierda tiempo buscándolo.

---

## 1 · Antes de empezar

### Tu cuenta

Te la crea el dueño. La primera vez que entres, la app te va a pedir que enroles
un **segundo factor** con una aplicación de autenticación (Google Authenticator,
Authy, 1Password…). No es opcional y no se puede saltar.

⚠️ **Guarda el código de recuperación donde no lo pierdas.** Si cambias de
teléfono sin él, hay que darte de alta otra vez.

### Desde dónde

| Dónde | Sirve para |
|---|---|
| **Computadora**, con Chrome o Edge | Todo menos el recorrido A |
| **Teléfono**, con la dirección de Vercel | Los recorridos A y E — **imprescindible** |

⚠️ **Tiene que ser la dirección de Vercel** (`https://…`). Si alguien te pasa una
dirección que empieza por `192.168`, **la mitad de la app no funciona ahí** y no
te va a avisar: no hay avisos al teléfono, no hay trabajo sin señal y no se
pueden grabar notas de voz. No es un fallo — es que el navegador sólo permite
esas cosas en sitios seguros.

### ⚠️ Antes de capturar nada, pregúntale al dueño en qué cartera estás

Hay **dos carteras separadas** que se ven idénticas: la real y la de
demostración. Ninguna ve a la otra.

- Si tu cuenta está marcada como de pruebas, verás un distintivo **DEV** arriba y
  todo lo que captures es de mentira. **Es lo recomendable para esta ronda.**
- Si no lo ves, **estás en la cartera real** y lo que escribas se queda.

Si tienes duda, no captures: pregunta.

---

## 2 · Lo que TODAVÍA no está — no lo reportes

Esto no falta por error: aún no se ha construido. Reportarlo gasta tu tiempo y el
de quien lee los reportes.

| Pantalla | Qué pasa |
|---|---|
| **Cumplimiento** | Matriz, Recorrido, Semáforo, Vencimientos y Catálogo de NOMs **sí están** (recorrido G). Falta el **informe de levantamiento** impreso |
| **Capacitación** | Vacía. Fase 05 |
| **Admin**, salvo *Avisos* | Metas, finanzas, facturación, usuarios y bitácora son Fase 06 |
| **Portal del cliente** | No existe todavía. Fase 06 |
| **Asistente** (🤖) | Fase 07, y está apagado de fábrica |

Y dentro de lo que sí está:

- **Planes de mejora** y **Cambios al SGC** se capturan y se ven, pero **todavía
  no se imprimen**.
- El **F-SG-10** (el expediente impreso de una queja) no está.
- En *Admin → Avisos* verás una lista de **categorías que llegan en fases
  siguientes**, apagadas. Es a propósito: están enseñadas para que se sepa que la
  matriz de comunicación del cliente está contemplada, pero todavía no hay quién
  las dispare.

---

## 3 · Los siete recorridos

Hazlos **en orden**: cada uno deja algo que el siguiente usa.

---

### A · Trabajar sin señal  📱 *teléfono*

**Es el recorrido más importante de todos**, porque es la promesa que la app le
hace a un auditor metido en el sótano de una planta.

1. En el teléfono, abre la dirección de Vercel y entra con tu cuenta.
2. El navegador te va a ofrecer **instalar la app**. Acepta: se pone como un icono
   más, sin barra de direcciones.
3. Abre una auditoría y pulsa **«Descargar para trabajar sin señal»**. Espera a
   que diga que está lista.
4. **Pon el teléfono en modo avión.**
5. Sin señal, levanta un hallazgo: descripción, evidencia, la cláusula, una foto.
6. Marca dos o tres puntos de la lista de verificación.
7. Cierra la app **por completo** y vuelve a abrirla, todavía en modo avión.

**Qué tiene que pasar:** todo tu trabajo sigue ahí. Arriba aparece un aviso de que
hay cosas sin enviar, con cuántas son.

8. Quita el modo avión y espera unos segundos.

**Qué tiene que pasar:** el aviso desaparece solo. Tu hallazgo tiene folio.

> 🔴 **Si algo de esto falla, para y repórtalo antes de seguir.** Es lo único de
> la lista que no tiene remedio: un hallazgo que se pierde en planta no se
> recupera.

⚠️ **Prueba también no descargar.** Abre otra auditoría **sin** pulsar el botón,
ponte en modo avión y entra al recorrido. Va a salir vacía — y es correcto: los
datos nunca se bajaron. Lo que queremos saber es si **se entiende** que está vacía
por eso.

---

### B · Una auditoría de principio a fin  💻

1. **Cartera** → da de alta una organización con un par de sitios y contactos.
2. **Sistemas** → elige ese cliente y captura tres o cuatro procesos.
   ⚠️ **Ponles el código de dos letras** (`FA` facturación, `OP` operación, `SG`
   sistema de gestión…). Sin él, los folios de acción salen sin la clave que el
   cliente reconoce.
3. **Auditorías** → crea una auditoría, ponle alcance y objetivo, arma su equipo y
   su agenda.
4. Genera la **lista de verificación** desde las normas del alcance.
5. Imprime el **F-SG-11** (agenda) y el **F-SG-03** (lista de asistencia).

**Qué tiene que pasar:** los dos salen **ya llenos** con lo que la app sabe. En la
lista de asistencia sólo la columna FIRMA va en blanco.

6. Haz el recorrido, levanta dos o tres hallazgos —uno **NC mayor**— y emite el
   **informe** desde su pestaña.

**Qué mirar en el informe:** que lleve el membrete de Summit, que las secciones
estén completas y que **los hallazgos anulados no salgan**.

---

### C · El ciclo de una no conformidad  💻

*Éste es el criterio con el que se cierra la Fase 04. Hazlo completo.*

1. Abre la **NC mayor** que levantaste en B.
2. Haz el **análisis de causa** (los 5 ¿Por qué?). Escribe sólo dos o tres y
   **guarda a medias**, sin causa raíz.

   **Qué tiene que pasar:** deja guardarlo. Un análisis en curso es válido.

3. Vuelve, complétalo y escribe la causa raíz.
4. Contesta las **tres preguntas de impacto**. En una di **Sí** y **deja la
   descripción vacía**.

   🔴 **Qué tiene que pasar:** no te deja. Un «sí» sin explicación es una casilla
   que alguien palomeó.

5. Levanta una **corrección inmediata** y una **acción correctiva**, con fecha.
6. Registra un avance del 40 % en la acción correctiva.
7. **Intenta mover la fecha compromiso sin escribir por qué.**

   🔴 **Qué tiene que pasar:** no te deja. Reprogramar exige justificar la demora.

8. Muévela con justificación. Después **intenta moverla otra vez con el mismo
   texto**.

   🔴 **Qué tiene que pasar:** tampoco. La justificación tiene que ser nueva.

9. Busca la forma de **cerrar la acción**.

   🔴 **Qué tiene que pasar:** **no hay ningún botón de cerrar.** Sólo «verificar
   eficacia». No es un olvido: cerrar una acción sin comprobar que sirvió es el
   error más común en los sistemas de gestión reales, y la app no lo ofrece.

10. Verifica la eficacia con resultado **«parcial»**.

    **Qué tiene que pasar:** la acción **sigue abierta**.

11. Verifícala como **«eficaz»**, con evidencia.

    **Qué tiene que pasar:** ahora sí cierra, y queda firmado quién la verificó y
    cuándo — sin que tú lo escribieras.

12. Imprime el **F-SG-06 + F-SG-07** desde la ficha del hallazgo.

    **Qué mirar:** salen **los dos**, uno detrás del otro. Y las casillas ☐ salen
    **marcadas**, no vacías.

---

### D · Una queja que se convierte en no conformidad  💻

1. **Acciones → Quejas y sugerencias** → registra una **queja** de un cliente.
2. Márcala como **que no procede**, sin escribir nada.

   🔴 **Qué tiene que pasar:** no te deja. Lo que se le contesta al cliente tiene
   que quedar escrito.

3. Registra otra queja y márcala **procedente**.
4. Pulsa **«Levantar la no conformidad»**, elige la cláusula y guárdala.

   **Qué tiene que pasar:** nace una NC **sin auditoría detrás**, con un folio de
   su propia serie (`NC-2026-…`). Aparece en el tablero de hallazgos como
   cualquier otra.

5. Registra una **sugerencia** y márcala procedente.

   **Qué tiene que pasar:** **no** te ofrece levantar una NC. Te ofrece enlazarla
   con un cambio al SGC o un plan de mejora. Son dos caminos distintos a propósito.

---

### E · Los avisos al teléfono  📱

1. En el **teléfono**, entra a **Admin → Avisos** y pulsa **«Activar en este
   aparato»**. Acepta el permiso del navegador.
2. Entra desde la **computadora** al mismo sitio y actívalo también.

   **Qué tiene que pasar:** los dos aparecen en la lista. Los avisos van **al
   aparato, no a la cuenta**: activar uno no activa el otro.

3. Crea una acción tuya que venza **dentro de 3 días**.
4. Avísale al dueño para que dispare el aviso a mano.

   **Qué tiene que pasar:** llega una notificación al teléfono con el folio de la
   acción. Al tocarla, abre la app en Acciones — **sin abrir una pestaña nueva** si
   ya la tenías abierta.

5. Pídele que lo dispare **otra vez**.

   🔴 **Qué tiene que pasar:** **no llega un segundo aviso.** El mismo hecho se
   avisa una vez.

6. Apaga la categoría **«Acción por vencer»** y pide que lo dispare de nuevo.

   **Qué tiene que pasar:** ya no llega.

---

### F · Lo que la app tiene que impedir  💻

Son las pruebas que todo el mundo se salta y las que más importan. Ninguna
debería funcionar.

| Intenta… | Qué tiene que pasar |
|---|---|
| **Borrar un hallazgo** | No hay botón. Se **anula con motivo** o se reclasifica |
| **Anularlo sin motivo** | Lo rechaza |
| **Levantar un hallazgo sin cláusula** o con la evidencia en blanco | Lo rechaza |
| **Cancelar una acción sin decir por qué** | Lo rechaza |
| **Borrar una organización que ya tiene auditorías** | No deja |
| **Ver el cliente de otro consultor** | No aparece. Pídele al dueño una segunda cuenta con otro cliente asignado y compruébalo |
| **Decir que una obligación aplica, o que no, sin justificación** | Lo rechaza, en los dos sentidos |
| **Marcar «Parcial» sin observación** | Te pide qué falta antes de guardarlo |
| **Quitar una obligación ya evaluada**, o un área que ya tiene obligaciones | No se ofrece el botón; el área sólo se da de baja |
| **Generar desde una NOM en modo avión** | El botón no se activa y la pantalla dice por qué |
| **Quitar un vencimiento que ya tiene su PDF adjunto** | No se ofrece el botón |

⚠️ **Ésa última es la más importante de todas.** Un cliente no puede ver los
expedientes de otro, y es lo único que si falla no se arregla con una disculpa.

---

### G · Cumplimiento en planta  📱 *teléfono* · ⚠️ necesita la migración `F00`

1. Con un **socio**, en **Cumplimiento → Catálogo de NOMs**, da de alta la
   `NOM-002-STPS-2010` con tres elementos: *Extintores*, *Estudio de riesgo de
   incendio* y *Carpeta normativa*.
2. En **Matriz**, elige un cliente y un sitio, dale **tres áreas** y pulsa
   **Generar** con esa NOM. Salen tres renglones «Sin decidir».
3. Decide los tres: **Aplica**, con su justificación.
4. En **Recorrido**, pulsa **«Descargar para trabajar sin señal»** hasta que diga
   que está listo. **Pon el modo avión.**
5. Toca un área. En *Extintores*, pulsa **«Evaluar en (área)»**, marca **No
   cumple**, escribe la observación y **toma una foto**. Marca otro como
   **Parcial** — primero sin observación.
6. Cierra la app por completo, ábrela en modo avión, y vuelve.

**Qué tiene que pasar:** todo sigue ahí; el contador dice cuántos cambios esperan.
Al quitar el modo avión, el contador llega a «todo guardado» solo, y en
**Semáforo** sale el porcentaje de la NOM.

> 🔴 **La hora de la evaluación tiene que ser la de cuando pulsaste**, no la de
> cuando volvió la señal. Ábrela y compruébalo.

7. Ya con señal, en **Vencimientos**: registra un *Estudio de ruido* **emitido
   hace 21 meses con vigencia de 24** y ponte de responsable. Tiene que salir
   **«Por vencer»** y aparecer en el widget **Vencimientos críticos** del Inicio.
8. Ábrelo → **Registrar renovación** con la emisión de hoy. El viejo pasa a
   **«Renovado»** y desaparece de los críticos.

> Los avisos al teléfono de 90/60/30/7 días los manda el cron de la mañana:
> para verlos llegar hace falta un vencimiento que caiga justo a 90 días de hoy y
> esperar al día siguiente. Activa antes la categoría en *Admin → Avisos*.

---

## 4 · Cómo reportar

Un reporte sirve si quien lo lee puede reproducirlo. Con estas cinco líneas basta:

```
Qué hacía:      (la pantalla y el paso)
Qué esperaba:
Qué pasó:
Dónde:          teléfono / computadora · navegador
Cuándo:         fecha y hora aproximada
```

⚠️ **Si sale un mensaje de error, cópialo entero.** El texto exacto es lo que
permite encontrarlo; «no se pudo guardar» a secas no dice si perdiste el dato, si
fue un permiso o si basta con reintentar.

⚠️ **Y si algo se ve raro pero funciona, repórtalo igual.** Una etiqueta confusa
en una pantalla que se usa cuarenta veces al día cuesta más que un fallo que pasa
una vez al mes.

---

## 5 · Las tres preguntas que sí queremos que contestes

Más allá de los fallos, esto es lo que no se puede saber sin usarla:

1. **¿En qué momento tuviste que preguntarle algo a alguien?** Cada vez que hiciste
   una pausa para averiguar qué iba en un campo, eso es una pantalla que hay que
   arreglar.
2. **¿Qué hiciste dos veces?** Si capturaste el mismo dato en dos sitios, sobra uno.
3. **¿Qué seguirías haciendo en Excel después de esto, y por qué?** Es la pregunta
   más útil de las tres, y la respuesta honesta vale más que veinte reportes.
