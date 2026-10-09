'use client'

import type { EditorStore } from './editor-store'

/**
 * Autosave for one open design. Changes save a second after she stops, one
 * request at a time, each carrying the revision it started from; the server
 * answers 409 if another device saved first, and saving stops so neither
 * copy overwrites the other. Offline or failed saves retry with backoff.
 * A checkpoint goes into the revision history every five minutes of editing.
 */

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'offline' | 'error' | 'conflict'

export interface AutosaverOptions {
  store: EditorStore
  designId: string
  revision: number
  title: string
  onStatus: (status: SaveStatus) => void
  fetchImpl?: typeof fetch
  debounceMs?: number
  checkpointMs?: number
}

export interface Autosaver {
  /** Saves now if anything changed; resolves once the save settles. */
  flush: () => Promise<void>
  /** Best-effort save while the page unloads. */
  flushOnExit: () => void
  setTitle: (title: string) => void
  revision: () => number
  isDirty: () => boolean
  dispose: () => void
}

export function createAutosaver(options: AutosaverOptions): Autosaver {
  const send = options.fetchImpl ?? ((input, init) => fetch(input, init))
  const debounceMs = options.debounceMs ?? 1000
  const checkpointMs = options.checkpointMs ?? 5 * 60_000
  const url = `/api/promo/designs/${options.designId}`

  let revision = options.revision
  let savedDocument = options.store.getState().document
  let savedTitle = options.title
  let title = options.title
  let timer: ReturnType<typeof setTimeout> | null = null
  let retryDelay = 0
  let chain: Promise<void> = Promise.resolve()
  let inFlight = false
  let stopped = false
  let lastCheckpoint = Date.now()

  const dirty = () => options.store.getState().document !== savedDocument || title !== savedTitle

  const body = () => {
    const document = options.store.getState().document
    const sendTitle = title
    return {
      document,
      sendTitle,
      json: JSON.stringify({
        revision,
        document,
        ...(sendTitle !== savedTitle ? { title: sendTitle } : {}),
      }),
    }
  }

  const schedule = (delay: number) => {
    if (stopped) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void flush()
    }, delay)
  }

  const retry = () => {
    retryDelay = Math.min(60_000, retryDelay ? retryDelay * 2 : 3000)
    schedule(retryDelay)
  }

  const checkpoint = (document: unknown) => {
    if (Date.now() - lastCheckpoint < checkpointMs) return
    lastCheckpoint = Date.now()
    void send(`${url}/revisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision, document, source: 'checkpoint' }),
    }).catch(() => undefined)
  }

  const run = async () => {
    if (stopped) return
    if (!dirty()) {
      options.onStatus('saved')
      return
    }
    const { document, sendTitle, json } = body()
    options.onStatus('saving')
    inFlight = true
    let response: Response
    try {
      response = await send(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: json })
    } catch {
      inFlight = false
      options.onStatus('offline')
      retry()
      return
    }
    inFlight = false
    if (response.status === 409) {
      stopped = true
      options.onStatus('conflict')
      return
    }
    if (!response.ok) {
      options.onStatus('error')
      // Server trouble passes; a rejected body or an expired session won't fix itself.
      if (response.status >= 500 || response.status === 429) retry()
      return
    }
    const result = (await response.json().catch(() => ({}))) as { revision?: number }
    if (typeof result.revision === 'number') revision = result.revision
    savedDocument = document
    savedTitle = sendTitle
    retryDelay = 0
    checkpoint(document)
    if (dirty()) schedule(debounceMs)
    else options.onStatus('saved')
  }

  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    chain = chain.then(run, run)
    return chain
  }

  const unsubscribe = options.store.subscribe((state, previous) => {
    if (state.document === previous.document || stopped) return
    options.onStatus('pending')
    schedule(debounceMs)
  })

  const onOnline = () => {
    if (dirty() && !stopped) schedule(0)
  }
  if (typeof window !== 'undefined') window.addEventListener('online', onOnline)

  return {
    flush,
    flushOnExit: () => {
      if (stopped || inFlight || !dirty()) return
      // keepalive lets the request outlive the page; the body is a few KB.
      void send(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: body().json,
        keepalive: true,
      }).catch(() => undefined)
    },
    setTitle: (next) => {
      title = next
      options.onStatus('pending')
      schedule(debounceMs)
    },
    revision: () => revision,
    isDirty: dirty,
    dispose: () => {
      stopped = true
      if (timer) clearTimeout(timer)
      unsubscribe()
      if (typeof window !== 'undefined') window.removeEventListener('online', onOnline)
    },
  }
}
