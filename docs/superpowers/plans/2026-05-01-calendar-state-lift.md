# Calendar State Lift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bug where calendar events disappear on weeks that span two months, by lifting `currentDate` and `viewMode` from `Calendar` into the schedule pages so there is one source of truth and the data fetch always matches what the user actually sees.

**Architecture:** Extract a pure `getVisibleDateRange(date, mode)` utility, make `Calendar` a controlled component (props, no internal `currentDate`/`viewMode`), and have `app/(portal)/instructor/schedule/page.tsx` own that state and re-fetch via a `useEffect` whenever the visible range changes. The dancer schedule page already loads all events at once, so it gets the same controlled-`Calendar` API but no fetch changes.

**Tech Stack:** Next.js 16 App Router (client components), React 19, TypeScript, Vitest + jsdom for unit tests. The Calendar component lives at `components/Calendar.tsx`; existing utilities are under `lib/utils/`; tests are colocated under `__tests__/`.

---

## File Structure

**Create:**
- `lib/utils/calendar-range.ts` — Pure `getVisibleDateRange(date, mode)` returning `{ start, end }` for week or month mode. No React, no DOM, no I/O.
- `lib/utils/__tests__/calendar-range.test.ts` — Unit tests for the utility, including cross-month and year-boundary cases.

**Modify:**
- `components/Calendar.tsx` — Remove internal `currentDate` and `viewMode` state. Accept them as props plus `onDateChange` and `onViewModeChange` callbacks. Navigation handlers compute the next date from props and call the parent.
- `app/(portal)/instructor/schedule/page.tsx` — Own `currentDate` and `calendarMode`. Replace the manual `handleDateChange`-triggers-fetch pattern with a `useEffect` that recomputes the visible range via `getVisibleDateRange` and refetches when state changes. Day/list view fetches the month containing `currentDate`.
- `app/(portal)/dancer/schedule/page.tsx` — Pass the new required props to `Calendar`. No fetch changes (dancer API has no date filter).

---

## Task 1: Create `getVisibleDateRange` utility (TDD)

**Files:**
- Create: `lib/utils/calendar-range.ts`
- Test: `lib/utils/__tests__/calendar-range.test.ts`

This task extracts the date-range math into a pure function that the parent uses to fetch the right window. Writing tests first — including the cross-month case that the current code gets wrong — captures the bug before the fix lands.

- [ ] **Step 1: Write the failing tests**

Create `lib/utils/__tests__/calendar-range.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getVisibleDateRange } from '../calendar-range'

describe('getVisibleDateRange', () => {
  describe('week mode', () => {
    it('returns Sunday through Saturday for a midweek date', () => {
      // Wednesday, May 6, 2026
      const date = new Date(2026, 4, 6)
      const { start, end } = getVisibleDateRange(date, 'week')

      expect(start.getFullYear()).toBe(2026)
      expect(start.getMonth()).toBe(4) // May
      expect(start.getDate()).toBe(3)  // Sunday
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)

      expect(end.getFullYear()).toBe(2026)
      expect(end.getMonth()).toBe(4)
      expect(end.getDate()).toBe(9)    // Saturday
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
    })

    it('returns the same week when date is a Sunday', () => {
      // Sunday, May 3, 2026
      const date = new Date(2026, 4, 3)
      const { start, end } = getVisibleDateRange(date, 'week')

      expect(start.getDate()).toBe(3) // Sunday
      expect(end.getDate()).toBe(9)   // Saturday
    })

    it('returns a range that spans April and May for a cross-month week', () => {
      // Tuesday, April 28, 2026 — week is Sun Apr 26 → Sat May 2
      const date = new Date(2026, 3, 28)
      const { start, end } = getVisibleDateRange(date, 'week')

      expect(start.getMonth()).toBe(3) // April
      expect(start.getDate()).toBe(26)

      expect(end.getMonth()).toBe(4)   // May
      expect(end.getDate()).toBe(2)
    })

    it('returns a range that spans May and June for a Sunday at month end', () => {
      // Sunday, May 31, 2026 — week is May 31 → Sat Jun 6
      const date = new Date(2026, 4, 31)
      const { start, end } = getVisibleDateRange(date, 'week')

      expect(start.getMonth()).toBe(4) // May
      expect(start.getDate()).toBe(31)

      expect(end.getMonth()).toBe(5)   // June
      expect(end.getDate()).toBe(6)
    })

    it('handles year boundary (Dec 31 → Jan)', () => {
      // Thursday, Dec 31, 2026 — week is Sun Dec 27 → Sat Jan 2, 2027
      const date = new Date(2026, 11, 31)
      const { start, end } = getVisibleDateRange(date, 'week')

      expect(start.getFullYear()).toBe(2026)
      expect(start.getMonth()).toBe(11)
      expect(start.getDate()).toBe(27)

      expect(end.getFullYear()).toBe(2027)
      expect(end.getMonth()).toBe(0)
      expect(end.getDate()).toBe(2)
    })
  })

  describe('month mode', () => {
    it('returns the first through last day of the month', () => {
      // Any day in May 2026
      const date = new Date(2026, 4, 15)
      const { start, end } = getVisibleDateRange(date, 'month')

      expect(start.getFullYear()).toBe(2026)
      expect(start.getMonth()).toBe(4)
      expect(start.getDate()).toBe(1)
      expect(start.getHours()).toBe(0)

      expect(end.getMonth()).toBe(4)
      expect(end.getDate()).toBe(31)
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
    })

    it('handles February in a non-leap year (28 days)', () => {
      const date = new Date(2026, 1, 10) // Feb 10, 2026
      const { start, end } = getVisibleDateRange(date, 'month')

      expect(start.getDate()).toBe(1)
      expect(end.getDate()).toBe(28)
    })

    it('handles February in a leap year (29 days)', () => {
      const date = new Date(2028, 1, 10) // Feb 10, 2028 (leap)
      const { start, end } = getVisibleDateRange(date, 'month')

      expect(start.getDate()).toBe(1)
      expect(end.getDate()).toBe(29)
    })
  })
})
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm run test:run -- lib/utils/__tests__/calendar-range.test.ts
```

Expected: All tests fail with `Cannot find module '../calendar-range'` or similar.

- [ ] **Step 3: Implement the utility**

Create `lib/utils/calendar-range.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm run test:run -- lib/utils/__tests__/calendar-range.test.ts
```

Expected: All 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/calendar-range.ts lib/utils/__tests__/calendar-range.test.ts
git commit -m "Add getVisibleDateRange utility for calendar fetch range"
```

---

## Task 2: Make `Calendar` a controlled component

**Files:**
- Modify: `components/Calendar.tsx`

The Calendar currently owns `currentDate` (initialized to `new Date()`) and `viewMode`. After this task it owns neither — both come from props, and navigation invokes parent callbacks. There are no behavior tests for `Calendar` in the codebase yet; we rely on the next task's wiring + manual verification to confirm rendering.

- [ ] **Step 1: Update the prop interface**

Edit `components/Calendar.tsx:40-44`. Replace:

```typescript
interface CalendarProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onDateChange?: (date: Date) => void
}

type ViewMode = 'month' | 'week'
```

with:

```typescript
export type ViewMode = 'month' | 'week'

interface CalendarProps {
  events: CalendarEvent[]
  currentDate: Date
  viewMode: ViewMode
  onEventClick?: (event: CalendarEvent) => void
  onDateChange: (date: Date) => void
  onViewModeChange: (mode: ViewMode) => void
}
```

- [ ] **Step 2: Remove internal state and rewire the component signature**

Edit `components/Calendar.tsx:48-55`. Replace:

```typescript
export function Calendar({ events, onEventClick, onDateChange }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }
```

with:

```typescript
export function Calendar({
  events,
  currentDate,
  viewMode,
  onEventClick,
  onDateChange,
  onViewModeChange,
}: CalendarProps) {
```

- [ ] **Step 3: Update navigation handlers to call props**

Edit `components/Calendar.tsx:57-79`. Replace the three navigation functions with:

```typescript
  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setDate(newDate.getDate() - 7)
    }
    onDateChange(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    onDateChange(newDate)
  }

  const navigateToday = () => {
    onDateChange(new Date())
  }
```

- [ ] **Step 4: Update view-mode toggle buttons**

Edit `components/Calendar.tsx:371-385`. Replace the two view-mode buttons with:

```tsx
            <Button
              variant={viewMode === 'week' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('week')}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('month')}
            >
              Month
            </Button>
```

- [ ] **Step 5: Remove the now-unused useState import**

Edit `components/Calendar.tsx:3`. Replace:

```typescript
import { useState } from 'react'
```

with: (delete the line entirely; no React hooks remain after this refactor)

```typescript

```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors point only at `app/(portal)/instructor/schedule/page.tsx` and `app/(portal)/dancer/schedule/page.tsx` — both now miss the new required props. (Those are wired in Tasks 3 and 4.) No other errors.

- [ ] **Step 7: Commit**

```bash
git add components/Calendar.tsx
git commit -m "Make Calendar a controlled component (lift currentDate/viewMode)"
```

---

## Task 3: Lift state in instructor schedule and fix fetch range

**Files:**
- Modify: `app/(portal)/instructor/schedule/page.tsx`

The instructor page becomes the single source of truth for `currentDate` and `calendarMode`, and refetches via a `useEffect` whenever the visible range changes. This eliminates the cross-month bug and removes the duplicate-state confusion that made view-switching reset the visible week.

- [ ] **Step 1: Add the new imports**

Edit `app/(portal)/instructor/schedule/page.tsx:8`. Replace:

```typescript
import { Calendar } from '@/components/Calendar'
```

with:

```typescript
import { Calendar, type ViewMode } from '@/components/Calendar'
import { getVisibleDateRange } from '@/lib/utils/calendar-range'
```

- [ ] **Step 2: Add the `calendarMode` state and remove the obsolete duplicate**

Edit `app/(portal)/instructor/schedule/page.tsx:62-66`. Replace:

```typescript
  const [currentDate, setCurrentDate] = useState(new Date())
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([])
  const [studentsForNotes, setStudentsForNotes] = useState<StudentForNotes[]>([])
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [viewType, setViewType] = useState<ViewType>('month')
```

with:

```typescript
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarMode, setCalendarMode] = useState<ViewMode>('week')
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([])
  const [studentsForNotes, setStudentsForNotes] = useState<StudentForNotes[]>([])
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [viewType, setViewType] = useState<ViewType>('month')
```

- [ ] **Step 3: Replace `handleDateChange` and the initial-fetch effect with a single range-driven effect**

Edit `app/(portal)/instructor/schedule/page.tsx:102-117`. Replace both effects:

```typescript
  useEffect(() => {
    // Load initial data for the current month
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

    fetchSchedule(startOfMonth, endOfMonth)
  }, [])

  const handleDateChange = (date: Date) => {
    // Load data for the month containing the selected date
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

    fetchSchedule(startOfMonth, endOfMonth)
  }
```

with:

```typescript
  useEffect(() => {
    // Calendar grid uses the configured week/month mode; the list view
    // navigates day-by-day so we fetch the month containing currentDate.
    const fetchMode: ViewMode = viewType === 'month' ? calendarMode : 'month'
    const { start, end } = getVisibleDateRange(currentDate, fetchMode)
    fetchSchedule(start, end)
  }, [currentDate, calendarMode, viewType])

  const handleDateChange = (date: Date) => {
    setCurrentDate(date)
  }
```

- [ ] **Step 4: Update `handleMobileMonthChange` to use the lifted state**

Edit `app/(portal)/instructor/schedule/page.tsx:225-228`. Replace:

```typescript
  const handleMobileMonthChange = (date: Date) => {
    setCurrentDate(date)
    handleDateChange(date)
  }
```

with:

```typescript
  const handleMobileMonthChange = (date: Date) => {
    setCurrentDate(date)
  }
```

- [ ] **Step 5: Simplify `navigateDay` and `goToToday` (single source of truth)**

Edit `app/(portal)/instructor/schedule/page.tsx:266-283`. Replace:

```typescript
  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)

    // Fetch data for new month if we crossed a month boundary
    if (newDate.getMonth() !== currentDate.getMonth()) {
      handleDateChange(newDate)
    }
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    if (today.getMonth() !== currentDate.getMonth()) {
      handleDateChange(today)
    }
  }
```

with:

```typescript
  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }
```

- [ ] **Step 6: Wire the new props to the desktop `Calendar`**

Edit `app/(portal)/instructor/schedule/page.tsx:496-505`. Replace:

```tsx
            {viewType === 'month' && (
              <div className="hidden md:block pb-8">
                <Calendar
                  events={classes}
                  onEventClick={handleEventClick}
                  onDateChange={handleDateChange}
                />
              </div>
            )}
```

with:

```tsx
            {viewType === 'month' && (
              <div className="hidden md:block pb-8">
                <Calendar
                  events={classes}
                  currentDate={currentDate}
                  viewMode={calendarMode}
                  onEventClick={handleEventClick}
                  onDateChange={handleDateChange}
                  onViewModeChange={setCalendarMode}
                />
              </div>
            )}
```

- [ ] **Step 7: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: TypeScript errors only on the dancer schedule page (still missing the new Calendar props) — that's wired in Task 4. No lint errors on the instructor page.

- [ ] **Step 8: Commit**

```bash
git add app/\(portal\)/instructor/schedule/page.tsx
git commit -m "Lift Calendar state to instructor schedule, fetch by visible range"
```

---

## Task 4: Wire new props in dancer schedule page

**Files:**
- Modify: `app/(portal)/dancer/schedule/page.tsx`

The dancer page does not have the cross-month bug because `/api/dancer/classes` returns all enrolled classes with no date filter. We still need to give `Calendar` its new required props, and lifting `viewMode` here mirrors the instructor pattern so future contributors don't trip on a divergent API.

- [ ] **Step 1: Update the import**

Edit `app/(portal)/dancer/schedule/page.tsx:7`. Replace:

```typescript
import { Calendar } from '@/components/Calendar'
```

with:

```typescript
import { Calendar, type ViewMode } from '@/components/Calendar'
```

- [ ] **Step 2: Add `calendarMode` state**

Edit `app/(portal)/dancer/schedule/page.tsx:87`. Replace:

```typescript
  const [currentDate, setCurrentDate] = useState(new Date())
```

with:

```typescript
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarMode, setCalendarMode] = useState<ViewMode>('week')
```

- [ ] **Step 3: Simplify `handleDateChange` (it can just set state now)**

Edit `app/(portal)/dancer/schedule/page.tsx:164-167`. Replace:

```typescript
  const handleDateChange = (date: Date) => {
    setCurrentDate(date)
    // Data is already loaded - no need to refetch for dancers since we get all classes
  }
```

with:

```typescript
  const handleDateChange = (date: Date) => {
    // Dancer endpoint returns all enrolled classes, so no refetch is needed.
    setCurrentDate(date)
  }
```

- [ ] **Step 4: Wire the new props to the desktop `Calendar`**

Edit `app/(portal)/dancer/schedule/page.tsx:341-348`. Replace:

```tsx
            <div className="hidden md:flex md:flex-col flex-1 overflow-hidden">
              <Calendar
                events={events}
                onEventClick={handleEventClick}
                onDateChange={handleDateChange}
              />
            </div>
```

with:

```tsx
            <div className="hidden md:flex md:flex-col flex-1 overflow-hidden">
              <Calendar
                events={events}
                currentDate={currentDate}
                viewMode={calendarMode}
                onEventClick={handleEventClick}
                onDateChange={handleDateChange}
                onViewModeChange={setCalendarMode}
              />
            </div>
```

- [ ] **Step 5: Type-check, lint, and run all tests**

```bash
npx tsc --noEmit
npm run lint
npm run test:run
```

Expected: zero TypeScript errors, zero lint errors, all tests pass (including the 8 new `getVisibleDateRange` tests).

- [ ] **Step 6: Commit**

```bash
git add app/\(portal\)/dancer/schedule/page.tsx
git commit -m "Wire dancer schedule Calendar to lifted-state API"
```

---

## Task 5: Manual verification

**Files:** none (browser-only)

This task confirms the original bug is fixed and that no regressions were introduced. The cross-month boundary is the smoking gun; we also test view-switch behavior because the lifted state changes it intentionally.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Wait for `Ready in <ms> on http://0.0.0.0:5000`.

- [ ] **Step 2: Verify cross-month week (the original bug)**

1. Sign in as an instructor with at least one class on the last 1–2 days of one month and at least one on the first 1–2 days of the next month (or seed test data — see CLAUDE.md for migration paths).
2. Open `/instructor/schedule`. Confirm `viewType` is "Calendar" (the default) and `calendarMode` is "Week".
3. Use the prev/next arrows to land on a week that spans both months (e.g. May 31 → Jun 6 in 2026).
4. **Expected:** Events from BOTH months appear in their correct day columns. No flickering after navigation completes.
5. **Failure mode to watch for:** events on one side of the boundary are blank.

- [ ] **Step 3: Verify view-switching no longer "resets" the week**

1. Still on `/instructor/schedule`, navigate Calendar to a non-current week (e.g. May 17–23).
2. Click "List" in the page header. The list view should show the day from your current `currentDate` (now in that week, not today).
3. Click "Calendar" again.
4. **Expected:** Calendar still shows the week you navigated to (May 17–23), not today's week.

- [ ] **Step 4: Verify week ↔ month toggle inside Calendar still works**

1. From any week view, click the "Month" button inside the Calendar header.
2. **Expected:** Calendar switches to month view of `currentDate`'s month, with all that month's events present.
3. Click "Week" again. **Expected:** returns to the week-view containing `currentDate`.

- [ ] **Step 5: Verify the dancer page still renders the calendar**

1. Sign in as a dancer (or use admin to access the dancer portal).
2. Open `/dancer/schedule`. Confirm events appear for current week.
3. Click prev/next a few times, including across a month boundary.
4. **Expected:** All enrolled events show throughout — no fetch happens (open Network tab to confirm), but the calendar grid renders correctly because all events are loaded up front.

- [ ] **Step 6: Verify the mobile calendar still works**

1. Resize the browser to <768px (or open device emulation).
2. Open `/instructor/schedule`. The `MobileCalendar` should render.
3. Tap forward/back month arrows. Confirm events show; no console errors.

- [ ] **Step 7: Final tests + commit (if anything was tweaked during verification)**

```bash
npm run test:run
```

If verification surfaced no code changes, no commit is needed. Otherwise commit each fix as its own commit.

---

## Self-Review

**Spec coverage:**
- Cross-month bug fix → Task 1 (utility) + Task 3 (use it in fetch effect). ✓
- Lift `currentDate` to single source of truth → Task 2 (Calendar controlled) + Task 3 (parent owns). ✓
- View-switch reset behavior fixed → consequence of Task 3 (no remount-driven state). Verified in Task 5 Step 3. ✓
- Dancer page consistency → Task 4. ✓
- Tests for the bug → Task 1 covers the cross-month case directly. ✓

**Placeholder scan:** no TBDs, no "implement later", every code step has actual code. ✓

**Type consistency:**
- `ViewMode` exported from `Calendar.tsx` (Task 2) and imported in both schedule pages (Tasks 3, 4). ✓
- `getVisibleDateRange` signature `(date: Date, mode: 'week' | 'month') => { start, end }` consistent across Task 1 (definition) and Task 3 (use). ✓
- The page-level `viewType` ('day' | 'month') is intentionally distinct from Calendar's `viewMode` ('week' | 'month'); not renamed to keep scope tight. ✓

**Out of scope (intentional):**
- Renaming the parent's `viewType: 'day' | 'month'` (which is really list/calendar) to a clearer name. Left for a follow-up cleanup commit.
- Refactoring `MobileCalendar` to drop its internal `selectedDate`. Already takes `currentDate` as a prop and works correctly with lifted state. Internal state is purely UX (which day is highlighted) — orthogonal to this fix.
