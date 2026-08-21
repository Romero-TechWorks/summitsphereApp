/**
 * **Todas** las claves de caché de la aplicación.
 *
 * ⚠️ Una clave inventada dentro de un componente es un dato que no se invalida
 * cuando debe: se guarda un cambio, la pantalla de al lado sigue enseñando lo
 * viejo, y el usuario aprende a no confiar en lo que ve. Si hace falta una
 * clave nueva, se agrega aquí primero (docs/03_ARQUITECTURA.md §8.10).
 *
 * La forma es jerárquica a propósito: `['tablero']` invalida todo el tablero,
 * `['tablero','preferencias', id]` sólo esa fila.
 */

export const queryKeys = {
  usuario: {
    /** El perfil de quien tiene la sesión abierta: su nombre y su rol. */
    actual: () => ['usuario', 'actual'] as const,
  },
  tablero: {
    todo: () => ['tablero'] as const,
    /** El orden en que esta persona acomodó sus widgets. */
    preferencias: (usuarioId: string) => ['tablero', 'preferencias', usuarioId] as const,
  },
  cartera: {
    todo: () => ['cartera'] as const,
    /**
     * Toda la cartera visible, **sin filtrar**.
     *
     * ⚠️ El texto del buscador NO entra en la clave, y es una decisión de
     * offline, no de comodidad: si cada búsqueda fuera su propia consulta al
     * servidor, en una planta sin señal la lista se vaciaría en cuanto se
     * teclea la primera letra —esa clave no está en la caché— y el consultor
     * concluiría que la app perdió a sus clientes. Se descarga la cartera una
     * vez y **el filtro se aplica en memoria**. Son decenas de organizaciones,
     * no millones de filas.
     */
    organizaciones: () => ['cartera', 'organizaciones'] as const,
    organizacion: (id: string) => ['cartera', 'organizacion', id] as const,
    sitios: (orgId: string) => ['cartera', 'sitios', orgId] as const,
    contactos: (orgId: string) => ['cartera', 'contactos', orgId] as const,
    /** El directorio completo: todos los contactos de la cartera. */
    contactosTodos: () => ['cartera', 'contactos', 'todos'] as const,
    /** Quién de la firma tiene asignada esta organización. */
    equipo: (orgId: string) => ['cartera', 'equipo', orgId] as const,
    /** La gente de la firma que se puede asignar a un expediente. */
    usuariosFirma: () => ['cartera', 'usuarios-firma'] as const,
    /** Todos los proyectos visibles, para la pestaña de la cartera. */
    proyectos: () => ['cartera', 'proyectos'] as const,
    /** Los proyectos de una organización, dentro de su expediente. */
    proyectosDe: (orgId: string) => ['cartera', 'proyectos', orgId] as const,
    /** El alcance: qué normas y qué sitios cubre un proyecto. */
    alcanceNormas: (proyectoId: string) => ['cartera', 'alcance', 'normas', proyectoId] as const,
    alcanceSitios: (proyectoId: string) => ['cartera', 'alcance', 'sitios', proyectoId] as const,
  },
  /**
   * El catálogo de normas. Fuera de `cartera` porque no es de nadie: lo usan
   * también los sistemas de gestión [Fase 02] y las auditorías [Fase 03].
   */
  normas: {
    catalogo: () => ['normas', 'catalogo'] as const,
    /** El catálogo con su árbol de cláusulas, para la pantalla de Sistemas. */
    arbol: () => ['normas', 'arbol'] as const,
  },
} as const
