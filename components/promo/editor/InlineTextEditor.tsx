'use client'

import { useEffect, useRef } from 'react'
import type { SceneText } from '@/lib/promo/layout/scene'

export interface InlineTextEditorProps {
  node: SceneText
  /** CSS pixels per design unit. */
  scale: number
  value: string
  multiline: boolean
  label: string
  onChange: (value: string) => void
  onDone: () => void
}

/**
 * Typing on the canvas (laptop): a textarea laid over the text it edits, in
 * the same face. The design under it updates as she types.
 */
export function InlineTextEditor({ node, scale, value, multiline, label, onChange, onDone }: InlineTextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const field = ref.current
    if (!field) return
    field.focus()
    field.select()
  }, [])

  // Small print on a scaled-down poster would be unreadable at true size.
  const fontSize = Math.max(14, node.fontSize * scale)
  const lineCount = Math.max(1, node.lines.length)
  const height = Math.max(node.height * scale, fontSize * node.lineHeight * lineCount + 8)

  return (
    <textarea
      ref={ref}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(multiline ? event.target.value : event.target.value.replace(/\n/g, ' '))}
      onBlur={onDone}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || (event.key === 'Enter' && !multiline && !event.shiftKey)) {
          event.preventDefault()
          onDone()
        }
      }}
      spellCheck
      className="absolute resize-none overflow-hidden rounded-sm border-0 p-1"
      style={{
        left: node.x * scale - 4,
        top: node.y * scale + (node.height * scale - height) / 2,
        width: node.width * scale + 8,
        height,
        fontFamily: `"${node.fontFamily}"`,
        fontWeight: node.fontWeight,
        fontSize,
        lineHeight: node.lineHeight,
        letterSpacing: (node.letterSpacing / node.fontSize) * fontSize,
        textAlign: node.align,
        textTransform: node.uppercase ? 'uppercase' : 'none',
        // Ink on paper whatever the design's colors, so light-on-dark text stays readable while typing.
        color: '#1a1a1a',
        background: 'rgba(250, 248, 245, 0.97)',
        outline: '2px solid #b06472',
      }}
    />
  )
}
