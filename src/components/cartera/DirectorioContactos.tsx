'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import { listarContactosDeLaCartera } from '@/lib/queries/cartera'
import { PAPELES_CONTACTO, etiquetaDe } from '@/lib/cartera/catalogos'
import { normalizar } from '@/lib/utils/texto'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Skeleton from '@/components/ui/Skeleton'
import { IconoEquipo } from '@/components/ui/Iconos'

/**
 * El directorio de la cartera.
 *
 * Contesta la pregunta que hoy se resuelve buscando en un hilo de correo de
 * hace ocho meses: *"¿quién era el coordinador del SGC de Aceros?"*. Se da de
 * alta dentro de cada organización; aquí sólo se consulta.
 */
export default function DirectorioContactos() {
  const [texto, setTexto] = useState('')

  const { data: contactos = [], isPending, error } = useQuery({
    queryKey: queryKeys.cartera.contactosTodos(),
    queryFn: listarContactosDeLaCartera,
  })

  const visibles = useMemo(() => {
    const busqueda = normalizar(texto)
    if (!busqueda) return contactos

    return contactos.filter((c) =>
      [c.nombre, c.puesto, c.correo, c.telefono, c.organizacion?.razon_social, c.organizacion?.nombre_comercial]
        .filter(Boolean)
        .some((campo) => normalizar(String(campo)).includes(busqueda)),
    )
  }, [contactos, texto])

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Input
          etiqueta="Buscar contacto"
          etiquetaOculta
          type="search"
          placeholder="Buscar por nombre, puesto, empresa o teléfono…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>

      {isPending ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
        </div>
      ) : error ? (
        <EstadoVacio titulo="No se pudo leer el directorio" descripcion={mensajeDeError(error)} />
      ) : contactos.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay contactos"
          descripcion="Los contactos se dan de alta dentro de cada organización, con su papel: quién firma el acta de apertura, quién coordina el sistema y a quién se le pide la evidencia."
        />
      ) : visibles.length === 0 ? (
        <EstadoVacio
          titulo="Sin resultados"
          descripcion={`Ningún contacto de tu cartera coincide con «${texto}».`}
        />
      ) : (
        <Lista etiqueta="Contactos de la cartera">
          {visibles.map((contacto) => (
            <Fila
              key={contacto.id}
              // Lleva al expediente de su organización, que es donde se edita.
              href={`/cartera/${contacto.org_id}?tab=contactos`}
              Icono={IconoEquipo}
              titulo={contacto.nombre}
              meta={
                <>
                  <span>
                    {contacto.organizacion?.nombre_comercial ||
                      contacto.organizacion?.razon_social ||
                      'Sin organización'}
                  </span>
                  {contacto.puesto && <span>{contacto.puesto}</span>}
                  <span>{etiquetaDe(PAPELES_CONTACTO, contacto.papel)}</span>
                </>
              }
              derecha={
                contacto.telefono ? (
                  <span className="mono" style={{ fontSize: 13, color: 'var(--texto-dim)' }}>
                    {contacto.telefono}
                  </span>
                ) : null
              }
            />
          ))}
        </Lista>
      )}
    </>
  )
}
