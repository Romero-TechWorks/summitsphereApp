'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import {
  asignarAlEquipo,
  listarUsuariosDeLaFirma,
  quitarDelEquipo,
  type MiembroEquipo,
} from '@/lib/queries/cartera'
import { PAPELES_EQUIPO, etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { IconoEquipo } from '@/components/ui/Iconos'

/**
 * **Quién de la firma ve este expediente.**
 *
 * ⚠️ Esta pantalla no es administración de usuarios: es **el control de
 * aislamiento del sistema**. Agregar a alguien aquí le abre el cliente completo
 * —sus proyectos, sus auditorías, sus hallazgos y sus documentos— en toda la
 * aplicación, porque `usuarios_organizaciones` es la tabla de la que cuelga
 * cada política de RLS del proyecto (docs/08_SEGURIDAD_Y_RLS.md).
 *
 * Y por eso **sólo un socio escribe aquí**, impuesto en la base
 * (`with check (es_socio())`), no en la interfaz. La tarea `B02` del dueño es
 * exactamente esto: *si asignas a todos a todo, desactivas la protección más
 * importante del sistema*.
 *
 * ⚠️ Vive en el expediente y no en `/admin?tab=usuarios` —que llega en la Fase
 * 06— porque se decide mirando al cliente: "¿quién lleva Aceros?". La pantalla
 * de administración enseñará lo mismo al revés, por persona.
 */
export default function PanelEquipo({
  orgId,
  organizacion,
  equipo,
  esSocio,
}: {
  orgId: string
  /** Cómo se llama el cliente. Va en la etiqueta que se lee en la cola. */
  organizacion: string
  equipo: MiembroEquipo[]
  esSocio: boolean
}) {
  const cliente = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [usuarioId, setUsuarioId] = useState('')
  const [papel, setPapel] = useState('apoyo')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ⚠️ El desplegable es un DATO: por `useQuery` y con su clave, como todo lo
  // demás (CLAUDE.md · reglas del offline, 3). Y `enabled` sólo cuando el modal
  // está abierto: no hace falta traerse la plantilla de la firma para pintar
  // una lista de tres personas.
  const { data: usuariosFirma = [] } = useQuery({
    queryKey: queryKeys.cartera.usuariosFirma(),
    queryFn: listarUsuariosDeLaFirma,
    enabled: abierto,
  })

  const yaAsignados = new Set(equipo.map((m) => m.usuario_id))
  const disponibles = usuariosFirma.filter((u) => !yaAsignados.has(u.id))

  async function asignar() {
    const usuario = usuariosFirma.find((u) => u.id === usuarioId)
    if (!usuario) {
      setError('Elige a quién quieres asignar.')
      return
    }

    setTrabajando(true)
    setError(null)

    try {
      const { fila, encolado } = await asignarAlEquipo(orgId, usuario, papel, organizacion)

      aplicarEscritura<MiembroEquipo>({
        cliente,
        clave: queryKeys.cartera.equipo(orgId),
        encolado,
        actualizar: (previo) => [...previo.filter((m) => m.usuario_id !== usuario.id), fila],
      })

      setAbierto(false)
      setUsuarioId('')
      setPapel('apoyo')
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setTrabajando(false)
    }
  }

  async function quitar(miembro: MiembroEquipo) {
    setError(null)

    try {
      const { encolado } = await quitarDelEquipo(orgId, miembro, organizacion)

      aplicarEscritura<MiembroEquipo>({
        cliente,
        clave: queryKeys.cartera.equipo(orgId),
        encolado,
        actualizar: (previo) => previo.filter((m) => m.usuario_id !== miembro.usuario_id),
      })
    } catch (problema) {
      // ⚠️ Aquí es donde se ve el DELETE bloqueado por RLS: PostgREST responde
      // 200 con cero filas y parecería que funcionó, hasta que al refrescar la
      // persona reaparece. `exigirFilas` lo convierte en este error, con motivo.
      setError(mensajeDeError(problema))
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', maxWidth: 560, lineHeight: 1.55 }}>
          Quien esté en esta lista ve el expediente completo de {organizacion} en toda la
          aplicación. Quien no esté, no lo encuentra ni buscándolo.
        </p>
        {esSocio && (
          <Button onClick={() => { setError(null); setAbierto(true) }}>Asignar</Button>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      {equipo.length === 0 ? (
        <EstadoVacio
          titulo="Nadie de la firma tiene asignado este cliente"
          descripcion={
            esSocio
              ? 'Mientras esté así, sólo tú lo ves: un socio ve toda la cartera. Asigna al consultor que lo lleva para que aparezca en su pantalla.'
              : 'Un socio de la firma decide quién atiende a cada cliente.'
          }
          accion={esSocio ? <Button variante="primario" onClick={() => setAbierto(true)}>Asignar a alguien</Button> : null}
        />
      ) : (
        <Lista etiqueta="Equipo asignado">
          {equipo.map((miembro) => (
            <Fila
              key={miembro.usuario_id}
              Icono={IconoEquipo}
              titulo={miembro.usuario?.nombre ?? 'Usuario dado de baja'}
              meta={
                <>
                  {miembro.usuario?.correo && <span>{miembro.usuario.correo}</span>}
                  {miembro.usuario?.rol && <span>{miembro.usuario.rol}</span>}
                </>
              }
              derecha={
                <>
                  <Badge tono={tonoDe(PAPELES_EQUIPO, miembro.papel)}>
                    {etiquetaDe(PAPELES_EQUIPO, miembro.papel)}
                  </Badge>
                  {esSocio && (
                    <Button
                      variante="fantasma"
                      tamano="sm"
                      onClick={() => quitar(miembro)}
                      title={`Quitar a ${miembro.usuario?.nombre ?? 'esta persona'} de ${organizacion}`}
                    >
                      Quitar
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </Lista>
      )}

      <Modal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo={`Asignar a alguien en ${organizacion}`}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button variante="primario" onClick={asignar} cargando={trabajando}>Asignar</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <Aviso tono="error">{error}</Aviso>}

          <Select
            etiqueta="Quién"
            marcador={disponibles.length === 0 ? 'Ya están todos asignados' : 'Elige a alguien de la firma'}
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
          >
            {disponibles.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre} · {u.rol}</option>
            ))}
          </Select>

          <Select
            etiqueta="Con qué papel"
            ayuda="«Sólo lectura» ve el expediente y no puede modificar nada."
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
          >
            {PAPELES_EQUIPO.map((o) => (
              <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
            ))}
          </Select>
        </div>
      </Modal>
    </>
  )
}
