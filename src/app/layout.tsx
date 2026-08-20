import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, DM_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

/**
 * ⚠️ Las fuentes se cargan con `next/font/google`, no con un `<link>` a
 * fonts.googleapis.com. El link suma una petición bloqueante y una dependencia
 * de red en el arranque de una app que tiene que abrir sin señal: en una nave
 * industrial sin cobertura, la app abriría con la fuente de sistema y todos los
 * anchos cambiarían. Con `next/font` los archivos se sirven desde el mismo
 * origen y los cachea el service worker.
 */

// Display. ⚠️ Nunca por debajo de 24px: es una serif de trazo fino que se
// vuelve ilegible en una etiqueta de formulario.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-cormorant',
  display: 'swap',
})

// Texto — todo lo demás.
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

// Folios, RFC, CURP, fechas, importes, números de cláusula.
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SummitApp',
  description: 'Sistema de gestión de Summit-Sphere — consultoría en sistemas de gestión y cumplimiento',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    // El armazón es navy y llega hasta arriba: con la barra de estado clara,
    // la hora del teléfono se pierde sobre el header.
    statusBarStyle: 'black-translucent',
    title: 'SummitApp',
  },
  icons: {
    icon: '/icono.svg',
    apple: '/apple-touch-icon.png',
  },
  // Un expediente de auditoría no se indexa. Aunque el guard de sesión ya lo
  // impide, esto evita que una ruta pública futura acabe en un buscador.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // ⚠️ Sin `viewportFit: 'cover'`, `env(safe-area-inset-bottom)` vale 0 y la
  // barra inferior se mete debajo del indicador de gestos del teléfono.
  viewportFit: 'cover',
  themeColor: '#0d1f35',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${cormorant.variable} ${dmSans.variable} ${plexMono.variable}`}>
        {children}
      </body>
    </html>
  )
}
