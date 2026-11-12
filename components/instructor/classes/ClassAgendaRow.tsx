import { StatusDot } from '@/components/ui'
import type { Class } from '@/lib/types'
import { seriesLabel } from '@/lib/class-series'
import { CLASS_TYPE_LABEL, ET, compactPrice } from './class-helpers'

// Temporal weight bakes the hierarchy into the layout: the next class and
// today read loud, far-off and past sessions recede. Rose punctuation
// (price + type) is layered on top for premium 1:1s, within the One Ribbon budget.
export type RowWeight = 'hero' | 'normal' | 'far' | 'past'

const WEIGHT_STYLES: Record<
  RowWeight,
  { pad: string; title: string; time: string; meta: string; price: string; enroll: string }
> = {
  hero: { pad: 'py-4', title: 'text-xl text-charcoal-950', time: 'text-base text-charcoal-700', meta: 'text-charcoal-500', price: 'text-charcoal-950', enroll: 'text-charcoal-500' },
  normal: { pad: 'py-3', title: 'text-lg text-charcoal-950', time: 'text-sm text-charcoal-600', meta: 'text-charcoal-500', price: 'text-charcoal-950', enroll: 'text-charcoal-500' },
  far: { pad: 'py-3', title: 'text-lg text-charcoal-800', time: 'text-sm text-charcoal-400', meta: 'text-charcoal-400', price: 'text-charcoal-700', enroll: 'text-charcoal-400' },
  past: { pad: 'py-2', title: 'text-base text-charcoal-500', time: 'text-sm text-charcoal-400', meta: 'text-charcoal-400', price: 'text-charcoal-400', enroll: 'text-charcoal-400' },
}

export function ClassAgendaRow({
  cls,
  weight,
  isNext,
  onClick,
}: {
  cls: Class
  weight: RowWeight
  isNext: boolean
  onClick: () => void
}) {
  const s = WEIGHT_STYLES[weight]
  const isPrivate = cls.class_type === 'private'
  const isPast = weight === 'past'
  const cancelled = cls.is_cancelled
  const start = new Date(cls.start_time)
  const end = new Date(cls.end_time)
  const startTime = start.toLocaleString('en-US', { timeZone: ET, hour: 'numeric', minute: '2-digit' })
  const endTime = end.toLocaleString('en-US', { timeZone: ET, hour: 'numeric', minute: '2-digit' })
  const price = compactPrice(cls)
  const priceRose = isPrivate && !isPast && !cancelled
  const enrollment =
    cls.actual_attendance_count !== null && cls.actual_attendance_count !== undefined
      ? `${cls.actual_attendance_count} attended`
      : `${cls.enrolled_count || 0}${cls.max_capacity ? `/${cls.max_capacity}` : ''} enrolled`

  return (
    <button
      type="button"
      id={`class-card-${cls.id}`}
      onClick={onClick}
      className={`group flex w-full scroll-mt-[5.5rem] items-start gap-3 px-3 text-left transition-colors sm:gap-4 ${s.pad} ${
        isPrivate ? 'hover:bg-rose-50' : 'hover:bg-champagne-100'
      }`}
    >
      {/* Time rail: start over end, leading the eye down the day's program */}
      <div className="w-[4.25rem] shrink-0 sm:w-20">
        <div className={`font-medium leading-tight tabular-nums ${s.time}`}>{startTime}</div>
        <div className="text-[0.7rem] leading-tight tabular-nums text-charcoal-400">{endTime}</div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3
            className={`font-serif font-semibold leading-snug ${s.title} ${
              cancelled ? 'text-charcoal-400 line-through' : ''
            }`}
          >
            {cls.title}
          </h3>
          {isNext && !cancelled && (
            <span className="rounded-sm bg-rose-50 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-rose-700">
              Up next
            </span>
          )}
        </div>
        <div className={`mt-1 flex flex-wrap items-center gap-x-1.5 text-sm ${s.meta}`}>
          <span className={priceRose ? 'font-medium text-rose-700' : undefined}>
            {CLASS_TYPE_LABEL[cls.class_type]}
          </span>
          {cls.series_position && cls.series_total && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {seriesLabel(cls.class_type, { series_position: cls.series_position, series_total: cls.series_total })}
              </span>
            </>
          )}
          {cls.is_virtual && (
            <>
              <span aria-hidden="true">·</span>
              <span>Online</span>
            </>
          )}
          {cls.studio && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">
                {cls.studio.name}
                {cls.studio.city ? `, ${cls.studio.city}` : ''}
              </span>
            </>
          )}
          {cancelled && (
            <>
              <span aria-hidden="true">·</span>
              <StatusDot tone="attention" label="Cancelled" />
            </>
          )}
        </div>
      </div>

      {/* Value rail: price carries the weight so premium sessions never blend in */}
      <div className="shrink-0 pl-1 text-right">
        <div className={`font-semibold tabular-nums ${priceRose ? 'text-rose-700' : s.price}`}>
          {price ?? <span className="font-normal text-charcoal-300">—</span>}
        </div>
        <div className={`mt-0.5 text-xs tabular-nums ${s.enroll}`}>{enrollment}</div>
        {!!cls.unlinked_purchase_count && !cancelled && (
          <div className="text-xs tabular-nums text-rose-700">{cls.unlinked_purchase_count} paid, not linked</div>
        )}
      </div>
    </button>
  )
}
