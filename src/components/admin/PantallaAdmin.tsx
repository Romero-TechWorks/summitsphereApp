'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import Pestanas, { usePestana, type Pestana } from '@/components/ui/Pestanas'
import Aviso from '@/components/ui/Aviso'
import FormularioContrasena from '@/components/cuenta/FormularioContrasena'
import PanelAvisos from './PanelAvisos'
import PanelConfiguracion from './PanelConfiguracion'
import PanelUsuarios from './PanelUsuarios'

/**
 * `/admin` — lo de la firma y lo de tu cuenta.
 *
 * ⚠️ **Usuarios sólo se pinta para un socio.** La base ya se lo impide a los
 * demás —las rutas de `/api/users` y `proteger_rol_usuario()`—, pero una
 * pestaña que sólo sabe fallar es peor que no tenerla. Configuración sí la ve
 * cualquiera, en lectura: el plazo que aplica la firma le sirve a un auditor.
 *
 * Metas, finanzas, facturación y bitácora siguen siendo Fase 06, y se dice
 * abajo en vez de esconderlo.
 */
export default function PantallaAdmin() {
  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })
  const esSocio = usuario?.rol === 'socio'

  const pestanas: readonly Pestana[] = [
    { clave: 'avisos', etiqueta: 'Avisos' },
    { clave: 'config', etiqueta: 'Configuración' },
    ...(esSocio ? [{ clave: 'usuarios', etiqueta: 'Usuarios' }] : []),
    { clave: 'cuenta', etiqueta: 'Mi cuenta' },
  ]
  const activa = usePestana(pestanas)

  return (
    <div className="contenido-pagina">
      <EncabezadoPagina
        titulo="Admin"
        meta={<span>Tus avisos, tu cuenta y la configuración de la firma</span>}
      />

      <Pestanas pestanas={pestanas} />

      {activa === 'avisos' && <PanelAvisos />}
      {activa === 'config' && <PanelConfiguracion />}
      {activa === 'usuarios' && esSocio && <PanelUsuarios />}
      {activa === 'cuenta' && <MiCuenta correo={usuario?.correo ?? null} />}

      <div style={{ marginTop: 28 }}>
        <Aviso tono="info">
          <strong>Metas, finanzas, facturación y bitácora</strong> llegan con el resto de la Fase 06.
        </Aviso>
      </div>
    </div>
  )
}

function MiCuenta({ correo }: { correo: string | null }) {
  const [hecho, setHecho] = useState(false)

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: 0 }}>Cambiar mi contraseña</h2>
      {correo && <p style={{ fontSize: 13, color: 'var(--texto-dim)', margin: 0 }}>{correo}</p>}
      {hecho ? (
        <Aviso tono="exito">Listo. La próxima vez entra con la contraseña nueva.</Aviso>
      ) : (
        <FormularioContrasena alTerminar={() => setHecho(true)} />
      )}
    </section>
  )
}
