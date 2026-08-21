'use client'

import { useState } from 'react'
import Aviso from './Aviso'
import Button from './Button'
import Input from './Input'
import Modal from './Modal'

/**
 * El diálogo de borrar de verdad.
 *
 * ⚠️ **Pide escribir el nombre exacto**, y no es fricción por gusto: en esta app
 * casi nada se elimina —un hallazgo se anula, un documento se hace obsoleto, un
 * sitio se da de baja—, así que cuando aparece un borrado real es porque se
 * lleva un expediente entero por delante. Un botón «¿Seguro?» se contesta que sí
 * sin leerlo; escribir «Aceros del Bajío SA de CV» no se hace por accidente.
 *
 * ⚠️ Y **dice qué se va a llevar, con nombres y cantidades**. Un borrado en
 * cascada que sólo avisa de la fila que se toca es un borrado que sorprende
 * después.
 */
export default function ConfirmarBorrado({
  abierto,
  alCerrar,
  titulo,
  nombre,
  queSeLleva,
  error,
  trabajando,
  alConfirmar,
}: {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  /** Lo que hay que teclear para habilitar el botón. */
  nombre: string
  /** Qué desaparece con esto: «3 sitios · 2 proyectos · 14 tareas». */
  queSeLleva: string[]
  error: string | null
  trabajando: boolean
  alConfirmar: () => void
}) {
  const [escrito, setEscrito] = useState('')
  const coincide = escrito.trim() === nombre.trim()

  function cerrar() {
    setEscrito('')
    alCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={cerrar}
      titulo={titulo}
      pie={
        <>
          <Button variante="fantasma" onClick={cerrar}>Cancelar</Button>
          <Button
            variante="peligro"
            disabled={!coincide}
            cargando={trabajando}
            onClick={alConfirmar}
          >
            Eliminar definitivamente
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Aviso tono="error">{error}</Aviso>}

        <Aviso tono="advertencia">
          Esto no se puede deshacer desde la aplicación. Queda registrado en la bitácora —con
          quién lo hizo y la fila completa—, pero el expediente desaparece.
        </Aviso>

        {queSeLleva.length > 0 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '.04em', color: 'var(--texto-dim)', marginBottom: 6 }}>
              Se va a llevar
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {queSeLleva.map((cosa) => (
                <li key={cosa} style={{ fontSize: 14 }}>· {cosa}</li>
              ))}
            </ul>
          </div>
        )}

        <Input
          etiqueta={`Escribe «${nombre}» para confirmar`}
          value={escrito}
          autoComplete="off"
          onChange={(e) => setEscrito(e.target.value)}
        />
      </div>
    </Modal>
  )
}
