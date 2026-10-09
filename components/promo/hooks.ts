'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { assetBlobUrl, forgetAsset, type AssetFiles, type Rendition } from '@/lib/promo/client/images'
import { enqueueFiles, onAssetChanged, resumeUploads } from '@/lib/promo/client/upload/queue'
import type { AssetTags, PromoAsset } from '@/lib/promo/types'

export class PromoRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
  }
}

/** fetch() for Promo Studio routes: JSON in and out, server error messages surfaced as-is. */
export async function promoFetch<T>(input: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {}
  const response = await fetch(input, {
    ...rest,
    headers: json !== undefined ? { 'Content-Type': 'application/json', ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new PromoRequestError(body.error || 'Something went wrong. Please try again.', response.status, body.code)
  }
  return body as T
}

export interface PromoMe {
  ownerId: string
  isAdmin: boolean
  name: string | null
}

/** The primary profile Promo Studio works for (a linked login resolves to it). */
export function usePromoMe() {
  const [me, setMe] = useState<PromoMe | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    promoFetch<PromoMe>('/api/promo/me')
      .then((value) => {
        if (!cancelled) setMe(value)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return { me, error }
}

/** A blob: URL for one rendition, once `enabled`. Null until it has downloaded. */
export function useAssetUrl(asset: AssetFiles | null | undefined, rendition: Rendition, enabled = true) {
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null)
  const key = asset ? `${asset.id}:${rendition}` : null
  useEffect(() => {
    if (!asset || !enabled) return
    let cancelled = false
    assetBlobUrl(asset, rendition)
      .then((url) => {
        if (!cancelled) setLoaded({ key: `${asset.id}:${rendition}`, url })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [asset, rendition, enabled])
  return loaded && loaded.key === key ? loaded.url : null
}

// Display and thumbnail renditions add roughly 6% on top of each original.
const storedBytes = (asset: PromoAsset) => Math.round(Number(asset.bytes ?? 0) * 1.06)

/**
 * Her photo library: the list, storage used, uploads (resumed after a
 * reload) and edits. New uploads and arriving tags flow in through the
 * queue's onAssetChanged.
 */
export function useAssetLibrary() {
  const { me, error: meError } = usePromoMe()
  const [assets, setAssets] = useState<PromoAsset[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bytesUsed = useMemo(() => (assets ?? []).reduce((sum, asset) => sum + storedBytes(asset), 0), [assets])

  useEffect(() => {
    let cancelled = false
    promoFetch<{ assets: PromoAsset[] }>('/api/promo/assets')
      .then((body) => {
        if (!cancelled) setAssets(body.assets)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (me) void resumeUploads(me.ownerId)
  }, [me])

  useEffect(
    () =>
      onAssetChanged((asset) => {
        setAssets((current) => {
          const list = current ?? []
          const index = list.findIndex((item) => item.id === asset.id)
          if (index === -1) return [asset, ...list]
          const next = list.slice()
          next[index] = asset
          return next
        })
      }),
    []
  )

  const addFiles = useCallback(
    (files: File[]) => {
      if (!me || files.length === 0) return
      void enqueueFiles(files, me.ownerId)
    },
    [me]
  )

  const updateAsset = useCallback(
    async (id: string, changes: { favorite?: boolean; tags?: Pick<AssetTags, 'shotTypes' | 'background'> }) => {
      const { asset } = await promoFetch<{ asset: PromoAsset }>(`/api/promo/assets/${id}`, {
        method: 'PATCH',
        json: changes,
      })
      setAssets((current) => (current ?? []).map((item) => (item.id === id ? asset : item)))
      return asset
    },
    []
  )

  const deleteAsset = useCallback(async (asset: PromoAsset) => {
    await promoFetch(`/api/promo/assets/${asset.id}`, { method: 'DELETE' })
    forgetAsset(asset.id)
    setAssets((current) => (current ?? []).filter((item) => item.id !== asset.id))
  }, [])

  return { me, assets, bytesUsed, error: error ?? meError, addFiles, updateAsset, deleteAsset }
}
