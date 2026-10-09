'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { FORMAT_SPECS } from '@/lib/promo/formats'
import { privateFileUrl } from '@/lib/promo/client/images'
import { designThumbPath } from '@/lib/promo/paths'
import type { PromoFormat } from '@/lib/promo/types'

export interface DesignThumbProps {
  design: { id: string; owner_id: string; format: PromoFormat; thumbnail_updated_at: string | null }
  className?: string
}

/** The editor's last render of a design, from her private folder. */
export function DesignThumb({ design, className = '' }: DesignThumbProps) {
  const version = design.thumbnail_updated_at
  const [loaded, setLoaded] = useState<{ version: string; url: string | null } | null>(null)

  useEffect(() => {
    if (!version) return
    let cancelled = false
    privateFileUrl(designThumbPath(design.owner_id, design.id), version)
      .then((url) => {
        if (!cancelled) setLoaded({ version, url })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [design.id, design.owner_id, version])

  const url = loaded && loaded.version === version ? loaded.url : null
  const spec = FORMAT_SPECS[design.format]
  return (
    <div className={`relative overflow-hidden bg-champagne-100 ${className}`}>
      {url ? (
        <Image src={url} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs uppercase tracking-[0.12em] text-charcoal-400">{spec.shortLabel}</span>
        </div>
      )}
    </div>
  )
}
