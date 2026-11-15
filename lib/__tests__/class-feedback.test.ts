import { describe, expect, it } from 'vitest'
import {
  feedbackNoun,
  feedbackPrompts,
  formatFeedbackDates,
  generateFeedbackToken,
  isFeedbackToken,
  MAX_FEEDBACK_TEXT,
  nameConsentCopy,
  parseFeedback,
} from '../class-feedback'

describe('parseFeedback', () => {
  it('accepts stars alone', () => {
    const result = parseFeedback({ rating: 5 })
    expect(result).toEqual({
      ok: true,
      values: {
        name: null,
        rating: 5,
        show_name: false,
        do_again: null,
        more_of: null,
        less_of: null,
        outcomes: null,
        comments: null,
      },
    })
  })

  it('records name consent only for a literal true', () => {
    expect(parseFeedback({ rating: 4, show_name: true })).toMatchObject({ ok: true, values: { show_name: true } })
    for (const show_name of [false, 'true', 1, undefined]) {
      expect(parseFeedback({ rating: 4, show_name })).toMatchObject({ ok: true, values: { show_name: false } })
    }
  })

  it('accepts words alone, trimmed, with blanks as null', () => {
    const result = parseFeedback({ name: '  Ava ', more_of: ' turns! ', less_of: '   ' })
    expect(result.ok && result.values).toMatchObject({ name: 'Ava', rating: null, more_of: 'turns!', less_of: null })
  })

  it('refuses a form with no stars and no words', () => {
    expect(parseFeedback({ name: 'Ava', comments: '  ' })).toEqual({ ok: false, error: 'Add a star rating or a few words first' })
  })

  it.each([0, 6, 2.5, 'lots'])('refuses rating %j', rating => {
    expect(parseFeedback({ rating, comments: 'hi' }).ok).toBe(false)
  })

  it('treats a missing or empty rating as no rating', () => {
    expect(parseFeedback({ rating: '', comments: 'hi' })).toMatchObject({ ok: true, values: { rating: null } })
    expect(parseFeedback({ rating: null, comments: 'hi' })).toMatchObject({ ok: true, values: { rating: null } })
  })

  it('caps long answers and ignores non-strings', () => {
    const result = parseFeedback({ comments: 'x'.repeat(MAX_FEEDBACK_TEXT + 50), outcomes: 42 })
    expect(result.ok && result.values.comments?.length).toBe(MAX_FEEDBACK_TEXT)
    expect(result.ok && result.values.outcomes).toBeNull()
  })

  it('refuses a body that is not an object', () => {
    expect(parseFeedback(null).ok).toBe(false)
    expect(parseFeedback('rating=5').ok).toBe(false)
  })
})

describe('formatFeedbackDates', () => {
  it.each([
    [['2026-11-14T15:00:00Z'], 'November 14, 2026'],
    [['2026-11-15T15:00:00Z', '2026-11-14T15:00:00Z'], 'November 14 & 15, 2026'],
    [['2026-11-14T15:00:00Z', '2026-11-15T15:00:00Z', '2026-11-16T15:00:00Z'], 'November 14, 15 & 16, 2026'],
    [['2026-10-31T15:00:00Z', '2026-11-01T15:00:00Z'], 'October 31 & November 1, 2026'],
    [['2026-12-31T15:00:00Z', '2027-01-01T15:00:00Z'], 'December 31, 2026 & January 1, 2027'],
  ])('%j -> %j', (starts, label) => {
    expect(formatFeedbackDates(starts)).toBe(label)
  })

  it('uses the Eastern calendar day', () => {
    // 11pm ET on the 14th is already the 15th in UTC
    expect(formatFeedbackDates(['2026-11-15T04:00:00Z'])).toBe('November 14, 2026')
  })

  it('lists two classes on one day once', () => {
    expect(formatFeedbackDates(['2026-11-14T15:00:00Z', '2026-11-14T19:00:00Z'])).toBe('November 14, 2026')
  })

  it('is empty with no days', () => {
    expect(formatFeedbackDates([])).toBe('')
  })
})

describe('feedbackPrompts', () => {
  it('words the questions for the kind of class and the instructor', () => {
    const prompts = feedbackPrompts('workshop', 'Courtney Fisher')
    expect(prompts.map(p => p.field)).toEqual(['do_again', 'more_of', 'less_of', 'outcomes', 'comments'])
    expect(prompts[0].prompt).toContain('another workshop')
    expect(prompts[4].prompt).toContain('Courtney to make')
  })

  it.each([
    ['workshop', 'workshop'],
    ['private', 'lesson'],
    ['group', 'class'],
    ['master_class', 'class'],
  ])('%s is a %s', (type, noun) => {
    expect(feedbackNoun(type)).toBe(noun)
  })

  it('falls back when the instructor has no name', () => {
    expect(feedbackPrompts('group', null)[4].prompt).toContain('your instructor')
  })
})

describe('nameConsentCopy', () => {
  it('names the instructor and says what the box means either way', () => {
    const on = nameConsentCopy('Courtney Fisher', true)
    expect(on.explain).toMatch(/^Courtney may share feedback on the CPF Dance website/)
    expect(on.state).toBe('Uncheck to stay anonymous.')
    expect(nameConsentCopy('Courtney Fisher', false).state).toMatch(/stay anonymous if your feedback is shared/)
  })

  it('falls back when the instructor has no name', () => {
    expect(nameConsentCopy(null, true).explain).toMatch(/^Your instructor may share/)
  })
})

describe('feedback tokens', () => {
  it('generates tokens the pattern accepts', () => {
    const tokens = new Set(Array.from({ length: 200 }, generateFeedbackToken))
    expect(tokens.size).toBe(200)
    for (const token of tokens) expect(isFeedbackToken(token)).toBe(true)
  })

  it.each(['', 'abc', 'ABCDEFGHJK', 'abcdefghjk1', 'abcdefghi0', '../../etc', 'a3e1c2d4-0000'])('rejects %j', value => {
    expect(isFeedbackToken(value)).toBe(false)
  })
})
