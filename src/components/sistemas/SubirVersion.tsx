'use client'

import { useRef, useState } from 'react'
import { convertirAMarkdown, FORMATOS_ACEPTADOS, type ResultadoConversion } from '@/lib/documentos/convertir'
import { mensajeDeError } from '@/lib/supabase/errores'
import Aviso from '@/components/ui/Aviso'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'

/**
 * Elegir el Word o el PDF, convertirlo y **enseñar lo que no sobrevivió**
 * [F02·B2].
 *
 * ⚠️ **La conversión pasa aquí, antes de guardar nada.** Es la mitad del bloque:
 * un conversor que escribe y después informa es un conversor en el que nadie
 * confía la segunda vez. El consultor ve el saldo —cuánto texto salió y qué se
 * perdió— y decide si lo sube o si vuelve a exportar el archivo desde Word.
 *
 * ⚠️ Y todo ocurre **en el navegador**: el `.docx` no viaja a ningún servidor
 * para convertirse. Un manual de calidad es información del cliente.
 */
export default function SubirVersion({
  sinConexion,
  alConvertir,
}: {
  sinConexion: boolean
  /** El archivo elegido y su conversión, o `null` si se quitó. */
  alConvertir: (elegido: { archivo: File; conversion: ResultadoConversion } | null) => void
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [conversion, setConversion] = useState<ResultadoConversion | null>(null)
  const [convirtiendo, setConvirtiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function elegir(evento: React.ChangeEvent<HTMLInputElement>) {
    const elegido = evento.target.files?.[0]
    if (!elegido) return

    setArchivo(elegido)
    setConversion(null)
    setError(null)
    setConvirtiendo(true)
    alConvertir(null)

    try {
      const resultado = await convertirAMarkdown(elegido)
      setConversion(resultado)
      alConvertir({ archivo: elegido, conversion: resultado })
    } catch (problema) {
      // ⚠️ El motivo se pinta entero: aquí caen el PDF escaneado, el `.doc`
      // antiguo y el archivo de 80 MB, y cada uno tiene una salida distinta que
      // el consultor puede tomar. «No se pudo convertir» a secas lo dejaría sin
      // saber cuál.
      setError(mensajeDeError(problema))
      setArchivo(null)
      if (entrada.current) entrada.current.value = ''
    } finally {
      setConvirtiendo(false)
    }
  }

  if (sinConexion) {
    return (
      <Aviso tono="advertencia">
        Subir el archivo de una versión necesita conexión: pesa megabytes y no pasa por la cola de
        salida. Lo que sí puedes hacer ahora mismo es escribir la versión a mano, y se encola como
        todo lo demás.
      </Aviso>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Campo
        id="archivo-version"
        etiqueta="Archivo original"
        ayuda="Word (.docx) o PDF, hasta 50 MB. Se guarda tal cual y además se convierte a texto para leerlo aquí."
      >
        <input
          id="archivo-version"
          ref={entrada}
          type="file"
          accept={FORMATOS_ACEPTADOS}
          onChange={elegir}
          style={{ fontSize: 14, color: 'var(--texto)' }}
        />
      </Campo>

      {convirtiendo && (
        <p style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
          Convirtiendo {archivo?.name}… Un manual grande puede tardar unos segundos.
        </p>
      )}

      {error && <Aviso tono="error">{error}</Aviso>}

      {conversion && archivo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
            <strong style={{ color: 'var(--texto)' }}>{archivo.name}</strong> ·{' '}
            {(archivo.size / 1024 / 1024).toFixed(1)} MB ·{' '}
            {conversion.markdown.length.toLocaleString('es-MX')} caracteres de texto
          </p>

          {conversion.avisos.length > 0 && (
            <Aviso tono="advertencia">
              <strong>Esto no sobrevivió la conversión:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {conversion.avisos.map((aviso) => (
                  <li key={aviso} style={{ marginBottom: 2 }}>{aviso}</li>
                ))}
              </ul>
              <p style={{ marginTop: 6 }}>
                El archivo original se guarda intacto: esto sólo afecta al texto que se lee y se
                edita dentro de la app.
              </p>
            </Aviso>
          )}

          <details>
            <summary style={{ fontSize: 13, color: 'var(--texto-dim)', cursor: 'pointer' }}>
              Ver el texto convertido
            </summary>
            <pre
              className="mono"
              style={{
                marginTop: 8,
                padding: 12,
                maxHeight: 260,
                overflow: 'auto',
                fontSize: 12.5,
                whiteSpace: 'pre-wrap',
                background: 'var(--superficie)',
                border: '1px solid var(--borde)',
                borderRadius: 6,
              }}
            >
              {conversion.markdown || '(vacío)'}
            </pre>
          </details>

          <div>
            <Button
              variante="fantasma"
              tamano="sm"
              onClick={() => {
                setArchivo(null)
                setConversion(null)
                alConvertir(null)
                if (entrada.current) entrada.current.value = ''
              }}
            >
              Quitar el archivo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
