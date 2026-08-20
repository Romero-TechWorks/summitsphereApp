import EstadoVacio from '@/components/ui/EstadoVacio'

/**
 * Lo que enseña un dominio cuya fase todavía no se ha construido.
 *
 * ⚠️ Existe para que la navegación **nunca lleve a un 404**. Los cinco destinos
 * de la barra inferior están visibles desde la Fase 00 y sus pantallas llegan
 * entre la 01 y la 05; un enlace del menú que devuelve "página no encontrada"
 * enseña al usuario que la app está rota, y esa impresión no se corrige después.
 *
 * Decir *cuándo* llega también es útil hacia adentro: `docs/06_MODULOS_FUNCIONALES.md`
 * dice que si un módulo no está en el código, se mire su fase antes de
 * reportarlo como faltante. Esta pantalla es esa respuesta, en su sitio.
 */
export default function PantallaPendiente({
  titulo,
  fase,
  descripcion,
}: {
  titulo: string
  fase: number
  /** Qué va a hacer esta pantalla, en el lenguaje de la firma. */
  descripcion: string
}) {
  return (
    <div className="contenido-pagina">
      <h2 className="display" style={{ fontSize: 32, marginBottom: 4 }}>
        {titulo}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--texto-dim)', marginBottom: 20 }}>
        Llega en la <span className="mono">Fase {String(fase).padStart(2, '0')}</span>
      </p>

      <div style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 6 }}>
        <EstadoVacio titulo="Todavía no construido" descripcion={descripcion} />
      </div>
    </div>
  )
}
