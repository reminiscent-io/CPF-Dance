'use client'

import { useState } from 'react'
import type { SlotDef, TemplateDefinition } from '@/lib/promo/types'

const fieldClass =
  'mt-1 w-full rounded-lg border border-champagne-200 bg-champagne-50 px-3 py-2 text-sm text-charcoal-900 ' +
  'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rose-500'

const BINDING_LABELS: Record<SlotDef['binding'], string> = {
  copy: 'Written by AI, edited by her',
  fact: 'From the class schedule',
  brand: 'From the brand kit',
  photo: 'Her photos',
}

/** What each slot holds, how long it may be, and how the AI and revisions refer to it. */
export function SlotsPanel({
  definition,
  onChange,
}: {
  definition: TemplateDefinition
  onChange: (slotId: string, recipe: (slot: SlotDef) => SlotDef, field: string) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <ul className="divide-y divide-champagne-200 rounded-lg border border-champagne-200">
      {definition.slots.map((slot) => {
        const expanded = open === slot.id
        const set = (field: string, recipe: (current: SlotDef) => SlotDef) => onChange(slot.id, recipe, field)
        const num = (value: string) => (value === '' ? undefined : Math.max(0, Math.round(Number(value))))
        return (
          <li key={slot.id}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : slot.id)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-champagne-100"
            >
              <span>
                <span className="block text-sm font-medium text-charcoal-900">{slot.label}</span>
                <span className="block text-xs text-charcoal-500">
                  {slot.id} · {BINDING_LABELS[slot.binding]}
                </span>
              </span>
              <span className="text-xs text-charcoal-400">{expanded ? 'Close' : 'Edit'}</span>
            </button>
            {expanded && (
              <div className="space-y-3 bg-champagne-100 px-3 py-3">
                <label className="block text-xs font-medium text-charcoal-500">
                  Label
                  <input
                    className={fieldClass}
                    value={slot.label}
                    onChange={(event) => set('label', (current) => ({ ...current, label: event.target.value || current.id }))}
                  />
                </label>
                {slot.binding === 'copy' && (
                  <label className="block text-xs font-medium text-charcoal-500">
                    What the AI should write
                    <textarea
                      className={fieldClass}
                      rows={2}
                      value={slot.guidance ?? ''}
                      onChange={(event) => set('guidance', (current) => ({ ...current, guidance: event.target.value || undefined }))}
                    />
                  </label>
                )}
                {(slot.kind === 'text' || slot.kind === 'list') && (
                  <label className="block text-xs font-medium text-charcoal-500">
                    Most characters{slot.kind === 'list' ? ' per item' : ''}
                    <input
                      type="number"
                      className={fieldClass}
                      value={slot.maxChars ?? ''}
                      onChange={(event) => set('maxChars', (current) => ({ ...current, maxChars: num(event.target.value) }))}
                    />
                  </label>
                )}
                {slot.list && (
                  <div className="grid grid-cols-3 gap-2">
                    {(['min', 'target', 'max'] as const).map((key) => (
                      <label key={key} className="block text-xs font-medium text-charcoal-500">
                        {key === 'min' ? 'Fewest' : key === 'max' ? 'Most' : 'Default'}
                        <input
                          type="number"
                          className={fieldClass}
                          value={slot.list?.[key] ?? ''}
                          onChange={(event) =>
                            set(`list.${key}`, (current) => ({
                              ...current,
                              list: { min: 0, max: 1, ...current.list, [key]: num(event.target.value) ?? (key === 'target' ? undefined : 0) },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}
                <AliasesField
                  aliases={slot.aliases ?? []}
                  onCommit={(aliases) => set('aliases', (current) => ({ ...current, aliases }))}
                />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Commits on blur, so typing a comma doesn't get tidied away mid-word. */
function AliasesField({ aliases, onCommit }: { aliases: string[]; onCommit: (aliases: string[]) => void }) {
  const [draft, setDraft] = useState(aliases.join(', '))
  return (
    <label className="block text-xs font-medium text-charcoal-500">
      Other names in a revision request (comma separated)
      <input
        className={fieldClass}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() =>
          onCommit(
            draft
              .split(',')
              .map((alias) => alias.trim())
              .filter(Boolean)
          )
        }
      />
    </label>
  )
}
