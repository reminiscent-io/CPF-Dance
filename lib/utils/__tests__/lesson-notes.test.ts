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
