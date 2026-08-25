'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDate, formatDateOnly } from '@/lib/utils/dates'
import {
  diasAbierto,
  folioDeHallazgo,
  listarHistorial,
  type HallazgoConContexto,
} from '@/lib/queries/hallazgos'
import {
  ESTADOS_ABIERTOS_HALLAZGO,
  ESTADOS_HALLAZGO,
  TIPOS_HALLAZGO,
  campoDelHistorial,
} from '@/lib/auditorias/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import Textarea from '@/components/ui/Textarea'
import PanelAdjuntos from '@/components/adjuntos/PanelAdjuntos'

/** A dónde puede ir un hallazgo desde donde está. Anular sale aparte. */
const SIGUIENTES: Readonly<Record<string, string[]>> = {
  abierto: ['en_accion'],
  en_accion: ['verificado', 'abierto'],
  verificado: ['cerrado', 'en_accion'],
  cerrado: ['abierto'],
  anulado: [],
}

/**
 * El expediente de un hallazgo [F03·B4]: sus datos, su evidencia y **su
 * historial**.
 *
 * ⚠️ **No hay botón de borrar, y no falta.** Un hallazgo se cierra, se
 * reclasifica o se anula **con motivo** (regla 13). La base tampoco lo dejaría:
 * sin política de DELETE, con el permiso revocado hasta a `service_role` y con un
 * trigger que grita. Ofrecer un botón que termina en 42501 es peor que no
 * ofrecerlo.
 *
 * ⚠️ **El historial no se pinta como un adorno.** Es lo que un organismo
 * certificador viene a revisar, y lo escribe la base campo por campo — esta
 * pantalla sólo lo lee.
 */
export default function FichaHallazgo({
  hallazgo,
  orgId,
  esSocio,
  alEditar,
  alCambiarEstado,
}: {
  hallazgo: HallazgoConContexto
  orgId: string
  esSocio: boolean
  alEditar: () => void
  alCambiarEstado: (estado: string, motivo: string) => Promise<void>
}) {
  const [anulando, setAnulando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: historial = [], isPending } = useQuery({
    queryKey: queryKeys.auditorias.historial(hallazgo.id),
    queryFn: () => listarHistorial(hallazgo.id),
  })

  const abierto = ESTADOS_ABIERTOS_HALLAZGO.includes(hallazgo.estado)
  const dias = diasAbierto(hallazgo)
  const vencido =
    abierto && hallazgo.fecha_compromiso !== null && hallazgo.fecha_compromiso < new Date().toISOString().slice(0, 10)

  async function mover(estado: string) {
    setOcupado(true)
    setError(null)
    try {
      await alCambiarEstado(estado, motivo)
      setMotivo('')
      setAnulando(false)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
          {folioDeHallazgo(hallazgo)}
        </span>
        <Badge tono={tonoDe(TIPOS_HALLAZGO, hallazgo.tipo)}>
          {etiquetaDe(TIPOS_HALLAZGO, hallazgo.tipo)}
        </Badge>
        <Badge tono={tonoDe(ESTADOS_HALLAZGO, hallazgo.estado)}>
          {etiquetaDe(ESTADOS_HALLAZGO, hallazgo.estado)}
        </Badge>
        {abierto && (
          <span style={{ fontSize: 13, color: vencido ? 'var(--error, #c0392b)' : 'var(--texto-dim)' }}>
            {dias} día{dias === 1 ? '' : 's'} abierto
            {vencido && ' · vencido'}
          </span>
        )}
      </div>

      {hallazgo.estado === 'anulado' && hallazgo.motivo_anulacion && (
        <Aviso tono="advertencia">
          <strong>Anulado.</strong> {hallazgo.motivo_anulacion}
          <br />
          <span style={{ fontSize: 12 }}>
            No se borró: sigue en el expediente con su historial completo, que es lo que un
            organismo certificador viene a revisar.
          </span>
        </Aviso>
      )}

      <Dato etiqueta="Cláusula citada">
        {hallazgo.clausula
          ? `${hallazgo.clausula.numero} · ${hallazgo.clausula.titulo}`
          : 'Sin cláusula'}
      </Dato>

      <Parrafo etiqueta="Descripción" texto={hallazgo.descripcion} />
      <Parrafo etiqueta="Evidencia objetiva" texto={hallazgo.evidencia_objetiva} />
      <Parrafo etiqueta="Requisito incumplido" texto={hallazgo.requisito_incumplido} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <Dato etiqueta="Proceso">{hallazgo.proceso?.nombre ?? '—'}</Dato>
        <Dato etiqueta="Sitio">{hallazgo.sitio?.nombre ?? '—'}</Dato>
        <Dato etiqueta="Responsable">{hallazgo.responsable?.nombre ?? 'Sin asignar'}</Dato>
        <Dato etiqueta="Compromiso">
          {hallazgo.fecha_compromiso ? formatDateOnly(hallazgo.fecha_compromiso) : 'Sin fecha'}
        </Dato>
        <Dato etiqueta="Detectado">
          {/* El reloj del auditor: la hora del recorrido, no la de sincronizar. */}
          {hallazgo.detectado_en ? formatDate(hallazgo.detectado_en) : formatDate(hallazgo.creado_en)}
        </Dato>
        {hallazgo.cerrado_en && (
          <Dato etiqueta="Cerrado">{formatDate(hallazgo.cerrado_en)}</Dato>
        )}
      </div>

      {error && <Aviso tono="error">{error}</Aviso>}

      {/* ── Qué se puede hacer con él ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variante="secundario" onClick={alEditar} disabled={ocupado}>
          Editar o reclasificar
        </Button>

        {(SIGUIENTES[hallazgo.estado] ?? []).map((estado) => (
          <Button key={estado} onClick={() => mover(estado)} disabled={ocupado}>
            {etiquetaDe(ESTADOS_HALLAZGO, estado)}
          </Button>
        ))}

        {hallazgo.estado !== 'anulado' && (
          <Button variante="fantasma" onClick={() => setAnulando(!anulando)} disabled={ocupado}>
            {anulando ? 'Cancelar' : 'Anular'}
          </Button>
        )}
      </div>

      {anulando && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Aviso tono="advertencia">
            Anular <strong>no borra</strong>. El hallazgo se queda en el expediente marcado como
            anulado, con este motivo y con su historial. Es lo que se hace cuando se levantó por
            error o se citó la cláusula equivocada.
          </Aviso>
          <Textarea
            etiqueta="Por qué se anula"
            required
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            ayuda="Obligatorio, y lo exige la base. Es lo único que distingue anular de borrar."
          />
          <div>
            <Button
              variante="primario"
              onClick={() => mover('anulado')}
              disabled={ocupado || motivo.trim() === ''}
            >
              Anular con este motivo
            </Button>
          </div>
        </div>
      )}

      {/* ── La evidencia ──────────────────────────────────────────────────── */}
      <section>
        <Titulo>Evidencia</Titulo>
        <PanelAdjuntos
          orgId={orgId}
          destino={{ hallazgo_id: hallazgo.id }}
          esSocio={esSocio}
          ayuda="Las fotos del recorrido y lo que el cliente mande después."
        />
      </section>

      {/* ── El historial ──────────────────────────────────────────────────── */}
      <section>
        <Titulo>Historial</Titulo>

        {isPending ? (
          <Skeleton alto={60} radio={4} />
        ) : historial.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-dim)', margin: 0, lineHeight: 1.55 }}>
            Todavía no ha cambiado nada desde que se levantó. En cuanto se reclasifique, se mueva de
            estado o se corrija, cada cambio aparece aquí con su antes, su después y quién lo hizo —
            lo escribe la base, no esta pantalla.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {historial.map((renglon) => (
              <li
                key={renglon.id}
                style={{
                  padding: '10px 0',
                  borderBottom: '2px solid rgba(61, 186, 78, .16)',
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                <div style={{ color: 'var(--texto)', fontWeight: 600 }}>
                  {campoDelHistorial(renglon.campo)}
                </div>
                <div style={{ color: 'var(--texto-dim)' }}>
                  {renglon.antes ?? '—'} → {renglon.despues ?? '—'}
                </div>
                {renglon.motivo && (
                  <div style={{ color: 'var(--texto)', marginTop: 2 }}>{renglon.motivo}</div>
                )}
                <div style={{ color: 'var(--texto-dim)', fontSize: 12, marginTop: 2 }}>
                  {formatDate(renglon.hecho_en)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 13,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        color: 'var(--texto-dim)',
        marginBottom: 8,
      }}
    >
      {children}
    </h3>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          color: 'var(--texto-dim)',
          marginBottom: 3,
        }}
      >
        {etiqueta}
      </div>
      <div style={{ fontSize: 15, color: 'var(--texto)' }}>{children}</div>
    </div>
  )
}

function Parrafo({ etiqueta, texto }: { etiqueta: string; texto: string | null }) {
  if (!texto) return null

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          color: 'var(--texto-dim)',
          marginBottom: 4,
        }}
      >
        {etiqueta}
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--texto)', whiteSpace: 'pre-wrap', margin: 0 }}>
        {texto}
      </p>
    </div>
  )
}
