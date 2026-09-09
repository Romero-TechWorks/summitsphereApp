/**
 * La mitad del navegador del push [F04·B3].
 *
 * ⚠️ **Aquí no se manda nada**: esto sólo consigue el permiso y la suscripción
 * del navegador. Quien empuja es el cron, con la llave privada VAPID, que jamás
 * llega al bundle (regla 5).
 *
 * ⚠️ **Todo esto exige contexto seguro** —HTTPS o `localhost`—, igual que
 * `crypto.randomUUID()` y `MediaRecorder`. Desde una IP de red local el service
 * worker ni se registra, así que `estadoDePush()` devuelve `sin_soporte` y la
 * pantalla lo dice en vez de dejar un botón que no hace nada.
 */

/** En qué punto está este navegador. */
export type EstadoPush =
  /** Ni service worker ni API de push: contexto inseguro o navegador viejo. */
  | 'sin_soporte'
  /** Se puede pedir permiso; nadie lo ha hecho todavía. */
  | 'sin_permiso'
  /** El usuario lo denegó. ⚠️ NO se puede volver a preguntar desde la app. */
  | 'bloqueado'
  /** Permiso dado y suscripción viva. */
  | 'activo'

export function haySoportePush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function estadoDePush(): Promise<EstadoPush> {
  if (!haySoportePush()) return 'sin_soporte'
  if (Notification.permission === 'denied') return 'bloqueado'
  if (Notification.permission === 'default') return 'sin_permiso'

  const registro = await navigator.serviceWorker.ready
  const suscripcion = await registro.pushManager.getSubscription()
  return suscripcion ? 'activo' : 'sin_permiso'
}

/**
 * La llave pública VAPID, de `base64url` a los bytes que espera `subscribe()`.
 *
 * ⚠️ **`atob` no entiende `base64url`.** La llave que genera `web-push` usa `-`
 * y `_` en vez de `+` y `/`, y sin traducirlos el navegador lanza un
 * `InvalidCharacterError` que no menciona la llave por ningún lado.
 */
function llaveABytes(base64url: string): Uint8Array {
  const relleno = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const crudo = atob(base64)
  return Uint8Array.from([...crudo].map((c) => c.charCodeAt(0)))
}

/** Lo que la base necesita guardar de una suscripción. */
export type DatosSuscripcion = {
  endpoint: string
  p256dh: string
  auth: string
  descripcion: string
}

/**
 * Pide permiso y se suscribe.
 *
 * Devuelve lo que hay que guardar, o lanza con un motivo legible — nunca un
 * `catch` vacío: quien pulsa esto está intentando que le llegue un aviso de un
 * vencimiento, y «no se pudo» a secas no le dice si tiene que ir a los ajustes
 * del navegador o volver a intentarlo.
 */
export async function suscribirEsteAparato(): Promise<DatosSuscripcion> {
  if (!haySoportePush()) {
    throw new Error(
      'Este navegador no puede recibir avisos. Hace falta HTTPS: desde una dirección de red local (192.168…) no funciona ni en Chrome.',
    )
  }

  const llave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!llave) {
    throw new Error(
      'Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en el despliegue. Se carga en Vercel y hay que redesplegar: las variables NEXT_PUBLIC_ se incrustan al compilar.',
    )
  }

  const permiso = await Notification.requestPermission()
  if (permiso === 'denied') {
    throw new Error(
      'Bloqueaste los avisos para este sitio. Se vuelve a permitir desde el candado de la barra de direcciones — desde aquí ya no se puede preguntar.',
    )
  }
  if (permiso !== 'granted') {
    throw new Error('No se dio permiso para los avisos.')
  }

  const registro = await navigator.serviceWorker.ready

  // ⚠️ `userVisibleOnly: true` es obligatorio en Chrome: sin él, `subscribe()`
  // rechaza. Y es lo correcto — un push que no enseña nada es rastreo.
  const suscripcion = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: llaveABytes(llave) as BufferSource,
  })

  const json = suscripcion.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth

  if (!p256dh || !auth) {
    throw new Error('El navegador devolvió una suscripción incompleta. Vuelve a intentarlo.')
  }

  return {
    endpoint: suscripcion.endpoint,
    p256dh,
    auth,
    descripcion: describirEsteAparato(),
  }
}

/** Cancela la suscripción del navegador. Devuelve el endpoint que había. */
export async function desuscribirEsteAparato(): Promise<string | null> {
  if (!haySoportePush()) return null

  const registro = await navigator.serviceWorker.ready
  const suscripcion = await registro.pushManager.getSubscription()
  if (!suscripcion) return null

  const endpoint = suscripcion.endpoint
  await suscripcion.unsubscribe()
  return endpoint
}

/** El endpoint de este navegador, si ya está suscrito. */
export async function endpointDeEsteAparato(): Promise<string | null> {
  if (!haySoportePush()) return null
  const registro = await navigator.serviceWorker.ready
  const suscripcion = await registro.pushManager.getSubscription()
  return suscripcion?.endpoint ?? null
}

/**
 * Un nombre reconocible para el aparato.
 *
 * ⚠️ **Es para que una persona distinga cuál es cuál al desactivar uno**, no para
 * identificar nada. Sale del `userAgent`, que miente y cambia — por eso es texto
 * libre y editable, y por eso no se usa para ninguna decisión.
 */
function describirEsteAparato(): string {
  const ua = navigator.userAgent
  const movil = /Android|iPhone|iPad|iPod/i.test(ua)
  const navegador = /Edg\//.test(ua) ? 'Edge'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Navegador'
  const sistema = /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
    : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS/i.test(ua) ? 'Mac'
    : /Linux/i.test(ua) ? 'Linux'
    : ''

  return [navegador, sistema, movil ? '(teléfono)' : ''].filter(Boolean).join(' ')
}
