'use client'

import { Fragment, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { normalizar } from '@/lib/utils/texto'
import {
  AUTORIDADES_NOM,
  TIPOS_OBLIGACION_SUGERIDOS,
  claveDeNombre,
} from '@/lib/cumplimiento/catalogos'
import { etiquetaDe } from '@/lib/cartera/catalogos'
import {
  actualizarNom,
  actualizarRequisito,
  cambiarActivoTipo,
  crearNom,
  crearRequisito,
  crearTipoObligacion,
  listarNoms,
  listarTiposObligacion,
  type DatosNom,
  type DatosRequisito,
  type NomConRequisitos,
  type NomRequisito,
  type ObligacionTipo,
} from '@/lib/queries/noms'
import Aviso from '@/components/ui/Aviso'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import { IconoCumplimiento } from '@/components/ui/Iconos'
import FormularioNom from './FormularioNom'
import FormularioRequisito from './FormularioRequisito'

const FORM_NOM = 'form-nom'
const FORM_REQ = 'form-requisito'

/** Qué modal está abierto. Uno a la vez. */
type Dialogo =
  | { tipo: 'nom'; nom: NomConRequisitos | null }
  | { tipo: 'requisito'; nom: NomConRequisitos; requisito: NomRequisito | null }
  | null

/**
 * **La biblioteca de la firma** [F05·B1]: sus NOMs, lo que se revisa de cada
 * una y los tipos de obligación.
 *
 * ⚠️ **LA CONSTRUYE EL USUARIO** (decisión del dueño, 22 sep 2026). Nace vacía y
 * la llena un socio con sus palabras, poco a poco y cliente por cliente. Pedir
 * el catálogo completo por adelantado era pedirle a una firma emergente un año
 * de trabajo antes de usar la app — y en un año, la mitad obsoleto.
 *
 * ⚠️ **Nada se borra.** Una NOM sustituida se marca no vigente, un elemento se
 * apaga y un tipo se da de baja: hay obligaciones ya evaluadas que los citan.
 */
export default function PanelBiblioteca({ esSocio }: { esSocio: boolean }) {
  const cliente = useQueryClient()
  const clave = queryKeys.cumplimiento.noms()

  const [texto, setTexto] = useState('')
  const [verHistoricas, setVerHistoricas] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: noms = [], isPending } = useQuery({
    queryKey: clave,
    queryFn: listarNoms,
  })

  // Filtro en memoria (regla 7 del offline).
  const visibles = useMemo(() => {
    const aguja = normalizar(texto)
    return noms.filter((n) => {
      if (!verHistoricas && !n.vigente) return false
      if (!aguja) return true
      return (
        normalizar(n.clave).includes(aguja) ||
        normalizar(n.nombre).includes(aguja) ||
        n.requisitos.some((r) => normalizar(r.elemento).includes(aguja))
      )
    })
  }, [noms, texto, verHistoricas])

  const historicas = noms.filter((n) => !n.vigente).length

  function reemplazarNom(fila: NomConRequisitos, encolado: boolean) {
    aplicarEscritura<NomConRequisitos>({
      cliente,
      clave,
      encolado,
      actualizar: (previo) =>
        previo.some((n) => n.id === fila.id)
          ? previo.map((n) => (n.id === fila.id ? fila : n))
          : [...previo, fila].sort((a, b) => a.clave.localeCompare(b.clave)),
    })
  }

  async function guardarNom(datos: DatosNom) {
    if (dialogo?.tipo !== 'nom') return
    setGuardando(true)
    setError(null)
    try {
      const { fila, encolado } = dialogo.nom
        ? await actualizarNom(dialogo.nom, datos)
        : await crearNom(datos)
      reemplazarNom(fila, encolado)
      setAbierta(fila.id)
      setDialogo(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  async function guardarRequisito(datos: DatosRequisito) {
    if (dialogo?.tipo !== 'requisito') return
    const { nom, requisito } = dialogo
    setGuardando(true)
    setError(null)
    try {
      const { fila, encolado } = requisito
        ? await actualizarRequisito(requisito, datos)
        : await crearRequisito(nom.id, datos)

      const requisitos = (
        requisito
          ? nom.requisitos.map((r) => (r.id === fila.id ? fila : r))
          : [...nom.requisitos, fila]
      ).sort((a, b) => a.orden - b.orden)

      reemplazarNom({ ...nom, requisitos }, encolado)
      setDialogo(null)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  if (isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div style={{ flex: '1 1 220px', maxWidth: 320 }}>
          <Input
            etiqueta="Buscar"
            etiquetaOculta
            placeholder="Clave, nombre o elemento"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        {esSocio && (
          <Button variante="primario" onClick={() => { setError(null); setDialogo({ tipo: 'nom', nom: null }) }}>
            Nueva NOM
          </Button>
        )}
      </div>

      {historicas > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Checkbox
            etiqueta={`Ver las ${historicas} sustituidas`}
            checked={verHistoricas}
            onChange={(e) => setVerHistoricas(e.target.checked)}
          />
        </div>
      )}

      {error && !dialogo && (
        <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>
      )}

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={noms.length === 0 ? 'La biblioteca está vacía' : 'Nada con ese texto'}
          descripcion={
            noms.length === 0
              ? esSocio
                ? 'La biblioteca la construye la firma, con sus palabras y a su ritmo. Empieza con las ocho que ya tienen procesadas del levantamiento STPS: NOM-001, 002, 019, 025, 026, 030, 035 y 037. Cada una con sus elementos — «Extintores», «Carpeta normativa»…'
                : 'Todavía no hay NOMs en la biblioteca de la firma. Las da de alta un socio.'
              : 'Prueba con la clave, el nombre o un elemento.'
          }
          accion={
            noms.length === 0 && esSocio ? (
              <Button variante="primario" onClick={() => setDialogo({ tipo: 'nom', nom: null })}>
                Dar de alta la primera
              </Button>
            ) : null
          }
        />
      ) : (
        <Lista etiqueta="Biblioteca de NOMs">
          {visibles.map((nom) => {
            const activos = nom.requisitos.filter((r) => r.activa)
            const estaAbierta = abierta === nom.id
            return (
              <Fragment key={nom.id}>
                <Fila
                  Icono={IconoCumplimiento}
                  titulo={
                    <>
                      <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>{nom.clave}</span>
                      {nom.nombre}
                    </>
                  }
                  meta={
                    <>
                      <span>{etiquetaDe(AUTORIDADES_NOM, nom.autoridad)}</span>
                      <span>{activos.length} elemento{activos.length === 1 ? '' : 's'}</span>
                      {nom.periodicidad && <span>{nom.periodicidad}</span>}
                    </>
                  }
                  derecha={!nom.vigente ? <Badge tono="neutro">Sustituida</Badge> : undefined}
                  onClick={() => setAbierta(estaAbierta ? null : nom.id)}
                />
                {estaAbierta && (
                  <li>
                    <ElementosDeLaNom
                      nom={nom}
                      esSocio={esSocio}
                      alEditarNom={() => { setError(null); setDialogo({ tipo: 'nom', nom }) }}
                      alNuevo={() => { setError(null); setDialogo({ tipo: 'requisito', nom, requisito: null }) }}
                      alEditar={(requisito) => { setError(null); setDialogo({ tipo: 'requisito', nom, requisito }) }}
                    />
                  </li>
                )}
              </Fragment>
            )
          })}
        </Lista>
      )}

      <TiposDeObligacion esSocio={esSocio} />

      <Modal
        abierto={dialogo?.tipo === 'nom'}
        alCerrar={() => setDialogo(null)}
        titulo={dialogo?.tipo === 'nom' && dialogo.nom ? dialogo.nom.clave : 'Nueva NOM'}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setDialogo(null)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_NOM} cargando={guardando}>
              {dialogo?.tipo === 'nom' && dialogo.nom ? 'Guardar' : 'Dar de alta'}
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {dialogo?.tipo === 'nom' && (
          <FormularioNom id={FORM_NOM} inicial={dialogo.nom ?? undefined} alEnviar={guardarNom} />
        )}
      </Modal>

      <Modal
        abierto={dialogo?.tipo === 'requisito'}
        alCerrar={() => setDialogo(null)}
        titulo={
          dialogo?.tipo === 'requisito'
            ? dialogo.requisito
              ? `${dialogo.nom.clave} · ${dialogo.requisito.elemento}`
              : `Nuevo elemento de la ${dialogo.nom.clave}`
            : ''
        }
        ancho={600}
        pie={
          <>
            <Button variante="fantasma" onClick={() => setDialogo(null)}>Cancelar</Button>
            <Button variante="primario" type="submit" form={FORM_REQ} cargando={guardando}>
              {dialogo?.tipo === 'requisito' && dialogo.requisito ? 'Guardar' : 'Agregar'}
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}
        {dialogo?.tipo === 'requisito' && (
          <FormularioRequisito
            id={FORM_REQ}
            inicial={dialogo.requisito ?? undefined}
            ordenSugerido={dialogo.nom.requisitos.reduce((m, r) => Math.max(m, r.orden), 0) + 1}
            alEnviar={guardarRequisito}
          />
        )}
      </Modal>
    </>
  )
}

function ElementosDeLaNom({
  nom,
  esSocio,
  alEditarNom,
  alNuevo,
  alEditar,
}: {
  nom: NomConRequisitos
  esSocio: boolean
  alEditarNom: () => void
  alNuevo: () => void
  alEditar: (requisito: NomRequisito) => void
}) {
  return (
    <div style={{ padding: '6px 0 18px 28px' }}>
      {nom.requisitos.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', margin: '0 0 10px' }}>
          Sin elementos todavía. Un elemento es lo que se revisa: «Extintores», «Estudio de riesgo de incendio»,
          «Carpeta normativa». Sin ellos, generar la matriz de esta NOM no crea nada.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: '0 0 10px', padding: 0 }}>
          {nom.requisitos.map((r) => (
            <li
              key={r.id}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid rgba(61, 186, 78, .12)',
                opacity: r.activa ? 1 : 0.55,
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--texto)' }}>
                    {r.numeral && (
                      <span className="mono" style={{ color: 'var(--texto-dim)', marginRight: 8 }}>{r.numeral}</span>
                    )}
                    {r.elemento}
                    {!r.activa && <span style={{ fontWeight: 400, color: 'var(--texto-dim)' }}> · apagado</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--texto-dim)', marginTop: 2, lineHeight: 1.5 }}>
                    {r.descripcion}
                    {r.aplica_si && <><br />Aplica: {r.aplica_si}</>}
                  </div>
                </div>
                {esSocio && (
                  <Button variante="fantasma" tamano="sm" onClick={() => alEditar(r)}>Editar</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {esSocio && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variante="secundario" tamano="sm" onClick={alNuevo}>Agregar elemento</Button>
          <Button variante="fantasma" tamano="sm" onClick={alEditarNom}>Editar la NOM</Button>
        </div>
      )}
    </div>
  )
}

/**
 * **Los tipos de obligación** — decisión 3 del dueño: un catálogo editable, no
 * un CHECK.
 *
 * ⚠️ La lista sugerida NO se siembra: se ofrece para que el socio dé de alta con
 * un toque los que ya usa. La clave se deriva del nombre.
 */
function TiposDeObligacion({ esSocio }: { esSocio: boolean }) {
  const cliente = useQueryClient()
  const clave = queryKeys.cumplimiento.tipos()
  const [nombre, setNombre] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: tipos = [] } = useQuery({
    queryKey: clave,
    queryFn: listarTiposObligacion,
  })

  const claves = new Set(tipos.map((t) => t.clave))
  const sugeridos = TIPOS_OBLIGACION_SUGERIDOS.filter((s) => !claves.has(claveDeNombre(s)))

  async function alta(texto: string) {
    const limpio = texto.trim()
    const claveTipo = claveDeNombre(limpio)
    if (!claveTipo) return
    if (claves.has(claveTipo)) {
      setError(`«${limpio}» ya está en la lista.`)
      return
    }
    setTrabajando(true)
    setError(null)
    try {
      const { fila, encolado } = await crearTipoObligacion({
        clave: claveTipo,
        nombre: limpio,
        descripcion: null,
        orden: tipos.length + 1,
      })
      aplicarEscritura<ObligacionTipo>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => [...previo, fila],
      })
      setNombre('')
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setTrabajando(false)
    }
  }

  async function alternar(tipo: ObligacionTipo) {
    setError(null)
    try {
      const { fila, encolado } = await cambiarActivoTipo(tipo, !tipo.activo)
      aplicarEscritura<ObligacionTipo>({
        cliente,
        clave,
        encolado,
        actualizar: (previo) => previo.map((t) => (t.id === fila.id ? fila : t)),
      })
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px' }}>
        Tipos de obligación
      </h2>
      <p style={{ fontSize: 13, color: 'var(--texto-dim)', margin: '0 0 12px', lineHeight: 1.5 }}>
        Clasifican las obligaciones y lo que vence: estudio, dictamen, licencia, poder notarial… Son de la firma y
        se dan de baja, no se borran.
      </p>

      {error && <div style={{ marginBottom: 12 }}><Aviso tono="error">{error}</Aviso></div>}

      {tipos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {tipos.map((t) => (
            <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Badge tono={t.activo ? 'exito' : 'neutro'}>{t.nombre}{t.activo ? '' : ' · baja'}</Badge>
              {esSocio && (
                <Button
                  variante="fantasma"
                  tamano="sm"
                  onClick={() => alternar(t)}
                  title={t.activo ? `Dar de baja ${t.nombre}` : `Reactivar ${t.nombre}`}
                >
                  {t.activo ? 'Baja' : 'Reactivar'}
                </Button>
              )}
            </span>
          ))}
        </div>
      )}

      {esSocio && (
        <>
          <form
            onSubmit={(e) => { e.preventDefault(); void alta(nombre) }}
            style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', maxWidth: 480 }}
          >
            <div style={{ flex: '1 1 220px' }}>
              <Input
                etiqueta="Nuevo tipo"
                placeholder="Examen médico"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <Button variante="secundario" type="submit" cargando={trabajando} disabled={!nombre.trim()}>
              Agregar
            </Button>
          </form>

          {sugeridos.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--texto-dim)' }}>Sugeridos:</span>
              {sugeridos.map((s) => (
                <Button key={s} variante="fantasma" tamano="sm" onClick={() => alta(s)} disabled={trabajando}>
                  + {s}
                </Button>
              ))}
            </div>
          )}
        </>
      )}

      {tipos.length === 0 && !esSocio && (
        <p style={{ fontSize: 13, color: 'var(--texto-dim)' }}>Todavía no hay tipos. Los da de alta un socio.</p>
      )}
    </section>
  )
}
