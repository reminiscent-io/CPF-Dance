'use client'

import { useMemo, useState } from 'react'
import { useUser } from '@/lib/auth/hooks'
import { useAsyncData } from '@/lib/hooks/useAsyncData'
import { PortalLayout } from '@/components/PortalLayout'
import { Button, EmptyState, Input, PageHeader, useToast } from '@/components/ui'
import { promoFetch, usePromoMe } from '@/components/promo/hooks'
import { formatMicros } from '@/lib/promo/ai/pricing'
import { CurrencyDollarIcon } from '@heroicons/react/24/outline'

interface Usage {
  month: string
  defaultCapMicros: number
  pricesChecked: string
  models: { primary: string; fallback: string }
  monthly: { owner_id: string; month: string; kind: string; calls: number; cost_micros: number }[]
  budgets: { owner_id: string; monthly_cap_micros: number }[]
  calls: {
    id: string
    owner_id: string
    kind: string
    model: string
    status: string
    input_tokens: number
    output_tokens: number
    cost_micros: number
    latency_ms: number | null
    error_code: string | null
    created_at: string
  }[]
  owners: { id: string; full_name: string | null; email: string | null }[]
}

const KIND_LABELS: Record<string, string> = {
  tag: 'Photo tagging',
  generate: 'New promos',
  revise: 'Revisions',
  shorten: 'Shortening',
  photo_edit: 'Photo edits',
}

const monthLabel = (month: string) =>
  new Date(`${month}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function PromoUsagePage() {
  const { profile } = useUser()
  const { me } = usePromoMe()
  const { addToast } = useToast()
  const { data, error, loading, refetch } = useAsyncData<Usage>(
    (signal) => promoFetch<Usage>('/api/admin/promo/usage', { signal }),
    []
  )
  const [caps, setCaps] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const owners = useMemo(() => {
    if (!data) return []
    const ids = new Set<string>([...data.monthly.map((row) => row.owner_id), ...data.budgets.map((row) => row.owner_id)])
    if (me) ids.add(me.ownerId)
    return [...ids].map((id) => {
      const owner = data.owners.find((item) => item.id === id)
      const thisMonth = data.monthly.filter((row) => row.owner_id === id && row.month === data.month)
      const cap = data.budgets.find((row) => row.owner_id === id)?.monthly_cap_micros ?? data.defaultCapMicros
      return {
        id,
        name: owner?.full_name || owner?.email || (me?.ownerId === id ? me.name : null) || 'Instructor',
        spent: thisMonth.reduce((sum, row) => sum + Number(row.cost_micros), 0),
        cap: Number(cap),
        kinds: thisMonth,
      }
    })
  }, [data, me])

  const history = useMemo(() => {
    const byMonth = new Map<string, { calls: number; cost: number }>()
    for (const row of data?.monthly ?? []) {
      const entry = byMonth.get(row.month) ?? { calls: 0, cost: 0 }
      entry.calls += row.calls
      entry.cost += Number(row.cost_micros)
      byMonth.set(row.month, entry)
    }
    return [...byMonth.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [data])

  const saveCap = async (ownerId: string, current: number) => {
    const raw = caps[ownerId] ?? String(current / 1_000_000)
    const capUsd = Number(raw)
    if (!Number.isFinite(capUsd) || capUsd < 0) {
      addToast('Enter a dollar amount, like 10.', 'error')
      return
    }
    setSaving(ownerId)
    try {
      await promoFetch('/api/admin/promo/usage', { method: 'PUT', json: { ownerId, capUsd } })
      addToast('Cap saved', 'success')
      refetch()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Couldn’t save the cap.', 'error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="AI usage"
        subtitle={data ? `Promo Studio spend for ${monthLabel(data.month)}, in studio time.` : 'Promo Studio spend and monthly caps.'}
      />
      <div className="mt-header-gap space-y-8">
        {error ? (
          <EmptyState icon={<CurrencyDollarIcon />} message={error} />
        ) : loading && !data ? (
          <div className="skeleton-shimmer h-40 rounded-lg" aria-busy="true" />
        ) : data ? (
          <>
            <section className="space-y-4">
              {owners.map((owner) => {
                const share = owner.cap > 0 ? Math.min(1, owner.spent / owner.cap) : 1
                return (
                  <div key={owner.id} className="rounded-lg border border-champagne-200 bg-champagne-50 p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h2 className="font-serif text-xl font-semibold text-charcoal-950">{owner.name}</h2>
                      <p className="text-sm text-charcoal-700 tabular-nums">
                        {formatMicros(owner.spent)} of {formatMicros(owner.cap)} this month
                      </p>
                    </div>
                    <div
                      className="mt-3 h-2 overflow-hidden rounded-full bg-champagne-200"
                      role="progressbar"
                      aria-label={`${owner.name} AI spend`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(share * 100)}
                    >
                      <div
                        className={`h-full rounded-full ${share >= 1 ? 'bg-rose-600' : 'bg-gold-600'}`}
                        style={{ width: `${Math.max(1, share * 100)}%` }}
                      />
                    </div>
                    {owner.kinds.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-charcoal-600">
                        {owner.kinds.map((row) => (
                          <li key={row.kind} className="tabular-nums">
                            {KIND_LABELS[row.kind] ?? row.kind}: {row.calls} {row.calls === 1 ? 'call' : 'calls'},{' '}
                            {formatMicros(Number(row.cost_micros))}
                          </li>
                        ))}
                      </ul>
                    )}
                    <form
                      className="mt-4 flex items-end gap-2"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void saveCap(owner.id, owner.cap)
                      }}
                    >
                      <div className="w-40">
                        <Input
                          label="Monthly cap (USD)"
                          name={`cap-${owner.id}`}
                          inputMode="decimal"
                          value={caps[owner.id] ?? String(owner.cap / 1_000_000)}
                          onChange={(event) => setCaps((current) => ({ ...current, [owner.id]: event.target.value }))}
                        />
                      </div>
                      <Button type="submit" variant="outline" disabled={saving === owner.id}>
                        {saving === owner.id ? 'Saving…' : 'Save cap'}
                      </Button>
                    </form>
                    <p className="mt-2 text-xs text-charcoal-500">
                      At the cap, AI features pause until next month; editing and exports keep working.
                    </p>
                  </div>
                )
              })}
            </section>

            <section>
              <h2 className="font-serif text-xl font-semibold text-charcoal-950">Last six months</h2>
              {history.length === 0 ? (
                <p className="mt-2 text-sm text-charcoal-500">No AI calls yet.</p>
              ) : (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-champagne-200 text-left text-charcoal-500">
                      <th className="py-2 font-medium">Month</th>
                      <th className="py-2 text-right font-medium">Calls</th>
                      <th className="py-2 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(([month, entry]) => (
                      <tr key={month} className="border-b border-champagne-100">
                        <td className="py-2 text-charcoal-800">{monthLabel(month)}</td>
                        <td className="py-2 text-right tabular-nums">{entry.calls}</td>
                        <td className="py-2 text-right tabular-nums">{formatMicros(entry.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <h2 className="font-serif text-xl font-semibold text-charcoal-950">Recent calls</h2>
              <p className="mt-0.5 text-xs text-charcoal-500">
                Text model {data.models.primary}, falling back to {data.models.fallback}. Costs are estimates from list prices
                checked {data.pricesChecked}.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead>
                    <tr className="border-b border-champagne-200 text-left text-charcoal-500">
                      <th className="py-2 font-medium">When</th>
                      <th className="py-2 font-medium">What</th>
                      <th className="py-2 font-medium">Model</th>
                      <th className="py-2 font-medium">Result</th>
                      <th className="py-2 text-right font-medium">Tokens</th>
                      <th className="py-2 text-right font-medium">Cost</th>
                      <th className="py-2 text-right font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.calls.map((call) => (
                      <tr key={call.id} className="border-b border-champagne-100">
                        <td className="py-2 text-charcoal-700">{timeLabel(call.created_at)}</td>
                        <td className="py-2 text-charcoal-800">{KIND_LABELS[call.kind] ?? call.kind}</td>
                        <td className="py-2 text-charcoal-600">{call.model}</td>
                        <td className={`py-2 ${call.status === 'ok' ? 'text-charcoal-700' : 'text-rose-700'}`}>
                          {call.status}
                          {call.error_code ? ` (${call.error_code})` : ''}
                        </td>
                        <td className="py-2 text-right tabular-nums text-charcoal-700">
                          {call.input_tokens + call.output_tokens}
                        </td>
                        <td className="py-2 text-right tabular-nums text-charcoal-700">{formatMicros(Number(call.cost_micros))}</td>
                        <td className="py-2 text-right tabular-nums text-charcoal-700">
                          {call.latency_ms ? `${(call.latency_ms / 1000).toFixed(1)} s` : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </PortalLayout>
  )
}
