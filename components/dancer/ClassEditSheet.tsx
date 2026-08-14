'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Sheet, SheetBody, SheetFooter } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { formatClassDate, formatClassTime, formatDuration } from '@/lib/utils/class-dates'

export interface PersonalClass {
  id: string
  title: string
  instructor_name: string | null
  location: string | null
  start_time: string
  end_time: string | null
  notes: string | null
  is_recurring: boolean
}

interface ClassEditSheetProps {
  isOpen: boolean
  onClose: () => void
  /** Pass an existing class to edit; pass null to add a new one. */
  editing: PersonalClass | null
  onSaved: () => void | Promise<void>
}

interface FormState {
  title: string
  instructor_name: string
  location: string
  start_time: string
  notes: string
  duration_minutes: number
  is_recurring: boolean
  recurring_days: number[]
  recurring_end: string
}

interface FormErrors {
  title?: string
  start_time?: string
  duration_minutes?: string
  recurring_days?: string
  recurring_end?: string
}

const DURATION_OPTIONS = [
  15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 105, 120, 150, 180, 210, 240,
].map((m) => ({ value: m, label: formatDuration(m) }))

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const BATCH_CONFIRM_THRESHOLD = 20

const emptyForm: FormState = {
  title: '',
  instructor_name: '',
  location: '',
  start_time: '',
  notes: '',
  duration_minutes: 60,
  is_recurring: false,
  recurring_days: [],
  recurring_end: '',
}

function generateRecurringInstances(
  startTime: string,
  durationMinutes: number,
  days: number[],
  endDate: string
): { start_time: string; end_time: string }[] {
  const instances: { start_time: string; end_time: string }[] = []
  const start = new Date(startTime)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= end) {
    if (days.includes(cursor.getDay())) {
      const instance = new Date(cursor)
      instance.setHours(start.getHours(), start.getMinutes(), 0, 0)
      // Only include instances on or after the original start moment.
      if (instance >= start) {
        const finish = new Date(instance.getTime() + durationMinutes * 60000)
        instances.push({
          start_time: instance.toISOString(),
          end_time: finish.toISOString(),
        })
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return instances
}

function buildForm(editing: PersonalClass | null): FormState {
  if (!editing) return emptyForm

  const startDate = new Date(editing.start_time)
  let duration = 60
  if (editing.end_time) {
    duration = Math.max(
      5,
      Math.round((new Date(editing.end_time).getTime() - startDate.getTime()) / 60000)
    )
  }

  return {
    title: editing.title,
    instructor_name: editing.instructor_name ?? '',
    location: editing.location ?? '',
    start_time: toLocalInputValue(startDate),
    notes: editing.notes ?? '',
    duration_minutes: duration,
    is_recurring: false, // editing only one instance — recurring rules don't apply.
    recurring_days: [],
    recurring_end: '',
  }
}

export function ClassEditSheet({ isOpen, onClose, editing, onSaved }: ClassEditSheetProps) {
  const { addToast } = useToast()
  // Seeded once per mount. The call site keys this component on which class is
  // being edited, so opening a different one remounts and re-seeds rather than
  // writing the new values back through an effect.
  const [form, setForm] = useState<FormState>(() => buildForm(editing))
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [confirmingBatch, setConfirmingBatch] = useState<
    { start_time: string; end_time: string }[] | null
  >(null)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): FormErrors {
    const next: FormErrors = {}
    if (!form.title.trim()) next.title = 'Class title is required.'
    if (!form.start_time) next.start_time = 'Pick a start date and time.'
    if (!form.duration_minutes || form.duration_minutes < 5) {
      next.duration_minutes = 'Duration is required.'
    }
    if (form.is_recurring) {
      if (form.recurring_days.length === 0) {
        next.recurring_days = 'Pick at least one day.'
      }
      if (!form.recurring_end) {
        next.recurring_end = 'Pick an end date.'
      } else if (form.start_time && new Date(form.recurring_end) < new Date(form.start_time)) {
        next.recurring_end = 'End date must be on or after the start date.'
      }
    }
    return next
  }

  async function handleSubmit() {
    const validation = validate()
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    if (editing || !form.is_recurring) {
      await saveSingle()
      return
    }

    const instances = generateRecurringInstances(
      form.start_time,
      form.duration_minutes,
      form.recurring_days,
      form.recurring_end
    )

    if (instances.length === 0) {
      setErrors({ recurring_days: 'No matching dates between start and end.' })
      return
    }

    if (instances.length > BATCH_CONFIRM_THRESHOLD) {
      setConfirmingBatch(instances)
      return
    }

    await saveBatch(instances)
  }

  async function saveSingle() {
    setSaving(true)
    try {
      const startDate = new Date(form.start_time)
      const endDate = new Date(startDate.getTime() + form.duration_minutes * 60000)
      const payload = {
        title: form.title.trim(),
        instructor_name: form.instructor_name.trim() || null,
        location: form.location.trim() || null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        notes: form.notes.trim() || null,
        is_recurring: false,
      }

      const url = '/api/dancer/personal-classes'
      const method = editing ? 'PUT' : 'POST'
      const body = editing ? { ...payload, id: editing.id } : payload

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        addToast(err.error || 'Could not save the class.', 'error')
        return
      }

      addToast(editing ? 'Class updated.' : 'Class added.', 'success')
      await onSaved()
      onClose()
    } catch {
      addToast('Could not save the class.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveBatch(instances: { start_time: string; end_time: string }[]) {
    setSaving(true)
    try {
      const res = await fetch('/api/dancer/personal-classes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          instructor_name: form.instructor_name.trim() || null,
          location: form.location.trim() || null,
          notes: form.notes.trim() || null,
          instances,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        addToast(err.error || 'Could not create the recurring classes.', 'error')
        return
      }

      const data = await res.json()
      addToast(`Added ${data.created ?? instances.length} classes.`, 'success')
      await onSaved()
      onClose()
    } catch {
      addToast('Could not create the recurring classes.', 'error')
    } finally {
      setSaving(false)
      setConfirmingBatch(null)
    }
  }

  const recurringPreview = useMemo(() => {
    if (!form.is_recurring) return null
    if (!form.start_time || !form.recurring_end || form.recurring_days.length === 0) return null
    return generateRecurringInstances(
      form.start_time,
      form.duration_minutes,
      form.recurring_days,
      form.recurring_end
    )
  }, [form.is_recurring, form.start_time, form.duration_minutes, form.recurring_days, form.recurring_end])

  // Confirmation view: separate "screen" inside the same Sheet.
  if (confirmingBatch) {
    return (
      <Sheet
        isOpen={isOpen}
        onClose={() => {
          setConfirmingBatch(null)
        }}
        title="Confirm recurring classes"
        description={`This will add ${confirmingBatch.length} classes to your schedule.`}
        size="md"
      >
        <SheetBody className="space-y-3">
          <p className="text-sm text-charcoal-700">
            {form.title || 'Class'} on {form.recurring_days.map((d) => DAY_LABELS[d]).join(', ')},
            ending {formatClassDate(form.recurring_end)}.
          </p>
          <ul className="divide-y divide-champagne-200 border-y border-champagne-200">
            {confirmingBatch.slice(0, 12).map((inst, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between py-2.5 text-sm"
              >
                <span className="font-medium text-charcoal-900 tabular-nums">
                  {formatClassDate(inst.start_time)}
                </span>
                <span className="text-charcoal-500 tabular-nums">
                  {formatClassTime(inst.start_time)}
                </span>
              </li>
            ))}
          </ul>
          {confirmingBatch.length > 12 && (
            <p className="text-sm text-charcoal-500">
              and {confirmingBatch.length - 12} more.
            </p>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => setConfirmingBatch(null)} disabled={saving}>
            Back
          </Button>
          <Button onClick={() => saveBatch(confirmingBatch)} disabled={saving}>
            {saving ? 'Adding…' : `Add ${confirmingBatch.length} classes`}
          </Button>
        </SheetFooter>
      </Sheet>
    )
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Edit class' : 'Add a class'}
      description={
        editing
          ? 'Update the details for this class.'
          : 'Track a class outside your enrolled schedule.'
      }
      size="md"
    >
      <SheetBody className="space-y-5">
        <Input
          label="Class title"
          placeholder="Ballet, Hip Hop, Pilates…"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          error={errors.title}
          required
        />
        <Input
          label="Instructor"
          placeholder="Optional"
          value={form.instructor_name}
          onChange={(e) => update('instructor_name', e.target.value)}
        />
        <Input
          label="Location"
          placeholder="Optional"
          value={form.location}
          onChange={(e) => update('location', e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Starts"
            type="datetime-local"
            value={form.start_time}
            onChange={(e) => update('start_time', e.target.value)}
            error={errors.start_time}
            required
          />
          <Select
            label="Duration"
            value={form.duration_minutes}
            onChange={(e) => update('duration_minutes', parseInt(e.target.value, 10))}
            options={DURATION_OPTIONS}
            error={errors.duration_minutes}
            required
          />
        </div>

        <Textarea
          label="Notes"
          placeholder="Optional"
          rows={3}
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
        />

        {!editing && (
          <div className="space-y-4 pt-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <span className="relative inline-flex w-10 h-6 flex-shrink-0">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={form.is_recurring}
                  onChange={(e) => update('is_recurring', e.target.checked)}
                />
                <span
                  className="absolute inset-0 rounded-full bg-champagne-200 peer-checked:bg-rose-600 transition-colors"
                />
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-champagne-50 shadow-soft transition-transform peer-checked:translate-x-4"
                />
              </span>
              <span className="text-sm font-medium text-charcoal-700">
                This class repeats
              </span>
            </label>

            {form.is_recurring && (
              <div className="space-y-4 pl-1">
                <fieldset>
                  <legend className="block text-sm font-medium text-charcoal-500 mb-2">
                    Repeats on
                  </legend>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Days of week">
                    {DAY_LABELS.map((label, idx) => {
                      const active = form.recurring_days.includes(idx)
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            const next = active
                              ? form.recurring_days.filter((d) => d !== idx)
                              : [...form.recurring_days, idx].sort((a, b) => a - b)
                            update('recurring_days', next)
                          }}
                          aria-pressed={active}
                          className={`
                            min-w-11 min-h-11 px-3 rounded-md text-sm font-medium
                            border transition-colors
                            ${active
                              ? 'bg-champagne-50 border-rose-400 text-rose-700'
                              : 'bg-champagne-50 border-champagne-200 text-charcoal-700 hover:border-champagne-300'
                            }
                          `}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  {errors.recurring_days && (
                    <p className="mt-2 text-sm text-rose-700">{errors.recurring_days}</p>
                  )}
                </fieldset>

                <Input
                  label="Until"
                  type="date"
                  value={form.recurring_end}
                  onChange={(e) => update('recurring_end', e.target.value)}
                  error={errors.recurring_end}
                  required
                />

                {recurringPreview && (
                  <p className="text-sm text-charcoal-500">
                    Will add {recurringPreview.length}{' '}
                    {recurringPreview.length === 1 ? 'class' : 'classes'}.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </SheetBody>

      <SheetFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add class'}
        </Button>
      </SheetFooter>
    </Sheet>
  )
}

/** Convert a Date to a value usable in <input type="datetime-local"> in local time. */
function toLocalInputValue(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}
