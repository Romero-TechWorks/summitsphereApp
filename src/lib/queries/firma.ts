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
import type { Tables } from '@/types/database'

/**
 * Lo que se imprime en un membrete. **No trae `plantillas` ni
 * `modulos_activos`**: son configuración, pesan, y una consulta que se precarga
 * antes de bajar a un sótano no baja lo que no va a usar.
 */
export type IdentidadFirma = Pick<
  Tables<'config_firma'>,
  'razon_social' | 'rfc' | 'direccion' | 'telefono' | 'correo' | 'logotipo_url'
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
    .select('razon_social, rfc, direccion, telefono, correo, logotipo_url')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}
