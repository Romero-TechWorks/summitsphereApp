'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { DESCRIPCION_ROL, esRol, etiquetaRol, ROLES } from '@/lib/auth/roles'
import {
  actualizarPerfil,
  cambiarActivoCuenta,
  darDeAltaCuenta,
  listarCuentas,
  nuevaContrasenaTemporal,
  obtenerUsuarioActual,
  type Usuario,
} from '@/lib/queries/usuarios'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Textarea from '@/components/ui/Textarea'
import { IconoEquipo } from '@/components/ui/Iconos'

const FORM_ALTA = 'form-alta-cuenta'
const FORM_PERFIL = 'form-perfil-cuenta'

type Dialogo =
  | { tipo: 'alta' }
  | { tipo: 'perfil'; usuario: Usuario }
  | { tipo: 'confirmar-contrasena'; usuario: Usuario }
  | { tipo: 'confirmar-baja'; usuario: Usuario }
  | { tipo: 'contrasena'; nombre: string; correo: string; contrasena: string; nueva: boolean }
  | null

/**
 * **Usuarios** [F06·B3] — `/admin?tab=usuarios`. Sólo la ve un socio.
 *
 * Decisión del dueño (23 sep 2026): **el socio da de alta la cuenta con una
 * contraseña temporal**, se la entrega a la persona, y ésta la cambia al entrar
 * (`src/proxy.ts` → `/contrasena`). La temporal se enseña **una sola vez**: no
 * se guarda en ningún sitio, y si se pierde se genera otra.
 *
 * Qué va por dónde, y por qué:
 *
 * - **Alta, contraseña temporal y baja** → `/api/users`, con `service_role`.
 *   Tocan `auth.users`, y la baja además **bloquea** la cuenta: `activo = false`
 *   a secas no le cierra la puerta a un consultor (ver la ruta).
 * - **Nombre, teléfono, rol y certificaciones** → la cola, como cualquier fila.
 *   El RLS y `proteger_rol_usuario()` ya deciden quién puede.
 *
 * ⚠️ **La asignación a clientes NO está aquí**, sigue en la pestaña Equipo de
 * cada expediente: se decide mirando al cliente, no a la persona (F01·B1).
 */
export default function PanelUsuarios() {
  const cliente = useQueryClient()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avisos, setAvisos] = useState<string[]>([])

  const { data: yo } = useQuery({ queryKey: queryKeys.usuario.actual(), queryFn: obtenerUsuarioActual })
  const cuentas = useQuery({ queryKey: queryKeys.admin.usuarios(), queryFn: listarCuentas })

  function refrescar() {
    void cliente.invalidateQueries({ queryKey: queryKeys.admin.usuarios() })
    void cliente.invalidateQueries({ queryKey: queryKeys.cartera.usuariosFirma() })
  }

  function poner(fila: Usuario, encolado: boolean) {
    aplicarEscritura<Usuario>({
      cliente,
      clave: queryKeys.admin.usuarios(),
      encolado,
      actualizar: (p) => p.map((u) => (u.id === fila.id ? fila : u)),
      ademasInvalidar: [queryKeys.cartera.usuariosFirma()],
    })
  }

  async function correr(accion: () => Promise<void>) {
    setOcupado(true)
    setError(null)
    setAvisos([])
    try {
      await accion()
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  const alta = (datos: { nombre: string; correo: string; rol: string; telefono: string }) => correr(async () => {
    const r = await darDeAltaCuenta(datos)
    setAvisos(r.avisos ?? [])
    refrescar()
    setDialogo({ tipo: 'contrasena', nombre: datos.nombre, correo: datos.correo.toLowerCase(), contrasena: r.contrasena, nueva: true })
  })

  const guardarPerfil = (u: Usuario, datos: Pick<Usuario, 'nombre' | 'telefono' | 'rol' | 'certificaciones'>) => correr(async () => {
    const { fila, encolado } = await actualizarPerfil(u, datos)
    poner(fila, encolado)
    setDialogo(null)
  })

  const resetear = (u: Usuario) => correr(async () => {
    const r = await nuevaContrasenaTemporal(u.id)
    setAvisos(r.avisos ?? [])
    setDialogo({ tipo: 'contrasena', nombre: u.nombre, correo: u.correo, contrasena: r.contrasena, nueva: false })
  })

  const alternarActivo = (u: Usuario) => correr(async () => {
    const r = await cambiarActivoCuenta(u.id, !u.activo)
    setAvisos(r.avisos ?? [])
    poner(r.usuario, false)
    setDialogo(null)
  })

  const lista = cuentas.data ?? []

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', margin: 0, lineHeight: 1.5 }}>
          Las cuentas de la firma. Qué clientes ve cada quien se decide en la pestaña <strong>Equipo</strong> de
          cada expediente.
        </p>
        <Button variante="primario" tamano="sm" onClick={() => { setError(null); setDialogo({ tipo: 'alta' }) }}>
          Dar de alta
        </Button>
      </div>

      {error && !dialogo && <div style={{ margin: '8px 0' }}><Aviso tono="error">{error}</Aviso></div>}
      {avisos.map((a) => <div key={a} style={{ margin: '8px 0' }}><Aviso tono="advertencia">{a}</Aviso></div>)}

      {cuentas.isPending ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
        </div>
      ) : cuentas.isError ? (
        <Aviso tono="error">No se pudo leer la lista de cuentas: {mensajeDeError(cuentas.error)}</Aviso>
      ) : lista.length === 0 ? (
        <EstadoVacio titulo="Sin cuentas" descripcion="Da de alta a la primera persona de la firma." />
      ) : (
        <Lista etiqueta="Cuentas de la firma">
          {lista.map((u) => {
            const soyYo = u.id === yo?.id
            return (
              <Fila
                key={u.id}
                Icono={IconoEquipo}
                titulo={<span style={{ opacity: u.activo ? 1 : 0.55 }}>{u.nombre}{soyYo ? ' (tú)' : ''}</span>}
                meta={
                  <>
                    <span>{u.correo}</span>
                    <span>{etiquetaRol(u.rol)}</span>
                    {u.es_dev && <span className="mono">DEV</span>}
                    {!u.activo && <span>Dada de baja</span>}
                  </>
                }
                derecha={
                  <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {!u.activo && <Badge tono="neutro">Baja</Badge>}
                    <Button variante="fantasma" tamano="sm" onClick={() => { setError(null); setDialogo({ tipo: 'perfil', usuario: u }) }}>
                      Editar
                    </Button>
                    {!soyYo && u.activo && (
                      <Button variante="fantasma" tamano="sm" onClick={() => { setError(null); setDialogo({ tipo: 'confirmar-contrasena', usuario: u }) }}>
                        Contraseña
                      </Button>
                    )}
                    {!soyYo && (
                      <Button
                        variante="fantasma"
                        tamano="sm"
                        disabled={ocupado}
                        onClick={() => { setError(null); if (u.activo) setDialogo({ tipo: 'confirmar-baja', usuario: u }); else void alternarActivo(u) }}
                      >
                        {u.activo ? 'Baja' : 'Reactivar'}
                      </Button>
                    )}
                  </span>
                }
              />
            )
          })}
        </Lista>
      )}

      {/* ── Alta ─────────────────────────────────────────────────────────── */}
      <Modal
        abierto={dialogo?.tipo === 'alta'}
        alCerrar={() => setDialogo(null)}
        titulo="Nueva cuenta"
        pie={
          <>
            <Button variante="fantasma" onClick={() => setDialogo(null)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_ALTA} cargando={ocupado}>Dar de alta</Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {dialogo?.tipo === 'alta' && <FormularioAlta alEnviar={alta} />}
      </Modal>

      {/* ── Perfil ───────────────────────────────────────────────────────── */}
      <Modal
        abierto={dialogo?.tipo === 'perfil'}
        alCerrar={() => setDialogo(null)}
        titulo={dialogo?.tipo === 'perfil' ? dialogo.usuario.nombre : ''}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setDialogo(null)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_PERFIL} cargando={ocupado}>Guardar</Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {dialogo?.tipo === 'perfil' && (
          <FormularioPerfil
            key={dialogo.usuario.id}
            usuario={dialogo.usuario}
            soyYo={dialogo.usuario.id === yo?.id}
            alEnviar={(datos) => guardarPerfil(dialogo.usuario, datos)}
          />
        )}
      </Modal>

      {/* ── Confirmaciones ──────────────────────────────────────────────── */}
      <Modal
        abierto={dialogo?.tipo === 'confirmar-contrasena' || dialogo?.tipo === 'confirmar-baja'}
        alCerrar={() => setDialogo(null)}
        titulo={dialogo?.tipo === 'confirmar-baja' ? 'Dar de baja' : 'Contraseña temporal nueva'}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setDialogo(null)}>Cancelar</Button>
            <Button
              variante="primario"
              cargando={ocupado}
              onClick={() => {
                if (dialogo?.tipo === 'confirmar-baja') void alternarActivo(dialogo.usuario)
                if (dialogo?.tipo === 'confirmar-contrasena') void resetear(dialogo.usuario)
              }}
            >
              {dialogo?.tipo === 'confirmar-baja' ? 'Dar de baja' : 'Generar'}
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {dialogo?.tipo === 'confirmar-baja' && (
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            <strong>{dialogo.usuario.nombre}</strong> deja de poder entrar a la app en cuanto confirmes. Su cuenta
            no se borra —lo que firmó sigue firmado con su nombre— y se puede reactivar desde esta lista.
          </p>
        )}
        {dialogo?.tipo === 'confirmar-contrasena' && (
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            La contraseña actual de <strong>{dialogo.usuario.nombre}</strong> deja de servir. Recibirás una temporal
            para entregársela, y la app le pedirá cambiarla al entrar.
          </p>
        )}
      </Modal>

      {/* ── La contraseña, una sola vez ─────────────────────────────────── */}
      <Modal
        abierto={dialogo?.tipo === 'contrasena'}
        alCerrar={() => setDialogo(null)}
        titulo={dialogo?.tipo === 'contrasena' && dialogo.nueva ? 'Cuenta creada' : 'Contraseña temporal'}
        pie={<Button variante="primario" onClick={() => setDialogo(null)}>Ya la entregué</Button>}
      >
        {dialogo?.tipo === 'contrasena' && <ContrasenaUnaVez {...dialogo} />}
      </Modal>
    </>
  )
}

function FormularioAlta({ alEnviar }: { alEnviar: (d: { nombre: string; correo: string; rol: string; telefono: string }) => void }) {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [rol, setRol] = useState('consultor')
  const [telefono, setTelefono] = useState('')

  return (
    <form
      id={FORM_ALTA}
      onSubmit={(e) => { e.preventDefault(); alEnviar({ nombre: nombre.trim(), correo: correo.trim(), rol, telefono: telefono.trim() }) }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <Input etiqueta="Nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" />
      <Input
        etiqueta="Correo"
        type="email"
        required
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        autoComplete="off"
        ayuda="Es con lo que va a entrar. No se le manda ningún correo."
      />
      <SelectorRol valor={rol} alCambiar={setRol} />
      <Input etiqueta="Teléfono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
    </form>
  )
}

function FormularioPerfil({
  usuario,
  soyYo,
  alEnviar,
}: {
  usuario: Usuario
  soyYo: boolean
  alEnviar: (d: Pick<Usuario, 'nombre' | 'telefono' | 'rol' | 'certificaciones'>) => void
}) {
  const [nombre, setNombre] = useState(usuario.nombre)
  const [telefono, setTelefono] = useState(usuario.telefono ?? '')
  const [rol, setRol] = useState(usuario.rol)
  const [certificaciones, setCertificaciones] = useState(usuario.certificaciones.join('\n'))

  return (
    <form
      id={FORM_PERFIL}
      onSubmit={(e) => {
        e.preventDefault()
        alEnviar({
          nombre: nombre.trim() || usuario.nombre,
          telefono: telefono.trim() || null,
          rol,
          certificaciones: certificaciones.split('\n').map((c) => c.trim()).filter(Boolean),
        })
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-dim)' }}>{usuario.correo}</p>
      <Input etiqueta="Nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <Input etiqueta="Teléfono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      {soyYo ? (
        // Un socio que se quita el rol a sí mismo pierde en ese instante la
        // pantalla desde la que podría devolvérselo.
        <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-dim)' }}>
          Rol: <strong>{etiquetaRol(usuario.rol)}</strong>. Tu propio rol lo cambia otro socio.
        </p>
      ) : (
        <SelectorRol valor={rol} alCambiar={setRol} />
      )}
      <Textarea
        etiqueta="Certificaciones"
        rows={3}
        value={certificaciones}
        onChange={(e) => setCertificaciones(e.target.value)}
        ayuda="Una por renglón. Salen impresas en el informe: «Auditor líder ISO 9001»."
      />
    </form>
  )
}

function SelectorRol({ valor, alCambiar }: { valor: string; alCambiar: (rol: string) => void }) {
  return (
    <Select
      etiqueta="Rol"
      required
      value={valor}
      onChange={(e) => alCambiar(e.target.value)}
      ayuda={esRol(valor) ? DESCRIPCION_ROL[valor].ayuda : undefined}
    >
      {/* Un rol que la base tenga y el código no conozca se enseña, no se pierde. */}
      {!esRol(valor) && <option value={valor}>{valor}</option>}
      {ROLES.map((r) => <option key={r} value={r}>{DESCRIPCION_ROL[r].etiqueta}</option>)}
    </Select>
  )
}

/**
 * La contraseña temporal, **una sola vez**. No se guarda en la caché ni en
 * ningún estado que sobreviva al cerrar este diálogo.
 */
function ContrasenaUnaVez({ nombre, correo, contrasena }: { nombre: string; correo: string; contrasena: string }) {
  const [copiado, setCopiado] = useState<'si' | 'no' | null>(null)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`Correo: ${correo}\nContraseña temporal: ${contrasena}`)
      setCopiado('si')
    } catch {
      // Sin permiso de portapapeles —o sin HTTPS— el navegador no deja. Se dice,
      // y la contraseña sigue en pantalla para copiarla a mano.
      setCopiado('no')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, lineHeight: 1.55 }}>
        Entrégale a <strong>{nombre}</strong> estos datos. Al entrar, la app le pedirá poner una contraseña propia.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, color: 'var(--texto-dim)' }}>Correo</span>
        <span className="mono" style={{ wordBreak: 'break-all' }}>{correo}</span>
        <span style={{ fontSize: 13, color: 'var(--texto-dim)' }}>Contraseña</span>
        <span className="mono" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '.04em' }}>{contrasena}</span>
      </div>
      <div>
        <Button tamano="sm" onClick={copiar}>{copiado === 'si' ? 'Copiados' : 'Copiar los dos'}</Button>
      </div>
      {copiado === 'no' && (
        <Aviso tono="info">Este navegador no dejó copiar. Selecciónala y cópiala a mano.</Aviso>
      )}
      <Aviso tono="advertencia">
        <strong>No se vuelve a enseñar.</strong> Si se pierde, genera otra desde la lista. No la mandes por el mismo
        canal que el correo si puedes evitarlo.
      </Aviso>
    </div>
  )
}
