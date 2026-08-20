/**
 * El catálogo de widgets del tablero.
 *
 * Casi todos dicen todavía "sin datos": la pantalla que llena cada uno llega en
 * su fase. Están aquí igualmente porque el tablero **no es una lista de
 * pendientes**, es la portada de la app — y porque cada rol tiene que abrir
 * viendo lo suyo desde el primer día (docs/06_MODULOS_FUNCIONALES.md).
 *
 * ⚠️ TRAMPA HEREDADA — CLAUDE.md. Un catálogo indexado por un valor que viene de
 * la base **nunca devuelve `undefined`**: aquí se resuelve por búsqueda en el
 * catálogo, así que un id guardado que ya no exista simplemente se ignora. Lo
 * que no puede pasar es que un widget viejo en las preferencias de alguien
 * reviente el tablero entero — y como se pintan en bucle, se lo llevaría todo.
 */

import type { Rol } from '@/lib/auth/roles'

export type Widget = {
  id: string
  titulo: string
  /** Qué va a enseñar. En el lenguaje de la firma, no del programador. */
  descripcion: string
  /** La fase que lo llena de datos. `0` = ya funciona. */
  fase: number
  /** Quién lo ve. Un widget sin rol no lo pinta nadie. */
  roles: readonly Rol[]
}

const TODOS: readonly Rol[] = ['socio', 'consultor', 'auditor', 'administracion', 'cliente']

export const WIDGETS: readonly Widget[] = [
  {
    id: 'esperando_senal',
    titulo: 'Esperando señal',
    descripcion: 'Lo que levantaste sin conexión y todavía no ha subido.',
    fase: 0,
    roles: TODOS,
  },
  {
    id: 'embudo_proyectos',
    titulo: 'Embudo de proyectos',
    descripcion: 'Cuántos proyectos hay en cada una de las seis etapas de la metodología.',
    fase: 1,
    roles: ['socio'],
  },
  {
    id: 'mis_proyectos',
    titulo: 'Mis proyectos',
    descripcion: 'Los clientes que llevas, con su etapa y su próxima entrega.',
    fase: 1,
    roles: ['consultor', 'auditor'],
  },
  {
    id: 'carga_equipo',
    titulo: 'Carga del equipo',
    descripcion: 'Cuántos proyectos abiertos lleva cada consultor de la firma.',
    fase: 1,
    roles: ['socio'],
  },
  {
    id: 'contratos_por_renovar',
    titulo: 'Contratos por renovar',
    descripcion: 'Proyectos cuyo contrato termina en los próximos 60 días.',
    fase: 1,
    roles: ['socio', 'administracion'],
  },
  {
    id: 'documentos_por_aprobar',
    titulo: 'Documentos por aprobar',
    descripcion: 'Lo que está esperando tu firma en el control documental.',
    fase: 2,
    roles: ['consultor', 'socio'],
  },
  {
    id: 'mis_auditorias',
    titulo: 'Mis auditorías',
    descripcion: 'Las que tienes programadas, y cuáles ya puedes trabajar sin señal.',
    fase: 3,
    roles: ['auditor', 'socio'],
  },
  {
    id: 'hallazgos_abiertos',
    titulo: 'Hallazgos abiertos',
    descripcion: 'Lo que levantaste y sigue sin cerrarse, por antigüedad.',
    fase: 3,
    roles: ['auditor', 'consultor', 'socio'],
  },
  {
    id: 'proxima_visita',
    titulo: 'Próxima visita',
    descripcion: 'A dónde vas, cuándo, y qué tienes que llevar preparado.',
    fase: 3,
    roles: ['consultor', 'auditor'],
  },
  {
    id: 'acciones_semana',
    titulo: 'Acciones de la semana',
    descripcion: 'Las acciones correctivas que vencen en los próximos siete días.',
    fase: 4,
    roles: ['consultor', 'socio'],
  },
  {
    id: 'vencimientos_criticos',
    titulo: 'Vencimientos críticos',
    descripcion: 'Obligaciones normativas de la cartera que vencen este mes.',
    fase: 5,
    roles: ['socio', 'consultor'],
  },
]

/**
 * Los widgets de un rol, en el orden que esa persona guardó.
 *
 * Las dos reglas que evitan que una versión nueva le rompa el tablero a nadie:
 * un id guardado que ya no está en el catálogo **se ignora**, y un widget nuevo
 * que todavía no está en sus preferencias **se agrega al final** en vez de
 * desaparecer.
 */
export function widgetsOrdenados(rol: Rol, orden: readonly string[]): Widget[] {
  const disponibles = WIDGETS.filter((w) => w.roles.includes(rol))
  const pendientes = new Map(disponibles.map((w) => [w.id, w]))
  const resultado: Widget[] = []

  for (const id of orden) {
    const widget = pendientes.get(id)
    if (!widget) continue
    resultado.push(widget)
    pendientes.delete(id)
  }

  for (const widget of disponibles) {
    if (pendientes.has(widget.id)) resultado.push(widget)
  }

  return resultado
}
