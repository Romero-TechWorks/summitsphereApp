/**
 * Identificadores generados en el cliente.
 *
 * ⚠️ TRAMPA HEREDADA DE JDM BUILT — CLAUDE.md.
 *
 * `crypto.randomUUID()` **no existe fuera de un contexto seguro**. Está en
 * `https://` y en `localhost`, y NO está cuando se abre la app desde la IP de
 * la máquina en la red local: `http://192.168.1.40:3000`. Que es exactamente
 * cómo se prueba en un teléfono real antes de desplegar.
 *
 * El síntoma no se parece a la causa: `TypeError: crypto.randomUUID is not a
 * function` al intentar guardar cualquier cosa, sólo en el teléfono, sólo en
 * pruebas, y nunca en la laptop de quien lo programó.
 *
 * Aquí se necesita antes que en ningún otro sitio: un hallazgo levantado sin
 * señal nace con su id en el teléfono del auditor, y ese id viaja a la base
 * cuando vuelve la conexión.
 */

/**
 * Un UUID v4. Usa `crypto.randomUUID()` cuando existe y cae a
 * `crypto.getRandomValues()`, que sí está en cualquier contexto.
 */
export function uuid(): string {
  const c = globalThis.crypto

  if (typeof c?.randomUUID === 'function') {
    return c.randomUUID()
  }

  // RFC 4122 v4 a mano sobre 16 bytes aleatorios.
  const bytes = new Uint8Array(16)
  c.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40   // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80   // variante 10xx

  const hex: string[] = []
  for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, '0'))

  return (
    hex.slice(0, 4).join('') + '-' +
    hex.slice(4, 6).join('') + '-' +
    hex.slice(6, 8).join('') + '-' +
    hex.slice(8, 10).join('') + '-' +
    hex.slice(10, 16).join('')
  )
}
