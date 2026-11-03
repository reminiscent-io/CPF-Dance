export type CalendarMode = 'week' | 'month'

export interface DateRange {
  start: Date
  end: Date
}

/**
 * Returns the inclusive date range visible to the user for a given calendar
 * `mode` centered on `date`. Used by the schedule pages to fetch exactly the
 * events the calendar needs to render.
 *
 * Week mode: Sunday 00:00:00 of the week containing `date` through the
 * following Saturday 23:59:59.999. May span two months.
 *
 * Month mode: 1st of `date`'s month at 00:00:00 through the last day at
 * 23:59:59.999.
 */
export function getVisibleDateRange(date: Date, mode: CalendarMode): DateRange {
  if (mode === 'week') {
    const start = new Date(date)
    start.setDate(date.getDate() - date.getDay()) // 0 = Sunday
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    return { start, end }
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

/**
 * The range the instructor schedule page fetches: the six-week grid around
 * `date`'s month, from the Sunday on or before the 1st through 41 days later.
 *
 * One range serves every view on that page. The mobile calendar opens on a
 * month grid and only reports month changes, so fetching just the visible
 * week left the rest of the month blank: a lesson logged after the fact for
 * last Tuesday never appeared. Any week or day the user can land on while
 * `date`'s month is current intersects that month, so it falls inside this
 * grid too, and the desktop week view stops refetching on every arrow press.
 */
export function getScheduleFetchRange(date: Date): DateRange {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const start = new Date(firstOfMonth)
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay())
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 41)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}
