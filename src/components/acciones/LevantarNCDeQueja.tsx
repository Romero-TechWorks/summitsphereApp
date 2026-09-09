'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import { listarNormasConClausulas } from '@/lib/queries/normas'
import { listarContactos } from '@/lib/queries/cartera'
import {
  crearHallazgo,
  type DatosHallazgo,
  type HallazgoConContexto,
} from '@/lib/queries/hallazgos'
import { enlazarNC, quienLaPuso, type QuejaEnCartera } from '@/lib/queries/quejas'
import { CRITERIO_HALLAZGO, TIPOS_HALLAZGO } from '@/lib/auditorias/catalogos'
import Aviso from '@/components/ui/Aviso'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

/**
 * Levanta la no conformidad de una **queja procedente** [F04·B1].
 *
 * ⚠️ **Es lo que `F04·B0` dejó preparado y nadie podía usar.** Aquella migración
 * aflojó `hallazgos.auditoria_id` para que una NC pudiera nacer de una queja, de
 * un indicador o de un incumplimiento legal — y se aplicó **sin pantalla**, a
 * propósito. Ésta es la primera.
 *
 * ⚠️ **La cita a la cláusula sigue siendo obligatoria.** Un hallazgo sin cláusula
 * no es un hallazgo, venga de donde venga: la queja dice qué pasó, la cláusula
 * dice qué requisito se incumplió. Sin ella el hallazgo no se puede defender
 * delante de un certificador.
 *
 * ⚠️ **Y el folio no se adelanta.** La serie `NC-2026-007` la cuenta la base por
 * organización y año; la fila optimista dice «sin folio hasta sincronizar» en vez
 * de enseñar un número que el servidor puede renumerar.
 *
 * ⚠️ **Son dos escrituras y no una**: el hallazgo primero, el enlace después. Son
 * dos tablas y la cola reproduce operación por operación — si la primera no
 * llega, la segunda falla contra la clave foránea y se ve, que es mejor que una
 * queja apuntando a una NC que no existe.
 */
export default function LevantarNCDeQueja({
  queja,
  alCerrar,
}: {
  queja: QuejaEnCartera
  alCerrar: () => void
}) {
  const cliente = useQueryClient()

  const [tipo, setTipo] = useState('nc_menor')
  const [clausulaId, setClausulaId] = useState('')
  const [descripcion, setDescripcion] = useState(queja.descripcion)
  const [evidencia, setEvidencia] = useState(
    `Queja ${queja.folio} recibida el ${queja.fecha} de ${quienLaPuso(queja)}.`,
  )
  const [contactoId, setContactoId] = useState('')
  const [compromiso, setCompromiso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: normas = [] } = useQuery({
    queryKey: queryKeys.normas.arbol(),
    queryFn: listarNormasConClausulas,
  })

  const { data: contactos = [] } = useQuery({
    queryKey: queryKeys.cartera.contactos(queja.org_id),
    queryFn: () => listarContactos(queja.org_id),
  })

  // Sólo las hojas auditables: poner el capítulo «8» y sus hijas duplicaría la
  // cita, exactamente igual que en la lista de verificación.
  const clausulas = useMemo(
    () =>
      normas.flatMap((norma) =>
        norma.clausulas
          .filter((c) => c.auditable && c.activa)
          .map((c) => ({ id: c.id, etiqueta: `${norma.clave.toUpperCase()} · ${c.numero} ${c.titulo}` })),
      ),
    [normas],
  )

  async function levantar() {
    setOcupado(true)
    setError(null)
    try {
      const datos: DatosHallazgo = {
        clausula_id: clausulaId,
        tipo,
        descripcion: descripcion.trim(),
        evidencia_objetiva: evidencia.trim(),
        requisito_incumplido: null,
        proceso_id: queja.proceso_id,
        sitio_id: null,
        responsable_contacto_id: contactoId || null,
        fecha_compromiso: compromiso || null,
      }

      const { fila } = await crearHallazgo({
        // ⚠️ Aquí está el punto de todo B0.
        auditoriaId: null,
        orgId: queja.org_id,
        itemId: null,
        // La base lo asigna: sin auditoría la serie es por organización y año, y
        // adelantarlo desde aquí sería enseñar un número que va a cambiar.
        consecutivo: 0,
        folioAuditoria: null,
        fuenteNc: 'queja_cliente',
        fuenteDetalle: `Queja ${queja.folio} — ${quienLaPuso(queja)}`,
        datos,
        contexto: {
          clausula: null,
          proceso: queja.proceso,
          sitio: null,
          responsable: contactos.find((c) => c.id === contactoId)
            ? { id: contactoId, nombre: contactos.find((c) => c.id === contactoId)!.nombre, puesto: contactos.find((c) => c.id === contactoId)!.puesto }
            : null,
        },
      })

      const creado = fila as HallazgoConContexto

      await enlazarNC(queja, creado.id, {
        id: creado.id,
        folio: creado.folio,
        descripcion: creado.descripcion,
        estado: creado.estado,
      })

      // El tablero del lunes y la lista de quejas enseñan estas mismas filas.
      void cliente.invalidateQueries({ queryKey: queryKeys.auditorias.hallazgosDeLaCartera() })
      void cliente.invalidateQueries({ queryKey: queryKeys.acciones.quejas() })

      alCerrar()
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  const listo =
    clausulaId !== '' && descripcion.trim() !== '' && evidencia.trim() !== ''

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={`No conformidad de ${queja.folio}`}
      ancho={560}
      pie={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={levantar} disabled={ocupado || !listo}>
            {ocupado ? 'Levantando…' : 'Levantar'}
          </Button>
          <Button variante="fantasma" onClick={alCerrar} disabled={ocupado}>
            Cancelar
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Aviso tono="info">
          Esta no conformidad <strong>no cuelga de ninguna auditoría</strong>: su fuente es la
          queja, y llevará su propia serie de folio.
        </Aviso>

        {error && <Aviso tono="error">{error}</Aviso>}

        <Select
          etiqueta="Tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          ayuda={CRITERIO_HALLAZGO[tipo]}
        >
          {TIPOS_HALLAZGO.filter((o) => o.valor !== 'conformidad').map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </Select>

        <Select
          etiqueta="Cláusula incumplida"
          required
          marcador="Elige la cláusula"
          value={clausulaId}
          onChange={(e) => setClausulaId(e.target.value)}
          ayuda="La queja dice qué pasó; la cláusula dice qué requisito se incumplió. Sin ella el hallazgo no se puede defender."
        >
          {clausulas.map((c) => (
            <option key={c.id} value={c.id}>{c.etiqueta}</option>
          ))}
        </Select>

        <Textarea
          etiqueta="No conformidad observada"
          required
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />

        <Textarea
          etiqueta="Evidencia objetiva"
          required
          value={evidencia}
          onChange={(e) => setEvidencia(e.target.value)}
          ayuda="Qué lo demuestra: el correo, la llamada, el número de contrato."
        />

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px' }}>
            <Select
              etiqueta="Responsable"
              marcador="Sin asignar"
              value={contactoId}
              onChange={(e) => setContactoId(e.target.value)}
            >
              {contactos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </Select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <Input
              etiqueta="Fecha compromiso"
              type="date"
              value={compromiso}
              onChange={(e) => setCompromiso(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
