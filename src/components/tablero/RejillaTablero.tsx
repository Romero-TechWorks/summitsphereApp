'use client'

import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  IconoAcciones,
  IconoAlerta,
  IconoArrastrar,
  IconoAuditorias,
  IconoCalendario,
  IconoCartera,
  IconoCumplimiento,
  IconoEmbudo,
  IconoEquipo,
  IconoSenal,
  IconoSistemas,
} from '@/components/ui/Iconos'
import ContenidoWidget from './ContenidoWidget'
import type { NombreIcono, Widget } from '@/lib/tablero/widgets'

/**
 * La rejilla reordenable del tablero.
 *
 * ⚠️ **No guarda nada ni recuerda nada**: recibe los widgets ya ordenados y
 * avisa del orden nuevo. Quien manda es la caché de React Query — copiar el
 * orden a un `useState` de aquí dentro es justo la regla del offline que más se
 * rompe: al remontar reaparecería el orden viejo aunque el cambio siguiera en
 * la cola (CLAUDE.md · reglas del offline, 2).
 *
 * ── Sobre el aspecto ──────────────────────────────────────────────────────
 * **Aquí no hay tarjetas, y es deliberado.** Nueve recuadros blancos sobre el
 * fondo claro compiten entre sí y ninguno gana: el tablero se lee como una
 * cuadrícula de cajas vacías en vez de como la portada de la firma. Cada widget
 * es texto flotando sobre el fondo, reconocible por su icono y **delimitado por
 * debajo con el verde de Summit**. El marco sólo aparece mientras se arrastra,
 * que es el único momento en el que hace falta ver el bloque como un objeto que
 * se puede tomar. docs/05_SISTEMA_DE_DISENO.md §4.5.
 */

/**
 * ⚠️ Mapa cerrado por `NombreIcono`. TypeScript exige que estén los diez, así
 * que aquí no puede salir un `undefined` — y como los widgets se pintan en
 * bucle, un `undefined` no rompería un widget, rompería el tablero entero
 * (CLAUDE.md · trampas heredadas).
 */
const ICONOS: Record<NombreIcono, (p: { size?: number }) => React.ReactElement> = {
  senal: IconoSenal,
  embudo: IconoEmbudo,
  cartera: IconoCartera,
  equipo: IconoEquipo,
  calendario: IconoCalendario,
  documento: IconoSistemas,
  auditoria: IconoAuditorias,
  alerta: IconoAlerta,
  accion: IconoAcciones,
  cumplimiento: IconoCumplimiento,
}

export default function RejillaTablero({
  widgets,
  alReordenar,
}: {
  widgets: Widget[]
  alReordenar: (idsEnOrden: string[]) => void
}) {
  const sensores = useSensors(
    // Con ratón: ocho píxeles de margen para que un clic no cuente como arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // ⚠️ Con el dedo, el retardo NO es cosmético. Sin él, cualquier gesto de
    // scroll que empiece sobre un widget arranca un arrastre y el tablero deja
    // de poder scrollearse en el teléfono — que es donde se usa.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function alSoltar({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return

    const ids = widgets.map((w) => w.id)
    const desde = ids.indexOf(String(active.id))
    const hasta = ids.indexOf(String(over.id))
    if (desde < 0 || hasta < 0) return

    alReordenar(arrayMove(ids, desde, hasta))
  }

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCenter}
      onDragEnd={alSoltar}
      // Los avisos que oye un lector de pantalla. En español, como todo lo que
      // lee un usuario: los de fábrica de dnd-kit vienen en inglés.
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Moviendo ${active.id}.`,
          onDragOver: ({ active, over }) =>
            over ? `${active.id} sobre ${over.id}.` : `${active.id} fuera de la rejilla.`,
          onDragEnd: ({ active, over }) =>
            over ? `${active.id} colocado sobre ${over.id}.` : `${active.id} devuelto a su sitio.`,
          onDragCancel: ({ active }) => `Movimiento de ${active.id} cancelado.`,
        },
      }}
    >
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(272px, 1fr))',
            // Sin marcos, el aire ES la separación: es lo único que dice dónde
            // termina un widget y empieza el siguiente.
            gap: '26px 32px',
            alignItems: 'stretch',
          }}
        >
          {widgets.map((widget) => (
            <WidgetOrdenable key={widget.id} widget={widget} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function WidgetOrdenable({ widget }: { widget: Widget }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })
  const [encima, setEncima] = useState(false)

  const Icono = ICONOS[widget.icono]
  const realzado = encima || isDragging

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : undefined,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        // El bloque sólo se vuelve un objeto —fondo, sombra, borde— mientras se
        // arrastra: ahí sí hace falta ver qué se lleva uno en la mano.
        background: isDragging ? 'var(--superficie)' : 'transparent',
        boxShadow: isDragging ? '0 12px 32px rgba(13, 31, 53, .16)' : 'none',
        borderRadius: 8,
        padding: isDragging ? '12px 14px' : '0 2px',
        opacity: isDragging ? 0.92 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            color: 'var(--verde-tinta)',
            flexShrink: 0,
            // El icono es lo que hace reconocible el bloque de un vistazo, así
            // que es lo único que se realza al pasar por encima.
            transform: realzado ? 'translateY(-1px)' : 'none',
            transition: 'transform .15s ease',
          }}
        >
          <Icono size={19} />
        </span>

        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--texto)',
            minWidth: 0,
            flex: 1,
          }}
        >
          {widget.titulo}
        </h3>

        <button
          type="button"
          // ⚠️ Los oyentes van SÓLO en el asa, no en el bloque entero: con ellos
          // en el bloque, `touch-action: none` mataría el scroll de toda la
          // rejilla en el teléfono.
          {...attributes}
          {...listeners}
          aria-label={`Mover ${widget.titulo}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            marginRight: -8,
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            // Presente siempre —en un teléfono no existe el «pasar por
            // encima»—, pero callado hasta que se le busca.
            color: realzado ? 'var(--texto-dim)' : 'var(--borde)',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            flexShrink: 0,
            transition: 'color .15s ease',
          }}
        >
          <IconoArrastrar size={16} />
        </button>
      </div>

      <div style={{ flex: 1, minWidth: 0, paddingBottom: 12 }}>
        <ContenidoWidget widget={widget} />
      </div>

      {/* La delimitación: una hairline verde muy tenue de lado a lado, y encima
          un tramo sólido del verde de marca. Es lo que sustituye al borde de la
          tarjeta — cierra el bloque sin encajonarlo. */}
      <div
        aria-hidden
        style={{
          position: 'relative',
          height: 2,
          borderRadius: 2,
          background: 'rgba(61, 186, 78, .16)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '0 auto 0 0',
            width: realzado ? '100%' : '38%',
            borderRadius: 2,
            background:
              'linear-gradient(90deg, var(--verde-hondo) 0%, var(--verde) 55%, rgba(61,186,78,0) 100%)',
            transition: 'width .28s cubic-bezier(.22,.61,.36,1)',
          }}
        />
      </div>
    </div>
  )
}
