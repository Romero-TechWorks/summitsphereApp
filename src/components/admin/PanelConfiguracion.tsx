'use client'

import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import { actualizarFirma, obtenerIdentidadFirma, type IdentidadFirma } from '@/lib/queries/firma'
import { ACEPTA_LOGOTIPO, esIncrustado, logotipoIncrustado } from '@/lib/firma/logotipo'
import {
  leerPlazos,
  plazosAJson,
  proponerFechaCompromiso,
  TIPOS_CON_PLAZO,
  type Plazos,
  type TipoConPlazo,
} from '@/lib/firma/plazos'
import { festivosOficiales } from '@/lib/utils/diasHabiles'
import { TIPOS_HALLAZGO } from '@/lib/auditorias/catalogos'
import { etiquetaDe } from '@/lib/cartera/catalogos'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import Aviso from '@/components/ui/Aviso'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'

/**
 * **Configuración de la firma** [F06·B3] — `/admin?tab=config`.
 *
 * Tres cosas, y las tres tienen quien las lea (regla 11):
 *
 * - **Datos de la firma y logotipo** → el membrete de todo lo imprimible.
 * - **Plazos por defecto** → la fecha compromiso que propone el formulario del
 *   hallazgo.
 * - **Festivos de la firma** → el calculador de días hábiles de esos plazos.
 *
 * ⚠️ **Lo que NO está, a propósito: los módulos encendidos.** Ninguno de los
 * cuatro módulos opcionales —facturación, asistente, automatización,
 * comercializadora— existe todavía en el código, y cuatro casillas que no
 * encienden nada son exactamente el interruptor muerto de la regla 11. La
 * casilla de cada uno llega con su módulo.
 *
 * Sólo un socio guarda —lo impone la base—; los demás ven lo mismo sin poder
 * tocarlo, porque saber qué plazo aplica la firma le sirve a cualquier auditor.
 */
export default function PanelConfiguracion() {
  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })
  const firma = useQuery({
    queryKey: queryKeys.firma.identidad(),
    queryFn: obtenerIdentidadFirma,
  })

  if (firma.isPending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
      </div>
    )
  }

  if (firma.isError) {
    return <Aviso tono="error">No se pudo leer la configuración: {mensajeDeError(firma.error)}</Aviso>
  }

  return (
    <FormularioFirma
      // Al guardar, la consulta se refresca y el formulario vuelve a nacer con
      // lo que quedó en la base — no con lo que se tecleó.
      key={firma.dataUpdatedAt}
      inicial={firma.data}
      esSocio={usuario?.rol === 'socio'}
    />
  )
}

function FormularioFirma({ inicial, esSocio }: { inicial: IdentidadFirma | null; esSocio: boolean }) {
  const cliente = useQueryClient()
  const entradaLogo = useRef<HTMLInputElement>(null)

  const [razonSocial, setRazonSocial] = useState(inicial?.razon_social ?? 'Summit-Sphere')
  const [rfc, setRfc] = useState(inicial?.rfc ?? '')
  const [direccion, setDireccion] = useState(inicial?.direccion ?? '')
  const [telefono, setTelefono] = useState(inicial?.telefono ?? '')
  const [correo, setCorreo] = useState(inicial?.correo ?? '')
  const [logotipo, setLogotipo] = useState<string | null>(inicial?.logotipo_url ?? null)
  const [plazos, setPlazos] = useState<Plazos>(() => leerPlazos(inicial?.plazos_default))
  const [festivoNuevo, setFestivoNuevo] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const hoy = hoyISO()
  const anio = Number(hoy.slice(0, 4))
  const oficiales = useMemo(
    () => [...festivosOficiales(anio), ...festivosOficiales(anio + 1)].filter((f) => f >= hoy),
    [anio, hoy],
  )

  async function elegirLogo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    // Se limpia para que volver a elegir el mismo archivo dispare otro cambio.
    evento.target.value = ''
    if (!archivo) return
    setError(null)
    try {
      setLogotipo(await logotipoIncrustado(archivo))
    } catch (problema) {
      setError(mensajeDeError(problema))
    }
  }

  function ponerDias(tipo: TipoConPlazo, texto: string) {
    const n = Number(texto)
    setPlazos((p) => ({
      ...p,
      dias: { ...p.dias, [tipo]: texto.trim() === '' || !Number.isFinite(n) || n <= 0 ? null : Math.floor(n) },
    }))
  }

  function agregarFestivo() {
    if (!festivoNuevo) return
    setPlazos((p) => ({ ...p, festivos: [...new Set([...p.festivos, festivoNuevo])].sort() }))
    setFestivoNuevo('')
  }

  function quitarFestivo(fecha: string) {
    setPlazos((p) => ({ ...p, festivos: p.festivos.filter((f) => f !== fecha) }))
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)
    setAviso(null)

    if (!razonSocial.trim()) {
      setError('La razón social no puede quedar vacía: es lo que va en el membrete.')
      return
    }

    setGuardando(true)
    try {
      const { fila, encolado } = await actualizarFirma(inicial, {
        razon_social: razonSocial.trim(),
        rfc: rfc.trim().toUpperCase() || null,
        direccion: direccion.trim() || null,
        telefono: telefono.trim() || null,
        correo: correo.trim() || null,
        logotipo_url: logotipo,
        plazos_default: plazosAJson(plazos),
      })
      cliente.setQueryData(queryKeys.firma.identidad(), fila)
      if (encolado) {
        setAviso('Guardado en este aparato. Se manda en cuanto vuelva la señal.')
      } else {
        setAviso('Guardado.')
        void cliente.invalidateQueries({ queryKey: queryKeys.firma.identidad() })
      }
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setGuardando(false)
    }
  }

  const etiquetaTipo = (tipo: string) => etiquetaDe(TIPOS_HALLAZGO, tipo)

  return (
    <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 720 }}>
      {!esSocio && (
        <Aviso tono="info">
          La configuración de la firma la cambia un socio. Aquí puedes consultar qué plazos aplica la
          firma y cómo sale el membrete.
        </Aviso>
      )}

      {/* ── Datos de la firma ───────────────────────────────────────────── */}
      <section style={SECCION}>
        <h2 style={TITULO}>Datos de la firma</h2>
        <p style={NOTA}>Van en el membrete de todo lo que se imprime: informes, programas, listas de asistencia.</p>

        <fieldset disabled={!esSocio} style={CAMPOS}>
          <Input etiqueta="Razón social" required value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
          <div style={FILA}>
            <div style={{ flex: '1 1 200px' }}>
              <Input etiqueta="RFC" value={rfc} onChange={(e) => setRfc(e.target.value)} className="mono" />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <Input etiqueta="Teléfono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>
          <Input etiqueta="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          <Input etiqueta="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </fieldset>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto-dim)' }}>Logotipo</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {logotipo ? (
              // Un `data:` o un enlace viejo: los dos los pinta un <img> sin más.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logotipo}
                alt="Logotipo de la firma"
                style={{ height: 48, width: 'auto', maxWidth: 240, background: '#ffffff', padding: 6, borderRadius: 4 }}
              />
            ) : (
              <span style={NOTA}>Sin logotipo: el membrete sale sólo con la razón social.</span>
            )}
            {esSocio && (
              <span style={{ display: 'inline-flex', gap: 8 }}>
                <Button type="button" tamano="sm" onClick={() => entradaLogo.current?.click()}>
                  {logotipo ? 'Cambiar' : 'Subir logotipo'}
                </Button>
                {logotipo && (
                  <Button type="button" tamano="sm" variante="fantasma" onClick={() => setLogotipo(null)}>
                    Quitar
                  </Button>
                )}
              </span>
            )}
            <input ref={entradaLogo} type="file" accept={ACEPTA_LOGOTIPO} onChange={elegirLogo} hidden />
          </div>
          <p style={NOTA}>
            Se guarda dentro de la configuración, reducido a 160 px de alto, para que el informe salga
            con logo aunque se imprima sin señal.
          </p>
          {logotipo && !esIncrustado(logotipo) && (
            <Aviso tono="advertencia">
              El logotipo actual es un <strong>enlace</strong>: sin señal no carga y el informe sale sin
              él. Vuelve a subirlo desde aquí para que quede guardado dentro.
            </Aviso>
          )}
        </div>
      </section>

      {/* ── Plazos por defecto ──────────────────────────────────────────── */}
      <section style={SECCION}>
        <h2 style={TITULO}>Plazos por defecto</h2>
        <p style={NOTA}>
          Cuánto tiene el cliente para responder a cada tipo de hallazgo. Al levantar un hallazgo, la
          app <strong>propone</strong> la fecha compromiso con este plazo; el auditor puede moverla.
        </p>

        <fieldset disabled={!esSocio} style={CAMPOS}>
          <Select
            etiqueta="Cómo se cuentan"
            value={plazos.unidad}
            onChange={(e) => setPlazos((p) => ({ ...p, unidad: e.target.value === 'naturales' ? 'naturales' : 'habiles' }))}
            ayuda={plazos.unidad === 'habiles'
              ? 'Sin sábados, domingos, festivos de ley ni los festivos de la firma de abajo. Es lo que dice P-SG-03.'
              : 'Todos los días del calendario.'}
          >
            <option value="habiles">Días hábiles</option>
            <option value="naturales">Días naturales</option>
          </Select>

          <div style={FILA}>
            {TIPOS_CON_PLAZO.map((tipo) => {
              const dias = plazos.dias[tipo]
              const vence = proponerFechaCompromiso(tipo, plazos, hoy)
              return (
                <div key={tipo} style={{ flex: '1 1 150px' }}>
                  <Input
                    etiqueta={etiquetaTipo(tipo)}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={dias ?? ''}
                    onChange={(e) => ponerDias(tipo, e.target.value)}
                    ayuda={dias && vence
                      ? `Levantado hoy, vence el ${formatDateOnly(vence)}`
                      : 'Vacío: sin propuesta, la fecha se captura a mano.'}
                  />
                </div>
              )
            })}
          </div>
        </fieldset>
      </section>

      {/* ── Festivos ───────────────────────────────────────────────────── */}
      {plazos.unidad === 'habiles' && (
        <section style={SECCION}>
          <h2 style={TITULO}>Días que la firma no cuenta</h2>
          <p style={NOTA}>
            Los festivos de ley (LFT, art. 74) ya se descuentan solos. Añade aquí lo que la ley no fija:
            la jornada electoral, Jueves y Viernes Santo, el 12 de diciembre, el cierre de fin de año.
          </p>

          {plazos.festivos.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {plazos.festivos.map((f) => (
                <li key={f} style={CHIP}>
                  <span>{formatDateOnly(f)}</span>
                  {esSocio && (
                    <button type="button" onClick={() => quitarFestivo(f)} aria-label={`Quitar ${formatDateOnly(f)}`} style={QUITAR}>×</button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p style={NOTA}>Ninguno todavía.</p>
          )}

          {esSocio && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '0 1 220px' }}>
                <Input etiqueta="Añadir un día" type="date" value={festivoNuevo} onChange={(e) => setFestivoNuevo(e.target.value)} />
              </div>
              <Button type="button" onClick={agregarFestivo} disabled={!festivoNuevo}>Añadir</Button>
            </div>
          )}

          <details>
            <summary style={{ ...NOTA, cursor: 'pointer' }}>Festivos de ley que ya se descuentan</summary>
            <p style={{ ...NOTA, marginTop: 6 }}>{oficiales.map(formatDateOnly).join(' · ')}</p>
          </details>
        </section>
      )}

      {error && <Aviso tono="error">{error}</Aviso>}
      {aviso && <Aviso tono="exito">{aviso}</Aviso>}

      {esSocio && (
        <div>
          <Button type="submit" variante="primario" cargando={guardando}>Guardar configuración</Button>
        </div>
      )}
    </form>
  )
}

const SECCION: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  paddingBottom: 22,
  borderBottom: '1px solid var(--verde)',
}
const TITULO: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: 0 }
const NOTA: React.CSSProperties = { fontSize: 13, lineHeight: 1.5, color: 'var(--texto-dim)', margin: 0 }
const CAMPOS: React.CSSProperties = { border: 0, padding: 0, margin: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }
const FILA: React.CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap' }
const CHIP: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  border: '1px solid var(--borde)',
  borderRadius: 999,
  fontSize: 13,
}
const QUITAR: React.CSSProperties = {
  border: 0,
  background: 'transparent',
  color: 'var(--texto-dim)',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  padding: 0,
}
