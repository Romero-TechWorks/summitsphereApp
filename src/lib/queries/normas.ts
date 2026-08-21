/**
 * El catálogo de normas: leerlo e importarlo [F01·B2b].
 *
 * ⚠️ **La importación es una excepción consciente a `offlineWrite`**, la tercera
 * del proyecto junto a los adjuntos y el link del portal. Tres motivos: parte de
 * un archivo que sólo existe en esa pantalla, escribe cientos de filas en lote
 * —la cola es para una operación a la vez, en orden— y sólo la hace un socio
 * sentado frente a su computadora, nunca un auditor en un sótano. Sin conexión,
 * la pantalla lo dice y no deja empezar.
 */

import { createClient } from '@/lib/supabase/client'
import { exigirFilas } from '@/lib/supabase/errores'
import type { Analisis, NormaAnalizada } from '@/lib/normas/importador'
import type { Tables } from '@/types/database'

export type Norma = Tables<'normas'>
export type Clausula = Tables<'norma_clausulas'>

export type NormaConClausulas = Norma & { clausulas: Clausula[] }

/** El catálogo entero, con su árbol, ordenado como venía en el archivo. */
export async function listarNormasConClausulas(): Promise<NormaConClausulas[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('normas')
    .select('*, clausulas:norma_clausulas(*)')
    .order('nombre')

  if (error) throw error

  // El orden de las cláusulas se resuelve aquí y no en la consulta: ordenar una
  // tabla embebida depende de la versión de PostgREST, y `orden` ya viene en la
  // fila. Ordenar por `numero` como texto pondría «10.3» antes que «2.1».
  return ((data ?? []) as NormaConClausulas[]).map((norma) => ({
    ...norma,
    clausulas: [...(norma.clausulas ?? [])].sort((a, b) => a.orden - b.orden),
  }))
}

// ═══════════════════════════════════════════════════════════ vista previa ══

export type CambiosDeNorma = {
  clave: string
  nombre: string
  esNueva: boolean
  /** Cláusulas del archivo que no están en la base. */
  nuevas: number
  /** Las que están, con el título, el resumen o el «auditable» distinto. */
  cambiadas: number
  /** Las que están activas en la base y ya no vienen en el archivo. */
  salen: number
  /** Las que llegan iguales: ni se tocan. */
  igual: number
}

/**
 * Qué haría la importación, **antes de escribir nada**.
 *
 * ⚠️ Es la mitad del bloque. Un importador que escribe y después informa es un
 * importador en el que nadie confía la segunda vez: el catálogo es el criterio
 * técnico de la firma, y sustituirlo a ciegas por lo que traiga un archivo
 * —que puede venir de un `Guardar como` a medias— no es aceptable. Aquí se
 * enseña el saldo y **decide una persona**.
 */
export async function previsualizarImportacion(analisis: Analisis): Promise<CambiosDeNorma[]> {
  const supabase = createClient()
  const claves = analisis.normas.map((n) => n.clave)

  const { data: normasBd, error: falloNormas } = await supabase
    .from('normas')
    .select('id, clave')
    .in('clave', claves)

  if (falloNormas) throw falloNormas

  const porClave = new Map((normasBd ?? []).map((n) => [n.clave, n.id]))
  const ids = (normasBd ?? []).map((n) => n.id)

  const { data: clausulasBd, error: falloClausulas } = ids.length
    ? await supabase
        .from('norma_clausulas')
        .select('id, norma_id, numero, titulo, resumen, auditable, activa')
        .in('norma_id', ids)
    : { data: [], error: null }

  if (falloClausulas) throw falloClausulas

  return analisis.normas.map((norma) => {
    const normaId = porClave.get(norma.clave)
    const enBase = (clausulasBd ?? []).filter((c) => c.norma_id === normaId)
    const porNumero = new Map(enBase.map((c) => [c.numero, c]))
    const delArchivo = new Set(norma.clausulas.map((c) => c.numero))

    let nuevas = 0
    let cambiadas = 0
    let igual = 0

    for (const clausula of norma.clausulas) {
      const previa = porNumero.get(clausula.numero)
      if (!previa) {
        nuevas++
        continue
      }

      const cambia =
        previa.titulo !== clausula.titulo ||
        (previa.resumen ?? null) !== (clausula.resumen ?? null) ||
        previa.auditable !== clausula.auditable ||
        // Una cláusula que estaba dada de baja y vuelve a aparecer también es un
        // cambio: la importación la reactiva.
        previa.activa === false

      if (cambia) cambiadas++
      else igual++
    }

    const salen = enBase.filter((c) => c.activa && !delArchivo.has(c.numero)).length

    return {
      clave: norma.clave,
      nombre: norma.nombre,
      esNueva: normaId === undefined,
      nuevas,
      cambiadas,
      salen,
      igual,
    }
  })
}

// ═══════════════════════════════════════════════════════════ importación ══

export type ResumenImportacion = {
  normas: number
  clausulas: number
  desactivadas: number
}

/**
 * Escribe el catálogo.
 *
 * Es **idempotente**: `upsert` por `clave` en las normas y por
 * `(norma_id, numero)` en las cláusulas. Subir dos veces el mismo archivo deja
 * la base igual; subirlo corregido corrige. Eso es lo que convierte la tarea
 * `C01` del dueño —validar el criterio técnico— en algo que se puede hacer en
 * varias tardes sin miedo.
 *
 * ⚠️ **Las cláusulas se escriben por nivel de profundidad, de arriba abajo.**
 * `8.5.1` necesita el `id` de `8.5` para su `padre_id`, así que cuando le toca
 * su turno el padre ya está escrito y su id está en el mapa. Hacerlo en un solo
 * lote obligaría a una segunda pasada para colgar los padres.
 *
 * ⚠️ **Lo que ya no viene en el archivo NO se borra: se marca `activa = false`.**
 * Puede haber hallazgos citando esa cláusula, y un hallazgo sin cláusula no es
 * un hallazgo (CLAUDE.md regla 13).
 */
export async function importarCatalogo(analisis: Analisis): Promise<ResumenImportacion> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error(
      'La importación del catálogo necesita conexión: son cientos de filas en lote y no pasan por la cola de salida.',
    )
  }

  const supabase = createClient()
  let clausulasEscritas = 0
  let desactivadas = 0

  for (const norma of analisis.normas) {
    const { data: filaNorma, error: falloNorma } = await supabase
      .from('normas')
      .upsert(
        {
          clave: norma.clave,
          nombre: norma.nombre,
          version: norma.version,
          titulo: norma.titulo,
          activa: true,
        },
        { onConflict: 'clave' },
      )
      .select('id')

    if (falloNorma) throw falloNorma
    // ⚠️ Cero filas aquí es el RLS diciendo que no: `normas` sólo la escribe un
    // socio. Sin esto, la pantalla diría "importado" y no habría nada.
    const normaId = exigirFilas(filaNorma, `Importar ${norma.nombre}`)[0].id

    const idsPorNumero = new Map<string, string>()
    const niveles = agruparPorProfundidad(norma)

    for (const nivel of niveles) {
      const filas = nivel.map((clausula) => ({
        norma_id: normaId,
        numero: clausula.numero,
        titulo: clausula.titulo,
        resumen: clausula.resumen,
        auditable: clausula.auditable,
        orden: clausula.orden,
        padre_id: clausula.padre ? idsPorNumero.get(clausula.padre) ?? null : null,
        activa: true,
      }))

      const { data, error } = await supabase
        .from('norma_clausulas')
        .upsert(filas, { onConflict: 'norma_id,numero' })
        .select('id, numero')

      if (error) throw error
      const escritas = exigirFilas(data, `Cláusulas de ${norma.nombre}`)
      for (const fila of escritas) idsPorNumero.set(fila.numero, fila.id)
      clausulasEscritas += escritas.length
    }

    // Lo que ya no viene en el archivo se da de baja, no se borra.
    const { data: sobrantes, error: falloSobrantes } = await supabase
      .from('norma_clausulas')
      .select('id, numero')
      .eq('norma_id', normaId)
      .eq('activa', true)

    if (falloSobrantes) throw falloSobrantes

    const delArchivo = new Set(norma.clausulas.map((c) => c.numero))
    const aDesactivar = (sobrantes ?? []).filter((c) => !delArchivo.has(c.numero)).map((c) => c.id)

    if (aDesactivar.length > 0) {
      const { data, error } = await supabase
        .from('norma_clausulas')
        .update({ activa: false })
        .in('id', aDesactivar)
        .select('id')

      if (error) throw error
      desactivadas += exigirFilas(data, 'Baja de cláusulas').length
    }
  }

  return { normas: analisis.normas.length, clausulas: clausulasEscritas, desactivadas }
}

/** Las cláusulas por profundidad de número: `4` antes que `4.1` antes que `4.1.2`. */
function agruparPorProfundidad(norma: NormaAnalizada) {
  const porNivel = new Map<number, NormaAnalizada['clausulas']>()

  for (const clausula of norma.clausulas) {
    const nivel = clausula.numero.split('.').length
    const lista = porNivel.get(nivel) ?? []
    lista.push(clausula)
    porNivel.set(nivel, lista)
  }

  return [...porNivel.entries()].sort((a, b) => a[0] - b[0]).map(([, lista]) => lista)
}
