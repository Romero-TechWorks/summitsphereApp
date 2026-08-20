/**
 * Cliente PRIVILEGIADO de Supabase. Se salta el RLS por completo.
 *
 * ⚠️ SÓLO en rutas de API bajo `src/app/api/`. Nunca en un componente, nunca en
 * algo con `'use client'`, nunca importado desde un archivo que también se use
 * en el navegador. Un import mal puesto mete la `service_role` en el bundle
 * público, y con esa llave cualquiera lee y escribe la base entera de todos los
 * clientes de la firma sin sesión.
 *
 * Casos legítimos hoy: alta de usuarios, el cron diario, y el portal del cliente
 * —que no tiene sesión y valida su token contra la base—.
 *
 * ⚠️ Cada uso de este cliente escribe en `audit_logs` con el motivo. Un cambio
 * hecho con service_role que nadie puede rastrear no debería existir.
 */

import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { exigirConfigSupabase } from './entorno'

export function createAdminClient() {
  const { url } = exigirConfigSupabase()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY. Es una variable SÓLO DE SERVIDOR: ' +
      'no lleva el prefijo NEXT_PUBLIC_ y no debe llevarlo nunca.',
    )
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
