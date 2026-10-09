'use client'

import { useMemo } from 'react'
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline'
import { clearNudge, getSlot } from '@/lib/promo/document'
import type { Layer } from '@/lib/promo/types'
import { useEditor, useEditorState } from './EditorContext'

function slotOf(layer: Layer): string | undefined {
  if (layer.kind === 'text' || layer.kind === 'photo') return layer.slot
  if (layer.kind === 'repeater') return layer.slot
  return undefined
}

/**
 * Keyboard route through the design (laptop): every drawn layer as a
 * button, top to bottom. Enter edits, Escape deselects, arrow keys move the
 * selected layer (Shift for 10 at a time).
 */
export function LayerList({ onEdit }: { onEdit: (layerId: string) => void }) {
  const { layout, definition, scene } = useEditor()
  const selected = useEditorState((state) => state.selected)
  const select = useEditorState((state) => state.select)
  const apply = useEditorState((state) => state.apply)
  const nudges = useEditorState((state) => state.document.nudges)

  const layers = useMemo(() => {
    const drawn = new Set(scene?.nodes.map((node) => node.rootLayerId))
    return layout.layers
      .filter((layer) => drawn.has(layer.id))
      .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)
  }, [layout, scene])

  return (
    <section aria-labelledby="promo-layers-title">
      <h3 id="promo-layers-title" className="font-serif text-lg font-semibold text-charcoal-950">
        Layers
      </h3>
      <p className="mt-0.5 text-xs text-charcoal-500">Enter edits, Esc deselects, arrow keys move.</p>
      <ul className="mt-3 divide-y divide-champagne-200 rounded-lg border border-champagne-200">
        {layers.map((layer) => {
          const slotId = slotOf(layer)
          const label = layer.name ?? (slotId ? getSlot(definition, slotId)?.label : undefined) ?? layer.id
          const isSelected = selected === layer.id
          return (
            <li key={layer.id} className="flex items-center">
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => select(layer.id, slotId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    select(layer.id, slotId)
                    onEdit(layer.id)
                  } else if (event.key === 'Escape') {
                    select(null)
                  }
                }}
                className={`flex-1 px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-500 ${
                  isSelected
                    ? 'bg-ballet-pink-100 text-ballet-pink-800'
                    : 'text-charcoal-700 hover:bg-champagne-100'
                }`}
              >
                {label}
                {nudges[layer.id] && <span className="ml-2 text-xs text-charcoal-400">moved</span>}
              </button>
              {nudges[layer.id] && (
                <button
                  type="button"
                  aria-label={`Put ${label} back`}
                  title="Put back"
                  onClick={() => apply((d) => clearNudge(d, layer.id))}
                  className="inline-flex h-9 w-9 items-center justify-center text-charcoal-500 hover:text-charcoal-900"
                >
                  <ArrowUturnLeftIcon className="h-4 w-4" />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
