'use client'

import { useMemo, useRef } from 'react'
import { Button } from '@/components/ui'
import { canvasMeasure } from '@/lib/promo/client/fonts'
import { buildScene } from '@/lib/promo/layout/scene'
import type { BrandTokens, DesignDocument, PromoFormat, TemplateDefinition } from '@/lib/promo/types'
import { PromoCanvas } from '../PromoCanvas'
import { useElementSize } from '../editor/EditorContext'

export interface VariationCardProps {
  label: string
  definition: TemplateDefinition
  format: PromoFormat
  document: DesignDocument
  brand: BrandTokens
  dims: Record<string, { width: number; height: number }>
  images: Record<string, CanvasImageSource | undefined>
  width: number
  busy: boolean
  onUse: () => void
}

/** One AI variation drawn with the real renderer, so what she picks is what opens in the editor. */
export function VariationCard({
  label,
  definition,
  format,
  document,
  brand,
  dims,
  images,
  width,
  busy,
  onUse,
}: VariationCardProps) {
  const frame = useRef<HTMLDivElement>(null)
  const { width: available } = useElementSize(frame)
  const displayWidth = Math.floor(Math.min(width, available || width))
  const scene = useMemo(
    () => buildScene({ definition, format, document, brand, measure: canvasMeasure, assets: dims }),
    [definition, format, document, brand, dims]
  )
  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-champagne-200 bg-champagne-50">
      <div ref={frame} className="bg-champagne-100 p-3">
        <div className="mx-auto shadow-soft" style={{ width: displayWidth }}>
          <PromoCanvas scene={scene} images={images} displayWidth={displayWidth} ariaLabel={`${label} version`} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="font-serif text-lg font-semibold text-charcoal-950">{label}</p>
          {scene.warnings.length > 0 && (
            <p className="text-xs text-charcoal-500">
              {scene.warnings.length === 1 ? 'One item needs a trim' : `${scene.warnings.length} items need a trim`} in the editor.
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onUse} disabled={busy}>
          Use this
        </Button>
      </div>
    </li>
  )
}
