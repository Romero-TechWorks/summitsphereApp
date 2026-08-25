# 02 · Plan de Fases para Implementación

**Este documento manda sobre el orden y el alcance de todo lo que se trabaje.**
Si algo parece faltar en el código, búscalo aquí antes de "arreglarlo": puede
estar aplazado con motivo.

---

## Cómo leer este plan

- **Nueve fases**, de la 00 a la 08. Cada una entrega **algo usable**, no un
  avance interno. La regla es dura: si al cerrar una fase nadie de la firma puede
  hacer algo nuevo con la app, la fase estaba mal definida.
- Cada fase tiene **bloques** (`F03·B2`). Un bloque es una unidad de trabajo que
  cabe en un commit coherente y se puede probar sola.
- **Criterio de cierre**: la prueba concreta que hay que poder hacer para declarar
  cerrada la fase. No "está implementado" — *"un auditor levanta 30 hallazgos en
  modo avión y al recuperar señal aparecen los 30"*.
- **Tareas del dueño**: los pasos manuales que la fase requiere y que ningún
  programa puede hacer solo. Lo **técnico** —paneles, llaves, migraciones,
  buckets— se detalla en [`09_TAREAS_DEL_DUENO.md`](09_TAREAS_DEL_DUENO.md); lo
  que se **captura dentro de la app** —cartera, proyectos, catálogo de normas,
  alcance, equipo— vive desde el 25 ago 2026 en
  [`11_TAREAS_DEL_CLIENTE.md`](11_TAREAS_DEL_CLIENTE.md), escrito paso a paso para
  quien no programa. Las claves (`B01`, `C01`…) siguen resolviendo desde `09`.
- Las estimaciones son **semanas de una persona a tiempo completo** apoyada por un
  agente de código. Con dos personas la ruta crítica no se divide a la mitad: las
  fases 01→02→03 son secuenciales porque cada una construye sobre el modelo de la
  anterior.

---

## Mapa general

```
FASE 00 · CIMIENTOS ─────────────────────────────── 2 sem
   infraestructura · andamio · auth · offline · bitácora
        │
        ▼
FASE 01 · CARTERA ───────────────────────────────── 3 sem
   organizaciones · sitios · contactos · proyectos · etapas
   tareas por etapa · depuración de datos
        │
        ▼
FASE 02 · SISTEMAS DE GESTIÓN ───────────────────── 4 sem
   normas y cláusulas · control documental · matriz de requisitos
   adjuntos y Markdown · procesos · riesgos · indicadores
        │
        ▼
FASE 03 · AUDITORÍAS ◀── el núcleo ──────────────── 3 sem
   programa · plan · lista de verificación · ejecución OFFLINE
   hallazgos · informe
        │
        ▼
FASE 04 · ACCIONES Y SEGUIMIENTO ────────────────── 2 sem
   acciones correctivas · causa raíz · adjuntos · push · cron
        │
        ├──────────────┬─────────────────┐
        ▼              ▼                 ▼
FASE 05 ·        FASE 06 ·          (pueden solaparse)
CUMPLIMIENTO     PORTAL Y ADMIN
Y CAPACITACIÓN   3 sem
3 sem
        └──────────────┴─────────────────┘
                       │
                       ▼
FASE 07 · ASISTENTE ─────────────────────────────── 5 sem
   biblioteca normativa · RAG · chat · informes
   evidencia multimodal · generación de documentos
                       │
                       ▼
FASE 08 · AUTOMATIZACIÓN EXTERNA ────────────────── 5 sem
   MS Graph · buzón de evidencia · gamificación · despachador
```

**Total: ~30 semanas** (≈ 7 meses) para el alcance completo.
**Primera versión útil en producción: fin de Fase 04** (~12 semanas). A partir de
ahí la firma ya trabaja en la app mientras se construye el resto.

---

# FASE 00 · Cimientos

> **2 semanas.** Nadie ve nada nuevo, pero todo lo demás se apoya aquí.
> Es la única fase que se permite no entregar valor de negocio.

## F00·B0 — Infraestructura

Se ejecuta [`../guias/00_INDICE_INFRAESTRUCTURA.md`](../guias/00_INDICE_INFRAESTRUCTURA.md)
completa, en orden: GitHub → Supabase → Vercel → Cloudflare.

**Al terminar existen:** organización de GitHub con el repo privado, proyecto de
Supabase con su contraseña guardada, proyecto de Vercel enlazado que despliega en
cada push, dominio `app.summit-sphere.com` apuntando a Vercel, y Turnstile con sus
llaves.

## F00·B1 — Andamio de la aplicación  ✅

- `create-next-app` con TypeScript, App Router, Tailwind 4, sin `src/` por
  defecto → luego se mueve a `src/`.
- Dependencias exactas (ver [`03_ARQUITECTURA.md`](03_ARQUITECTURA.md) §1).
- `next.config.mjs` con el fork `@ducanh2912/next-pwa`, `customWorkerSrc` en
  `worker/`, y los scripts de build con `--webpack`.
- `src/app/globals.css` con **los tokens de Summit** — la paleta navy/verde/cyan
  validada en contraste (ver [`05_SISTEMA_DE_DISENO.md`](05_SISTEMA_DE_DISENO.md)).
- Fuentes: **Cormorant Garamond** (display) y **DM Sans** (texto) por
  `next/font/google`, más una monoespaciada para números, folios y fechas.
- Sentry, con el túnel `/monitoring`. **Sin el wizard** — a mano.
- Manifest, iconos y splash de la PWA con la esfera de Summit.

## F00·B2 — Armazón fijo  ✅

- `src/app/(dashboard)/layout.tsx`: el `div` raíz mide la ventana y recorta; el
  único scroll es el que marca `src/lib/utils/appScroll.ts`.
- `Sidebar` (escritorio, navy) · `BottomNav` (móvil, 5 destinos) · `Navbar` con
  buscador global y el 🤖 del asistente. Responsive **por estado de React**
  (`isMobile`), no por media queries.
- Biblioteca `src/components/ui/`: `Button`, `Badge`, `Skeleton`, `EstadoVacio`,
  `Logo`, `Iconos`. ⚠️ Los de captura —`Input`, `Select`, `Textarea`, `Campo`,
  `Modal`, `Pestanas`— y el patrón de lista llegaron en **F01·B0**, cuando hubo
  una pantalla real que los usara. `Card` **se eliminó** ahí mismo: desde esa
  decisión no hay tarjetas en ninguna pantalla.
- Reglas globales de accesibilidad: anillo de foco `:focus-visible`, mínimo táctil
  44×44 en `pointer: coarse`, `prefers-reduced-motion`.

## F00·B3 — Autenticación y roles  ✅

⚠️ **Este bloque se ejecutó junto con B5.** El guard de MFA tiene que leer el rol
del usuario, y ese rol vive en una tabla que sólo existe después de la primera
migración. Separarlos obliga a escribir el proxy dos veces.

- `src/proxy.ts` (**no** `middleware.ts`) con el matcher que excluye PWA,
  `/monitoring`, `api/cron`, `portal` y `~offline`. ✅
- `/login` con **Turnstile** ✅ — `src/components/auth/Turnstile.tsx`.
  ⚠️ **Quien valida el token es Supabase**, no la app: viaja en
  `options.captchaToken` de `signInWithPassword` y Supabase lo comprueba contra
  Cloudflare con la llave secreta antes de mirar la contraseña. Verificarlo en el
  navegador, o en una ruta propia, sería decorativo: el endpoint de
  autenticación es público y quien quiera probar diez mil contraseñas no abre
  esta pantalla.
  ⚠️ **La otra mitad es del dueño** (`09_TAREAS_DEL_DUENO.md` · A08):
  Authentication → Attack Protection, con la llave secreta del widget. ✅ Hecha
  el 21 ago 2026 — las dos mitades están puestas y el captcha funciona. Con el
  widget solo el token se ignora; con la protección sola **no entra nadie**, así
  que se apagan juntas: primero el panel, después la variable.
- `/mfa` con enrolamiento (QR + clave manual) y reto TOTP. ✅
- **MFA obligatorio para `socio` y `administracion`** ✅, impuesto en el guard y
  no en la interfaz. `src/lib/auth/roles.ts` traduce a TypeScript el CHECK de
  `usuarios.rol`: si cambia uno, cambia el otro en el mismo commit.
- Tabla `usuarios` con los cinco roles: `socio`, `consultor`, `auditor`,
  `administracion`, `cliente`. ✅ Toda cuenta nueva nace `cliente` —el rol NUNCA
  se lee de `raw_user_meta_data`, que la escribe el propio usuario— y la asciende
  un socio.
- Tabla `usuarios_organizaciones`: **qué consultor ve qué cliente.** ✅ Es la
  tabla de la que cuelga todo el RLS del proyecto.

## F00·B4 — Capa offline  ✅

- React Query con persistencia en IndexedDB (`src/lib/offline/`). ✅ El
  persistidor es **propio** (`persistencia.ts`, con `dehydrate`/`hydrate`), no
  `@tanstack/react-query-persist-client`: son cuarenta líneas y así el disparador,
  el tamaño y la caducidad se ajustan aquí, que es lo que hay que tocar el día
  que una auditoría entera tenga que caber en un teléfono.
- `cola.ts` (el *outbox*) + `offlineWrite` + `sync.ts` + `EstadoConexion` —el
  `ConnectionStatus` de JDM Built, con el nombre en español del proyecto. ✅
- `src/lib/query/keys.ts` como única fuente de claves de caché. ✅
- `src/lib/utils/uuid.ts` con el fallback a `crypto.getRandomValues` ✅ — ⚠️ ver
  CLAUDE.md, trampas heredadas.

⚠️ Dos ajustes que no se tocan sin entender qué rompen, los dos en
`src/lib/query/cliente.ts`: `networkMode: 'offlineFirst'` —con el valor por
defecto React Query **no entrega la caché** sin conexión y la pantalla se queda
cargando para siempre— y `gcTime` mayor que el `MAX_EDAD` de la persistencia.

## F00·B5 — Esquema base y bitácora  ✅

**Migración 1** (`20260820160600_esquema_base_y_bitacora.sql`).
`usuarios`, `organizaciones`, `usuarios_organizaciones`, `config_firma`,
`audit_logs`, `notificaciones` — cada una con su RLS, sus políticas y sus índices
en el mismo archivo.

`audit_logs` sin políticas de UPDATE ni DELETE, con trigger genérico
`registrar_bitacora()` que se engancha a cada tabla nueva a medida que aparece.

⚠️ Y con `impedir_cambios_bitacora()`, un trigger que rechaza todo UPDATE y todo
DELETE **incluido el del `service_role`** — las políticas solas no bastan, porque
el `service_role` se las salta. Es lo que hace verdadera la frase del criterio de
cierre.

## F00·B6 — Tablero vacío  ✅

Un dashboard con widgets que dicen "sin datos todavía", pero con la rejilla
reordenable (`@dnd-kit`) y las preferencias por usuario ya guardándose. Sirve para
probar que el armazón, la caché y el RLS funcionan de punta a punta.

- Catálogo en `src/lib/tablero/widgets.ts`, con los widgets de cada rol de
  [`06_MODULOS_FUNCIONALES.md`](06_MODULOS_FUNCIONALES.md). Un id guardado que ya
  no exista se ignora y uno nuevo se agrega al final: una versión nueva de la app
  no le vacía el tablero a nadie.
- Tabla `preferencias_tablero` (migración 2), **sin `org_id` a propósito**: la
  fila es de una persona, no de una organización, y su política
  (`usuario_id = auth.uid()`) es más estricta que filtrar por cartera.
- El widget **«Esperando señal»** es el único con datos reales en la Fase 00:
  enseña la cola de salida. Es la ventana del auditor a lo que lleva sin subir.
- ⚠️ El `TouchSensor` lleva `activationConstraint` con retardo. Sin él, en el
  teléfono cualquier gesto de scroll que empiece sobre un widget arranca un
  arrastre y el tablero deja de poder scrollearse.

### Criterio de cierre — Fase 00

> El socio entra desde su teléfono con usuario, contraseña y su segundo factor;
> instala la app desde el navegador; ve el tablero; **activa modo avión, navega
> entre pantallas y nada se rompe**; vuelve la señal y el indicador de conexión
> deja de latir. En Supabase, `audit_logs` tiene su registro de inicio de sesión y
> **no se puede borrar ni con el service role desde la app**.

⚠️ **Esta prueba sólo vale contra HTTPS: la URL de Vercel.** Contra el servidor de
desarrollo no se puede hacer, y no por una limitación de la app: un service worker
**no se registra fuera de contexto seguro**, y desde el teléfono se entra por
`http://192.168.x.x:3000`. Sin service worker no hay caché de pantallas, así que
el modo avión da la pantalla de error del navegador **aunque la capa offline esté
perfecta**. Intentarlo ahí quema una tarde persiguiendo un bug que no existe.
Ver CLAUDE.md · reglas del offline, 6.

### Tareas del dueño — Fase 00

`A01` Crear las cuentas (GitHub, Supabase, Vercel, Cloudflare) con el correo de la
firma, no personal. `A02` Guardar la contraseña de la base de datos en el gestor
de contraseñas. `A03` Enrolar su segundo factor. `A04` Dar de alta a los primeros
usuarios del equipo. `A08` Encender Turnstile en Supabase. `A09` Redesplegar
Vercel después de tocar las variables de entorno. `A10` Aplicar la partición de
pruebas y marcar la cuenta `dev` — a partir de ahí la cartera de demostración vive
aparte y el cliente captura en limpio (docs/08 §2.1).

---

# FASE 01 · Cartera

> **2 semanas.** La primera fase que la firma usa de verdad.

## F01·B0 — Lenguaje visual y kit de captura  ✅

Un bloque previo que el plan original no tenía y la primera pantalla de dominio
hizo obligatorio: **el tablero es la plantilla visual del resto de la app y no
hay tarjetas en ninguna parte** (decisión del dueño, 21 ago 2026;
[`05_SISTEMA_DE_DISENO.md`](05_SISTEMA_DE_DISENO.md) §4.3, que se invirtió).

- `ui/Lista.tsx` — la traducción del bloque del tablero a **fila**: texto sobre
  el fondo, icono, y la hairline verde que crece al enfocar. Es el patrón de
  contenido de toda la aplicación.
- `ui/Campo.tsx` + `Input` · `Select` · `Textarea` — los controles **sí**
  conservan su marco (`--borde-fuerte`, 3.59:1): un campo sin borde no se ve
  pulsable. `fontSize: 16` obligatorio, o Safari en iOS amplía la página al
  enfocar y con el armazón fijo ese zoom no se deshace.
- `ui/Modal.tsx` — centrado en escritorio, hoja inferior en el teléfono. Cuida
  las cuatro trampas del armazón: `calc(var(--vh-full) * 0.9)`, `minHeight: 0`,
  bloqueo del scroller de la app (no del `body`) y área segura en el pie.
- `ui/Pestanas.tsx` + `usePestana` — **los dominios son pestañas**
  (`?tab=`), con `<Link>` de verdad para que la URL se pueda compartir.
  ⚠️ Quien los use va dentro de un `<Suspense>`: leen `useSearchParams()` y sin
  el límite **el build falla**.
- `ui/EncabezadoPagina.tsx` y `ui/Aviso.tsx` — el título de pantalla y el aviso
  con barra de 2px a la izquierda, sin relleno.
- `utils/dates.ts` — `formatDateOnly` · `toISODate` · `formatDate`. ⚠️ Una
  columna `date` con `new Date()` corre un día en México, y esta fase está llena
  de fechas comprometidas con el cliente.
- `utils/useEsMovil.ts` — el corte de 768px en un solo sitio, que ahora usan el
  layout y el modal.
- `Card.tsx` eliminado y sus usos retirados; `public/fallback-*.js` sumado a los
  ignores de ESLint (lo genera el build de la PWA y ensuciaba el lint con un
  error en código que nadie escribió).

## F01·B1 — Organizaciones, sitios y contactos  ✅

**Migración 3** (`20260821180000_cartera_y_proyectos.sql`), que trae el esquema
de **toda** la fase de una vez —incluidas las tablas de B2 y las del catálogo de
normas de B2b— para que el dueño aplique una sola migración y regenere los tipos
una sola vez. Las pantallas llegan bloque por bloque.

- `organizaciones`: ya existía desde la Fase 00; aquí gana su expediente.
- `sitios`: los centros de trabajo de cada organización. **Una organización puede
  tener cinco plantas y el alcance del certificado cubrir sólo dos** — el sitio es
  una entidad, no un campo de texto en la dirección.
- `contactos`: quién es quién en el cliente, con su papel (representante de la
  dirección, coordinador del SGC, responsable de seguridad).
  ⚠️ **Sin `acceso_portal`**: el portal es de la Fase 06 y una casilla que no
  enciende nada es un interruptor muerto (CLAUDE.md regla 11).
- **Pantallas**: `/cartera?tab=organizaciones` con buscador **en memoria** —para
  que siga filtrando sin señal—, `/cartera?tab=contactos` (el directorio de la
  cartera) y el expediente `/cartera/[id]` con Resumen · Sitios · Contactos ·
  **Equipo**.
- **La pestaña Equipo es el reparto de `usuarios_organizaciones`**, o sea la
  tarea `B02` del dueño hecha desde la app. Vive en el expediente porque se
  decide mirando al cliente; `/admin?tab=usuarios` [Fase 06] enseñará lo mismo al
  revés, por persona.
- **`puedo_editar_org()`**: el papel `lectura` deja de ser una etiqueta y pasa a
  impedir toda escritura, en la base. Ver [`08_SEGURIDAD_Y_RLS.md`](08_SEGURIDAD_Y_RLS.md) §2.
- ⚠️ El alta de organizaciones **sigue siendo sólo del socio**: quién entra a la
  cartera lo decide él, y un consultor que creara una dejaría de verla al
  instante siguiente —no cumpliría `mis_organizaciones()`—, que se lee como que
  la app perdió al cliente recién capturado.

## F01·B2 — Proyectos y alcance  ✅

Sólo código: el esquema lo trajo la migración de B1.

- `proyectos`: el contrato. Cliente, **etapa** (las seis de la metodología),
  consultor líder, fechas, monto, estado y objetivo. Tipos:
  `implementacion` · `auditoria` · `capacitacion` · `cumplimiento` ·
  `automatizacion` · `soporte_it` — los cinco servicios de la firma más el
  soporte.
- `proyecto_normas` y `proyecto_sitios`: el alcance real, en tablas, no en una
  cadena de texto. De aquí sale la lista de verificación de una auditoría.
- **Pantallas**: la pestaña `Proyectos` del expediente (lista + detalle con
  `?proyecto=<id>`, sin ruta nueva) y `/cartera?tab=proyectos`, la lista de toda
  la cartera con filtros por estado y etapa. El detalle pinta las seis etapas
  como avance y el alcance como dos grupos de casillas que **escriben al
  momento**, cada una por `offlineWrite`.
- **El consultor líder sale del equipo asignado a esa organización**, no de la
  plantilla entera de la firma: quien lidera un proyecto tiene que poder verlo.
  Si el cliente no tiene equipo, el selector lo dice y manda a la pestaña Equipo.
- ⚠️ **El selector de normas hoy está vacío a propósito** — `normas` nace sin
  filas y se llena con el importador de B2b. La pantalla lo explica en vez de
  enseñar una lista vacía.
- ⚠️ Mover de etapa **no escribe la bitácora desde la app**: lo hace el trigger
  `registrar_cambio_etapa()`. Con señal intermitente, dos operaciones separadas
  en la cola pueden dejar la línea de tiempo sin el renglón.

## F01·B2b — Importador del catálogo de normas  ✅

El bloque que el plan original no tenía: **el catálogo no se siembra desde el
repositorio, se sube** (decisión del dueño, 21 ago 2026).

- `src/lib/normas/importador.ts`: analizador de markdown propio, sin
  dependencias y determinista. `#` abre una norma, `##` en adelante una cláusula.
  ⚠️ **El árbol lo arma el NÚMERO, no la profundidad del encabezado**: el padre
  de `8.5.1` es `8.5` aunque los dos estén en `##`. Un archivo escrito a mano,
  con niveles inconsistentes, sigue saliendo bien.
- `[no auditable]` en el título marca lo que no se puede citar en un hallazgo
  —los capítulos 1, 2 y 3 de una ISO—.
- **Vista previa obligatoria**: antes de escribir se enseña el saldo por norma
  —cuántas cláusulas entran, cuántas cambian, cuántas se dan de baja— y confirma
  una persona. Un importador que escribe y luego informa no se usa dos veces.
- **Idempotente**: `upsert` por `clave` y por `(norma_id, numero)`. Corregir un
  resumen es volver a subir el archivo. Lo que desaparece del `.md` se marca
  `activa = false`, **nunca se borra**: puede haber hallazgos citándolo.
- Botón para **descargar la plantilla**, sin una sola línea de texto normativo.
- Sólo un socio importa, impuesto en la base. Vive en `/sistemas`, que deja de
  ser una pantalla pendiente; el resto del dominio sigue siendo Fase 02.
- ⚠️ **Excepción consciente a `offlineWrite`**, la tercera del proyecto: parte de
  un archivo que sólo existe en esa pantalla y escribe cientos de filas en lote.
  Sin conexión la pantalla lo dice y no deja empezar.

## F01·B3 — Tablero de la cartera  ✅

Los cuatro widgets de la fase dejan de decir «sin datos»: **embudo por etapa**
(las seis, incluidas las que están en cero — el hueco es la información),
**carga por consultor** (con los proyectos sin líder agrupados al final, que es
lo que un socio necesita ver), **contratos por cerrar** en 60 días con los
vencidos primero, y **mis proyectos**, los que uno lidera arriba.

- ⚠️ **Sin vistas de la base: se calcula en memoria** sobre la lista de
  proyectos que ya está en la caché (`src/lib/tablero/calculos.ts`). Una vista
  por widget sería otra consulta, otra clave y otra cosa que puede faltar en la
  caché — y el tablero es lo primero que se abre por la mañana, a veces con
  media barra de señal. Los cuatro comparten **una sola** petición con
  `/cartera?tab=proyectos`: abrir cualquiera de las dos deja lista la otra.
- El día que una firma tenga cinco mil proyectos, esto se mueve a una vista con
  `security_invoker`. Ese día se paga, no hoy.
- Barras nativas y números absolutos, **sin librería de gráficas**.
- El buscador de organizaciones se entregó antes, en B1.

## F01·B4 — Bitácora del proyecto  ✅

Una línea de tiempo por proyecto: visitas, entregas, cambios de etapa, acuerdos.
Es lo primero que se consulta antes de una reunión con el cliente y hoy vive en
la memoria del consultor.

- Se captura en la visita, así que pasa por `offlineWrite` como todo lo demás.
- **Los cambios de etapa se anotan solos** (trigger `registrar_cambio_etapa()`),
  y esas entradas no se editan: son el reflejo de un hecho, no la nota de nadie.
  Por eso `cambio_etapa` no aparece en el desplegable de tipos.
- ⚠️ **No hay borrar, y sí corregir** — sólo su autor o un socio, impuesto por la
  política. Una entrada equivocada se aclara con otra: si una bitácora se
  pudiera vaciar, no serviría para lo único que existe.
- Vive en el detalle del proyecto, junto a Tareas y Alcance, en secciones
  desplegables: en un teléfono, tres secciones abiertas dejan lo de todos los
  días media pantalla más abajo.

## F01·B5 — Tareas por etapa  ✅

**Propuesto por el dueño el 21 ago 2026, después de usar la app.** No estaba en
el plan: las `tareas` de la Fase 04 son los pasos de una *acción correctiva*, y
esto es otra cosa — **el checklist de la metodología de Summit dentro de un
proyecto**.

- `tareas_etapa`: por proyecto y por **etapa** de las seis. Título, responsable,
  fecha compromiso, estado (`pendiente` · `en_curso` · `hecha` · `no_aplica`),
  si exige evidencia, y quién y cuándo la cerró.
- En el detalle del proyecto, **una sección desplegable por etapa** con su avance
  (`4/7`). Una etapa cuyas tareas obligatorias están todas hechas se pinta en
  verde en la barra de etapas que ya existe.
- **Plantilla por tipo de proyecto**: la metodología no se re-teclea en cada
  cliente. Vive en `config_firma.plantillas` (la columna ya existía) y **se
  define con el ejemplo**: el consultor arma bien las tareas de un cliente y un
  socio pulsa *Guardar como plantilla*; en el siguiente proyecto del mismo tipo
  aparece *Usar la plantilla*. Así se trabaja de verdad —«hazlo como el de
  Aceros»— y no hace falta esperar a la pantalla de configuración de la Fase 06.
- ⚠️ **`exige_evidencia` todavía no existe.** La casilla que impide dar por hecha
  una tarea sin adjunto llega con los adjuntos, en F02·B2b: hasta entonces sería
  un interruptor que no puede impedir nada (regla 11).
- ⚠️ **Quién cerró la tarea y cuándo lo escribe la BASE**, no el navegador
  (`sellar_tarea_hecha()`). Una fecha de cierre que viaja desde el cliente es una
  fecha que se puede escribir a mano — y quién dio por cumplida una etapa de la
  metodología es exactamente lo que se pregunta después. Reabrir una tarea borra
  esa firma.
- ⚠️ **`no_aplica` no cuenta ni a favor ni en contra** del avance de la etapa. En
  un cliente que no fabrica, media etapa sobra; contarla como pendiente dejaría
  la etapa eternamente incompleta, y como hecha regalaría un avance que nadie
  hizo.
- ⚠️ **Terminar las tareas de una etapa NO mueve el proyecto de etapa.** Avanzar
  es una decisión del consultor —y queda en la bitácora con su nombre—; que la
  app lo hiciera sola convertiría el embudo de la firma en algo que nadie
  decidió. Lo que sí hace es proponerlo.
- ⚠️ **Nada de una tabla de tareas para todo.** Los pasos de una acción
  correctiva [F04] responden a un hallazgo, tienen verificación de eficacia y los
  audita un tercero; una tarea de etapa es trabajo interno de la firma.
  Juntarlas obligaría a que la mitad de las columnas de cada fila estuvieran
  vacías y a explicarle a un auditor por qué su acción correctiva vive en la
  misma tabla que "mandar la propuesta por correo".

## F01·B6 — Depuración: dar de baja y borrar  ✅

**También propuesto sobre la marcha, y por un motivo concreto: se cargaron datos
de prueba y no había forma de quitarlos.**

- Los listados **esconden por defecto** lo cerrado y lo cancelado, con un
  interruptor para verlo. Un expediente cerrado hace ruido cada día en la lista
  de quien trabaja con los vivos.
- **Borrado de verdad, y sólo del socio**, para organizaciones y proyectos: pide
  **escribir el nombre exacto**, enumera qué se lleva por delante con sus
  cantidades (sitios, contactos, proyectos, tareas, alcance y bitácora cuelgan
  con `ON DELETE CASCADE`) y **queda registrado en `audit_logs`**, que es
  inmutable y guarda la fila entera en `antes`.
- ⚠️ La condición vive en `puedo_borrar_org()` y `puedo_borrar_proyecto()`, **no
  en la política**, para que ampliarla sea tocar un sitio. **En la Fase 02 y en
  la 03 hay que ampliarlas**: una organización con documentos, auditorías o
  hallazgos deja de poder borrarse. Está escrito en la migración y en el
  `comment on function`.
- ⚠️ **Y aquí está la línea, que no es la misma que la de la regla 13.** Se puede
  borrar lo que **no es evidencia de auditoría**: un cliente capturado por error,
  un proyecto de prueba. **No** se puede borrar en cuanto cuelga de ello un
  hallazgo, una auditoría o un documento aprobado — a partir de ahí sólo se
  cierra o se anula, con motivo. La comprobación es de la base, no de la
  pantalla: la política de DELETE exige que no existan esas filas.
- Requiere una migración: hoy `organizaciones` y `proyectos` **no tienen política
  de DELETE**, así que un borrado devuelve *cero filas* — el rechazo silencioso
  de siempre.

### Criterio de cierre — Fase 01

> El socio da de alta una organización real con dos plantas, le abre un proyecto
> de implementación de ISO 9001 + 45001 con alcance en una sola planta, lo asigna
> a un consultor, y ese consultor —**y sólo ese**— lo ve al entrar. Un consultor
> no asignado busca la organización y **no aparece**. En el proyecto ve las
> tareas de la etapa 1, marca cuatro de siete y la barra de avance lo refleja.
> Y el cliente de prueba que abrió para probar **lo borra él mismo**, escribiendo
> su nombre para confirmarlo.

### Tareas del dueño — Fase 01

`B00` Aplicar la migración de la cartera ✅. `B00b` Aplicar la de tareas y
depuración. `B01` Cargar la cartera real de
clientes (o exportarla de donde esté hoy). `B02` Decidir quién ve qué: asignar
consultores a organizaciones. `B03` Escribir y subir el catálogo de normas.
`B04` Definir la **plantilla de tareas por etapa**: armar bien las tareas de un
proyecto y guardarlas como plantilla de su tipo.

---

# FASE 02 · Sistemas de Gestión

> **3 semanas.** Aquí la app deja de ser un CRM y se vuelve la herramienta de la firma.

## F02·B1 — Catálogo de normas y cláusulas  🟡 *falta el contenido (`C01`)*

⚠️ **Este bloque cambió de forma en la Fase 01** (decisión del dueño, 21 ago
2026). Las tablas `normas` y `norma_clausulas` ya existen —las creó la migración
3, vacías— y **el catálogo no se siembra: se sube**. El importador de `.md` es
F01·B2b. Lo que queda aquí es el contenido y lo que se construye encima.

- `normas` y `norma_clausulas`: el árbol de cada norma — número, título,
  **resumen redactado por Summit**, si es auditable, y su padre.
- ⚠️ **No se copia el texto de la norma.** Ver CLAUDE.md regla 12. Lo que vive en
  la base es la estructura y el resumen propio; el texto licenciado del cliente
  entra como archivo en su bucket privado. Que el catálogo entre por un archivo
  que el dueño sube —y no por un `INSERT` del repositorio— es lo que mantiene ese
  criterio técnico fuera de Git.
- Contenido: el árbol completo de ISO 9001:2015 y 45001:2018 (las dos que la
  firma más implementa) y, de las otras cinco, sus cláusulas de primer y segundo
  nivel. Lo entrega el dueño en el `.md` de la tarea `C01`, y **corregirlo es
  volver a subirlo**: el importador hace `upsert`, no duplica.

## F02·B2 — Control documental  ✅ *código listo, 22 ago 2026*

El corazón de un SGC y la razón por la que un cliente contrata una consultoría.

- `documentos`: código, título, tipo (manual, procedimiento, instructivo,
  formato, registro, política), proceso dueño, cláusulas que cubre.
- `documento_versiones`: cada revisión con su estado
  `borrador → en_revision → aprobado → obsoleto`, quién la elaboró, quién la
  revisó, quién la aprobó y **el control de cambios** (qué cambió respecto a la
  anterior).
- ⚠️ **Nunca se sobrescribe una versión aprobada.** Aprobar una nueva marca la
  anterior `obsoleta` y la conserva. Un auditor externo pide justo eso.
- Lista maestra de documentos, que es un entregable en sí mismo.
- Archivos en el bucket privado `documentos`, con URL firmada.
- **Biblioteca por cliente y por proyecto.** `documentos` cuelga de la
  organización y lleva un `proyecto_id` opcional: el mismo expediente se puede
  mirar entero o filtrado por el contrato que lo produjo.

⚠️ **Cuatro reglas de este bloque las sostiene la BASE, no la pantalla**
(`20260822120000_sistemas_de_gestion.sql`): una versión aprobada no se
sobrescribe (`proteger_version_aprobada()`), aprobar jubila a la anterior y
apunta el documento a la nueva en una sola escritura del cliente
(`jubilar_version_anterior()`), quién aprobó y cuándo lo escribe el servidor
(`sellar_version_documento()`), y un documento con alguna versión aprobada no se
borra (`puedo_borrar_documento()`). La interfaz se limita a no ofrecer botones
que ya están garantizados a fallar.

⚠️ **`documento_versiones.archivo_url` se llama `archivo_ruta`** (22 ago 2026):
el bucket es privado, así que lo que se guarda es la ruta en Storage y la URL se
firma al abrir. Una URL firmada guardada en una columna caduca en una hora.

⚠️ **Subir el ARCHIVO de una versión es la CUARTA excepción consciente a
`offlineWrite`** y sólo una mitad: pesa megabytes, sale de un `File` que sólo
existe en esa pantalla, hay que convertirlo antes de guardarlo y lo hace un
consultor con el Word del cliente delante de su computadora. Todo lo demás
—crear el documento, escribir una versión a mano, mandarla a revisión,
aprobarla, vincular cláusulas— pasa por la cola.

### Markdown como formato de trabajo  ← *propuesto por el dueño, 21 ago 2026*

**Cada versión de documento guarda su `markdown`, además del archivo original.**
No es una comodidad: es la forma en que el contenido de la firma se vuelve
legible para una persona **y** para el asistente de la Fase 07 sin volver a
procesar nada.

- **Entrada `.docx` → Markdown.** Transpilador propio, el inverso del de F07·T7:
  descomprimir el `.docx` y leer `word/document.xml` con RegEx, sin `pandoc` ni
  `docx.js` (docs/07 §Módulo B). ⚠️ Sale limpio en procedimientos, políticas y
  formatos de texto; **las tablas complejas, las imágenes y la numeración
  automática no sobreviven**, y eso se avisa al subir en vez de dejar que el
  consultor lo descubra en el entregable.
- **Entrada PDF → Markdown.** Extracción de texto con `pdfjs-dist`, que ya es
  dependencia del proyecto. ⚠️ **Un PDF escaneado no tiene texto que extraer**:
  eso es OCR y vive en el Módulo C multimodal [F07·T6]. Se detecta —un PDF que
  devuelve tres caracteres por página lo es— y se dice, no se guarda un
  documento vacío.
- **Salida Markdown → `.docx`** con la plantilla de Summit: ya está planeada en
  **F07·T7** y no se duplica aquí. La ida y la vuelta usan el mismo diccionario.
- **Visor y editor de Markdown dentro de la app**, sin dependencias de editor
  enriquecido: el `.md` se lee con formato y se edita como texto. Editar crea una
  **versión nueva**; nunca se sobrescribe una aprobada.
- ⚠️ **El original nunca se tira.** El `.md` es una representación; el archivo
  que firmó el cliente es el `.docx` o el PDF, y es el que un auditor pide.

## F02·B2b — Adjuntos  ✅ *código listo, 22 ago 2026*  ← *adelantado desde F04·B2*

La infraestructura de archivos estaba planeada para la Fase 04, **y llega tarde
para cómo se usa la app**: las evidencias son el pan de cada día desde que hay
tareas y documentos. Se adelanta entera, y la Fase 03 la encuentra hecha en vez
de inventarla para las fotos de campo.

- Bucket privado `evidencias`, **cola propia** en IndexedDB
  (`src/lib/offline/adjuntos.ts`), subida en dos fases.
- ⚠️ **Qué va por cada cola, y por qué** (precisado al implementarlo, 22 ago
  2026): **la FILA** de `adjuntos` viaja por el `outbox` normal —es una escritura
  de tabla y así conserva su ORDEN respecto a las demás—; **el BINARIO** espera
  en la cola propia y sube **después** de que la de datos esté vacía. Si la fila
  fuera también por la cola de binarios, marcar como hecha una tarea con
  evidencia obligatoria llegaría al servidor **antes** que su adjunto y
  `sellar_tarea_hecha()` la rechazaría — justo al recuperar la señal, con el
  auditor ya fuera de la planta. Y al revés: una foto de 4 MB no puede retrasar
  el envío de treinta hallazgos de texto.
- Filtrado por **campo dominante**
  (tarea de etapa → tarea de acción → acción → hallazgo → documento →
  organización), **nunca con un OR**.
- ⚠️ **La tabla nace con las FK que hoy existen**: `tarea_etapa_id` y
  `documento_id`. `hallazgo_id` la añade la Fase 03 y `accion_id`, `tarea_id` y
  `obligacion_id` la 04 y la 05 — una FK a una tabla que no existe es un error
  de migración, no una previsión. El orden completo sí está escrito desde ahora
  en `CAMPOS_DOMINANTES`, para que añadir una sea una línea aquí y otra en
  `heredar_org_del_adjunto()`.
- ⚠️ `adjuntar()` sólo encola; subir es `sincronizarAdjuntos()` y **hay que
  esperarlo** — refrescar sin esperar es el «hay que subirla dos veces» de JDM
  Built.
- **`tareas_etapa.exige_evidencia` entra aquí**, que es cuando deja de ser un
  interruptor muerto: `sellar_tarea_hecha()` rechaza el paso a `hecha` si la
  tarea no tiene ningún adjunto.
- ⚠️ El bucket es privado y se lee con URL firmada: **lo ya subido no se ve sin
  señal**. Tomar la foto y adjuntarla, sí. Es una limitación real que la interfaz
  tiene que decir, no esconder.

## F02·B3 — Matriz de requisitos  ✅ *código listo, 22 ago 2026*

La tabla que contesta *"¿cuánto nos falta para certificarnos?"*.

- Por cada cláusula auditable del alcance del proyecto: estado
  `no_iniciado / documentado / implementado / evidenciado / no_aplica`, con
  justificación obligatoria si es `no_aplica` — **y la exige el CHECK de la
  base**, no la pantalla.
- Documento(s) que la cubren y evidencia que la respalda.
  ⚠️ **El vínculo se declara desde el DOCUMENTO** (`documento_clausulas`), no
  desde la matriz: un documento cubre varias cláusulas y se dice una sola vez,
  en su expediente. La matriz enseña el resultado — y sobre todo **enseña cuándo
  no hay nada**, que es lo que un auditor de certificación va a encontrar.
- Porcentaje de avance por norma y por capítulo — el número que el cliente pide
  en cada reunión.
- **El diagnóstico inicial (etapa 1) es esta matriz recién llenada.** No es un
  documento aparte.

## F02·B4 — Procesos, riesgos e indicadores  ✅ *código listo, 22 ago 2026*

- `procesos`: el mapa de procesos del cliente (estratégicos, operativos, de
  soporte), con su dueño y sus entradas/salidas.
- `riesgos`: riesgos y oportunidades por proceso, con probabilidad, impacto,
  nivel calculado y tratamiento. Cubre 9001 §6.1, 45001 §6.1, 27001 y 37001.
- `indicadores`: objetivos de calidad con su meta, frecuencia, fórmula y
  responsable; y `mediciones` con el valor de cada periodo.
- Semáforo de indicadores: cuáles van fuera de meta. Alimenta la revisión por la
  dirección.

### Criterio de cierre — Fase 02

> Un consultor sube el Manual de Calidad de un cliente **en Word** como versión
> 1: la app lo convierte a Markdown, lo enseña con formato y avisa de lo que no
> sobrevivió la conversión. Lo pasa a revisión, lo aprueba, y luego sube la
> versión 2: la 1 queda **obsoleta y consultable**, con su control de cambios y
> con su archivo original intacto. En la matriz de requisitos marca la
> cláusula 4.1 como `documentado` apuntando a ese manual, y el porcentaje de
> avance de ISO 9001 sube solo.

### Tareas del dueño — Fase 02

`C00` **Aplicar las dos migraciones de la fase**, en orden:
`20260822120000_sistemas_de_gestion.sql` (el esquema) y después
`20260822120100_storage_documentos_y_evidencias.sql` (los buckets y sus
políticas). Van separadas a propósito: la segunda toca `storage.objects`, que no
es un esquema nuestro, y si falla por permisos no puede llevarse por delante el
esquema de la fase. Requiere que `B00b` esté aplicada.
`C01` Validar el árbol de cláusulas (es el criterio técnico de la firma, no puede
salir de un modelo sin revisión). `C02` Definir los estados de la matriz de
requisitos si difieren de los propuestos. `C03` Verificar que el bucket
`documentos` quedó **privado**. `C04` Verificar lo mismo con `evidencias`
—subió desde la Fase 03, donde era `D03`, porque los adjuntos se adelantaron a
F02·B2b—.

---

# FASE 03 · Auditorías

> **3 semanas. El núcleo del producto.** Es la fase que justifica que esto sea una
> PWA offline y no una hoja de cálculo compartida.

## F03·B0 — El esquema de la fase  ✅ *migración escrita y probada, 24 ago 2026*

`20260824120000_auditorias_y_hallazgos.sql` trae **todo** el esquema de la Fase 03
de una vez —igual que se hizo con la Fase 02—, porque las tablas se sostienen
entre sí: `hallazgos` cita a `auditoria_items`, `adjuntos` estrena `hallazgo_id` y
`puedo_borrar_org()` sólo queda bien ampliada si las dos tablas ya existen.

Se validó en un Postgres 17 desechable con las siete anteriores aplicadas en
orden: **42 comprobaciones de comportamiento**, listadas en la tarea del dueño
`D00`. Falta aplicarla contra la base real — eso lo hace el dueño.

## F03·B1 — Programa y plan de auditoría  ✅ *código listo, 24 ago 2026*

- `programa_auditorias`: el programa anual por cliente — qué se audita, cuándo, con
  qué frecuencia, bajo qué criterio. Aprobarlo sella quién y cuándo **en la base**.
- `auditorias`: la auditoría concreta. Tipo (`interna`, `preauditoria`,
  `seguimiento`, `certificacion_acompanamiento`, `proveedor`), criterios, fechas,
  estado, auditor líder.
- `auditoria_normas` · `_sitios` · `_procesos`: el alcance en tablas. De las
  normas sale la lista de verificación.
- `auditoria_equipo`: quién audita y con qué papel, con sus certificaciones para
  el informe.
- `auditoria_agenda`: el plan hora por hora — proceso, auditado, auditor. Es lo
  que se envía al cliente antes de la visita, y después lleva su `cumplido`.
- ⚠️ **El folio lo asigna la base, no el navegador.** `AUD-2026-014` es el
  consecutivo de la firma, y con el RLS de este proyecto un consultor no ve las
  auditorías de los demás para poder contarlo. Una auditoría encolada sin señal
  aparece **sin folio hasta que sincroniza**, y la pantalla lo dice.
- ⚠️ **`/auditorias` NO pide elegir cliente**, al revés que `/sistemas`: la semana
  de un auditor cruza la cartera. Se descarga la lista una vez y se filtra en
  memoria.

## F03·B2 — Lista de verificación  ✅ *código listo, 24 ago 2026*

**Sin migración**: `auditoria_items` y `config_firma.plantillas` ya existían.

- Se **genera** desde las cláusulas del alcance con `generar_lista_verificacion()`
  —escrita en B0—: toma sólo las cláusulas **hoja** auditables y activas, es
  idempotente y **no pisa lo ya evaluado**. Ampliar el alcance y volver a generar
  añade lo que falta.
- `auditoria_items`: cada punto a verificar, con su cláusula, su pregunta, su
  proceso y el espacio para la respuesta.
- Editable: el auditor añade, quita y reordena antes de entrar.
  ⚠️ Reordenar **intercambia el `orden` de dos puntos**, no reescribe la lista:
  con sesenta puntos, lo segundo serían sesenta operaciones en la cola por cada
  flechita. ⚠️ Un punto que ya produjo un hallazgo no se quita — es la cita de
  ese hallazgo, y lo impide la política, no la pantalla.
- **Plantillas por norma y por giro**, en `config_firma.plantillas` (jsonb) bajo
  la llave `verificacion`, **mismo patrón que la plantilla de tareas** de la
  Fase 01: es configuración de la firma, la lee cualquiera con sesión y sólo la
  escribe un socio; una tabla para esto sería una tabla con una fila.
  - **La plantilla se define con el ejemplo**, no en una pantalla de
    configuración: el auditor deja bien la lista de un cliente y la guarda para
    los siguientes. Es el mismo gesto que «Guardar como plantilla» de las tareas,
    y ahorra la pantalla de administración que no llega hasta la Fase 06.
  - ⚠️ **El reparto: la BASE decide QUÉ se audita, la plantilla CÓMO se
    pregunta.** Aplicarla reescribe la redacción de los puntos generados y suma
    las preguntas propias de la firma; una cláusula que la plantilla nombra y que
    **no está en el alcance se omite y se dice**. Al revés, una plantilla vieja
    metería en el recorrido cláusulas fuera del alcance de este cliente, y de ahí
    saldrían hallazgos fuera de alcance.
  - ⚠️ **Tampoco toca un punto ya evaluado.** Si el auditor marcó «conforme» y
    después la plantilla le cambiara la redacción, ese veredicto quedaría
    contestando algo que nadie preguntó.
  - ⚠️ Se guarda el **`numero`** de la cláusula, no su `id`: es lo que un auditor
    reconoce, lo que sobrevive a reimportar el catálogo y lo que hace legible el
    jsonb. Y el **giro se normaliza** —`organizaciones.giro` es texto libre—, con
    `general` de respaldo.
- ⚠️ **Generar pide señal, y la pantalla lo dice y no deja empezar.** Es la quinta
  excepción consciente a `offlineWrite`: es una RPC —la cola sabe reproducir
  insert/update/delete sobre una tabla, no una llamada a función—, escribe
  cientos de filas de golpe, y sobre todo **es lo que se hace en la oficina antes
  de salir**. Editar, añadir y reordenar sí pasan por la cola.

## F03·B3 — Ejecución en campo ⚠️ **offline obligatorio**  ✅ *código listo, 24 ago 2026*

Este es el bloque donde el proyecto se gana o se pierde. Vive en la pestaña
**Recorrido** del expediente de la auditoría, la última de las seis: las otras
cinco se preparan una vez en la oficina, ésta se abre en la planta y no se sale de
ella en tres horas.

**Migración:** `20260824180000_evidencia_de_campo.sql`, tarea del dueño `D04`.

- **Precarga**: un botón que se pulsa en el estacionamiento baja **nueve piezas** a
  la caché —el plan, la lista, la agenda, el alcance, el árbol de cláusulas, el
  equipo, los sitios y contactos, los procesos y los documentos del cliente— y un
  aviso dice **«lista para trabajar sin señal»**.
  - ⚠️ **El aviso se calcula mirando la CACHÉ, no un booleano del componente.**
    Con un `useState`, salir de la pestaña y volver diría «descarga antes de
    entrar» con todo bajado, y en la puerta de una planta eso hace que alguien se
    dé la vuelta. Al revés también: si el navegador vació la caché entre una
    visita y otra, se dice **antes** de bajar al sótano.
  - ⚠️ Es secuencial y **un fallo no aborta el resto**: si los documentos no
    bajan, la lista sí tiene que bajar. Lo que falló se nombra, no se resume en
    «hubo un error».
  - ⚠️ Los **desplegables también se bajan** (sitios, contactos, procesos,
    cláusulas). Regla 3 del offline: sin ellos el guardado muere en la validación
    *antes* de encolarse, y el dato no se encola — se pierde.
  - ⚠️ **Faltan los hallazgos previos del cliente**, que entran con B4: su
    consulta todavía no existe. Es una línea más en `piezasDeLaPrecarga()`.
- Pantalla de recorrido para **una mano y un pulgar**: filas de 56px que se abren
  al tocarlas, y dentro los cuatro veredictos como **botones de 44px en fila**, no
  un desplegable — un `<select>` en un teléfono abre la rueda del sistema y pide
  la segunda mano. Tres filtros grandes: *me faltan · con hallazgo · todos*.
- **Foto con la cámara → adjunto encolado**, sin salir de la pantalla
  (`capture="environment"` abre la cámara trasera directamente). Y **se espera** a
  `sincronizarAdjuntos()`: refrescar sin esperar es el «hay que subirla dos veces»
  de JDM Built.
- **Dictado de nota por voz** con `MediaRecorder`, guardado **como un adjunto
  más**, no en un almacén propio — ver el cambio de plan abajo.
- **Indicador permanente** de cuántos cambios esperan señal, cuántos archivos
  faltan por subir y cuántos fueron rechazados.
  ⚠️ Aquí es **permanente**, al revés que en la Navbar: allá un indicador que
  siempre está se deja de mirar, pero en el recorrido es la única prueba de que
  las tres horas de trabajo siguen ahí.

### Cambio de plan · el audio NO tiene almacén propio

`docs/03` §2 anunciaba un `src/lib/offline/dictados.ts`. Al implementarlo resultó
ser una capa de más: **un dictado es exactamente lo que ya sabe hacer la cola de
adjuntos** —un binario que se encola en IndexedDB, sube *después* de los datos y
hereda su `org_id` del campo dominante—. Darle almacén propio obligaba además a
subir `VERSION_BD` en `idb.ts` otra vez, y ese número, cuando se olvida, **falla
sólo en el teléfono del consultor** —donde la base ya existía— y nunca en un
equipo de desarrollo. La grabadora es un componente; el almacenamiento es el que
ya estaba probado.

### Por qué `adjuntos` necesitó `item_id`

El modelo de datos no lo tenía previsto —la lista de FK saltaba de `hallazgo_id` a
`accion_id`—, y colgar la foto del hallazgo no alcanza. Tres casos que se pierden,
y los tres pasan en una planta:

1. **La foto se toma ANTES de decidir el veredicto.** El auditor fotografía el
   tablero y después piensa si eso es NC menor u observación.
2. **Un `conforme` también se fotografía.** «Sí tenían el registro, aquí está» es
   evidencia de que se verificó, y de un conforme no nace ningún hallazgo.
3. **La nota dictada** es del punto que se está mirando, y muchas veces se dicta
   justo para decidir si hay hallazgo.

⚠️ Y con la columna vino un agujero que hubo que cerrar: **un `on delete cascade`
se salta el RLS**. La política de `adjuntos` sólo deja borrar evidencia a un
socio, pero quitar un punto de la lista lo puede hacer cualquier editor — y el
cascade se habría llevado sus fotos por delante en silencio. La política de
`auditoria_items` ahora exige, además de que no haya hallazgo, que **no haya
adjuntos**.

## F03·B4 — Hallazgos  ✅ *código listo, 24 ago 2026*

**Sin migración**: `hallazgos` y `hallazgos_historial` nacieron en B0, y
`adjuntos.hallazgo_id` en la misma. Esto es sólo código.

- `hallazgos`: tipo (`nc_mayor`, `nc_menor`, `observacion`, `oportunidad_mejora`,
  `conformidad`), **cláusula citada obligatoria**, descripción, evidencia objetiva,
  requisito incumplido, proceso, sitio, responsable del cliente, estado.
  ⚠️ El selector de cláusula ofrece **sólo las normas del alcance**: citar una que
  este cliente no está auditando es levantar un hallazgo fuera de alcance.
- ⚠️ **Un hallazgo no se borra.** Se anula **con motivo** —lo exige el CHECK de la
  base— o se reclasifica, y queda el histórico. **No hay función de borrado en
  `lib/queries/hallazgos.ts` ni botón en la pantalla**, y no es un olvido: la base
  tampoco lo deja, ni a `service_role`.
- **La ayuda de clasificación se pinta al elegir el tipo**, en el momento de
  decidir — es lo que hace que dos auditores clasifiquen igual.
  ⚠️ El texto de arranque es un criterio general y defendible; **el de la firma
  llega con `D02` y se reemplaza en `CRITERIO_HALLAZGO`**. Un campo de ayuda vacío
  esperando a `D02` habría sido peor.
- Numeración por auditoría, estable y offline (`AUD-2026-014 / H-03`): el
  consecutivo se calcula **sobre la caché** —en la planta no hay a quién
  preguntar— y la base **renumera al llegar** si otro auditor se adelantó.
- **Levantar desde el recorrido**: cada punto de la lista tiene su botón, y el
  hallazgo nace con la cláusula y el proceso de ese punto ya puestos. Al guardar,
  el auditor **se queda donde estaba** y se le dice el folio — mandarlo a otra
  pestaña le haría perder el sitio entre sesenta puntos.
- **El tablero del lunes**: pestaña *Hallazgos* de `/auditorias`, con los de toda
  la cartera agrupados **por cliente, por norma o por antigüedad**, y los
  vencidos contados aparte.

### Sobre la vista `hallazgos_abiertos` del modelo de datos

**Se aplaza, y por el mismo motivo que los widgets del tablero** [F01·B3] no
tienen vista: **una vista es otra clave que puede faltar en la caché**, y esta
pantalla se abre el lunes por la mañana con media barra de señal. La antigüedad y
el vencimiento se calculan en memoria (`diasAbierto`) sobre la lista que ya está
bajada. Se moverá a una vista con `security_invoker` el día que una firma tenga
decenas de miles de hallazgos.

## F03·B5 — Informe de auditoría

- Plantilla imprimible sin dependencias, con colores literales (la ventana de
  impresión no hereda `globals.css`).
- Contenido: alcance, criterios, equipo, agenda cumplida, resumen de hallazgos por
  tipo y cláusula, conclusiones, firmas.
- Se genera **el mismo día**, en el sitio, con lo que hay en la caché.

### Criterio de cierre — Fase 03

> Un auditor abre la auditoría en la oficina, ve "lista para trabajar sin señal",
> **pone el teléfono en modo avión**, recorre una planta durante tres horas
> levantando 30 hallazgos con 50 fotos, genera el informe preliminar en el sitio
> y se lo enseña al cliente en la reunión de cierre. Al salir y recuperar señal,
> los 30 hallazgos y las 50 fotos suben **en ese orden** y ninguno se duplica.

### Tareas del dueño — Fase 03

`D04` **Aplicar la migración de B3**, `20260824180000_evidencia_de_campo.sql` —
`adjuntos.item_id` y la política de borrado del punto—. Requiere `D00`.
`D00` **Aplicar la migración de la fase**, `20260824120000_auditorias_y_hallazgos.sql`.
Requiere que `C00` esté aplicada: amplía funciones y una columna que nacen ahí. Es
un solo archivo —no hay una segunda de Storage, porque el bucket `evidencias` ya
se creó con los adjuntos—. ⚠️ **Quita permisos a propósito**: revoca el DELETE de
`hallazgos` y `auditorias` y el INSERT/UPDATE/DELETE del historial **también a
`service_role`**, que se salta el RLS. `D01` Aportar el formato oficial del
informe de auditoría de la firma. `D02` Validar la clasificación de hallazgos y
sus criterios (qué hace mayor a una NC). `D03` → **movido a `C04`** (22 ago 2026):
el bucket `evidencias` se creó con los adjuntos, que se adelantaron a F02·B2b.

⚠️ **`C01` bloquea a B2.** La lista de verificación se genera de `norma_clausulas`;
con el catálogo vacío (`B03`), `generar_lista_verificacion()` devuelve cero.

---

# FASE 04 · Acciones y seguimiento

> **2 semanas.** Cierra el ciclo: un hallazgo sin acción es un hallazgo perdido.
> **Al terminar esta fase la app entra a producción y la firma trabaja en ella.**

## F04·B1 — Acciones correctivas

- `acciones`: nace de un hallazgo (o sola, como acción de mejora). Tipo
  (`correccion`, `accion_correctiva`, `preventiva`, `mejora`), responsable, fecha
  compromiso, estado.
- **Análisis de causa**: 5 porqués e Ishikawa (6M), guardados estructurados, no
  como un párrafo. ISO 9001 §10.2 lo exige y un auditor externo lo revisa.
- `tareas`: los pasos concretos de la acción, con su responsable y su fecha.
- **Verificación de eficacia**: fecha, quién verificó, evidencia y veredicto.
  Una acción no se cierra sin esto. Es el error más común en los SGC reales.

## F04·B2 — Adjuntos  → **movido a F02·B2b** (21 ago 2026)

La capa de archivos se adelantó a la Fase 02: las evidencias hacen falta en
cuanto hay documentos y tareas, y la Fase 03 necesita la cola de adjuntos para
las fotos de campo antes de que llegue esta fase. Lo que queda aquí es
**conectarla a las acciones**: la evidencia que cierra una acción correctiva y la
que respalda su verificación de eficacia.

## F04·B3 — Notificaciones push

- VAPID, `worker/index.js` como `customWorkerSrc`, suscripción por usuario y
  dispositivo.
- Categorías: hallazgo asignado, acción por vencer, acción vencida, documento por
  aprobar, vencimiento normativo próximo, resumen diario.
- Preferencias por usuario y por categoría.

## F04·B4 — Cron de vencimientos

- `/api/cron/diario` (Vercel Cron): recorre acciones, hallazgos y obligaciones, y
  dispara los avisos. Toda la lógica vive en la RPC
  `correr_avisos_programados()`; la ruta sólo hace el fan-out de push.
- `/api/cron/resumen`: el digest de la mañana para cada consultor.
- ⚠️ **El plan Hobby de Vercel permite exactamente dos crons.** Están ocupados con
  esos dos: lo que necesite tiempo se cuelga del diario.

### Criterio de cierre — Fase 04

> Se levanta un hallazgo de NC mayor y se le asigna acción correctiva con fecha a
> 15 días. El responsable **recibe la notificación en su teléfono**. A los 12 días
> le llega el aviso de "vence en 3". Cierra la acción sin verificación de eficacia
> y **la app no lo deja**. Verifica, adjunta la evidencia, y el hallazgo pasa a
> cerrado con su rastro completo en la bitácora.

### Tareas del dueño — Fase 04

`E01` Generar las llaves VAPID y cargarlas en Vercel. `E02` Definir `CRON_SECRET`.
`E03` Decidir los plazos por defecto de cada tipo de hallazgo. `E04` **Declarar la
app en producción** y migrar al equipo.

---

# FASE 05 · Cumplimiento normativo y capacitación

> **3 semanas.** Puede solaparse con la Fase 06.
> Es el servicio que más urgencia genera en el cliente: aquí hay multas de por medio.

## F05·B1 — Matriz de aplicabilidad NOM

- `noms`: catálogo de NOMs (STPS, SEMARNAT, Protección Civil) con su nombre,
  autoridad, tipo y periodicidad de cumplimiento.
- `nom_requisitos`: los puntos verificables de cada NOM.
- `org_noms`: **qué NOMs le aplican a esta organización y por qué** — la matriz de
  aplicabilidad, que es el primer entregable de una consultoría de cumplimiento.
- Evaluación de cumplimiento por requisito: cumple / no cumple / parcial / no
  aplica, con evidencia.
- Semáforo por NOM y por sitio.

## F05·B2 — Vencimientos y obligaciones

La pantalla que evita una clausura.

- `obligaciones`: todo lo que caduca — estudios (ruido, iluminación, térmicas,
  psicosocial), dictámenes (eléctrico, estructural), licencias (ambiental, de
  funcionamiento, uso de suelo), recargas de extintores, mantenimientos de
  sistemas contra incendio, exámenes médicos, capacitaciones obligatorias.
- Cada una con su fecha de emisión, vigencia, fecha de vencimiento calculada,
  documento asociado y responsable.
- ⚠️ Estas fechas son columnas `date`. Formatearlas con `new Date()` las corre un
  día en México — y aquí un día decide si algo está vencido. Ver CLAUDE.md.
- Calendario de obligaciones + aviso a 90 / 30 / 7 días.

## F05·B3 — Capacitación

- `cursos`: catálogo de la firma — los de normatividad STPS (NOM-002, 009, 017,
  018, 019, 022, 029, 033, 035, 036) y los de brigadas (montacargas, incendios,
  búsqueda y rescate, extintores, primeros auxilios, multibrigadas, plataformas
  de elevación).
- `dnc`: detección de necesidades y programa anual de capacitación por cliente.
- `sesiones`: cada curso impartido — fecha, instructor, sede, duración, temario.
- `asistentes`: quién asistió, con su calificación y su asistencia.
- **Constancias DC-3**: generación en el formato oficial de la STPS, con folio,
  desde los datos de la sesión y del asistente. Es un entregable que hoy se llena
  a mano, uno por uno.

### Criterio de cierre — Fase 05

> Para un cliente manufacturero se genera la matriz de aplicabilidad con 14 NOMs,
> se evalúa el cumplimiento y sale el semáforo. Se registran sus 6 estudios de
> higiene con sus vigencias y **la app avisa 90 días antes** de que venza el de
> ruido. Se imparte un curso de brigada de incendios a 20 personas y salen **las
> 20 constancias DC-3 en su formato oficial, con folio**, en un clic.

### Tareas del dueño — Fase 05

`F01` Aportar el catálogo de NOMs con sus requisitos verificables (criterio
técnico de la firma). `F02` Aportar el catálogo de cursos con duraciones y
temarios. `F03` Validar el formato DC-3 vigente y el registro de la firma ante la
STPS como agente capacitador.

---

# FASE 06 · Portal del cliente y administración

> **3 semanas.** Puede solaparse con la Fase 05.
> Es la fase que hace visible el valor entregado — y la que le cobra.

## F06·B1 — Portal del cliente

`/portal/[token]` — **público, sin cuenta, sin instalar nada.** Se manda por
WhatsApp.

- Qué ve: avance de su sistema por norma, sus hallazgos abiertos con fecha
  compromiso, sus vencimientos próximos, su calendario de visitas, sus documentos
  aprobados, y su **Salud del SGC** (el puntaje que la Fase 08 pone a correr).
- Qué puede hacer: **subir evidencia** de una acción, sin cuenta.
- ⚠️ **Seguridad:** `anon` no está en ninguna política operativa. Todo el portal
  entra por **una sola** función `SECURITY DEFINER`, `portal_organizacion(p_token)`,
  que devuelve un `jsonb` armado a mano — **lista blanca, no filtro**. Nunca se
  consultan tablas desde el navegador del cliente. §8.5.
- El token se revoca y se regenera desde la app.

## F06·B2 — Plantillas y reportes

- Catálogo de plantillas en código + configuración por firma en `config_firma`.
- Entregables imprimibles: informe de auditoría, informe mensual de avance, matriz
  de requisitos, lista maestra de documentos, matriz de aplicabilidad NOM, plan de
  acción, constancia DC-3, acta de revisión por la dirección.
- Con la identidad de Summit: la esfera, la paleta, la tipografía.

## F06·B3 — Administración de la firma

- **Metas y comercial**: metas de venta, embudo de propuestas, tasa de cierre.
- **Finanzas**: ingresos por proyecto, gastos, rentabilidad por cliente y por
  consultor. La pregunta que contesta: *¿este cliente nos deja dinero?*
- **Facturación CFDI 4.0**: ⚠️ **módulo apagado de fábrica**. Se enciende cuando el
  dueño lo pida y con las credenciales del PAC cargadas. Hereda entero el módulo
  de JDM Built — incluidas todas sus trampas documentadas (cadena original desde
  el XSLT, `KeyInfo` con `RSAKeyValue` en cancelación, `customid` en el reintento,
  razón social sin régimen de capital).
- **Usuarios**: alta, roles, asignación a organizaciones, reseteo de contraseña.
- **Bitácora**: la consulta de `audit_logs` en lenguaje natural.
- **Configuración**: datos de la firma, módulos encendidos, plazos por defecto.

## F06·B4 — Buscador global

Vista `indice_busqueda_global` + RPC `buscar_global` sobre organizaciones,
proyectos, documentos, hallazgos, acciones y obligaciones. Por **prefijo**
(`'calibr':*`), porque se teclea a medias palabras. Vive en la Navbar.

### Criterio de cierre — Fase 06

> El consultor manda por WhatsApp el link del portal al coordinador de calidad del
> cliente. El coordinador lo abre en su teléfono **sin instalar nada ni crear
> cuenta**, ve que su sistema va al 62%, que tiene 4 hallazgos abiertos y que su
> estudio de ruido vence en 45 días, y sube desde ahí la foto del registro que le
> pidieron. En la app de Summit, esa foto aparece adjunta a la acción — y en la
> bitácora dice que la subió el portal, no un usuario.

### Tareas del dueño — Fase 06

`G01` Aportar los formatos oficiales de los entregables de la firma. `G02` Definir
qué ve exactamente el cliente en el portal (es una decisión comercial, no
técnica). `G03` Si se enciende facturación: contratar el PAC y cargar el CSD.

---

# FASE 07 · Asistente

> **5 semanas.** Aquí aterrizan los **Módulos B y C** del plan de automatización.
> Módulo **apagado de fábrica**. Detalle completo en
> [`07_ASISTENTE_Y_AUTOMATIZACION.md`](07_ASISTENTE_Y_AUTOMATIZACION.md).

**La regla que gobierna toda la fase:** el asistente **propone**, una persona
**confirma**. Ninguna escritura llega a la base sin pasar por una pantalla de
confirmación tipada. Un hallazgo firmado por un modelo no vale ante un organismo
certificador.

## F07·T1 — La espina

El camino que todo lo demás reutiliza:

```
entrada (foto · PDF · audio · texto)
      → interpretación del modelo
      → PROPUESTA TIPADA (validada con Zod)
      → pantalla de confirmación
      → offlineWrite  ← la misma escritura de siempre
      → traza en asistente_trazas
```

Más el tope de uso por organización y la oficina `/asistente` con sus pestañas.

## F07·T2 — Biblioteca normativa

- PDF (norma, NOM, reglamento interno del cliente) → markdown consultable **sin
  señal**, con conversión por lotes reanudable.
- Troceado **por cláusula**, no por número de caracteres: la unidad de la norma es
  la cláusula y una cita partida a la mitad no sirve como evidencia.
- Bucket privado por organización. ⚠️ CLAUDE.md regla 12.

## F07·T3 — Búsqueda con cita (Módulo B)

- `pgvector` en Supabase + búsqueda híbrida (semántica + texto completo) fundida
  por **RRF**.
- **Token Diet**: las cláusulas se guardan además en forma condensada
  clave-valor (`[ISO9001|8.5.1|Ctrl_Produccion|Req:Info_Documentada,Monitoreo,Competencia]`)
  para que el prompt lleve cientos de tokens, no miles. Objetivo del plan
  original: **−85% de tokens de entrada**.
- **Toda respuesta cita cláusula y documento.** Sin cita, no se muestra.

## F07·T4 — Informes

Herramientas tipadas cuyo cruce vive **en SQL**, no en el prompt. Tres para
empezar: estado del sistema de un cliente, desempeño de auditorías del periodo,
y rentabilidad de un proyecto. Se releen sin regenerar.

## F07·T5 — Chat, memoria e instrucciones

- Chat con herramientas de **lectura** sobre los siete dominios, todas filtradas
  por el rol y las organizaciones de quien pregunta.
- Chat con herramientas de **escritura**, cada una con su pantalla de
  confirmación: hallazgo, acción, documento, obligación, sesión de capacitación.
- Memoria de la firma e instrucciones editables **sólo por el socio**.
- Se pregunta por texto **o por voz** (dictado + transcripción).

## F07·T6 — Evidencia multimodal (Módulo C)

- Foto o PDF de un registro firmado → el modelo lo compara contra el requisito de
  la cláusula → veredicto `PASS` / `FAIL` + motivo.
- **Salida al flujo normal**: un `FAIL` propone un hallazgo; un `PASS` propone
  marcar el requisito como evidenciado. Ambos pasan por confirmación.
- Procesamiento **efímero**: el archivo va de Storage a memoria y a la API, y se
  libera. No toca disco.

## F07·T7 — Generación de documentos (Módulo B)

- Procedimiento / manual / política redactado en **markdown estricto**, con el
  contexto operativo del cliente y la cláusula condensada.
- Transpilador propio **Markdown → OpenXML** (RegEx, sin `pandoc` ni `docx.js`)
  que inyecta en `word/document.xml` de la plantilla de Summit y recomprime.
- **Trazabilidad**: el `.md` se commitea al repositorio de expedientes por la API
  de GitHub **antes** de liberar el `.docx`.

### Criterio de cierre — Fase 07

> El consultor sube el PDF de la NOM-035 a la biblioteca. Pregunta *"¿qué me falta
> para cumplir la 035 en la planta de Toluca?"* y el asistente responde citando
> cláusula y documento, marcando lo que no tiene evidencia. Le manda la foto de un
> cuestionario aplicado y el asistente dice `PASS` con el motivo. Le pide el
> procedimiento de identificación de factores de riesgo psicosocial y sale un
> `.docx` con la plantilla de Summit — y su `.md` queda commiteado en GitHub. **Y
> el consultor confirmó cada escritura antes de que ocurriera.**

### Tareas del dueño — Fase 07

`H01` Contratar y cargar `GEMINI_API_KEY` y `ANTHROPIC_API_KEY`. `H02` Crear el
bucket `biblioteca` y verificar que es privado. `H03` Aportar las plantillas
`.docx` maestras de Summit con sus estilos nombrados (`Heading1`, `Heading2`,
`ListParagraph`). `H04` Crear el PAT de GitHub para el repo de expedientes. `H05`
⚠️ **Reindexar cada vez que se corrija el texto de una norma** — si no, la
búsqueda sigue citando el párrafo viejo.

---

# FASE 08 · Automatización externa

> **5 semanas.** El **Módulo A** completo y el cierre del **Módulo C**.
> Módulo **apagado de fábrica**. Es la fase que convierte la app en un sistema
> desatendido.

## F08·B1 — Puente con Microsoft Graph

- Registro de aplicación **Daemon** en Azure Entra ID, flujo
  `client_credentials`, token en caché hasta su expiración.
- Permisos: `OnlineMeetings.Read.All`, `Tasks.ReadWrite`, `Calendars.ReadWrite`,
  `Mail.ReadWrite`, `Mail.Send`.
- Endpoint `/api/graph/webhook` que responde el `validationToken` en texto plano
  y valida el `clientState` en cada notificación.
- ⚠️ **Las suscripciones de Graph expiran en menos de 72 horas.** La renovación se
  cuelga del cron diario existente — no hay un tercer cron en el plan Hobby.

## F08·B2 — De la reunión a las tareas

- Transcripción de Teams → limpieza de metadatos → modelo con instrucción estricta
  de devolver **JSON puro** (sin ```` ```json ````) → tareas, responsables, fechas
  y cláusula relacionada.
- Inyección en MS Planner / To Do / Outlook Calendar del cliente **y** creación de
  las acciones equivalentes en SummitApp.
- ⚠️ Aquí también manda la regla: **el consultor revisa y confirma** el lote de
  tareas antes de que se inyecten en el calendario de un cliente. Una reunión mal
  transcrita metiendo citas falsas en la agenda del director de planta es un
  incidente comercial.
- Objetivo del plan original: **< 45 segundos** desde el fin de la reunión.

## F08·B3 — Buzón de evidencia

- Webhook sobre `auditoria@summit-sphere.com` — notificaciones `created` en Inbox.
- Asunto con el folio (`#ACC-105`) → adjunto a memoria → evaluación multimodal
  (reutiliza F07·T6) → resultado.
- Procesamiento efímero, sin tocar disco.
- Objetivo del plan original: **< 2 minutos** por evidencia.

## F08·B4 — Motor de gamificación: Salud del SGC

Matemática pura, sin motor de reglas externo. Puntaje normalizado **0–1000** por
proceso y por organización.

- `otorgarPuntos(puntaje, complejidad)` — la evidencia entra a tiempo, sube.
- `calcularDecaimiento(puntaje, diasVencido)` — **decaimiento exponencial**
  `puntaje · e^(−λ·dias)`, con `λ = ln(2)/30` (a 30 días de retraso se pierde la
  mitad). Con piso en 0 y sin división por cero.
- Barrido nocturno colgado del cron diario.
- Se pinta en el portal del cliente y en el tablero de la firma. **Sin gráficas
  pesadas**: barras nativas y números absolutos.

## F08·B5 — Despachador de no conformidades

- `FAIL` → penaliza, redacta la notificación de no conformidad, **propone** cita
  de revisión en el calendario del responsable y del consultor.
- `PASS` → suma puntos, marca el requisito evidenciado, responde al cliente.
- ⚠️ **El correo saliente y la cita en el calendario de un cliente requieren
  confirmación de un consultor** por defecto. Existe un modo desatendido, y se
  enciende **por organización** cuando el cliente lo firma — no de fábrica.

### Criterio de cierre — Fase 08

> Termina la reunión de seguimiento en Teams. Antes de que el consultor llegue a
> su coche, tiene en la pantalla el lote de 7 tareas detectadas con su responsable
> y su fecha; confirma 6 y corrige 1; aparecen en el Planner del cliente. Al día
> siguiente el coordinador del cliente manda por correo la foto del registro de
> capacitación al buzón de evidencia con `#ACC-105` en el asunto; en menos de dos
> minutos la acción queda evidenciada y la Salud del SGC de su proceso sube. La
> acción que nadie atendió en 30 días perdió la mitad de su puntaje, y eso se ve
> en el portal.

### Tareas del dueño — Fase 08

`I01` Alta de la aplicación en Azure Entra ID y **consentimiento del
administrador** del tenant del cliente (es una gestión comercial, no técnica).
`I02` Crear el buzón `auditoria@summit-sphere.com`. `I03` Definir con Amara/Manuel
la fórmula final del Score de Calidad y sus pesos. `I04` Decidir por escrito qué
clientes entran a modo desatendido.

---

# Lo que se aplaza a propósito

Registrar esto evita que alguien lo "arregle" dentro de seis meses:

| Aplazado | Por qué | Cuándo se retoma |
|---|---|---|
| **Multi-idioma** | Toda la cartera es mexicana | Si entra un cliente internacional |
| **App nativa (iOS/Android)** | La PWA instalable cubre el caso de campo | Sólo si se necesita hardware que el navegador no da |
| **Firma electrónica avanzada (e.firma) en informes** | La firma con nombre + bitácora inmutable basta para auditoría interna | Si un organismo certificador la exige |
| **Integración con la Academia (LMS)** | Es otro producto, con su propio ciclo | Fase 09, si el LMS existe |
| **Facturación encendida de fábrica** | La firma factura hoy por otro medio y funciona | Cuando el dueño lo pida (F06·B3) |
| **Gráficas de librería (Recharts y similares)** | Barras nativas y números absolutos cargan más rápido y no rompen el bundle | Si un informe lo exige de verdad |
| **Modo desatendido general del Módulo C** | Un correo automático a un cliente es un riesgo comercial | Por organización, con acuerdo firmado |

---

# Riesgos del plan

| Riesgo | Impacto | Cómo se contiene |
|---|---|---|
| **El offline se subestima** | Fatal: sin él la Fase 03 no sirve y la app no se usa en campo | La capa offline se construye en la Fase 00, no cuando duele. El criterio de cierre de F03 es en modo avión |
| **Fuga entre organizaciones** | Fatal: pierde a un cliente y a la reputación de la firma | RLS cerrado desde la migración 1 + prueba explícita de aislamiento en cada criterio de cierre |
| **El catálogo de cláusulas y NOMs no llega** | Bloquea las Fases 02, 03 y 05 | Es tarea del dueño `C01`/`F01`, con fecha. Se arranca con ISO 9001 y 45001 sembradas y se amplía |
| **El asistente escribe algo falso** | Grave: un hallazgo inventado destruye la credibilidad | Confirmación humana obligatoria, cita siempre visible, traza de todo |
| **Copiar texto de normas al repositorio** | Legal | CLAUDE.md regla 12, revisada en cada PR que toque `lib/normas/` |
| **El plan Hobby de Vercel se queda corto** | Medio: dos crons, límites de ejecución | Toda tarea programada se cuelga del cron diario. Si estorba, Pro cuesta menos que una hora de consultor |
| **Se construyen las Fases 07-08 antes que la 03** | Alto: un asistente sin datos que leer | El orden no es negociable. El asistente es útil **porque** hay tres años de auditorías dentro |
