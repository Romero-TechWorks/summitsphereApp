'use client'

/**
 * **La precarga de una auditoría** [F03·B3] — docs/03_ARQUITECTURA.md §8.11.
 *
 * ⚠️ **Regla propia de este proyecto, y es la que decide si la Fase 03 sirve.**
 * La caché de TanStack sólo tiene lo que alguien ya abrió. Si el auditor entra a
 * la planta sin haber tocado la pestaña del recorrido, esa clave **no está**, y
 * en modo avión la pantalla sale vacía: no es que se hayan perdido los datos, es
 * que nunca se bajaron. Y para cuando se nota, el auditor ya está en un sótano
 * con el teléfono en una mano y la lista en la otra.
 *
 * Así que se baja **todo de golpe y a propósito**, con un botón que se pulsa en
 * el estacionamiento, y un aviso explícito que dice **«lista para trabajar sin
 * señal»** antes de arrancar el coche.
 *
 * ⚠️ Se usa `ensureQueryData`, no `prefetchQuery`: el primero **devuelve los
 * datos y propaga el error**, así que si una consulta falla la pantalla puede
 * decir cuál. `prefetchQuery` se traga los fallos, y una precarga que dice
 * «listo» habiéndose dejado los ítems fuera es peor que no tenerla.
 */

import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { listarContactos, listarSitios } from '@/lib/queries/cartera'
import { listarNormasConClausulas } from '@/lib/queries/normas'
import { listarProcesos } from '@/lib/queries/procesos'
import { listarDocumentos } from '@/lib/queries/documentos'
import {
  listarAgenda,
  listarAlcanceNormas,
  listarAlcanceProcesos,
  listarAlcanceSitios,
  listarEquipoAuditor,
  obtenerAuditoria,
} from '@/lib/queries/auditorias'
import { listarItems } from '@/lib/queries/verificacion'
import { listarHallazgos } from '@/lib/queries/hallazgos'

export type PiezaPrecarga = {
  /** Lo que se le dice al auditor mientras baja. En español y sin jerga. */
  etiqueta: string
  /**
   * Las claves que esta pieza deja en la caché.
   *
   * ⚠️ Se declaran **aparte del `cargar`** para poder contestar «¿ya está
   * descargada?» mirando la caché, que es la fuente de verdad, en vez de un
   * `useState` del componente. Con un booleano en el componente, salir de la
   * pestaña y volver diría «descarga antes de entrar» con todo ya bajado — y en
   * la puerta de una planta eso hace que alguien se dé la vuelta.
   */
  claves: QueryKey[]
  cargar: (cliente: QueryClient) => Promise<unknown>
}

/**
 * Qué se baja, y en qué orden.
 *
 * ⚠️ **Está escrito como una lista a propósito**: añadir una pieza es una
 * entrada aquí, no tocar la lógica. Los hallazgos previos del cliente entran con
 * F03·B4 —su consulta todavía no existe— y son la pieza que más falta hace en
 * campo: sin ella, el auditor no puede comprobar si lo del año pasado se cerró.
 *
 * ⚠️ **Los desplegables también se bajan** —sitios, contactos, procesos,
 * cláusulas—. Es la regla 3 del offline: sin señal un desplegable vacío deja el
 * guardado muerto en la validación **antes** de que `offlineWrite` pueda
 * encolarlo, y el dato no se encola: se pierde. En la Fase 03 eso es el selector
 * de cláusula de un hallazgo, y sin cláusula no hay hallazgo.
 */
export function piezasDeLaPrecarga(auditoriaId: string, orgId: string): PiezaPrecarga[] {
  return [
    {
      etiqueta: 'El plan de la auditoría',
      claves: [queryKeys.auditorias.auditoria(auditoriaId)],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.auditorias.auditoria(auditoriaId),
        queryFn: () => obtenerAuditoria(auditoriaId),
      }),
    },
    {
      etiqueta: 'La lista de verificación',
      claves: [queryKeys.auditorias.items(auditoriaId)],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.auditorias.items(auditoriaId),
        queryFn: () => listarItems(auditoriaId),
      }),
    },
    {
      etiqueta: 'La agenda de la visita',
      claves: [queryKeys.auditorias.agenda(auditoriaId)],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.auditorias.agenda(auditoriaId),
        queryFn: () => listarAgenda(auditoriaId),
      }),
    },
    {
      etiqueta: 'El alcance: normas, sitios y procesos',
      claves: [
        queryKeys.auditorias.alcanceNormas(auditoriaId),
        queryKeys.auditorias.alcanceSitios(auditoriaId),
        queryKeys.auditorias.alcanceProcesos(auditoriaId),
      ],
      cargar: async (c) => {
        await Promise.all([
          c.ensureQueryData({
            queryKey: queryKeys.auditorias.alcanceNormas(auditoriaId),
            queryFn: () => listarAlcanceNormas(auditoriaId),
          }),
          c.ensureQueryData({
            queryKey: queryKeys.auditorias.alcanceSitios(auditoriaId),
            queryFn: () => listarAlcanceSitios(auditoriaId),
          }),
          c.ensureQueryData({
            queryKey: queryKeys.auditorias.alcanceProcesos(auditoriaId),
            queryFn: () => listarAlcanceProcesos(auditoriaId),
          }),
        ])
      },
    },
    {
      etiqueta: 'El árbol de cláusulas',
      claves: [queryKeys.normas.arbol()],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.normas.arbol(),
        queryFn: listarNormasConClausulas,
      }),
    },
    {
      etiqueta: 'El equipo auditor',
      claves: [queryKeys.auditorias.equipo(auditoriaId)],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.auditorias.equipo(auditoriaId),
        queryFn: () => listarEquipoAuditor(auditoriaId),
      }),
    },
    {
      etiqueta: 'Los sitios y contactos del cliente',
      claves: [queryKeys.cartera.sitios(orgId), queryKeys.cartera.contactos(orgId)],
      cargar: async (c) => {
        await Promise.all([
          c.ensureQueryData({
            queryKey: queryKeys.cartera.sitios(orgId),
            queryFn: () => listarSitios(orgId),
          }),
          c.ensureQueryData({
            queryKey: queryKeys.cartera.contactos(orgId),
            queryFn: () => listarContactos(orgId),
          }),
        ])
      },
    },
    {
      etiqueta: 'El mapa de procesos',
      claves: [queryKeys.sistemas.procesos(orgId)],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.sistemas.procesos(orgId),
        queryFn: () => listarProcesos(orgId),
      }),
    },
    {
      etiqueta: 'Los documentos del cliente',
      claves: [queryKeys.sistemas.documentos(orgId)],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.sistemas.documentos(orgId),
        queryFn: () => listarDocumentos(orgId),
      }),
    },
    {
      /**
       * Los hallazgos que esta auditoría ya tiene [F03·B4].
       *
       * ⚠️ **Es la pieza que más falta hace en el piso**, y por eso va aquí y no
       * se deja a que la pestaña la cargue sola: sin ella, el auditor no puede
       * comprobar si lo que levantó ayer sigue abierto, ni el recorrido puede
       * calcular el consecutivo del siguiente hallazgo — y ese cálculo es lo
       * único que hace que el folio salga sin red.
       */
      etiqueta: 'Los hallazgos ya levantados',
      claves: [queryKeys.auditorias.hallazgos(auditoriaId)],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.auditorias.hallazgos(auditoriaId),
        queryFn: () => listarHallazgos(auditoriaId),
      }),
    },
  ]
}

export type ResultadoPrecarga = {
  /** Cuántas piezas quedaron en la caché. */
  listas: number
  total: number
  /** Qué falló, con su motivo, para poder decirlo en pantalla. */
  fallos: { etiqueta: string; motivo: string }[]
}

/**
 * Baja todo a la caché. Devuelve qué quedó y qué no.
 *
 * ⚠️ **Secuencial y no en paralelo**, a propósito. En el WiFi de una oficina da
 * igual, pero esto se pulsa muchas veces con media barra de señal en la puerta
 * de la planta: nueve consultas simultáneas por una conexión mala se estorban
 * entre sí y fallan más que una detrás de otra. Y así el aviso puede decir por
 * cuál va.
 *
 * ⚠️ **Un fallo no aborta el resto.** Si los documentos del cliente no bajan, la
 * lista de verificación sí tiene que bajar: es lo que de verdad hace falta en el
 * piso. Lo que falló se dice por su nombre, no con un «hubo un error».
 */
export async function precargarAuditoria(
  cliente: QueryClient,
  auditoriaId: string,
  orgId: string,
  alAvanzar?: (etiqueta: string, hechas: number, total: number) => void,
): Promise<ResultadoPrecarga> {
  const piezas = piezasDeLaPrecarga(auditoriaId, orgId)
  const fallos: ResultadoPrecarga['fallos'] = []
  let listas = 0

  for (const [indice, pieza] of piezas.entries()) {
    alAvanzar?.(pieza.etiqueta, indice, piezas.length)

    try {
      await pieza.cargar(cliente)
      listas += 1
    } catch (problema) {
      // `mensajeDeError` y no `String(error)`: un fallo de red de postgrest-js
      // no es un `Error`, y `String()` sobre él da «[object Object]».
      const { mensajeDeError } = await import('@/lib/supabase/errores')
      fallos.push({ etiqueta: pieza.etiqueta, motivo: mensajeDeError(problema) })
    }
  }

  alAvanzar?.('', piezas.length, piezas.length)
  return { listas, total: piezas.length, fallos }
}

/**
 * ¿Está esta auditoría lista para entrar a la planta?
 *
 * ⚠️ **Se contesta mirando la CACHÉ, no un booleano del componente.** La caché es
 * la fuente de verdad y es lo único que se persiste (CLAUDE.md · reglas del
 * offline, 2): con un `useState`, salir de la pestaña y volver diría «descarga
 * antes de entrar» con todo perfectamente bajado, y en la puerta de una planta
 * eso hace que alguien se dé la vuelta o entre creyendo que no tiene nada.
 *
 * Al revés también importa: si el navegador vació la caché entre una visita y
 * otra, esto lo dice **antes** de que el auditor se meta en un sótano.
 */
export function faltaPorPrecargar(
  cliente: QueryClient,
  auditoriaId: string,
  orgId: string,
): string[] {
  return piezasDeLaPrecarga(auditoriaId, orgId)
    .filter((pieza) => pieza.claves.some((clave) => cliente.getQueryData(clave) === undefined))
    .map((pieza) => pieza.etiqueta)
}
