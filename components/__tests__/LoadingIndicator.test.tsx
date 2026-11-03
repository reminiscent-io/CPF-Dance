import { describe, it, expect, afterEach, vi } from 'vitest'
import { act, render, screen } from '@/tests/utils'
import { LoadingIndicator, SLOW_NAVIGATION_MS } from '@/components/LoadingIndicator'
import { beginNavigation, endNavigation } from '@/lib/loading-activity'

function bar(container: HTMLElement) {
  return container.querySelector('.loading-bar') as HTMLElement
}

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => online })
  window.dispatchEvent(new Event(online ? 'online' : 'offline'))
}

describe('LoadingIndicator', () => {
  afterEach(() => {
    act(() => endNavigation())
    act(() => setOnline(true))
    vi.useRealTimers()
  })

  it('runs the bar while a navigation is pending', () => {
    const { container } = render(<LoadingIndicator />)
    expect(bar(container)).not.toHaveAttribute('data-active')

    act(() => beginNavigation('/dancer/classes'))
    expect(bar(container)).toHaveAttribute('data-active')

    act(() => endNavigation())
    expect(bar(container)).not.toHaveAttribute('data-active')
  })

  it('says "Still loading…" once a navigation runs long', () => {
    vi.useFakeTimers()
    render(<LoadingIndicator />)

    act(() => beginNavigation('/dancer/schedule'))
    act(() => vi.advanceTimersByTime(SLOW_NAVIGATION_MS - 1))
    expect(screen.queryByText('Still loading…')).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('status')).toHaveTextContent('Still loading…')

    act(() => endNavigation())
    expect(screen.queryByText('Still loading…')).not.toBeInTheDocument()
  })

  it('does not carry a slow notice over to the next navigation', () => {
    vi.useFakeTimers()
    render(<LoadingIndicator />)

    act(() => beginNavigation('/dancer/schedule'))
    act(() => vi.advanceTimersByTime(SLOW_NAVIGATION_MS))
    act(() => endNavigation())

    act(() => beginNavigation('/dancer/notes'))
    expect(screen.queryByText('Still loading…')).not.toBeInTheDocument()
  })

  it('tells the user when the device goes offline', () => {
    render(<LoadingIndicator />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()

    act(() => setOnline(false))
    expect(screen.getByRole('status')).toHaveTextContent("You're offline. Check your signal and try again.")

    act(() => setOnline(true))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
