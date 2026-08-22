# CLAUDE.md — SummitApp

Guía obligatoria para agentes de código en este repositorio. Léela completa antes
de tocar código.

**Contexto:** PWA de gestión para **Summit-Sphere**, consultoría en Sistemas de
Gestión ISO, auditorías, cumplimiento normativo (NOMs STPS / SEMARNAT /
Protección Civil), capacitación y automatización. **Next.js 16 App Router +
TypeScript + Supabase + PWA**, deploy en Vercel.

**El usuario real trabaja en una planta, no en una oficina.** Un auditor levanta
hallazgos caminando por un almacén con el teléfono en una mano y la lista de
verificación en la otra, muchas veces **sin señal**. Todo lo que se diseñe tiene
que sobrevivir a eso.

**Multi-tenencia: SÍ aplica, y es la diferencia grande con JDM Built.** Summit
tiene *muchas* organizaciones cliente dentro de **una sola instancia**. Cada fila
de dominio cuelga de una `org_id`. Ver §Reglas críticas, regla 1.

---

## Estado actual — lee esto antes de pedir nada

- **Fase 00 cerrada, Fase 01 completa por el lado del código (B0 → B6), y
  Fase 02 escrita entera** (B2, B2b, B3, B4). De la Fase 01: el lenguaje visual
  sin tarjetas y el kit de captura, `/cartera` con su directorio y el expediente
  `/cartera/[id]`, proyectos con su alcance, el importador de normas, el tablero,
  la bitácora, las tareas por etapa y la depuración. **Está desplegado en Vercel
  y en uso.** Lo que falta para dar la Fase 01 por cerrada es **la prueba del
  criterio de cierre con datos reales y una segunda cuenta**, más las tareas del
  dueño `B01`–`B04`.
- **De la Fase 02 (22 ago 2026):** `/sistemas` deja de ser el catálogo de normas
  y se vuelve el dominio completo, con seis pestañas —Documentos · Requisitos ·
  Procesos · Riesgos · Indicadores · Normas— y un **selector de cliente en el
  query string** (`?org=`). Control documental con ciclo de vida y Markdown
  (`src/lib/documentos/`: lector de ZIP propio, `.docx` → md, PDF → md, visor sin
  `dangerouslySetInnerHTML`), adjuntos con cola propia, matriz de requisitos con
  su porcentaje de avance, y procesos, riesgos e indicadores. `npm run lint` y
  `npm run build` pasan limpios. **Falta probarlo contra la base real**: nada de
  esto se ha ejecutado todavía contra Supabase, porque las migraciones las aplica
  el dueño. **Lo que SÍ está probado son las migraciones**: se aplicaron las ocho
  en orden sobre un Postgres 17 desechable y pasaron 17 comprobaciones de
  comportamiento (herencia de `org_id`, sello de la firma de aprobación,
  jubilación de la versión anterior, rechazo de editar una aprobada, `no aplica`
  sin justificación, tarea con evidencia obligatoria sin adjunto, organización
  con documentos). Los tipos generados desde ese esquema salieron **idénticos**
  a `src/types/database.ts`.
- ⚠️ **HAY TRES MIGRACIONES ESCRITAS Y SIN APLICAR, Y VAN EN ESTE ORDEN:**
  1. `20260821220000_tareas_y_depuracion.sql` — tarea `B00b`. Crea `tareas_etapa`
     y abre el DELETE de organizaciones y proyectos al socio.
  2. `20260822120000_sistemas_de_gestion.sql` — tarea `C00`. **Todo** el esquema
     de la Fase 02, y amplía `puedo_borrar_org()` / `puedo_borrar_proyecto()`.
  3. `20260822120100_storage_documentos_y_evidencias.sql` — tarea `C00`. Los
     buckets `documentos` y `evidencias` y sus políticas. **Aparte a propósito**:
     toca `storage.objects`, que no es un esquema nuestro, y si falla por permisos
     no puede llevarse por delante el esquema del dominio.

  `src/types/database.ts` trae los tipos de las tres **escritos a mano** con la
  forma del generador. Al aplicarlas se regenera y **manda lo generado**.
- **Quién cerró una tarea y cuándo lo escribe la base**, no el navegador
  (`sellar_tarea_hecha()`) — igual que el renglón de cambio de etapa. Una fecha
  que viaja desde el cliente es una fecha que se puede escribir a mano; está
  comprobado que mandar `hecha_por` de otro se sobrescribe.
- **Se puede borrar, y sólo el socio**: organizaciones y proyectos, con
  `puedo_borrar_org()` / `puedo_borrar_proyecto()`. **La ampliación de la Fase 02
  ya está escrita**: una organización o un proyecto **con documentos ya no se
  borra**. ⚠️ **Quedan las de la Fase 03** —auditorías y hallazgos—, y son dos
  líneas comentadas dentro de esas mismas funciones. Se les sumó una tercera,
  `puedo_borrar_documento()`: un documento con alguna versión aprobada u obsoleta
  es evidencia y no se borra; un borrador capturado por error, sí.
- **El catálogo de normas se SUBE, no se siembra.** `normas` y `norma_clausulas`
  nacen vacías y las llena un socio con un `.md` propio desde `/sistemas`
  (`src/lib/normas/importador.ts`). Es lo que mantiene el criterio técnico de la
  firma fuera de Git —regla 12— y lo que permite corregir un resumen sin una
  migración. El importador es **idempotente** y lo que desaparece del archivo se
  marca `activa = false`, nunca se borra.
- **El detalle de un proyecto NO tiene ruta propia**: se abre con
  `?proyecto=<id>` sobre la pestaña de proyectos del expediente. La única ruta de
  detalle de la cartera es `/cartera/[id]` — los dominios son páginas con
  pestañas (§2.1). **El expediente de un documento sigue el mismo patrón**:
  `?documento=<id>` sobre `/sistemas?tab=documentos&org=<id>`.
- **`/sistemas` pide un cliente, y vive en la URL.** Cinco de sus seis pestañas
  son de *un* cliente, no de la cartera entera: el selector escribe `?org=<id>`,
  así que cambiar de pestaña no lo pierde y el enlace se puede mandar por correo.
  Una `org` que ya no está —enlace viejo, cliente borrado, expediente de otro
  consultor— cae en «ninguna», nunca en una pantalla consultando con un id
  fantasma. Normas no lo pide: el catálogo es de la firma.
- **Cuatro reglas del control documental las sostiene la BASE, no la pantalla**
  [F02·B2]: una versión aprobada no se sobrescribe
  (`proteger_version_aprobada()`); aprobar **jubila** a la anterior y apunta el
  documento a la nueva en una sola escritura del cliente
  (`jubilar_version_anterior()`) —tres operaciones de la cola podrían llegar
  desparejadas sin señal, y un documento con dos versiones aprobadas a la vez es
  el hallazgo que la firma le levanta a sus clientes—; quién aprobó y cuándo lo
  escribe el servidor (`sellar_version_documento()`); y un documento con una
  versión aprobada no se borra. La interfaz sólo evita ofrecer botones que ya
  están garantizados a fallar.
  ⚠️ `elaboro_id` y `reviso_id` **no se sellan**: son capturables. Firmar como
  revisor a quien sólo movió el estado sería inventar una firma.
- **La conversión de documentos pasa en el NAVEGADOR y devuelve estructura, no
  HTML.** `src/lib/documentos/` trae un lector de ZIP propio (~80 líneas con
  `DecompressionStream('deflate-raw')`, sin `jszip`), `.docx` → Markdown con
  RegEx sobre `word/document.xml`, PDF → Markdown con `pdfjs-dist`, y un
  analizador que el visor pinta como nodos de React. ⚠️ **Ni una línea de
  `dangerouslySetInnerHTML`**: ese texto viene del Word que mandó un cliente por
  correo, y un `<img onerror=…>` escondido ahí correría en la sesión de un
  consultor que ve los expedientes de todos los clientes.
- **La cola de adjuntos son DOS colas, y el reparto importa** [F02·B2b]: **la
  fila** de `adjuntos` va por el `outbox` normal —así conserva su orden respecto
  a las demás escrituras— y **el binario** por la cola propia de
  `src/lib/offline/adjuntos.ts`, que se vacía **después** de los datos. Al revés,
  marcar hecha una tarea con `exige_evidencia` llegaría antes que su adjunto y
  `sellar_tarea_hecha()` la rechazaría justo al recuperar la señal, con el
  auditor ya fuera de la planta.
  ⚠️ `ALMACEN_ADJUNTOS` obligó a subir `VERSION_BD` de 1 a 2 en
  `src/lib/offline/idb.ts`. Un `createObjectStore` sin tocar ese número no hace
  nada, y falla **sólo en el teléfono del consultor** —donde la base ya existía—,
  nunca en un equipo de desarrollo.
- **`upsert` NO se usa con un índice único que no sea la clave primaria.**
  `requisitos (proyecto_id, clausula_id)` y `mediciones (indicador_id, periodo)`
  eligen `insert` o `update` mirando la fila que ya está en la caché. La cola
  resuelve sus `upsert` por la clave primaria, así que un segundo cambio sin
  señal llegaría con otro `id` y chocaría contra el índice — un rechazo que
  aparece media hora después y sin nadie mirando (§6.1).
- **La migración 3 está aplicada** (21 ago 2026).
  `supabase/migrations/20260821180000_cartera_y_proyectos.sql` creó `sitios`,
  `contactos`, `proyectos`, `proyecto_normas`, `proyecto_sitios`,
  `bitacora_proyecto`, `normas` y `norma_clausulas` —estas dos **vacías**, las
  llena el importador de `.md` de F01·B2b—, con `puedo_editar_org()`,
  `heredar_org_del_proyecto()`, `validar_sitio_del_proyecto()` y
  `registrar_cambio_etapa()`. `npx supabase migration list --linked` da las cinco
  con `local = remote`, y `src/types/database.ts` regenerado salió idéntico al
  del repositorio.
- **La primera migración está aplicada.**
  `supabase/migrations/20260820160600_esquema_base_y_bitacora.sql` creó
  `usuarios`, `organizaciones`, `usuarios_organizaciones`, `config_firma`,
  `audit_logs` y `notificaciones`, con `mis_organizaciones()`, `es_socio()`, el
  trigger genérico `registrar_bitacora()` y las políticas de todas ellas.
  `src/types/database.ts` sale de ahí — se regenera con
  `npx supabase gen types typescript --linked` **en el mismo commit** que toque
  el esquema.
- **El guard ya conoce los roles.** `src/proxy.ts` manda a `/login` sin sesión y
  a `/mfa` a quien tenga un factor sin verificar o un rol que lo exija (`socio`,
  `administracion`). La consulta a `usuarios` sólo se paga cuando la cuenta no
  tiene ningún factor: ver `faltaSegundoFactor()`.
- **Turnstile está encendido y funcionando** (F00·B3 + `A08`, confirmado el
  21 ago 2026). El widget vive en `/login`, pero **quien valida el token es
  Supabase**, no la app: viaja en `options.captchaToken` de
  `signInWithPassword`. Comprobarlo en el navegador —o en un `/api/turnstile`
  propio— sería decorativo, porque el endpoint de autenticación de Supabase es
  público y quien quiera probar contraseñas no pasa por la pantalla.
  ⚠️ Son **dos mitades** y ahora las dos están puestas: el widget (aquí) y la
  protección en el panel de Supabase. Se apagan juntas y en ese orden —primero
  el panel, después la variable—: con el widget solo el token se ignora, y con
  la protección sola **no entra nadie**.
- **Ya hay un `socio`:** `herrliebert@live.com`, ascendido a mano y con su TOTP
  enrolado. La cuenta se creó *después* de la migración, así que el arranque
  automático del primer socio no ascendió a nadie y **ya no volverá a correr**:
  toda cuenta nueva nace `cliente` —el rol de menos privilegio, y nunca leído de
  `raw_user_meta_data`—, y hay que ascenderla a mano
  (`docs/09_TAREAS_DEL_DUENO.md` · A04).
- ⚠️ **Cargar variables en Vercel no basta: hay que redesplegar.** Las
  `NEXT_PUBLIC_*` se incrustan durante el build y el guard corre en el Edge, así
  que el despliegue que ya está en línea sigue viendo lo que había al compilar.
  Síntoma: **503 «SummitApp no está configurada todavía»** con las variables bien
  puestas en el panel. `docs/09_TAREAS_DEL_DUENO.md` · A09.
- **La capa offline ya existe y es obligatoria.** `src/lib/offline/` tiene el
  almacén de IndexedDB, la cola (`cola.ts`), `offlineWrite` (`mutate.ts`), el
  vaciado (`sync.ts`) y la persistencia de la caché (`persistencia.ts`); las
  claves viven en `src/lib/query/keys.ts` y el proveedor es
  `src/components/ProveedorConsultas.tsx`. **Toda lectura por `useQuery` con una
  clave de `keys.ts`; toda escritura por `offlineWrite`.** Una consulta suelta
  dentro de un componente ya no es "todavía no", es saltarse la capa.
- **Hay una pantalla de respaldo sin conexión:** `src/app/~offline/page.tsx`. El
  service worker la precachea y la sirve cuando una navegación no está ni en la
  red ni en la caché. Sin ella, esa navegación caía en la pantalla de error del
  navegador — que no dice el nombre de la app ni menciona que lo guardado sigue a
  salvo, y en campo se lee como que la app perdió el trabajo. Va fuera de
  `(dashboard)` y **excluida del matcher**, igual que `fallback-*.js`.
- **NADA lleva tarjetas, y el tablero es la plantilla del resto** [F01·B0].
  Cada bloque o fila es texto flotando sobre el fondo, con su icono y delimitado
  **por debajo** con el verde de Summit; el marco sólo aparece mientras se
  arrastra un widget. Los bloques salen de
  `src/components/tablero/RejillaTablero.tsx` y las filas de
  `src/components/ui/Lista.tsx` — uno de los dos sirve para casi todo.
  ⚠️ Tres excepciones, y son de mecánica: los **controles** conservan su marco
  (un `<input>` sin borde no se ve pulsable), el **modal** lleva superficie
  porque es una capa por encima y no una caja dentro, y el **armazón** sigue en
  navy. `ui/Card.tsx` ya no existe. §5 · docs/05_SISTEMA_DE_DISENO.md §4.3.
- **Quién ESCRIBE en una organización lo decide `puedo_editar_org()`**, no
  `mis_organizaciones()`. El `SELECT` de una tabla de dominio filtra por
  organización asignada; el `INSERT` y el `UPDATE` pasan además por esa función,
  que **excluye al papel `lectura`**. Desde F01·B1 el papel de
  `usuarios_organizaciones` tiene consecuencias reales, y el reparto se hace en
  la pestaña **Equipo** del expediente — no en `/admin`, que llega en la Fase 06.
  §8.2 · docs/08 §2.
- **Los widgets del tablero NO tienen vistas en la base**: se calculan en
  memoria sobre la lista de proyectos que ya está en la caché
  (`src/lib/tablero/calculos.ts`), y los cuatro comparten **una sola** consulta
  con `/cartera?tab=proyectos`. Una vista por widget sería otra clave que puede
  faltar en la caché, y el tablero se abre por la mañana con media barra de
  señal. Se moverá a vistas con `security_invoker` el día que una firma tenga
  miles de proyectos.
- **El indicador de conexión sólo aparece cuando tiene algo que decir**
  (`EstadoConexion` en la Navbar): sin conexión, con cola pendiente o con algo
  rechazado. En verde y vacío no se pinta — un indicador permanente deja de
  mirarse.
- **El plan manda sobre el orden.** `docs/02_PLAN_DE_FASES.md` decide qué se hace
  y cuándo. Si algo parece faltar, casi siempre está aplazado con motivo — búscalo
  ahí antes de "arreglarlo".

### Documentación de referencia

| Documento | Para qué |
|---|---|
| `docs/02_PLAN_DE_FASES.md` | **El plan.** Manda sobre el orden y el alcance de todo |
| `docs/03_ARQUITECTURA.md` | Stack, estructura, patrones. Las referencias §X.Y apuntan ahí |
| `docs/04_MODELO_DE_DATOS.md` | Tablas, vistas y RPC por fase |
| `docs/05_SISTEMA_DE_DISENO.md` | Tokens, paleta y reglas de UI |
| `docs/06_MODULOS_FUNCIONALES.md` | Cómo se usa cada módulo |
| `docs/07_ASISTENTE_Y_AUTOMATIZACION.md` | Módulos A, B y C |
| `docs/08_SEGURIDAD_Y_RLS.md` | Roles, políticas, secretos |
| `docs/09_TAREAS_DEL_DUENO.md` | Pasos manuales del dueño (Supabase, Vercel, Cloudflare) |
| `guias/*` | Montaje de la infraestructura |

**Regla de oro:** si un cambio afecta lo descrito en cualquiera de estos
documentos, **actualízalo en el mismo commit**. La documentación es parte del
producto.

---

## Reglas críticas — NO romper

Decisiones intencionales. Cambiarlas rompe algo más.

1. **`org_id` en toda tabla de dominio, y RLS de verdad.** Aquí conviven los datos
   de organizaciones que **no deben verse entre sí**: un hallazgo de la planta A
   no puede aparecerle al contacto de la planta B. A diferencia de JDM Built —
   donde el RLS operativo está de hecho abierto y el gateo real vive en el
   frontend— **en SummitApp el gateo vive en la base**. Toda política operativa
   filtra por `org_id IN (SELECT ...)` según la asignación del usuario. Una tabla
   nueva sin `org_id` y sin política es una fuga, no un pendiente. §8.2.

2. **Middleware:** el archivo es `src/proxy.ts` con función exportada `proxy`, NO
   `middleware.ts` (Next.js 16 lo deprecó). Su `matcher` **debe excluir**: los
   archivos de la PWA (`sw.js`, `manifest.json`, `worker-*`, `swe-worker-*`,
   `workbox-*`), `/monitoring` (túnel de Sentry), `api/cron` (llega sin sesión, se
   autentica con `CRON_SECRET`) y `portal` (portal público del cliente). Si no,
   sin sesión se redirigen a `/login`, el navegador recibe HTML donde espera JS y
   **el service worker no se registra** — o el portal directamente no existe. Al
   añadir un generado a `public/` **o una ruta pública nueva**, súmalo al matcher
   **en el mismo commit**. §7.1.

3. **Config:** `next.config.mjs` (no `.ts`), con fork `@ducanh2912/next-pwa`. Los
   scripts de build llevan `--webpack`. **NUNCA `npx @sentry/wizard`:** reescribe
   el archivo y se lleva el fork, el worker de push y la caché offline.

4. **Responsive con React state (`isMobile`)**, no clases CSS ni media queries. El
   layout monta el Sidebar (escritorio) o la `BottomNav` (móvil); no hay
   hamburguesa. Lo pegado al fondo suma `var(--fab-lift)`.
   **La app es un ARMAZÓN FIJO: el documento no scrollea.** El `div` raíz mide la
   ventana y recorta; el único elemento con scroll es el que marca
   `src/lib/utils/appScroll.ts`. Es lo único que impide que el navegador móvil
   recoja su barra de URL y mueva el header y la barra inferior (`dvh` NO arregla
   eso: corrige cuánto miden las cosas, no contra qué se anclan). Cuatro reglas
   que se rompen sin darte cuenta:
   - **(a) `window.scrollTo` NO hace nada** dentro del dashboard — usa
     `getAppScroller()` o `scrollIntoView`.
   - **(b) Ningún `vh` crudo: usa `var(--vh-full)`.** Con el armazón la barra del
     navegador ya nunca se pliega, así que `100vh` es *permanentemente* más alto
     que lo visible (por eso los modales van a `calc(var(--vh-full) * 0.9)`).
   - **(c) Un contenedor con scroll dentro de un flex necesita `minHeight: 0`**, o
     `overflow` no se activa nunca.
   - **(d) Para librar la barra inferior, `var(--bottom-nav-total)`** (incluye el
     área segura), nunca `--bottom-nav-height`.

   Y no pongas `minHeight` de ventana en las páginas de dominio: el `main` ya lo
   hace. §8.5.

5. **Env vars: nunca a Git** (`.env.local` está en `.gitignore`).
   `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `VAPID_PRIVATE_KEY`,
   `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_PAT` y `MS_CLIENT_SECRET` son
   **server-only** y jamás van al bundle. Sólo lo que empieza con
   `NEXT_PUBLIC_` llega al navegador. §8.3 y `guias/05_VARIABLES_DE_ENTORNO.md`.

6. **Vistas de Supabase con `security_invoker = true`.** Toda vista que cruce
   tablas de dominio la lleva. Al recrearla, mantén la propiedad o RLS se salta y
   la vista se convierte en la puerta trasera de la multi-tenencia.

7. **Cliente de Supabase, dos variantes:** `lib/supabase/client.ts` en
   `'use client'`; `lib/supabase/server.ts` en Server Components y API routes.
   Usar el incorrecto rompe cookies o hidratación.

8. **Bitácora inmutable:** `audit_logs` no tiene UPDATE ni DELETE en RLS. Los
   registros nunca se borran. En una firma de auditoría esto no es higiene: es el
   producto. Si la app que audita no puede demostrar quién cambió qué, no sirve.

9. **TypeScript: cero `any`.** Todos los tipos salen de `src/types/database.ts`.
   Si agregas una tabla, agrega su interface ahí **antes** de usarla.

10. **Estilos:** inline styles con variables CSS es el patrón del proyecto. **No
    mezclar Tailwind en componentes existentes.** Los nuevos de
    `src/components/ui/` pueden usarlo si respetan las variables. §5.

11. **Sin interruptores muertos.** Un campo de catálogo, un sub-evento o un flag
    que nadie pinta no se registra hasta que alguien lo consuma.

12. **El texto de una norma NO se copia al repositorio.** Las normas ISO son obra
    protegida y la firma las tiene bajo licencia. En la base viven **la estructura
    de cláusulas** (número, título, resumen redactado por Summit) y las
    referencias; el texto íntegro entra sólo como archivo del cliente en un bucket
    privado, con su licencia. Un `INSERT` sembrando párrafos de la ISO 9001 es un
    problema legal, no una comodidad. §8.6.

13. **Un hallazgo no se borra.** Se cierra, se reclasifica o se anula **con
    motivo y firma**, y la versión anterior queda. `hallazgos` es aditiva:
    `estado` + `hallazgos_historial`. Un `DELETE` sobre un hallazgo destruye la
    trazabilidad de la auditoría — que es exactamente lo que un auditor externo
    va a venir a revisar. §8.7.
    ⚠️ **Dónde está la línea, porque no es "nada se borra nunca":** lo que **no
    es evidencia de auditoría** sí se borra —un cliente capturado por error, un
    proyecto de prueba—, **sólo el socio** y **sólo mientras no cuelgue de ello**
    un hallazgo, una auditoría o un documento aprobado. La comprobación vive en
    la política de DELETE, no en la pantalla, y el borrado queda en `audit_logs`.
    Sin esa salida, la primera semana de uso real deja la cartera llena de datos
    de prueba que nadie puede quitar (F01·B6).
    **Dónde está hoy, tabla por tabla:** `puedo_borrar_org()` y
    `puedo_borrar_proyecto()` exigen socio **y sin documentos**;
    `puedo_borrar_documento()`, editor y **sin versión aprobada u obsoleta**.
    Borran sin candado extra `tareas_etapa`, `procesos` y `riesgos` —trabajo
    interno, no evidencia—; `documento_versiones` sólo si está en `borrador`; y
    `adjuntos`, **sólo el socio**. Ampliar es tocar una función, no cinco
    políticas.

---

## Reglas del offline — se rompen sin darte cuenta

Detalle en §8.9 a §8.12. **Aquí importan más que en JDM Built**: allá el mecánico
tenía WiFi malo; aquí el auditor está en un sótano de una planta industrial.

1. Cargar datos con `useQuery`, nunca `useEffect` + `useState`. Toda clave sale de
   `src/lib/query/keys.ts`.
2. **La caché es la fuente de verdad.** Nunca copies `data` a un `useState` del
   componente: la caché es lo único que se persiste, así que al remontar reaparece
   lo viejo aunque el cambio siga en la cola.
3. **Los desplegables de un formulario también son datos**: por `useQuery`. Si no,
   sin señal llegan vacíos y el guardado muere en la validación *antes* de
   encolarse. Aplica en especial al selector de cláusula de un hallazgo: sin él,
   no hay hallazgo.
4. Toda escritura pasa por `offlineWrite` (`src/lib/offline/mutate.ts`) con
   etiqueta en español legible, nunca un UUID.
5. `getSession()` (local), nunca `getUser()` (pega a la red y sin señal cuelga).
6. **El offline NO se puede probar en el teléfono contra `npm run dev`.** Dos
   cosas lo impiden a la vez, y ninguna avisa: `next.config.mjs` apaga el
   service worker en desarrollo (`disable: NODE_ENV === 'development'`), y
   además **un service worker sólo se registra en contexto seguro** — `https://`
   o `localhost`. Desde el teléfono se entra por `http://192.168.x.x:3000`, que
   no es ninguno de los dos, así que ahí **no hay service worker ni con el build
   de producción**.
   Síntoma: modo avión y la pantalla de error del navegador en cualquier
   navegación. No es un fallo de la capa offline; es que no existe.
   Dónde sí se prueba: en la laptop con `npm run build && npm run start` y
   `localhost`, o **en el teléfono contra la URL de Vercel**, que es HTTPS. Esa
   segunda es la única prueba que vale para el criterio de cierre, porque es la
   única que se hace con el dedo.
7. **Un filtro de lista no es una consulta.** El texto del buscador y el estado
   seleccionado **no entran en la clave de caché**: se descarga la lista completa
   una vez y se filtra **en memoria**. Con una consulta por búsqueda, en una
   planta sin señal la lista se vacía en cuanto se teclea la primera letra —esa
   clave no está en la caché— y el consultor concluye que la app perdió sus
   datos. Ver `queryKeys.cartera.organizaciones()`.
8. **Una auditoría se descarga entera antes de entrar a planta.** El plan, sus
   cláusulas, la lista de verificación y los hallazgos previos se precargan en la
   caché al abrir la auditoría con señal. Si esto no pasa, el auditor llega al
   piso con una pantalla vacía. §8.11.

**Excepciones conscientes, y son cuatro:**

1. **Los adjuntos**, sólo en su mitad binaria: la **fila** de `adjuntos` sí pasa
   por `offlineWrite` —y tiene que pasar, para conservar el orden—; lo que va por
   la cola propia es el archivo.
2. **Crear y revocar el link del portal**, que no tiene sentido sin red.
3. **La importación del catálogo de normas**: parte de un archivo que sólo existe
   en esa pantalla, escribe cientos de filas en lote y la hace un socio frente a
   su computadora.
4. **Subir el ARCHIVO de una versión de documento** [F02·B2]: pesa megabytes,
   sale de un `File` que sólo existe en esa pantalla, hay que convertirlo antes
   de guardarlo, y lo hace un consultor con el Word del cliente delante — nunca
   un auditor en un sótano. **Sólo esa mitad**: crear el documento, escribir una
   versión a mano, mandarla a revisión, aprobarla y vincular cláusulas pasan por
   la cola como todo lo demás.

En las cuatro, sin conexión la pantalla **lo dice y no deja empezar**.

---

## Trampas heredadas — ya costaron caro en JDM Built, no las repitas

Esta sección no es teoría. Cada punto es un bug que ya se pagó en el proyecto
hermano y que **este código puede volver a cometer idéntico**.

- **`crypto.randomUUID()` NO existe fuera de contexto seguro.** No es soporte del
  navegador: es una API restringida a HTTPS y `localhost`. Desde una IP de red
  local el objeto `crypto` está y el método no. Como el id local es lo primero que
  calcula un insert, se lleva por delante **toda escritura nueva de la app**. Usa
  siempre `uuid()` de `src/lib/utils/uuid.ts`, que cae a `crypto.getRandomValues`.
  Producción no lo ve nunca: Vercel es HTTPS. Desarrollo sí.

- **Un catálogo en código que se lee sin valor por defecto tumba la pantalla
  entera.** `TIPOS_HALLAZGO[finding.tipo]` devolviendo `undefined` y un `.color`
  después revienta el render — y como las tarjetas se pintan **en bucle, un solo
  hallazgo raro se lleva los cuarenta**. El auditor no ve "un hallazgo con un
  problema", ve la página de error y ninguno de sus hallazgos. Todo catálogo
  indexado por un valor que viene de la base **nunca devuelve `undefined`** y
  degrada enseñando el valor crudo. El tipo de TypeScript es una promesa sobre ese
  texto, no una garantía.

- **Un `catch` vacío convierte un bug en "error".** Si un guardado puede fallar,
  el motivo se pinta. Y **pintar «no se pudo guardar» a secas es un `catch` vacío
  con mejor letra**: quien lo lee no sabe si perdió el dato, si fue un permiso o
  si basta con reintentar. Si la cola guardó un `motivo`, el motivo va en
  pantalla.

- **`String(error)` sobre un error de Supabase devuelve `"[object Object]"`.**
  Ésta no viene de JDM Built: se pagó aquí, y es la peor de la lista. Cuando un
  `fetch` no sale del teléfono, postgrest-js **no lanza un `Error`**: devuelve un
  objeto plano `{ message: 'TypeError: Failed to fetch', details, hint, code: '' }`.
  Un `error instanceof Error ? error.message : String(error)` sobre eso da la
  cadena `"[object Object]"`, y cualquier cosa que mire el mensaje decide mal en
  silencio.
  Lo que rompió: `esFalloDeRed()` clasificaba un corte de red **como rechazo del
  servidor** al vaciar la cola. Un tropiezo de señal al reconectar —justo lo que
  pasa al salir de la planta— marcaba las operaciones como RECHAZADAS en vez de
  dejarlas esperando, y no se volvían a intentar solas. Con treinta hallazgos en
  la cola, eso son treinta en rojo diciendo «no se pudo guardar» cuando lo único
  que pasó fue que el semáforo cambió.
  Receta: **`mensajeDeError()` de `src/lib/supabase/errores.ts`, nunca
  `String(error)`**. Aplica también a los filtros de Sentry
  (`instrumentation-client.ts`), que sin ella dejan pasar exactamente el ruido de
  red que existen para cortar.

- **Un DELETE o UPDATE bloqueado por RLS no es un error.** Un INSERT rechazado
  devuelve 42501 y se ve; un DELETE/UPDATE sobre filas que la política no deja
  tocar **afecta a cero filas** y PostgREST responde 200 con lista vacía. Síntoma:
  *"lo cierro, desaparece, lo refresco y vuelve"*. Receta: pide `.select()` y trata
  `0 filas` como error. **Con el RLS cerrado de SummitApp esto va a pasar más
  seguido que en JDM** — trátalo como el caso normal, no como la excepción.

- **`fecha::text` NO es IMMUTABLE.** Una columna generada o un índice de expresión
  con una fecha a texto revienta con 42P17: el resultado depende del `DateStyle`
  de la sesión. Se resuelve con la resta de fechas (`fecha - DATE '2000-01-01'`).
  `numeric::text` y `uuid::text` sí son inmutables.

- **`npx tsc --noEmit` puede mentir.** `tsconfig.json` incluye los tipos generados
  de `.next`; si `routes.d.ts` quedó truncado por un `dev` interrumpido, su error
  de sintaxis **aborta el análisis semántico de todo el proyecto** y tsc calla los
  errores reales. `npm run build` no tiene el problema.

- **Una columna `date` no se formatea con `new Date()`.** Corre un día en México.
  Usa `formatDateOnly` / `toISODate` de `lib/utils/dates.ts`; `formatDate` es para
  `timestamptz`. Aplica a **todas** las fechas de vencimiento normativo, que es
  justo donde un día de diferencia cambia si algo está vencido o no.

- **Las altas de valores de enum van en su propia migración.** Postgres no deja
  usar un valor de enum en la transacción que lo crea. **Decisión de proyecto: los
  catálogos de dominio NO usan enum.** Van `text` + `CHECK`, para que la trampa no
  aplique nunca. Los `CHECK` son listas cerradas a propósito: abrir un valor nuevo
  obliga a pasar por una migración, y esa fricción es deliberada.

- **No corras `npm run build` con un `npm run dev` encendido sobre el mismo repo.**
  Los dos escriben en `.next` y el build le pisa al dev los chunks: a partir de ahí
  el navegador ejecuta código viejo mezclado con nuevo y salen errores **cuyo
  número de línea no corresponde al archivo**. Para salir: parar el dev,
  `rm -rf .next`, arrancarlo otra vez.

---

## Estructura

```
src/
  app/(auth)/          → login + mfa
  app/(dashboard)/     → todo lo protegido por sesión
    cartera/           → organizaciones + proyectos + contactos
    sistemas/          → documentos + requisitos + procesos + riesgos + indicadores
    auditorias/        → programa + auditorías + hallazgos
    cumplimiento/      → matriz NOM + vencimientos + dictámenes
    capacitacion/      → cursos + programa + sesiones + constancias
    acciones/          → planes de acción y su seguimiento
    admin/             → metas + finanzas + facturación + usuarios + bitácora + config
    auditorias/[id]/ acciones/[id]/ cartera/[id]/   (sólo detalle)
    asistente/         → oficina del asistente (URL `/asistente`, ver abajo)
  app/portal/[token]   → portal público del cliente, sin sesión
  app/api/             → users, push/*, cron/*, fiscal/*, asistente/*, graph/*
  components/          → por dominio; ui/ es la biblioteca común
  lib/queries/         → todas las consultas Supabase
  lib/supabase/        → client.ts (browser) + server.ts
  lib/offline/         → cola, caché, adjuntos, dictados y sincronía
  lib/normas/          → importador del catálogo de normas
  lib/documentos/      → zip · docx · pdf · markdown · convertir  [F02·B2]
  lib/sistemas/        → catálogos de la Fase 02
  lib/asistente/       → proveedor, esquemas Zod, instrucciones, herramientas
  lib/plantillas/      → informes y documentos imprimibles
  lib/utils/           → helpers puros
  types/database.ts    → todos los tipos
worker/index.js        → oyentes push del service worker
supabase/migrations/   → esquema versionado, aditivo
docs/ guias/           → la documentación de arriba
```

**Los siete dominios son páginas con pestañas, no carpetas por entidad.** Se
navega con query string (`/auditorias?tab=hallazgos`) desde el Sidebar y la
BottomNav. Agregar una sección = una pestaña más en su dominio, **no** una carpeta
nueva. Las únicas rutas propias son las de detalle, el portal y la oficina del
asistente.

⚠️ **`/asistente` es una excepción consciente**: cruza los siete dominios, así que
no pertenece a ninguno. Se entra desde el 🤖 del header, junto al buscador global.
**La `BottomNav` tiene cinco destinos y no hay un sexto** — en móvil los dominios
que no caben viven en el buscador y en el menú del header.

⚠️ **Vive en `src/app/(dashboard)/asistente/`, no en `src/app/asistente/`.** La URL
es la misma —el grupo de ruta no aparece—, pero dentro del grupo hereda el guard
de sesión de `proxy.ts` y el armazón fijo. Fuera saldría sin cabecera, sin sidebar
y sin barra inferior.

---

## Módulos apagados de fábrica

Igual que en JDM Built, hay módulos que existen en el código y **no se encienden**
hasta que el dueño lo pide, en `MODULOS_APAGADOS_POR_DEFECTO`:

`facturacion` · `asistente` · `automatizacion` (MS Graph) · `comercializadora`

Un módulo apagado no pinta pestaña, no registra ruta en la navegación y sus
consultas no se disparan. Encenderlo es una casilla en `/admin?tab=config`, no un
deploy.

---

## Cómo trabajar

**Antes:** (1) lee la sección relevante de `docs/03_ARQUITECTURA.md`; (2)
`git pull origin main`; (3) si tocas Supabase, valida contra
`src/types/database.ts` y el esquema; (4) si dudas del patrón visual, mira 2-3
componentes similares del mismo módulo antes de crear uno nuevo; (5) si el cambio
afecta comportamiento documentado, actualiza el documento en el mismo commit.

**Después:** (1) `npm run lint`; (2) `npm run build` (usa `--webpack`, no lo
cambies); (3) deja el árbol de trabajo listo y **avisa de qué cambió**.

⚠️ **EL COMMIT Y EL PUSH LOS HACE EL DUEÑO. SIEMPRE. Un agente no los ejecuta.**

No es una preferencia de estilo. Cada `push` a `main` **despliega a producción**
en Vercel sin que nadie más lo revise, y este repositorio contiene el sistema con
el que una firma de auditoría lleva los expedientes de sus clientes. Quien firma
lo que sale a producción tiene que ser una persona, y tiene que haberlo mirado.

Qué hacer en su lugar: dejar los archivos escritos, `lint` y `build` en verde, y
**decir en un párrafo qué se cambió y qué falta por verificar**. Si un cambio
necesita ir acompañado de otra cosa —una migración por aplicar, una variable de
entorno, un paso en un panel—, se dice ahí mismo, porque el dueño va a decidir el
orden.

Vale igual para todo lo que empuja hacia fuera: `git push`, `supabase db push`,
aplicar una migración a la base remota, `vercel deploy`. Se preparan y se
explican; los dispara él.

**Idioma:** el producto, la interfaz, los nombres de columna, los comentarios y
los commits van **en español**. Es el idioma de la firma y de sus clientes. Sin
`snake_case` en inglés a medias: `fecha_compromiso`, no `commitment_date`.
Excepción: los nombres que vienen del framework o del proveedor
(`created_at`, `user_id`, `auth.uid()`).
