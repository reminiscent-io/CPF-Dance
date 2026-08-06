import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { PrivateLessonActions } from '@/components/dancer/PrivateLessonActions'

const BASE_TIME = new Date('2026-08-06T12:00:00.000Z')
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

function renderActions(startTimeIso: string) {
  return render(
    <ToastProvider>
      <PrivateLessonActions
        classId="class-1"
        startTimeIso={startTimeIso}
        onCancelled={vi.fn()}
        onRescheduleRequested={vi.fn()}
      />
    </ToastProvider>
  )
}

describe('PrivateLessonActions cancellation window', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    vi.setSystemTime(BASE_TIME)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('warns about credit forfeiture once the lesson falls inside the 24-hour window', async () => {
    // Two minutes outside the window at first render.
    const startTime = new Date(BASE_TIME.getTime() + TWENTY_FOUR_HOURS_MS + 2 * 60_000)

    renderActions(startTime.toISOString())
    fireEvent.click(screen.getByRole('button', { name: 'Cancel lesson' }))

    expect(screen.getByText('Your credit will be refunded back to your pack.')).toBeInTheDocument()

    // The tab sits open past the 24-hour boundary.
    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000)
    })

    expect(screen.getByText('forfeit your credit')).toBeInTheDocument()
    expect(
      screen.queryByText('Your credit will be refunded back to your pack.')
    ).not.toBeInTheDocument()
  })
})
