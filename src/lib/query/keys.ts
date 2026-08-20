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
} as const
