/**
 * Los cinco roles de la aplicación, en un solo sitio.
 *
 * ⚠️ `usuarios.rol` es `text` + CHECK, no un enum (docs/03_ARQUITECTURA.md §4.2),
 * así que los tipos generados lo ven como `string`. Esta lista es la traducción
 * a TypeScript de ese CHECK: **si cambia el CHECK en una migración, cambia aquí
 * en el mismo commit**, o el código empezará a creer en un rol que la base
 * rechaza — o a ignorar uno que ya existe.
 *
 * ⚠️ Y nada indexa por rol sin valor por defecto: un rol desconocido degrada,
 * no revienta la pantalla (CLAUDE.md · trampas heredadas).
 */

export const ROLES = ['socio', 'consultor', 'auditor', 'administracion', 'cliente'] as const

export type Rol = (typeof ROLES)[number]

/**
 * Quiénes tienen que pasar por el segundo factor (docs/08_SEGURIDAD_Y_RLS.md §1).
 *
 * Son los que ven la cartera completa: el socio, todo; administración, lo
 * comercial y lo fiscal de todos los clientes. Con una sola contraseña
 * comprometida se va la cartera entera de la firma, no un expediente.
 */
export const ROLES_CON_MFA: readonly Rol[] = ['socio', 'administracion']

/** Si un texto cualquiera —de la base, de un JWT— es uno de los cinco roles. */
export function esRol(valor: string | null | undefined): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor)
}

/** Si ese rol está obligado a tener segundo factor. Un rol que no se reconoce, no. */
export function exigeMfa(rol: string | null | undefined): boolean {
  return esRol(rol) && ROLES_CON_MFA.includes(rol)
}
