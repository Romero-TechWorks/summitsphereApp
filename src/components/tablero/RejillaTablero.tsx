'use client'

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
import Card from '@/components/ui/Card'
import { IconoArrastrar } from '@/components/ui/Iconos'
import ContenidoWidget from './ContenidoWidget'
import type { Widget } from '@/lib/tablero/widgets'

/**
 * La rejilla reordenable del tablero.
 *
 * ⚠️ **No guarda nada ni recuerda nada**: recibe los widgets ya ordenados y
 * avisa del orden nuevo. Quien manda es la caché de React Query — copiar el
 * orden a un `useState` de aquí dentro es justo la regla del offline que más se
 * rompe: al remontar reaparecería el orden viejo aunque el cambio siguiera en
 * la cola (CLAUDE.md · reglas del offline, 2).
 */
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
    // scroll que empiece sobre una tarjeta arranca un arrastre y el tablero
    // deja de poder scrollearse en el teléfono — que es donde se usa.
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
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

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 2 : undefined,
        height: '100%',
      }}
    >
      <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--texto)' }}>{widget.titulo}</h3>

          <button
            type="button"
            // ⚠️ Los oyentes van SÓLO en el asa, no en la tarjeta entera: con
            // ellos en la tarjeta, `touch-action: none` mataría el scroll de
            // toda la rejilla en el teléfono.
            {...attributes}
            {...listeners}
            aria-label={`Mover ${widget.titulo}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 5,
              color: 'var(--texto-dim)',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              flexShrink: 0,
            }}
          >
            <IconoArrastrar size={16} />
          </button>
        </div>

        <ContenidoWidget widget={widget} />
      </Card>
    </div>
  )
}
