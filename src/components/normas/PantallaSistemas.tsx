'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { obtenerUsuarioActual } from '@/lib/queries/usuarios'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import ArbolNormas from './ArbolNormas'
import ImportadorNormas from './ImportadorNormas'

/**
 * `/sistemas` — hoy, el catálogo de normas [F01·B2b].
 *
 * ⚠️ El dominio completo —documentos, requisitos, procesos, riesgos e
 * indicadores— es la **Fase 02**. El catálogo se adelanta porque sin él no se
 * puede definir el alcance de un proyecto, y el alcance es de la Fase 01.
 * Cuando lleguen los demás, esto pasa a ser una pestaña más.
 */
export default function PantallaSistemas() {
  const { data: usuario } = useQuery({
    queryKey: queryKeys.usuario.actual(),
    queryFn: obtenerUsuarioActual,
  })

  // El importador sólo lo ve un socio: la base tampoco deja escribir a nadie
  // más, y ofrecer un botón que termina en 42501 es peor que no ofrecerlo.
  const esSocio = usuario?.rol === 'socio'

  return (
    <div className="contenido-pagina">
      <EncabezadoPagina
        titulo="Sistemas de gestión"
        meta={<span>Catálogo de normas y cláusulas</span>}
      />

      {esSocio && (
        <div style={{ marginBottom: 24 }}>
          <ImportadorNormas />
        </div>
      )}

      <ArbolNormas />

      <p
        style={{
          marginTop: 28,
          paddingTop: 16,
          borderTop: '1px solid var(--borde)',
          fontSize: 13,
          color: 'var(--texto-dim)',
          lineHeight: 1.6,
          maxWidth: 620,
        }}
      >
        El control documental, la matriz de requisitos, los procesos, los riesgos y los indicadores
        llegan en la <span className="mono">Fase 02</span>. El catálogo de normas se adelantó porque
        el alcance de un proyecto —de la Fase 01— cuelga de él.
      </p>
    </div>
  )
}
