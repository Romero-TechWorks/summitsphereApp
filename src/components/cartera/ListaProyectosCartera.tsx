'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { mensajeDeError } from '@/lib/supabase/errores'
import { formatDateOnly } from '@/lib/utils/dates'
import { normalizar } from '@/lib/utils/texto'
import { listarProyectos } from '@/lib/queries/proyectos'
import {
  ESTADOS_ARCHIVADOS_PROYECTO,
  ESTADOS_PROYECTO,
  ETAPAS_PROYECTO,
  TIPOS_PROYECTO,
  etiquetaDe,
  numeroDeEtapa,
  tonoDe,
} from '@/lib/cartera/catalogos'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Input from '@/components/ui/Input'
import Lista, { Fila } from '@/components/ui/Lista'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import { IconoEmbudo } from '@/components/ui/Iconos'

/**
 * Todos los proyectos de la cartera, en una sola lista.
 *
 * Es la pantalla del lunes por la mañana: qué hay abierto, en qué etapa y con
 * quién. El **embudo por etapa** y la **carga por consultor** son otra cosa y
 * llegan al tablero en F01·B3; esto es la lista de trabajo.
 *
 * ⚠️ Los filtros corren en memoria sobre lo ya descargado, como en la lista de
 * organizaciones: una consulta por cada tecla dejaría la pantalla vacía en una
 * planta sin señal.
 */
export default function ListaProyectosCartera() {
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState('')
  const [etapa, setEtapa] = useState('')
  const [verCerrados, setVerCerrados] = useState(false)

  const { data: proyectos = [], isPending, error } = useQuery({
    queryKey: queryKeys.cartera.proyectos(),
    queryFn: listarProyectos,
  })

  const visibles = useMemo(() => {
    const busqueda = normalizar(texto)

    return proyectos.filter((p) => {
      if (estado) {
        if (p.estado !== estado) return false
      } else if (!verCerrados && ESTADOS_ARCHIVADOS_PROYECTO.includes(p.estado)) {
        return false
      }
      if (etapa && p.etapa !== etapa) return false
      if (!busqueda) return true

      return [p.nombre, p.organizacion?.razon_social, p.organizacion?.nombre_comercial, p.lider?.nombre]
        .filter(Boolean)
        .some((campo) => normalizar(String(campo)).includes(busqueda))
    })
  }, [proyectos, texto, estado, etapa, verCerrados])

  return (
    <>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input
            etiqueta="Buscar proyecto"
            etiquetaOculta
            type="search"
            placeholder="Buscar por proyecto, cliente o líder…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <div style={{ width: 160 }}>
          <Select
            etiqueta="Filtrar por estado"
            etiquetaOculta
            marcador="Todos los estados"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            {ESTADOS_PROYECTO.map((o) => (
              <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
            ))}
          </Select>
        </div>
        <div style={{ width: 200 }}>
          <Select
            etiqueta="Filtrar por etapa"
            etiquetaOculta
            marcador="Todas las etapas"
            value={etapa}
            onChange={(e) => setEtapa(e.target.value)}
          >
            {ETAPAS_PROYECTO.map((o, i) => (
              <option key={o.valor} value={o.valor}>{i + 1}. {o.etiqueta}</option>
            ))}
          </Select>
        </div>
        <div style={{ paddingTop: 8 }}>
          <Checkbox
            etiqueta="Ver cerrados"
            checked={verCerrados}
            onChange={(e) => setVerCerrados(e.target.checked)}
          />
        </div>
      </div>

      {isPending ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} alto={44} radio={4} />)}
        </div>
      ) : error ? (
        <EstadoVacio titulo="No se pudieron leer los proyectos" descripcion={mensajeDeError(error)} />
      ) : proyectos.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay proyectos"
          descripcion="Un proyecto se abre dentro del expediente de su cliente: entra a la organización y usa la pestaña Proyectos. De ahí salen su alcance, sus auditorías y su matriz de requisitos."
        />
      ) : visibles.length === 0 ? (
        <EstadoVacio
          titulo="Sin resultados"
          descripcion="Ningún proyecto de tu cartera coincide con los filtros."
          accion={
            <Button onClick={() => { setTexto(''); setEstado(''); setEtapa('') }}>
              Quitar los filtros
            </Button>
          }
        />
      ) : (
        <Lista etiqueta="Proyectos de la cartera">
          {visibles.map((proyecto) => (
            <Fila
              key={proyecto.id}
              href={`/cartera/${proyecto.org_id}?tab=proyectos&proyecto=${proyecto.id}`}
              Icono={IconoEmbudo}
              titulo={proyecto.nombre}
              meta={
                <>
                  <span>
                    {proyecto.organizacion?.nombre_comercial ||
                      proyecto.organizacion?.razon_social ||
                      'Sin organización'}
                  </span>
                  <span>{etiquetaDe(TIPOS_PROYECTO, proyecto.tipo)}</span>
                  <span>
                    Etapa <span className="mono">{numeroDeEtapa(proyecto.etapa)}</span> ·{' '}
                    {etiquetaDe(ETAPAS_PROYECTO, proyecto.etapa)}
                  </span>
                  {proyecto.lider?.nombre && <span>{proyecto.lider.nombre}</span>}
                  {proyecto.fecha_fin_estimada && (
                    <span className="mono">{formatDateOnly(proyecto.fecha_fin_estimada)}</span>
                  )}
                </>
              }
              derecha={
                <Badge tono={tonoDe(ESTADOS_PROYECTO, proyecto.estado)}>
                  {etiquetaDe(ESTADOS_PROYECTO, proyecto.estado)}
                </Badge>
              }
            />
          ))}
        </Lista>
      )}
    </>
  )
}
