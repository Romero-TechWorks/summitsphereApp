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

El MFA se **impone en `src/proxy.ts`**, no en la interfaz: sin `aal2` en el JWT,
un `socio` no llega a ninguna ruta que no sea `/mfa`.

---

## §2 · El eje de la multi-tenencia

```sql
-- Qué organizaciones puede ver quien pregunta.
-- SECURITY DEFINER para poder leer usuarios_organizaciones sin recursión de RLS.
CREATE OR REPLACE FUNCTION mis_organizaciones()
RETURNS setof uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM usuarios_organizaciones WHERE usuario_id = auth.uid()
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

### La plantilla de política

**Toda** tabla de dominio lleva estas cuatro. Sin excepciones:

```sql
ALTER TABLE hallazgos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hallazgos_select" ON hallazgos FOR SELECT TO authenticated
  USING (org_id IN (SELECT mis_organizaciones()) OR es_socio());

CREATE POLICY "hallazgos_insert" ON hallazgos FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT mis_organizaciones()) OR es_socio());

CREATE POLICY "hallazgos_update" ON hallazgos FOR UPDATE TO authenticated
  USING      (org_id IN (SELECT mis_organizaciones()) OR es_socio())
  WITH CHECK (org_id IN (SELECT mis_organizaciones()) OR es_socio());

-- DELETE: deliberadamente ausente. Un hallazgo se anula, no se borra.
```

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

Cinco buckets, **todos privados**:

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
-- documentos/{org_id}/{documento_id}/{archivo}
CREATE POLICY "documentos_leer" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[1] IN (SELECT mis_organizaciones()::text)
);
```

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
