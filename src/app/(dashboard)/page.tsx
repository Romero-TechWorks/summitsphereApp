import Link from 'next/link'
import { DESTINOS } from '@/lib/navegacion'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

/**
 * El tablero.
 *
 * ⚠️ Esto es un mapa del avance, no el tablero de verdad. El tablero real
 * —widgets reordenables con `@dnd-kit`, preferencias por usuario y una portada
 * distinta por rol— es F00·B6 y necesita la tabla `usuarios` de F00·B5 para
 * saber quién está mirando.
 *
 * Se deja esta pantalla y no una en blanco porque es lo primero que se ve al
 * entrar, y porque durante los próximos meses va a haber gente de la firma
 * abriendo la app para ver cómo va.
 */
export default function Tablero() {
  return (
    <div className="contenido-pagina">
      <h2 className="display" style={{ fontSize: 32, marginBottom: 4 }}>
        Inicio
      </h2>
      <p style={{ fontSize: 14, color: 'var(--texto-dim)', marginBottom: 22, maxWidth: 620 }}>
        El armazón está en pie. Cada dominio se enciende en su fase; el tablero con
        widgets por rol llega al cerrar la Fase 00.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 12,
        }}
      >
        {DESTINOS.filter((d) => d.href !== '/').map(({ href, etiqueta, Icono, fase }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Card style={{ height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--verde-tinta)' }}>
                  <Icono size={19} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--texto)' }}>
                    {etiqueta}
                  </span>
                </div>
                <Badge tono="neutro">F{String(fase).padStart(2, '0')}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
