/**
 * El programa y el plan de auditoría [F03·B1].
 *
 * Es la mitad de oficina de la Fase 03: lo que se prepara con señal, antes de
 * entrar a planta. El recorrido sin señal es F03·B3 y se apoya en lo que aquí se
 * deja escrito — sobre todo en el **alcance**, porque de él sale la lista de
 * verificación.
 *
 * ⚠️ **El folio NO se calcula aquí.** Lo pone `asignar_folio_auditoria()` en la
 * base, y no por comodidad: con el RLS de este proyecto un consultor sólo ve las
 * auditorías de sus clientes, así que contar las que tiene en la caché daría un
 * consecutivo que ya está usado en un expediente que no puede mirar. Por eso una
 * auditoría recién encolada sin señal aparece **sin folio hasta que sincroniza**,
 * y la pantalla lo dice en vez de inventarse uno.
 */

import { createClient } from '@/lib/supabase/client'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import { exigirFilas } from '@/lib/supabase/errores'
import { uuid } from '@/lib/utils/uuid'
import type { Tables } from '@/types/database'

export type Programa = Tables<'programa_auditorias'>
export type Auditoria = Tables<'auditorias'>
export type AuditoriaNorma = Tables<'auditoria_normas'> & { norma: Tables<'normas'> | null }
export type AuditoriaSitio = Tables<'auditoria_sitios'> & { sitio: Tables<'sitios'> | null }
export type AuditoriaProceso = Tables<'auditoria_procesos'> & { proceso: Tables<'procesos'> | null }
export type RenglonAgenda = Tables<'auditoria_agenda'>

/** Lo que hace falta del auditor para pintarlo y para imprimir el informe. */
export type AuditorDelEquipo = Pick<
  Tables<'usuarios'>,
  'id' | 'nombre' | 'correo' | 'certificaciones'
>

export type MiembroAuditor = Tables<'auditoria_equipo'> & { usuario: AuditorDelEquipo | null }

/** El cliente y el líder, embebidos: sin ellos el listado dice sólo folios. */
export type AuditoriaEnLista = Auditoria & {
  // ⚠️ `giro` viaja aquí porque es lo que elige el bucket de la plantilla de
  // listas de verificación [F03·B2]. Una consulta más sólo para leerlo dejaría
  // la plantilla sin aplicar cuando esa clave no esté en la caché.
  organizacion: Pick<Tables<'organizaciones'>, 'id' | 'razon_social' | 'nombre_comercial' | 'giro'> | null
  lider: Pick<Tables<'usuarios'>, 'id' | 'nombre'> | null
}

export type ProgramaEnLista = Programa & {
  organizacion: Pick<Tables<'organizaciones'>, 'id' | 'razon_social' | 'nombre_comercial' | 'giro'> | null
}

/**
 * ⚠️ Los embebidos se nombran por la clave foránea. `auditorias` apunta **dos
 * veces** a `usuarios` —`auditor_lider_id` y `cerrada_por_id`— y sin nombrar la
 * relación PostgREST responde *"more than one relationship was found"* y la
 * pantalla se queda vacía sin decir por qué.
 */
const EMBEBIDO_ORG = 'organizacion:organizaciones(id, razon_social, nombre_comercial, giro)'
const EMBEBIDO_LIDER = 'lider:usuarios!auditorias_auditor_lider_id_fkey(id, nombre)'
const EMBEBIDO_AUDITORIA = `*, ${EMBEBIDO_ORG}, ${EMBEBIDO_LIDER}`
const EMBEBIDO_PROGRAMA = `*, ${EMBEBIDO_ORG}`
const EMBEBIDO_MIEMBRO =
  '*, usuario:usuarios!auditoria_equipo_usuario_id_fkey(id, nombre, correo, certificaciones)'

async function idDeLaSesion(): Promise<string | null> {
  // ⚠️ `getSession()` es local. `getUser()` pega a la red y sin señal cuelga.
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}

/** El folio, o lo que se le enseña a alguien mientras la base no se lo ha puesto. */
export function folioVisible(auditoria: Pick<Auditoria, 'folio'>): string {
  return auditoria.folio ?? 'Sin folio hasta sincronizar'
}

// ══════════════════════════════════════════════════ el programa anual ════════

/**
 * Todos los programas visibles, **sin filtrar por cliente**.
 *
 * El filtro por organización y por año se aplica en memoria: son unas decenas de
 * filas al año y una consulta por filtro dejaría la pantalla en blanco en cuanto
 * alguien escribe en el buscador sin señal.
 */
export async function listarProgramas(): Promise<ProgramaEnLista[]> {
  const { data, error } = await createClient()
    .from('programa_auditorias')
    .select(EMBEBIDO_PROGRAMA)
    .order('anio', { ascending: false })
    .order('nombre')

  if (error) throw error
  return (data ?? []) as ProgramaEnLista[]
}

export type DatosPrograma = {
  anio: number
  nombre: string
  objetivo: string | null
  criterios: string | null
  estado: string
}

export async function crearPrograma(
  orgId: string,
  datos: DatosPrograma,
  organizacion: ProgramaEnLista['organizacion'],
): Promise<ResultadoEscritura<ProgramaEnLista>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const creadoPor = await idDeLaSesion()
  const valores = { id, org_id: orgId, ...datos, creado_por: creadoPor }

  return offlineWrite<ProgramaEnLista>({
    tabla: 'programa_auditorias',
    operacion: 'insert',
    etiqueta: `Alta del programa de auditorías ${datos.anio}`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('programa_auditorias')
        .insert(valores)
        .select(EMBEBIDO_PROGRAMA)
      if (error) throw error
      return exigirFilas(data, 'Alta del programa')[0] as ProgramaEnLista
    },
    offline: {
      ...valores,
      aprobado_en: null,
      aprobado_por_id: null,
      creado_en: ahora,
      actualizado_en: ahora,
      organizacion,
    } as ProgramaEnLista,
  })
}

/**
 * ⚠️ `aprobado_por_id` y `aprobado_en` **no se mandan nunca**: los escribe
 * `sellar_programa_aprobado()` en la base. Una firma de aprobación que viaja
 * desde el navegador es una firma que se puede escribir a mano — y mientras el
 * cambio está en la cola, la copia optimista los deja en `null` a propósito, que
 * es la verdad: todavía no los ha sellado nadie.
 */
export async function actualizarPrograma(
  programa: ProgramaEnLista,
  datos: DatosPrograma,
): Promise<ResultadoEscritura<ProgramaEnLista>> {
  return offlineWrite<ProgramaEnLista>({
    tabla: 'programa_auditorias',
    operacion: 'update',
    etiqueta: `Cambios en el programa ${datos.anio}`,
    valores: datos,
    filtro: { id: programa.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('programa_auditorias')
        .update(datos)
        .eq('id', programa.id)
        .select(EMBEBIDO_PROGRAMA)
      if (error) throw error
      return exigirFilas(data, 'Cambios en el programa')[0] as ProgramaEnLista
    },
    offline: { ...programa, ...datos },
  })
}

// ══════════════════════════════════════════════════════ las auditorías ═══════

/**
 * Todas las auditorías visibles, con su cliente y su líder.
 *
 * ⚠️ Ordenadas por `fecha_inicio` descendente y **no por folio**: una auditoría
 * encolada sin señal todavía no tiene folio, y ordenar por él la mandaría al
 * final de la lista justo el día que más se mira.
 */
export async function listarAuditorias(): Promise<AuditoriaEnLista[]> {
  const { data, error } = await createClient()
    .from('auditorias')
    .select(EMBEBIDO_AUDITORIA)
    .order('fecha_inicio', { ascending: false, nullsFirst: false })
    .order('creado_en', { ascending: false })

  if (error) throw error
  return (data ?? []) as AuditoriaEnLista[]
}

export async function obtenerAuditoria(id: string): Promise<AuditoriaEnLista | null> {
  const { data, error } = await createClient()
    .from('auditorias')
    .select(EMBEBIDO_AUDITORIA)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as AuditoriaEnLista | null
}

export type DatosAuditoria = {
  titulo: string
  tipo: string
  estado: string
  programa_id: string | null
  proyecto_id: string | null
  auditor_lider_id: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  objetivo: string | null
  alcance: string | null
  criterios: string | null
  metodologia: string | null
}

export async function crearAuditoria(
  orgId: string,
  datos: DatosAuditoria,
  organizacion: AuditoriaEnLista['organizacion'],
  lider: AuditoriaEnLista['lider'],
): Promise<ResultadoEscritura<AuditoriaEnLista>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const creadoPor = await idDeLaSesion()
  const valores = { id, org_id: orgId, ...datos, creado_por: creadoPor }

  return offlineWrite<AuditoriaEnLista>({
    tabla: 'auditorias',
    operacion: 'insert',
    etiqueta: `Alta de auditoría — ${datos.titulo}`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('auditorias')
        .insert(valores)
        .select(EMBEBIDO_AUDITORIA)
      if (error) throw error
      return exigirFilas(data, 'Alta de auditoría')[0] as AuditoriaEnLista
    },
    offline: {
      ...valores,
      // ⚠️ `null` a propósito: el folio lo pone la base. Inventar aquí un
      // «AUD-2026-015» sería enseñar un número que después cambia solo.
      folio: null,
      conclusiones: null,
      informe_emitido_en: null,
      cerrada_en: null,
      cerrada_por_id: null,
      creado_en: ahora,
      actualizado_en: ahora,
      organizacion,
      lider,
    } as AuditoriaEnLista,
  })
}

export async function actualizarAuditoria(
  auditoria: AuditoriaEnLista,
  datos: DatosAuditoria,
  lider: AuditoriaEnLista['lider'],
): Promise<ResultadoEscritura<AuditoriaEnLista>> {
  return offlineWrite<AuditoriaEnLista>({
    tabla: 'auditorias',
    operacion: 'update',
    etiqueta: `Cambios en la auditoría ${auditoria.folio ?? auditoria.titulo}`,
    valores: datos,
    filtro: { id: auditoria.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditorias')
        .update(datos)
        .eq('id', auditoria.id)
        .select(EMBEBIDO_AUDITORIA)
      if (error) throw error
      return exigirFilas(data, 'Cambios en la auditoría')[0] as AuditoriaEnLista
    },
    offline: { ...auditoria, ...datos, lider },
  })
}

/**
 * Mover el estado de la auditoría.
 *
 * ⚠️ Va aparte de `actualizarAuditoria()` porque el sello del cierre lo escribe
 * la base (`sellar_cierre_auditoria()`), y porque la etiqueta de la cola tiene
 * que decir qué pasó: quien mira la cola sin señal lee «Cierre de la auditoría
 * AUD-2026-014», no «Cambios».
 */
export async function cambiarEstadoAuditoria(
  auditoria: AuditoriaEnLista,
  estado: string,
  etiqueta: string,
): Promise<ResultadoEscritura<AuditoriaEnLista>> {
  return offlineWrite<AuditoriaEnLista>({
    tabla: 'auditorias',
    operacion: 'update',
    etiqueta,
    valores: { estado },
    filtro: { id: auditoria.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditorias')
        .update({ estado })
        .eq('id', auditoria.id)
        .select(EMBEBIDO_AUDITORIA)
      if (error) throw error
      return exigirFilas(data, 'Cambio de estado')[0] as AuditoriaEnLista
    },
    offline: { ...auditoria, estado },
  })
}

/**
 * Marcar el informe como emitido, o retractar la emisión [F03·B5].
 *
 * ⚠️ **La fecha la pone la BASE**, no esto: `sellar_emision_informe()` descarta
 * lo que llegue y escribe su `now()`. Aquí se manda un instante sólo porque la
 * columna no admite un booleano — cualquier valor no nulo significa «emitido» y
 * el servidor lo reemplaza. Emitir es una acción de **oficina** y por la regla
 * de las fechas de la Fase 03 la sella el servidor: el plazo de una semana de
 * P-SG-03 §5.4.5 se mide contra ella, y una fecha que viaja desde el navegador
 * es una fecha que se puede escribir a mano.
 *
 * ⚠️ **Sí pasa por la cola**, y no hace falta que sea una excepción más: es un
 * `update` normal sobre una fila, la cola sabe reproducirlo, y si se encola sin
 * señal el servidor sella al llegar — que es justo lo que se quiere. Enseñar el
 * preliminar en la reunión de cierre **no llama a esto**: eso no escribe nada.
 */
export async function marcarInformeEmitido(
  auditoria: AuditoriaEnLista,
  emitido: boolean,
): Promise<ResultadoEscritura<AuditoriaEnLista>> {
  const valores = { informe_emitido_en: emitido ? new Date().toISOString() : null }

  return offlineWrite<AuditoriaEnLista>({
    tabla: 'auditorias',
    operacion: 'update',
    etiqueta: emitido
      ? `Emisión del informe de ${auditoria.folio ?? auditoria.titulo}`
      : `Retractación del informe de ${auditoria.folio ?? auditoria.titulo}`,
    valores,
    filtro: { id: auditoria.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditorias')
        .update(valores)
        .eq('id', auditoria.id)
        .select(EMBEBIDO_AUDITORIA)
      if (error) throw error
      return exigirFilas(data, 'Emisión del informe')[0] as AuditoriaEnLista
    },
    offline: { ...auditoria, ...valores },
  })
}


// ═════════════════════════════════════════════════════════ el alcance ════════

export async function listarAlcanceNormas(auditoriaId: string): Promise<AuditoriaNorma[]> {
  const { data, error } = await createClient()
    .from('auditoria_normas')
    .select('*, norma:normas(*)')
    .eq('auditoria_id', auditoriaId)

  if (error) throw error
  return (data ?? []) as AuditoriaNorma[]
}

export async function listarAlcanceSitios(auditoriaId: string): Promise<AuditoriaSitio[]> {
  const { data, error } = await createClient()
    .from('auditoria_sitios')
    .select('*, sitio:sitios(*)')
    .eq('auditoria_id', auditoriaId)

  if (error) throw error
  return (data ?? []) as AuditoriaSitio[]
}

export async function listarAlcanceProcesos(auditoriaId: string): Promise<AuditoriaProceso[]> {
  const { data, error } = await createClient()
    .from('auditoria_procesos')
    .select('*, proceso:procesos(*)')
    .eq('auditoria_id', auditoriaId)

  if (error) throw error
  return (data ?? []) as AuditoriaProceso[]
}

/**
 * ⚠️ **`org_id` se manda porque la columna es NOT NULL, y la base la pisa.** El
 * trigger `heredar_org_de_la_auditoria()` la reemplaza por la de la auditoría:
 * `WITH CHECK` sólo comprueba que la organización sea *una de las tuyas*, no que
 * sea la de la auditoría, y con dos clientes asignados el alcance de uno podría
 * acabar colgado del expediente del otro. Lo que se manda aquí es un valor
 * plausible para la copia optimista, no la verdad.
 */
export async function agregarNormaAlAlcance(
  auditoriaId: string,
  orgId: string,
  norma: Tables<'normas'>,
): Promise<ResultadoEscritura<AuditoriaNorma>> {
  const creadoPor = await idDeLaSesion()
  const valores = {
    auditoria_id: auditoriaId,
    norma_id: norma.id,
    org_id: orgId,
    creado_por: creadoPor,
  }

  return offlineWrite<AuditoriaNorma>({
    tabla: 'auditoria_normas',
    operacion: 'insert',
    etiqueta: `Añadir ${norma.nombre} al alcance de la auditoría`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_normas')
        .insert(valores)
        .select('*, norma:normas(*)')
      if (error) throw error
      return exigirFilas(data, 'Alcance de la auditoría')[0] as AuditoriaNorma
    },
    offline: { ...valores, creado_en: new Date().toISOString(), norma } as AuditoriaNorma,
  })
}

export async function quitarNormaDelAlcance(
  auditoriaId: string,
  norma: Tables<'normas'>,
): Promise<ResultadoEscritura<null>> {
  return offlineWrite<null>({
    tabla: 'auditoria_normas',
    operacion: 'delete',
    etiqueta: `Quitar ${norma.nombre} del alcance de la auditoría`,
    filtro: { auditoria_id: auditoriaId, norma_id: norma.id },
    online: async () => {
      // ⚠️ `.select()` y `exigirFilas`: un DELETE bloqueado por RLS **no es un
      // error**. Afecta a cero filas y PostgREST responde 200 con lista vacía —
      // «lo quito, desaparece, refresco y vuelve».
      const { data, error } = await createClient()
        .from('auditoria_normas')
        .delete()
        .eq('auditoria_id', auditoriaId)
        .eq('norma_id', norma.id)
        .select()
      if (error) throw error
      exigirFilas(data, 'Quitar la norma del alcance')
      return null
    },
    offline: null,
  })
}

export async function agregarSitioAlAlcance(
  auditoriaId: string,
  orgId: string,
  sitio: Tables<'sitios'>,
): Promise<ResultadoEscritura<AuditoriaSitio>> {
  const creadoPor = await idDeLaSesion()
  const valores = {
    auditoria_id: auditoriaId,
    sitio_id: sitio.id,
    org_id: orgId,
    creado_por: creadoPor,
  }

  return offlineWrite<AuditoriaSitio>({
    tabla: 'auditoria_sitios',
    operacion: 'insert',
    etiqueta: `Añadir ${sitio.nombre} al alcance de la auditoría`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_sitios')
        .insert(valores)
        .select('*, sitio:sitios(*)')
      if (error) throw error
      return exigirFilas(data, 'Alcance de la auditoría')[0] as AuditoriaSitio
    },
    offline: { ...valores, creado_en: new Date().toISOString(), sitio } as AuditoriaSitio,
  })
}

export async function quitarSitioDelAlcance(
  auditoriaId: string,
  sitio: Tables<'sitios'>,
): Promise<ResultadoEscritura<null>> {
  return offlineWrite<null>({
    tabla: 'auditoria_sitios',
    operacion: 'delete',
    etiqueta: `Quitar ${sitio.nombre} del alcance de la auditoría`,
    filtro: { auditoria_id: auditoriaId, sitio_id: sitio.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_sitios')
        .delete()
        .eq('auditoria_id', auditoriaId)
        .eq('sitio_id', sitio.id)
        .select()
      if (error) throw error
      exigirFilas(data, 'Quitar el sitio del alcance')
      return null
    },
    offline: null,
  })
}

export async function agregarProcesoAlAlcance(
  auditoriaId: string,
  orgId: string,
  proceso: Tables<'procesos'>,
): Promise<ResultadoEscritura<AuditoriaProceso>> {
  const creadoPor = await idDeLaSesion()
  const valores = {
    auditoria_id: auditoriaId,
    proceso_id: proceso.id,
    org_id: orgId,
    creado_por: creadoPor,
  }

  return offlineWrite<AuditoriaProceso>({
    tabla: 'auditoria_procesos',
    operacion: 'insert',
    etiqueta: `Añadir ${proceso.nombre} al alcance de la auditoría`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_procesos')
        .insert(valores)
        .select('*, proceso:procesos(*)')
      if (error) throw error
      return exigirFilas(data, 'Alcance de la auditoría')[0] as AuditoriaProceso
    },
    offline: { ...valores, creado_en: new Date().toISOString(), proceso } as AuditoriaProceso,
  })
}

export async function quitarProcesoDelAlcance(
  auditoriaId: string,
  proceso: Tables<'procesos'>,
): Promise<ResultadoEscritura<null>> {
  return offlineWrite<null>({
    tabla: 'auditoria_procesos',
    operacion: 'delete',
    etiqueta: `Quitar ${proceso.nombre} del alcance de la auditoría`,
    filtro: { auditoria_id: auditoriaId, proceso_id: proceso.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_procesos')
        .delete()
        .eq('auditoria_id', auditoriaId)
        .eq('proceso_id', proceso.id)
        .select()
      if (error) throw error
      exigirFilas(data, 'Quitar el proceso del alcance')
      return null
    },
    offline: null,
  })
}

// ══════════════════════════════════════════════════════════ el equipo ════════

export async function listarEquipoAuditor(auditoriaId: string): Promise<MiembroAuditor[]> {
  const { data, error } = await createClient()
    .from('auditoria_equipo')
    .select(EMBEBIDO_MIEMBRO)
    .eq('auditoria_id', auditoriaId)

  if (error) throw error
  return (data ?? []) as MiembroAuditor[]
}

export async function sumarAlEquipoAuditor(
  auditoriaId: string,
  orgId: string,
  usuario: AuditorDelEquipo,
  papel: string,
): Promise<ResultadoEscritura<MiembroAuditor>> {
  const creadoPor = await idDeLaSesion()
  const valores = {
    auditoria_id: auditoriaId,
    usuario_id: usuario.id,
    org_id: orgId,
    papel,
    creado_por: creadoPor,
  }

  return offlineWrite<MiembroAuditor>({
    tabla: 'auditoria_equipo',
    operacion: 'insert',
    etiqueta: `Sumar a ${usuario.nombre} al equipo auditor`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_equipo')
        .insert(valores)
        .select(EMBEBIDO_MIEMBRO)
      if (error) throw error
      return exigirFilas(data, 'Equipo auditor')[0] as MiembroAuditor
    },
    offline: { ...valores, creado_en: new Date().toISOString(), usuario } as MiembroAuditor,
  })
}

export async function cambiarPapelAuditor(
  miembro: MiembroAuditor,
  papel: string,
): Promise<ResultadoEscritura<MiembroAuditor>> {
  return offlineWrite<MiembroAuditor>({
    tabla: 'auditoria_equipo',
    operacion: 'update',
    etiqueta: `Cambiar el papel de ${miembro.usuario?.nombre ?? 'un auditor'}`,
    valores: { papel },
    filtro: { auditoria_id: miembro.auditoria_id, usuario_id: miembro.usuario_id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_equipo')
        .update({ papel })
        .eq('auditoria_id', miembro.auditoria_id)
        .eq('usuario_id', miembro.usuario_id)
        .select(EMBEBIDO_MIEMBRO)
      if (error) throw error
      return exigirFilas(data, 'Papel del auditor')[0] as MiembroAuditor
    },
    offline: { ...miembro, papel },
  })
}

export async function quitarDelEquipoAuditor(
  miembro: MiembroAuditor,
): Promise<ResultadoEscritura<null>> {
  return offlineWrite<null>({
    tabla: 'auditoria_equipo',
    operacion: 'delete',
    etiqueta: `Quitar a ${miembro.usuario?.nombre ?? 'un auditor'} del equipo`,
    filtro: { auditoria_id: miembro.auditoria_id, usuario_id: miembro.usuario_id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_equipo')
        .delete()
        .eq('auditoria_id', miembro.auditoria_id)
        .eq('usuario_id', miembro.usuario_id)
        .select()
      if (error) throw error
      exigirFilas(data, 'Quitar del equipo auditor')
      return null
    },
    offline: null,
  })
}

// ══════════════════════════════════════════════════════════ la agenda ════════

/**
 * El plan hora por hora. **Es lo que se le manda al cliente antes de la visita**,
 * y por eso se ordena por fecha y hora y no por captura.
 */
export async function listarAgenda(auditoriaId: string): Promise<RenglonAgenda[]> {
  const { data, error } = await createClient()
    .from('auditoria_agenda')
    .select('*')
    .eq('auditoria_id', auditoriaId)
    .order('fecha')
    .order('hora_inicio', { nullsFirst: false })
    .order('orden')

  if (error) throw error
  return (data ?? []) as RenglonAgenda[]
}

export type DatosAgenda = {
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  tema: string
  proceso_id: string | null
  sitio_id: string | null
  auditado: string | null
  contacto_id: string | null
  auditor_id: string | null
  orden: number
  nota: string | null
}

export async function crearRenglonAgenda(
  auditoriaId: string,
  orgId: string,
  datos: DatosAgenda,
): Promise<ResultadoEscritura<RenglonAgenda>> {
  const id = uuid()
  const ahora = new Date().toISOString()
  const creadoPor = await idDeLaSesion()
  const valores = { id, auditoria_id: auditoriaId, org_id: orgId, ...datos, creado_por: creadoPor }

  return offlineWrite<RenglonAgenda>({
    tabla: 'auditoria_agenda',
    operacion: 'insert',
    etiqueta: `Agenda — ${datos.tema}`,
    valores,
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_agenda')
        .insert(valores)
        .select()
      if (error) throw error
      return exigirFilas(data, 'Agenda de la auditoría')[0] as RenglonAgenda
    },
    offline: {
      ...valores,
      cumplido: false,
      creado_en: ahora,
      actualizado_en: ahora,
    } as RenglonAgenda,
  })
}

export async function actualizarRenglonAgenda(
  renglon: RenglonAgenda,
  datos: DatosAgenda,
): Promise<ResultadoEscritura<RenglonAgenda>> {
  return offlineWrite<RenglonAgenda>({
    tabla: 'auditoria_agenda',
    operacion: 'update',
    etiqueta: `Cambios en la agenda — ${datos.tema}`,
    valores: datos,
    filtro: { id: renglon.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_agenda')
        .update(datos)
        .eq('id', renglon.id)
        .select()
      if (error) throw error
      return exigirFilas(data, 'Cambios en la agenda')[0] as RenglonAgenda
    },
    offline: { ...renglon, ...datos },
  })
}

/**
 * Marcar un punto de la agenda como cumplido.
 *
 * ⚠️ Es lo que alimenta el apartado «agenda cumplida» del informe [F03·B5], y se
 * toca **en planta**: va por la cola como todo lo demás.
 */
export async function cambiarCumplidoAgenda(
  renglon: RenglonAgenda,
  cumplido: boolean,
): Promise<ResultadoEscritura<RenglonAgenda>> {
  return offlineWrite<RenglonAgenda>({
    tabla: 'auditoria_agenda',
    operacion: 'update',
    etiqueta: `${cumplido ? 'Cumplido' : 'Pendiente'} — ${renglon.tema}`,
    valores: { cumplido },
    filtro: { id: renglon.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_agenda')
        .update({ cumplido })
        .eq('id', renglon.id)
        .select()
      if (error) throw error
      return exigirFilas(data, 'Agenda cumplida')[0] as RenglonAgenda
    },
    offline: { ...renglon, cumplido },
  })
}

export async function eliminarRenglonAgenda(
  renglon: RenglonAgenda,
): Promise<ResultadoEscritura<null>> {
  return offlineWrite<null>({
    tabla: 'auditoria_agenda',
    operacion: 'delete',
    etiqueta: `Quitar de la agenda — ${renglon.tema}`,
    filtro: { id: renglon.id },
    online: async () => {
      const { data, error } = await createClient()
        .from('auditoria_agenda')
        .delete()
        .eq('id', renglon.id)
        .select()
      if (error) throw error
      exigirFilas(data, 'Quitar de la agenda')
      return null
    },
    offline: null,
  })
}
