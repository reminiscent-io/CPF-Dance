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
