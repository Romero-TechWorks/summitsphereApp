'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { listarUsuariosDeLaFirma } from '@/lib/queries/cartera'
import {
  cambiarPapelAuditor,
  listarEquipoAuditor,
  quitarDelEquipoAuditor,
  sumarAlEquipoAuditor,
  type MiembroAuditor,
} from '@/lib/queries/auditorias'
import { PAPELES_AUDITOR } from '@/lib/auditorias/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Lista, { Fila } from '@/components/ui/Lista'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import { IconoEquipo } from '@/components/ui/Iconos'

/**
 * **El equipo auditor** [F03·B1].
 *
 * ⚠️ **No es lo mismo que el equipo del expediente.** Aquél
 * (`usuarios_organizaciones`) decide quién puede *escribir* en el cliente y lo
 * reparte un socio; éste dice **quién hizo esta auditoría concreta y con qué
 * papel**, y se imprime en el informe junto a sus certificaciones — que es lo
 * que demuestra que quien levantó una NC mayor estaba calificado para hacerlo.
 *
 * ⚠️ Las certificaciones salen de la ficha del usuario, no se capturan aquí: si
 * se pudieran escribir por auditoría, dos informes del mismo auditor podrían
 * decir cosas distintas sobre él.
 */
export default function PanelEquipoAuditor({
  auditoriaId,
  orgId,
}: {
  auditoriaId: string
  orgId: string
}) {
  const cliente = useQueryClient()
  const clave = queryKeys.auditorias.equipo(auditoriaId)

  const [aSumar, setASumar] = useState('')
  const [papel, setPapel] = useState('auditor')
  const [error, setError] = useState<string | null>(null)

  const { data: equipo = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: () => listarEquipoAuditor(auditoriaId),
  })

  const { data: usuarios = [] } = useQuery({
    queryKey: queryKeys.cartera.usuariosFirma(),
    queryFn: listarUsuariosDeLaFirma,
  })

  const yaEstan = new Set(equipo.map((m) => m.usuario_id))
  const disponibles = usuarios.filter((u) => !yaEstan.has(u.id))

  async function sumar() {
    if (!aSumar) return
    setError(null)

    const usuario = usuarios.find((u) => u.id === aSumar)
    if (!usuario) return

    try {
      const { fila, encolado } = await sumarAlEquipoAuditor(
        auditoriaId,
        orgId,
        // `certificaciones` no viene en el listado de la firma: la copia
        // optimista va vacía y la fila real las trae al sincronizar. Vacío y no
        // `null`: la columna es `text[] NOT NULL`, y un `null` aquí haría que
        // `.length` reventara la fila — y con ella la lista entera.
        { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, certificaciones: [] },
        papel,
      )
      aplicarEscritura<MiembroAuditor>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => [...previo, fila],
      })
      setASumar('')
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  async function cambiar(miembro: MiembroAuditor, nuevo: string) {
    setError(null)
    try {
      const { fila, encolado } = await cambiarPapelAuditor(miembro, nuevo)
      aplicarEscritura<MiembroAuditor>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) =>
          previo.map((m) => (m.usuario_id === fila.usuario_id ? fila : m)),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  async function quitar(miembro: MiembroAuditor) {
    setError(null)
    try {
      const { encolado } = await quitarDelEquipoAuditor(miembro)
      aplicarEscritura<MiembroAuditor>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.filter((m) => m.usuario_id !== miembro.usuario_id),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div style={{ flex: '1 1 220px', maxWidth: 300 }}>
          <Select
            etiqueta="Sumar al equipo"
            marcador={disponibles.length ? 'Elige a alguien de la firma' : 'Ya están todos'}
            value={aSumar}
            disabled={disponibles.length === 0}
            onChange={(e) => setASumar(e.target.value)}
          >
            {disponibles.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>{usuario.nombre}</option>
            ))}
          </Select>
        </div>
        <div style={{ flex: '0 1 200px' }}>
          <Select etiqueta="Papel" value={papel} onChange={(e) => setPapel(e.target.value)}>
            {PAPELES_AUDITOR.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </Select>
        </div>
        <Button variante="secundario" onClick={sumar} disabled={!aSumar}>Sumar</Button>
      </div>

      {error && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      {equipo.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay equipo auditor"
          descripcion="Quién auditó y con qué papel se imprime en el informe, junto a sus certificaciones. Un auditor líder que no aparece aquí no aparece en el entregable."
        />
      ) : (
        <Lista etiqueta="Equipo auditor">
          {equipo.map((miembro) => (
            <Fila
              key={miembro.usuario_id}
              Icono={IconoEquipo}
              titulo={miembro.usuario?.nombre ?? 'Auditor'}
              meta={
                <>
                  {miembro.usuario?.correo && <span>{miembro.usuario.correo}</span>}
                  {miembro.usuario?.certificaciones?.length
                    ? <span>{miembro.usuario.certificaciones.join(' · ')}</span>
                    : <span>Sin certificaciones registradas</span>}
                </>
              }
              derecha={
                <>
                  <Badge tono={tonoDe(PAPELES_AUDITOR, miembro.papel)}>
                    {etiquetaDe(PAPELES_AUDITOR, miembro.papel)}
                  </Badge>
                  <Select
                    etiqueta="Papel"
                    etiquetaOculta
                    value={miembro.papel}
                    onChange={(e) => cambiar(miembro, e.target.value)}
                    style={{ width: 150 }}
                  >
                    {PAPELES_AUDITOR.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
                    ))}
                  </Select>
                  <Button
                    variante="fantasma"
                    tamano="sm"
                    onClick={() => quitar(miembro)}
                    title={`Quitar a ${miembro.usuario?.nombre ?? 'este auditor'} del equipo`}
                  >
                    Quitar
                  </Button>
                </>
              }
            />
          ))}
        </Lista>
      )}
    </>
  )
}
