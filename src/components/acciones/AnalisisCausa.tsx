'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { aplicarEscritura } from '@/lib/query/cache'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly, hoyISO } from '@/lib/utils/dates'
import { guardarCausa, type HallazgoConContexto } from '@/lib/queries/hallazgos'
import {
  METODOS_CAUSA,
  PORQUES_SUGERIDOS,
  leerAnalisis,
  type Porque,
} from '@/lib/acciones/catalogos'
import { etiquetaDe } from '@/lib/cartera/catalogos'
import Aviso from '@/components/ui/Aviso'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

/**
 * **El `F-SG-07` Análisis de Causa Raíz 5 ¿Por qué?** [F04·B1].
 *
 * ⚠️ **Vive en el hallazgo, no en la acción.** Un análisis puede concluir que
 * NO se requieren acciones correctivas —es una respuesta válida y frecuente del
 * F-SG-07 §4—, y en `acciones` no tendría dónde vivir.
 *
 * ⚠️ **Pregunta y respuesta van en dos campos aunque el papel dé una sola
 * celda.** Cada «por qué» interroga la respuesta anterior: con un único cuadro
 * de texto la gente escribe cinco causas sueltas en vez de una cadena, que es lo
 * que hace inútil el método. Al imprimir se vuelven a juntar.
 *
 * ⚠️ **Y cada «por qué» lleva su propia evidencia**, que es lo que distingue un
 * análisis de una conversación.
 *
 * ⚠️ **Se guarda incompleto a propósito.** Si la pantalla exigiera la causa raíz
 * para guardar, la gente la inventaría — y ése es el vicio que un análisis de
 * causa existe para evitar. Lo que la app impide es *cerrar* con él a medias.
 */
export default function AnalisisCausa({
  hallazgo,
  claveLista,
}: {
  hallazgo: HallazgoConContexto
  /** La lista de la caché donde vive este hallazgo, para actualizarla en sitio. */
  claveLista: readonly unknown[]
}) {
  const cliente = useQueryClient()
  const inicial = leerAnalisis(hallazgo.causa_analisis)

  const [editando, setEditando] = useState(false)
  const [metodo, setMetodo] = useState(hallazgo.causa_metodo ?? 'cinco_porques')
  const [participantes, setParticipantes] = useState(hallazgo.causa_participantes ?? inicial.participantes)
  const [fecha, setFecha] = useState(hallazgo.causa_fecha ?? hoyISO())
  const [porques, setPorques] = useState<Porque[]>(() =>
    inicial.porques.length > 0
      ? inicial.porques
      : Array.from({ length: PORQUES_SUGERIDOS }, (_, i) => ({
          n: i + 1, pregunta: '', respuesta: '', evidencia: '',
        })),
  )
  const [causaRaiz, setCausaRaiz] = useState(hallazgo.causa_raiz ?? '')
  const [masInfo, setMasInfo] = useState(hallazgo.requiere_mas_informacion)
  const [requiereAcciones, setRequiereAcciones] = useState(hallazgo.requiere_acciones)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function escribir(indice: number, campo: keyof Omit<Porque, 'n'>, valor: string) {
    setPorques((previo) =>
      previo.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)),
    )
  }

  async function guardar() {
    setOcupado(true)
    setError(null)
    try {
      const { fila, encolado } = await guardarCausa(hallazgo, {
        causa_metodo: metodo,
        causa_analisis: { metodo, participantes, porques },
        causa_raiz: causaRaiz.trim() || null,
        causa_participantes: participantes.trim() || null,
        causa_fecha: fecha || null,
        requiere_mas_informacion: masInfo,
        requiere_acciones: requiereAcciones,
      })
      aplicarEscritura<HallazgoConContexto>({
        cliente,
        clave: claveLista,
        encolado,
        actualizar: (previo) => previo.map((h) => (h.id === fila.id ? fila : h)),
      })
      setEditando(false)
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setOcupado(false)
    }
  }

  const escritos = leerAnalisis(hallazgo.causa_analisis).porques

  // ── Lectura ──────────────────────────────────────────────────────────────
  if (!editando) {
    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Encabezado>
          Análisis de causa raíz
          <Button tamano="sm" variante="fantasma" onClick={() => setEditando(true)}>
            {escritos.length > 0 ? 'Editar' : 'Hacer el análisis'}
          </Button>
        </Encabezado>

        {escritos.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--texto-dim)' }}>
            Sin analizar. P-SG-05 §5.4 da <strong>15 días hábiles</strong> desde que se levantó
            la no conformidad, y pide reunir a un equipo: el responsable del proceso, quien
            estuvo involucrado y quien pueda aportar.
          </p>
        ) : (
          <>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {escritos.map((p) => (
                <li key={p.n}>
                  <div><strong>{p.pregunta}</strong></div>
                  <div>{p.respuesta}</div>
                  {p.evidencia && (
                    <div style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
                      Evidencia: {p.evidencia}
                    </div>
                  )}
                </li>
              ))}
            </ol>

            {hallazgo.causa_raiz ? (
              <Aviso tono="exito">
                <strong>Causa raíz.</strong> {hallazgo.causa_raiz}
              </Aviso>
            ) : hallazgo.requiere_mas_informacion ? (
              <Aviso tono="advertencia">
                <strong>Falta información.</strong> El equipo no está seguro de la causa raíz
                todavía. Es una conclusión válida: el F-SG-07 la contempla.
              </Aviso>
            ) : null}

            {!hallazgo.requiere_acciones && (
              <Aviso tono="info">
                <strong>No se requieren acciones correctivas.</strong> La corrección puntual
                bastó: no hay causa sistémica que atacar.
              </Aviso>
            )}

            <div style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
              {etiquetaDe(METODOS_CAUSA, hallazgo.causa_metodo)}
              {hallazgo.causa_fecha && ` · ${formatDateOnly(hallazgo.causa_fecha)}`}
              {hallazgo.causa_participantes && ` · ${hallazgo.causa_participantes}`}
            </div>
          </>
        )}
      </section>
    )
  }

  // ── Edición ──────────────────────────────────────────────────────────────
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Encabezado>Análisis de causa raíz</Encabezado>

      {error && <Aviso tono="error">{error}</Aviso>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px' }}>
          <Select etiqueta="Método" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            {METODOS_CAUSA.map((o) => (
              <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
            ))}
          </Select>
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <Input etiqueta="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>

      <Input
        etiqueta="Participantes"
        value={participantes}
        onChange={(e) => setParticipantes(e.target.value)}
        ayuda="Quiénes se reunieron a analizarlo. Texto libre: no hace falta darlos de alta como contactos."
      />

      {/* ⚠️ Cinco es lo que cabe en la hoja, NO un mínimo. La metodología dice
          «pregunta hasta que dejes de aprender», y menos de cinco es lo normal. */}
      {porques.map((p, i) => (
        <div
          key={i}
          style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            paddingTop: 10, borderTop: '1px solid var(--verde-tinta)',
          }}
        >
          <span style={{ font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)' }}>
            ¿Por qué? {i + 1}
          </span>
          <Input
            etiqueta={`Pregunta ${i + 1}`}
            etiquetaOculta
            placeholder={i === 0 ? '¿Por qué ocurrió el incumplimiento?' : 'Interroga la respuesta anterior…'}
            value={p.pregunta}
            onChange={(e) => escribir(i, 'pregunta', e.target.value)}
          />
          <Input
            etiqueta={`Respuesta ${i + 1}`}
            etiquetaOculta
            placeholder="Porque…"
            value={p.respuesta}
            onChange={(e) => escribir(i, 'respuesta', e.target.value)}
          />
          <Input
            etiqueta={`Evidencia ${i + 1}`}
            etiquetaOculta
            placeholder="Con qué se comprueba esta respuesta"
            value={p.evidencia}
            onChange={(e) => escribir(i, 'evidencia', e.target.value)}
          />
        </div>
      ))}

      <Button
        tamano="sm"
        variante="fantasma"
        onClick={() =>
          setPorques((previo) => [
            ...previo,
            { n: previo.length + 1, pregunta: '', respuesta: '', evidencia: '' },
          ])
        }
      >
        Añadir otro «por qué»
      </Button>

      <div style={{ paddingTop: 10, borderTop: '1px solid var(--verde-tinta)' }}>
        <Textarea
          etiqueta="Causa raíz"
          value={causaRaiz}
          onChange={(e) => setCausaRaiz(e.target.value)}
          ayuda="Puede quedar vacía: un análisis en curso es válido, y es mejor que una causa inventada."
        />
      </div>

      {/* El bloque «Cierre del ciclo» del F-SG-07 §4. */}
      <Checkbox
        etiqueta="Se requiere más información: no estoy seguro de la causa raíz"
        checked={masInfo}
        onChange={(e) => setMasInfo(e.target.checked)}
      />
      <Checkbox
        etiqueta="Se requieren acciones correctivas"
        checked={requiereAcciones}
        onChange={(e) => setRequiereAcciones(e.target.checked)}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <Button tamano="sm" onClick={guardar} disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar análisis'}
        </Button>
        <Button tamano="sm" variante="fantasma" onClick={() => setEditando(false)} disabled={ocupado}>
          Cancelar
        </Button>
      </div>
    </section>
  )
}

function Encabezado({ children }: { children: React.ReactNode }) {
  return (
    <h4
      style={{
        font: 'var(--txt-etiqueta)', color: 'var(--texto-dim)', margin: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}
    >
      {children}
    </h4>
  )
}
