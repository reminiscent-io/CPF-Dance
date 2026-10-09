'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsPointingOutIcon,
  ArrowPathRoundedSquareIcon,
  PlusIcon,
  StarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import {
  movePlacement,
  placementFor,
  removePlacement,
  setPlacement,
  swapPlacements,
} from '@/lib/promo/document'
import { slotsInLayout } from '@/lib/promo/layout/scene'
import type { PromoAsset, RepeaterLayer, SlotDef } from '@/lib/promo/types'
import { AssetThumb } from '../library/AssetThumb'
import { PhotoPickerSheet } from '../library/PhotoPickerSheet'
import { CropSheet, type CropTarget } from './CropSheet'
import { useEditor, useEditorState } from './EditorContext'

interface PickTarget {
  slotId: string
  index: number
  label: string
}

/** Photos tab: replace, crop, reorder, swap into the hero. No AI involved. */
export function PhotosPanel() {
  const { definition, layout, addAssets } = useEditor()
  const doc = useEditorState((state) => state.document)
  const apply = useEditorState((state) => state.apply)
  const focusSlot = useEditorState((state) => state.focusSlot)
  const [pick, setPick] = useState<PickTarget | null>(null)
  const [crop, setCrop] = useState<CropTarget | null>(null)

  const shown = useMemo(() => slotsInLayout(layout), [layout])
  const slots = definition.slots.filter((slot) => slot.binding === 'photo' && shown.has(slot.id))
  const hero = slots.find((slot) => slot.kind === 'photo')
  const maxVisible = useMemo(() => {
    const limits = new Map<string, number>()
    for (const layer of layout.layers) {
      if (layer.kind === 'repeater' && (layer as RepeaterLayer).maxVisible) limits.set(layer.slot, layer.maxVisible!)
    }
    return limits
  }, [layout])

  const onPick = (asset: PromoAsset) => {
    if (!pick) return
    addAssets([asset])
    const current = doc.photos[pick.slotId]?.[pick.index]
    apply((d) => setPlacement(d, pick.slotId, pick.index, { ...placementFor(asset), look: current?.look }))
    setPick(null)
  }

  return (
    <div className="space-y-6">
      {slots.map((slot) => (
        <PhotoSlotSection
          key={slot.id}
          slot={slot}
          highlighted={focusSlot === slot.id}
          heroSlotId={hero && hero.id !== slot.id ? hero.id : undefined}
          maxVisible={maxVisible.get(slot.id)}
          onReplace={(index) => setPick({ slotId: slot.id, index, label: slot.label })}
          onCrop={(index) => setCrop({ slotId: slot.id, index })}
          onRemove={(index) => apply((d) => removePlacement(d, slot.id, index))}
          onMove={(from, to) => apply((d) => movePlacement(d, slot.id, from, to))}
          onMakeHero={(index) =>
            hero && apply((d) => swapPlacements(d, { slotId: hero.id, index: 0 }, { slotId: slot.id, index }))
          }
        />
      ))}
      <PhotoPickerSheet
        isOpen={pick !== null}
        title={pick ? `Choose: ${pick.label}` : 'Choose a photo'}
        onClose={() => setPick(null)}
        onPick={onPick}
      />
      <CropSheet target={crop} onClose={() => setCrop(null)} />
    </div>
  )
}

function PhotoSlotSection({
  slot,
  highlighted,
  heroSlotId,
  maxVisible,
  onReplace,
  onCrop,
  onRemove,
  onMove,
  onMakeHero,
}: {
  slot: SlotDef
  highlighted: boolean
  heroSlotId?: string
  maxVisible?: number
  onReplace: (index: number) => void
  onCrop: (index: number) => void
  onRemove: (index: number) => void
  onMove: (from: number, to: number) => void
  onMakeHero: (index: number) => void
}) {
  const { assets } = useEditor()
  const placements = useEditorState((state) => state.document.photos[slot.id]) ?? []
  const multi = slot.kind === 'photos'
  const max = multi ? (slot.list?.max ?? 4) : 1

  return (
    <section
      id={`promo-field-${slot.id}`}
      aria-label={slot.label}
      className={`scroll-mt-24 rounded-lg transition-[box-shadow] duration-500 ${highlighted ? 'ring-2 ring-rose-300 ring-offset-4 ring-offset-champagne-50' : ''}`}
    >
      <h3 className="font-serif text-lg font-semibold text-charcoal-950">{slot.label}</h3>
      {multi && maxVisible !== undefined && placements.length > maxVisible && (
        <p className="mt-0.5 text-xs text-charcoal-500">This format shows the first {maxVisible}.</p>
      )}
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {placements.map((placement, index) => {
          const asset = assets[placement.assetId]
          return (
            <li key={`${placement.assetId}:${index}`} className="rounded-lg border border-champagne-200 bg-champagne-50 p-2">
              <button
                type="button"
                onClick={() => onReplace(index)}
                className="block w-full overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                aria-label={`Replace ${slot.label.toLowerCase()}${multi ? ` ${index + 1}` : ''}`}
              >
                {asset ? (
                  <AssetThumb asset={asset} className="aspect-[4/5] w-full" sizes="160px" />
                ) : (
                  <div className="flex aspect-[4/5] w-full items-center justify-center bg-champagne-200 px-2 text-center text-xs text-charcoal-500">
                    Photo missing from the library
                  </div>
                )}
              </button>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <TileAction label="Replace" onClick={() => onReplace(index)}>
                  <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                </TileAction>
                <TileAction label="Adjust crop" onClick={() => onCrop(index)} disabled={!asset}>
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                </TileAction>
                {multi && (
                  <>
                    <TileAction label="Move earlier" onClick={() => onMove(index, index - 1)} disabled={index === 0}>
                      <ArrowLeftIcon className="h-4 w-4" />
                    </TileAction>
                    <TileAction
                      label="Move later"
                      onClick={() => onMove(index, index + 1)}
                      disabled={index === placements.length - 1}
                    >
                      <ArrowRightIcon className="h-4 w-4" />
                    </TileAction>
                  </>
                )}
                {heroSlotId && (
                  <TileAction label="Swap into the hero" onClick={() => onMakeHero(index)}>
                    <StarIcon className="h-4 w-4" />
                  </TileAction>
                )}
                {(multi || !slot.required) && (
                  <TileAction label="Remove" onClick={() => onRemove(index)}>
                    <XMarkIcon className="h-4 w-4" />
                  </TileAction>
                )}
              </div>
            </li>
          )
        })}
        {placements.length < max && (
          <li>
            <Button
              variant="outline"
              className="aspect-[4/5] h-auto w-full flex-col gap-1 border-dashed"
              onClick={() => onReplace(placements.length)}
            >
              <PlusIcon className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm">Add photo</span>
            </Button>
          </li>
        )}
      </ul>
    </section>
  )
}

function TileAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-control w-control items-center justify-center rounded-md text-charcoal-500 transition-colors hover:bg-champagne-100 hover:text-charcoal-900 disabled:cursor-not-allowed disabled:text-charcoal-200 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
