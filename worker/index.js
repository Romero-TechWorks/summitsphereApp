/**
 * Código propio del service worker [F04·B3].
 *
 * `@ducanh2912/next-pwa` compila este archivo aparte y lo importa desde el
 * `sw.js` que genera. Es la única forma de añadir oyentes sin editar código de
 * Workbox, que se sobreescribe en cada build.
 *
 * ⚠️ Este archivo NO es `public/sw.js`. Ése lo genera el build y no se edita:
 * cualquier cambio se pierde en la siguiente compilación. Ver `worker/README.md`.
 *
 * ⚠️ **El push exige HTTPS o `localhost`**, igual que `crypto.randomUUID()` y
 * `MediaRecorder`. Desde `http://192.168.x.x:3000` no hay service worker, así que
 * tampoco hay push — y no avisa: simplemente no pasa nada. Se prueba con
 * `npm run build && npm run start` o contra la URL de Vercel.
 */

/**
 * Llega un aviso.
 *
 * ⚠️ **`event.waitUntil` no es opcional.** El navegador puede matar el service
 * worker en cuanto el manejador devuelve, y sin envolver la promesa la
 * notificación se pierde a mitad de camino — en un teléfono dormido, que es
 * justo el caso para el que existe todo esto.
 *
 * ⚠️ **Y el `try` alrededor del `json()` tampoco.** Si el cuerpo no es JSON
 * —un push de prueba desde las herramientas del navegador, un servicio que manda
 * texto— sin él no se enseña nada. Más vale una notificación con el texto crudo
 * que ninguna.
 */
self.addEventListener('push', (event) => {
  let datos = {}

  try {
    datos = event.data ? event.data.json() : {}
  } catch {
    datos = { titulo: 'SummitApp', cuerpo: event.data ? event.data.text() : '' }
  }

  const titulo = datos.titulo || 'SummitApp'

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // ⚠️ El `tag` COLAPSA los avisos del mismo hecho: si el teléfono estuvo sin
      // señal dos días, al volver no llegan tres «vence en 3» apilados. Se cae a
      // la categoría cuando no hay clave.
      tag: datos.clave || datos.categoria || 'summit',
      // El enlace viaja aquí para que `notificationclick` sepa a dónde ir.
      data: { enlace: datos.enlace || '/' },
      // Sin vibración ni sonido forzados: es una app de trabajo, y un aviso de
      // «vence en 7 días» no merece sacar a nadie de una reunión.
      requireInteraction: false,
    }),
  )
})

/**
 * Tocan el aviso.
 *
 * ⚠️ **Se busca una pestaña ya abierta antes de abrir otra.** Sin esto, cada
 * notificación deja una pestaña nueva: al final de la semana el consultor tiene
 * ocho SummitApp abiertas y ninguna es la que estaba usando.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const destino = (event.notification.data && event.notification.data.enlace) || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((ventanas) => {
        for (const ventana of ventanas) {
          // Misma app: se enfoca y se navega, en vez de abrir otra.
          if (new URL(ventana.url).origin === self.location.origin && 'focus' in ventana) {
            return ventana.focus().then((v) => (v.navigate ? v.navigate(destino) : v))
          }
        }
        return self.clients.openWindow ? self.clients.openWindow(destino) : undefined
      }),
  )
})

export {}
