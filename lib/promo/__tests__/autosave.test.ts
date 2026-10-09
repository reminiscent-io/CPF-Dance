import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutosaver, type SaveStatus } from '../client/autosave'
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

function respond(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function setup(fetchImpl: ReturnType<typeof vi.fn>) {
  const store = createEditorStore(base)
  const statuses: SaveStatus[] = []
  const saver = createAutosaver({
    store,
    designId: 'd1',
    revision: 3,
    title: 'Precision Workshop',
    onStatus: (status) => statuses.push(status),
    fetchImpl: fetchImpl as unknown as typeof fetch,
    debounceMs: 1000,
    checkpointMs: 60_000,
  })
  const edit = (text: string) =>
    store.getState().apply((doc) => setSlotValue(doc, 'tagline', text, { byHand: true }), 'text:tagline')
  return { store, statuses, saver, edit }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('autosave', () => {
  it('saves once after she stops typing, with the revision it started from', async () => {
    const fetchImpl = vi.fn(() => respond(200, { revision: 4 }))
    const { saver, edit, statuses } = setup(fetchImpl)
    edit('S')
    await vi.advanceTimersByTimeAsync(500)
    edit('Sharper')
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/promo/designs/d1')
    expect(JSON.parse(init.body as string)).toMatchObject({ revision: 3, document: { values: { tagline: 'Sharper' } } })
    expect(saver.revision()).toBe(4)
    expect(statuses.at(-1)).toBe('saved')
    saver.dispose()
  })

  it('stops on a conflict instead of overwriting newer work', async () => {
    const fetchImpl = vi.fn(() => respond(409, { code: 'conflict', revision: 9 }))
    const { saver, edit, statuses } = setup(fetchImpl)
    edit('Mine')
    await vi.advanceTimersByTimeAsync(1000)
    edit('Mine again')
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(statuses.at(-1)).toBe('conflict')
    saver.dispose()
  })

  it('retries after a dropped connection', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
      .mockImplementation(() => respond(200, { revision: 4 }))
    const { saver, edit, statuses } = setup(fetchImpl)
    edit('Offline edit')
    await vi.advanceTimersByTimeAsync(1000)
    expect(statuses).toContain('offline')
    await vi.advanceTimersByTimeAsync(3000)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(statuses.at(-1)).toBe('saved')
    saver.dispose()
  })

  it('sends a renamed title with the next save', async () => {
    const fetchImpl = vi.fn(() => respond(200, { revision: 4 }))
    const { saver } = setup(fetchImpl)
    saver.setTitle('Kick Clinic')
    await vi.advanceTimersByTimeAsync(1000)
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string).title).toBe('Kick Clinic')
    expect(saver.isDirty()).toBe(false)
    saver.dispose()
  })

  it('writes a checkpoint once enough editing time has passed', async () => {
    const fetchImpl = vi.fn((url: string) => respond(url.endsWith('/revisions') ? 201 : 200, { revision: 4 }))
    const { saver, edit } = setup(fetchImpl as unknown as ReturnType<typeof vi.fn>)
    await vi.advanceTimersByTimeAsync(61_000)
    edit('Later edit')
    await vi.advanceTimersByTimeAsync(1000)
    const urls = fetchImpl.mock.calls.map(([url]) => url)
    expect(urls).toEqual(['/api/promo/designs/d1', '/api/promo/designs/d1/revisions'])
    saver.dispose()
  })
})
