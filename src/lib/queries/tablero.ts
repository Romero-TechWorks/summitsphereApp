/**
 * Consultas del tablero: el orden de los widgets de cada persona.
 */

import { createClient } from '@/lib/supabase/client'
import { exigirFilas } from '@/lib/supabase/errores'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'

export async function obtenerOrdenTablero(usuarioId: string): Promise<string[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('preferencias_tablero')
    .select('orden')
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (error) throw error
  // Sin fila todavía: el orden de fábrica del catálogo.
  return data?.orden ?? []
}

/**
 * Guarda el orden. `upsert` porque la primera vez que alguien arrastra un widget
 * su fila de preferencias todavía no existe.
 *
 * Pasa por `offlineWrite` como cualquier otra escritura de la app. Reordenar el
 * tablero sin señal no es un caso de uso urgente — pero es la prueba de punta a
 * punta de que la cola, la caché y el RLS funcionan juntos, que es justo para lo
 * que existe este bloque.
 */
export async function guardarOrdenTablero(
  usuarioId: string,
  orden: string[],
): Promise<ResultadoEscritura<string[]>> {
  return offlineWrite<string[]>({
    tabla: 'preferencias_tablero',
    operacion: 'upsert',
    etiqueta: 'Orden del tablero',
    valores: { usuario_id: usuarioId, orden },
    online: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('preferencias_tablero')
        .upsert({ usuario_id: usuarioId, orden })
        .select('orden')

      if (error) throw error
      // ⚠️ Cero filas aquí significaría que el RLS rechazó la escritura sin
      // decirlo. Ver `exigirFilas`.
      return exigirFilas(data, 'Orden del tablero')[0].orden
    },
    offline: orden,
  })
}
