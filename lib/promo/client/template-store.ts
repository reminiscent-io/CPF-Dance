'use client'

import { temporal, type TemporalState } from 'zundo'
import { createStore, type StoreApi } from 'zustand'
import type { TemplateDefinition } from '../types'

/** Draft template being edited, with undo. Typing into one inspector field counts as one step. */
export interface TemplateEditorState {
  definition: TemplateDefinition
  selected: string | null
  version: number
  apply: (recipe: (definition: TemplateDefinition) => TemplateDefinition, group?: string) => void
  replace: (definition: TemplateDefinition) => void
  select: (layerId: string | null) => void
  undo: () => void
  redo: () => void
}

type Tracked = Pick<TemplateEditorState, 'definition'>

export type TemplateStore = StoreApi<TemplateEditorState> & { temporal: StoreApi<TemporalState<Tracked>> }

const GROUP_WINDOW_MS = 1200

export function createTemplateStore(initial: TemplateDefinition): TemplateStore {
  let lastGroup: string | null = null
  let lastAt = 0
  const store = createStore<TemplateEditorState>()(
    temporal(
      (set, get, api) => {
        const history = () => (api as unknown as TemplateStore).temporal.getState()
        return {
          definition: initial,
          selected: null,
          version: 0,
          apply: (recipe, group) => {
            const now = Date.now()
            const merge = group !== undefined && group === lastGroup && now - lastAt < GROUP_WINDOW_MS
            lastGroup = group ?? null
            lastAt = now
            const next = recipe(get().definition)
            if (next === get().definition) return
            if (merge) history().pause()
            set((state) => ({ definition: next, version: state.version + 1 }))
            if (merge) history().resume()
          },
          replace: (definition) => {
            lastGroup = null
            set((state) => ({ definition, version: state.version + 1 }))
          },
          select: (selected) => set({ selected }),
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
        partialize: (state): Tracked => ({ definition: state.definition }),
        equality: (past, current) => past.definition === current.definition,
        limit: 100,
      }
    )
  )
  return store as unknown as TemplateStore
}
