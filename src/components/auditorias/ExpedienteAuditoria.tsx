'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import { listarUsuariosDeLaFirma, nombreDeOrganizacion } from '@/lib/queries/cartera'
import {
  actualizarAuditoria,
  cambiarEstadoAuditoria,
  folioVisible,
  obtenerAuditoria,
  type AuditoriaEnLista,
  type DatosAuditoria,
} from '@/lib/queries/auditorias'
import { ESTADOS_AUDITORIA, TIPOS_AUDITORIA } from '@/lib/auditorias/catalogos'
import { etiquetaDe, tonoDe } from '@/lib/cartera/catalogos'
import { formatDate, formatDateOnly } from '@/lib/utils/dates'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Modal from '@/components/ui/Modal'
import Pestanas, { usePestana, type Pestana } from '@/components/ui/Pestanas'
import Skeleton from '@/components/ui/Skeleton'
import FormularioAuditoria from './FormularioAuditoria'
import PanelAlcanceAuditoria from './PanelAlcanceAuditoria'
import PanelVerificacion from './PanelVerificacion'
import PanelRecorrido from './PanelRecorrido'
import PanelHallazgos from './PanelHallazgos'
import PanelEquipoAuditor from './PanelEquipoAuditor'
import PanelAgenda from './PanelAgenda'
import PanelInforme from './PanelInforme'

/**
 * El orden es el de la vida de una auditoría: se planea, se acota el alcance, de
 * ahí sale la lista, se reparte el equipo, se manda la agenda, **se recorre**, se
 * levantan los hallazgos y sale el informe.
 *
 * ⚠️ «Informe» es la última y llegó con F03·B5: reproduce el `F-SG-12` de la
 * firma y se arma **con lo que ya está en la caché**, para que se pueda enseñar
 * en la reunión de cierre sin señal.
 *
 * ⚠️ «Recorrido» va al final aunque sea lo más importante, y es deliberado: las
 * cinco anteriores se preparan **una vez, en la oficina**; ésta se abre en la
 * planta y ya no se sale de ella en tres horas. Ponerla de primera haría que
 * cada vez que alguien abre una auditoría para mirar el plan cayera en la
 * pantalla de campo.
 */
const PESTANAS: readonly Pestana[] = [
  { clave: 'plan', etiqueta: 'Plan' },
  { clave: 'alcance', etiqueta: 'Alcance' },
  { clave: 'lista', etiqueta: 'Lista de verificación' },
  { clave: 'equipo', etiqueta: 'Equipo' },
  { clave: 'agenda', etiqueta: 'Agenda' },
  { clave: 'recorrido', etiqueta: 'Recorrido' },
  { clave: 'hallazgos', etiqueta: 'Hallazgos' },
  { clave: 'informe', etiqueta: 'Informe' },
]

const FORM = 'form-editar-auditoria'

/**
 * `/auditorias/[id]` — el expediente de una auditoría [F03·B1].
 *
 * **La única ruta propia del dominio**: el resto son pestañas
 * (docs/03_ARQUITECTURA.md §2.1). Dentro vuelven a ser pestañas — en un teléfono,
 * cuatro secciones apiladas son cuatro pantallas de scroll para llegar a la
 * agenda.
 */
export default function ExpedienteAuditoria({ id }: { id: string }) {
  const cliente = useQueryClient()
  const activa = usePestana(PESTANAS)
  const clave = queryKeys.auditorias.auditoria(id)

  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: auditoria, isPending, error: fallo } = useQuery({
    queryKey: clave,
    queryFn: () => obtenerAuditoria(id),
  })

  const { data: usuarios = [] } = useQuery({
    queryKey: queryKeys.cartera.usuariosFirma(),
    queryFn: listarUsuariosDeLaFirma,
  })

  async function guardar(_orgId: string, datos: DatosAuditoria) {
    if (!auditoria) return
    setGuardando(true)
    setError(null)

    try {
      const lider = usuarios.find((u) => u.id === datos.auditor_lider_id) ?? null
      const { fila, encolado } = await actualizarAuditoria(
        auditoria,
        datos,
        lider ? { id: lider.id, nombre: lider.nombre } : null,
      )

      // ⚠️ Una fila suelta, no una lista: se escribe directo en su clave.
      // `aplicarEscritura` es para listas y aquí dejaría un arreglo dentro de
      // la clave de un registro.
      cliente.setQueryData(clave, fila)
      // Y sólo se invalida el listado si el cambio VIAJÓ: encolado, releer del
      // servidor devolvería los datos de antes y borraría la fila optimista.
      if (!encolado) void cliente.invalidateQueries({ queryKey: queryKeys.auditorias.lista() })

      setEditando(false)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function moverEstado(estado: string, etiqueta: string) {
    if (!auditoria) return
    setError(null)

    try {
      const { fila, encolado } = await cambiarEstadoAuditoria(auditoria, estado, etiqueta)
      cliente.setQueryData(clave, fila)
      if (!encolado) void cliente.invalidateQueries({ queryKey: queryKeys.auditorias.lista() })
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  if (isPending) {
    return (
      <div className="contenido-pagina" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Skeleton alto={36} ancho="55%" />
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  if (fallo || !auditoria) {
    return (
      <div className="contenido-pagina">
        <EnlaceVolver />
        <EstadoVacio
          titulo="Esta auditoría no está en tu cartera"
          descripcion={
            fallo
              ? mensajeDeError(fallo)
              : 'O no existe, o es de un cliente que no está asignado a tu cuenta. Un socio de la firma decide quién atiende a cada cliente.'
          }
        />
      </div>
    )
  }

  return (
    <div className="contenido-pagina">
      <EnlaceVolver />

      <EncabezadoPagina
        titulo={auditoria.titulo}
        meta={
          <>
            <span className="mono">{folioVisible(auditoria)}</span>
            <span>
              {auditoria.organizacion
                ? nombreDeOrganizacion(auditoria.organizacion)
                : 'Sin cliente'}
            </span>
            <span>{etiquetaDe(TIPOS_AUDITORIA, auditoria.tipo)}</span>
            <Badge tono={tonoDe(ESTADOS_AUDITORIA, auditoria.estado)}>
              {etiquetaDe(ESTADOS_AUDITORIA, auditoria.estado)}
            </Badge>
          </>
        }
        acciones={
          <>
            {auditoria.estado === 'planeada' && (
              <Button
                variante="secundario"
                onClick={() => moverEstado('en_curso', `Arranca la auditoría ${folioVisible(auditoria)}`)}
              >
                Marcar en curso
              </Button>
            )}
            {auditoria.estado === 'en_curso' && (
              <Button
                variante="secundario"
                onClick={() => moverEstado('cerrada', `Cierre de la auditoría ${folioVisible(auditoria)}`)}
              >
                Cerrar
              </Button>
            )}
            <Button variante="primario" onClick={() => { setError(null); setEditando(true) }}>
              Editar el plan
            </Button>
          </>
        }
      />

      {!auditoria.folio && (
        <div style={{ marginBottom: 14 }}>
          <Aviso tono="advertencia">
            Esta auditoría todavía no tiene folio: lo asigna el servidor al sincronizar, porque el
            consecutivo es de la firma entera. Los hallazgos que se levanten antes de eso se
            numerarán cuando el folio exista.
          </Aviso>
        </div>
      )}

      <Pestanas pestanas={PESTANAS} />

      {error && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      {activa === 'plan' && <Plan auditoria={auditoria} />}
      {activa === 'alcance' && (
        <PanelAlcanceAuditoria auditoriaId={auditoria.id} orgId={auditoria.org_id} />
      )}
      {activa === 'lista' && (
        <PanelVerificacion
          auditoriaId={auditoria.id}
          orgId={auditoria.org_id}
          giro={auditoria.organizacion?.giro ?? null}
        />
      )}
      {activa === 'equipo' && (
        <PanelEquipoAuditor auditoriaId={auditoria.id} orgId={auditoria.org_id} />
      )}
      {activa === 'agenda' && (
        <PanelAgenda auditoria={auditoria} />
      )}
      {activa === 'recorrido' && <PanelRecorrido auditoria={auditoria} />}
      {activa === 'hallazgos' && <PanelHallazgos auditoria={auditoria} />}
      {activa === 'informe' && <PanelInforme auditoria={auditoria} />}

      <Modal
        abierto={editando}
        alCerrar={() => setEditando(false)}
        titulo={`Plan de ${folioVisible(auditoria)}`}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setEditando(false)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM} cargando={guardando}>
              Guardar
            </Button>
          </>
        }
      >
        {error && (
          <div style={{ marginBottom: 12 }}>
            <Aviso tono="error">{error}</Aviso>
          </div>
        )}
        <FormularioAuditoria id={FORM} inicial={auditoria} alEnviar={guardar} />
      </Modal>
    </div>
  )
}

function EnlaceVolver() {
  return (
    <Link
      href="/auditorias"
      style={{
        display: 'inline-block',
        marginBottom: 10,
        fontSize: 13,
        color: 'var(--texto-dim)',
        textDecoration: 'none',
      }}
    >
      ← Auditorías
    </Link>
  )
}

/** El plan, sin recuadro: etiqueta arriba, dato debajo. */
function Plan({ auditoria }: { auditoria: AuditoriaEnLista }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 18,
        }}
      >
        <Dato etiqueta="Fechas">
          {auditoria.fecha_inicio
            ? `${formatDateOnly(auditoria.fecha_inicio)}${auditoria.fecha_fin ? ` — ${formatDateOnly(auditoria.fecha_fin)}` : ''}`
            : 'Sin fechas'}
        </Dato>
        <Dato etiqueta="Auditor líder">{auditoria.lider?.nombre ?? 'Sin asignar'}</Dato>
        <Dato etiqueta="Informe">
          {auditoria.informe_emitido_en
            ? `Emitido el ${formatDate(auditoria.informe_emitido_en)}`
            : 'Sin emitir'}
        </Dato>
        {auditoria.cerrada_en && (
          <Dato etiqueta="Cerrada">{formatDate(auditoria.cerrada_en)}</Dato>
        )}
      </div>

      <Parrafo etiqueta="Objetivo" texto={auditoria.objetivo} />
      <Parrafo etiqueta="Alcance" texto={auditoria.alcance} />
      <Parrafo etiqueta="Criterios" texto={auditoria.criterios} />
      <Parrafo etiqueta="Metodología" texto={auditoria.metodologia} />
      <Parrafo etiqueta="Conclusiones" texto={auditoria.conclusiones} />
    </div>
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
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--texto)', whiteSpace: 'pre-wrap' }}>
        {texto}
      </p>
    </div>
  )
}
