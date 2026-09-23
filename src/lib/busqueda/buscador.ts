/**
 * El buscador global [F06·B4]: qué es cada resultado, a dónde lleva, y cómo se
 * busca **sin señal**.
 *
 * ⚠️ **Dos caminos, y el segundo es el que hace que sirva en la planta.** Con
 * señal pregunta a `buscar_global()`, que ve toda la cartera. Sin señal —o
 * mientras esa respuesta llega— busca en **las listas que ya están en la
 * caché** (`buscarEnCache()`): la cartera, los proyectos, las auditorías, los
 * hallazgos y las acciones de toda la cartera, más los documentos y las
 * obligaciones de cada cliente que se haya abierto. Es la regla 7 del offline
 * llevada al buscador: sin esto, en un sótano el buscador saldría vacío y el
 * auditor concluiría que la app perdió sus datos.
 *
 * ⚠️ **Sin claves nuevas**: `buscarEnCache()` sólo LEE lo que otras pantallas
 * ya bajaron, con `getQueryData`. No dispara ninguna consulta.
 *
 * Y siempre, con señal o sin ella, **las pantallas de la app**: en el teléfono,
 * Sistemas, Capacitación y Admin no caben en la barra inferior, y viven aquí.
 */

import type { QueryClient } from '@tanstack/react-query'
import type { ComponentType } from 'react'
import { queryKeys } from '@/lib/query/keys'
import { DESTINOS } from '@/lib/navegacion'
import { normalizar } from '@/lib/utils/texto'
import { etiquetaDe, ESTADOS_ORGANIZACION, ESTADOS_PROYECTO, type Opcion } from '@/lib/cartera/catalogos'
import { ESTADOS_DOCUMENTO } from '@/lib/sistemas/catalogos'
import { ESTADOS_AUDITORIA, ESTADOS_HALLAZGO } from '@/lib/auditorias/catalogos'
import { ESTADOS_ACCION } from '@/lib/acciones/catalogos'
import { ESTADOS_CUMPLIMIENTO } from '@/lib/cumplimiento/catalogos'
import type { ResultadoBusqueda } from '@/lib/queries/busqueda'
import type { OrganizacionEnLista } from '@/lib/queries/cartera'
import type { ProyectoEnCartera } from '@/lib/queries/proyectos'
import type { AuditoriaEnLista } from '@/lib/queries/auditorias'
import type { HallazgoEnCartera } from '@/lib/queries/hallazgos'
import type { AccionEnCartera } from '@/lib/queries/acciones'
import type { DocumentoEnLista } from '@/lib/queries/documentos'
import type { ObligacionConContexto } from '@/lib/queries/obligaciones'
import {
  IconoAcciones,
  IconoAlerta,
  IconoAuditorias,
  IconoCartera,
  IconoCumplimiento,
  IconoDocumento,
  IconoProceso,
} from '@/components/ui/Iconos'

type Icono = ComponentType<{ size?: number }>

type TipoResultado = {
  etiqueta: string
  /** El título del grupo en la lista de resultados. */
  grupo: string
  Icono: Icono
  estados: readonly Opcion[]
}

/**
 * Los siete tipos que devuelve `buscar_global()`, en el orden en que se
 * agrupan: de lo más grande a lo más fino.
 */
export const TIPOS_RESULTADO: Readonly<Record<string, TipoResultado>> = {
  organizacion: { etiqueta: 'Cliente', grupo: 'Clientes', Icono: IconoCartera, estados: ESTADOS_ORGANIZACION },
  proyecto: { etiqueta: 'Proyecto', grupo: 'Proyectos', Icono: IconoProceso, estados: ESTADOS_PROYECTO },
  auditoria: { etiqueta: 'Auditoría', grupo: 'Auditorías', Icono: IconoAuditorias, estados: ESTADOS_AUDITORIA },
  hallazgo: { etiqueta: 'Hallazgo', grupo: 'Hallazgos', Icono: IconoAlerta, estados: ESTADOS_HALLAZGO },
  accion: { etiqueta: 'Acción', grupo: 'Acciones', Icono: IconoAcciones, estados: ESTADOS_ACCION },
  documento: { etiqueta: 'Documento', grupo: 'Documentos', Icono: IconoDocumento, estados: ESTADOS_DOCUMENTO },
  obligacion: { etiqueta: 'Obligación', grupo: 'Obligaciones', Icono: IconoCumplimiento, estados: ESTADOS_CUMPLIMIENTO },
}

export const ORDEN_TIPOS = Object.keys(TIPOS_RESULTADO)

/**
 * El tipo de un resultado. ⚠️ **Nunca `undefined`** (CLAUDE.md · trampas
 * heredadas): un tipo nuevo en la vista que el código no conozca se pinta
 * crudo, no tumba la lista entera.
 */
export function tipoDe(tipo: string): TipoResultado {
  return TIPOS_RESULTADO[tipo] ?? { etiqueta: tipo, grupo: tipo, Icono: IconoDocumento, estados: [] }
}

export function estadoLegible(r: Pick<ResultadoBusqueda, 'tipo' | 'estado'>): string | null {
  return r.estado ? etiquetaDe(tipoDe(r.tipo).estados, r.estado) : null
}

/**
 * A dónde lleva cada resultado. Todos son enlaces a pantallas que ya existen,
 * con el parámetro que abre la ficha: `?proyecto=`, `?documento=`,
 * `?hallazgo=`, `?accion=`, `?obligacion=` (§2.1: sin rutas nuevas).
 */
export function enlaceDe(r: Pick<ResultadoBusqueda, 'tipo' | 'id' | 'org_id' | 'auditoria_id'>): string {
  const q = (params: Record<string, string>) => new URLSearchParams(params).toString()
  switch (r.tipo) {
    case 'organizacion':
      return `/cartera/${r.id}`
    case 'proyecto':
      return `/cartera/${r.org_id}?${q({ tab: 'proyectos', proyecto: r.id })}`
    case 'documento':
      return `/sistemas?${q({ tab: 'documentos', org: r.org_id, documento: r.id })}`
    case 'auditoria':
      return `/auditorias/${r.id}`
    case 'hallazgo':
      // Su expediente vive en su auditoría. Una NC que nació de una queja no
      // tiene auditoría: se ve desde la queja que la levantó.
      return r.auditoria_id
        ? `/auditorias/${r.auditoria_id}?${q({ tab: 'hallazgos', hallazgo: r.id })}`
        : `/acciones?${q({ tab: 'quejas' })}`
    case 'accion':
      return `/acciones?${q({ tab: 'acciones', accion: r.id })}`
    case 'obligacion':
      return `/cumplimiento?${q({ tab: 'matriz', org: r.org_id, obligacion: r.id })}`
    default:
      return '/'
  }
}

// ─────────────────────────────────────────────────────────── en memoria ──

/** Las palabras de lo tecleado, sin acentos, partidas igual que en la base. */
function palabras(texto: string): string[] {
  return normalizar(texto).split(/[^a-z0-9]+/).filter(Boolean)
}

/**
 * La misma regla que `buscar_global()`: **cada palabra tecleada tiene que ser
 * el principio de alguna palabra** del texto. Así con y sin señal «aceros
 * calibr» encuentra lo mismo, y el buscador no cambia de criterio al pasar un
 * túnel.
 */
function casa(buscadas: string[], ...campos: (string | null | undefined)[]): boolean {
  const del = new Set(palabras(campos.filter(Boolean).join(' ')))
  const lista = [...del]
  return buscadas.every((b) => lista.some((p) => p.startsWith(b)))
}

type Sin = Omit<ResultadoBusqueda, 'rango' | 'actualizado_en'> & { actualizado_en: string }

function nombreOrg(o: { razon_social: string; nombre_comercial: string | null } | null | undefined): string {
  return o ? o.nombre_comercial ?? o.razon_social : ''
}

/**
 * Buscar en lo que ya está en la caché de este aparato. **No consulta nada.**
 *
 * Devuelve la misma forma que la RPC (con `rango` 0) para que la pantalla no
 * distinga de dónde vino cada fila — sólo dice, arriba, que la búsqueda fue
 * sobre lo descargado.
 */
export function buscarEnCache(cliente: QueryClient, texto: string, limite = 40): ResultadoBusqueda[] {
  const buscadas = palabras(texto)
  if (buscadas.length === 0) return []

  const salida: Sin[] = []
  const orgs = cliente.getQueryData<OrganizacionEnLista[]>(queryKeys.cartera.organizaciones()) ?? []
  const porId = new Map(orgs.map((o) => [o.id, o]))

  for (const o of orgs) {
    if (casa(buscadas, o.razon_social, o.nombre_comercial, o.rfc, o.giro)) {
      salida.push({
        tipo: 'organizacion', id: o.id, org_id: o.id, organizacion: nombreOrg(o), folio: o.rfc ?? '',
        titulo: nombreOrg(o), detalle: o.razon_social, auditoria_id: '', estado: o.estado, actualizado_en: o.actualizado_en,
      })
    }
  }

  for (const p of cliente.getQueryData<ProyectoEnCartera[]>(queryKeys.cartera.proyectos()) ?? []) {
    const org = nombreOrg(p.organizacion)
    if (casa(buscadas, p.nombre, p.objetivo, p.organizacion?.razon_social, p.organizacion?.nombre_comercial)) {
      salida.push({
        tipo: 'proyecto', id: p.id, org_id: p.org_id, organizacion: org, folio: '',
        titulo: p.nombre, detalle: p.objetivo ?? '', auditoria_id: '', estado: p.estado, actualizado_en: p.actualizado_en,
      })
    }
  }

  for (const a of cliente.getQueryData<AuditoriaEnLista[]>(queryKeys.auditorias.lista()) ?? []) {
    if (casa(buscadas, a.folio, a.titulo, a.alcance, a.objetivo, a.organizacion?.razon_social, a.organizacion?.nombre_comercial)) {
      salida.push({
        tipo: 'auditoria', id: a.id, org_id: a.org_id, organizacion: nombreOrg(a.organizacion), folio: a.folio ?? '',
        titulo: a.titulo, detalle: a.alcance ?? '', auditoria_id: '', estado: a.estado, actualizado_en: a.actualizado_en,
      })
    }
  }

  for (const h of cliente.getQueryData<HallazgoEnCartera[]>(queryKeys.auditorias.hallazgosDeLaCartera()) ?? []) {
    if (casa(buscadas, h.folio, h.descripcion, h.requisito_incumplido, h.evidencia_objetiva,
      h.organizacion?.razon_social, h.organizacion?.nombre_comercial)) {
      salida.push({
        tipo: 'hallazgo', id: h.id, org_id: h.org_id, organizacion: nombreOrg(h.organizacion), folio: h.folio,
        titulo: h.descripcion, detalle: h.requisito_incumplido ?? '', auditoria_id: h.auditoria_id ?? '',
        estado: h.estado, actualizado_en: h.actualizado_en,
      })
    }
  }

  for (const ac of cliente.getQueryData<AccionEnCartera[]>(queryKeys.acciones.lista()) ?? []) {
    if (casa(buscadas, ac.folio, ac.folio_cliente, ac.descripcion, ac.organizacion?.razon_social, ac.organizacion?.nombre_comercial)) {
      salida.push({
        tipo: 'accion', id: ac.id, org_id: ac.org_id, organizacion: nombreOrg(ac.organizacion),
        folio: ac.folio_cliente ?? ac.folio, titulo: ac.descripcion,
        detalle: [ac.folio, ac.folio_cliente].filter(Boolean).join(' · '), auditoria_id: '',
        estado: ac.estado, actualizado_en: ac.actualizado_en,
      })
    }
  }

  // Documentos y obligaciones se bajan POR CLIENTE: se recorre cada lista que
  // haya en la caché. La clave es `[dominio, lista, orgId]`; `por-aprobar` es
  // hermana con otra forma y se salta.
  for (const [clave, docs] of cliente.getQueriesData<DocumentoEnLista[]>({ queryKey: ['sistemas', 'documentos'] })) {
    if (clave.length !== 3 || clave[2] === 'por-aprobar' || !Array.isArray(docs)) continue
    for (const d of docs) {
      const o = porId.get(d.org_id)
      if (casa(buscadas, d.codigo, d.titulo, o?.razon_social, o?.nombre_comercial)) {
        salida.push({
          tipo: 'documento', id: d.id, org_id: d.org_id, organizacion: nombreOrg(o), folio: d.codigo,
          titulo: d.titulo, detalle: '', auditoria_id: '', estado: d.estado, actualizado_en: d.actualizado_en,
        })
      }
    }
  }

  for (const [clave, obs] of cliente.getQueriesData<ObligacionConContexto[]>({ queryKey: ['cumplimiento', 'obligaciones'] })) {
    if (clave.length !== 3 || !Array.isArray(obs)) continue
    for (const ob of obs) {
      const o = porId.get(ob.org_id)
      if (casa(buscadas, ob.elemento, ob.obligacion, ob.fuente, o?.razon_social, o?.nombre_comercial)) {
        salida.push({
          tipo: 'obligacion', id: ob.id, org_id: ob.org_id, organizacion: nombreOrg(o), folio: '',
          titulo: ob.elemento || ob.obligacion.slice(0, 120), detalle: ob.fuente ?? '', auditoria_id: '',
          estado: ob.estado_cumplimiento ?? '', actualizado_en: ob.actualizado_en,
        })
      }
    }
  }

  return salida
    .sort((a, b) => b.actualizado_en.localeCompare(a.actualizado_en))
    .slice(0, limite)
    .map((r) => ({ ...r, rango: 0 }))
}

/** Las pantallas de la app cuyo nombre empieza como lo tecleado. */
export function buscarDestinos(texto: string) {
  const buscadas = palabras(texto)
  if (buscadas.length === 0) return []
  return DESTINOS.filter((d) => d.href !== '/' && casa(buscadas, d.etiqueta, d.etiquetaCorta))
}
