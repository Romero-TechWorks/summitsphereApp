# 09 · Tareas del dueño

**Lo que sólo puedes hacer tú.** Escrito para alguien que no programa.

Ningún programa puede crear tus cuentas, aceptar tus términos, guardar tus
contraseñas ni decidir tu criterio técnico. Esto es esa lista.

> **Si algo "no funciona" en la app y depende de una llave, un bucket o un
> permiso — mira aquí antes de reportar un error.** Nueve de cada diez veces es
> una tarea de esta lista que quedó pendiente.

---

## Cómo usar esta lista

Cada tarea tiene una clave (`A01`, `B02`…) que se usa en el plan de fases. Las
letras van en orden: las `A` son de la Fase 00, las `B` de la Fase 01, y así.

**Marca cada una cuando la termines.** La columna *Bloquea* dice qué se detiene si
no está hecha.

---

# FASE 00 · Cimientos

### `A01` — Crear las cuentas · **Bloquea: todo**

Cuatro cuentas, **todas con el correo de la firma**
(`manuel.garcia@summit-sphere.com`), nunca con un correo personal. Si mañana
alguien cambia de puesto, la cuenta se queda con la empresa.

1. **GitHub** — donde vive el código → [`../guias/01_GITHUB.md`](../guias/01_GITHUB.md)
2. **Supabase** — donde viven los datos → [`../guias/02_SUPABASE.md`](../guias/02_SUPABASE.md)
3. **Vercel** — donde corre la app → [`../guias/03_VERCEL.md`](../guias/03_VERCEL.md)
4. **Cloudflare** — el dominio y la seguridad → [`../guias/04_CLOUDFLARE.md`](../guias/04_CLOUDFLARE.md)

⚠️ **Activa el segundo factor (2FA) en las cuatro, el mismo día que las crees.**
Quien entre a cualquiera de ellas tiene los datos de todos tus clientes.

### `A02` — Guardar la contraseña de la base de datos · **Bloquea: los respaldos**

Cuando crees el proyecto de Supabase te va a pedir una contraseña de base de
datos. **Se muestra una sola vez.**

Guárdala en un gestor de contraseñas (1Password, Bitwarden, el llavero de tu
navegador). No en una nota del teléfono, no en un WhatsApp a ti mismo.

Se puede regenerar si se pierde, pero hay que actualizarla en tres lugares y
mientras tanto los respaldos dejan de correr en silencio.

### `A03` — Enrolar tu segundo factor en la app · **Bloquea: tu propio acceso**

Antes, una casilla en Supabase: *Authentication* → *Multi-Factor Authentication* →
habilitar **TOTP**. Sin eso la pantalla del segundo factor no puede enrolar a
nadie y te lo va a decir con esas palabras.

La primera vez que entres como `socio`, la app te lleva sola a una pantalla con un
código QR. Escanéalo con Google Authenticator, Microsoft Authenticator o
1Password.

⚠️ **Guarda la clave que aparece bajo *"No puedo escanear el código"*, en tu
gestor de contraseñas.** Supabase no emite códigos de recuperación: esa clave es
lo único que te devuelve el acceso si pierdes el teléfono. Sin ella y sin el
teléfono no entras, y como eres el socio nadie puede devolverte el acceso desde
adentro — hay que borrar el factor desde el panel de Supabase.

### `A04` — Dar de alta al equipo · **Bloquea: que alguien más use la app**

⚠️ **Hasta la Fase 06 no existe `/admin?tab=usuarios`.** Mientras tanto: la cuenta
se crea en el panel de Supabase (*Authentication* → *Users* → *Add user*), y el
rol se pone desde el *SQL Editor*, porque **toda cuenta nueva nace `cliente`** —el
rol de menos privilegio— a propósito:

```sql
update usuarios set rol = 'consultor' where correo = 'quien@summit-sphere.com';
```

### ⚠️ Tu cuenta de socio: el único paso que no se puede automatizar

**Hazlo antes que nada, y con tu cuenta.** Cuando se aplicó la primera migración
la base no tenía ninguna cuenta, así que no había a quién ascender — y ese
arranque automático ya no vuelve a correr. Nadie es `socio` todavía.

1. *Authentication* → *Users* → *Add user* → tu correo de la firma, con
   *Auto Confirm User* marcado.
2. *SQL Editor*, y córrelo tal cual con tu correo:

```sql
update usuarios set rol = 'socio' where correo = 'manuel.garcia@summit-sphere.com';
select correo, rol, activo from usuarios order by creado_en;
```

⚠️ **No se automatiza a propósito.** Cualquier regla del tipo *"el primero que
entre es el socio"* le regala la cartera completa a quien se registre primero si
alguna vez queda abierta el alta pública. Un `update` de una línea, hecho por ti,
no tiene esa ventana.

3. Entra a la app. Como `socio`, te va a mandar sola a la pantalla del segundo
   factor (`A03`).

Desde la Fase 06, todo esto es `/admin?tab=usuarios`. Para cada persona: nombre,
correo, y **su rol**:

| Rol | Dáselo a | Ve |
|---|---|---|
| `socio` | Tú, y sólo tú | **Todo** |
| `consultor` | Quien implementa | Sólo sus clientes asignados |
| `auditor` | Quien audita | Sus clientes; no edita documentos |
| `administracion` | Facturación y cobranza | Lo comercial, **no** los expedientes técnicos |

⚠️ **El rol se puede cambiar después, pero piénsalo dos veces con `socio`.** Es el
único que ve la cartera completa, las finanzas y los datos fiscales.

---

### `A08` — Encender Turnstile en Supabase · **Bloquea: la protección del login**

⚠️ **Turnstile son dos mitades y hay que encender las dos.** La app ya pinta el
widget en `/login` y le pasa el token a Supabase; lo que falta es que Supabase lo
valide. Con una mitad sola pasa algo peor que no tenerlo:

| Widget en la app | Protección en Supabase | Qué pasa |
|---|---|---|
| sí | sí | ✅ correcto |
| sí | no | El token se ignora. No protege nada |
| no | sí | **Nadie entra**, ni tú |

En Supabase → **Authentication → Attack Protection → Enable Captcha protection**:

1. Provider: **Turnstile by Cloudflare**.
2. Pega el **Secret Key** del widget (Cloudflare → Turnstile → tu widget →
   *Settings*). Es la que empieza por `0x4…`, no la del sitio.
3. Guarda.

La otra llave —la del **sitio**— va como `NEXT_PUBLIC_TURNSTILE_SITE_KEY` en
Vercel y en `.env.local`. Esa sí es pública: viaja al navegador por diseño.

⚠️ Después de guardar, **entra desde una ventana privada antes de cerrar el
panel**. Si algo quedó mal, el login deja de funcionar para todos y la forma de
arreglarlo es volver aquí y apagarlo — que es difícil si no puedes entrar.

⚠️ Y si algún día quitas la variable de Vercel sin apagar esto, la app deja de
mandar token y **nadie entra**. Se apagan juntas, en este orden: primero aquí,
después la variable.

---

### `A09` — Redesplegar Vercel después de tocar las variables · **Bloquea: que la app funcione**

⚠️ **Cargar una variable de entorno en Vercel no la aplica al despliegue que ya
está en línea.** Las `NEXT_PUBLIC_*` se incrustan en el código **durante el
build**, y el guard de sesión (`src/proxy.ts`) corre en el Edge, donde no hay
proceso que las lea en caliente. El despliegue que ya existía sigue viendo lo que
había cuando se compiló.

Síntoma exacto: la app responde **503** con el texto *«SummitApp no está
configurada todavía»* y la lista de las variables que faltan — aunque estén
cargadas y bien escritas en el panel.

Arreglo: Vercel → **Deployments** → el último → menú `⋯` → **Redeploy**. O
cualquier `git push`, que compila de nuevo.

Vale para las tres: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
`NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

---

# FASE 01 · Cartera

### `B01` — Cargar tu cartera real · **Bloquea: usar la app de verdad**

Las organizaciones, sus plantas y sus contactos. Si hoy están en un Excel, se
pueden importar; si están en la cabeza de los consultores, hay que sentarse a
capturarlas.

**Empieza por los cinco clientes más activos.** No por los cincuenta históricos.

### `B02` — Decidir quién ve qué · **Bloquea: el aislamiento entre clientes**

Asignar cada consultor a sus organizaciones, desde `/admin?tab=usuarios`.

⚠️ **Esto no es burocracia: es lo que impide que un consultor vea los hallazgos de
un cliente que no le toca.** Si asignas a todos a todo, desactivas la protección
más importante del sistema.

---

# FASE 02 · Sistemas de gestión

### `C01` — Validar el árbol de cláusulas · **Bloquea: las Fases 02, 03 y 05**

⚠️ **La tarea más importante de toda la lista, y la única que no se puede delegar
a nadie fuera de la firma.**

El sistema trae cargada la estructura de cláusulas de las normas y el resumen de
cada una. **Ese resumen es el criterio técnico de Summit-Sphere**, y va a aparecer
en cada lista de verificación, en cada hallazgo y en cada informe que la firma
entregue.

Tienes que leerlo y corregirlo. No puede salir de un modelo de lenguaje sin que un
auditor líder lo revise, porque el día que un cliente discuta un hallazgo, la
defensa es ese texto.

Empieza por **ISO 9001 y 45001**, que son las que más implementas. Las otras cinco
pueden esperar a que entre el primer cliente que las pida.

⚠️ **No pegues el texto de la norma.** Las normas ISO son obra protegida y las
tienes bajo licencia. Lo que va en el sistema es **tu resumen**, con tus palabras.
El PDF licenciado del cliente se sube a su carpeta privada.

### `C02` — Confirmar los estados de la matriz · **Bloquea: nada, pero cámbialo antes de capturar**

La matriz de requisitos propone cinco estados: *no iniciado*, *documentado*,
*implementado*, *evidenciado*, *no aplica*. Si en la firma les dicen de otra
manera, dilo **antes** de que se capturen mil requisitos — después es una
migración.

### `C03` — Crear la carpeta de documentos · **Bloquea: subir documentos**

En Supabase → Storage → New bucket → nombre `documentos` → **Private**.

⚠️ **Verifica que diga "Private".** Un bucket público deja los documentos de tus
clientes accesibles para cualquiera que tenga el link — y una vez que el link
circuló, cerrarlo después no sirve de nada. Paso a paso en
[`../guias/02_SUPABASE.md`](../guias/02_SUPABASE.md).

---

# FASE 03 · Auditorías

### `D01` — Entregar el formato de informe de auditoría · **Bloquea: emitir informes**

El Word o el PDF que la firma usa hoy. Lo necesitamos tal cual para reproducirlo:
secciones, orden, textos fijos, dónde van las firmas.

### `D02` — Definir los criterios de clasificación · **Bloquea: capacitar al equipo**

Por escrito: **qué hace mayor a una no conformidad**. Ausencia total de un
proceso, falla sistémica, incumplimiento legal, riesgo a la seguridad… El criterio
de la firma, en una página.

Va a vivir dentro de la app como ayuda contextual cuando un auditor clasifique un
hallazgo. Es lo que hace que dos auditores distintos clasifiquen igual.

### `D03` — Crear la carpeta de evidencias · **Bloquea: las fotos de auditoría**

Igual que `C03`, bucket `evidencias`, **privado**.

---

# FASE 04 · Acciones y seguimiento

### `E01` — Generar las llaves de notificación · **Bloquea: los avisos al teléfono**

Un comando que corre el desarrollador y produce dos llaves. Tú las guardas y las
cargas en Vercel. Paso a paso en [`../guias/03_VERCEL.md`](../guias/03_VERCEL.md).

### `E02` — Definir el secreto del cron · **Bloquea: los avisos automáticos**

Una contraseña larga al azar, generada y guardada en el gestor. Es lo que impide
que alguien de fuera dispare las tareas automáticas de la app.

### `E03` — Definir los plazos por defecto · **Bloquea: nada, pero decídelo pronto**

Cuántos días tiene un cliente para responder a cada tipo de hallazgo:

| Tipo | Propuesta | Tu decisión |
|---|---|---|
| NC mayor | 15 días | |
| NC menor | 30 días | |
| Observación | 60 días | |
| Oportunidad de mejora | 90 días | |

### `E04` — Declarar la app en producción · **Bloquea: el resto del proyecto**

⚠️ **La decisión más importante del proyecto después de `C01`.**

Al cerrar la Fase 04 la app ya sirve para trabajar. A partir de aquí, o el equipo
la usa de verdad o el proyecto se convierte en un ejercicio.

**Migrar significa:** dejar de llevar los hallazgos en Excel. Capacitar al equipo
un día completo. Aguantar tres semanas incómodas. Y no mantener los dos sistemas
en paralelo "por si acaso" — eso garantiza que ninguno de los dos esté completo.

---

# FASE 05 · Cumplimiento y capacitación

### `F01` — Entregar el catálogo de NOMs · **Bloquea: la Fase 05 entera**

Igual que `C01`, pero para las NOMs: qué NOMs maneja la firma, sus puntos
verificables, y **la condición de aplicabilidad** (a partir de cuántos
trabajadores, en qué giro, con qué actividad). Es criterio técnico de la firma.

### `F02` — Entregar el catálogo de cursos · **Bloquea: capacitación**

Nombre, duración en horas, temario y modalidad de cada curso que imparte la firma.

### `F03` — Validar el DC-3 y el registro ante la STPS · **Bloquea: emitir constancias**

Dos cosas:
1. El **formato DC-3 vigente** (cambia; hay que usar el actual).
2. El **registro de la firma como agente capacitador externo** ante la STPS, con
   su número. Va impreso en cada constancia.

---

# FASE 06 · Portal y administración

### `G01` — Entregar los formatos de los entregables · **Bloquea: los reportes**

Informe mensual de avance, matriz de requisitos, lista maestra de documentos,
matriz de aplicabilidad NOM, plan de acción, acta de revisión por la dirección.
Los que uses hoy.

### `G02` — Decidir qué ve el cliente en el portal · **Bloquea: el portal**

⚠️ **Es una decisión comercial, no técnica.**

Propuesta: avance por norma, hallazgos abiertos con fecha compromiso,
vencimientos próximos, calendario de visitas, documentos aprobados.

Lo que hay que decidir con cuidado: **¿el cliente ve sus hallazgos abiertos con
todo su detalle?** Transparencia total genera confianza — y también llamadas del
director a las 8 de la noche. Es tu llamada.

### `G03` — Si enciendes facturación · **Bloquea: sólo la facturación**

Contratar un PAC autorizado, tramitar el CSD ante el SAT y cargarlo.

⚠️ **Empieza con las credenciales de prueba.** Con ellas es **imposible** emitir
una factura fiscal por accidente. Sólo cámbialas a producción cuando hayas emitido
diez facturas de prueba correctas.

---

# FASE 07 · Asistente

### `H01` — Contratar las llaves de los modelos · **Bloquea: el asistente**

Google (Gemini) y Anthropic (Claude). Se paga por uso. **Pon un límite de gasto
mensual desde el primer día** — la app también trae su propio tope por
organización, pero el del proveedor es el que de verdad frena.

### `H02` — Crear la carpeta de la biblioteca · **Bloquea: la biblioteca**

Bucket `biblioteca`, **privado**. Igual que `C03`.

### `H03` — Entregar las plantillas Word maestras · **Bloquea: generar documentos**

Los `.docx` de Summit con su portada, su encabezado y su pie.

⚠️ **Detalle que parece menor y no lo es:** los estilos del documento tienen que
llamarse `Heading1`, `Heading2`, `ListParagraph` y `Quote`. Si en tu plantilla se
llaman "Título 1" o algo personalizado, los documentos generados van a salir
**válidos y sin ningún formato**. Díselo al desarrollador y que lo verifique
juntos con un documento de prueba.

### `H04` — Crear el token de GitHub · **Bloquea: la trazabilidad documental**

Un token de acceso al repositorio donde se archivan los procedimientos generados.
Paso a paso en [`../guias/01_GITHUB.md`](../guias/01_GITHUB.md).

### `H05` — Reindexar cuando corrijas una norma · **PERMANENTE**

⚠️ **Esta no se marca y se olvida: se repite para siempre.**

Cada vez que corrijas el texto de una norma o de un documento en la biblioteca,
hay que **reindexar**. Si no, el asistente sigue citando la versión vieja — y lo
hace con toda seguridad, sin avisar de nada.

Es un botón en la pestaña Biblioteca. Ya mordió en el proyecto hermano.

---

# FASE 08 · Automatización

### `I01` — Alta en Azure y consentimiento del cliente · **Bloquea: el Módulo A**

⚠️ **Es una gestión comercial, no técnica, y es la más lenta de toda la lista.**

Para que la app lea las reuniones de Teams de un cliente y le escriba en su
Planner, **el administrador de sistemas de ese cliente tiene que autorizarlo
explícitamente** en su tenant de Microsoft.

Eso significa: explicarle a un área de TI ajena qué permisos pides y por qué,
probablemente firmar algo, y esperar. **Cuenta semanas, no días.** Empiézalo
mucho antes de que el desarrollo lo necesite.

### `I02` — Crear el buzón de evidencia · **Bloquea: el buzón**

Una cuenta de correo `auditoria@summit-sphere.com` en el Microsoft 365 de la
firma. No un alias: un buzón con su propio inicio de sesión.

### `I03` — Definir la fórmula de la Salud del SGC · **Bloquea: la gamificación**

⚠️ **Criterio técnico, tuyo y de Amara.**

El sistema propone: 0 a 1000 puntos, se pierde la mitad a los 30 días de retraso,
sube con la evidencia entregada a tiempo.

Lo que tienen que decidir ustedes es **el peso**: ¿un retraso en el registro de
calibración pesa igual que uno en el simulacro de evacuación? Casi seguro que no.
Esa tabla de pesos es de la firma.

⚠️ Y una advertencia: **un puntaje visible que baja solo incentiva a cerrar
acciones por cerrarlas.** Por eso la app exige verificar la eficacia y es la
verificación la que suma, no el cierre. No lo cambien.

### `I04` — Decidir quién entra a modo desatendido · **Bloquea: nada. Es un freno**

⚠️ **De fábrica, la app NO manda correos automáticos a tus clientes.** Un
consultor revisa y confirma.

El modo desatendido —donde la app responde sola una no conformidad— se enciende
**por cliente**, y sólo con ese cliente de acuerdo por escrito.

Un correo automático diciéndole "no conformidad" al director de una planta sin que
nadie lo haya leído es la clase de error que cuesta una cuenta. Ponlo por escrito
antes de encenderlo.

---

# Permanente

| Tarea | Cada cuánto |
|---|---|
| Verificar que el respaldo de anoche corrió | Semanal — un vistazo a GitHub Actions |
| Revisar la prueba de restauración | Mensual — llega sola; si falla, avisa |
| Revisar los avisos de seguridad de Supabase | Mensual — Advisors → Security |
| Revocar tokens de portal de contactos que ya no están | Cuando cambie alguien en el cliente |
| Revisar el gasto de los modelos | Mensual, si el asistente está encendido |
| Reindexar la biblioteca al corregir una norma (`H05`) | Cada vez |
| Rotar el token de GitHub | Anual |
| Dar de baja a quien deja la firma | **El mismo día** |
