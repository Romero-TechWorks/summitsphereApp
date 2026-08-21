'use client'

import { Suspense } from 'react'
import Sidebar, { ANCHO_SIDEBAR } from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import BottomNav from '@/components/layout/BottomNav'
import ScrollReset from '@/components/layout/ScrollReset'
import ProveedorConsultas, { EsperaCache } from '@/components/ProveedorConsultas'
import { APP_SCROLL_ID } from '@/lib/utils/appScroll'
import { useEsMovil } from '@/lib/utils/useEsMovil'

/**
 * EL ARMAZÓN FIJO (docs/03_ARQUITECTURA.md §8).
 *
 * Cuatro reglas que no son de estilo, son estructurales. Romper cualquiera
 * devuelve un bug que no se parece a su causa:
 *
 *  1. El marco mide EXACTAMENTE la ventana y no scrollea: `height` +
 *     `overflow: hidden`, nunca `minHeight`. Es lo único que evita que el
 *     navegador móvil recoja y despliegue su barra de URL mientras se scrollea
 *     — cuando lo hace, no reposiciona los `position: fixed`/`sticky`, y el
 *     header se mete hacia arriba y la barra inferior hacia abajo, las dos a la
 *     mitad.
 *  2. `window.scrollTo()` NO HACE NADA aquí dentro. Quien scrollea es el div de
 *     abajo. Todo lo que necesite mover la vista usa `src/lib/utils/appScroll.ts`.
 *  3. Nada mide `100vh` en crudo: va `var(--vh-full)`, que usa `dvh` donde
 *     existe.
 *  4. `minHeight: 0` en el hijo flex que scrollea es obligatorio, no cosmético.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Responsive POR ESTADO DE REACT, no por media queries.
  // El layout monta componentes distintos —Sidebar o BottomNav—, no los mismos
  // con otro CSS. Una media query no puede decidir eso.
  //
  // ⚠️ El corte vive en `useEsMovil` y no repetido aquí: el modal también lo
  // necesita —en el teléfono sube desde abajo como hoja, no centrado— y dos
  // copias del mismo número acaban divergiendo.
  const isMobile = useEsMovil()

  return (
    // ⚠️ El proveedor envuelve TODO el armazón, no sólo el contenido: el
    // indicador de conexión del header también consulta la caché. Lo que espera
    // a que la caché vuelva del disco es `EsperaCache`, más abajo, y sólo
    // alcanza al contenido de la página.
    <ProveedorConsultas>
    <div style={{ display: 'flex', height: 'var(--vh-full)', overflow: 'hidden' }}>

      {!isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50 }}>
          <Sidebar />
        </div>
      )}

      <main
        style={{
          flex: 1,
          // `minWidth: 0` en un hijo flex: sin él, un contenido ancho —una
          // matriz de requisitos con doce columnas— estira el `main` y, como el
          // marco recorta, la parte de la derecha queda inalcanzable.
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--fondo)',
          marginLeft: isMobile ? 0 : ANCHO_SIDEBAR,
        }}
      >
        <Navbar isMobile={isMobile} />

        {/* EL ÚNICO CONTENEDOR CON SCROLL DE LA APP.
            `minHeight: 0` es obligatorio: un hijo flex vale `min-height: auto`
            por defecto, así que sin esto nunca se encoge por debajo de su
            contenido, `overflow` no llega a activarse, y el desbordamiento se lo
            come el marco.
            `overflow: auto` en los dos ejes a propósito: con el marco
            recortando, dejar el eje X en `hidden` volvería inalcanzable
            cualquier cosa demasiado ancha. */}
        <div
          id={APP_SCROLL_ID}
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            overscrollBehavior: 'contain',
            paddingBottom: isMobile ? 'var(--bottom-nav-total)' : 0,
          }}
        >
          {/* Suspense obligatorio: `ScrollReset` usa `useSearchParams()`, y sin
              un límite de suspense Next no puede prerenderizar la ruta y el
              build falla. */}
          <Suspense fallback={null}>
            <ScrollReset />
          </Suspense>
          <EsperaCache>{children}</EsperaCache>
        </div>
      </main>

      {isMobile && <BottomNav />}
    </div>
    </ProveedorConsultas>
  )
}
