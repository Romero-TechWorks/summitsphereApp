/**
 * Los catálogos de la cartera, en un solo archivo.
 *
 * ⚠️ TRAMPA HEREDADA — CLAUDE.md. **Un catálogo indexado por un valor que viene
 * de la base nunca devuelve `undefined`.** En JDM Built, un
 * `TIPOS[fila.tipo].color` con un valor inesperado no rompía una fila: rompía la
 * pantalla entera, porque las filas se pintan **en bucle** y un solo registro
 * raro se llevaba los cuarenta. Aquí se lee siempre con `etiquetaDe()` y
 * `tonoDe()`, que degradan enseñando el valor crudo.
 *
 * ⚠️ Estas listas son la traducción a TypeScript de los `CHECK` de la migración
 * `20260821180000_cartera_y_proyectos.sql`. **Si cambia un CHECK, cambia esta
 * lista en el mismo commit** — igual que `src/lib/auth/roles.ts` con los roles.
 * El tipo de TypeScript es una promesa sobre ese texto, no una garantía.
 */

/** Los tonos de `ui/Badge`. Se declara aquí para no atar `lib/` a un componente. */
export type TonoEstado = 'neutro' | 'exito' | 'info' | 'advertencia' | 'error'

export type Opcion = {
  /** Lo que guarda la base. */
  valor: string
  /** Lo que lee una persona. */
  etiqueta: string
  tono?: TonoEstado
}

/** `organizaciones.estado` */
export const ESTADOS_ORGANIZACION: readonly Opcion[] = [
  { valor: 'prospecto', etiqueta: 'Prospecto', tono: 'info' },
  { valor: 'activo',    etiqueta: 'Activo',    tono: 'exito' },
  { valor: 'pausado',   etiqueta: 'Pausado',   tono: 'advertencia' },
  { valor: 'cerrado',   etiqueta: 'Cerrado',   tono: 'neutro' },
]

/** `organizaciones.tamano` */
export const TAMANOS_ORGANIZACION: readonly Opcion[] = [
  { valor: 'micro',    etiqueta: 'Micro (1–10)' },
  { valor: 'pequena',  etiqueta: 'Pequeña (11–50)' },
  { valor: 'mediana',  etiqueta: 'Mediana (51–250)' },
  { valor: 'grande',   etiqueta: 'Grande (más de 250)' },
]

/** `sitios.tipo` */
export const TIPOS_SITIO: readonly Opcion[] = [
  { valor: 'planta',    etiqueta: 'Planta' },
  { valor: 'oficina',   etiqueta: 'Oficina' },
  { valor: 'almacen',   etiqueta: 'Almacén' },
  { valor: 'obra',      etiqueta: 'Obra' },
  { valor: 'sucursal',  etiqueta: 'Sucursal' },
]

/**
 * `contactos.papel`
 *
 * No es burocracia: el representante de la dirección firma el acta de apertura
 * de una auditoría, y al responsable de seguridad es a quien se le pide la
 * evidencia de una NOM.
 */
export const PAPELES_CONTACTO: readonly Opcion[] = [
  { valor: 'representante_direccion', etiqueta: 'Representante de la dirección' },
  { valor: 'coordinador_sgc',         etiqueta: 'Coordinador del SGC' },
  { valor: 'responsable_seguridad',   etiqueta: 'Responsable de seguridad' },
  { valor: 'contacto_comercial',      etiqueta: 'Contacto comercial' },
  { valor: 'otro',                    etiqueta: 'Otro' },
]

/**
 * `usuarios_organizaciones.papel` — **quién de la firma toca este expediente**.
 *
 * ⚠️ `lectura` no es decorativo: desde la migración de la Fase 01, la función
 * `puedo_editar_org()` deja fuera de toda escritura a quien tenga este papel.
 * Ve el expediente y no lo modifica.
 */
export const PAPELES_EQUIPO: readonly Opcion[] = [
  { valor: 'lider',    etiqueta: 'Líder',   tono: 'exito' },
  { valor: 'apoyo',    etiqueta: 'Apoyo' },
  { valor: 'auditor',  etiqueta: 'Auditor' },
  { valor: 'lectura',  etiqueta: 'Sólo lectura', tono: 'neutro' },
]

/** `proyectos.tipo` — los cinco servicios de la firma, más el soporte. */
export const TIPOS_PROYECTO: readonly Opcion[] = [
  { valor: 'implementacion',  etiqueta: 'Implementación' },
  { valor: 'auditoria',       etiqueta: 'Auditoría' },
  { valor: 'capacitacion',    etiqueta: 'Capacitación' },
  { valor: 'cumplimiento',    etiqueta: 'Cumplimiento normativo' },
  { valor: 'automatizacion',  etiqueta: 'Automatización' },
  { valor: 'soporte_it',      etiqueta: 'Soporte IT' },
]

/**
 * `proyectos.etapa` — **las seis de la metodología de Summit, en orden**.
 *
 * ⚠️ El orden de esta lista no es cosmético: es el embudo de la firma. La
 * pantalla del proyecto pinta el avance contando desde aquí, y el widget
 * «Embudo de proyectos» del tablero [F01·B3] agrupa en este mismo orden. Meter
 * una etapa nueva en medio cambia las dos cosas — y exige una migración, porque
 * es un `CHECK`.
 */
export const ETAPAS_PROYECTO: readonly Opcion[] = [
  { valor: 'diagnostico',        etiqueta: 'Diagnóstico' },
  { valor: 'planificacion',      etiqueta: 'Planificación' },
  { valor: 'documentacion',      etiqueta: 'Documentación y capacitación' },
  { valor: 'implementacion',     etiqueta: 'Implementación y seguimiento' },
  { valor: 'auditoria_interna',  etiqueta: 'Auditoría interna' },
  { valor: 'certificacion',      etiqueta: 'Certificación y soporte' },
]

/** `proyectos.estado` */
export const ESTADOS_PROYECTO: readonly Opcion[] = [
  { valor: 'propuesta',  etiqueta: 'Propuesta',  tono: 'info' },
  { valor: 'activo',     etiqueta: 'Activo',     tono: 'exito' },
  { valor: 'pausado',    etiqueta: 'Pausado',    tono: 'advertencia' },
  { valor: 'cerrado',    etiqueta: 'Cerrado',    tono: 'neutro' },
  { valor: 'cancelado',  etiqueta: 'Cancelado',  tono: 'error' },
]

/**
 * En qué número de etapa va un proyecto, de 1 a 6.
 *
 * ⚠️ Devuelve `0` para una etapa que el código no conoce, **nunca `-1`**: quien
 * lo pinta lo usa para contar cuántos pasos están cumplidos, y un `-1` haría un
 * avance negativo en pantalla en vez de un proyecto sin empezar.
 */
export function numeroDeEtapa(etapa: string | null | undefined): number {
  if (!etapa) return 0
  const indice = ETAPAS_PROYECTO.findIndex((e) => e.valor === etapa)
  return indice < 0 ? 0 : indice + 1
}

/**
 * La etiqueta de un valor. **Nunca `undefined`**: un valor que el código no
 * conoce se enseña tal cual vino de la base.
 */
export function etiquetaDe(catalogo: readonly Opcion[], valor: string | null | undefined): string {
  if (!valor) return '—'
  return catalogo.find((o) => o.valor === valor)?.etiqueta ?? valor
}

/** El tono de un valor. Lo que no está en el catálogo va en neutro, no revienta. */
export function tonoDe(catalogo: readonly Opcion[], valor: string | null | undefined): TonoEstado {
  if (!valor) return 'neutro'
  return catalogo.find((o) => o.valor === valor)?.tono ?? 'neutro'
}
