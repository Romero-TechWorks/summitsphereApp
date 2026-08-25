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

### `A08` — Encender Turnstile en Supabase · ✅ **HECHA** (21 ago 2026)

El captcha está funcionando: el widget de `/login` y la protección de Supabase
están encendidos a la vez. **Lo que sigue queda como referencia** para el día que
haya que rotar la llave, apagarlo o revisar por qué dejó de entrar alguien.

⚠️ **Turnstile son dos mitades y las dos tienen que estar encendidas.** La app
pinta el widget en `/login` y le pasa el token a Supabase; Supabase es quien lo
valida. Con una mitad sola pasa algo peor que no tenerlo:

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

### `B00b` — Aplicar la migración de tareas y depuración · **Bloquea: B5 y B6**

La segunda migración de la fase (`20260821220000_tareas_y_depuracion.sql`): crea
`tareas_etapa` y abre el borrado de organizaciones y proyectos para el socio.
Mismos pasos que `B00`, desde la terminal de WSL:

```bash
npx supabase db push
npx supabase gen types typescript --linked > /tmp/database.ts && mv /tmp/database.ts src/types/database.ts
git diff --stat src/types/database.ts
```

Sin ella, la pestaña de tareas de un proyecto falla contra la base y el botón de
eliminar devuelve *«la operación no tocó ninguna fila»* — que es el RLS
rechazando en silencio, exactamente como está descrito en las trampas heredadas.

---

### `B00` — Aplicar la migración de la cartera · ✅ **HECHA** (21 ago 2026)

Aplicada y verificada: `npx supabase migration list --linked` da las cinco
migraciones con `local = remote`, y los tipos regenerados salieron **idénticos**
a los del repositorio. **Lo que sigue queda como referencia** para la próxima
migración, que la hay en cada fase.

El código de una fase espera tablas que todavía no existen en tu base. La
migración se escribe y se prueba en el repositorio; aplicarla es tuyo, como todo
lo que sale hacia fuera.

```bash
# 1. Sube el esquema nuevo a Supabase
npx supabase db push

# 2. Vuelve a generar los tipos de TypeScript desde la base ya actualizada.
#    En DOS pasos, a propósito — ver el aviso de abajo.
npx supabase gen types typescript --linked > /tmp/database.ts && \
  mv /tmp/database.ts src/types/database.ts

# 3. Comprueba si la base dice algo distinto de lo que dice el repositorio
git diff --stat src/types/database.ts
```

⚠️ **Esto se corre desde la terminal de WSL** (Debian), que es donde vive el
entorno de este proyecto: ahí `npx supabase` ya está instalado y el proyecto ya
está enlazado, con su token guardado. Si el comando responde *"no se reconoce
mv"*, no estás en WSL sino en CMD — abre la terminal correcta antes que buscar
otro comando.

⚠️ **Y NO mezcles npm entre Windows y WSL sobre esta carpeta.** `node_modules`
tiene binarios nativos compilados para Linux —el CLI de Supabase, `sharp`,
`esbuild`, el compilador de Next—; un `npm install` desde PowerShell los
sustituye por los de Windows y el siguiente `npm run build` en WSL falla con
errores que no se parecen a su causa. Salir de ahí obliga a borrar `node_modules`
y reinstalar desde un solo lado.

Si aun así hace falta correrlo desde Windows, el paso 2 cambia — `mv` no existe
en CMD:

```bat
:: CMD
npx supabase gen types typescript --linked > tipos.tmp && move /Y tipos.tmp src\types\database.ts
```

```powershell
# PowerShell
npx supabase gen types typescript --linked | Set-Content -Encoding utf8 tipos.tmp
Move-Item -Force tipos.tmp src\types\database.ts
```

⚠️ **En PowerShell, `>` no.** La versión que trae Windows (5.1) escribe el
archivo en UTF-16: el `database.ts` queda ilegible para las herramientas y el
`git diff` sale entero en rojo aunque no haya cambiado nada. `Set-Content
-Encoding utf8` lo evita.

⚠️ **`gen types` escribe a la pantalla, no a un archivo.** Si lo corres sin el
`>` te imprime miles de líneas de TypeScript en la terminal y no cambia nada. Eso
es normal, no es un error.

⚠️ **Y por eso va en dos pasos:** `comando > archivo` **vacía el archivo antes de
ejecutar el comando**. Si `gen types` falla a media faena —sesión caducada,
proyecto sin enlazar, un corte de red— te quedas con un `database.ts` vacío, y a
partir de ahí no compila nada con un error que no se parece a su causa. Con el
archivo temporal, si falla, el bueno sigue en su sitio.

⚠️ **El paso 2 no es opcional ni cosmético.** `src/types/database.ts` se escribió
a mano para poder programar contra tablas que aún no estaban aplicadas; el
generador es la única fuente de verdad. Si al regenerarlo aparece un `git diff`,
gana lo generado — y avísalo, porque significa que la base y el repositorio no
dicen lo mismo.

Si te pide iniciar sesión o dice *"Cannot find project ref"*, falta enlazar el
proyecto: `npx supabase login` y después
`npx supabase link --project-ref <el ref de tu proyecto>`.

⚠️ **Esto no cambia lo que hay en línea.** La app desplegada en Vercel sigue
siendo el código del último `push`: la base ya tiene las tablas, pero las
pantallas nuevas no llegan hasta que subas el código. `A09` —el redespliegue— es
sólo para las variables de entorno, no para el esquema.

Qué crea: `sitios`, `contactos`, `proyectos`, `proyecto_normas`,
`proyecto_sitios`, `bitacora_proyecto`, `normas` y `norma_clausulas` — estas dos
últimas **vacías**, que se llenan subiendo tu `.md` (ver `C01`).

### `B01` — Cargar tu cartera real · **Bloquea: usar la app de verdad**

Las organizaciones, sus plantas y sus contactos. Si hoy están en un Excel, se
pueden importar; si están en la cabeza de los consultores, hay que sentarse a
capturarlas.

**Empieza por los cinco clientes más activos.** No por los cincuenta históricos.

### `B04` — Definir la plantilla de tareas · **Bloquea: nada, pero ahorra horas**

La metodología de Summit no se re-teclea en cada cliente. **La plantilla se
define con el ejemplo**:

1. Abre un proyecto y arma sus tareas etapa por etapa, como deberían ser.
2. Pulsa **Guardar como plantilla** (sólo tú, como socio). Queda guardada para
   ese **tipo de proyecto** — implementación, auditoría, capacitación…
3. En el siguiente proyecto del mismo tipo aparece **Usar la plantilla**, y
   entran todas de golpe. Después se ajustan: ningún cliente es igual a la
   plantilla.

⚠️ Guardar la plantilla **sustituye** la que hubiera de ese tipo. No borra ni
toca las tareas de ningún proyecto ya creado.

---

### `B03` — Subir el catálogo de normas · **Bloquea: el alcance de los proyectos**

Sin catálogo no se puede decir qué norma cubre un contrato, y sin eso no hay
matriz de requisitos [Fase 02] ni listas de verificación [Fase 03].

Se escribe en un archivo `.md` **tuyo, que no va al repositorio**, y se sube en
`/sistemas` → *Elegir archivo*. Ahí mismo puedes descargar la plantilla.

```md
# ISO 9001:2015 — Sistemas de gestión de la calidad

## 1 Objeto y campo de aplicación [no auditable]

## 4 Contexto de la organización
El resumen de Summit sobre el capítulo.

### 4.1 Comprensión de la organización y de su contexto
El resumen de esta cláusula.
```

- **Para empezar basta con las siete normas y sus capítulos de primer nivel.** El
  árbol completo es la tarea `C01`, y se hace subiendo el mismo archivo corregido
  las veces que haga falta: el importador **no duplica**, actualiza.
- Antes de escribir nada te enseña el saldo —cuántas cláusulas entran, cuántas
  cambian, cuántas se dan de baja— y decides tú.
- ⚠️ **El resumen lo redactas tú, no se copia el texto de la norma.** Es obra
  protegida; lo que vive en la base es la estructura y el criterio de Summit.
- ⚠️ Cambiar el **nombre** de una norma en el archivo (`ISO 9001`) crea una norma
  nueva en vez de renombrar la que había: el nombre es su identidad. El título y
  la versión sí se pueden corregir libremente.

---

### `B02` — Decidir quién ve qué · **Bloquea: el aislamiento entre clientes**

Asignar cada consultor a sus organizaciones. Se hace **dentro del expediente del
cliente**: `/cartera` → la organización → pestaña **Equipo** → *Asignar*.
(`/admin?tab=usuarios` llega en la Fase 06 y enseñará lo mismo al revés, por
persona.)

Con qué papel:

| Papel | Qué puede |
|---|---|
| **Líder** | Lleva el cliente. Ve y modifica todo su expediente |
| **Apoyo** | Trabaja en el expediente: captura, edita, levanta hallazgos |
| **Auditor** | Igual, pensado para quien audita ese cliente |
| **Sólo lectura** | **Ve el expediente y no puede modificar nada** |

⚠️ **Esto no es burocracia: es lo que impide que un consultor vea los hallazgos de
un cliente que no le toca.** Si asignas a todos a todo, desactivas la protección
más importante del sistema.

⚠️ **Tú, como socio, ves toda la cartera sin estar asignado a nada.** Por eso una
organización recién creada aparece vacía de equipo y sólo tú la ves: hasta que
asignes a alguien, para el resto de la firma no existe.

---

# FASE 02 · Sistemas de gestión

### `C00` — Aplicar las dos migraciones de la fase · **Bloquea: TODA la Fase 02**

⚠️ **Van en este orden, y `B00b` tiene que estar aplicada antes.** La segunda
amplía funciones que nacen en la migración de tareas.

```bash
# 1. El esquema del dominio: documentos, versiones, adjuntos, requisitos,
#    procesos, riesgos, indicadores y mediciones. Y amplía puedo_borrar_org()
#    para que una organización con documentos ya no se pueda borrar.
npx supabase db push

# 2. Los tipos, en DOS pasos —el redireccionamiento directo trunca el archivo
#    si el comando falla a media escritura.
npx supabase gen types typescript --linked > /tmp/database.ts && mv /tmp/database.ts src/types/database.ts

# 3. Comparar con lo que dice el repositorio. Si sale distinto, MANDA LO GENERADO.
git diff --stat src/types/database.ts
```

**Son dos archivos y van separados a propósito:**

| Migración | Qué hace |
|---|---|
| `20260822120000_sistemas_de_gestion.sql` | El esquema completo de la fase |
| `20260822120100_storage_documentos_y_evidencias.sql` | Los buckets `documentos` y `evidencias` y sus políticas |

⚠️ **Por qué separadas:** la segunda escribe políticas sobre `storage.objects`,
que es un esquema de Supabase y no nuestro. Según cómo esté configurado el
proyecto puede fallar por permisos, y dentro de la migración grande se llevaría
por delante el esquema entero de la fase. Si la segunda falla, el dominio ya está
aplicado y los buckets se crean a mano (`C03` y `C04`) — sólo faltarían las
políticas, y ahí sí avísame.

⚠️ `src/types/database.ts` ya trae los tipos de esta fase **escritos a mano** con
la forma del generador, para que el código compile antes de que apliques nada. Al
aplicarla se regeneran de verdad; **manda lo generado**, no lo que hay.

**Las dos migraciones se probaron enteras antes de dártelas** (22 ago 2026), en un
Postgres 17 desechable con las seis anteriores aplicadas en orden. Pasaron 17
comprobaciones de comportamiento: la herencia de `org_id`, el sello de la firma de
aprobación, que aprobar una versión jubile a la anterior, que una versión aprobada
no se deje editar, que un `no aplica` sin justificación se rechace, que una tarea
con evidencia obligatoria no se pueda dar por hecha sin adjunto, y que una
organización con documentos ya no se pueda borrar. Y los tipos generados desde ese
esquema salieron **idénticos** a los del repositorio. Eso no sustituye a aplicarla
—tu base tiene datos y la mía estaba vacía—, pero sí quiere decir que no vas a
encontrarte un error de sintaxis a media aplicación.

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

### `C03` — Verificar la carpeta de documentos · **Bloquea: subir documentos**

**La crea la migración de `C00`**, ya privada. Lo tuyo es comprobarlo: Supabase →
Storage → `documentos` → tiene que decir **Private**.

⚠️ **Verifica que diga "Private".** Un bucket público deja los documentos de tus
clientes accesibles para cualquiera que tenga el link — y una vez que el link
circuló, cerrarlo después no sirve de nada. La migración lo vuelve a poner en
privado por si alguien lo creó a mano con la casilla equivocada, pero míralo. Paso
a paso en [`../guias/02_SUPABASE.md`](../guias/02_SUPABASE.md).

### `C04` — Verificar la carpeta de evidencias · **Bloquea: adjuntar evidencia**

Lo mismo con el bucket `evidencias`, que también crea la migración de `C00`.

⚠️ **Esta tarea era `D03` de la Fase 03.** Subió de fase porque los adjuntos se
adelantaron a F02·B2b: desde que hay tareas y documentos hace falta poder colgar
una foto o un acta firmada, y la Fase 03 se la encuentra hecha en vez de
inventarla para las fotos de campo.

⚠️ **Lo que está subido no se ve sin señal, y no es un fallo.** El bucket es
privado: cada archivo se abre con una liga firmada al momento, que es una llamada
al servidor. Tomar la foto y adjuntarla en la planta, sí; abrir la de la semana
pasada estando sin señal, no. La app lo dice en pantalla.

---

# FASE 03 · Auditorías

### `D00` — Aplicar la migración de la fase · **Bloquea: TODA la Fase 03**

⚠️ **Va después de `C00`.** Amplía `puedo_borrar_org()`, `puedo_borrar_proyecto()`
y `heredar_org_del_adjunto()`, y añade la columna `hallazgo_id` a `adjuntos` —
las cuatro nacen en la migración de la Fase 02.

```bash
# 1. El esquema completo de la fase: programa, auditorías, alcance, equipo,
#    agenda, lista de verificación, hallazgos y su historial. Más la RPC
#    generar_lista_verificacion() y los dos candados de la regla 13.
npx supabase db push

# 2. Los tipos, en DOS pasos —el redireccionamiento directo trunca el archivo
#    si el comando falla a media escritura.
npx supabase gen types typescript --linked > /tmp/database.ts && mv /tmp/database.ts src/types/database.ts

# 3. Comparar con lo que dice el repositorio. Si sale distinto, MANDA LO GENERADO.
git diff --stat src/types/database.ts
```

**Es un solo archivo**: `20260824120000_auditorias_y_hallazgos.sql`. No hay una
segunda de Storage — el bucket `evidencias` ya se creó con los adjuntos en `C00`,
y las fotos de campo van ahí.

⚠️ **Esta migración QUITA permisos, y es a propósito.** Al final revoca el DELETE
de `hallazgos` y `auditorias`, y el INSERT/UPDATE/DELETE de `hallazgos_historial`,
a `anon`, `authenticated` **y `service_role`**. No es una restricción de más: sin
política de DELETE se detiene a `authenticated` y a nadie más, porque
`service_role` **se salta el RLS**. Es el mismo par de candados que ya protege a
`audit_logs` —quitar el permiso y un trigger que grita—, y por el mismo motivo:
en una firma de auditoría que un hallazgo no se pueda destruir no es higiene, es
el producto (CLAUDE.md regla 13).

**La migración se probó entera antes de dártela** (24 ago 2026), en un Postgres 17
desechable con las siete anteriores aplicadas en orden. Pasaron **42
comprobaciones de comportamiento**. Las que más importan:

- El folio `AUD-2026-001` lo asigna la base, el consecutivo avanza y **cruza
  organizaciones** —es el consecutivo de la firma—, y un folio ya puesto no se
  recalcula.
- **Dos auditores sin señal levantan el mismo `H-01` y la base RENUMERA en vez de
  rechazar.** Ésta es la que salva los 30 hallazgos del criterio de cierre.
- `generar_lista_verificacion()` toma sólo las cláusulas **hoja** auditables y
  activas, es idempotente y **no pisa lo ya evaluado**.
- Un hallazgo sin cláusula, con la evidencia en blanco o anulado sin motivo se
  rechaza.
- El historial lo escribe la base, una fila por campo que cambió, con su motivo y
  con quién lo hizo.
- **Ni `authenticated` ni el socio ni `service_role` borran un hallazgo o una
  auditoría, ni reescriben el historial.**
- Una organización o un proyecto con auditorías ya no se borra.

Eso no sustituye a aplicarla —tu base tiene datos y la mía estaba vacía—, pero sí
quiere decir que no vas a encontrarte un error de sintaxis a media aplicación.

### `D04` — Aplicar la migración de la evidencia de campo · **Bloquea: el recorrido en planta**

⚠️ **Va después de `D00`.** Le pone una clave foránea a `auditoria_items`, que
nace ahí.

```bash
npx supabase db push
npx supabase gen types typescript --linked > /tmp/database.ts && mv /tmp/database.ts src/types/database.ts
git diff --stat src/types/database.ts
```

Un solo archivo: `20260824180000_evidencia_de_campo.sql`. Es corta y hace dos
cosas:

1. **`adjuntos.item_id`** — la foto y la nota dictada de un punto de la lista de
   verificación. Sin ella, la pantalla de recorrido no puede guardar una foto
   tomada antes de decidir el veredicto, ni la de un `conforme`, ni el audio de
   una nota.
2. **Un punto con evidencia ya no se quita de la lista.** ⚠️ Esto cierra un
   agujero: un `on delete cascade` **se salta el RLS**. La política de `adjuntos`
   sólo deja borrar evidencia a un socio, pero quitar un punto lo puede hacer
   cualquier editor — y el cascade se habría llevado sus fotos por delante en
   silencio, sin pasar por esa política.

**Se probó entera antes de dártela** (24 ago 2026), aplicando las nueve en orden
sobre un Postgres 17 desechable: **53 comprobaciones**, las 42 de `D00` más 11
nuevas. Las que importan: la foto de un punto hereda la organización del punto y
no la que manda el cliente; con hallazgo y punto a la vez **manda el hallazgo**
—es el campo más específico—; un punto con evidencia devuelve **cero filas** al
intentar borrarlo y sus fotos siguen ahí; uno en blanco sí se quita; y el
recorrido guarda **la hora del auditor**, no la del servidor.

### `D01` — Entregar el formato de informe de auditoría · **Bloquea: emitir informes**

El Word o el PDF que la firma usa hoy. Lo necesitamos tal cual para reproducirlo:
secciones, orden, textos fijos, dónde van las firmas.

### `D02` — Definir los criterios de clasificación · **Bloquea: capacitar al equipo**

Por escrito: **qué hace mayor a una no conformidad**. Ausencia total de un
proceso, falla sistémica, incumplimiento legal, riesgo a la seguridad… El criterio
de la firma, en una página.

Va a vivir dentro de la app como ayuda contextual cuando un auditor clasifique un
hallazgo. Es lo que hace que dos auditores distintos clasifiquen igual.

### `D03` — Crear la carpeta de evidencias · → **movida a `C04`** (22 ago 2026)

El bucket `evidencias` se crea con la migración de la Fase 02: los adjuntos se
adelantaron a F02·B2b. Ver `C04`.

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
