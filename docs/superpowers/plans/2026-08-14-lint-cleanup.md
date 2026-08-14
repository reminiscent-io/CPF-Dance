# Lint Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear all 42 ESLint problems (24 errors, 18 warnings) and add a blocking CI lint check so they cannot return.

**Architecture:** The 24 errors are all `react-hooks/set-state-in-effect` but fall into six patterns with different fixes and risk. Tasks are ordered lowest-risk first, so the pattern for component testing is established on a provably-equivalent refactor before the behavioural ones. The repo has no component tests today, so each behavioural task writes characterization tests *first* — capturing what the code does now, then refactoring until those tests still pass. The CI gate lands last, once the tree is clean.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Vitest + jsdom, @testing-library/react 16.3, @testing-library/user-event 14.6, GitHub Actions

**Spec:** None. This plan is driven by ESLint output captured on `main` at commit `9e6228e`; the authoritative list is reproduced in "Problem Inventory" below.

## Global Constraints

- **`npm run build` does not typecheck.** `next.config.ts:26` sets `typescript: { ignoreBuildErrors: true }`. A green build proves nothing about types. Every task verifies with `npx tsc --noEmit` as well.
- **Two pre-existing `tsc` errors** live in `tests/__mocks__/api-helpers.ts:267` and `tests/setup.ts:69`. They are out of scope. `tsc --noEmit` must not gain *new* errors beyond these two.
- **No component tests exist yet.** All 318 current tests are pure-function tests under `lib/utils/__tests__/`. `@testing-library/react`, `@testing-library/user-event` and `jsdom` are already installed and `tests/setup.ts` already imports `@testing-library/jest-dom/vitest`.
- **Never suppress a rule without a reason.** Any `eslint-disable` line must carry a comment saying why the rule is wrong *here*. A disable with no justification is a plan failure.
- **Do not change behaviour silently.** Where a fix alters what the user sees (noted per task), say so in the commit message.
- **Commands:** `npm run test:run`, `npx vitest run <path>`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Dev server is port 3434.
- **Baseline to beat:** 42 problems (24 errors, 18 warnings). Every task reduces this and none may increase it.

## Problem Inventory

All 24 errors are `react-hooks/set-state-in-effect`. Captured via `npx eslint . --format json`.

| Task | Pattern | Sites |
|---|---|---|
| 2 | Derived state that shouldn't be state | `admin/users:97` |
| 3 | Mount / hydration flags | `app/page.tsx:266`, `app/page.tsx:270`, `StudioCarousel:19`, `app/dev/page.tsx:18` |
| 4 | Browser subscription | `app/page.tsx:254`, `PortalLayout:32`, `Sidebar:60` |
| 5 | Async fetch in effect | `admin/studio-inquiries:256`, `dancer/schedule:195`, `instructor/schedule:147`, `ReviewModal:77` |
| 6 | Form reset on identity change | `NoteDetailModal:50`, `ClassEditSheet:113`, `NoteFocusMode:85`, `ReviewModal:87`, `DropdownMenu:133` |
| 7 | URL param opens a modal | `dancer/notes:60`, `instructor/notes:107`, `instructor/classes:356`, `instructor/classes:370`, `dancer/request-lesson:141` |
| 8 | Calendar date sync + clock interval | `MobileCalendar:81`, `MobileCalendar:93` |

The 18 warnings: 15 × `@next/next/no-img-element` (Task 9), 2 × `react-hooks/exhaustive-deps` (Tasks 5 and 8, incidentally), 1 × `@next/next/no-location-assign-relative-destination` (Task 7).

---

## File Structure

| File | Responsibility |
|---|---|
| `tests/utils.tsx` | **Existing.** Shared render helper. Task 1 extends it if needed. |
| `lib/hooks/useSidebarOpen.ts` | **New.** `useSyncExternalStore`-backed sidebar open state, shared by `Sidebar` and `PortalLayout`, which currently duplicate the same localStorage + breakpoint logic. |
| `lib/hooks/usePrefersReducedMotion.ts` | **New.** `useSyncExternalStore` over `matchMedia`. |
| `lib/hooks/useAsyncData.ts` | **New.** One fetch-into-state primitive holding the single justified disable for the async-fetch pattern. |
| `next.config.ts` | Adds `images.remotePatterns` — a hard prerequisite for Task 9. |
| `.github/workflows/lint.yml` | **New.** Blocking lint check. No workflows directory exists today. |
| 19 component/page files | Individual fixes per the inventory. |

---

### Task 1: Component test harness

Establishes the pattern every later task depends on. Nothing is refactored here — this task only proves a component can be rendered and asserted against.

**Files:**
- Read: `tests/utils.tsx`, `tests/setup.ts`
- Create: `components/ui/__tests__/Badge.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: a working example of rendering a component under Vitest + jsdom that later tasks copy.

- [ ] **Step 1: Know what the helper already gives you**

`tests/utils.tsx` re-exports everything from `@testing-library/react` and **overrides `render`** with a wrapper that returns `user: userEvent.setup()` alongside the usual result. Its provider wrapper is currently a passthrough fragment.

So every test in this plan should import from `@/tests/utils`, not `@testing-library/react` — that way a user-event handle comes for free and any provider added later applies everywhere:

```tsx
import { render, screen } from '@/tests/utils'
```

The test files in this plan are written against `@testing-library/react` for explicitness. Switching them to `@/tests/utils` is equivalent and preferred; do it consistently or not at all.

- [ ] **Step 2: Write a smoke test against a trivial existing component**

`Badge` is chosen because it is presentational, takes no context and no props beyond `className`/children — if this fails, the harness is broken rather than the component.

Create `components/ui/__tests__/Badge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'

describe('test harness', () => {
  it('renders a component and queries it', () => {
    render(<Badge className="bg-champagne-100">Private Lesson</Badge>)
    expect(screen.getByText('Private Lesson')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run it**

Run: `npx vitest run components/ui/__tests__/Badge.test.tsx`
Expected: PASS, 1 test.

If it fails on JSX, confirm `vitest.config.ts` has the `react()` plugin (it does, line 2) and that the file extension is `.tsx`, not `.ts`.

- [ ] **Step 4: Confirm the baseline is unchanged**

Run: `npm run lint 2>&1 | grep "✖"`
Expected: `✖ 42 problems (24 errors, 18 warnings)` — this task fixes nothing yet.

- [ ] **Step 5: Commit**

```bash
git add components/ui/__tests__/Badge.test.tsx
git commit -m "Add a component test harness smoke test

The repo has @testing-library/react installed but no component tests —
all 318 existing tests are pure-function tests. The lint cleanup refactors
hydration, modal and fetch behaviour across 19 files, so it needs a way to
characterize behaviour before changing it. This proves the harness works."
```

---

### Task 2: Delete derived state in the admin users list

`admin/users:97` keeps `filteredUsers` in state and recomputes it in an effect from `users`, `searchTerm` and `roleFilter`. It is a pure function of those three — it should not be state at all. Provably equivalent, so it goes first.

**Files:**
- Modify: `app/(portal)/admin/users/page.tsx:83-99`
- Test: `app/(portal)/admin/__tests__/user-filter.test.ts`

**Interfaces:**
- Consumes: the harness from Task 1.
- Produces: `filterUsers(users, searchTerm, roleFilter)` exported from `app/(portal)/admin/users/page.tsx`, or from a colocated module if the page does not already export helpers.

- [ ] **Step 1: Extract the filter as a pure function and test it first**

Create `lib/utils/filter-users.ts`:

```ts
export interface FilterableUser {
  role: string
  full_name: string
  email: string
}

export function filterUsers<T extends FilterableUser>(
  users: T[],
  searchTerm: string,
  roleFilter: string
): T[] {
  let filtered = users

  if (roleFilter !== 'all') {
    filtered = filtered.filter(u => u.role === roleFilter)
  }

  if (searchTerm) {
    const needle = searchTerm.toLowerCase()
    filtered = filtered.filter(u =>
      u.full_name.toLowerCase().includes(needle) ||
      u.email.toLowerCase().includes(needle)
    )
  }

  return filtered
}
```

Create `lib/utils/__tests__/filter-users.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { filterUsers, type FilterableUser } from '@/lib/utils/filter-users'

const users: FilterableUser[] = [
  { role: 'instructor', full_name: 'Courtney Fenwick', email: 'courtney@cpfdance.com' },
  { role: 'dancer', full_name: 'Ella Ross', email: 'ella@example.com' },
  { role: 'dancer', full_name: 'Maya Torres', email: 'maya@example.com' },
  { role: 'admin', full_name: 'Sam Whitfield', email: 'sam@example.com' },
]

describe('filterUsers', () => {
  it('returns everyone when the role filter is "all" and there is no search', () => {
    expect(filterUsers(users, '', 'all')).toHaveLength(4)
  })

  it('narrows by role', () => {
    expect(filterUsers(users, '', 'dancer').map(u => u.full_name))
      .toEqual(['Ella Ross', 'Maya Torres'])
  })

  it('matches a search against name or email, case-insensitively', () => {
    expect(filterUsers(users, 'ELLA', 'all').map(u => u.full_name)).toEqual(['Ella Ross'])
    expect(filterUsers(users, 'cpfdance', 'all').map(u => u.full_name)).toEqual(['Courtney Fenwick'])
  })

  it('applies role and search together', () => {
    expect(filterUsers(users, 'ross', 'dancer').map(u => u.full_name)).toEqual(['Ella Ross'])
    expect(filterUsers(users, 'ross', 'admin')).toEqual([])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterUsers(users, 'nobody', 'all')).toEqual([])
  })

  it('does not mutate the input', () => {
    const copy = [...users]
    filterUsers(users, 'ella', 'dancer')
    expect(users).toEqual(copy)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/utils/__tests__/filter-users.test.ts`
Expected: FAIL — cannot resolve `@/lib/utils/filter-users`. Then create the module from Step 1 and re-run.

Run: `npx vitest run lib/utils/__tests__/filter-users.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 3: Delete the state and the effect**

In `app/(portal)/admin/users/page.tsx`, remove the `filteredUsers` state declaration and delete this entire effect (lines 83-99):

```tsx
  useEffect(() => {
    let filtered = users

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, roleFilter])
```

Replace with a derivation during render, placed after the state declarations:

```tsx
  const filteredUsers = useMemo(
    () => filterUsers(users, searchTerm, roleFilter),
    [users, searchTerm, roleFilter]
  )
```

Add the imports:

```ts
import { filterUsers } from '@/lib/utils/filter-users'
```

and add `useMemo` to the existing `react` import. Remove `useState` from the import only if nothing else in the file uses it — check first with `grep -c useState "app/(portal)/admin/users/page.tsx"`.

- [ ] **Step 4: Verify**

Run: `npm run lint 2>&1 | grep -c "admin/users"`
Expected: `0`.

Run: `npm run test:run && npx tsc --noEmit 2>&1 | grep -v "tests/__mocks__/api-helpers\|tests/setup.ts" | grep "error TS"`
Expected: tests PASS; no `error TS` lines beyond the two known ones.

Run: `npm run lint 2>&1 | grep "✖"`
Expected: `✖ 41 problems (23 errors, 18 warnings)`.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/filter-users.ts lib/utils/__tests__/filter-users.test.ts "app/(portal)/admin/users/page.tsx"
git commit -m "Derive the admin user filter instead of storing it

filteredUsers was state recomputed in an effect from users, searchTerm and
roleFilter. It is a pure function of those three, so it is now computed
during render. Extracted as filterUsers() with unit tests.

Clears react-hooks/set-state-in-effect at admin/users:97."
```

---

### Task 3: Remove mount and hydration flags

Four sites set a boolean on mount purely to gate rendering. Each is removable, but for different reasons — do not batch them blindly.

**Files:**
- Modify: `app/dev/page.tsx:10-27`, `app/page.tsx:265-272`, `components/StudioCarousel.tsx:14-25`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: `app/dev/page.tsx` — derive from a build-time constant**

`process.env.NODE_ENV` is inlined at build time, so `allowed` never changes and needs no state. Replace lines 10-19:

```tsx
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    // SECURITY: Only allow dev page in development mode
    if (process.env.NODE_ENV !== 'development') {
      router.replace('/login')
      return
    }
    setAllowed(true)
  }, [router])
```

with:

```tsx
  const router = useRouter()
  // SECURITY: only the dev build serves this page. NODE_ENV is inlined at
  // build time, so this is a constant — not state.
  const allowed = process.env.NODE_ENV === 'development'

  useEffect(() => {
    if (!allowed) {
      router.replace('/login')
    }
  }, [allowed, router])
```

Remove `useState` from the import if unused elsewhere in the file.

- [ ] **Step 2: `app/page.tsx:266` — delete `showNav` entirely**

The effect is `setShowNav(true)` with `[]` deps and the comment "Show nav immediately for faster perceived load". It transitions false→true on the first commit, which only causes a wasted render.

Find every use of `showNav` in `app/page.tsx`:

Run: `grep -n "showNav" app/page.tsx`

Delete the `showNav` state, delete the effect, and replace each `showNav &&` guard or `showNav ? x : y` with the truthy branch. If `showNav` feeds an animation prop (e.g. framer-motion `animate={showNav ? ... : ...}`), replace it with the target value — the component already animates from its `initial` prop on mount.

**This changes behaviour:** the nav renders on the server pass instead of appearing on the client's first commit. That is the stated intent of the comment. Verify the nav still animates in rather than appearing abruptly.

- [ ] **Step 3: `app/page.tsx:270` — assess `isMounted`**

Run: `grep -n "isMounted" app/page.tsx`

If `isMounted` guards something that genuinely differs between server and client (a `window` read, a random value, a date), it is a real hydration guard and must **not** be deleted — convert it with `useSyncExternalStore` in Task 4 instead and leave it here.

If it only gates an animation or a client-only visual, delete it the same way as `showNav` in Step 2.

Record which of the two applied in the commit message.

- [ ] **Step 4: `components/StudioCarousel.tsx` — fold `mounted` into the fetch effect**

The `mounted` flag exists only so the second effect can skip its first run. Replace lines 14-25:

```tsx
  const [mounted, setMounted] = useState(false)
  ...
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchLogos = async () => {
```

with a single effect — delete the `mounted` state and its effect, and drop the guard:

```tsx
  useEffect(() => {
    const fetchLogos = async () => {
```

Update that effect's dependency array to remove `mounted`. Effects only run on the client, so the guard was always a no-op after the first commit.

Check whether `mounted` is used anywhere else first:

Run: `grep -n "mounted" components/StudioCarousel.tsx`

If it also gates rendering (e.g. `{mounted && <div>}`), keep that behaviour by gating on `loading` or `studios.length` instead — the carousel already has both.

- [ ] **Step 5: Verify**

Run: `npm run test:run && npm run lint 2>&1 | grep "✖"`
Expected: tests PASS; `✖ 37 problems (19 errors, 18 warnings)`.

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "tests/"`
Expected: no output.

- [ ] **Step 6: Verify the landing page still looks right**

Run `npm run dev` and open `http://localhost:3434/`. The nav, hero and studio carousel must all appear and animate as before. This is the only check for the animation changes in Steps 2-3 — there are no visual regression tests.

- [ ] **Step 7: Commit**

```bash
git add app/dev/page.tsx app/page.tsx components/StudioCarousel.tsx
git commit -m "Remove mount flags that only gated the first render

dev/page derives from NODE_ENV, which is inlined at build time and was
never state. The landing page and studio carousel set a boolean on mount
purely to skip their own first commit.

Clears react-hooks/set-state-in-effect at dev/page:18, page:266, page:270
and StudioCarousel:19."
```

---

### Task 4: Browser subscriptions via useSyncExternalStore

Three sites read browser-only values in an effect. `Sidebar:60` and `PortalLayout:32` are near-duplicates of the same localStorage-plus-breakpoint logic, so they collapse into one hook.

**Files:**
- Create: `lib/hooks/usePrefersReducedMotion.ts`, `lib/hooks/useSidebarOpen.ts`
- Test: `lib/hooks/__tests__/useSidebarOpen.test.tsx`
- Modify: `app/page.tsx:253-267`, `components/PortalLayout.tsx:17-43`, `components/Sidebar.tsx:36-68`

**Interfaces:**
- Consumes: the harness from Task 1.
- Produces:
  - `usePrefersReducedMotion(): boolean`
  - `useSidebarOpen(): readonly [boolean, (open: boolean) => void]`

- [ ] **Step 1: Write the failing test for the sidebar store**

Create `lib/hooks/__tests__/useSidebarOpen.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useSidebarOpen, __resetSidebarStore } from '@/lib/hooks/useSidebarOpen'

function Probe() {
  const [isOpen, setOpen] = useSidebarOpen()
  return (
    <div>
      <span data-testid="state">{isOpen ? 'open' : 'closed'}</span>
      <button onClick={() => setOpen(!isOpen)}>toggle</button>
    </div>
  )
}

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true })
}

beforeEach(() => {
  localStorage.clear()
  __resetSidebarStore()
})

afterEach(() => {
  localStorage.clear()
  __resetSidebarStore()
})

describe('useSidebarOpen', () => {
  it('defaults to open on desktop when nothing is saved', () => {
    setViewport(1280)
    render(<Probe />)
    expect(screen.getByTestId('state')).toHaveTextContent('open')
  })

  it('defaults to closed on mobile when nothing is saved', () => {
    setViewport(500)
    render(<Probe />)
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
  })

  it('prefers a saved preference over the breakpoint default', () => {
    setViewport(1280)
    localStorage.setItem('sidebar-open', 'false')
    render(<Probe />)
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
  })

  it('persists a change to localStorage', () => {
    setViewport(1280)
    render(<Probe />)
    act(() => { screen.getByText('toggle').click() })
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
    expect(localStorage.getItem('sidebar-open')).toBe('false')
  })

  it('keeps two mounted consumers in sync', () => {
    setViewport(1280)
    render(<><Probe /><Probe /></>)
    const states = screen.getAllByTestId('state')
    act(() => { screen.getAllByText('toggle')[0].click() })
    expect(states[0]).toHaveTextContent('closed')
    expect(states[1]).toHaveTextContent('closed')
  })

  it('survives corrupt JSON in localStorage', () => {
    setViewport(1280)
    localStorage.setItem('sidebar-open', 'not json')
    expect(() => render(<Probe />)).not.toThrow()
    expect(screen.getByTestId('state')).toHaveTextContent('open')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/hooks/__tests__/useSidebarOpen.test.tsx`
Expected: FAIL — cannot resolve `@/lib/hooks/useSidebarOpen`.

- [ ] **Step 3: Write the sidebar store**

Create `lib/hooks/useSidebarOpen.ts`:

```ts
'use client'

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'sidebar-open'
const MOBILE_BREAKPOINT = 768

// Module-level cache so getSnapshot is cheap and returns a stable value.
// useSyncExternalStore re-reads it on every render and will loop forever if
// the value is recomputed into a new reference each time.
let cached: boolean | null = null
const listeners = new Set<() => void>()

function read(): boolean {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved !== null) {
    try {
      return Boolean(JSON.parse(saved))
    } catch {
      // Corrupt value — fall through to the breakpoint default.
    }
  }
  return window.innerWidth >= MOBILE_BREAKPOINT
}

function getSnapshot(): boolean {
  if (cached === null) cached = read()
  return cached
}

// The server has no viewport and no localStorage. Rendering closed matches
// the mobile-first default and lets React hydrate without a mismatch.
function getServerSnapshot(): boolean {
  return false
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cached = null
      listeners.forEach(l => l())
    }
  }
  window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function setSidebarOpen(open: boolean): void {
  cached = open
  localStorage.setItem(STORAGE_KEY, JSON.stringify(open))
  listeners.forEach(l => l())
}

export function useSidebarOpen(): readonly [boolean, (open: boolean) => void] {
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setOpen = useCallback((next: boolean) => setSidebarOpen(next), [])
  return [isOpen, setOpen] as const
}

/** Test-only: clears the module cache between cases. */
export function __resetSidebarStore(): void {
  cached = null
  listeners.clear()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/hooks/__tests__/useSidebarOpen.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Adopt the hook in PortalLayout**

In `components/PortalLayout.tsx`, delete the `isOpen`/`mounted` state, both effects (lines 25-43), and the `if (!mounted)` skeleton branch. Replace with:

```tsx
  const [isOpen, setIsOpen] = useSidebarOpen()
```

and import it:

```ts
import { useSidebarOpen } from '@/lib/hooks/useSidebarOpen'
```

`handleToggleSidebar` becomes:

```tsx
  const handleToggleSidebar = () => {
    setIsOpen(!isOpen)
  }
```

**This changes behaviour.** The `!mounted` branch currently renders a placeholder shell on the first client commit. With `getServerSnapshot` returning `false`, the server and first client render both produce a closed sidebar, then it opens on desktop after hydration. That removes a layout flash but means no skeleton. Confirm in the browser (Step 8) that the portal does not visibly jump.

- [ ] **Step 6: Adopt the hook in Sidebar**

`Sidebar` supports a controlled mode (`controlledIsOpen`) and an uncontrolled mode. Only the uncontrolled path reads localStorage. Replace lines 36-68:

```tsx
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
```

and both effects, with:

```tsx
  const [storedIsOpen, setStoredIsOpen] = useSidebarOpen()
```

then update the controlled/uncontrolled resolution:

```tsx
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : storedIsOpen
  const setIsOpen = controlledSetIsOpen || setStoredIsOpen
```

Delete the `mounted` state and the persistence effect — `setSidebarOpen` writes to localStorage itself. Check for other uses first:

Run: `grep -n "mounted" components/Sidebar.tsx`

If `mounted` gates rendering, remove that gate; the hook's server snapshot handles hydration.

- [ ] **Step 7: Write the reduced-motion hook and adopt it**

Create `lib/hooks/usePrefersReducedMotion.ts`:

```ts
'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

// Assume motion is allowed on the server; the client corrects on hydration.
function getServerSnapshot(): boolean {
  return false
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
```

In `app/page.tsx`, delete the `prefersReducedMotion` state and its effect (lines 253-267), and replace with:

```tsx
  const prefersReducedMotion = usePrefersReducedMotion()
```

plus the import:

```ts
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'
```

`tests/setup.ts:31-44` already mocks `window.matchMedia` with `matches: false` plus both `addEventListener` and `removeEventListener` as `vi.fn()` — verified, so `usePrefersReducedMotion` works under test with no setup change. Any test asserting the reduced-motion branch must override `matches` for that case.

- [ ] **Step 8: Verify**

Run: `npm run test:run && npm run lint 2>&1 | grep "✖"`
Expected: tests PASS; `✖ 34 problems (16 errors, 18 warnings)`.

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "tests/"`
Expected: no output.

Then `npm run dev` and check on `http://localhost:3434`:
- The landing page respects your OS reduced-motion setting.
- `/instructor/schedule` on a desktop width opens with the sidebar expanded; collapse it, reload, and it stays collapsed.
- Narrow the window below 768px and reload with no saved preference — the sidebar starts closed.
- The portal does not visibly flash a placeholder shell on load.

- [ ] **Step 9: Commit**

```bash
git add lib/hooks/useSidebarOpen.ts lib/hooks/usePrefersReducedMotion.ts lib/hooks/__tests__/useSidebarOpen.test.tsx components/PortalLayout.tsx components/Sidebar.tsx app/page.tsx
git commit -m "Read browser state through useSyncExternalStore

Sidebar and PortalLayout each carried their own copy of the same
localStorage-plus-breakpoint logic, initialised in an effect behind a
mounted flag. Both now share useSidebarOpen(), which gives React a server
snapshot so hydration is correct without the flag. The landing page's
reduced-motion listener becomes usePrefersReducedMotion().

Behaviour change: PortalLayout no longer renders a placeholder shell
before mounting — server and first client render agree on a closed
sidebar, which then opens on desktop.

Clears react-hooks/set-state-in-effect at page:254, PortalLayout:32 and
Sidebar:60."
```

---

### Task 5: A shared useAsyncData hook

Four sites run an async fetch from an effect. The rule fires on the synchronous `setLoading(true)` that opens each one. Fetching into local state is a legitimate effect, so this consolidates the pattern into one hook carrying one justified disable, rather than scattering four.

**Files:**
- Create: `lib/hooks/useAsyncData.ts`
- Test: `lib/hooks/__tests__/useAsyncData.test.tsx`
- Modify: `app/(portal)/instructor/schedule/page.tsx:140-150`, `app/(portal)/dancer/schedule/page.tsx:190-200`, `app/(portal)/admin/studio-inquiries/page.tsx:250-262`, `components/ReviewModal.tsx:60-85`

**Interfaces:**
- Consumes: the harness from Task 1.
- Produces:
  ```ts
  interface AsyncDataResult<T> {
    data: T | null
    loading: boolean
    error: string | null
    refetch: () => void
  }
  function useAsyncData<T>(
    fetcher: (signal: AbortSignal) => Promise<T>,
    deps: readonly unknown[],
    options?: { enabled?: boolean }
  ): AsyncDataResult<T>
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/hooks/__tests__/useAsyncData.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useAsyncData } from '@/lib/hooks/useAsyncData'

function Probe({ fetcher, enabled = true, token = 'a' }: {
  fetcher: (signal: AbortSignal) => Promise<string>
  enabled?: boolean
  token?: string
}) {
  const { data, loading, error, refetch } = useAsyncData(fetcher, [token], { enabled })
  return (
    <div>
      <span data-testid="loading">{loading ? 'yes' : 'no'}</span>
      <span data-testid="data">{data ?? '-'}</span>
      <span data-testid="error">{error ?? '-'}</span>
      <button onClick={refetch}>refetch</button>
    </div>
  )
}

describe('useAsyncData', () => {
  it('reports loading then resolves with data', async () => {
    render(<Probe fetcher={async () => 'result'} />)
    await waitFor(() => expect(screen.getByTestId('data')).toHaveTextContent('result'))
    expect(screen.getByTestId('loading')).toHaveTextContent('no')
    expect(screen.getByTestId('error')).toHaveTextContent('-')
  })

  it('captures an error message and stops loading', async () => {
    render(<Probe fetcher={async () => { throw new Error('boom') }} />)
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('boom'))
    expect(screen.getByTestId('loading')).toHaveTextContent('no')
  })

  it('does not run while disabled', async () => {
    const fetcher = vi.fn(async () => 'result')
    render(<Probe fetcher={fetcher} enabled={false} />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('no'))
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('re-runs when a dependency changes', async () => {
    const fetcher = vi.fn(async () => 'result')
    const { rerender } = render(<Probe fetcher={fetcher} token="a" />)
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    rerender(<Probe fetcher={fetcher} token="b" />)
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })

  it('re-runs on refetch', async () => {
    const fetcher = vi.fn(async () => 'result')
    render(<Probe fetcher={fetcher} />)
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    act(() => { screen.getByText('refetch').click() })
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })

  it('ignores a resolution that lands after the deps moved on', async () => {
    // A slow response for token "a" must not overwrite token "b"'s data.
    const fetcher = vi.fn((signal: AbortSignal) => new Promise<string>((resolve) => {
      const value = fetcher.mock.calls.length === 1 ? 'stale' : 'fresh'
      const delay = value === 'stale' ? 50 : 0
      setTimeout(() => resolve(value), delay)
    }))
    const { rerender } = render(<Probe fetcher={fetcher} token="a" />)
    rerender(<Probe fetcher={fetcher} token="b" />)
    await waitFor(() => expect(screen.getByTestId('data')).toHaveTextContent('fresh'))
    await new Promise(r => setTimeout(r, 80))
    expect(screen.getByTestId('data')).toHaveTextContent('fresh')
  })

  it('aborts the in-flight request when deps change', async () => {
    const seen: AbortSignal[] = []
    const fetcher = vi.fn(async (signal: AbortSignal) => { seen.push(signal); return 'result' })
    const { rerender } = render(<Probe fetcher={fetcher} token="a" />)
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    rerender(<Probe fetcher={fetcher} token="b" />)
    await waitFor(() => expect(seen[0].aborted).toBe(true))
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/hooks/__tests__/useAsyncData.test.tsx`
Expected: FAIL — cannot resolve `@/lib/hooks/useAsyncData`.

- [ ] **Step 3: Write the hook**

Create `lib/hooks/useAsyncData.ts`:

```ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export interface AsyncDataOptions {
  /** Skip the fetch entirely — e.g. while auth is still resolving. */
  enabled?: boolean
}

/**
 * Fetch-into-local-state, with abort and stale-response handling.
 *
 * This is the one place in the codebase allowed to call setState from an
 * effect. react-hooks/set-state-in-effect exists to catch render loops, where
 * an effect writes state that immediately retriggers itself. A fetch on mount
 * is the opposite: it runs once per dependency change and its result cannot
 * feed back into `deps`. Every call site routes through here so the exception
 * is justified once rather than repeated at each one.
 */
export function useAsyncData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  options: AsyncDataOptions = {}
): AsyncDataResult<T> {
  const { enabled = true } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  // Keep the latest fetcher without making it a dependency — callers routinely
  // pass an inline arrow, which would otherwise re-run this on every render.
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const refetch = useCallback(() => setNonce(n => n + 1), [])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    let active = true

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Opening a
    // fetch, not a render loop: this cannot retrigger its own dependencies.
    setLoading(true)
    setError(null)

    fetcherRef.current(controller.signal)
      .then(result => {
        if (!active) return
        setData(result)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` is the
    // caller's dependency list, spread deliberately; `fetcher` is held in a ref.
  }, [...deps, enabled, nonce])

  return { data, loading, error, refetch }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/hooks/__tests__/useAsyncData.test.tsx`
Expected: PASS, 7 tests.

If the stale-response test is flaky, replace its timing with `vi.useFakeTimers()` and explicit `vi.advanceTimersByTime` calls rather than loosening the assertion.

- [ ] **Step 5: Migrate `instructor/schedule`**

This page already has a hand-rolled `fetchSchedule` in a `useCallback` plus an effect that calls it. Replace the `classes`/`loading`/`error` state and the effect at lines 140-150 with:

```tsx
  const fetchMode: ViewMode = viewType === 'month' ? calendarMode : 'month'
  const { start, end } = getVisibleDateRange(currentDate, fetchMode)
  const canFetch = !authLoading && (profile?.role === 'instructor' || profile?.role === 'admin')

  const { data, loading, error, refetch: refetchSchedule } = useAsyncData<ClassEvent[]>(
    async (signal) => {
      const params = new URLSearchParams()
      params.append('start_date', start.toISOString())
      params.append('end_date', end.toISOString())
      const response = await fetch(`/api/instructor/schedule?${params.toString()}`, { signal })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to fetch schedule')
      return result.data || []
    },
    [start.toISOString(), end.toISOString()],
    { enabled: canFetch }
  )

  const classes = data ?? []
```

Every existing `fetchSchedule(...)` call becomes `refetchSchedule()` — there is one in the `InstructorPrivateLessonCancel` `onCancelled` handler. Update it and drop its now-unused date arguments.

Note the deps are `start.toISOString()` / `end.toISOString()`, not the `Date` objects — a new `Date` instance every render would re-run the fetch forever.

- [ ] **Step 6: Migrate the other three sites**

Apply the same shape to each. For each one: delete the `loading`/`error`/data state, delete the effect, call `useAsyncData` with the fetch body, and map `data ?? fallback` onto the old variable name so the JSX below is untouched.

- `app/(portal)/dancer/schedule/page.tsx:190-200` — gate with `{ enabled: !authLoading && !!user && !!profile }`.
- `app/(portal)/admin/studio-inquiries/page.tsx:250-262` — gate with `{ enabled: Boolean(inquiry.gmail_thread_id) }`. The current `else { setLoading(false) }` branch is what `enabled: false` now does.
- `components/ReviewModal.tsx:60-85` — gate with `{ enabled: isOpen }`. The effect also calls `setSuccess(false)` and `setError('')` on open; those are form resets, not fetching — leave them for Task 6, which handles this component's reset via `key`.

- [ ] **Step 7: Verify**

Run: `npm run test:run && npm run lint 2>&1 | grep "✖"`
Expected: tests PASS; `✖ 30 problems (12 errors, 18 warnings)`.

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "tests/"`
Expected: no output.

- [ ] **Step 8: Verify in the running app**

With `npm run dev`, signed in as the instructor:
- `/instructor/schedule` loads classes; changing month or switching week/month refetches; cancelling a private lesson refreshes the grid.
- `/dancer/schedule` loads for a dancer account.
- `/admin/studio-inquiries` — an inquiry with a Gmail thread loads it; one without shows no spinner.
- A review modal opens, loads existing reviews, and closes cleanly.

Watch the Network tab: switching months quickly must cancel the superseded request rather than racing it.

- [ ] **Step 9: Commit**

```bash
git add lib/hooks/useAsyncData.ts lib/hooks/__tests__/useAsyncData.test.tsx "app/(portal)/instructor/schedule/page.tsx" "app/(portal)/dancer/schedule/page.tsx" "app/(portal)/admin/studio-inquiries/page.tsx" components/ReviewModal.tsx
git commit -m "Route fetch-on-mount through a shared useAsyncData hook

Four pages each hand-rolled the same fetch-into-state effect, none of
which aborted or guarded against a stale response overwriting a newer one.
They now share useAsyncData, which does both and holds the single
justified set-state-in-effect exception for the whole codebase.

Clears the rule at instructor/schedule:147, dancer/schedule:195,
studio-inquiries:256 and ReviewModal:77."
```

---

### Task 6: Reset form state with a key instead of an effect

Five components reset or repopulate local form state when the thing they are editing changes. React's own guidance for this is to remount via `key`, which makes the reset structural rather than a second render pass.

**Files:**
- Modify: `components/NoteDetailModal.tsx:47-53` and its call sites, `components/dancer/ClassEditSheet.tsx:113`, `components/notes/NoteFocusMode.tsx:85`, `components/ReviewModal.tsx:87`, `components/ui/DropdownMenu.tsx:130-136`
- Test: `components/__tests__/NoteDetailModal.reset.test.tsx`

**Interfaces:**
- Consumes: the harness from Task 1.
- Produces: nothing — call sites gain a `key` prop.

- [ ] **Step 1: Find every call site before changing anything**

Run:
```bash
grep -rn "<NoteDetailModal" app components
grep -rn "<ClassEditSheet" app components
grep -rn "<NoteFocusMode" app components
grep -rn "<ReviewModal" app components
```

Record the list. Every call site needs the `key`, and missing one leaves a modal that silently stops resetting.

- [ ] **Step 2: Write a characterization test for NoteDetailModal**

This captures the *current* behaviour, so the refactor is verified rather than assumed.

Create `components/__tests__/NoteDetailModal.reset.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoteDetailModal, type DetailNote } from '@/components/NoteDetailModal'

const noteA: DetailNote = {
  id: 'a', title: 'Fouetté prep', content: '<p>spotting</p>', tags: null,
  visibility: 'shared_with_instructor', created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z', author_id: 'u1', class_id: null,
  personal_class_id: null,
}
const noteB: DetailNote = { ...noteA, id: 'b', title: 'Ankle soreness', content: '<p>watch loading</p>' }

function renderNote(note: DetailNote) {
  return render(
    <NoteDetailModal
      key={note.id}
      note={note}
      isOwn
      onClose={vi.fn()}
      onBack={vi.fn()}
      onSaved={vi.fn()}
    />
  )
}

describe('NoteDetailModal', () => {
  it('shows the note it was given', () => {
    renderNote(noteA)
    expect(screen.getByText('Fouetté prep')).toBeInTheDocument()
  })

  it('shows the new note when a different one is swapped in', () => {
    const { rerender } = renderNote(noteA)
    rerender(
      <NoteDetailModal
        key={noteB.id}
        note={noteB}
        isOwn
        onClose={vi.fn()}
        onBack={vi.fn()}
        onSaved={vi.fn()}
      />
    )
    expect(screen.getByText('Ankle soreness')).toBeInTheDocument()
    expect(screen.queryByText('Fouetté prep')).not.toBeInTheDocument()
  })
})
```

Run: `npx vitest run components/__tests__/NoteDetailModal.reset.test.tsx`
Expected: PASS against the *current* code — the effect handles the swap today. If it fails, the modal needs `isOpen` or a portal mock; adjust the render, do not weaken the assertion.

- [ ] **Step 3: Move NoteDetailModal's reset to the key**

Delete the effect at lines 47-53:

```tsx
  // When the parent swaps in a different note, reset local form state.
  useEffect(() => {
    setTitle(note.title ?? '')
    setContent(note.content)
    setVisibility(note.visibility === 'private' ? 'private' : 'shared_with_instructor')
    setEditMode(false)
  }, [note.id])
```

The `useState` initialisers already read from `note`, so a remount produces the same result. Then add `key={note.id}` at every call site found in Step 1 — including the one added in `app/(portal)/instructor/schedule/page.tsx` by PR #51.

Run the Step 2 test again: `npx vitest run components/__tests__/NoteDetailModal.reset.test.tsx`
Expected: still PASS. The test does not care which mechanism resets the state, only that it resets — which is exactly what a characterization test is for.

- [ ] **Step 4: DropdownMenu — move the reset to the close path**

`components/ui/DropdownMenu.tsx:130-136` resets `focusedIndex` when `isOpen` goes false. Rather than a key, fold it into the state that already changes:

```tsx
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1)
      return
    }
```

becomes:

```tsx
  useEffect(() => {
    if (!isOpen) return
```

and every place that closes the menu also clears the index. Find them:

Run: `grep -n "setIsOpen(false)\|onOpenChange(false)\|close()" components/ui/DropdownMenu.tsx`

Add `setFocusedIndex(-1)` alongside each. If the open state is controlled by a prop rather than owned locally, use `key={String(isOpen)}` on the menu's content element instead so it remounts closed.

- [ ] **Step 5: ClassEditSheet, NoteFocusMode and ReviewModal**

All three reset on open. Apply `key` at their call sites:

- `ClassEditSheet` — `key={editing?.id ?? 'new'}`, and delete the effect at line 113. Its `useState` initialisers must already derive from `editing`; if they default to empty instead, move the derivation into the initialiser before deleting the effect.
- `NoteFocusMode` — `key={note?.id ?? 'new'}`, delete the effect at line 85, move the `note`-derived defaults into the `useState` initialisers.
- `ReviewModal` — `key={selectedInstructorId ?? 'none'}`, delete the populate effect at line 87. This component's *fetch* moved to `useAsyncData` in Task 5; what remains here is only the form population. Because the existing review comes from fetched data rather than a prop, derive it during render instead if the key proves awkward:

```tsx
  const existing = existingReviews.find(r => r.instructor_id === selectedInstructorId)
```

and seed the form from `existing` in the `useState` initialisers, with the key forcing a remount when the instructor changes.

- [ ] **Step 6: Verify**

Run: `npm run test:run && npm run lint 2>&1 | grep "✖"`
Expected: tests PASS; `✖ 25 problems (7 errors, 18 warnings)`.

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "tests/"`
Expected: no output.

- [ ] **Step 7: Verify every modal in the running app**

This task carries the highest regression risk — a missed `key` means a modal shows the previous record's data. Check each:
- Open a note, close it, open a *different* note — the second note's title and content show, not the first's.
- Edit a class in the dancer sheet, close, edit a different class — fields match the second class.
- Open note focus mode on an existing note, close, open it for a new note — the form is empty.
- In the review modal, pick one instructor then another — the rating and text follow the selection.
- Open a dropdown menu, arrow down twice, close it, reopen — focus starts at the top, not where it left off.

- [ ] **Step 8: Commit**

```bash
git add components/NoteDetailModal.tsx components/dancer/ClassEditSheet.tsx components/notes/NoteFocusMode.tsx components/ReviewModal.tsx components/ui/DropdownMenu.tsx components/__tests__/NoteDetailModal.reset.test.tsx app components
git commit -m "Reset modal form state by remounting, not by effect

Five components repopulated local state in an effect when the record they
edit changed, which renders once with stale values before correcting. The
edited record's id is now a key, so the reset is structural.

Clears react-hooks/set-state-in-effect at NoteDetailModal:50,
ClassEditSheet:113, NoteFocusMode:85, ReviewModal:87 and DropdownMenu:133."
```

---

### Task 7: Derive modal state from the URL

Five sites read a query parameter in an effect, open a modal, then strip the parameter with `router.replace`. The open state can be derived from the parameter during render; only the navigation is a genuine side effect.

**Files:**
- Modify: `app/(portal)/dancer/notes/page.tsx:57-68`, `app/(portal)/instructor/notes/page.tsx:104-115`, `app/(portal)/instructor/classes/page.tsx:352-378`, `app/(portal)/dancer/request-lesson/page.tsx:138-155`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: `dancer/notes` and `instructor/notes` — identical shape**

Both read `?create=true`, set a modal-open flag, then clear the param. Replace the effect with a derived initial value plus a one-shot cleanup.

In `app/(portal)/dancer/notes/page.tsx`, replace lines 57-68:

```tsx
  useEffect(() => {
    if (!searchParams) return

    const shouldCreate = searchParams.get('create')
    if (shouldCreate === 'true' && !focusModeOpen) {
      setFocusModeOpen(true)
      // Clear the query parameter after opening
      router.replace('/dancer/notes', { scroll: false })
    }
  }, [searchParams, focusModeOpen, router])
```

with a lazy state initialiser and a separate navigation effect:

```tsx
  const [focusModeOpen, setFocusModeOpen] = useState(
    () => searchParams?.get('create') === 'true'
  )

  // The parameter is a one-shot instruction; strip it so a refresh or a back
  // navigation doesn't reopen the editor.
  useEffect(() => {
    if (searchParams?.get('create') === 'true') {
      router.replace('/dancer/notes', { scroll: false })
    }
  }, [searchParams, router])
```

Move this above the existing `focusModeOpen` declaration and delete the old `useState(false)`.

Apply the identical change to `app/(portal)/instructor/notes/page.tsx:104-115`, using `showAddModal`, `searchParams.get('create')` and `router.replace('/instructor/notes', { scroll: false })`.

- [ ] **Step 2: `instructor/classes` — two effects, one of which depends on loaded data**

Line 370 (`?create=true`) takes the same treatment as Step 1, with `showCreateModal` and `router.replace('/instructor/classes', { scroll: false })`.

Line 356 is different: it reads `?class_id=`, then looks the class up in `classes`, which is fetched asynchronously. It cannot be a lazy initialiser because the data is not there on first render. Derive it during render instead:

```tsx
  const requestedClassId = searchParams?.get('class_id') ?? null
  const requestedClass = requestedClassId
    ? classes.find(c => c.id === requestedClassId) ?? null
    : null

  // Show the requested class once it has loaded, unless the user already
  // opened something else.
  const editingClass = selectedClass ?? requestedClass
  const isEditModalOpen = showEditModal || Boolean(requestedClass)

  useEffect(() => {
    if (requestedClass) {
      router.replace('/instructor/classes', { scroll: false })
    }
  }, [requestedClass, router])
```

Then pass `editingClass` and `isEditModalOpen` to the modal instead of `selectedClass` / `showEditModal`. Read the surrounding JSX before wiring this — if the modal's close handler only calls `setShowEditModal(false)`, it must also clear the derived path, so give the page an explicit `dismissedClassId` state or clear the param synchronously on close.

- [ ] **Step 3: `dancer/request-lesson` — also fixes the location warning**

Lines 138-155 read `window.location.search` directly, which is what triggers `@next/next/no-location-assign-relative-destination`. Replace the manual parsing with the `useSearchParams` hook the other pages use:

```tsx
  const searchParams = useSearchParams()

  useEffect(() => {
    const success = searchParams?.get('success')
    const canceled = searchParams?.get('canceled')

    if (success === 'true') {
      setBanner({ tone: 'gilt', message: 'Pack added. Refreshing your balance…' })
      refetchBalance()
      router.replace('/dancer/request-lesson')
    } else if (canceled === 'true') {
      // preserve the existing canceled branch verbatim
    }
  }, [searchParams, router, refetchBalance])
```

Add `useSearchParams` to the `next/navigation` import. The `setBanner` call remains inside the effect — it is a response to a navigation event, not derivable from render — so it keeps a justified disable:

```tsx
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reacting to
      // a Stripe redirect, which is a navigation event rather than render state.
      setBanner({ tone: 'gilt', message: 'Pack added. Refreshing your balance…' })
```

`refetchBalance` is `useAsyncData`'s `refetch` from Task 5 if that page was migrated; if it still has a hand-rolled `fetchBalance`, leave the call as-is.

- [ ] **Step 4: Verify**

Run: `npm run test:run && npm run lint 2>&1 | grep "✖"`
Expected: tests PASS; `✖ 19 problems (2 errors, 17 warnings)`.

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "tests/"`
Expected: no output.

- [ ] **Step 5: Verify the deep links in the running app**

Each of these is a real entry point, reachable from elsewhere in the product:
- `/dancer/notes?create=true` → focus mode opens, URL becomes `/dancer/notes`, refresh does not reopen it.
- `/instructor/notes?create=true` → add-note modal opens, same cleanup.
- `/instructor/classes?create=true` → create modal opens.
- `/instructor/classes?class_id=<a real class id>` → that class's edit modal opens once the list loads. This is the link the schedule modal's "Open full class page →" uses, so test it from there.
- `/dancer/request-lesson?success=true` → gilt banner appears and the balance refreshes.

- [ ] **Step 6: Commit**

```bash
git add "app/(portal)/dancer/notes/page.tsx" "app/(portal)/instructor/notes/page.tsx" "app/(portal)/instructor/classes/page.tsx" "app/(portal)/dancer/request-lesson/page.tsx"
git commit -m "Derive deep-link modal state from the URL

Five pages opened a modal from a query parameter inside an effect, then
stripped the parameter. The open state is now derived during render and
only the navigation stays in an effect. request-lesson also moves off
window.location.search onto useSearchParams.

Clears set-state-in-effect at dancer/notes:60, instructor/notes:107,
classes:356, classes:370 and request-lesson:141, plus the
no-location-assign-relative-destination warning."
```

---

### Task 8: MobileCalendar date sync and clock

Two remaining errors, both in `components/MobileCalendar.tsx`.

**Files:**
- Modify: `components/MobileCalendar.tsx:70-100`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Line 81 — reset the selected date via a derived value**

The effect resets `selectedDate` when the visible month changes. Read lines 70-90 first, then replace the effect with a render-time derivation that compares the month of `selectedDate` against `currentDate`:

```tsx
  const visibleMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
  const selectedMonthKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}`

  // When the visible month changes, the selection follows it: today if the
  // month contains today, otherwise the first of that month.
  const effectiveSelectedDate = visibleMonthKey === selectedMonthKey
    ? selectedDate
    : defaultDateForMonth(currentDate)
```

with a module-level helper beside the other pure helpers in the file:

```ts
function defaultDateForMonth(month: Date): Date {
  const today = new Date()
  const isCurrentMonth =
    today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth()
  return isCurrentMonth ? today : new Date(month.getFullYear(), month.getMonth(), 1)
}
```

Replace every read of `selectedDate` below this point with `effectiveSelectedDate`, leaving `setSelectedDate` for genuine user taps. Find them:

Run: `grep -n "selectedDate" components/MobileCalendar.tsx`

- [ ] **Step 2: Line 93 — start the clock without a synchronous setState**

The effect sets `currentTime` immediately, then every 60s. The immediate call is what the rule flags. Seed the state from a lazy initialiser instead and let the interval do the rest:

```tsx
  const [currentTime, setCurrentTime] = useState(() => new Date())
```

then drop the leading `setCurrentTime(new Date())` from the effect:

```tsx
  useEffect(() => {
    if (viewMode !== 'week' && viewMode !== 'day') return

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [viewMode])
```

**Behaviour note:** the now-line's position is seeded at mount rather than at the moment a timeline view opens, so switching to week view after the tab has been open a while shows a line up to 60 seconds stale before the first tick corrects it. If that matters, keep the immediate call with a justified disable rather than a lazy initialiser — but prefer the initialiser, since a minute of drift on a now-line is not perceptible.

The existing `react-hooks/exhaustive-deps` warning on this effect should also clear; if it does not, read what it asks for and satisfy it rather than suppressing.

- [ ] **Step 3: Verify — the tree is now error-free**

Run: `npm run test:run && npm run lint 2>&1 | grep "✖"`
Expected: tests PASS; `✖ 15 problems (0 errors, 15 warnings)`.

This is the milestone: zero errors. Confirm it before continuing.

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "tests/"`
Expected: no output.

- [ ] **Step 4: Verify the mobile calendar**

With `npm run dev`, open `http://localhost:3434/instructor/schedule` and narrow the viewport below 768px:
- Swiping between months moves the selection to the 1st, or to today in the current month.
- Tapping a day selects it and the day's events list updates.
- Week and day views show a now-line at the correct position.

- [ ] **Step 5: Commit**

```bash
git add components/MobileCalendar.tsx
git commit -m "Derive the mobile calendar's selected date and seed its clock

The selected date followed the visible month through an effect; it is now
derived during render. The clock seeds from a lazy initialiser instead of
a synchronous setState inside its interval effect.

Clears the last two react-hooks/set-state-in-effect errors. The tree now
has zero lint errors."
```

---

### Task 9: Migrate `<img>` to `next/image`

15 warnings across 8 files. **`next.config.ts` has no `images` configuration and every one of these images is remote**, so `remotePatterns` is a hard prerequisite — without it `next/image` throws at runtime on the very first render.

**Files:**
- Modify: `next.config.ts`, `components/ui/Avatar.tsx:72,89`, `components/HeadshotUpload.tsx:166`, `components/AssetSelector.tsx:87,186`, `components/Sidebar.tsx:457`, `components/StudioCarousel.tsx:154`, `app/(portal)/instructor/assets/page.tsx:149`, `app/(portal)/instructor/waivers/[id]/page.tsx:332`, `app/page.tsx:354,371,432,538,607,660`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Identify every host these images load from**

Run:
```bash
grep -rn "src=" components/ui/Avatar.tsx components/HeadshotUpload.tsx components/AssetSelector.tsx components/StudioCarousel.tsx components/Sidebar.tsx "app/(portal)/instructor/assets/page.tsx" "app/(portal)/instructor/waivers/[id]/page.tsx" app/page.tsx | grep -v "^\s*//"
grep -rn "NEXT_PUBLIC_SUPABASE_URL" .env* 2>/dev/null | head -2
```

The known host is the Supabase storage domain seen in `app/page.tsx:355`:
`https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/...`

Write down, for each of the 15, whether the `src` is (a) a literal Supabase storage URL, (b) a value read from the database that is always Supabase storage, or (c) genuinely arbitrary — a URL a user could paste. Category (c) cannot go through the optimiser safely and must keep `<img>`.

- [ ] **Step 2: Add the images configuration**

In `next.config.ts`, inside `nextConfig`:

```ts
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nuuuzezbglgtsuorhinw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
```

If Step 1 found additional hosts, add a pattern per host. Do not use a wildcard hostname — that turns the optimiser into an open image proxy for any URL an attacker can get the app to render.

- [ ] **Step 3: Migrate the fixed-size images first**

Where the rendered size is known, pass `width` and `height`. `Avatar` is the clearest case — it renders inside a sized, rounded container:

```tsx
import Image from 'next/image'
...
          <Image
            src={src}
            alt={alt || name || 'Avatar'}
            fill
            sizes="(max-width: 768px) 40px, 56px"
            className="rounded-full object-cover"
            onError={() => setImageError(true)}
          />
```

`fill` requires the parent to be positioned. Confirm the wrapper has `relative` — read the surrounding element and add `relative` to its className if absent. Adjust the `sizes` values to the Avatar component's actual size props.

- [ ] **Step 4: Migrate the CSS-sized images with `fill`**

`StudioCarousel:154` uses `max-w-full max-h-full object-contain` inside a sized parent:

```tsx
                        <Image
                          src={studio.image}
                          alt={studio.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 200px"
                          className="object-contain rounded-lg p-2"
                          draggable={false}
                        />
```

The parent already has `relative w-full h-full`, so `fill` works without further change. Apply the same treatment to `AssetSelector`, `HeadshotUpload`, the assets page and the waiver page, reading each parent to confirm it is positioned and sized.

- [ ] **Step 5: The landing page hero needs care**

`app/page.tsx:354` is a decorative mobile background with `alt=""`, sized entirely by CSS (`lp-hero__mobile-bg`), and it drives `setHeroImgLoaded` through `onLoad`. Use `fill` plus `priority`, since it is above the fold:

```tsx
            <Image
              src="https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/Public_Images/CR6_4040.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
              onLoad={() => setHeroImgLoaded(true)}
              onError={() => setHeroImgLoaded(true)}
            />
```

Check `app/globals.css` for `.lp-hero__mobile-bg img` rules — `next/image` renders an `<img>` inside a wrapper span, so a selector like `.lp-hero__mobile-bg > img` will stop matching. Update such selectors to `.lp-hero__mobile-bg img`.

Repeat for lines 371, 432, 538, 607 and 660, reading each one's CSS before converting.

- [ ] **Step 6: Leave genuinely arbitrary URLs as `<img>`, with a reason**

For any Category (c) image from Step 1:

```tsx
{/* eslint-disable-next-line @next/next/no-img-element -- User-supplied URL on
    an arbitrary host; routing it through the optimiser would make this an open
    image proxy. */}
<img src={src} alt={alt} className="..." />
```

This is a legitimate outcome, not a failure. Record in the commit message how many stayed and why.

- [ ] **Step 7: Verify**

Run: `npm run test:run && npm run lint 2>&1 | grep "✖"`
Expected: tests PASS. Warnings drop by the number migrated; if all 15 convert, lint reports no problems at all.

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "tests/"` — no output.
Run: `npm run build` — exit 0.

- [ ] **Step 8: Verify every image renders**

This is the highest-risk task for visual regression and there are no visual tests. With `npm run dev`, check every surface:
- Landing page at desktop **and** mobile widths — hero, all section images, studio carousel.
- Sidebar avatar, portal header avatar, a student with no avatar (initials fallback).
- Headshot upload — before and after uploading.
- Asset selector and the instructor assets page.
- A waiver detail page with a signature image.

A broken `next/image` shows an empty box or throws in the console. Watch the browser console for "Invalid src prop … hostname not configured", which means Step 2 missed a host.

- [ ] **Step 9: Commit**

```bash
git add next.config.ts components app "app/(portal)"
git commit -m "Serve images through next/image

Adds images.remotePatterns for the Supabase storage host — required
before next/image will accept any of these, since all of them are remote
and no images config existed. Fixed-size images pass width/height;
CSS-sized ones use fill against their positioned parents.

Clears the @next/next/no-img-element warnings."
```

---

### Task 10: Make lint block in CI

No `.github/workflows/` directory exists — CodeQL runs through GitHub's default setup, not a workflow file. This creates the first one.

**Files:**
- Create: `.github/workflows/lint.yml`

**Interfaces:**
- Consumes: a lint-clean tree from Tasks 2-9.
- Produces: a required check on every PR.

- [ ] **Step 1: Confirm the tree is clean before gating it**

Run: `npm run lint`
Expected: exit 0, no problems reported. If anything remains, finish it before adding the gate — landing a check that fails on `main` blocks every PR.

- [ ] **Step 2: Read the Node version in use**

Run: `node --version && grep -n '"engines"' -A3 package.json`

Use that major version in the workflow below.

- [ ] **Step 3: Write the workflow**

Create `.github/workflows/lint.yml`:

```yaml
name: Lint

on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    name: ESLint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm

      - run: npm ci

      # Errors fail the build. Warnings are reported but do not block, so the
      # remaining no-img-element exceptions stay visible without gating merges.
      - run: npx eslint . --max-warnings=-1

  types:
    name: Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm

      - run: npm ci

      # next.config.ts sets typescript.ignoreBuildErrors, so `next build` does
      # not typecheck. This is the only thing that does.
      - run: npx tsc --noEmit

  test:
    name: Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm

      - run: npm ci

      - run: npm run test:run
```

Set `node-version` to the major version found in Step 2.

- [ ] **Step 4: Reconcile the typecheck job with the two known errors**

`tests/__mocks__/api-helpers.ts:267` and `tests/setup.ts:69` fail `tsc --noEmit` today, so the `types` job will fail on arrival.

Choose one and do it in this task:
- **Fix them.** `api-helpers.ts:267` needs `signal: init.signal ?? undefined`; `tests/setup.ts:69` needs `import { afterEach } from 'vitest'`. Prefer this — both are one-liners.
- **Or** exclude `tests/**` from the typecheck via a `tsconfig.ci.json` that extends the base config and sets `"exclude": ["tests"]`, and point the job at it with `npx tsc --noEmit -p tsconfig.ci.json`.

Verify locally before pushing: `npx tsc --noEmit` must exit 0.

- [ ] **Step 5: Verify the workflow runs**

Push the branch and open a PR. Confirm all three jobs appear and pass:

Run: `gh pr checks <number>`
Expected: `ESLint`, `Typecheck` and `Tests` all pass.

- [ ] **Step 6: Prove the gate actually gates**

A check that cannot fail is worse than no check. Temporarily introduce an error and confirm CI catches it:

```bash
printf '\nconst _unused: number = "not a number"\n' >> lib/utils/class-type-styles.ts
git commit -am "TEMP: verify CI catches errors" && git push
```

Confirm the `Typecheck` job fails, then revert:

```bash
git revert --no-edit HEAD && git push
```

- [ ] **Step 7: Make the checks required**

In GitHub → Settings → Branches → branch protection for `main`, add `ESLint`, `Typecheck` and `Tests` as required status checks. This is a repository setting, not a file, and needs someone with admin rights on the repo.

- [ ] **Step 8: Commit**

```bash
git add .github/workflows/lint.yml
git commit -m "Add lint, typecheck and test checks to CI

No workflows existed — CodeQL runs via GitHub's default setup — so nothing
stopped the 24 lint errors this plan clears from returning. Errors block;
warnings are reported without gating.

The typecheck job exists because next.config.ts sets
typescript.ignoreBuildErrors, so a green build proves nothing about types."
```

---

## Self-Review

**Coverage:** Every one of the 42 problems maps to a task. The 24 errors: Task 2 (1), Task 3 (4), Task 4 (3), Task 5 (4), Task 6 (5), Task 7 (5), Task 8 (2) = 24. The 18 warnings: Task 9 (15 `no-img-element`), Task 7 (1 `no-location-assign-relative-destination`), Tasks 5 and 8 (2 `exhaustive-deps`, cleared incidentally — Task 8 Step 2 says to satisfy rather than suppress if one survives). Task 10 covers the CI gate. Task 1 covers the test harness the plan depends on.

**Running total check:** 42 → 41 (T2) → 37 (T3) → 34 (T4) → 30 (T5) → 25 (T6) → 19 (T7) → 15 (T8, zero errors) → 0 (T9). Each task states its expected count so a drift is caught immediately.

**Placeholder scan:** No TBD or TODO. Several steps direct the implementer to read surrounding code before writing — Task 3 Step 3 (`isMounted`'s purpose), Task 6 Step 1 (call sites), Task 7 Step 2 (the classes modal's close handler), Task 9 Step 1 (image hosts). Each states what to look for and what to do with each possible answer, which is verification, not unspecified work. Task 9 Step 6 and Task 10 Step 4 present explicit either/or choices with both branches specified.

**Type consistency:** `useSidebarOpen` returns `readonly [boolean, (open: boolean) => void]` in Task 4 and is destructured as a pair in both consumers. `useAsyncData<T>` returns `{ data, loading, error, refetch }` in Task 5 and every migration destructures exactly those. `filterUsers` is defined and consumed with the same signature in Task 2. `DetailNote` in Task 6's test is imported from `NoteDetailModal`, which already exports it.

**Known risks, stated rather than hidden:**
- Tasks 6 and 9 carry real regression risk with only manual verification behind them. Task 6 can leave a modal showing a stale record if a call site is missed; Task 9 can break layout silently. Both have per-surface checklists.
- Task 4 changes what `PortalLayout` renders before hydration, and Task 3 changes when the landing page nav appears. Both are called out in their commit messages.
- Task 5's `useAsyncData` adds abort and stale-response handling that the hand-rolled fetchers lacked. That is a behaviour improvement, but it is still a behaviour change to four working pages.
