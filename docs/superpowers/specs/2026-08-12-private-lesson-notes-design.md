# Private Lesson Notes on the Instructor Calendar

**Date:** 2026-08-12
**Status:** Approved, ready for planning
**Mockup:** https://claude.ai/code/artifact/65035c33-8c1d-48c4-bde8-362ebdd3325f

## Problem

An instructor can no longer reliably click a private lesson on the calendar and write a
note attached to that lesson's student. Separately, private lessons do not read as
distinct from any other class type on the calendar.

These are two independent defects that happen to surface on the same screen.

### Defect 1 — the note button is gated on enrollment data

`app/(portal)/instructor/schedule/page.tsx:622` renders the note button only when
`enrolledStudents.length > 0`:

```tsx
{selectedEvent.class_type === 'private' && enrolledStudents.length > 0 && (
  <Button onClick={handleCreateNote} ...>
```

`enrolledStudents` is populated from `GET /api/classes/[id]/enrollments`. It is empty in
two situations:

1. **The lesson has no enrollment row.** Student selection is optional when creating a
   private lesson — `app/(portal)/instructor/classes/page.tsx:1936` labels the field
   "Student (Optional)". Any private lesson created without picking a student has no
   `enrollments` row, so its note button never appears.
2. **The fetch failed.** `fetchEnrolledStudents` swallows errors into
   `setEnrolledStudents([])`, which is indistinguishable from "no students enrolled".

In both cases the button vanishes with no explanation. This is the reported regression.

### Defect 2 — two calendars, two unrelated color maps

`components/Calendar.tsx:16-23` (desktop) uses stock Tailwind defaults — purple, blue,
green, amber, fuchsia — none of which exist in the Ballet Noir palette. This is a direct
DESIGN.md violation.

`components/MobileCalendar.tsx:53-61` uses real palette tokens, but private
(`ballet-pink-100`, `#f5e8ea`) against group (`champagne-100`, `#f5f1ea`) differ by three
hex digits. At calendar-block size they are the same color.

The two files also maintain three parallel lookup tables (`CLASS_TYPE_DOT`,
`CLASS_TYPE_BG`, `CLASS_TYPE_STYLE`) plus a fourth label map, none shared with desktop.

## Goals

1. The note button appears on every private lesson, unconditionally.
2. A note written from the calendar is bound to both the lesson (`class_id`) and a student
   (`student_id`) in every path.
3. Private lessons are visually distinct from every other class type on both calendars.
4. One source of truth for class-type presentation.

## Non-goals

- **Notes on non-private classes.** Group classes, workshops, master classes and
  competition choreography keep their current modal unchanged. Notes for those continue to
  go through the student page and the notes page.
- **Making student selection mandatory at lesson creation.** The optional field stays
  optional; the note flow adapts to it rather than the reverse.
- **Individual colors for non-private class types.** See "Deliberate departures".

## Design

### A. Shared class-type style module

New file `lib/utils/class-type-styles.ts` becomes the single source of truth for how a
class type presents anywhere in the product.

```ts
export type ClassType =
  | 'private' | 'group' | 'workshop'
  | 'master_class' | 'competition_choreography' | 'personal'

export interface ClassTypeStyle {
  label: string   // "Private Lesson", "Group Class", ...
  block: string   // calendar block: fill + hairline + text
  chip: string    // Badge chip inside modals and lists
  dot: string     // small marker for MobileCalendar day dots
}

export function getClassTypeStyle(type: string): ClassTypeStyle
export function getClassTypeLabel(type: string): string
export const CANCELLED_BLOCK_STYLE: string
```

Unknown types fall back to the neutral style rather than throwing.

**Token values:**

| Role | Fill | Hairline | Text |
|---|---|---|---|
| Private | `ballet-pink-100` `#f5e8ea` | `ballet-pink-200` `#ebd2d6` | `ballet-pink-800` `#7a4652` |
| Everything else | `champagne-100` `#f5f1ea` | `champagne-300` `#dfd4c3` | `charcoal-800` `#2d2d2d` |
| Cancelled | `champagne-200` `#ebe4d8` | `champagne-300` `#dfd4c3` | `charcoal-400` `#666666`, 60% opacity |

Contrast: private text on private fill is 6.09:1; neutral text on neutral fill is 12.1:1.
Both clear WCAG AA for the small type used in calendar blocks.

Dots: private `bg-ballet-pink-500`, all others `bg-champagne-500`.

The cancelled style takes precedence over the class-type style, matching current behavior
in both calendars.

**`block` collapses; `chip` does not.** The collapse to two tones applies to `block` — the
calendar surface, where many class types are scanned at once and the distinction has to
survive a 10px cell. `chip` keeps its current per-type treatment, including the Curtain
Gilt badge on master class (`app/(portal)/instructor/schedule/page.tsx:239`), because a
chip appears in a modal or list row showing one class at a time, where there is nothing to
scan against and DESIGN.md's gilt-for-premium intent still applies.

### B. The note button becomes unconditional on private lessons

The render condition drops to `selectedEvent.class_type === 'private'`. The student source
degrades in three steps:

| Enrolled students | Button label | Student field in AddNoteModal |
|---|---|---|
| Exactly 1 | `Create note for {firstName}` | Preselected and locked (current behavior) |
| 0, or the enrollment fetch failed | `Add note` | Full active-student list |
| 2 or more | `Add note` | Dropdown limited to the enrolled students |

`handleCreateNote` becomes async:

1. If `enrolledStudents.length > 0`, pass those as the modal's student list.
2. Otherwise fetch `GET /api/students?is_active=true` and map to `{ id, full_name }`. If
   that request fails, show an error toast and leave the event modal open — never open a
   note modal with an empty student list.
3. `initialStudentId` is set only when exactly one student is enrolled.
4. `initialClassId` is always `selectedEvent.id`.

`handleSubmitNote` already posts `class_id: selectedEvent.id` and needs no change beyond
refreshing the notes list on success.

`AddNoteModal` requires no changes — it already accepts a `students` array plus
`initialStudentId` and `initialClassId`, and disables the select when `initialStudentId`
is set.

### C. Notes from this lesson

A new section in the event modal, between the student roster and the action stack, listing
notes already attached to this lesson. Each row shows title (falling back to the first
line of content), a visibility chip, and the created date. Rows are ordered newest first.

Clicking a row opens the existing `NoteDetailModal`, which already accepts a `DetailNote`
carrying `class_id`.

Visibility chip labels: `private` → "Private", `shared_with_student` → "Shared",
`shared_with_guardian` → "Guardian", `shared_with_instructor` → "Instructor".

The section is omitted entirely when the lesson has no notes — no empty state, since the
absence of the section is itself the signal and the modal is already tall.

The list refreshes after `handleSubmitNote` succeeds, so a newly written note appears
immediately.

**API change.** `GET /api/notes` currently filters on `student_id`, `visibility` and `tag`
(`app/api/notes/route.ts:17-19`). Add a `class_id` filter:

```ts
const classId = searchParams.get('class_id')
...
if (classId) {
  query = query.eq('class_id', classId)
}
```

No additional authorization is needed. RLS already scopes which notes the caller can read,
and the existing dancer-visibility restriction stays in place. Per CLAUDE.md, do not add a
redundant `author_id` filter.

### D. State reset and race guard

`enrolledStudents` currently persists across modal opens. Clicking lesson A then lesson B
renders A's roster while B's fetch is in flight.

`handleEventClick` resets both `enrolledStudents` and the new `lessonNotes` before
fetching. A ref holds the class id of the most recent click; fetch responses whose class id
no longer matches the ref are discarded, so a slow response for lesson A cannot overwrite
lesson B's data.

The two fetches (enrollments, notes) run concurrently via `Promise.all`.

## Data flow

```
click private lesson
  → setSelectedEvent(event), clear enrolledStudents + lessonNotes, set activeClassIdRef
  → Promise.all([
       GET /api/classes/{id}/enrollments,
       GET /api/notes?class_id={id}
     ])
  → discard if activeClassIdRef.current !== id
  → modal renders: meta, roster, notes list, note button

click note button
  → enrolledStudents.length ? use them : GET /api/students?is_active=true
  → open AddNoteModal (initialClassId = lesson id, initialStudentId if exactly one)

submit note
  → POST /api/notes { ...data, class_id }
  → refetch GET /api/notes?class_id={id}
  → close AddNoteModal, reopen event modal, success toast
```

## Error handling

| Failure | Behavior |
|---|---|
| Enrollment fetch fails | Roster section hidden. Note button still renders, falling back to the full student list. This is the key behavioral change — a failed fetch no longer removes the button. |
| Notes fetch fails | Notes section omitted. No error surfaced; it is supplementary information and the modal's primary job still works. |
| Student list fetch fails | Error toast, event modal stays open, note modal does not open. |
| Note POST fails | Existing behavior — error toast, note modal closes. |

## Testing

1. **`lib/utils/__tests__/class-type-styles.test.ts`** — private's `block` string differs
   from every other type's; all non-private types resolve to an identical `block` string;
   an unrecognized type falls back to neutral; every known `ClassType` has a non-empty
   label.
2. **Schedule page component test** — a private lesson with zero enrolled students renders
   the note button. This is the exact regression, and the test that would have caught it.
   A second case asserts the button also renders when the enrollment fetch rejects.
3. **`GET /api/notes?class_id=` test** — returns only notes for the given class, and
   combines correctly with an existing `student_id` filter.

Verification before completion: `npm run test:run`, `npm run lint`, `npm run build`.

## Deliberate departures

Two choices depart from the letter of DESIGN.md. Both were reviewed and accepted.

**Rose exceeds the One Ribbon budget on private-heavy weeks.** DESIGN.md caps Stage Rose
at roughly 10% of a screen at rest. On a realistic teaching month, private lessons are
about a third of calendar blocks. The rule governs decorative accent; here rose is a data
encoding, and the encoding is the feature being asked for. Rose stays the only accent on
the surface, so the spirit of the rule — one ribbon, not several — holds.

**Non-private class types lose individual colors.** Workshop, master class, competition
choreography, group and personal all collapse to the same champagne. This follows directly
from the requirement that private be distinct from *all* other classes, and it is what
makes the distinction legible at month-cell density.

## Files

| File | Change |
|---|---|
| `lib/utils/class-type-styles.ts` | New. Label, block, chip and dot styles per class type. |
| `components/Calendar.tsx` | Delete `CLASS_TYPE_STYLES` and `DEFAULT_CLASS_TYPE_STYLE`; consume the shared module. |
| `components/MobileCalendar.tsx` | Delete `CLASS_TYPE_DOT`, `CLASS_TYPE_BG`, `CLASS_TYPE_STYLE`, `CLASS_TYPE_LABEL`; consume the shared module. |
| `app/(portal)/instructor/schedule/page.tsx` | Ungate the note button; student fallback; notes section; state reset and race guard; consume shared module for the chip style. |
| `app/api/notes/route.ts` | Accept `class_id` on GET. |
| `lib/utils/__tests__/class-type-styles.test.ts` | New. Style map tests. |

`components/AddNoteModal.tsx` and `components/NoteDetailModal.tsx` are unchanged.
