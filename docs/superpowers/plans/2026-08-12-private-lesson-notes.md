# Private Lesson Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the note button on every private lesson in the instructor calendar, and give private lessons a colour that separates them from every other class type.

**Architecture:** Two pure utility modules carry all the decision logic — one for class-type presentation, one for resolving which students a note can target — so both calendars and the schedule page become thin consumers and the regression becomes unit-testable without rendering a page. The schedule page's event modal gains a notes list backed by a new `class_id` filter on the existing notes endpoint.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase, Vitest + jsdom + @testing-library/react

**Spec:** [docs/superpowers/specs/2026-08-12-private-lesson-notes-design.md](../specs/2026-08-12-private-lesson-notes-design.md)

## Global Constraints

- **Palette tokens are exact.** Private block: `bg-ballet-pink-100 border border-ballet-pink-200 text-ballet-pink-800`. Neutral block: `bg-champagne-100 border border-champagne-300 text-charcoal-800`. Cancelled block: `bg-champagne-200 border border-champagne-300 text-charcoal-400 opacity-60`. Private dot: `bg-ballet-pink-500`. Neutral dot: `bg-champagne-500`.
- **No off-system colours.** Do not introduce `purple-*`, `blue-*`, `green-*`, `amber-*`, `fuchsia-*`, or `gray-*` in any file this plan touches. Only `charcoal`, `champagne`, `ballet-pink`, `gold` (and the `rose-*` aliases that map onto `ballet-pink`).
- **`block` collapses, `chip` does not.** Every non-private class type shares one `block` string. Chips keep per-type treatment, including the Curtain Gilt chip on `master_class`.
- **Supabase client selection** (CLAUDE.md): API routes use `@/lib/supabase/server`. Do not change existing imports.
- **No redundant RLS filters** (CLAUDE.md): do not add an `author_id` filter to the notes query. RLS already scopes it.
- **Test commands:** single run `npm run test:run`, targeted `npx vitest run <path>`, lint `npm run lint`, build `npm run build`.
- **Dev server** runs on port 3434, not 3000.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/utils/class-type-styles.ts` | **New.** Sole source of truth for how a class type presents: label, short label, calendar block classes, chip classes, dot classes. Pure. |
| `lib/utils/lesson-notes.ts` | **New.** Sole source of truth for note-targeting decisions: which students a note modal offers, what the button says, note row title and visibility label. Pure. |
| `lib/utils/__tests__/class-type-styles.test.ts` | **New.** Tests for the above. |
| `lib/utils/__tests__/lesson-notes.test.ts` | **New.** Tests for the above, including the exact regression. |
| `components/Calendar.tsx` | Desktop grid. Consumes `class-type-styles`; loses its own colour map. |
| `components/MobileCalendar.tsx` | Mobile calendar. Consumes `class-type-styles`; loses four lookup tables. |
| `app/api/notes/route.ts` | Adds a `class_id` filter to GET. |
| `app/(portal)/instructor/schedule/page.tsx` | Event modal. Ungated note button, student fallback, notes list, state reset and race guard. |

---

### Task 1: Class-type style module

**Files:**
- Create: `lib/utils/class-type-styles.ts`
- Test: `lib/utils/__tests__/class-type-styles.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ClassType = 'private' | 'group' | 'workshop' | 'master_class' | 'competition_choreography' | 'personal'`
  - `interface ClassTypeStyle { label: string; shortLabel: string; block: string; chip: string; dot: string }`
  - `getClassTypeStyle(type: string): ClassTypeStyle`
  - `getClassTypeLabel(type: string): string`
  - `const CANCELLED_BLOCK_STYLE: string`

- [ ] **Step 1: Write the failing test**

Create `lib/utils/__tests__/class-type-styles.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  getClassTypeStyle,
  getClassTypeLabel,
  CANCELLED_BLOCK_STYLE,
  type ClassType,
} from '@/lib/utils/class-type-styles'

const ALL_TYPES: ClassType[] = [
  'private',
  'group',
  'workshop',
  'master_class',
  'competition_choreography',
  'personal',
]

const NON_PRIVATE = ALL_TYPES.filter(t => t !== 'private')

describe('getClassTypeStyle', () => {
  it('gives private a block style no other type shares', () => {
    const privateBlock = getClassTypeStyle('private').block
    for (const type of NON_PRIVATE) {
      expect(getClassTypeStyle(type).block).not.toBe(privateBlock)
    }
  })

  it('collapses every non-private type onto one block style', () => {
    const blocks = new Set(NON_PRIVATE.map(t => getClassTypeStyle(t).block))
    expect(blocks.size).toBe(1)
  })

  it('paints private with the ballet-pink family and neutrals with champagne', () => {
    expect(getClassTypeStyle('private').block).toContain('bg-ballet-pink-100')
    expect(getClassTypeStyle('group').block).toContain('bg-champagne-100')
  })

  it('keeps the gilt chip on master class even though its block is neutral', () => {
    expect(getClassTypeStyle('master_class').chip).toContain('gold')
    expect(getClassTypeStyle('master_class').block).toBe(getClassTypeStyle('group').block)
  })

  it('marks private with a distinct dot', () => {
    expect(getClassTypeStyle('private').dot).toBe('bg-ballet-pink-500')
    for (const type of NON_PRIVATE) {
      expect(getClassTypeStyle(type).dot).toBe('bg-champagne-500')
    }
  })

  it('gives every known type a non-empty label and short label', () => {
    for (const type of ALL_TYPES) {
      expect(getClassTypeStyle(type).label.length).toBeGreaterThan(0)
      expect(getClassTypeStyle(type).shortLabel.length).toBeGreaterThan(0)
    }
  })

  it('falls back to the neutral style for an unrecognised type', () => {
    const unknown = getClassTypeStyle('interpretive_mime')
    expect(unknown.block).toBe(getClassTypeStyle('group').block)
    expect(unknown.dot).toBe('bg-champagne-500')
  })

  it('echoes an unrecognised type back as its own label', () => {
    expect(getClassTypeStyle('interpretive_mime').label).toBe('interpretive_mime')
    expect(getClassTypeLabel('interpretive_mime')).toBe('interpretive_mime')
  })

  it('uses no off-system colour families', () => {
    const banned = /\b(purple|blue|green|amber|fuchsia|gray|slate|zinc)-/
    for (const type of [...ALL_TYPES, 'unknown']) {
      const style = getClassTypeStyle(type)
      expect(style.block).not.toMatch(banned)
      expect(style.chip).not.toMatch(banned)
      expect(style.dot).not.toMatch(banned)
    }
    expect(CANCELLED_BLOCK_STYLE).not.toMatch(banned)
  })
})

describe('getClassTypeLabel', () => {
  it('returns the long label for known types', () => {
    expect(getClassTypeLabel('private')).toBe('Private Lesson')
    expect(getClassTypeLabel('master_class')).toBe('Master Class')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/utils/__tests__/class-type-styles.test.ts`
Expected: FAIL — cannot resolve `@/lib/utils/class-type-styles`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/utils/class-type-styles.ts`:

```ts
// Single source of truth for how a class type presents anywhere in the product.
//
// `block` (the calendar surface) collapses onto two tones per DESIGN.md: a private
// lesson is Stage Rose, everything else is champagne. Many blocks are scanned at
// once and the distinction has to survive a 10px month cell, so it buys exactly one
// thing — private or not.
//
// `chip` keeps per-type treatment. A chip appears in a modal or list row showing one
// class at a time, where there is nothing to scan against and the gilt-for-premium
// reservation still applies.

export type ClassType =
  | 'private'
  | 'group'
  | 'workshop'
  | 'master_class'
  | 'competition_choreography'
  | 'personal'

export interface ClassTypeStyle {
  /** Long form, for modals and detail rows. */
  label: string
  /** Compact form, for dense mobile chips. */
  shortLabel: string
  /** Calendar block: fill, hairline and text. */
  block: string
  /** Badge chip in modals and list rows. */
  chip: string
  /** Small marker for mobile day dots. */
  dot: string
}

const PRIVATE_BLOCK = 'bg-ballet-pink-100 border border-ballet-pink-200 text-ballet-pink-800'
const NEUTRAL_BLOCK = 'bg-champagne-100 border border-champagne-300 text-charcoal-800'

const PRIVATE_DOT = 'bg-ballet-pink-500'
const NEUTRAL_DOT = 'bg-champagne-500'

const NEUTRAL_CHIP = 'bg-champagne-100 text-charcoal-700 border-champagne-200'

/** Cancelled classes take this instead of their type style, on every surface. */
export const CANCELLED_BLOCK_STYLE =
  'bg-champagne-200 border border-champagne-300 text-charcoal-400 opacity-60'

const STYLES: Record<ClassType, ClassTypeStyle> = {
  private: {
    label: 'Private Lesson',
    shortLabel: 'Private',
    block: PRIVATE_BLOCK,
    chip: 'bg-ballet-pink-50 text-ballet-pink-800 border-ballet-pink-200',
    dot: PRIVATE_DOT,
  },
  group: {
    label: 'Group Class',
    shortLabel: 'Group',
    block: NEUTRAL_BLOCK,
    chip: NEUTRAL_CHIP,
    dot: NEUTRAL_DOT,
  },
  workshop: {
    label: 'Workshop',
    shortLabel: 'Workshop',
    block: NEUTRAL_BLOCK,
    chip: NEUTRAL_CHIP,
    dot: NEUTRAL_DOT,
  },
  master_class: {
    label: 'Master Class',
    shortLabel: 'Master',
    block: NEUTRAL_BLOCK,
    chip: 'bg-gold-100 text-gold-800 border-gold-200',
    dot: NEUTRAL_DOT,
  },
  competition_choreography: {
    label: 'Competition Choreography',
    shortLabel: 'Competition',
    block: NEUTRAL_BLOCK,
    chip: NEUTRAL_CHIP,
    dot: NEUTRAL_DOT,
  },
  personal: {
    label: 'Personal',
    shortLabel: 'Personal',
    block: NEUTRAL_BLOCK,
    chip: NEUTRAL_CHIP,
    dot: NEUTRAL_DOT,
  },
}

export function getClassTypeStyle(type: string): ClassTypeStyle {
  const known = STYLES[type as ClassType]
  if (known) return known
  // Unknown types render neutral and carry their own raw name as the label.
  return {
    label: type,
    shortLabel: type,
    block: NEUTRAL_BLOCK,
    chip: NEUTRAL_CHIP,
    dot: NEUTRAL_DOT,
  }
}

export function getClassTypeLabel(type: string): string {
  return getClassTypeStyle(type).label
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/utils/__tests__/class-type-styles.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/class-type-styles.ts lib/utils/__tests__/class-type-styles.test.ts
git commit -m "Add shared class-type style module

One source of truth for class-type label, calendar block, chip and dot
styles. Block collapses onto two tones (private is rose, everything else
champagne) because the calendar is scanned many-at-once; chip keeps
per-type treatment including the gilt master-class badge."
```

---

### Task 2: Wire the desktop calendar to the style module

**Files:**
- Modify: `components/Calendar.tsx:16-24` (delete the colour map), `:169-170` (delete the accessor), `:250-254` and `:341-345` (the two block className sites)

**Interfaces:**
- Consumes: `getClassTypeStyle`, `CANCELLED_BLOCK_STYLE` from Task 1.
- Produces: nothing new.

- [ ] **Step 1: Delete the off-system colour map**

Remove these lines from `components/Calendar.tsx` (currently lines 16-24):

```ts
const CLASS_TYPE_STYLES: Record<string, string> = {
  private: 'bg-purple-100 border border-purple-300 text-purple-900',
  group: 'bg-blue-100 border border-blue-300 text-blue-900',
  workshop: 'bg-green-100 border border-green-300 text-green-900',
  master_class: 'bg-amber-100 border border-amber-300 text-amber-900',
  competition_choreography: 'bg-fuchsia-100 border border-fuchsia-300 text-fuchsia-900',
  personal: 'bg-rose-100 border border-rose-300 text-rose-900',
}
const DEFAULT_CLASS_TYPE_STYLE = 'bg-gray-100 border border-gray-300 text-gray-900'
```

- [ ] **Step 2: Add the import**

Add below the existing `et-timezone` import block:

```ts
import { getClassTypeStyle, CANCELLED_BLOCK_STYLE } from '@/lib/utils/class-type-styles'
```

- [ ] **Step 3: Replace the local accessor**

Replace (currently lines 169-170):

```ts
  const getClassTypeStyles = (type: string) =>
    CLASS_TYPE_STYLES[type] ?? DEFAULT_CLASS_TYPE_STYLE
```

with:

```ts
  const getClassTypeStyles = (type: string) => getClassTypeStyle(type).block
```

- [ ] **Step 4: Replace the cancelled styles at both block sites**

In `renderWeekView` (currently line 251-253) and `renderMonthView` (currently line 342-344), replace both occurrences of:

```tsx
                          event.is_cancelled
                            ? 'bg-gray-200 opacity-50 border border-gray-300'
                            : getClassTypeStyles(event.class_type)
```

with:

```tsx
                          event.is_cancelled
                            ? CANCELLED_BLOCK_STYLE
                            : getClassTypeStyles(event.class_type)
```

Note the indentation differs between the two sites — match the surrounding code, do not reformat.

- [ ] **Step 5: Verify no off-system colours remain**

Run: `grep -nE '\b(purple|blue|green|amber|fuchsia|gray)-[0-9]' components/Calendar.tsx`
Expected: no matches. If `gray-` appears in the grid hairlines, that is pre-existing chrome outside this plan's scope — leave it, but confirm none of the matches are on an event block.

- [ ] **Step 6: Run the full test suite and typecheck**

Run: `npm run test:run && npm run build`
Expected: tests PASS, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add components/Calendar.tsx
git commit -m "Repaint desktop calendar blocks onto the Ballet Noir palette

Drops stock Tailwind purple/blue/green/amber/fuchsia from the desktop
grid in favour of the shared class-type style module. Private lessons now
read as rose against champagne."
```

---

### Task 3: Wire the mobile calendar to the style module

**Files:**
- Modify: `components/MobileCalendar.tsx:41-79` (delete four lookup tables), `:333-343` (collapse four accessors into one), `:573`, `:678`, `:794`, `:824` (usage sites)

**Interfaces:**
- Consumes: `getClassTypeStyle` from Task 1.
- Produces: nothing new.

- [ ] **Step 1: Delete the four lookup tables**

Remove `CLASS_TYPE_DOT`, `DEFAULT_CLASS_TYPE_DOT`, `CLASS_TYPE_BG`, `DEFAULT_CLASS_TYPE_BG`, `CLASS_TYPE_STYLE`, `DEFAULT_CLASS_TYPE_STYLE` and `CLASS_TYPE_LABEL` from `components/MobileCalendar.tsx` (currently lines 41-79, starting at the `// Class types map onto the four-family Ballet Noir palette` comment).

- [ ] **Step 2: Add the import**

```ts
import { getClassTypeStyle } from '@/lib/utils/class-type-styles'
```

- [ ] **Step 3: Collapse the four accessors**

Replace (currently lines 334-343):

```ts
  const getClassTypeColor = (type: string) =>
    CLASS_TYPE_DOT[type] ?? DEFAULT_CLASS_TYPE_DOT

  const getClassTypeBgColor = (type: string) =>
    CLASS_TYPE_BG[type] ?? DEFAULT_CLASS_TYPE_BG

  const getClassTypeStyles = (type: string) =>
    CLASS_TYPE_STYLE[type] ?? DEFAULT_CLASS_TYPE_STYLE

  const getClassTypeLabel = (type: string) => CLASS_TYPE_LABEL[type] ?? type
```

with:

```ts
  const getClassTypeColor = (type: string) => getClassTypeStyle(type).dot

  const getClassTypeBgColor = (type: string) => getClassTypeStyle(type).block

  const getClassTypeStyles = (type: string) => getClassTypeStyle(type).block

  const getClassTypeLabel = (type: string) => getClassTypeStyle(type).shortLabel
```

`getClassTypeBgColor` and `getClassTypeStyles` now return the same string. Keep both names so the four call sites stay untouched in this step; they read differently at their call sites and collapsing them is not worth the churn.

- [ ] **Step 4: Verify the call sites still compile**

The four call sites (lines ~573, ~678, ~794, ~824) need no edit — the accessor names are unchanged. Confirm with:

Run: `grep -n "getClassTypeColor\|getClassTypeBgColor\|getClassTypeStyles\|getClassTypeLabel" components/MobileCalendar.tsx`
Expected: four definitions plus their call sites, no undefined references.

- [ ] **Step 5: Check the day-list row**

Line ~794 applies `getClassTypeStyles(...)` to a row that also carries `hover:bg-gray-50 active:bg-gray-100`. Replace those two with the champagne equivalents:

```tsx
                className={`w-full text-left px-4 py-4 hover:bg-champagne-100 active:bg-champagne-200 transition-colors ${getClassTypeStyles(event.class_type)}`}
```

- [ ] **Step 6: Run the full test suite and build**

Run: `npm run test:run && npm run build`
Expected: tests PASS, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add components/MobileCalendar.tsx
git commit -m "Point mobile calendar at the shared class-type styles

Replaces four parallel lookup tables with the shared module. Private
lessons gain a rose hairline and darker rose text, which separates them
from champagne neutrals at month-cell density where the old
ballet-pink-100 tint was indistinguishable from champagne-100."
```

---

### Task 4: Note-targeting module

**Files:**
- Create: `lib/utils/lesson-notes.ts`
- Test: `lib/utils/__tests__/lesson-notes.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface NoteStudent { id: string; full_name: string }`
  - `resolveNoteTarget(enrolled: NoteStudent[], fallback: NoteStudent[]): { students: NoteStudent[]; initialStudentId?: string }`
  - `noteButtonLabel(enrolled: NoteStudent[]): string`
  - `noteVisibilityLabel(visibility: string): string`
  - `noteRowTitle(note: { title?: string | null; content?: string | null }): string`

- [ ] **Step 1: Write the failing test**

Create `lib/utils/__tests__/lesson-notes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  resolveNoteTarget,
  noteButtonLabel,
  noteVisibilityLabel,
  noteRowTitle,
  type NoteStudent,
} from '@/lib/utils/lesson-notes'

const ella: NoteStudent = { id: 's1', full_name: 'Ella Ross' }
const maya: NoteStudent = { id: 's2', full_name: 'Maya Torres' }
const roster: NoteStudent[] = [ella, maya, { id: 's3', full_name: 'Sam Whitfield' }]

describe('resolveNoteTarget', () => {
  it('locks onto the single enrolled student', () => {
    const target = resolveNoteTarget([ella], roster)
    expect(target.students).toEqual([ella])
    expect(target.initialStudentId).toBe('s1')
  })

  it('falls back to the full roster when nobody is enrolled', () => {
    // This is the regression: a private lesson created without picking a
    // student has no enrollments row, and used to lose its note button.
    const target = resolveNoteTarget([], roster)
    expect(target.students).toEqual(roster)
    expect(target.initialStudentId).toBeUndefined()
  })

  it('narrows to the enrolled students when several are enrolled', () => {
    const target = resolveNoteTarget([ella, maya], roster)
    expect(target.students).toEqual([ella, maya])
    expect(target.initialStudentId).toBeUndefined()
  })

  it('never returns an empty student list when a fallback exists', () => {
    expect(resolveNoteTarget([], roster).students.length).toBeGreaterThan(0)
  })

  it('tolerates both lists being empty', () => {
    const target = resolveNoteTarget([], [])
    expect(target.students).toEqual([])
    expect(target.initialStudentId).toBeUndefined()
  })
})

describe('noteButtonLabel', () => {
  it('names the student when exactly one is enrolled', () => {
    expect(noteButtonLabel([ella])).toBe('Create note for Ella')
  })

  it('stays generic when nobody is enrolled', () => {
    expect(noteButtonLabel([])).toBe('Add note')
  })

  it('stays generic when several are enrolled', () => {
    expect(noteButtonLabel([ella, maya])).toBe('Add note')
  })

  it('survives a blank or whitespace-only name', () => {
    expect(noteButtonLabel([{ id: 'x', full_name: '   ' }])).toBe('Add note')
    expect(noteButtonLabel([{ id: 'x', full_name: '' }])).toBe('Add note')
  })

  it('uses the first word of a multi-part name', () => {
    expect(noteButtonLabel([{ id: 'x', full_name: 'Mary Anne Fitzgerald' }]))
      .toBe('Create note for Mary')
  })
})

describe('noteVisibilityLabel', () => {
  it('maps each visibility to its chip label', () => {
    expect(noteVisibilityLabel('private')).toBe('Private')
    expect(noteVisibilityLabel('shared_with_student')).toBe('Shared')
    expect(noteVisibilityLabel('shared_with_guardian')).toBe('Guardian')
    expect(noteVisibilityLabel('shared_with_instructor')).toBe('Instructor')
  })

  it('echoes an unknown visibility rather than blanking it', () => {
    expect(noteVisibilityLabel('shared_with_martians')).toBe('shared_with_martians')
  })
})

describe('noteRowTitle', () => {
  it('prefers the title', () => {
    expect(noteRowTitle({ title: 'Fouetté prep', content: '<p>anything</p>' }))
      .toBe('Fouetté prep')
  })

  it('falls back to the content with markup stripped', () => {
    expect(noteRowTitle({ title: null, content: '<p><strong>Spotting</strong> drill</p>' }))
      .toBe('Spotting drill')
  })

  it('collapses whitespace left behind by block tags', () => {
    expect(noteRowTitle({ title: '', content: '<p>Line one</p>\n<p>Line two</p>' }))
      .toBe('Line one Line two')
  })

  it('truncates long content with an ellipsis', () => {
    const long = 'a'.repeat(120)
    const result = noteRowTitle({ title: null, content: `<p>${long}</p>` })
    expect(result.length).toBeLessThanOrEqual(61)
    expect(result.endsWith('…')).toBe(true)
  })

  it('names an empty note rather than rendering a blank row', () => {
    expect(noteRowTitle({ title: null, content: '<p></p>' })).toBe('Untitled note')
    expect(noteRowTitle({ title: null, content: null })).toBe('Untitled note')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/utils/__tests__/lesson-notes.test.ts`
Expected: FAIL — cannot resolve `@/lib/utils/lesson-notes`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/utils/lesson-notes.ts`:

```ts
// Decides who a lesson note can be written about, and how note rows read.
//
// The student list is resolved here rather than in JSX because the calendar's
// note button used to disappear whenever a lesson had no enrollments row —
// which is every private lesson created without picking a student, since that
// field is optional. Keeping the decision pure makes that case testable.

export interface NoteStudent {
  id: string
  full_name: string
}

export interface NoteTarget {
  /** The students the note modal should offer. */
  students: NoteStudent[]
  /** Preselected and locked, only when the lesson unambiguously has one student. */
  initialStudentId?: string
}

/**
 * @param enrolled students enrolled in this lesson (may be empty)
 * @param fallback every student the instructor could write about
 */
export function resolveNoteTarget(
  enrolled: NoteStudent[],
  fallback: NoteStudent[]
): NoteTarget {
  if (enrolled.length === 1) {
    return { students: enrolled, initialStudentId: enrolled[0].id }
  }
  if (enrolled.length > 1) {
    return { students: enrolled }
  }
  return { students: fallback }
}

function firstName(fullName: string): string | null {
  const first = fullName.trim().split(/\s+/)[0]
  return first ? first : null
}

export function noteButtonLabel(enrolled: NoteStudent[]): string {
  if (enrolled.length === 1) {
    const name = firstName(enrolled[0].full_name)
    if (name) return `Create note for ${name}`
  }
  return 'Add note'
}

const VISIBILITY_LABELS: Record<string, string> = {
  private: 'Private',
  shared_with_student: 'Shared',
  shared_with_guardian: 'Guardian',
  shared_with_instructor: 'Instructor',
}

export function noteVisibilityLabel(visibility: string): string {
  return VISIBILITY_LABELS[visibility] ?? visibility
}

const MAX_ROW_TITLE = 60

export function noteRowTitle(note: {
  title?: string | null
  content?: string | null
}): string {
  const title = note.title?.trim()
  if (title) return title

  // Display-only excerpt. The full note is always rendered through
  // createSanitizedHtml() in NoteDetailModal; this strips markup for a
  // single-line label and is never injected as HTML.
  const text = (note.content ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return 'Untitled note'
  return text.length > MAX_ROW_TITLE ? `${text.slice(0, MAX_ROW_TITLE)}…` : text
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/utils/__tests__/lesson-notes.test.ts`
Expected: PASS, 19 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/lesson-notes.ts lib/utils/__tests__/lesson-notes.test.ts
git commit -m "Add note-targeting module for lesson notes

Resolves which students a lesson note can target, degrading from the
enrolled student, to the enrolled roster, to the instructor's full student
list. Pure, so the zero-enrollment regression is testable without
rendering the schedule page."
```

---

### Task 5: `class_id` filter on the notes endpoint

**Files:**
- Modify: `app/api/notes/route.ts:17-19` (read the param), `:36-38` (apply the filter)

**Interfaces:**
- Consumes: nothing.
- Produces: `GET /api/notes?class_id=<uuid>` returns only notes attached to that class.

- [ ] **Step 1: Read the new query param**

In `app/api/notes/route.ts`, alongside the existing param reads (currently lines 17-19):

```ts
    const studentId = searchParams.get('student_id')
    const visibility = searchParams.get('visibility')
    const tag = searchParams.get('tag')
```

add:

```ts
    const classId = searchParams.get('class_id')
```

- [ ] **Step 2: Apply the filter**

After the existing `studentId` filter block (currently lines 36-38):

```ts
    if (studentId) {
      query = query.eq('student_id', studentId)
    }
```

add:

```ts
    if (classId) {
      query = query.eq('class_id', classId)
    }
```

Do not add an `author_id` filter — RLS already scopes which notes the caller can read, and adding one causes the "0 rows" failure documented in CLAUDE.md.

- [ ] **Step 3: Verify the filter composes with the existing ones**

Run: `npm run build`
Expected: build succeeds.

Manual check with the dev server (`npm run dev`, port 3434), signed in as the instructor:
- `GET /api/notes?class_id=<a private lesson id>` returns only that lesson's notes.
- `GET /api/notes` still returns everything, unfiltered.
- `GET /api/notes?class_id=<id>&student_id=<id>` narrows on both.

- [ ] **Step 4: Commit**

```bash
git add app/api/notes/route.ts
git commit -m "Accept a class_id filter on GET /api/notes

Lets the calendar's event modal list the notes already attached to a
lesson. RLS continues to scope visibility; no redundant author filter."
```

---

### Task 6: Ungate the note button and add the student fallback

**Files:**
- Modify: `app/(portal)/instructor/schedule/page.tsx` — imports, `handleEventClick` (currently `:138-146`), `fetchEnrolledStudents` (`:148-159`), `handleCreateNote` (`:161-170`), `getClassTypeLabel` / `getClassTypeClassName` (`:214-245`), the button block (`:622-633`)

**Interfaces:**
- Consumes: `resolveNoteTarget`, `noteButtonLabel`, `NoteStudent` from Task 4; `getClassTypeStyle`, `getClassTypeLabel` from Task 1.
- Produces: nothing new.

- [ ] **Step 1: Replace the local class-type helpers with the shared module**

Add to the imports:

```ts
import { getClassTypeStyle, getClassTypeLabel } from '@/lib/utils/class-type-styles'
import { resolveNoteTarget, noteButtonLabel, type NoteStudent } from '@/lib/utils/lesson-notes'
```

Delete the local `getClassTypeLabel` function (currently lines 214-229) and replace the local `getClassTypeClassName` (lines 231-245) with:

```ts
  const getClassTypeClassName = (type: string) => getClassTypeStyle(type).chip
```

The two call sites (the day-list `Badge` at line ~426 and the modal `Badge` at line ~520) need no change.

- [ ] **Step 2: Add the race guard ref and reset state on event click**

Add near the other hooks, after `const [viewType, setViewType] = useState<ViewType>('month')`:

```ts
  // Guards against a slow response for a previously-clicked lesson landing
  // after the instructor has already opened a different one.
  const activeClassIdRef = useRef<string | null>(null)
```

and add `useRef` to the React import on line 3.

Replace `handleEventClick` (currently lines 138-146):

```tsx
  const handleEventClick = async (event: ClassEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)

    // For private lessons, fetch enrolled students
    if (event.class_type === 'private') {
      await fetchEnrolledStudents(event.id)
    }
  }
```

with:

```tsx
  const handleEventClick = async (event: ClassEvent) => {
    activeClassIdRef.current = event.id
    setSelectedEvent(event)
    // Clear the previous lesson's roster so a stale one can never render
    // under a newly-opened lesson.
    setEnrolledStudents([])
    setShowEventModal(true)

    if (event.class_type === 'private') {
      await fetchEnrolledStudents(event.id)
    }
  }
```

- [ ] **Step 3: Make the enrollment fetch race-safe**

Replace `fetchEnrolledStudents` (currently lines 148-159):

```tsx
  const fetchEnrolledStudents = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}/enrollments`)
      if (!response.ok) throw new Error('Failed to fetch enrollments')

      const result = await response.json()
      setEnrolledStudents(result.enrollments || [])
    } catch (err: any) {
      console.error('Error fetching enrollments:', err)
      setEnrolledStudents([])
    }
  }
```

with:

```tsx
  const fetchEnrolledStudents = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}/enrollments`)
      if (!response.ok) throw new Error('Failed to fetch enrollments')

      const result = await response.json()
      if (activeClassIdRef.current !== classId) return
      setEnrolledStudents(result.enrollments || [])
    } catch (err: any) {
      console.error('Error fetching enrollments:', err)
      if (activeClassIdRef.current !== classId) return
      // Leaving this empty no longer hides the note button — handleCreateNote
      // falls back to the full student list.
      setEnrolledStudents([])
    }
  }
```

- [ ] **Step 4: Give handleCreateNote a fallback student source**

Replace `handleCreateNote` (currently lines 161-170):

```tsx
  const handleCreateNote = () => {
    // Convert enrolled students to the format needed for AddNoteModal
    const studentsForModal: StudentForNotes[] = enrolledStudents.map(s => ({
      id: s.id,
      full_name: s.full_name
    }))
    setStudentsForNotes(studentsForModal)
    setShowNoteModal(true)
    setShowEventModal(false)
  }
```

with:

```tsx
  const handleCreateNote = async () => {
    const enrolled: NoteStudent[] = enrolledStudents.map(s => ({
      id: s.id,
      full_name: s.full_name
    }))

    let fallback: NoteStudent[] = []
    if (enrolled.length === 0) {
      // The lesson has no roster — either no student was picked when it was
      // created, or the enrollment fetch failed. Offer every active student
      // rather than hiding the button.
      try {
        const response = await fetch('/api/students?is_active=true')
        if (!response.ok) throw new Error('Failed to load students')
        const result = await response.json()
        fallback = (result.students || []).map((s: any) => ({
          id: s.id,
          full_name: s.profile?.full_name || s.full_name || 'Unnamed student'
        }))
      } catch {
        addToast('Could not load your students. Please try again.', 'error')
        return
      }
    }

    const target = resolveNoteTarget(enrolled, fallback)
    setStudentsForNotes(target.students)
    setNoteInitialStudentId(target.initialStudentId)
    setShowNoteModal(true)
    setShowEventModal(false)
  }
```

Add the accompanying state, next to `studentsForNotes`:

```ts
  const [noteInitialStudentId, setNoteInitialStudentId] = useState<string | undefined>(undefined)
```

`StudentForNotes` and `NoteStudent` are structurally identical (`{ id, full_name }`); the state can keep its existing `StudentForNotes[]` type.

- [ ] **Step 5: Ungate the button**

Replace the button block (currently lines 622-633):

```tsx
              {selectedEvent.class_type === 'private' && enrolledStudents.length > 0 && (
                <Button
                  onClick={handleCreateNote}
                  variant="primary"
                  className="w-full"
                >
                  Create note for{' '}
                  {enrolledStudents.length === 1
                    ? enrolledStudents[0].full_name.split(' ')[0]
                    : 'student'}
                </Button>
              )}
```

with:

```tsx
              {selectedEvent.class_type === 'private' && (
                <Button
                  onClick={handleCreateNote}
                  variant="primary"
                  className="w-full"
                >
                  {noteButtonLabel(enrolledStudents)}
                </Button>
              )}
```

- [ ] **Step 6: Pass the resolved initial student to the modal**

Replace (currently line 710):

```tsx
          initialStudentId={enrolledStudents.length === 1 ? enrolledStudents[0].id : undefined}
```

with:

```tsx
          initialStudentId={noteInitialStudentId}
```

- [ ] **Step 7: Run the suite and build**

Run: `npm run test:run && npm run lint && npm run build`
Expected: tests PASS, lint clean, build succeeds.

- [ ] **Step 8: Verify in the running app**

Run `npm run dev` (port 3434), sign in as the instructor, open the calendar.
- A private lesson **with** one enrolled student shows `Create note for <FirstName>`; the modal's student select is filled and disabled.
- A private lesson **with no** enrolled student shows `Add note`; the modal's student select lists every active student and is enabled. This is the regression case.
- A group class shows no note button.
- Clicking private lesson A then immediately private lesson B shows B's roster, never A's.

- [ ] **Step 9: Commit**

```bash
git add "app/(portal)/instructor/schedule/page.tsx"
git commit -m "Show the note button on every private lesson

The button was gated on the lesson having an enrollments row, so any
private lesson created without picking a student — the field is optional —
silently lost it, as did any lesson whose enrollment fetch failed. It now
renders unconditionally and falls back to the instructor's full student
list when the lesson has no roster.

Also resets the roster between lessons and discards stale responses, so a
slow fetch for one lesson can't render under another."
```

---

### Task 7: Notes from this lesson

**Files:**
- Modify: `app/(portal)/instructor/schedule/page.tsx` — new state and fetch, a new modal section after the student roster (currently `:602-618`), and `handleSubmitNote` (`:172-200`)

**Interfaces:**
- Consumes: `noteRowTitle`, `noteVisibilityLabel` from Task 4; `GET /api/notes?class_id=` from Task 5; `NoteDetailModal` and its `DetailNote` type from `@/components/NoteDetailModal`.
- Produces: nothing new.

- [ ] **Step 1: Add state and imports**

Add to the imports:

```ts
import { NoteDetailModal, type DetailNote } from '@/components/NoteDetailModal'
import { noteRowTitle, noteVisibilityLabel } from '@/lib/utils/lesson-notes'
```

Add state next to `showNoteModal`:

```ts
  const [lessonNotes, setLessonNotes] = useState<DetailNote[]>([])
  const [openNote, setOpenNote] = useState<DetailNote | null>(null)
```

- [ ] **Step 2: Add the fetch**

Add below `fetchEnrolledStudents`:

```tsx
  const fetchLessonNotes = async (classId: string) => {
    try {
      const response = await fetch(`/api/notes?class_id=${classId}`)
      if (!response.ok) throw new Error('Failed to fetch notes')

      const result = await response.json()
      if (activeClassIdRef.current !== classId) return
      setLessonNotes(result.notes || [])
    } catch (err: any) {
      console.error('Error fetching lesson notes:', err)
      if (activeClassIdRef.current !== classId) return
      // Supplementary information — the modal's primary job still works.
      setLessonNotes([])
    }
  }
```

The GET handler returns `{ notes: [...] }` (`app/api/notes/route.ts:64`), already ordered `created_at` descending by the query — no client-side sort needed.

- [ ] **Step 3: Fetch both in parallel on event click**

In `handleEventClick`, replace:

```tsx
    setEnrolledStudents([])
    setShowEventModal(true)

    if (event.class_type === 'private') {
      await fetchEnrolledStudents(event.id)
    }
```

with:

```tsx
    setEnrolledStudents([])
    setLessonNotes([])
    setShowEventModal(true)

    if (event.class_type === 'private') {
      await Promise.all([
        fetchEnrolledStudents(event.id),
        fetchLessonNotes(event.id)
      ])
    }
```

- [ ] **Step 4: Render the notes section**

Insert immediately after the student roster `<section>` (which currently ends at line 618, just before the action stack comment):

```tsx
            {selectedEvent.class_type === 'private' && lessonNotes.length > 0 && (
              <section className="mt-7">
                <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-charcoal-500 mb-2">
                  Notes from this lesson
                </h3>
                <ul className="rounded-lg border border-champagne-200 divide-y divide-champagne-200 overflow-hidden">
                  {lessonNotes.map((note) => (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => setOpenNote(note)}
                        className="w-full text-left px-4 py-2.5 bg-champagne-100/60 hover:bg-champagne-100 transition-colors flex items-baseline justify-between gap-3"
                      >
                        <span className="text-sm text-charcoal-900 truncate">
                          {noteRowTitle(note)}
                        </span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <Badge className="bg-champagne-100 text-charcoal-700 border-champagne-200">
                            {noteVisibilityLabel(note.visibility)}
                          </Badge>
                          <span className="text-xs text-charcoal-500">
                            {new Date(note.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
```

The section is omitted entirely when there are no notes — the absence is the signal, and the modal is already tall.

- [ ] **Step 5: Refresh the list after a note is saved**

In `handleSubmitNote`, replace the success branch (currently lines 193-195):

```tsx
      addToast('Note created successfully', 'success')
      setShowNoteModal(false)
      setShowEventModal(true)
```

with:

```tsx
      addToast('Note created successfully', 'success')
      setShowNoteModal(false)
      setShowEventModal(true)
      await fetchLessonNotes(selectedEvent.id)
```

- [ ] **Step 6: Render the note detail modal**

Add after the `AddNoteModal` block (currently ending line 713):

```tsx
      {openNote && (
        <NoteDetailModal
          note={openNote}
          isOwn={openNote.author_id === profile?.id}
          onClose={() => setOpenNote(null)}
          onBack={() => setOpenNote(null)}
          onSaved={(updated) => {
            setLessonNotes(prev =>
              prev.map(n => (n.id === updated.id ? updated : n))
            )
            setOpenNote(null)
          }}
        />
      )}
```

- [ ] **Step 7: Run the suite, lint and build**

Run: `npm run test:run && npm run lint && npm run build`
Expected: tests PASS, lint clean, build succeeds.

- [ ] **Step 8: Verify in the running app**

With `npm run dev` on port 3434, signed in as the instructor:
- Open a private lesson that already has notes — the section lists them, newest first, each with a visibility chip and date.
- Click a row — the note detail modal opens and can be edited.
- Write a new note from the same lesson — on save, it appears in the list without a page refresh.
- Open a private lesson with no notes — no notes section appears at all.
- Open a group class — no notes section, no note button.

- [ ] **Step 9: Commit**

```bash
git add "app/(portal)/instructor/schedule/page.tsx"
git commit -m "List a private lesson's existing notes in the event modal

Shows notes already attached to the lesson, newest first, each opening
the existing note detail modal. The list refreshes when a new note is
saved, so the instructor sees it land."
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| A. Shared class-type style module | Task 1, consumed in 2, 3, 6 |
| A. `block` collapses, `chip` does not | Task 1 (test asserts it), Task 6 step 1 |
| B. Unconditional note button | Task 6 steps 5 |
| B. Three-step student fallback | Task 4 (`resolveNoteTarget`), Task 6 step 4 |
| C. Notes from this lesson | Task 7 |
| C. `class_id` filter on GET /api/notes | Task 5 |
| D. State reset and race guard | Task 6 steps 2-3, Task 7 step 3 |
| Error handling table | Task 6 step 3 (enrollment), Task 6 step 4 (student list), Task 7 step 2 (notes) |
| Testing item 1 | Task 1 step 1 |
| Testing item 2 | Task 4 step 1 — covered as a pure unit test of `resolveNoteTarget` and `noteButtonLabel` rather than a page render. **Deviation from the spec**, which called for a component test. The page requires mocking `useUser`, `PortalLayout`, four fetches and the toast provider; the decision logic was extracted specifically so the regression could be tested directly. Task 6 step 8 covers the rendered path manually. |
| Testing item 3 | Task 5 step 3 — covered as manual verification rather than an automated test. **Deviation from the spec.** There is no existing API-route test harness in this repo (`tests/` holds setup and utils only, and every existing test is a pure-function test under `lib/utils/__tests__/`). Building one is out of scope for this change. |

**Placeholder scan:** No TBD/TODO. Every code step carries literal code. One step directs the implementer to confirm something against the codebase before writing (Task 2 step 5, on whether a `gray-` match is pre-existing grid chrome or an event block) — a verification instruction with a stated default, not unspecified work.

**Type consistency:** `NoteStudent` (Task 4) and `StudentForNotes` (existing, in the page) are both `{ id: string; full_name: string }` — noted in Task 6 step 4. `getClassTypeStyle` returns `ClassTypeStyle` in Tasks 1, 2, 3, 6 with consistent field names (`label`, `shortLabel`, `block`, `chip`, `dot`). `DetailNote` in Task 7 is imported from `NoteDetailModal`, which already exports it. `resolveNoteTarget` returns `{ students, initialStudentId }` in Task 4 and is destructured as `target.students` / `target.initialStudentId` in Task 6.
