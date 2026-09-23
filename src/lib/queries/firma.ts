/**
 * La identidad de la firma — el membrete de todo lo imprimible.
 *
 * ⚠️ **Por qué esto existe y no se lee `config_firma` a secas donde haga falta.**
 * Esa tabla ya se consultaba en dos sitios (`tareas.ts` y `verificacion.ts`),
 * pero sólo para su columna `plantillas`, sin clave de caché y desde dentro de
 * otra consulta. El informe de auditoría necesita lo otro —la razón social y el
 * logotipo— y lo necesita **en una planta sin señal**: si no está en la caché, el
 * documento que el auditor le enseña al cliente en la reunión de cierre sale sin
 * membrete. Por eso es una consulta propia, con su clave, y entra en
 * `piezasDeLaPrecarga()` [F03·B5].
 *
 * ⚠️ **Sin partición en la clave**, al revés que `plantillaTareas` y
 * `plantillaVerificacion`. Esas dos leen `config_firma.plantillas`, que es un
 * jsonb partido por espacio de nombres (`src/lib/auth/particion.ts`); la
 * identidad de la firma es **la misma** para las dos particiones —Summit se
 * llama igual en la cartera real y en la de demostración— y darle una clave por
 * partición sólo obligaría a bajarla dos veces.
 *
 * Lo comparte todo lo imprimible que viene después: F06·B2 lista ocho
 * entregables más (matriz de requisitos, constancia DC-3, acta de revisión…), y
 * los ocho llevan este mismo membrete.
 */

import { createClient } from '@/lib/supabase/client'
import { exigirFilas } from '@/lib/supabase/errores'
import { offlineWrite, type ResultadoEscritura } from '@/lib/offline/mutate'
import type { Json, Tables } from '@/types/database'

/**
 * Lo que se imprime en un membrete **y los plazos por defecto**. No trae
 * `plantillas` ni `modulos_activos`: son configuración, pesan, y una consulta
 * que se precarga antes de bajar a un sótano no baja lo que no va a usar.
 *
 * ⚠️ **`plazos_default` entró con F06·B3, y es por la misma razón que el
 * membrete**: el formulario del hallazgo propone la fecha compromiso con ellos,
 * y ese formulario se llena en la planta. Una clave aparte sería otra pieza de
 * la precarga que puede faltar; éstos son cuatro números en la misma fila.
 *
 * ⚠️ **Y `logotipo_url` es una imagen INCRUSTADA** (`data:image/png;base64,…`),
 * no un enlace, desde F06·B3: un enlace remoto no carga sin señal y el informe
 * de la reunión de cierre salía sin logo. Ver `src/lib/firma/logotipo.ts`.
 */
export type IdentidadFirma = Pick<
  Tables<'config_firma'>,
  'razon_social' | 'rfc' | 'direccion' | 'telefono' | 'correo' | 'logotipo_url' | 'plazos_default'
>

/**
 * La fila única de `config_firma` (su `check (id = 1)` la impone).
 *
 * Devuelve `null` si no está: la lee cualquiera con sesión, así que un `null`
 * aquí significa que la fila no se ha creado todavía, no que falten permisos. El
 * informe se imprime igual, con el nombre de la firma en blanco — mejor eso que
 * no poder imprimir.
 */
export async function obtenerIdentidadFirma(): Promise<IdentidadFirma | null> {
  const { data, error } = await createClient()
    .from('config_firma')
    .select('razon_social, rfc, direccion, telefono, correo, logotipo_url, plazos_default')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

// ════════════════════════════════════════════════════════════════ escrituras ══

export type DatosFirma = {
  razon_social: string
  rfc: string | null
  direccion: string | null
  telefono: string | null
  correo: string | null
  logotipo_url: string | null
  plazos_default: Json
}

/**
 * Guardar la configuración de la firma [F06·B3].
 *
 * ⚠️ **Sólo un socio**, y lo impone la base (`config_firma_update ... using
 * (es_socio())`), no la pantalla. Sin `.select()` y `exigirFilas`, un
 * consultor que llegara aquí vería «guardado» con cero filas tocadas.
 *
 * Pasa por la cola como todo lo demás: es una fila, y cambiar el teléfono de la
 * firma sin señal no tiene por qué perderse.
 */
export async function actualizarFirma(
  actual: IdentidadFirma | null,
  datos: DatosFirma,
): Promise<ResultadoEscritura<IdentidadFirma>> {
  return offlineWrite<IdentidadFirma>({
    tabla: 'config_firma',
    operacion: 'update',
    etiqueta: 'Configuración de la firma',
    valores: datos,
    filtro: { id: 1 },
    online: async () => {
      const { data, error } = await createClient()
        .from('config_firma')
        .update(datos)
        .eq('id', 1)
        .select('razon_social, rfc, direccion, telefono, correo, logotipo_url, plazos_default')
      if (error) throw error
      // ⚠️ Cero filas en un UPDATE es un rechazo del RLS con cara de éxito.
      return exigirFilas(data, 'Configuración de la firma')[0]
    },
    offline: { ...(actual ?? {}), ...datos },
  })
}
