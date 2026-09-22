'use client'

/**
 * **La precarga del recorrido de cumplimiento** [F05·B1] — docs/13 §7.
 *
 * ⚠️ Es la misma lección de F03·B3, y la que más caro sale olvidar: **la caché
 * sólo tiene lo que alguien ya abrió.** Sin «Descargar para trabajar sin
 * señal», en la planta el recorrido sale vacío —no se perdieron los datos, nunca
 * se bajaron— y para cuando se nota, el consultor ya está en un sótano.
 *
 * ⚠️ **Todo cuelga de la ORGANIZACIÓN, no del sitio.** Se baja la matriz entera
 * del cliente y el sitio y el área se filtran en memoria: así cambiar de sitio
 * en la planta no deja la pantalla vacía, y una sola descarga sirve para los
 * tres sitios que se recorren en el día.
 *
 * ⚠️ `ensureQueryData` y no `prefetchQuery`, por lo mismo que la de auditorías:
 * el primero propaga el error y la pantalla puede decir qué pieza no bajó.
 *
 * ⚠️ **El membrete de la firma NO está todavía**, al revés que en docs/13 §7:
 * sólo lo consume el informe de levantamiento, y ese imprimible no se construyó
 * en este bloque (ver docs/13 §10). Precargarlo sin nadie que lo lea sería una
 * pieza muerta (regla 11); entra en la misma entrega que el informe.
 */

import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { listarEquipo, listarSitios } from '@/lib/queries/cartera'
import { listarDocumentos } from '@/lib/queries/documentos'
import { listarNoms, listarTiposObligacion } from '@/lib/queries/noms'
import {
  listarAdjuntosDeObligaciones,
  listarAreas,
  listarObligaciones,
} from '@/lib/queries/obligaciones'
import type { PiezaPrecarga, ResultadoPrecarga } from '@/lib/auditorias/precarga'

/**
 * Qué se baja, y en qué orden: primero lo que hace falta para TRABAJAR —la
 * matriz y dónde se camina—, después los desplegables, al final la evidencia
 * previa. Si la señal se corta a la mitad, lo que tiene que haber bajado ya es
 * la matriz.
 *
 * ⚠️ **Los desplegables también se bajan** —tipos, equipo, documentos—. Es la
 * regla 3 del offline: sin señal, un desplegable vacío deja el guardado muerto
 * en la validación antes de que `offlineWrite` pueda encolarlo.
 */
export function piezasDelRecorrido(orgId: string): PiezaPrecarga[] {
  return [
    {
      etiqueta: 'La matriz de obligaciones',
      claves: [queryKeys.cumplimiento.obligaciones(orgId)],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.cumplimiento.obligaciones(orgId),
        queryFn: () => listarObligaciones(orgId),
      }),
    },
    {
      etiqueta: 'Los sitios y sus áreas',
      claves: [queryKeys.cartera.sitios(orgId), queryKeys.cumplimiento.areas(orgId)],
      cargar: async (c) => {
        await Promise.all([
          c.ensureQueryData({
            queryKey: queryKeys.cartera.sitios(orgId),
            queryFn: () => listarSitios(orgId),
          }),
          c.ensureQueryData({
            queryKey: queryKeys.cumplimiento.areas(orgId),
            queryFn: () => listarAreas(orgId),
          }),
        ])
      },
    },
    {
      etiqueta: 'La biblioteca de NOMs',
      claves: [queryKeys.cumplimiento.noms()],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.cumplimiento.noms(),
        queryFn: listarNoms,
      }),
    },
    {
      etiqueta: 'Los tipos de obligación',
      claves: [queryKeys.cumplimiento.tipos()],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.cumplimiento.tipos(),
        queryFn: listarTiposObligacion,
      }),
    },
    {
      etiqueta: 'El equipo del cliente',
      claves: [queryKeys.cartera.equipo(orgId)],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.cartera.equipo(orgId),
        queryFn: () => listarEquipo(orgId),
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
      etiqueta: 'La evidencia ya subida',
      claves: [queryKeys.cumplimiento.adjuntos(orgId)],
      cargar: (c) => c.ensureQueryData({
        queryKey: queryKeys.cumplimiento.adjuntos(orgId),
        queryFn: () => listarAdjuntosDeObligaciones(orgId),
      }),
    },
  ]
}

/**
 * Baja todo a la caché, **una pieza detrás de otra** y sin abortar por un fallo.
 * Los mismos motivos que `precargarAuditoria()`: con media barra de señal, siete
 * consultas simultáneas se estorban, y lo que falló se dice por su nombre.
 */
export async function precargarRecorrido(
  cliente: QueryClient,
  orgId: string,
  alAvanzar?: (etiqueta: string) => void,
): Promise<ResultadoPrecarga> {
  const piezas = piezasDelRecorrido(orgId)
  const fallos: ResultadoPrecarga['fallos'] = []
  let listas = 0

  for (const pieza of piezas) {
    alAvanzar?.(pieza.etiqueta)
    try {
      await pieza.cargar(cliente)
      listas += 1
    } catch (problema) {
      const { mensajeDeError } = await import('@/lib/supabase/errores')
      fallos.push({ etiqueta: pieza.etiqueta, motivo: mensajeDeError(problema) })
    }
  }

  return { listas, total: piezas.length, fallos }
}

/**
 * ¿Está este cliente listo para recorrerse sin señal?
 *
 * ⚠️ **Se contesta mirando la CACHÉ**, no un `useState`: con un booleano en el
 * componente, salir de la pestaña y volver diría «descarga antes de entrar» con
 * todo bajado, y en la puerta de una planta eso hace que alguien se dé la
 * vuelta (docs/13 §7).
 */
export function faltaPorPrecargarRecorrido(cliente: QueryClient, orgId: string): string[] {
  return piezasDelRecorrido(orgId)
    .filter((pieza) => pieza.claves.some((clave) => cliente.getQueryData(clave) === undefined))
    .map((pieza) => pieza.etiqueta)
}
