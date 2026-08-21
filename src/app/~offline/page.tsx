import type { Metadata } from 'next'

/**
 * La pantalla de respaldo sin conexión.
 *
 * ⚠️ **Esta ruta existe para el service worker, no para el usuario.** El nombre
 * `~offline` es una convención de `@ducanh2912/next-pwa`: el plugin la detecta,
 * la precachea en la instalación del worker y la sirve cuando una navegación no
 * está ni en la red ni en la caché.
 *
 * Sin ella, esa navegación cae en la pantalla de error del navegador —el
 * dinosaurio de Chrome—, que no dice el nombre de la app, no explica que lo que
 * ya está guardado sigue a salvo, y no ofrece volver a lo que sí se descargó.
 * Para un auditor a media planta, eso se lee como que la app se perdió su
 * trabajo. No se lo perdió: está en IndexedDB esperando señal.
 *
 * ⚠️ Va FUERA de `(dashboard)`: se pinta cuando no hay red, así que no puede
 * depender de una sesión que no se puede validar, ni del armazón que monta
 * consultas. Y va excluida del matcher de `src/proxy.ts` — si el guard la
 * redirigiera a `/login`, el worker precachearía esa redirección y la pantalla
 * de respaldo sería la de entrar.
 */

export const metadata: Metadata = {
  title: 'Sin conexión · SummitApp',
}

export default function SinConexion() {
  return (
    <main
      style={{
        minHeight: 'var(--vh-full)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        background: 'var(--navy)',
        color: 'var(--nav-texto)',
      }}
    >
      <div style={{ maxWidth: 420, width: '100%' }}>
        <p
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12.5,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'var(--nav-alerta)',
            marginBottom: 14,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--nav-alerta)',
              flexShrink: 0,
            }}
          />
          Sin conexión
        </p>

        <h1
          className="display"
          style={{ fontSize: 34, lineHeight: 1.15, color: 'var(--nav-texto)', marginBottom: 12 }}
        >
          Esta pantalla no se alcanzó a descargar
        </h1>

        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--nav-texto-dim)', marginBottom: 10 }}>
          No hay señal y esta pantalla en concreto todavía no estaba guardada en
          el teléfono. Las que ya abriste sí lo están y siguen funcionando.
        </p>

        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--nav-texto-dim)', marginBottom: 26 }}>
          <strong style={{ color: 'var(--nav-activo)', fontWeight: 600 }}>
            Nada de lo que hayas guardado se perdió.
          </strong>{' '}
          Lo que escribiste sin señal está en este dispositivo y sube solo en
          cuanto vuelva la conexión.
        </p>

        {/* ⚠️ `<a>` y no `<Link>`, a propósito. `<Link>` hace una navegación de
            cliente: pide la carga RSC de la ruta destino, que es justo lo que
            no se puede hacer sin señal — y el usuario se quedaría en esta misma
            pantalla sin entender por qué. Un `<a>` es una navegación de
            documento, que es lo que el service worker sabe servir desde su
            caché. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            padding: '0 20px',
            background: 'var(--verde)',
            color: 'var(--sobre-acento)',
            border: 'none',
            borderRadius: 6,
            fontSize: 14.5,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Volver al inicio
        </a>
      </div>
    </main>
  )
}
