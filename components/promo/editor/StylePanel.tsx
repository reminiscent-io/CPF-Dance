'use client'

import { useMemo } from 'react'
import { Button, SegmentedControl } from '@/components/ui'
import { clearNudge, setSlotLook } from '@/lib/promo/document'
import { slotsInLayout } from '@/lib/promo/layout/scene'
import { PHOTO_LOOKS, type PhotoLook } from '@/lib/promo/types'
import { useEditor, useEditorState } from './EditorContext'

const LOOK_LABELS: Record<PhotoLook, string> = { natural: 'Natural', warm: 'Warm', dramatic: 'Dramatic' }

/**
 * Style tab. Brand lock: everything here picks between the template's
 * variants and looks, so no off-brand color or font can get in.
 */
export function StylePanel() {
  const { definition, layout } = useEditor()
  const doc = useEditorState((state) => state.document)
  const apply = useEditorState((state) => state.apply)
  const shown = useMemo(() => slotsInLayout(layout), [layout])
  const photoSlots = definition.slots.filter(
    (slot) => slot.binding === 'photo' && shown.has(slot.id) && (doc.photos[slot.id]?.length ?? 0) > 0
  )
  const moved = Object.keys(doc.nudges).length

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-serif text-lg font-semibold text-charcoal-950">Color</h3>
        <div className="mt-3">
          <SegmentedControl<string>
            aria-label="Color variant"
            options={Object.entries(definition.variants).map(([value, variant]) => ({ value, label: variant.label }))}
            value={doc.variant}
            onChange={(variant) => apply((d) => ({ ...d, variant }))}
          />
        </div>
      </section>

      {photoSlots.length > 0 && (
        <section>
          <h3 className="font-serif text-lg font-semibold text-charcoal-950">Photo look</h3>
          <p className="mt-0.5 text-xs text-charcoal-500">A light grade over the photo. Your photos themselves never change.</p>
          <div className="mt-3 space-y-3">
            {photoSlots.map((slot) => (
              <div key={slot.id}>
                <p className="mb-1 text-sm font-medium text-charcoal-600">{slot.label}</p>
                <SegmentedControl<PhotoLook>
                  aria-label={`${slot.label} look`}
                  options={PHOTO_LOOKS.map((look) => ({ value: look, label: LOOK_LABELS[look] }))}
                  value={doc.photos[slot.id]?.[0]?.look ?? 'natural'}
                  onChange={(look) => apply((d) => setSlotLook(d, slot.id, look === 'natural' ? undefined : look))}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="font-serif text-lg font-semibold text-charcoal-950">Layout</h3>
        <p className="mt-0.5 text-xs text-charcoal-500">
          {moved === 0
            ? 'Everything sits where the template puts it. On a laptop, drag items on the canvas to move them.'
            : `${moved} ${moved === 1 ? 'item is' : 'items are'} moved or resized.`}
        </p>
        {moved > 0 && (
          <Button className="mt-3" variant="outline" size="sm" onClick={() => apply((d) => clearNudge(d))}>
            Put everything back
          </Button>
        )}
      </section>
    </div>
  )
}
