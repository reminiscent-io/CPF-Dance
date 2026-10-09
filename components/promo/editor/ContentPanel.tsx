'use client'

import { useEffect, useMemo } from 'react'
import { ArrowDownIcon, ArrowUpIcon, LockClosedIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import {
  clearSlotValue,
  factValues,
  isSessionList,
  isStringList,
  resolveSlotValue,
  setSlotValue,
} from '@/lib/promo/document'
import { slotsInLayout } from '@/lib/promo/layout/scene'
import type { PromoBrief, SessionValue, SlotDef } from '@/lib/promo/types'
import { useEditor, useEditorState } from './EditorContext'

const fieldClass =
  'w-full rounded-lg border border-champagne-200 bg-champagne-50 px-3 py-2 text-charcoal-900 placeholder:text-charcoal-300 ' +
  'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rose-500'

function hasFacts(brief: Partial<PromoBrief>): brief is PromoBrief {
  return Array.isArray(brief.sessions) && typeof brief.level === 'string'
}

/** Content tab: one field per text slot, grouped by who normally fills it. */
export function ContentPanel() {
  const { definition, layout, scene } = useEditor()
  const focusSlot = useEditorState((state) => state.focusSlot)

  const warnings = useMemo(() => {
    const bySlot = new Map<string, string>()
    for (const warning of scene?.warnings ?? []) {
      if (warning.slotId && !bySlot.has(warning.slotId)) bySlot.set(warning.slotId, warning.message)
    }
    return bySlot
  }, [scene])

  useEffect(() => {
    if (!focusSlot) return
    const field = document.getElementById(`promo-field-${focusSlot}`)
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusSlot])

  // Only fields this format draws; the story, for one, has no feature list.
  const shown = useMemo(() => slotsInLayout(layout), [layout])
  const textSlots = definition.slots.filter((slot) => slot.binding !== 'photo' && shown.has(slot.id))
  const sections: { title: string; note?: string; slots: SlotDef[] }[] = [
    { title: 'Words', slots: textSlots.filter((slot) => slot.binding === 'copy') },
    {
      title: 'Class details',
      note: 'Filled from the class schedule. Changes here only affect this promo.',
      slots: textSlots.filter((slot) => slot.binding === 'fact'),
    },
    {
      title: 'About you',
      note: 'From the brand kit. Change a line here for this promo only.',
      slots: textSlots.filter((slot) => slot.binding === 'brand'),
    },
  ]

  return (
    <div className="space-y-6">
      {sections
        .filter((section) => section.slots.length > 0)
        .map((section) => (
          <section key={section.title} aria-labelledby={`promo-section-${section.title}`}>
            <h3 id={`promo-section-${section.title}`} className="font-serif text-lg font-semibold text-charcoal-950">
              {section.title}
            </h3>
            {section.note && <p className="mt-0.5 text-xs text-charcoal-500">{section.note}</p>}
            <div className="mt-3 space-y-4">
              {section.slots.map((slot) => (
                <SlotField
                  key={slot.id}
                  slot={slot}
                  warning={warnings.get(slot.id)}
                  highlighted={focusSlot === slot.id}
                />
              ))}
            </div>
          </section>
        ))}
    </div>
  )
}

function SlotField({ slot, warning, highlighted }: { slot: SlotDef; warning?: string; highlighted: boolean }) {
  const { brand, data, definition } = useEditor()
  const doc = useEditorState((state) => state.document)
  const apply = useEditorState((state) => state.apply)
  const value = resolveSlotValue(slot, doc, brand)
  const locked = doc.edited.includes(slot.id)
  const overridden = Object.prototype.hasOwnProperty.call(doc.values, slot.id)
  const brief = data.design.brief

  const reset =
    slot.binding === 'brand' && overridden
      ? { label: 'Use brand kit', run: () => apply((d) => clearSlotValue(d, slot.id)) }
      : slot.binding === 'fact' && locked && hasFacts(brief)
        ? {
            label: 'Use class schedule',
            run: () =>
              apply((d) => {
                const facts = factValues(definition, brief)
                const next = facts[slot.id] !== undefined ? setSlotValue(d, slot.id, facts[slot.id], { byHand: false }) : d
                return { ...next, edited: next.edited.filter((id) => id !== slot.id) }
              }),
          }
        : null

  return (
    <div
      id={`promo-field-${slot.id}`}
      className={`scroll-mt-24 rounded-lg transition-[box-shadow] duration-500 ${highlighted ? 'ring-2 ring-rose-300 ring-offset-4 ring-offset-champagne-50' : ''}`}
    >
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={`promo-input-${slot.id}`} className="text-sm font-medium text-charcoal-600">
          {slot.label}
          {locked && slot.binding === 'copy' && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-charcoal-400">
              <LockClosedIcon className="h-3 w-3" aria-hidden="true" />
              AI leaves this alone
            </span>
          )}
        </label>
        {reset && (
          <button type="button" onClick={reset.run} className="text-xs text-charcoal-500 underline-offset-2 hover:text-rose-700 hover:underline">
            {reset.label}
          </button>
        )}
      </div>
      {slot.kind === 'text' && <TextSlotInput slot={slot} value={typeof value === 'string' ? value : ''} />}
      {slot.kind === 'list' && <ListSlotInput slot={slot} items={isStringList(value) ? value : []} />}
      {slot.kind === 'sessions' && <SessionsInput slot={slot} sessions={isSessionList(value) ? value : []} />}
      {warning && <p className="mt-1 text-xs text-rose-700">{warning}</p>}
    </div>
  )
}

function Counter({ length, max }: { length: number; max?: number }) {
  if (!max) return null
  const over = length > max
  return (
    <span className={`text-xs tabular-nums ${over ? 'text-rose-700' : 'text-charcoal-400'}`} aria-live={over ? 'polite' : 'off'}>
      {length}/{max}
    </span>
  )
}

function TextSlotInput({ slot, value }: { slot: SlotDef; value: string }) {
  const apply = useEditorState((state) => state.apply)
  const change = (text: string) => apply((d) => setSlotValue(d, slot.id, text, { byHand: true }), `text:${slot.id}`)
  const long = (slot.maxChars ?? 0) > 60
  return (
    <div>
      {long ? (
        <textarea
          id={`promo-input-${slot.id}`}
          data-promo-field
          rows={3}
          value={value}
          onChange={(event) => change(event.target.value)}
          className={`${fieldClass} resize-y`}
        />
      ) : (
        <input
          id={`promo-input-${slot.id}`}
          data-promo-field
          value={value}
          onChange={(event) => change(event.target.value)}
          className={`${fieldClass} min-h-control`}
        />
      )}
      <div className="mt-0.5 flex justify-end">
        <Counter length={value.length} max={slot.maxChars} />
      </div>
    </div>
  )
}

function ListSlotInput({ slot, items }: { slot: SlotDef; items: string[] }) {
  const apply = useEditorState((state) => state.apply)
  const min = slot.list?.min ?? 0
  const max = slot.list?.max ?? 10
  const write = (next: string[], group?: string) =>
    apply((d) => setSlotValue(d, slot.id, next, { byHand: true }), group)

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            id={index === 0 ? `promo-input-${slot.id}` : undefined}
            data-promo-field
            aria-label={`${slot.label}, item ${index + 1}`}
            value={item}
            onChange={(event) => {
              const next = [...items]
              next[index] = event.target.value
              write(next, `text:${slot.id}:${index}`)
            }}
            className={`${fieldClass} min-h-control flex-1`}
          />
          <div className="flex items-center">
            <IconButton label="Move up" disabled={index === 0} onClick={() => write(swap(items, index, index - 1))}>
              <ArrowUpIcon className="h-4 w-4" />
            </IconButton>
            <IconButton
              label="Move down"
              disabled={index === items.length - 1}
              onClick={() => write(swap(items, index, index + 1))}
            >
              <ArrowDownIcon className="h-4 w-4" />
            </IconButton>
            <IconButton
              label="Remove"
              disabled={items.length <= min}
              onClick={() => write(items.filter((_, i) => i !== index))}
            >
              <XMarkIcon className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" disabled={items.length >= max} onClick={() => write([...items, ''])}>
          <PlusIcon className="mr-1 h-4 w-4" aria-hidden="true" />
          Add
        </Button>
        <span className="text-xs text-charcoal-400">
          {min === max ? `${max} items` : `${min} to ${max} items`}
          {slot.maxChars ? `, about ${slot.maxChars} characters each` : ''}
        </span>
      </div>
    </div>
  )
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

function SessionsInput({ slot, sessions }: { slot: SlotDef; sessions: SessionValue[] }) {
  const apply = useEditorState((state) => state.apply)
  const max = slot.list?.max ?? 4
  const min = Math.max(1, slot.list?.min ?? 1)
  const write = (next: SessionValue[], group?: string) =>
    apply((d) => setSlotValue(d, slot.id, next, { byHand: true }), group)
  const edit = (index: number, field: keyof SessionValue, text: string) => {
    const next = sessions.map((session) => ({ ...session }))
    next[index][field] = text
    write(next, `text:${slot.id}:${index}:${field}`)
  }

  return (
    <div className="space-y-2">
      {sessions.map((session, index) => (
        <div key={index} className="grid grid-cols-[3.5rem_4.75rem_1fr_auto] items-center gap-1.5 sm:grid-cols-[4.5rem_6rem_1fr_auto] sm:gap-2">
          <input
            id={index === 0 ? `promo-input-${slot.id}` : undefined}
            data-promo-field
            aria-label={`Date ${index + 1}, weekday`}
            value={session.weekday}
            onChange={(event) => edit(index, 'weekday', event.target.value)}
            className={`${fieldClass} min-h-control px-2 text-sm sm:text-base`}
          />
          <input
            data-promo-field
            aria-label={`Date ${index + 1}, date`}
            value={session.date}
            onChange={(event) => edit(index, 'date', event.target.value)}
            className={`${fieldClass} min-h-control px-2 text-sm sm:text-base`}
          />
          <input
            data-promo-field
            aria-label={`Date ${index + 1}, time`}
            value={session.time}
            onChange={(event) => edit(index, 'time', event.target.value)}
            className={`${fieldClass} min-h-control px-2 text-sm sm:text-base`}
          />
          <IconButton label={`Remove date ${index + 1}`} disabled={sessions.length <= min} onClick={() => write(sessions.filter((_, i) => i !== index))}>
            <XMarkIcon className="h-4 w-4" />
          </IconButton>
        </div>
      ))}
      <Button
        size="sm"
        variant="ghost"
        disabled={sessions.length >= max}
        onClick={() => write([...sessions, { weekday: '', date: '', time: '' }])}
      >
        <PlusIcon className="mr-1 h-4 w-4" aria-hidden="true" />
        Add a date
      </Button>
    </div>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-control w-control items-center justify-center rounded-md text-charcoal-500 transition-colors hover:bg-champagne-100 hover:text-charcoal-900 disabled:cursor-not-allowed disabled:text-charcoal-200 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
