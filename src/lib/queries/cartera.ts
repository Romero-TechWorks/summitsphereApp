/**
 * Consultas de la cartera: organizaciones, sitios, contactos y equipo asignado.
 *
 * Todas viven aquí y **ningún componente importa el cliente de Supabase**
 * (docs/03_ARQUITECTURA.md §6). Las lecturas se consumen con `useQuery` y una
 * clave de `lib/query/keys.ts`; las escrituras pasan **siempre** por
 * `offlineWrite`, con etiqueta en español legible — es lo que el usuario va a
 * leer en la cola cuando esté sin señal (CLAUDE.md · reglas del offline).
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type Organizacion = Tables<'organizaciones'>
export type Sitio = Tables<'sitios'>
export type Contacto = Tables<'contactos'>

/**
 * Una organización con cuántos sitios y contactos tiene.
 *
 * ⚠️ Los conteos vienen **en la misma consulta** (`sitios(count)` de PostgREST),
 * no en una consulta por fila: cuarenta organizaciones × dos consultas cada una
 * son ochenta viajes que sin señal no se hacen y con señal mala tardan más que
 * la propia lista. La forma `[{ count: n }]` es la que devuelve PostgREST.
 */
export type OrganizacionEnLista = Organizacion & {
  sitios: { count: number }[]
  contactos: { count: number }[]
}

/** Un miembro de la firma asignado a una organización. */
export type MiembroEquipo = Tables<'usuarios_organizaciones'> & {
  usuario: Pick<Tables<'usuarios'>, 'id' | 'nombre' | 'correo' | 'rol' | 'activo'> | null
}

/** Alguien de la firma a quien se le puede asignar un expediente. */
export type UsuarioFirma = Pick<Tables<'usuarios'>, 'id' | 'nombre' | 'correo' | 'rol'>

/**
 * El `select` del miembro del equipo, con la FK dicha por su nombre.
 *
 * ⚠️ **`usuarios_organizaciones` tiene DOS claves foráneas a `usuarios`** —
 * `usuario_id` (de quién es la asignación) y `creado_por` (quién la hizo)—, así
 * que un `usuario:usuarios(...)` a secas es ambiguo: PostgREST no adivina cuál y
 * responde *"more than one relationship was found"*. La consulta no falla al
 * escribirla, falla en el teléfono del consultor. Se nombra la FK y se acabó.
 */
const EMBEBIDO_USUARIO =
  '*, usuario:usuarios!usuarios_organizaciones_usuario_id_fkey(id, nombre, correo, rol, activo)'

/** Lee un conteo embebido de PostgREST sin poder devolver `undefined`. */
export function conteo(embebido: { count: number }[] | null | undefined): number {
  return embebido?.[0]?.count ?? 0
}

/**
 * Quién tiene la sesión abierta.
 *
 * ⚠️ `getSession()` y **nunca `getUser()`**: `getUser()` pega a la red y sin
 * señal deja la escritura colgada antes de llegar a encolarse.
 */
async function idDeLaSesion(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

// ══════════════════════════════════════════════════════════════════ lecturas ══

/**
 * Toda la cartera que esta cuenta puede ver.
 *
 * Sin filtro de texto a propósito: el buscador filtra en memoria sobre esta
 * misma lista, para que siga funcionando sin señal (ver `keys.ts`).
 *
 * ⚠️ Quien decide qué filas llegan aquí **no es este código, es el RLS**: la
 * política `organizaciones_select` sólo devuelve las organizaciones asignadas a
 * la cuenta, o todas si es socio. Un consultor que no tenga asignada una planta
 * no la ve ni buscándola.
 */
export async function listarOrganizaciones(): Promise<OrganizacionEnLista[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('organizaciones')
    .select('*, sitios(count), contactos(count)')
    .order('razon_social')

  if (error) throw error
  return (data ?? []) as OrganizacionEnLista[]
}

export async function obtenerOrganizacion(id: string): Promise<Organizacion | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('organizaciones')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function listarSitios(orgId: string): Promise<Sitio[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('sitios')
    .select('*')
    .eq('org_id', orgId)
    .order('activo', { ascending: false })
    .order('nombre')

  if (error) throw error
  return data ?? []
}

export async function listarContactos(orgId: string): Promise<Contacto[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('contactos')
    .select('*')
    .eq('org_id', orgId)
    // El principal primero: es con quien se habla.
    .order('activo', { ascending: false })
    .order('principal', { ascending: false })
    .order('nombre')

  if (error) throw error
  return data ?? []
}

export type ContactoDelDirectorio = Contacto & {
  organizacion: Pick<Organizacion, 'id' | 'razon_social' | 'nombre_comercial'> | null
}

/**
 * El directorio: todos los contactos de la cartera, con su organización.
 *
 * Contesta la pregunta que hoy se resuelve buscando en un hilo de correo:
 * *"¿quién era el coordinador del SGC de Aceros?"*.
 */
export async function listarContactosDeLaCartera(): Promise<ContactoDelDirectorio[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('contactos')
    .select('*, organizacion:organizaciones(id, razon_social, nombre_comercial)')
    .eq('activo', true)
    .order('nombre')

  if (error) throw error
  return (data ?? []) as ContactoDelDirectorio[]
}

/**
 * Quién de la firma tiene asignada esta organización.
 *
 * **Ésta es la tabla del aislamiento** (`usuarios_organizaciones`): quitar una
 * fila de aquí es quitarle a esa persona el cliente entero — sus proyectos, sus
 * auditorías y sus hallazgos— en toda la aplicación.
 */
export async function listarEquipo(orgId: string): Promise<MiembroEquipo[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('usuarios_organizaciones')
    .select(EMBEBIDO_USUARIO)
    .eq('org_id', orgId)

  if (error) throw error
  return (data ?? []) as MiembroEquipo[]
}

/**
 * La gente de la firma que se puede asignar a un expediente.
 *
 * ⚠️ Sin `cliente`: esas cuentas entran por el portal [Fase 06], no por la
 * aplicación interna. Y lo que devuelva esta consulta depende otra vez del RLS
 * —`usuarios_select` sólo enseña a quien comparte organización, o a todos si
 * quien pregunta es socio—, que es justo lo que hace que el desplegable de un
 * consultor no sea el directorio completo de la firma.
 */
export async function listarUsuariosDeLaFirma(): Promise<UsuarioFirma[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, correo, rol')
    .eq('activo', true)
    .in('rol', ['socio', 'consultor', 'auditor', 'administracion'])
    .order('nombre')

  if (error) throw error
  return data ?? []
}

// ════════════════════════════════════════════════════════════════ escrituras ══

export type DatosOrganizacion = {
  razon_social: string
  nombre_comercial: string | null
  rfc: string | null
  giro: string | null
  tamano: string | null
  estado: string
  notas: string | null
}

/**
 * Alta de organización.
 *
 * ⚠️ **Sólo un socio la puede crear**, y lo impone la base
 * (`organizaciones_insert ... with check (es_socio())`), no la interfaz. Si un
 * consultor lo intentara, PostgREST devolvería 42501 — un rechazo del servidor,
 * que `offlineWrite` **no encola** porque volvería a fallar igual dentro de una
 * hora. La pantalla lo pinta con su motivo.
 */
export async function crearOrganizacion(
  datos: DatosOrganizacion,
): Promise<ResultadoEscritura<Organizacion>> {
  // ⚠️ `uuid()` y no `crypto.randomUUID()`: fuera de contexto seguro el segundo
  // no existe y se lleva por delante toda escritura nueva de la app.
  const id = uuid()
  const ahora = new Date().toISOString()
  const creadoPor = await idDeLaSesion()

  const valores = { id, ...datos, creado_por: creadoPor }

  return offlineWrite<Organizacion>({
    tabla: 'organizaciones',
    operacion: 'insert',
    etiqueta: `Alta de organización — ${datos.razon_social}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('organizaciones').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, 'Alta de organización')[0]
    },
    // La fila optimista: lo que la interfaz enseña mientras espera señal.
    offline: {
      ...valores,
      logotipo_url: null,
      creado_en: ahora,
      actualizado_en: ahora,
    } as Organizacion,
  })
}

export async function actualizarOrganizacion(
  organizacion: Organizacion,
  datos: DatosOrganizacion,
): Promise<ResultadoEscritura<Organizacion>> {
  return offlineWrite<Organizacion>({
    tabla: 'organizaciones',
    operacion: 'update',
    etiqueta: `Cambios en ${datos.razon_social}`,
    valores: datos,
    filtro: { id: organizacion.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('organizaciones')
        .update(datos)
        .eq('id', organizacion.id)
        .select()
      if (error) throw error
      // ⚠️ Cero filas en un UPDATE es un rechazo del RLS con cara de éxito.
      return exigirFilas(data, 'Cambios en la organización')[0]
    },
    offline: { ...organizacion, ...datos },
  })
}

export type DatosSitio = {
  nombre: string
  tipo: string
  direccion: string | null
  municipio: string | null
  entidad: string | null
  cp: string | null
  num_trabajadores: number | null
  notas: string | null
}

export async function crearSitio(
  orgId: string,
  datos: DatosSitio,
): Promise<ResultadoEscritura<Sitio>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const creadoPor = await idDeLaSesion()

  const valores = { id, org_id: orgId, ...datos, creado_por: creadoPor }

  return offlineWrite<Sitio>({
    tabla: 'sitios',
    operacion: 'insert',
    etiqueta: `Alta de sitio — ${datos.nombre}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('sitios').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, 'Alta de sitio')[0]
    },
    offline: { ...valores, activo: true, creado_en: ahora, actualizado_en: ahora } as Sitio,
  })
}

export async function actualizarSitio(
  sitio: Sitio,
  datos: DatosSitio,
): Promise<ResultadoEscritura<Sitio>> {
  return offlineWrite<Sitio>({
    tabla: 'sitios',
    operacion: 'update',
    etiqueta: `Cambios en el sitio ${datos.nombre}`,
    valores: datos,
    filtro: { id: sitio.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('sitios')
        .update(datos)
        .eq('id', sitio.id)
        .select()
      if (error) throw error
      return exigirFilas(data, 'Cambios en el sitio')[0]
    },
    offline: { ...sitio, ...datos },
  })
}

/**
 * Baja de un sitio.
 *
 * ⚠️ **No es un DELETE, y no es por prudencia**: una auditoría, una obligación
 * normativa o un contacto pueden estar apuntando a este sitio, y en una firma
 * de auditoría el registro de lo que pasó en una planta que ya cerró es
 * exactamente lo que un auditor externo va a pedir (docs/03 §4.3).
 */
export async function cambiarActivoSitio(
  sitio: Sitio,
  activo: boolean,
): Promise<ResultadoEscritura<Sitio>> {
  return offlineWrite<Sitio>({
    tabla: 'sitios',
    operacion: 'update',
    etiqueta: `${activo ? 'Reactivar' : 'Dar de baja'} el sitio ${sitio.nombre}`,
    valores: { activo },
    filtro: { id: sitio.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('sitios')
        .update({ activo })
        .eq('id', sitio.id)
        .select()
      if (error) throw error
      return exigirFilas(data, 'Baja del sitio')[0]
    },
    offline: { ...sitio, activo },
  })
}

export type DatosContacto = {
  nombre: string
  puesto: string | null
  correo: string | null
  telefono: string | null
  papel: string
  sitio_id: string | null
  principal: boolean
  notas: string | null
}

export async function crearContacto(
  orgId: string,
  datos: DatosContacto,
): Promise<ResultadoEscritura<Contacto>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const creadoPor = await idDeLaSesion()

  const valores = { id, org_id: orgId, ...datos, creado_por: creadoPor }

  return offlineWrite<Contacto>({
    tabla: 'contactos',
    operacion: 'insert',
    etiqueta: `Alta de contacto — ${datos.nombre}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('contactos').insert(valores).select()
      if (error) throw error
      return exigirFilas(data, 'Alta de contacto')[0]
    },
    offline: { ...valores, activo: true, creado_en: ahora, actualizado_en: ahora } as Contacto,
  })
}

export async function actualizarContacto(
  contacto: Contacto,
  datos: DatosContacto,
): Promise<ResultadoEscritura<Contacto>> {
  return offlineWrite<Contacto>({
    tabla: 'contactos',
    operacion: 'update',
    etiqueta: `Cambios en el contacto ${datos.nombre}`,
    valores: datos,
    filtro: { id: contacto.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contactos')
        .update(datos)
        .eq('id', contacto.id)
        .select()
      if (error) throw error
      return exigirFilas(data, 'Cambios en el contacto')[0]
    },
    offline: { ...contacto, ...datos },
  })
}

export async function cambiarActivoContacto(
  contacto: Contacto,
  activo: boolean,
): Promise<ResultadoEscritura<Contacto>> {
  return offlineWrite<Contacto>({
    tabla: 'contactos',
    operacion: 'update',
    etiqueta: `${activo ? 'Reactivar' : 'Dar de baja'} a ${contacto.nombre}`,
    valores: { activo },
    filtro: { id: contacto.id },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contactos')
        .update({ activo })
        .eq('id', contacto.id)
        .select()
      if (error) throw error
      return exigirFilas(data, 'Baja del contacto')[0]
    },
    offline: { ...contacto, activo },
  })
}

/**
 * Asignar a alguien de la firma a una organización — **o cambiarle el papel**.
 *
 * `upsert` porque la clave primaria es `(usuario_id, org_id)`: asignar dos veces
 * a la misma persona es cambiarle el papel, no un error.
 *
 * ⚠️ Es la escritura más delicada de la fase. Esta tabla es de la que cuelga
 * TODO el RLS del proyecto: agregar una fila aquí le abre a esa persona el
 * expediente completo del cliente. Por eso sólo el socio puede escribirla
 * (`usuarios_organizaciones_insert ... with check (es_socio())`).
 */
export async function asignarAlEquipo(
  orgId: string,
  usuario: UsuarioFirma,
  papel: string,
  organizacion: string,
): Promise<ResultadoEscritura<MiembroEquipo>> {
  const creadoPor = await idDeLaSesion()
  const valores = { usuario_id: usuario.id, org_id: orgId, papel, creado_por: creadoPor }

  return offlineWrite<MiembroEquipo>({
    tabla: 'usuarios_organizaciones',
    operacion: 'upsert',
    etiqueta: `Asignar a ${usuario.nombre} en ${organizacion}`,
    valores,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('usuarios_organizaciones')
        .upsert(valores)
        .select(EMBEBIDO_USUARIO)
      if (error) throw error
      return exigirFilas(data, 'Asignación al equipo')[0] as MiembroEquipo
    },
    offline: {
      ...valores,
      creado_en: new Date().toISOString(),
      usuario: { ...usuario, activo: true },
    } as MiembroEquipo,
  })
}

/**
 * Quitar a alguien de una organización.
 *
 * ⚠️ **El único DELETE de la cartera, y es intencional** desde la primera
 * migración: retirar a alguien de un cliente es una operación legítima y
 * frecuente —cambia el consultor asignado— y la bitácora conserva quién lo hizo
 * y cuándo. Lo que se borra no es información del cliente, es un permiso.
 */
export async function quitarDelEquipo(
  orgId: string,
  miembro: MiembroEquipo,
  organizacion: string,
): Promise<ResultadoEscritura<{ usuario_id: string; org_id: string }>> {
  const filtro = { usuario_id: miembro.usuario_id, org_id: orgId }

  return offlineWrite<{ usuario_id: string; org_id: string }>({
    tabla: 'usuarios_organizaciones',
    operacion: 'delete',
    etiqueta: `Quitar a ${miembro.usuario?.nombre ?? 'un usuario'} de ${organizacion}`,
    filtro,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('usuarios_organizaciones')
        .delete()
        .match(filtro)
        .select()
      if (error) throw error
      // ⚠️ Un DELETE que el RLS no deja hacer devuelve 200 con cero filas: se
      // vería como éxito, la fila reaparecería al refrescar, y nadie sabría por
      // qué. `exigirFilas` lo convierte en el error que es.
      exigirFilas(data, 'Quitar del equipo')
      return filtro
    },
    offline: filtro,
  })
}

/**
 * Borrar una organización. **De verdad, y con todo lo que cuelga.**
 *
 * ⚠️ Esto no afloja la regla 13, la delimita. Un hallazgo, una versión aprobada
 * y la bitácora no se borran nunca; **un cliente capturado por error, sí** — la
 * alternativa real es una cartera llena de datos de prueba que nadie puede
 * quitar, y una app que se ensucia sola se deja de usar.
 *
 * Tres candados, y sólo uno está en esta pantalla:
 *
 * 1. **Sólo el socio**, impuesto por la política `organizaciones_delete` a
 *    través de `puedo_borrar_org()`.
 * 2. La interfaz **exige escribir la razón social** antes de habilitar el botón.
 * 3. **Queda en `audit_logs`**, que es inmutable, con la fila entera en `antes`.
 *    Lo borrado se puede reconstruir; lo que se pierde es el expediente vivo.
 *
 * ⚠️ **Se lleva por delante sitios, contactos, proyectos, alcance, tareas y
 * bitácora**, por el `ON DELETE CASCADE` de sus claves foráneas. Quien llame a
 * esto tiene que haberlo dicho en pantalla, con nombres y cantidades.
 *
 * ⚠️ Y en la Fase 02 y la 03 hay que **ampliar `puedo_borrar_org()`**: una
 * organización con documentos, auditorías o hallazgos deja de poder borrarse.
 */
export async function eliminarOrganizacion(
  organizacion: Organizacion,
): Promise<ResultadoEscritura<{ id: string }>> {
  const filtro = { id: organizacion.id }

  return offlineWrite<{ id: string }>({
    tabla: 'organizaciones',
    operacion: 'delete',
    etiqueta: `Eliminar la organización ${organizacion.razon_social}`,
    filtro,
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('organizaciones')
        .delete()
        .eq('id', organizacion.id)
        .select('id')
      if (error) throw error
      // ⚠️ Cero filas es el RLS diciendo que no: sin ser socio, el DELETE
      // devuelve 200 y una lista vacía, y la pantalla diría que se borró.
      return exigirFilas(data, 'Eliminar la organización')[0]
    },
    offline: filtro,
  })
}
