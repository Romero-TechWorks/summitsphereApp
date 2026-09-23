'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { etiquetaDe } from '@/lib/cartera/catalogos'
import { MODALIDADES, TIPOS_CURSO } from '@/lib/capacitacion/catalogos'
import { listarNoms } from '@/lib/queries/noms'
import {
  actualizarCurso,
  actualizarProveedor,
  crearCurso,
  crearProveedor,
  listarCursos,
  listarProveedores,
  type Curso,
  type DatosCurso,
  type DatosProveedor,
  type Proveedor,
} from '@/lib/queries/capacitacion'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import { IconoCapacitacion, IconoEquipo } from '@/components/ui/Iconos'
import FormularioCurso from './FormularioCurso'
import FormularioProveedor from './FormularioProveedor'

const FORM_CURSO = 'form-curso'
const FORM_PROVEEDOR = 'form-proveedor'

type Dialogo =
  | { tipo: 'curso'; fila: Curso | null }
  | { tipo: 'proveedor'; fila: Proveedor | null }
  | null

/**
 * **La biblioteca de capacitación de la firma**: cursos y proveedores.
 *
 * ⚠️ **La construye el usuario** (decisión del dueño, 22 sep 2026) y sólo la
 * escribe un socio; la base tampoco deja a nadie más. **Nada se borra**: un
 * curso o un proveedor se dan de baja, porque hay sesiones que los citan.
 */
export default function PanelCatalogoCapacitacion({ esSocio }: { esSocio: boolean }) {
  const cliente = useQueryClient()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: cursos = [] } = useQuery({ queryKey: queryKeys.capacitacion.cursos(), queryFn: listarCursos })
  const { data: proveedores = [] } = useQuery({ queryKey: queryKeys.capacitacion.proveedores(), queryFn: listarProveedores })
  const { data: noms = [] } = useQuery({ queryKey: queryKeys.cumplimiento.noms(), queryFn: listarNoms })

  function ponerCurso(fila: Curso, encolado: boolean) {
    aplicarEscritura<Curso>({
      cliente, clave: queryKeys.capacitacion.cursos(), encolado,
      actualizar: (p) => (p.some((x) => x.id === fila.id) ? p.map((x) => (x.id === fila.id ? fila : x)) : [...p, fila])
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    })
  }
  function ponerProveedor(fila: Proveedor, encolado: boolean) {
    aplicarEscritura<Proveedor>({
      cliente, clave: queryKeys.capacitacion.proveedores(), encolado,
      actualizar: (p) => (p.some((x) => x.id === fila.id) ? p.map((x) => (x.id === fila.id ? fila : x)) : [...p, fila])
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    })
  }

  async function correr(accion: () => Promise<void>) {
    setGuardando(true)
    setError(null)
    try {
      await accion()
      setDialogo(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  const guardarCurso = (datos: DatosCurso) => correr(async () => {
    if (dialogo?.tipo !== 'curso') return
    const { fila, encolado } = dialogo.fila ? await actualizarCurso(dialogo.fila, datos) : await crearCurso(datos)
    ponerCurso(fila, encolado)
  })
  const guardarProveedor = (datos: DatosProveedor) => correr(async () => {
    if (dialogo?.tipo !== 'proveedor') return
    const { fila, encolado } = dialogo.fila ? await actualizarProveedor(dialogo.fila, datos) : await crearProveedor(datos)
    ponerProveedor(fila, encolado)
  })

  async function alternarCurso(c: Curso) {
    setError(null)
    try {
      const { fila, encolado } = await actualizarCurso(c, { activo: !c.activo })
      ponerCurso(fila, encolado)
    } catch (problema) { setError(mensajeDeError(problema)) }
  }
  async function alternarProveedor(p: Proveedor) {
    setError(null)
    try {
      const { fila, encolado } = await actualizarProveedor(p, { activo: !p.activo })
      ponerProveedor(fila, encolado)
    } catch (problema) { setError(mensajeDeError(problema)) }
  }

  const titulo = (texto: string, accion: () => void) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, margin: '0 0 6px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: 0 }}>{texto}</h2>
      {esSocio && <Button variante="secundario" tamano="sm" onClick={() => { setError(null); accion() }}>Agregar</Button>}
    </div>
  )

  return (
    <>
      {error && !dialogo && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      <section style={{ marginBottom: 32 }}>
        {titulo('Cursos', () => setDialogo({ tipo: 'curso', fila: null }))}
        {cursos.length === 0 ? (
          <EstadoVacio
            titulo="Sin cursos todavía"
            descripcion={esSocio
              ? 'La biblioteca se construye con los cursos que la firma va impartiendo: da de alta el primero cuando programes su sesión.'
              : 'Los cursos los da de alta un socio.'}
          />
        ) : (
          <Lista etiqueta="Cursos">
            {cursos.map((c) => (
              <Fila
                key={c.id}
                Icono={IconoCapacitacion}
                titulo={<span style={{ opacity: c.activo ? 1 : 0.55 }}>{c.nombre}</span>}
                meta={
                  <>
                    <span>{etiquetaDe(TIPOS_CURSO, c.tipo)}</span>
                    <span>{etiquetaDe(MODALIDADES, c.modalidad)}</span>
                    {c.duracion_horas != null && <span>{c.duracion_horas} h</span>}
                    {c.nom_id && <span className="mono">{noms.find((n) => n.id === c.nom_id)?.clave ?? 'NOM'}</span>}
                    {!c.activo && <span>Dado de baja</span>}
                  </>
                }
                // Sin `onClick` en la fila: los botones van dentro (ver PanelPrograma).
                derecha={esSocio ? (
                  <>
                    <Button variante="fantasma" tamano="sm" onClick={() => { setError(null); setDialogo({ tipo: 'curso', fila: c }) }}>Editar</Button>
                    <Button variante="fantasma" tamano="sm" onClick={() => alternarCurso(c)}>{c.activo ? 'Baja' : 'Reactivar'}</Button>
                  </>
                ) : undefined}
              />
            ))}
          </Lista>
        )}
      </section>

      <section>
        {titulo('Proveedores', () => setDialogo({ tipo: 'proveedor', fila: null }))}
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', margin: '0 0 8px', lineHeight: 1.5 }}>
          Los agentes capacitadores externos: imparten el curso y expiden el DC-3 con su registro ante la STPS.
          Summit no emite constancias.
        </p>
        {proveedores.length === 0 ? (
          <EstadoVacio
            titulo="Sin proveedores todavía"
            descripcion={esSocio ? 'Da de alta a los agentes capacitadores con los que trabaja la firma, con su registro STPS.' : 'Los proveedores los da de alta un socio.'}
          />
        ) : (
          <Lista etiqueta="Proveedores">
            {proveedores.map((p) => (
              <Fila
                key={p.id}
                Icono={IconoEquipo}
                titulo={<span style={{ opacity: p.activo ? 1 : 0.55 }}>{p.nombre}</span>}
                meta={
                  <>
                    {p.registro_stps
                      ? <span className="mono">STPS {p.registro_stps}</span>
                      : <span style={{ color: 'var(--advertencia)' }}>Sin registro STPS</span>}
                    {p.contacto && <span>{p.contacto}</span>}
                    {!p.activo && <span>Dado de baja</span>}
                  </>
                }
                derecha={esSocio ? (
                  <>
                    <Button variante="fantasma" tamano="sm" onClick={() => { setError(null); setDialogo({ tipo: 'proveedor', fila: p }) }}>Editar</Button>
                    <Button variante="fantasma" tamano="sm" onClick={() => alternarProveedor(p)}>{p.activo ? 'Baja' : 'Reactivar'}</Button>
                  </>
                ) : (p.activo ? undefined : <Badge tono="neutro">Baja</Badge>)}
              />
            ))}
          </Lista>
        )}
      </section>

      <Modal
        abierto={dialogo !== null}
        alCerrar={() => setDialogo(null)}
        titulo={
          dialogo?.tipo === 'curso'
            ? dialogo.fila ? dialogo.fila.nombre : 'Nuevo curso'
            : dialogo?.fila ? dialogo.fila.nombre : 'Nuevo proveedor'
        }
        ancho={600}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setDialogo(null)}>Cancelar</Button>
            <Button
              variante="primario"
              type="submit"
              form={dialogo?.tipo === 'curso' ? FORM_CURSO : FORM_PROVEEDOR}
              cargando={guardando}
            >
              {dialogo?.fila ? 'Guardar' : 'Dar de alta'}
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {dialogo?.tipo === 'curso' && (
          <FormularioCurso key={dialogo.fila?.id ?? 'nuevo'} id={FORM_CURSO} inicial={dialogo.fila ?? undefined} alEnviar={guardarCurso} />
        )}
        {dialogo?.tipo === 'proveedor' && (
          <FormularioProveedor key={dialogo.fila?.id ?? 'nuevo'} id={FORM_PROVEEDOR} inicial={dialogo.fila ?? undefined} alEnviar={guardarProveedor} />
        )}
      </Modal>
    </>
  )
}
