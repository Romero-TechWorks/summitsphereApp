/**
 * Los destinos de la aplicación, en un solo sitio.
 *
 * El Sidebar (escritorio) y la BottomNav (móvil) leen de aquí. ⚠️ Tenerlo dos
 * veces es cómo terminan divergiendo: se agrega un dominio al menú lateral, se
 * olvida el de abajo, y en el teléfono —que es donde trabaja el auditor— la
 * pantalla nueva no existe.
 *
 * **Los dominios son pestañas, no carpetas** (docs/03_ARQUITECTURA.md §2.1).
 * Agregar una sección es una pestaña más dentro de su dominio, no un destino
 * nuevo aquí.
 */

import type { ComponentType } from 'react'
import {
  IconoInicio,
  IconoCartera,
  IconoSistemas,
  IconoAuditorias,
  IconoCumplimiento,
  IconoCapacitacion,
  IconoAcciones,
  IconoAdmin,
} from '@/components/ui/Iconos'

export type Destino = {
  href: string
  etiqueta: string
  /** Cómo se llama en la barra inferior, donde caben ~10 caracteres. */
  etiquetaCorta: string
  Icono: ComponentType<{ size?: number }>
  /** Fase en la que la pantalla existe de verdad. */
  fase: number
  /** Si aparece en la barra inferior del teléfono. Son cinco y no hay un sexto. */
  enBarraInferior: boolean
}

export const DESTINOS: readonly Destino[] = [
  { href: '/',              etiqueta: 'Inicio',       etiquetaCorta: 'Inicio',   Icono: IconoInicio,        fase: 0, enBarraInferior: true  },
  { href: '/cartera',       etiqueta: 'Cartera',      etiquetaCorta: 'Cartera',  Icono: IconoCartera,       fase: 1, enBarraInferior: true  },
  { href: '/sistemas',      etiqueta: 'Sistemas',     etiquetaCorta: 'Sistemas', Icono: IconoSistemas,      fase: 2, enBarraInferior: false },
  { href: '/auditorias',    etiqueta: 'Auditorías',   etiquetaCorta: 'Auditar',  Icono: IconoAuditorias,    fase: 3, enBarraInferior: true  },
  { href: '/acciones',      etiqueta: 'Acciones',     etiquetaCorta: 'Acciones', Icono: IconoAcciones,      fase: 4, enBarraInferior: true  },
  { href: '/cumplimiento',  etiqueta: 'Cumplimiento', etiquetaCorta: 'Cumplir',  Icono: IconoCumplimiento,  fase: 5, enBarraInferior: true  },
  { href: '/capacitacion',  etiqueta: 'Capacitación', etiquetaCorta: 'Cursos',   Icono: IconoCapacitacion,  fase: 5, enBarraInferior: false },
  { href: '/admin',         etiqueta: 'Admin',        etiquetaCorta: 'Admin',    Icono: IconoAdmin,         fase: 6, enBarraInferior: false },
] as const

/** Los cinco de la barra inferior, en orden. */
export const DESTINOS_BARRA_INFERIOR = DESTINOS.filter((d) => d.enBarraInferior)

/**
 * Si un destino está activo según la ruta actual.
 *
 * `/` sólo casa exacto: sin esto, Inicio se quedaría marcado en todas las
 * pantallas porque toda ruta empieza con `/`.
 */
export function estaActivo(href: string, ruta: string): boolean {
  if (href === '/') return ruta === '/'
  return ruta === href || ruta.startsWith(`${href}/`)
}
