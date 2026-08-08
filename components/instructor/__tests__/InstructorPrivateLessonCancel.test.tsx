import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { InstructorPrivateLessonCancel } from '@/components/instructor/InstructorPrivateLessonCancel'

const BASE_TIME = new Date('2026-08-06T12:00:00.000Z')
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

function renderCancel(startTimeIso: string) {
  return render(
    <ToastProvider>
      <InstructorPrivateLessonCancel
        classId="class-1"
        startTimeIso={startTimeIso}
        onCancelled={vi.fn()}
      />
    </ToastProvider>
  )
}

function lastCancelPayload(fetchMock: ReturnType<typeof vi.fn>) {
  const [, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
  return JSON.parse(init.body as string)
}

describe('InstructorPrivateLessonCancel cancellation window', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    vi.setSystemTime(BASE_TIME)
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ creditOutcome: 'forfeited' })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('offers the reinstate choice once the lesson crosses into the 24-hour window', async () => {
    // Two minutes outside the window at first render.
    const startTime = new Date(BASE_TIME.getTime() + TWENTY_FOUR_HOURS_MS + 2 * 60_000)

    renderCancel(startTime.toISOString())
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Private Lesson' }))

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    // The tab sits open past the 24-hour boundary.
    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000)
    })

    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByText('Inside 24 hours.')).toBeInTheDocument()
  })

  it('does not reinstate the credit the instructor never opted into', async () => {
    // Two minutes outside the window at first render.
    const startTime = new Date(BASE_TIME.getTime() + TWENTY_FOUR_HOURS_MS + 2 * 60_000)

    renderCancel(startTime.toISOString())
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Private Lesson' }))

    // The tab sits open past the 24-hour boundary, then the instructor confirms
    // without ticking the reinstate box.
    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000)
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel lesson' }))
    })

    expect(lastCancelPayload(fetchMock).reinstate_credit).toBe(false)
  })
})
