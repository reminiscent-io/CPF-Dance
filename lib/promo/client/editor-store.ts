'use client'

import { temporal, type TemporalState } from 'zundo'
import { createStore, type StoreApi } from 'zustand'
import type { DesignDocument, FrozenText } from '../types'

/**
 * Editor state for one open design. Undo and redo cover the document's
 * content (values, photos, variant, nudges); the frozen text layout is
 * bookkeeping, so updating it never adds a step. Typing in one field within
 * a second counts as one step, and a drag commits once, on release.
 */

export interface EditorState {
  document: DesignDocument
  /** Selected top-level layer. */
  selected: string | null
  /** Slot to reveal in the side panel after a tap on the canvas. */
  focusSlot: string | null
  /** Bumped by every content change, so autosave and thumbnails can watch one number. */
  version: number
  apply: (recipe: (document: DesignDocument) => DesignDocument, group?: string) => void
  /** Replaces the whole document as one undoable step (AI revision, restore). */
  replace: (document: DesignDocument) => void
  setLayout: (layout: Record<string, FrozenText>) => void
  select: (layerId: string | null, slotId?: string | null) => void
  undo: () => void
  redo: () => void
}

type Tracked = Pick<EditorState, 'document'>

export type EditorStore = StoreApi<EditorState> & { temporal: StoreApi<TemporalState<Tracked>> }

const GROUP_WINDOW_MS = 1200

function sameContent(a: DesignDocument, b: DesignDocument) {
  return (
    a.variant === b.variant &&
    a.values === b.values &&
    a.photos === b.photos &&
    a.edited === b.edited &&
    a.nudges === b.nudges
  )
}

export function createEditorStore(initial: DesignDocument): EditorStore {
  let lastGroup: string | null = null
  let lastAt = 0

  const store = createStore<EditorState>()(
    temporal(
      (set, get, api) => {
        const history = () => (api as unknown as EditorStore).temporal.getState()
        return {
          document: initial,
          selected: null,
          focusSlot: null,
          version: 0,
          apply: (recipe, group) => {
            const now = Date.now()
            const merge = group !== undefined && group === lastGroup && now - lastAt < GROUP_WINDOW_MS
            lastGroup = group ?? null
            lastAt = now
            const next = recipe(get().document)
            if (next === get().document) return
            if (merge) history().pause()
            set((state) => ({ document: next, version: state.version + 1 }))
            if (merge) history().resume()
          },
          replace: (document) => {
            lastGroup = null
            set((state) => ({ document, version: state.version + 1 }))
          },
          setLayout: (layout) => set((state) => ({ document: { ...state.document, layout } })),
          select: (layerId, slotId) => set({ selected: layerId, focusSlot: slotId ?? null }),
          undo: () => {
            lastGroup = null
            history().undo()
            set((state) => ({ version: state.version + 1 }))
          },
          redo: () => {
            lastGroup = null
            history().redo()
            set((state) => ({ version: state.version + 1 }))
          },
        }
      },
      {
        partialize: (state): Tracked => ({ document: state.document }),
        equality: (past, current) => sameContent(past.document, current.document),
        limit: 100,
      }
    )
  )
  return store as unknown as EditorStore
}
