import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEditorStore } from '../client/editor-store'
import { setSlotValue } from '../document'
import type { DesignDocument } from '../types'

const base: DesignDocument = {
  v: 1,
  variant: 'ivory',
  values: { tagline: 'Sharpen every line' },
  photos: {},
  edited: [],
  nudges: {},
  layout: {},
}

const typeTagline = (text: string) => (doc: DesignDocument) => setSlotValue(doc, 'tagline', text, { byHand: true })

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('editor store', () => {
  it('folds quick typing in one field into a single undo step', () => {
    const store = createEditorStore(base)
    const { apply } = store.getState()
    apply(typeTagline('S'), 'text:tagline')
    vi.advanceTimersByTime(200)
    apply(typeTagline('Sh'), 'text:tagline')
    vi.advanceTimersByTime(200)
    apply(typeTagline('Sharp'), 'text:tagline')
    expect(store.temporal.getState().pastStates).toHaveLength(1)
    store.getState().undo()
    expect(store.getState().document.values.tagline).toBe('Sharpen every line')
    store.getState().redo()
    expect(store.getState().document.values.tagline).toBe('Sharp')
  })

  it('starts a new step after a pause or in another field', () => {
    const store = createEditorStore(base)
    const { apply } = store.getState()
    apply(typeTagline('One'), 'text:tagline')
    vi.advanceTimersByTime(2000)
    apply(typeTagline('Two'), 'text:tagline')
    apply((doc) => ({ ...doc, variant: 'noir' }))
    expect(store.temporal.getState().pastStates).toHaveLength(3)
  })

  it('keeps frozen text layout out of the history', () => {
    const store = createEditorStore(base)
    store.getState().setLayout({ tagline: { hash: 'abc', size: 20, lines: ['SHARPEN EVERY LINE'] } })
    expect(store.temporal.getState().pastStates).toHaveLength(0)
    expect(store.getState().document.layout.tagline.hash).toBe('abc')
  })

  it('records a whole-document replacement as one step', () => {
    const store = createEditorStore(base)
    store.getState().replace({ ...base, variant: 'noir', values: { tagline: 'Darker' } })
    store.getState().undo()
    expect(store.getState().document.variant).toBe('ivory')
    expect(store.getState().version).toBe(2)
  })

  it('ignores recipes that change nothing', () => {
    const store = createEditorStore(base)
    store.getState().apply((doc) => doc)
    expect(store.temporal.getState().pastStates).toHaveLength(0)
    expect(store.getState().version).toBe(0)
  })
})
