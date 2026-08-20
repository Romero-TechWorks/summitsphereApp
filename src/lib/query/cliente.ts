/**
 * El `QueryClient` de la aplicación, con los ajustes que importan cuando no hay
 * señal.
 */

import { QueryClient } from '@tanstack/react-query'

export function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * ⚠️ **El ajuste que decide si la app sirve en una planta.** Con el
         * `networkMode` por defecto (`'online'`), React Query no ejecuta nada
         * sin conexión: deja la consulta en `paused` y **no entrega la caché**.
         * La pantalla se queda cargando para siempre con los datos ahí al lado.
         * `'offlineFirst'` intenta igual, y lo que hay en caché se pinta.
         */
        networkMode: 'offlineFirst',

        /** Cinco minutos: lo que dura una vuelta por el almacén sin refrescar. */
        staleTime: 5 * 60 * 1000,

        /**
         * ⚠️ Tiene que ser MAYOR que el `MAX_EDAD` de la persistencia. Si React
         * Query recoge la basura antes, al restaurar se hidrata una caché que se
         * borra sola en el siguiente ciclo y el offline dura lo que dure la
         * pestaña abierta.
         */
        gcTime: 14 * 24 * 60 * 60 * 1000,

        retry: 2,

        /**
         * Sin refrescar al volver la ventana al frente: en un teléfono eso pasa
         * cada vez que se desbloquea la pantalla, y cada refresco es batería y
         * datos móviles de alguien que está trabajando en campo. Lo que tiene
         * que estar fresco se invalida a mano después de escribir.
         */
        refetchOnWindowFocus: false,
      },
      mutations: {
        networkMode: 'offlineFirst',
      },
    },
  })
}
