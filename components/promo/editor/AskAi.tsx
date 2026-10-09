'use client'

import { useCallback, useState } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { sameContent, type EditorStore } from '@/lib/promo/client/editor-store'
import type { DesignDocument } from '@/lib/promo/types'
import { promoFetch } from '../hooks'

interface ReviseResponse {
  document: DesignDocument
  summary: string
  applied: string[]
  skipped: { op: string; reason: string }[]
  changed: boolean
}

export interface ReviseState {
  busy: boolean
  error: string | null
  result: ReviseResponse | null
  /** A reply that arrived after she kept editing; applying it would undo her new edits. */
  held: ReviseResponse | null
  submit: (instruction: string) => Promise<void>
  applyHeld: () => void
  dismiss: () => void
}

/** One AI revision at a time; the result lands as a single undoable step. */
export function useRevise(store: EditorStore, designId: string): ReviseState {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ReviseResponse | null>(null)
  const [held, setHeld] = useState<ReviseResponse | null>(null)

  const submit = useCallback(
    async (instruction: string) => {
      setBusy(true)
      setError(null)
      setResult(null)
      setHeld(null)
      const sent = store.getState().document
      try {
        const reply = await promoFetch<ReviseResponse>(`/api/promo/designs/${designId}/revise`, {
          method: 'POST',
          json: { instruction, document: sent },
        })
        if (reply.changed && !sameContent(store.getState().document, sent)) setHeld(reply)
        else if (reply.changed) store.getState().replace({ ...reply.document, layout: store.getState().document.layout })
        setResult(reply)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The AI didn’t respond. Your design is unchanged.')
      } finally {
        setBusy(false)
      }
    },
    [store, designId]
  )

  return {
    busy,
    error,
    result,
    held,
    submit,
    applyHeld: () => {
      if (held) store.getState().replace({ ...held.document, layout: store.getState().document.layout })
      setHeld(null)
    },
    dismiss: () => {
      setResult(null)
      setError(null)
      setHeld(null)
    },
  }
}

const SUGGESTIONS = ['More dramatic', 'Shorter copy', 'Warmer tone', 'Punchier tagline']

/** "Ask for a change": plain-language revisions. Words she typed herself stay put unless she names them. */
export function AskAi({ revise, onUndo }: { revise: ReviseState; onUndo: () => void }) {
  const [instruction, setInstruction] = useState('')
  const send = (text: string) => {
    const trimmed = text.trim()
    if (trimmed.length < 2 || revise.busy) return
    void revise.submit(trimmed).then(() => setInstruction(''))
  }

  return (
    <section aria-label="Ask AI for a change" className="rounded-lg border border-champagne-200 bg-champagne-100 p-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          send(instruction)
        }}
      >
        <input
          aria-label="Ask for a change"
          placeholder="Ask for a change: “make it more dramatic”"
          value={instruction}
          maxLength={300}
          onChange={(event) => setInstruction(event.target.value)}
          className="min-h-control min-w-0 flex-1 rounded-lg border border-champagne-200 bg-champagne-50 px-3 text-charcoal-900 placeholder:text-charcoal-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
        <Button type="submit" variant="outline" disabled={revise.busy || instruction.trim().length < 2}>
          <SparklesIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {revise.busy ? 'Working…' : 'Ask'}
        </Button>
      </form>
      {!revise.result && !revise.error && !revise.busy && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              className="rounded px-2 py-1 text-xs text-charcoal-600 transition-colors hover:bg-champagne-200 hover:text-charcoal-900"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      <div aria-live="polite">
        {revise.error && <p className="mt-2 text-sm text-rose-700">{revise.error}</p>}
        {revise.held && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-charcoal-700">
            <p className="flex-1">You kept editing while the AI worked. Apply its changes anyway?</p>
            <Button size="sm" variant="outline" onClick={revise.applyHeld}>
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={revise.dismiss}>
              Skip
            </Button>
          </div>
        )}
        {revise.result && !revise.held && (
          <div className="mt-2 text-sm text-charcoal-700">
            <div className="flex flex-wrap items-center gap-2">
              <p className="flex-1">{revise.result.summary}</p>
              {revise.result.changed && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onUndo()
                    revise.dismiss()
                  }}
                >
                  Undo
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={revise.dismiss} aria-label="Dismiss">
                OK
              </Button>
            </div>
            {revise.result.skipped.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-xs text-charcoal-500">
                {revise.result.skipped.slice(0, 4).map((item, index) => (
                  <li key={index}>{item.reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
