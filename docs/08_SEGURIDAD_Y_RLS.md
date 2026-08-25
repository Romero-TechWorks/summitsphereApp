# 08 · Seguridad y RLS

**La decisión que gobierna este documento:** SummitApp es **una instancia para
toda la cartera**. Los datos de organizaciones que compiten entre sí conviven en
la misma base. El aislamiento se garantiza **en PostgreSQL**, no en el frontend.

Esta es la diferencia grande con JDM Built, donde cada taller tiene su clon, su
propio Supabase, y el RLS operativo está de hecho abierto porque no hay nadie más
adentro. **Aquí eso sería una fuga.**

---

## §1 · Roles

| Rol | Ve | MFA |
|---|---|---|
| `socio` | **Toda la cartera.** Finanzas, facturación, configuración, instrucciones del asistente | **Obligatorio** |
| `consultor` | **Sólo sus organizaciones asignadas**, completas | Recomendado |
| `auditor` | Sus organizaciones asignadas. Audita y levanta hallazgos; **no edita documentos del cliente** | Recomendado |
| `administracion` | Datos comerciales y fiscales de toda la cartera. **No entra a expedientes técnicos** | **Obligatorio** |
| `cliente` | Sólo su organización, sólo lectura. Rol reservado; hoy el cliente entra por el portal | Opcional |

⚠️ **`administracion` y los expedientes técnicos.** Que la persona de facturación
no vea los hallazgos de un cliente no es desconfianza: es reducir la superficie.
Un hallazgo filtrado de una planta es un problema para el cliente y para la firma.

⚠️ **PENDIENTE DE DECIDIR, y se nota en cuanto exista la primera cuenta de
administración.** Esta tabla dice que `administracion` ve *los datos comerciales
de toda la cartera*, pero **las políticas no lo contemplan**: filtran por
`mis_organizaciones()` o `es_socio()`, así que una cuenta de administración sin
asignaciones no ve **nada** — y su widget «contratos por renovar» sale vacío sin
explicar por qué. Dos salidas, y hay que elegir una antes de la Fase 06
(facturación):

1. **Una función `es_administracion()`** en la rama de SELECT de las tablas
   comerciales (`organizaciones`, `proyectos`) y en ninguna otra. Cumple lo que
   dice la tabla y deja fuera los expedientes técnicos.
2. **Asignar a esa cuenta las organizaciones que le tocan**, como a cualquiera.
   Más simple y más estricto; a cambio, alguien tiene que mantener la lista.

Hasta que se decida, una cuenta de administración se comporta como un consultor
sin clientes asignados.

El MFA se **impone en `src/proxy.ts`**, no en la interfaz: sin `aal2` en el JWT,
un `socio` no llega a ninguna ruta que no sea `/mfa`.

---

## §2 · El eje de la multi-tenencia

```sql
-- Qué organizaciones puede ver quien pregunta.
-- SECURITY DEFINER para poder leer usuarios_organizaciones sin recursión de RLS.
--
-- ⚠️ Desde A10 devuelve TODO lo que puedo ver, ya filtrado por partición y con
-- la cartera completa si soy socio. Ver «§2.1 · La partición de pruebas».
CREATE OR REPLACE FUNCTION mis_organizaciones()
RETURNS setof uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
    FROM organizaciones o
   WHERE o.es_demo = soy_dev()
     AND ( es_socio()
        OR EXISTS (SELECT 1 FROM usuarios_organizaciones uo
                    WHERE uo.usuario_id = auth.uid() AND uo.org_id = o.id) )
$$;

CREATE OR REPLACE FUNCTION es_socio()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'socio' AND activo
  )
$$;
```

⚠️ **`SET search_path = public` no es adorno.** Una función `SECURITY DEFINER` sin
`search_path` fijo puede ser secuestrada por un esquema en el path del que la
llama. Es la vulnerabilidad clásica de Postgres y Supabase la marca en su linter.

⚠️ **`STABLE`, no `VOLATILE`.** Sin eso, la función se evalúa una vez por fila y
una lista de 500 hallazgos hace 500 consultas a `usuarios_organizaciones`.

### La tercera función: quién ESCRIBE  [Fase 01]

`mis_organizaciones()` contesta *"¿la ve?"*. Para *"¿la toca?"* hay una más, y es
la que le da consecuencias a la columna `papel` de `usuarios_organizaciones`:

```sql
CREATE OR REPLACE FUNCTION puedo_editar_org(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM organizaciones o
                  WHERE o.id = p_org AND o.es_demo = soy_dev())
     AND ( es_socio() OR EXISTS (
       SELECT 1 FROM usuarios_organizaciones
        WHERE usuario_id = auth.uid() AND org_id = p_org AND papel <> 'lectura'
     ) )
$$;
```

⚠️ La comprobación de partición se hace contra la fila de la organización **por su
clave primaria**, no con `p_org IN (SELECT mis_organizaciones())`: esta función se
evalúa una vez por fila en los `WITH CHECK`, y ahí una búsqueda por PK cuesta lo
que un `EXISTS` y un recorrido de la cartera entera no.

⚠️ **`lectura` es un papel de verdad, no una etiqueta.** Quien lo tenga ve el
expediente completo y no puede modificar nada — ni un contacto, ni el nombre del
cliente. Es el papel del consultor que entra a consultar un expediente que no
lleva, y del socio de una firma aliada que revisa sin tocar.

## §2.1 · La partición de pruebas  [`A10`, 25 ago 2026]

Encima de la multi-tenencia hay un segundo corte, y es **perpendicular** al
primero: la multi-tenencia separa a un cliente de otro dentro de la firma; la
partición separa **la firma entera de su banco de pruebas**.

El problema que resuelve: la instancia traía la cartera de demostración con la que
se le enseñó el flujo al cliente, y el cliente empezó a capturar lo real encima.
Borrar la demostración pierde el único juego de datos completo que existe para
probar; dejarla revuelta mete clientes inventados en el tablero de una firma que
audita de verdad.

**Toda la partición es una igualdad:**

```sql
organizaciones.es_demo = soy_dev()
```

```sql
CREATE OR REPLACE FUNCTION soy_dev()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND es_dev AND activo
  )
$$;
```

⚠️ **`dev` no es un rol, es una marca encima del rol.** Con un sexto valor en el
CHECK de `usuarios.rol`, `es_socio()` sería falso para la cuenta de pruebas y ésa
no podría dar de alta un cliente, importar el catálogo, borrar ni repartir equipo
— justo lo que hay que poder probar. Así la cuenta de pruebas es un socio
**completo dentro de su partición**, y además puede probar cómo se ve la app
siendo consultor o auditor.

### Dónde vive el corte, tabla por tabla

| Qué | Cómo se parte |
|---|---|
| Las ~32 tablas con `org_id` | Solas, por `mis_organizaciones()`. **Ni una política de dominio menciona `es_demo`** |
| `organizaciones` | `es_demo`, sellada por `sellar_particion()` |
| `normas` · `norma_clausulas` | `es_demo` propia; la cláusula la hereda de su norma. `UNIQUE (clave, es_demo)` |
| Storage (`documentos`, `evidencias`) | Por la `org_id` del primer segmento de la ruta, que ya pasa por `mis_organizaciones()` |
| `audit_logs` | Por `org_id`. Lo que no cuelga de ninguna organización, sólo el socio real |
| `config_firma.plantillas` | **Fuera de la base**: espacio de nombres en el jsonb (`src/lib/auth/particion.ts`). Es una tabla de una fila; no hay RLS que parta columnas |
| `usuarios` · el resto de `config_firma` | **No se parte.** La plantilla de la firma es una sola, y los módulos encendidos son de la firma |

### Lo que cambió en las políticas, y por qué no es una relajación

Hasta `A10`, toda política de dominio era:

```sql
USING (org_id IN (SELECT mis_organizaciones()) OR es_socio())
```

Esa segunda rama es **una puerta lateral que se salta cualquier filtro que se
ponga en la primera**: un socio de pruebas la cruzaría y vería los clientes
reales. La rama se mudó **dentro** de `mis_organizaciones()`, donde sí está
filtrada, y las 32 políticas quedaron en:

```sql
USING (org_id IN (SELECT mis_organizaciones()))
```

Para un socio que no sea dev el resultado es **idéntico** al de antes: antes veía
todas las organizaciones por la rama lateral, ahora las ve porque la función se
las devuelve. Para todos los demás tampoco cambia nada: sus organizaciones
asignadas están todas de su lado.

⚠️ **De paso se cerró un agujero que ya existía en Storage.** `documentos_borrar`
y `evidencias_borrar` decían `bucket_id = '…' AND es_socio()`, sin mirar la ruta:
un socio podía borrar cualquier objeto del bucket, **incluidos los que
`org_de_la_ruta()` no sabe leer y que por tanto nadie puede ver**. Poder borrar lo
que no se puede ver no es un permiso, es un accidente esperando.

### Los candados de la partición

1. **La partición la sella la base, no el navegador.** `sellar_particion()` pone
   `es_demo := soy_dev()` en el INSERT e impide cambiarla en el UPDATE. Es la
   misma decisión que `heredar_org_del_proyecto()`.
2. **Una cuenta de pruebas no puede quitarse su propia marca**, ni ponérsela a
   nadie: `proteger_rol_usuario()`. Sí puede administrar **otras cuentas de
   pruebas** —hace falta para probar los roles—, nunca una real. Sin esto la
   partición sería una cortesía y no un candado.
3. **La salida del dueño existe y es una sola:** una conexión directa —psql, el
   editor SQL del panel— sí puede mover una fila de lado. Tiene que poder: es
   como se marcó la cartera de demostración al aplicar `A10`.

⚠️ **`service_role` se salta la partición entera**, igual que se salta el
aislamiento entre clientes. El cron y las rutas de API con la llave de servicio
ven las dos mitades. Es el mismo reparto de siempre y no cambia con esto.

⚠️ **El consecutivo de folios también se partió.** `asignar_folio_auditoria()` es
SECURITY DEFINER y cuenta fuera del RLS; sin partirlo, una auditoría de prueba se
llevaba el `AUD-2026-007` y el cliente pasaba del 006 al 008 sin explicación. La
partición de pruebas usa el prefijo `DEMO-`, que además se lee de un vistazo en
una captura de pantalla.

---

### La plantilla de política

**Toda** tabla de dominio lleva estas cuatro. Sin excepciones:

```sql
ALTER TABLE hallazgos ENABLE ROW LEVEL SECURITY;

-- ⚠️ SIN `OR es_socio()`. Esa rama vive dentro de mis_organizaciones() desde
-- A10; escribirla aquí abre una puerta lateral que se salta la partición.
CREATE POLICY "hallazgos_select" ON hallazgos FOR SELECT TO authenticated
  USING (org_id IN (SELECT mis_organizaciones()));

CREATE POLICY "hallazgos_insert" ON hallazgos FOR INSERT TO authenticated
  WITH CHECK (puedo_editar_org(org_id));

CREATE POLICY "hallazgos_update" ON hallazgos FOR UPDATE TO authenticated
  USING      (puedo_editar_org(org_id))
  WITH CHECK (puedo_editar_org(org_id));

-- DELETE: deliberadamente ausente. Un hallazgo se anula, no se borra.
```

### Dónde SÍ hay DELETE, y con qué candado  [Fases 01, 02 y 03]

La regla 13 no es «nada se borra nunca»: es «no se borra la evidencia de
auditoría». La línea vive **en una función por tabla**, para que ampliarla sea
tocar un sitio:

| Función | Qué exige | Ampliada en |
|---|---|---|
| `puedo_borrar_org()` | socio **y** sin `documentos`, `auditorias` ni `hallazgos` | F03 — completa |
| `puedo_borrar_proyecto()` | socio **y** sin `documentos` ni `auditorias` | F03 — completa |
| `puedo_borrar_documento()` | editor **y** sin ninguna versión `aprobado` u `obsoleto` | — |

Y las tablas con DELETE abierto al editor porque **no son evidencia**:
`tareas_etapa` (trabajo interno de método), `procesos` (el mapa cambia con los
años), `riesgos` (un taller de análisis produce filas mal capturadas) y el
**alcance, el equipo y la agenda** de una auditoría, que son planeación y se
reordenan hasta el día antes. En cambio, `adjuntos` sólo lo borra un **socio**, y
`documento_versiones` sólo si está en `borrador`.

`auditoria_items` lleva su condición **en la propia política**, sin función: el
auditor «añade, quita y reordena antes de entrar», pero un ítem que ya produjo un
hallazgo es la cita de ese hallazgo y se queda.

### Lo que no se borra NUNCA, y por qué no bastaba con no poner la política  [F03]

`hallazgos`, `auditorias` y `hallazgos_historial` **no tienen política de
DELETE**. Eso detiene a `authenticated`… y a nadie más.

⚠️ **`service_role` se salta el RLS.** Ausencia de política no es ausencia de
permiso: cualquier API route con la llave de servicio podría borrar un hallazgo.
Es el mismo problema que ya tenía `audit_logs`, y se cierra con los mismos **dos**
candados, al final de la migración de la fase:

1. **Revocar el permiso.** `revoke delete on hallazgos, auditorias` y
   `revoke insert, update, delete on hallazgos_historial` a `anon`,
   `authenticated` **y `service_role`**. El grant es la puerta; sin puerta no hay
   intento.
2. **Un trigger que grita.** `impedir_borrado_de_evidencia()` sobre `hallazgos` y
   `auditorias`, e `impedir_cambios_historial()` sobre el historial. Porque el
   candado 1 lo deshace sin querer el próximo `grant all on all tables in schema
   public` —que es justo lo que hace `20260821041500_permisos_de_esquema.sql`— y
   entonces el borrado volvería a ser posible sin que nadie lo note. El trigger
   corre para todos y no depende de ningún grant.

⚠️ Revocar el INSERT del historial **no rompe nada**: lo escribe
`registrar_historial_hallazgo()`, que es `SECURITY DEFINER` y corre como dueño de
la tabla. Está comprobado (prueba 42 de `D00`).

Lo que sí se puede hacer con un hallazgo: **anularlo con motivo** —el CHECK exige
que `motivo_anulacion` no venga vacío— o **reclasificarlo**, y las dos cosas dejan
su renglón en `hallazgos_historial`.

⚠️ **Leer y escribir usan funciones distintas a propósito.** El `SELECT` va por
`mis_organizaciones()` —el papel no cambia lo que se ve— y el `INSERT`/`UPDATE`
por `puedo_editar_org()`, que además excluye a `lectura`. Escribir las cuatro con
la misma condición era lo que decía este documento hasta la Fase 01, y dejaba el
papel sin efecto.

⚠️ **Lo que cuelga de otra fila no manda su `org_id`: lo hereda.** Lo reciben de
un trigger `BEFORE`, porque `WITH CHECK` sólo comprueba que la organización sea
**una de las tuyas**, no que sea **la de la fila padre**: con dos clientes
asignados, el alcance de uno podría acabar colgado del expediente del otro sin
violar ninguna política. Hay cuatro de estos triggers:

| Función | La ponen en |
|---|---|
| `heredar_org_del_proyecto()` | alcance, bitácora, `tareas_etapa`, `requisitos` |
| `heredar_org_del_documento()` | `documento_versiones`, `documento_clausulas` |
| `heredar_org_del_indicador()` | `mediciones` |
| `heredar_org_del_adjunto()` | `adjuntos`, **a partir del campo dominante** — y su `coalesce` lleva el mismo orden que `CAMPOS_DOMINANTES` en el cliente. Desde F03 la rama de `hallazgo_id` va entre la de la tarea y la del documento |
| `heredar_org_de_la_auditoria()` | alcance, equipo, agenda, `auditoria_items` y `hallazgos`  [F03] |
| `heredar_org_del_hallazgo()` | `hallazgos_historial`  [F03] |

Y cuatro guardas del mismo tipo, que comprueban que una fila referenciada sea
**del mismo cliente**: `validar_sitio_del_proyecto()`,
`validar_contacto_de_la_org()` (el dueño de un proceso), y desde la Fase 03
`validar_referencia_de_la_org()` —el sitio, el proceso o el contacto que toca una
fila de auditoría— y `validar_contexto_de_la_auditoria()` —su proyecto y su
programa—. Ninguna la puede hacer una clave foránea ni un CHECK, porque tienen que
mirar otra tabla.

⚠️ **El orden de los triggers `BEFORE` importa y Postgres los dispara en orden
alfabético de nombre.** `auditoria_sitios_org` corre antes que
`auditoria_sitios_valida`, que es lo que hace falta: primero se hereda la `org_id`
y después se valida contra ella. Renombrar uno rompería la guarda **en silencio**,
así que la dependencia va escrita en la migración.

⚠️ **`USING` y `WITH CHECK` en el UPDATE, las dos.** `USING` decide qué filas
puedes tocar; `WITH CHECK` decide en qué se pueden convertir. Sólo con `USING`,
un consultor puede tomar un hallazgo suyo y **cambiarle el `org_id`** a otra
organización. La fila se le escapa de las manos y aterriza en el expediente
equivocado.

⚠️ **`TO authenticated`, siempre.** Una política sin rol explícito aplica también
a `anon`. Ver §5.

---

## §3 · Las trampas de RLS que ya costaron caro

- **Un DELETE o UPDATE bloqueado por RLS no es un error.** Un INSERT rechazado
  devuelve `42501` y se ve. Un UPDATE sobre filas que la política no deja tocar
  **afecta a cero filas** y PostgREST responde **200 con lista vacía**. Síntoma:
  *"lo cierro, desaparece, lo refresco y vuelve"*. **Receta: pide `.select()` y
  trata `0 filas` como error.** Con el RLS cerrado de este proyecto esto pasa
  seguido — es el caso normal, no la excepción.

- **Las vistas llevan `security_invoker = true`.** Sin eso, una vista corre con
  los permisos de quien la creó (normalmente el dueño de la base) y **se salta el
  RLS de las tablas que consulta**. Una vista de tablero sin esa propiedad le
  enseña la cartera entera a cualquiera con sesión. Al recrear una vista, se
  mantiene la propiedad.

  ```sql
  CREATE OR REPLACE VIEW hallazgos_abiertos
  WITH (security_invoker = true) AS
  SELECT ...
  ```

- **Recursión de políticas.** Si la política de `usuarios_organizaciones`
  consultara `usuarios_organizaciones`, Postgres entra en bucle y devuelve
  `infinite recursion detected in policy`. Por eso `mis_organizaciones()` es
  `SECURITY DEFINER`: se sale del RLS a propósito, una sola vez y en un lugar
  auditado.

- **El `service_role` salta todo.** Es correcto y es el punto: por eso vive
  **sólo** en API routes del servidor y **jamás** en un componente `'use client'`.
  Una `SUPABASE_SERVICE_ROLE_KEY` en el bundle es la base entera abierta a
  cualquiera que abra las herramientas de desarrollo.

---

## §4 · Storage

Cinco buckets, **todos privados**. Los dos primeros existen desde F02·B2b
(`20260822120100_storage_documentos_y_evidencias.sql`); los otros tres llegan con
su fase:

| Bucket | Guarda | Nota |
|---|---|---|
| `documentos` | Documentos del SGC de los clientes | Lectura por URL firmada |
| `evidencias` | Fotos y archivos de auditoría y de acciones | ⚠️ **Lo ya subido no se ve sin señal**; tomarlo sí |
| `biblioteca` | PDFs normativos por organización | ⚠️ Normas bajo licencia |
| `constancias` | DC-3 emitidas | |
| `fiscal` | CSD: `.cer` y `.key` | ⚠️ **Sin política de SELECT para nadie.** Se sube y no se vuelve a bajar |

Las políticas de Storage filtran por el **primer segmento de la ruta**, que es la
organización:

```sql
-- documentos/{org_id}/{documento_id}/{version_id}.{ext}
-- evidencias/{org_id}/{aaaa}/{adjunto_id}.{ext}
CREATE POLICY "documentos_leer" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos'
  AND (public.org_de_la_ruta(name) IN (SELECT public.mis_organizaciones())
       OR public.es_socio())
);
```

⚠️ **`public.org_de_la_ruta(text)`, no `storage.foldername(name)[1]::uuid`**, y
por dos motivos: (1) un primer segmento que no sea un UUID daría un 22P02
—*«invalid input syntax for type uuid»*— **dentro de una política**, que es un
error incomprensible donde lo correcto es un simple «no»; la función devuelve
`null` y ya. (2) `storage.foldername` está declarada VOLATILE en el esquema de
Supabase, y una función volátil dentro de una política se reevalúa por fila;
`split_part(ruta, '/', 1)` es inmutable de verdad.

⚠️ **Quién sube pasa por `puedo_editar_org()`**, igual que en las tablas: el
papel `lectura` no escribe tampoco en Storage.

⚠️ **`evidencias` NO tiene política de UPDATE, y es deliberado.** Una evidencia
no se reemplaza: si la foto salió movida, se sube otra. Que un objeto de
evidencia cambie de contenido conservando su ruta es exactamente lo que un
auditor externo no puede permitir — la fila de `adjuntos` diría una cosa y el
archivo sería otra.

⚠️ **Borrar del bucket es sólo del socio**, en los dos. Y borrar la fila de
`adjuntos` **no borra el objeto**: mientras no haya cron de limpieza, un archivo
huérfano cuesta unos centavos y una evidencia borrada por accidente no se
recupera.

⚠️ **Las políticas van en migración APARTE del esquema del dominio.**
`create policy on storage.objects` toca un esquema que no es nuestro y puede
fallar por permisos según cómo esté el proyecto; dentro de la migración grande se
llevaría por delante todo el esquema de la fase.

⚠️ El `insert into storage.buckets … on conflict (id) do update set public = false`
de esa migración es a propósito: **vuelve a poner el bucket en privado** aunque
alguien lo haya creado a mano marcando la casilla equivocada.

⚠️ **Un bucket público no tiene arreglo posterior.** Cualquiera con la URL entra,
para siempre, aunque después se cierre — la URL ya circuló. Y aquí las URLs son
evidencia de auditoría de plantas industriales.

---

## §5 · El portal del cliente

`/portal/[token]` es **público**: sin cuenta, sin sesión, se abre desde un link de
WhatsApp. Es la superficie más expuesta de toda la aplicación.

**El diseño de seguridad, en una frase: `anon` no tiene ninguna política operativa
en toda la base.** Cero. El portal no consulta tablas.

Todo entra por **una sola función**:

```sql
CREATE OR REPLACE FUNCTION portal_organizacion(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid; v_out jsonb;
BEGIN
  SELECT org_id INTO v_org FROM portal_tokens
   WHERE token = p_token
     AND revocado_en IS NULL
     AND (expira_en IS NULL OR expira_en > now());

  IF v_org IS NULL THEN RETURN NULL; END IF;

  -- LISTA BLANCA, armada a mano. Ni un SELECT *.
  SELECT jsonb_build_object(
    'organizacion', (SELECT jsonb_build_object('nombre', nombre_comercial)
                       FROM organizaciones WHERE id = v_org),
    'avance',       (SELECT ... ),
    'hallazgos',    (SELECT ... ),   -- folio, tipo, descripción, compromiso
    'vencimientos', (SELECT ... )
  ) INTO v_out;

  RETURN v_out;
END $$;

REVOKE ALL ON FUNCTION portal_organizacion(text) FROM public;
GRANT EXECUTE ON FUNCTION portal_organizacion(text) TO anon;
```

Las reglas:

1. **Lista blanca, no filtro.** Cada campo que sale se escribe a mano. Un
   `SELECT *` aquí publica mañana la columna que alguien agregue hoy.
2. **Nada de finanzas, nada de notas internas, nada de otras organizaciones.**
3. **El token se revoca y se regenera** desde la app. Un contacto que se va de la
   empresa cliente deja de tener acceso ese día.
4. **Registra cada acceso** (`ultimo_acceso_en`) — un token que nadie usa en seis
   meses es un token que sobra.
5. **La subida de evidencia desde el portal** pasa por una API route con
   `service_role`, valida el token del lado del servidor, limita tipo y tamaño, y
   marca el adjunto con `subido_desde = 'portal'`. Nunca se sube directo desde el
   navegador del cliente.

⚠️ El token va en la URL, y una URL se reenvía por WhatsApp. **No es una
contraseña.** Por eso lo que hay detrás es exactamente lo que el cliente puede ver
de su propio sistema, y nada más. Se dimensiona asumiendo que va a acabar en un
grupo de WhatsApp con veinte personas.

---

## §6 · Secretos

| Secreto | Vive en | Nunca |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (server) | En el bundle, en Git, en un `NEXT_PUBLIC_*` |
| `CRON_SECRET` | Vercel (server) | En el cliente |
| `VAPID_PRIVATE_KEY` | Vercel (server) | En el cliente |
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | Vercel (server) | En el cliente. **Ninguna llamada a un LLM sale del navegador** |
| `GITHUB_PAT` | Vercel (server) | En Git |
| `MS_CLIENT_SECRET` | Vercel (server) | En Git |
| Contraseña de la base | Gestor de contraseñas del dueño | En ningún archivo |
| CSD (`.cer`, `.key`) | Bucket `fiscal`, sin SELECT | En el repositorio |

⚠️ **`config_firma` la lee cualquiera con sesión: ninguna contraseña va ahí.** Las
credenciales del PAC viven en `fiscal_credenciales`, con **RLS activada y cero
políticas a propósito**, y sólo las toca `/api/fiscal/credenciales` con
`service_role`.

Detalle operativo en
[`../guias/05_VARIABLES_DE_ENTORNO.md`](../guias/05_VARIABLES_DE_ENTORNO.md).

---

## §7 · Datos personales

La app guarda **datos personales de terceros**: nombre, puesto y **CURP** de los
trabajadores capacitados (el DC-3 la exige), exámenes médicos, y evidencia
fotográfica donde aparecen personas.

Eso cae bajo la **LFPDPPP**. Lo mínimo, y no es opcional:

- **Aviso de privacidad** de Summit-Sphere, y la cláusula correspondiente en el
  contrato con cada cliente — la firma es *encargada* del tratamiento; el cliente
  es el *responsable*.
- **Minimizar**: la CURP se guarda porque el formato oficial la pide, no "por si
  acaso". Nada de datos sensibles que no exija un entregable.
- **Fotos**: la evidencia de auditoría capta personas trabajando. Buckets
  privados, URL firmada de vida corta, y nunca en el portal salvo que el cliente
  lo pida.
- **Borrado**: cerrar un cliente incluye un procedimiento de entrega y purga de
  sus datos personales. ⚠️ Choca con la regla de "nada se borra" — se resuelve
  **anonimizando** (el registro de la sesión de capacitación se queda; el nombre y
  la CURP se sustituyen), no borrando la fila.

---

## §8 · Respaldos

Un respaldo que nadie ha restaurado nunca no es un respaldo.

- **Diario, cifrado, fuera de Supabase**: GitHub Actions corre `pg_dump`, lo cifra
  con GPG y lo sube a **Cloudflare R2**, con rotación. Ver
  [`../guias/01_GITHUB.md`](../guias/01_GITHUB.md) y
  [`../guias/04_CLOUDFLARE.md`](../guias/04_CLOUDFLARE.md).
- **Prueba de restauración mensual**, automatizada: se levanta un Postgres
  efímero, se restaura el respaldo más reciente y se cuentan las filas. Si falla,
  avisa.
- ⚠️ **La cadena de conexión es la del *Session Pooler* (puerto 5432).** La
  conexión directa `db.<ref>.supabase.co` es IPv6-only y los runners de GitHub son
  IPv4-only; el *Transaction Pooler* (6543) no soporta prepared statements y
  `pg_dump` los necesita. Es media hora de depuración que no hace falta repetir.
- ⚠️ **La passphrase de GPG se guarda aparte del bucket.** Un respaldo cifrado
  cuya llave está junto al respaldo es un archivo grande.

---

## §9 · Lista de verificación antes de cada despliegue

Se recorre entera. Toma dos minutos.

- [ ] ¿Alguna tabla nueva sin `org_id`?
- [ ] ¿Alguna tabla nueva sin RLS activo y sin sus políticas?
- [ ] ¿Algún `UPDATE` con `USING` y sin `WITH CHECK`?
- [ ] ¿Alguna vista nueva sin `security_invoker = true`?
- [ ] ¿Alguna función `SECURITY DEFINER` sin `SET search_path`?
- [ ] ¿Algún bucket nuevo que quedó público?
- [ ] ¿Algún secreto que se coló a un `NEXT_PUBLIC_*`?
- [ ] ¿Alguna ruta pública nueva que falte en el matcher de `proxy.ts`?
- [ ] ¿El linter de seguridad de Supabase está limpio? (Advisors → Security)
- [ ] **La prueba de aislamiento**: entrar con un consultor que no tenga asignada
      la organización X y confirmar que **no la ve por ninguna pantalla, ni por el
      buscador global, ni por el asistente**.

⚠️ La última no se salta nunca. Es la que atrapa el error que importa.
