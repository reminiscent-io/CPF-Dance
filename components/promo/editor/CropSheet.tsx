'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Button, Sheet, SheetBody, SheetFooter } from '@/components/ui'
import { setPlacement } from '@/lib/promo/document'
import { coverRect, defaultFocus, focusForOffset } from '@/lib/promo/layout/crop'
import type { ScenePhoto } from '@/lib/promo/layout/scene'
import { useAssetUrl } from '../hooks'
import { useEditor, useEditorState } from './EditorContext'

export interface CropTarget {
  slotId: string
  index: number
}

/** Pan and zoom one photo inside its frame. The design behind updates live. */
export function CropSheet({ target, onClose }: { target: CropTarget | null; onClose: () => void }) {
  return (
    <Sheet isOpen={target !== null} onClose={onClose} title="Adjust crop" size="md">
      {target && <CropBody key={`${target.slotId}:${target.index}`} target={target} onClose={onClose} />}
    </Sheet>
  )
}

function CropBody({ target, onClose }: { target: CropTarget; onClose: () => void }) {
  const { scene, assets } = useEditor()
  const doc = useEditorState((state) => state.document)
  const apply = useEditorState((state) => state.apply)
  const placement = doc.photos[target.slotId]?.[target.index]
  const asset = placement ? assets[placement.assetId] : undefined
  const node = scene?.nodes.find(
    (candidate): candidate is ScenePhoto =>
      candidate.type === 'photo' && candidate.slotId === target.slotId && candidate.index === target.index
  )
  const url = useAssetUrl(asset, 'display')
  const drag = useRef<{ pointerId: number; startX: number; startY: number; rectX: number; rectY: number } | null>(null)
  const [previewWidth] = useState(() => Math.min(440, typeof window === 'undefined' ? 440 : window.innerWidth - 48))

  if (!placement || !asset || !node) {
    return (
      <SheetBody>
        <p className="text-sm text-charcoal-500">This photo isn’t shown in this format.</p>
      </SheetBody>
    )
  }

  const slot = { width: node.width, height: node.height }
  const image = { width: asset.width, height: asset.height }
  // Fit the frame in the sheet, and keep tall frames (the poster hero) on screen.
  const k = Math.min(previewWidth / slot.width, 380 / slot.height)
  const rect = coverRect(image, slot, placement)
  const group = `crop:${target.slotId}:${target.index}`
  const update = (changes: Partial<typeof placement>) =>
    apply((d) => setPlacement(d, target.slotId, target.index, { ...placement, ...changes }), group)

  return (
    <>
      <SheetBody>
        <div
          className="relative mx-auto cursor-grab touch-none select-none overflow-hidden rounded-md bg-champagne-200 active:cursor-grabbing"
          style={{
            width: slot.width * k,
            height: slot.height * k,
            borderRadius: node.mask === 'ellipse' ? '50%' : undefined,
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, rectX: rect.x, rectY: rect.y }
          }}
          onPointerMove={(event) => {
            const state = drag.current
            if (!state || state.pointerId !== event.pointerId) return
            const x = state.rectX + (event.clientX - state.startX) / k
            const y = state.rectY + (event.clientY - state.startY) / k
            update(focusForOffset(image, slot, placement.zoom, x, y))
          }}
          onPointerUp={() => {
            drag.current = null
          }}
          onPointerCancel={() => {
            drag.current = null
          }}
          role="img"
          aria-label="Drag to move the photo inside its frame"
        >
          {url && (
            <Image
              src={url}
              alt=""
              width={Math.round(rect.width * k)}
              height={Math.round(rect.height * k)}
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{ left: rect.x * k, top: rect.y * k, width: rect.width * k, height: rect.height * k }}
            />
          )}
        </div>
        <p className="mt-2 text-center text-xs text-charcoal-500">Drag the photo to move it.</p>
        <label className="mt-5 block text-sm font-medium text-charcoal-600" htmlFor="promo-crop-zoom">
          Zoom
        </label>
        <input
          id="promo-crop-zoom"
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={placement.zoom}
          onChange={(event) => update({ zoom: Number(event.target.value) })}
          className="mt-2 w-full accent-rose-600"
        />
      </SheetBody>
      <SheetFooter className="justify-between">
        <Button
          variant="ghost"
          onClick={() => apply((d) => setPlacement(d, target.slotId, target.index, { ...placement, ...defaultFocus(asset.pose, asset.tags), zoom: 1 }))}
        >
          Reset
        </Button>
        <Button onClick={onClose}>Done</Button>
      </SheetFooter>
    </>
  )
}
