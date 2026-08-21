'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import { useEnLinea } from '@/lib/offline/estado'
import { analizarCatalogo, PLANTILLA_MD, type Analisis } from '@/lib/normas/importador'
import {
  importarCatalogo,
  previsualizarImportacion,
  type CambiosDeNorma,
  type ResumenImportacion,
} from '@/lib/queries/normas'
import Aviso from '@/components/ui/Aviso'
import Button from '@/components/ui/Button'

/**
 * Subir el catálogo de normas de Summit [F01·B2b].
 *
 * ⚠️ **Nada se escribe sin vista previa.** Primero se lee el archivo, se enseña
 * el saldo —cuántas cláusulas entran, cuántas cambian, cuántas se dan de baja— y
 * **decide una persona**. El catálogo es el criterio técnico de la firma y
 * aparece en cada lista de verificación y en cada hallazgo; sustituirlo a ciegas
 * por lo que traiga un archivo no es aceptable.
 *
 * ⚠️ Sólo lo ve un socio, y sólo un socio puede escribirlo: lo impone la base
 * (`normas_insert ... with check (es_socio())`), no esta pantalla.
 */
export default function ImportadorNormas() {
  const cliente = useQueryClient()
  const enLinea = useEnLinea()
  const entrada = useRef<HTMLInputElement>(null)

  // Todo esto es estado de la PANTALLA, no datos del servidor: sale de un
  // archivo que sólo existe aquí y que no tiene sentido cachear.
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [cambios, setCambios] = useState<CambiosDeNorma[] | null>(null)
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)

  async function elegirArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    if (!archivo) return

    setNombreArchivo(archivo.name)
    setResumen(null)
    setCambios(null)
    setError(null)

    try {
      const leido = analizarCatalogo(await archivo.text())
      setAnalisis(leido)

      if (leido.errores.length === 0) {
        setTrabajando(true)
        setCambios(await previsualizarImportacion(leido))
      }
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setTrabajando(false)
      // Sin esto, volver a elegir el MISMO archivo no dispara el evento: el
      // valor del input no cambió. Y reintentar el mismo archivo corregido es
      // exactamente lo que se va a hacer diez veces seguidas.
      if (entrada.current) entrada.current.value = ''
    }
  }

  async function importar() {
    if (!analisis) return

    setTrabajando(true)
    setError(null)

    try {
      const hecho = await importarCatalogo(analisis)
      setResumen(hecho)
      setAnalisis(null)
      setCambios(null)

      // El catálogo cambió: el selector de alcance de los proyectos y el árbol
      // de esta pantalla tienen que releerlo.
      void cliente.invalidateQueries({ queryKey: queryKeys.normas.catalogo() })
      void cliente.invalidateQueries({ queryKey: queryKeys.normas.arbol() })
    } catch (problema) {
      setError(mensajeDeError(problema))
    } finally {
      setTrabajando(false)
    }
  }

  function descargarPlantilla() {
    const blob = new Blob([PLANTILLA_MD], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = 'catalogo-de-normas.md'
    enlace.click()
    URL.revokeObjectURL(url)
  }

  const hayErrores = (analisis?.errores.length ?? 0) > 0

  return (
    <section style={{ paddingBottom: 24, borderBottom: '2px solid rgba(61, 186, 78, .16)' }}>
      <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Cargar el catálogo</h3>
      <p style={{ fontSize: 13, color: 'var(--texto-dim)', lineHeight: 1.55, maxWidth: 620 }}>
        El catálogo vive en un archivo <span className="mono">.md</span> tuyo, no en el código de la
        aplicación. Súbelo las veces que haga falta: corregir un resumen es volver a subirlo, y no
        se duplica nada.
      </p>
      <p style={{ fontSize: 13, color: 'var(--advertencia)', lineHeight: 1.55, maxWidth: 620, marginTop: 8 }}>
        ⚠️ El resumen de cada cláusula lo redacta Summit. <strong>No se copia el texto de la
        norma</strong>: es obra protegida y la firma la tiene bajo licencia.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <input
          ref={entrada}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          onChange={elegirArchivo}
          className="sr-only"
          id="archivo-catalogo"
        />
        <Button variante="secundario" onClick={() => entrada.current?.click()}>
          Elegir archivo…
        </Button>
        <Button variante="fantasma" onClick={descargarPlantilla}>
          Descargar la plantilla
        </Button>
      </div>

      {nombreArchivo && (
        <p style={{ fontSize: 13, color: 'var(--texto-dim)', marginTop: 10 }}>
          Archivo: <span className="mono">{nombreArchivo}</span>
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        {!enLinea && (
          <Aviso tono="advertencia">
            Sin conexión no se puede importar: son cientos de filas en lote y no pasan por la cola
            de salida. Lo demás de la app sigue funcionando.
          </Aviso>
        )}

        {error && <Aviso tono="error">{error}</Aviso>}

        {resumen && (
          <Aviso tono="exito">
            Catálogo actualizado: {resumen.normas} {resumen.normas === 1 ? 'norma' : 'normas'} y{' '}
            {resumen.clausulas} {resumen.clausulas === 1 ? 'cláusula' : 'cláusulas'}
            {resumen.desactivadas > 0
              ? `, y ${resumen.desactivadas} que ya no venían en el archivo quedaron dadas de baja.`
              : '.'}
          </Aviso>
        )}

        {/* Los errores impiden importar; los avisos sólo cuentan qué se ignoró. */}
        {analisis?.errores.map((problema, i) => (
          <Aviso key={`error-${i}`} tono="error">{problema}</Aviso>
        ))}

        {analisis?.avisos.map((problema, i) => (
          <Aviso key={`aviso-${i}`} tono="advertencia">{problema}</Aviso>
        ))}
      </div>

      {cambios && !hayErrores && (
        <div style={{ marginTop: 16 }}>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              color: 'var(--texto-dim)',
              marginBottom: 8,
            }}
          >
            Lo que va a pasar
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {cambios.map((cambio) => (
              <div
                key={cambio.clave}
                style={{
                  padding: '10px 2px',
                  borderBottom: '1px solid var(--borde)',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {cambio.nombre}{' '}
                  {cambio.esNueva && (
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--exito)' }}>· norma nueva</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--texto-dim)', marginTop: 2 }}>
                  <span className="mono">{cambio.nuevas}</span> nuevas ·{' '}
                  <span className="mono">{cambio.cambiadas}</span> con cambios ·{' '}
                  <span className="mono">{cambio.igual}</span> igual
                  {cambio.salen > 0 && (
                    <>
                      {' · '}
                      <span style={{ color: 'var(--advertencia)' }}>
                        <span className="mono">{cambio.salen}</span> se dan de baja
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <Button
              variante="primario"
              onClick={importar}
              cargando={trabajando}
              disabled={!enLinea}
            >
              Importar el catálogo
            </Button>
            <Button
              variante="fantasma"
              onClick={() => { setAnalisis(null); setCambios(null); setNombreArchivo('') }}
            >
              Descartar
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
