'use client'

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type RefObject } from 'react'
import { useStore } from 'zustand'
import type { EditorState, EditorStore } from '@/lib/promo/client/editor-store'
import type { Scene } from '@/lib/promo/layout/scene'
import type {
  BrandTokens,
  FormatLayout,
  PromoAsset,
  PromoDesignRow,
  PromoFormat,
  PromoPublication,
  TemplateDefinition,
} from '@/lib/promo/types'

export interface DesignSibling {
  id: string
  format: PromoFormat
  title: string
  updated_at: string
}

export interface LinkedClass {
  id: string
  title: string
  start_time: string
}

/** GET /api/promo/designs/[id] */
export interface EditorData {
  design: PromoDesignRow
  template: {
    versionId: string
    version: number
    definition: TemplateDefinition
    /** Set when the template has a newer published version than this design uses. */
    latest?: { versionId: string; version: number } | null
  }
  assets: PromoAsset[]
  siblings: DesignSibling[]
  publication: PromoPublication | null
  classes: LinkedClass[]
}

export interface EditorContextValue {
  store: EditorStore
  data: EditorData
  definition: TemplateDefinition
  layout: FormatLayout
  brand: BrandTokens
  scene: Scene | null
  images: Record<string, HTMLImageElement>
  assets: Record<string, PromoAsset>
  addAssets: (assets: PromoAsset[]) => void
  /** Saves pending edits now; publish waits on it so the live copy matches a saved revision. */
  flushSave: () => Promise<void>
  revision: () => number
}

const EditorContext = createContext<EditorContextValue | null>(null)

export const EditorProvider = EditorContext.Provider

export function useEditor(): EditorContextValue {
  const value = useContext(EditorContext)
  if (!value) throw new Error('useEditor must be used inside the promo editor')
  return value
}

export function useEditorState<T>(selector: (state: EditorState) => T): T {
  return useStore(useEditor().store, selector)
}

/** Width and height of an element, kept current with ResizeObserver. */
export function useElementSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((current) =>
        Math.round(current.width) === Math.round(width) && Math.round(current.height) === Math.round(height)
          ? current
          : { width, height }
      )
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return size
}

/** Live media query, false during server render. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query]
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

export function useViewportHeight(): number {
  return useSyncExternalStore(
    subscribeResize,
    () => window.innerHeight,
    () => 800
  )
}
