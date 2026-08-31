# Tareas del cliente — poner la información de Summit en la app

> **La app ya está terminada para todo lo que aparece aquí.** Si algo se ve vacío
> no está roto: es que todavía no se ha capturado. Cada pantalla vacía de este
> sistema te dice, con palabras, qué le falta.

---

## Antes de empezar: por qué la app se ve vacía

Hasta ahora la aplicación tenía una **cartera de demostración** —clientes,
proyectos, auditorías y hallazgos inventados— que servía para enseñarte cómo
funciona todo.

Esa información **no se borró**: se movió a un lado aparte, al que sólo llega la
cuenta de pruebas del desarrollador. Tu lado empieza limpio. Las dos mitades no se
ven entre sí y no pueden mezclarse: lo impone la base de datos, no una pantalla.

Consecuencias prácticas, y son tres:

1. **Tu cartera arranca en cero.** Es el Paso 1.
2. **El catálogo de normas arranca en cero.** Es el Paso 4, y son diez minutos:
   el archivo del catálogo es tuyo y lo tienes.
3. **Si el desarrollador hace pruebas, nunca las vas a ver, y él nunca va a ver
   lo que tú captures.** Ninguno de los dos puede tocar el expediente del otro
   aunque quiera.

---

## Cómo usar esta lista

Los pasos van **en orden y se necesitan unos a otros**. No es burocracia: sin
clientes no hay proyectos, sin proyectos no hay alcance, y sin alcance la lista de
verificación de una auditoría sale vacía.

```
Paso 1  Clientes ─┬─→ Paso 2  Sitios y contactos
                  └─→ Paso 3  Proyectos ──┐
                                          │
Paso 4  Catálogo de normas ───────────────┼─→ Paso 5  Alcance del proyecto
                                                            │
                          ┌─────────────────────────────────┤
                          ↓                                 ↓
              Paso 8  Matriz de requisitos      Paso 10  Auditorías
                                                          ↓
                                              Paso 11  Lista de verificación
                                                          ↓
                                              Paso 12  Recorrido y hallazgos
```

**Marca cada paso cuando lo termines.** Al final de cada uno hay un apartado
**«Cómo sabes que quedó»** para que no dependas de la sensación.

### Dos cosas de la interfaz que se repiten en todos los pasos

- **Los dominios son pestañas, no carpetas.** En la barra de la izquierda
  (en el teléfono, la barra de abajo) eliges *Cartera*, *Sistemas* o *Auditorías*;
  dentro de cada uno hay pestañas en la parte de arriba. Nunca hay que buscar en
  un menú escondido.
- **La app funciona sin señal, y lo dice.** Arriba a la derecha aparece un aviso
  **sólo cuando tiene algo que decir**: sin conexión, con trabajo pendiente de
  enviar, o con algo rechazado. Si no aparece nada, está todo enviado.

---

# Paso 1 · Cargar tus clientes

> Antes era la tarea `B01` de la lista del dueño.
> **Bloquea: absolutamente todo lo demás.**

### Qué es

Una **organización** es una empresa cliente de Summit. Es la carpeta de la que
cuelga todo lo demás: sus plantas, sus contactos, sus contratos, sus documentos,
sus auditorías y sus hallazgos.

### Cómo se hace

1. En la barra de la izquierda, pulsa **Cartera**.
2. Estás en la pestaña **Organizaciones**. Arriba a la derecha, pulsa el botón
   verde **Nueva organización**.
3. Llena la ficha:

   | Campo | Qué poner |
   |---|---|
   | **Razón social** | El nombre legal, como sale en la factura. Es el único obligatorio |
   | **Nombre comercial** | Cómo le dicen en la firma: «Aceros del Norte», no «Aceros del Norte S.A. de C.V.» |
   | **RFC** | Si lo tienes a la mano. Se puede llenar después |
   | **Giro** | Manufactura, salud, construcción, alimentos… ⚠️ **Escríbelo siempre igual**: la app agrupa las plantillas de listas de verificación por giro, y «Manufactura», «manufactura» y «Manufacturero» le parecen tres giros distintos |
   | **Tamaño** | Micro · Pequeña · Mediana · Grande |
   | **Estado** | **Prospecto** si todavía no firma · **Activo** si hay contrato · **Pausado** · **Cerrado** |

4. Pulsa **Guardar**.

### Por dónde empezar

**Por tus cinco clientes más activos, no por los cincuenta históricos.** Los
antiguos se pueden capturar después, o no capturarse nunca: lo que importa es que
el equipo tenga en la app lo que está trabajando esta semana.

### Cosas que conviene saber

- ⚠️ **Sólo tú, como socio, puedes dar de alta un cliente.** Es a propósito: quién
  entra a la cartera es una decisión de la firma. Un consultor no puede.
- ⚠️ **Un cliente recién creado sólo lo ves tú.** Hasta que asignes a alguien
  (Paso 6), para el resto de la firma no existe. No está roto.
- Los clientes en estado **Cerrado** se esconden de los listados. No se borran:
  hay una casilla **Ver cerradas** para volver a verlos.
- **Sí se puede borrar un cliente capturado por error**, y sólo tú. La app te pide
  escribir su nombre antes de habilitar el botón, y queda registrado quién lo
  borró. Pero en cuanto ese cliente tenga un documento, una auditoría o un
  hallazgo, **deja de poder borrarse para siempre** — eso ya es evidencia.

### Cómo sabes que quedó

`/cartera` enseña la lista con tus clientes y el buscador de arriba los encuentra
por nombre.

---

# Paso 2 · Los sitios y los contactos de cada cliente

> Parte de la tarea `B01`. **Bloquea: el alcance por centro de trabajo y el
> portal del cliente.**

### Qué es

- **Sitio** = un centro de trabajo. Una planta, una sucursal, un almacén.
  **No es un dato decorativo:** el alcance de un certificado se define por centro
  de trabajo, y una planta puede quedar dentro del certificado y otra fuera.
- **Contacto** = una persona del cliente, con su puesto y su correo.

### Cómo se hace

1. En **Cartera**, pulsa sobre el cliente. Se abre su expediente.
2. Arriba tienes las pestañas: **Resumen · Proyectos · Sitios · Contactos ·
   Equipo**.
3. Pestaña **Sitios** → **Agregar el primero** (o el botón de agregar si ya hay
   alguno). Por cada planta: nombre, dirección, municipio, estado y **número de
   trabajadores**.
4. Pestaña **Contactos** → lo mismo. Por cada persona: nombre, puesto, correo,
   teléfono y su papel.

### Cosas que conviene saber

- ⚠️ **El número de trabajadores importa de verdad.** De él dependen qué NOMs le
  aplican al cliente cuando llegue el módulo de cumplimiento. Ponlo aunque sea
  aproximado.
- **Ni un sitio ni un contacto se borran: se dan de baja.** Quien firmó un acta el
  año pasado tiene que seguir existiendo para que el acta siga teniendo sentido.
- Una planta dada de baja deja de aparecer en los desplegables, pero sus
  auditorías siguen apuntando a ella.

### Cómo sabes que quedó

El **Resumen** del expediente cuenta los sitios y los contactos que tiene el
cliente.

---

# Paso 3 · Abrir los proyectos

> Parte de la tarea `B01`. **Bloquea: el tablero, las tareas y las auditorías.**

### Qué es

Un **proyecto** es el contrato. Un mismo cliente puede tener varios: una
implementación de ISO 9001, un contrato de auditorías y un programa de
capacitación son tres proyectos.

### Cómo se hace

1. Expediente del cliente → pestaña **Proyectos** → **Nuevo proyecto** (o **Abrir
   el primero**).
2. Llena:

   | Campo | Qué poner |
   |---|---|
   | **Nombre** | «Implementación ISO 9001 — Planta Monterrey» |
   | **Tipo** | Implementación · Auditoría · Capacitación · Cumplimiento normativo · Automatización · Soporte IT |
   | **Etapa** | En cuál de las seis está hoy (ver abajo) |
   | **Estado** | Propuesta · Activo · Pausado · Cerrado · Cancelado |
   | **Líder** | El consultor que lo lleva |
   | **Fechas y monto** | Inicio, fin estimado, monto y moneda |

3. Las **seis etapas de la metodología de Summit**, en orden:

   `Diagnóstico → Planificación → Documentación y capacitación →
   Implementación y seguimiento → Auditoría interna → Certificación y soporte`

4. Pulsa **Guardar**.

### Cosas que conviene saber

- ⚠️ **La etapa es lo que mueve el tablero de inicio.** El embudo de la firma —qué
  hay en cada etapa, qué lleva más tiempo parado— sale de este campo. Si todos los
  proyectos se quedan en «Diagnóstico» porque nadie los avanza, el tablero no
  sirve.
- **Avanzar de etapa deja un renglón en la bitácora del proyecto**, con quién y
  cuándo. No hace falta anotarlo aparte.
- Para abrir el detalle de un proyecto, púlsalo: se abre sobre la misma pestaña.

### Cómo sabes que quedó

El tablero de inicio (**Inicio**, en la barra de la izquierda) deja de estar
vacío: aparecen los proyectos repartidos por etapa.

⚠️ **Si un bloque del tablero dice «Sin datos todavía · llega en la Fase 04» o
«Fase 05», está bien así**: son *Acciones de la semana* y *Vencimientos críticos*,
y esas pantallas todavía no existen. Cualquier otro bloque ya trae datos de verdad
en cuanto captures lo suyo — si uno se queda vacío, es que falta capturar, no que
la app esté a medias.

---

# Paso 4 · Subir tu catálogo de normas

> **Bloquea: el alcance, la matriz de requisitos y toda lista de verificación.**

⚠️ **Es el paso más importante de la lista y el único que no puedes delegar
fuera de la firma.** El resumen de cada cláusula **es el criterio técnico de
Summit-Sphere**, y va a salir impreso en cada lista de verificación, en cada
hallazgo y en cada informe que entregues. El día que un cliente discuta un
hallazgo, la defensa es ese texto.

### Qué es

Un archivo de texto, **tuyo**, con la estructura de cláusulas de cada norma que
maneja la firma y **tu resumen** de cada una.

⚠️ **No pegues el texto de la norma.** Las normas ISO son obra protegida y las
tienes bajo licencia. Lo que va en la app es la **estructura** —número y título— y
**tu resumen con tus palabras**. El PDF licenciado se sube aparte, como archivo
del cliente.

### Cómo se hace

1. Barra de la izquierda → **Sistemas** → pestaña **Normas**.
2. Pulsa **Descargar la plantilla**. Te baja un archivo de ejemplo con el formato
   exacto.
3. Ábrelo en cualquier editor de texto (el Bloc de notas sirve) y escribe tus
   normas con esta forma:

   ```md
   # ISO 9001:2015 — Sistemas de gestión de la calidad

   ## 1 Objeto y campo de aplicación [no auditable]

   ## 4 Contexto de la organización
   Tu resumen del capítulo 4, con tus palabras.

   ### 4.1 Comprensión de la organización y de su contexto
   Tu resumen de esta cláusula.

   ### 4.2 Comprensión de las necesidades y expectativas
   Tu resumen de esta cláusula.
   ```

   - `#` = la norma. `##` = capítulo. `###` = cláusula. `####` = sub-cláusula.
   - El texto que va debajo de un título es **el resumen** de ese punto.
   - `[no auditable]` marca lo que **no** genera hallazgos: en una ISO, los
     capítulos 1, 2 y 3 son objeto, referencias y términos. Sin esa marca, la
     lista de verificación de cada auditoría se llena de puntos que nadie va a
     evaluar.

4. Vuelve a la pestaña **Normas** → **Elegir archivo** → escoge tu archivo.
5. **La app te enseña el saldo antes de escribir nada**: cuántas cláusulas entran
   nuevas, cuántas cambian, cuántas se dan de baja y cuántas quedan igual.
   Léelo.
6. Si está bien, pulsa **Importar el catálogo**.

### Cómo trabajar esta tarea sin agobiarse

**Se puede subir el mismo archivo corregido las veces que haga falta.** El
importador **no duplica: actualiza**. Así que:

- **Primera pasada:** las normas que más implementas —ISO 9001 y 45001— con sus
  capítulos de primer nivel y un resumen corto. Con eso ya puedes definir alcances
  y arrancar.
- **Después, con calma:** vas bajando al detalle cláusula por cláusula y volviendo
  a subir el archivo. Las demás normas pueden esperar a que entre el primer
  cliente que las pida.

### Cosas que conviene saber

- ⚠️ **El nombre de una norma es su identidad.** Cambiar `ISO 9001` por
  `ISO-9001` en el archivo crea una norma nueva en vez de renombrar la que había.
  El **título** y la **versión** sí se pueden corregir libremente.
- **Lo que desaparece del archivo no se borra: se da de baja.** Puede haber
  hallazgos citando esa cláusula, y un hallazgo sin cláusula no es un hallazgo.
- ⚠️ **Esta pantalla necesita conexión** y te lo dice: son cientos de renglones de
  golpe. Hazla frente a tu computadora, no en una planta.
- Sólo tú, como socio, ves esta pestaña y puedes importar.

### Cómo sabes que quedó

En la pestaña **Normas** aparece cada norma con su árbol de cláusulas desplegable.
Y en el Paso 5, al abrir el alcance de un proyecto, las normas aparecen como
casillas en vez del aviso «el catálogo todavía está vacío».

---

# Paso 5 · Definir el alcance de cada proyecto

> **Bloquea: la matriz de requisitos y la lista de verificación de toda
> auditoría.**

### Qué es

Qué **normas** cubre ese contrato y en qué **sitios**. No es un texto libre: son
casillas, y de ellas sale automáticamente todo lo demás.

### Cómo se hace

1. **Cartera** → el cliente → pestaña **Proyectos** → pulsa el proyecto.
2. Dentro del proyecto, la sección **Alcance**.
3. **Normas contratadas**: marca las casillas de las normas que cubre el contrato.
4. **Sitios en alcance**: marca las plantas que entran en el certificado.
5. No hay botón de guardar: cada casilla se guarda al marcarla.

### Cosas que conviene saber

- ⚠️ **De aquí sale la lista de verificación de las auditorías** (Paso 11) y **la
  matriz de requisitos** (Paso 8). Si el alcance está vacío, las dos salen vacías
  — y eso se descubre el día de la auditoría, que es tarde.
- Si no aparece ninguna norma para marcar, es que falta el Paso 4.
- Si no aparece ningún sitio, es que falta el Paso 2.

### Cómo sabes que quedó

Abre **Sistemas** → pestaña **Requisitos**, elige ese cliente y ese proyecto: debe
aparecer una fila por cada cláusula auditable de las normas que marcaste.

---

# Paso 6 · Decidir quién ve qué cliente

> Antes era la tarea `B02` de la lista del dueño.
> **Bloquea: que el equipo pueda trabajar — y el aislamiento entre clientes.**

⚠️ **Esto no es burocracia: es lo que impide que un consultor vea los hallazgos de
un cliente que no le toca.** Si asignas a todos a todo, desactivas la protección
más importante del sistema.

### Cómo se hace

1. **Cartera** → el cliente → pestaña **Equipo**.
2. **Asignar a alguien** → elige a la persona y su papel → **Asignar**.

### Los cuatro papeles

| Papel | Qué puede hacer |
|---|---|
| **Líder** | Lleva el cliente. Ve y modifica todo su expediente |
| **Apoyo** | Trabaja en el expediente: captura, edita, levanta hallazgos |
| **Auditor** | Igual, pensado para quien audita ese cliente |
| **Sólo lectura** | **Ve el expediente y no puede modificar nada** |

### Cosas que conviene saber

- ⚠️ **Sólo tú, como socio, repartes el equipo.** Y tú ves toda la cartera sin
  estar asignado a nada.
- **Sólo lectura tiene consecuencias reales**, no es un adorno: esa persona no
  puede tocar un contacto, un documento ni un hallazgo. Lo impide la base de
  datos, no la pantalla.
- Quitar a alguien de un cliente es inmediato y queda registrado.
- ⚠️ **Cuando alguien deja la firma, dalo de baja el mismo día.**

### Cómo sabes que quedó

Esa persona, al entrar con su cuenta, ve ese cliente en su `/cartera`. Antes de
asignarla, su pantalla decía «ninguna organización está asignada a tu cuenta
todavía».

---

# Paso 7 · Guardar tu metodología como plantilla

> Antes era la tarea `B04` de la lista del dueño.
> **Bloquea: nada, pero te ahorra horas en cada proyecto nuevo.**

### Qué es

La metodología de Summit no se vuelve a teclear en cada cliente. **La plantilla se
define con el ejemplo**: dejas bien las tareas de un proyecto y las guardas para
los siguientes del mismo tipo.

### Cómo se hace

1. **Cartera** → un cliente → **Proyectos** → el proyecto.
2. En la sección de tareas, **Agregar tarea** etapa por etapa, como deberían ser.
3. Cuando el proyecto quede bien, pulsa **Guardar como plantilla**.
4. En el siguiente proyecto **del mismo tipo** aparece **Usar la plantilla**, y
   entran todas de golpe. Después se ajustan: ningún cliente es igual a la
   plantilla.

### Cosas que conviene saber

- La plantilla se guarda **por tipo de proyecto**: la de implementación y la de
  auditoría son distintas.
- ⚠️ **Guardar la plantilla sustituye la que hubiera de ese tipo.** No toca las
  tareas de ningún proyecto ya creado.
- Sólo tú, como socio, guardas plantilla.
- Una tarea puede marcarse **Pide evidencia**: entonces no se puede dar por hecha
  sin adjuntar un archivo. Úsalo con criterio — marcarlo en doce tareas a ciegas
  deja media metodología atorada.
- **Quién marcó una tarea como hecha y cuándo lo escribe el sistema**, no se
  captura.

---

# Paso 8 · Llenar la matriz de requisitos

> **Bloquea: saber el avance real de una implementación.**

### Qué es

Una fila por cada cláusula auditable de las normas en alcance, con el estado en
que está hoy. Es el diagnóstico, y de él sale el porcentaje de avance por norma.

### Cómo se hace

1. **Sistemas** → arriba, el desplegable **Cliente** → elige la organización.
2. Pestaña **Requisitos** → elige el proyecto.
3. La matriz ya está: **una fila por cláusula**, sin que haya que generarla.
4. Pulsa una fila y ponle su estado:

   | Estado | Qué significa |
   |---|---|
   | **No iniciado** | Todavía no se ha hecho nada. Es el valor de arranque |
   | **Documentado** | Existe el procedimiento escrito |
   | **Implementado** | Se está haciendo |
   | **Evidenciado** | Se está haciendo y hay registros que lo prueban |
   | **No aplica** | ⚠️ **Exige justificación por escrito.** Un «no aplica» sin motivo es exactamente lo que un auditor externo va a pedir que le expliques |

### Cómo sabes que quedó

Arriba de la matriz aparece una barra de avance por norma: *«38 de 62 cláusulas
evaluadas»*.

---

# Paso 9 · El control documental del cliente

> **Bloquea: la lista maestra de documentos y la evidencia documental de una
> auditoría.**

### Qué es

El manual, los procedimientos, los instructivos y los formatos del sistema de
gestión de cada cliente, con su ciclo de vida completo: borrador → revisión →
aprobado → obsoleto.

### Cómo se hace

1. **Sistemas** → elige el **Cliente** → pestaña **Documentos**.
2. **Nuevo documento**: código (`PR-01`), título, tipo (manual, procedimiento,
   instructivo, formato, registro, política, plan, externo) y a qué proyecto y
   proceso pertenece.
3. Pulsa el documento para abrir su expediente. Dentro hay cuatro pestañas:
   **Texto · Versiones · Cláusulas · Evidencia**.
4. Para cargar el contenido tienes dos caminos:
   - **Subir el Word o el PDF que ya existe.** La app lo convierte a texto legible
     en el teléfono **sin perder el archivo original** — el original es lo que
     firmó el cliente y lo que un auditor pide.
   - **Escribirlo dentro de la app**, en la pestaña **Texto**, y pulsar
     **Guardar el texto**.
5. Pestaña **Cláusulas**: enlaza el documento con las cláusulas de norma que
   cubre. Es lo que después contesta *«¿con qué documento cumplimos el 8.5.1?»*.

### Cosas que conviene saber

- ⚠️ **Una versión aprobada no se puede modificar.** Se crea una versión nueva, y
  al aprobarla la anterior pasa a **obsoleta** automáticamente. Nunca hay dos
  versiones aprobadas a la vez — que es justo el hallazgo que la firma le levanta
  a sus clientes.
- **Quién aprobó y cuándo lo escribe el sistema.** Quién elaboró y quién revisó sí
  se capturan: firmar como revisor a quien sólo movió el estado sería inventar una
  firma.
- **Un documento que estuvo aprobado alguna vez ya no se borra.** Un borrador
  capturado por error, sí.
- ⚠️ **Subir el archivo necesita conexión** y la pantalla lo dice. Escribir el
  texto, mandarlo a revisión y aprobarlo sí funcionan sin señal.

### Cómo sabes que quedó

La pestaña **Documentos** enseña la lista maestra, con el estado y el número de
versiones de cada uno.

---

# Paso 10 · Planear las auditorías

> **Bloquea: el recorrido en planta y los hallazgos.**

### Qué es

El programa anual del cliente (lo exige ISO 9001 §9.2.2 por escrito y aprobado) y
cada auditoría concreta.

### Cómo se hace

**El programa anual:**

1. Barra de la izquierda → **Auditorías** → pestaña **Programa anual**.
2. **Nuevo programa**: cliente, año, nombre, **objetivo**, **alcance** y
   **criterios**. Los tres textos se imprimen juntos arriba del programa, igual
   que en tu `F-SG-09`.
3. **Pulsa el programa** para abrir su parrilla: un renglón por proceso, que es de
   donde sale **cuántas veces se audita cada uno**.
   - **Añadir un proceso**: se elige de la lista del cliente. El sistema
     **propone** su valor —2 si es del servicio, 1 si es de soporte— y las no
     conformidades del año pasado. Los dos se pueden cambiar: la app propone, tú
     decides.
   - **Traer las NC de [año anterior]** rellena esa columna con los hallazgos que
     ya están capturados.
   - **Los puntos y las auditorías se calculan solos**: puntos = valor × no
     conformidades del año anterior; hasta 5 puntos una auditoría al año, por
     encima dos. **Nunca más de dos**, igual que tu hoja.
   - **Toca un mes** para planear la auditoría de ese proceso: una vez queda
     interna (**I**), otra externa (**E**), otra se quita.
   - **Imprimir o guardar PDF** saca el `F-SG-09` completo, con la tabla de
     valores y el umbral, para que la Dirección lo firme.
4. Cuando esté bien, apruébalo. **Quién lo aprobó y cuándo lo escribe el
   sistema.**
   ⚠️ Con el programa aprobado **ya no se pueden quitar procesos**: es el registro
   que exige ISO 9001 §9.2.2, y la justificación del número de auditorías del año
   tiene que poder consultarse después. Si te equivocaste, devuélvelo a borrador —
   eso borra la firma de aprobación.

**Una auditoría:**

1. **Auditorías** → pestaña **Auditorías** → **Planear auditoría** (o **Planear la
   primera**).
2. Cliente, título, tipo (interna, preauditoría, seguimiento, acompañamiento a
   certificación, proveedor), fechas y auditor líder.
3. **El folio no se captura**: lo pone el sistema al guardar (`AUD-2026-014`). Es
   el consecutivo de la firma, no del cliente.
4. Pulsa la auditoría para abrirla. Dentro: **Plan · Alcance · Lista de
   verificación · Equipo · Agenda · Recorrido · Hallazgos · Informe**.
5. Pestaña **Plan** → **Editar el plan**: ahí van el **objetivo**, el **alcance**,
   los **criterios** y la **metodología**, en palabras. Los cuatro se imprimen en
   el informe (Paso 13), así que lo que escribas ahí es lo que va a leer tu
   cliente.
   ⚠️ **El objetivo y el alcance son campos distintos**, igual que en tu `F-SG-11`:
   el objetivo dice *para qué* auditas («evaluar el grado de cumplimiento contra lo
   establecido en el SGC») y el alcance dice *qué* auditas («las tres plantas del
   grupo»). El informe los imprime por separado.
6. Pestaña **Alcance**: qué normas, qué sitios y qué procesos entran.
7. Pestaña **Equipo**: quién audita y con qué papel en *esta* auditoría. Sus
   certificaciones se imprimen en el informe.
8. Pestaña **Agenda**: **Añadir un punto** por cada bloque del día — incluidas la
   **reunión de apertura** y la **de cierre**, que en tu `F-SG-11` son el primer y
   el último renglón. El informe saca de ahí su sección de apertura y la lista de
   auditores por proceso.
   De la misma pestaña salen **dos papeles que se entregan**:
   - **Imprimir la agenda** (arriba) saca tu `F-SG-11`, que es lo que le mandas al
     cliente **antes** de ir, con copia a los jefes inmediatos. Un renglón al que
     no le pusiste auditor sale con las iniciales del equipo completo.
   - **Asistencia**, en cada renglón, saca tu `F-SG-03` **ya lleno**: el evento, el
     objetivo, la fecha, el lugar y los puestos que el sistema ya sabe. Sólo la
     columna de firma va en blanco, con renglones de sobra para quien llegue sin
     estar en la agenda. Imprímela antes de salir, hazla firmar en la sala y súbela
     después como foto — con eso queda demostrado que la reunión de apertura
     ocurrió, que es lo que tu procedimiento exige.

### Cosas que conviene saber

- ⚠️ **La pantalla de Auditorías no pide elegir cliente**, al revés que Sistemas.
  Es a propósito: la semana de un auditor cruza toda la cartera. El filtro de
  arriba, por cliente y por estado, funciona **sin señal**.
- **Una auditoría no se borra**: se cancela. Es evidencia.
- Si planeas una auditoría sin señal, **aparece sin folio hasta que sincronice** y
  la pantalla te lo dice. El folio lo asigna el servidor.

---

# Paso 11 · Armar la lista de verificación

> **Bloquea: que el recorrido en planta sirva de algo.**

### Qué es

Los puntos que el auditor va a evaluar en el piso, uno por cláusula. **Sale del
alcance de la auditoría, no se teclea.**

### Cómo se hace

1. Abre la auditoría → pestaña **Lista de verificación**.
2. Pulsa **Generar del alcance**. La app crea un punto por cada **cláusula
   auditable de último nivel** de las normas en alcance. No mete los capítulos
   generales: eso duplicaría el recorrido.
3. Ajusta a mano: **Añadir punto**, editar la pregunta, reordenar con las flechas,
   quitar lo que sobre.
4. Si ya tienes una lista guardada para esa norma y ese giro, aparece **Usar la
   plantilla** y te redacta las preguntas como las escribe la firma.
5. Cuando la lista quede bien, pulsa **Guardar como plantilla** para reutilizarla
   con los siguientes clientes del mismo giro.

### Cosas que conviene saber

- **Generar es idempotente y no pisa lo evaluado.** Puedes volver a pulsarlo
  después de ampliar el alcance: añade lo que falta y deja en paz lo ya
  contestado.
- ⚠️ **La plantilla sólo cambia cómo se pregunta, nunca qué se audita.** Si la
  plantilla nombra una cláusula que no está en el alcance, la app **la omite y te
  avisa** — meterla sería auditar fuera de alcance. Y un punto que ya tiene
  veredicto no se reescribe: cambiarle la pregunta debajo de un «conforme» ya dado
  dejaría el veredicto contestando algo que nadie preguntó.
- ⚠️ **Generar necesita conexión** y la pantalla lo dice. Es lo que se hace en la
  oficina antes de salir; el día que haga falta sin señal, ya es tarde.
- La plantilla se guarda por **norma** y por **giro del cliente**, con una
  general de respaldo. Por eso importa escribir el giro siempre igual (Paso 1).

### Cómo sabes que quedó

La pestaña enseña los puntos numerados con su cláusula. Si sale vacía, revisa el
alcance de la auditoría (Paso 10) y el catálogo de normas (Paso 4).

---

# Paso 12 · El recorrido en planta y los hallazgos

> Esto ya no es capturar: es usar la app. Va aquí porque es donde se comprueba
> que los once pasos anteriores estaban bien.

### ⚠️ Lo único que hay que hacer sin falta: descargar la auditoría

**Antes de salir de la oficina, con señal:** abre la auditoría → pestaña
**Recorrido** → pulsa **Descargar para trabajar sin señal**.

Espera a que diga **«Lista para trabajar sin señal.»**

**Si no lo haces, en la planta la pantalla del recorrido sale vacía.** No es que
se hayan perdido los datos: es que nunca se bajaron. Y para cuando te des cuenta,
el auditor ya está en un sótano.

### En el piso

1. Pestaña **Recorrido**. Los puntos salen en orden.
2. Por cada punto: el **veredicto** (conforme, no conforme, observación, no
   aplica), una **nota**, y si hace falta una **foto** o una **nota de voz**.
   - Se puede fotografiar un punto **conforme**: «sí tenían el registro, aquí
     está» es evidencia objetiva de que se verificó.
   - Se puede fotografiar **antes** de decidir el veredicto, que es el orden real
     de los dedos.
3. Si el punto da hallazgo, se levanta desde ahí. Al elegir el **tipo** de
   hallazgo, la app te enseña ahí mismo el criterio para clasificarlo — es lo que
   hace que dos auditores clasifiquen igual, y por eso no está en un manual
   aparte.
   ✅ **Ese texto ya es el criterio de Summit** para *NC mayor*, *NC menor* y
   *observación*: salió del procedimiento `P-SG-03` que me entregaste.
   ⚠️ **Faltan dos**: *oportunidad de mejora* y *conformidad* siguen con el texto
   de arranque, porque tu procedimiento no los define —el cliente para el que lo
   escribiste no los usa— y el informe sí necesita los cinco. Está en la tabla de
   abajo.
4. Abajo hay un **contador de pendientes** que no se esconde nunca. Es la prueba
   de que tus tres horas de trabajo siguen ahí.

### Al salir de la planta

Cuando vuelva la señal, la app manda todo sola. El aviso de arriba a la derecha te
dice cuántas cosas quedan por enviar y, si algo se rechazó, **por qué**.

### Cosas que conviene saber

- ⚠️ **Un hallazgo no se borra nunca.** Se cierra, se reclasifica o **se anula con
  motivo**, y queda su historial completo: quién cambió qué y cuándo. Eso es
  exactamente lo que un organismo certificador viene a revisar. Por eso no vas a
  encontrar un botón de borrar: no existe.
- **La hora que queda registrada es la del teléfono del auditor**, no la del
  servidor. Si evaluaste a las 10:15 en modo avión y sincronizaste a las 14:00, en
  el informe sale las 10:15 — que es cuando de verdad viste el extintor
  descargado.
- Si dos auditores levantan el mismo número de hallazgo sin señal, **el sistema
  renumera al llegar**. Un número corrido se edita; un hallazgo perdido no se
  recupera.
- ⚠️ **Las notas de voz sólo funcionan sobre `https://`**, es decir, en la
  dirección real de la app. Desde una dirección de red local el teléfono no deja
  grabar, y la pantalla te lo dice.

---

# Paso 13 · El informe de la auditoría

> La última pestaña del expediente de una auditoría. Es el entregable que ve tu
> cliente, así que es donde se nota si los doce pasos anteriores estaban bien.

Abre la auditoría → pestaña **Informe**. No hay nada que llenar aquí: el documento
se arma solo con lo que ya capturaste.

**Reproduce tu `F-SG-12 Reporte Final de Auditoría Interna`**, con sus mismas
secciones y en el mismo orden. De dónde sale cada una:

| Sección del informe | De dónde la saca |
|---|---|
| Objetivo y alcance, criterios | La pestaña **Plan** y la pestaña **Alcance** |
| Reunión de apertura | El renglón de la **Agenda** que se llame «Reunión de apertura», con su nota |
| Resumen y agenda cumplida | Las casillas de *cumplido* que fuiste marcando en la **Agenda** |
| Fortalezas del sistema | Los hallazgos de tipo **conformidad** |
| Observaciones | Los de tipo **observación** y **oportunidad de mejora** |
| No conformidades | Los de tipo **NC mayor** y **NC menor**, separados |
| Gráficos de resultados | Se calculan solos |
| Conclusión | El campo *Conclusiones* de la pestaña **Plan** |
| Equipo y firma | La pestaña **Equipo**, con las certificaciones de cada quien |

### Lo que se ve en pantalla es lo que sale impreso

La vista previa **no es una aproximación**: es exactamente el mismo documento. El
botón **Imprimir o guardar PDF** lo abre en una ventana aparte.

⚠️ **En el teléfono no hay impresora, y no hace falta.** En la reunión de cierre
enseñas la pantalla, y si el cliente quiere copia, «imprimir» guarda un PDF que se
manda por correo o WhatsApp.

⚠️ **Funciona sin señal**, si descargaste la auditoría en el Paso 12. Es a
propósito: el informe preliminar se enseña en la reunión de cierre, en la planta.

### Antes de imprimir, la app te dice qué falta

Si te falta el objetivo, la conclusión o el equipo, sale un aviso nombrándolo — y
**te deja imprimir igual**. Un preliminar incompleto en la reunión de cierre sigue
siendo mejor que ningún documento; quien decide eres tú.

### Marcar el informe como emitido

Enseñar el preliminar **no marca nada**. Cuando entregues el informe formalmente,
pulsa **Marcar como emitido**: la fecha la pone el servidor, no tu computadora,
porque tu propio procedimiento da **una semana de plazo** desde la auditoría y esa
fecha es la que un organismo certificador contrasta. Si corriges el informe y lo
vuelves a entregar, vuelve a pulsarlo: vale la fecha de la última entrega.

### Cosas que conviene saber

- ⚠️ **Los hallazgos que anulaste NO salen en el informe.** Siguen guardados con su
  motivo y su historial —eso no se borra nunca—, pero no son un resultado de la
  auditoría: imprimir un error tuyo en el documento que ve el cliente lo
  convertiría en una acusación contra su empresa.
- **«Fortalezas del sistema» se imprime aunque esté vacía**, con una línea que lo
  dice. Es a propósito: un informe que sólo enumera lo que está mal es una lista
  de quejas, y verlo en el papel es lo que recuerda registrar también lo que sí
  cumple.
- El **membrete** —tu razón social y tu logotipo— sale de la configuración de la
  firma. Si el informe sale sin él, es que esa configuración está vacía.

---

# Lo que tienes que decidirme o entregarme

Esto no se captura en la app: son documentos o decisiones tuyas que yo tengo que
meter en el sistema.

| Qué | Para qué | Estado |
|---|---|---|
| ~~**El formato de informe de auditoría**~~ | Entregado el 30 ago 2026: el `F-SG-12`, con el procedimiento `P-SG-03` y dos formatos más. Ya está construido — es el Paso 13 | ✅ **Hecho** (`D01`) |
| **Los criterios de *oportunidad de mejora* y *conformidad*** | Los de **NC mayor, NC menor y observación** ya llegaron en tu `P-SG-03` y están en la app. Esos dos no los define tu procedimiento, y el informe necesita los cinco. Si no tienes criterio propio, dilo y se deja el texto general | A medias (`D02`) |
| **Los nombres de los estados de la matriz** | La app propone *no iniciado · documentado · implementado · evidenciado · no aplica*. Si en la firma les dicen de otra manera, **dilo antes de capturar mil requisitos**: después es un cambio de base de datos | Pendiente (`C02`) |
| **Los plazos por defecto** | Cuántos días tiene un cliente para responder. Propuesta: NC mayor 15 · NC menor 30 · Observación 60 · Oportunidad de mejora 90 | Pendiente (`E03`) |
| **Las cuentas del equipo** | Nombre, correo y rol de cada persona de la firma. Las creo yo; el reparto por cliente lo haces tú en el Paso 6 | Pendiente (`A04`) |

**Más adelante, cuando lleguen sus fases** — no hace falta ahora, pero ve
juntándolo: el catálogo de NOMs con su condición de aplicabilidad, el catálogo de
cursos, el formato DC-3 vigente con el registro de la firma ante la STPS, y la
decisión de qué ve el cliente en su portal.

---

# Lo que se repite para siempre

| Tarea | Cada cuánto |
|---|---|
| Dar de baja en la app a quien deja la firma | **El mismo día** |
| Revisar el reparto de clientes cuando alguien cambia de cuenta | Cuando pase |
| Avanzar la etapa de los proyectos cuando avancen de verdad | El tablero vale lo que valga este dato |
| Corregir el catálogo de normas cuando mejore un resumen | Subiendo el archivo otra vez; no duplica, actualiza |
| Revocar el acceso al portal de un contacto que ya no está en el cliente | Cuando pase |

---

## Si algo no funciona

1. **Mira si la pantalla te está diciendo qué falta.** Casi todas las pantallas
   vacías de esta app explican con palabras qué paso de esta lista falta.
2. **Mira el aviso de arriba a la derecha.** Si dice que hay algo rechazado,
   ábrelo: trae el motivo.
3. **Si depende de una llave, un permiso o un panel**, es una tarea del desarrollador.
