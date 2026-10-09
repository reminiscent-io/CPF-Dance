'use client'

import { useCallback, useRef, useState } from 'react'
import type { DesignDocument, PromoBrief } from '@/lib/promo/types'

export interface GeneratedVariation {
  index: number
  angle: string
  label: string
  document: DesignDocument
  callId: string | null
}

export type GenerateState =
  | { phase: 'idle' }
  | { phase: 'running'; variations: GeneratedVariation[] }
  | {
      phase: 'done'
      variations: GeneratedVariation[]
      fallback: DesignDocument | null
      message: string | null
      templateVersionId: string | null
    }
  | { phase: 'error'; message: string; code?: string }

type StreamMessage =
  | ({ type: 'variation' } & GeneratedVariation)
  | { type: 'done'; produced: number; fallback: DesignDocument | null; message: string | null; templateVersionId: string }

/** Reads /api/promo/generate's NDJSON stream; cards appear as each variation passes the checks. */
export function useGenerate() {
  const [state, setState] = useState<GenerateState>({ phase: 'idle' })
  const controller = useRef<AbortController | null>(null)

  const run = useCallback(async (brief: PromoBrief) => {
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setState({ phase: 'running', variations: [] })
    try {
      const response = await fetch('/api/promo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brief),
        signal: abort.signal,
      })
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}))
        setState({ phase: 'error', message: body.error || 'The AI didn’t respond. Try again.', code: body.code })
        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      const variations: GeneratedVariation[] = []
      let buffer = ''
      let finished = false
      const handle = (line: string) => {
        if (!line.trim()) return
        const message = JSON.parse(line) as StreamMessage
        if (message.type === 'variation') {
          variations.push({
            index: message.index,
            angle: message.angle,
            label: message.label,
            document: message.document,
            callId: message.callId,
          })
          variations.sort((a, b) => a.index - b.index)
          setState({ phase: 'running', variations: [...variations] })
        } else {
          finished = true
          setState({
            phase: 'done',
            variations: [...variations],
            fallback: message.fallback,
            message: message.message,
            templateVersionId: message.templateVersionId,
          })
        }
      }
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let newline = buffer.indexOf('\n')
        while (newline >= 0) {
          handle(buffer.slice(0, newline))
          buffer = buffer.slice(newline + 1)
          newline = buffer.indexOf('\n')
        }
      }
      handle(buffer)
      if (!finished) {
        setState({ phase: 'done', variations, fallback: null, message: null, templateVersionId: null })
      }
    } catch (error) {
      if (abort.signal.aborted) return
      setState({
        phase: 'error',
        message: error instanceof Error && error.message ? error.message : 'The connection dropped. Try again.',
      })
    }
  }, [])

  const reset = useCallback(() => {
    controller.current?.abort()
    setState({ phase: 'idle' })
  }, [])

  return { state, run, reset }
}
