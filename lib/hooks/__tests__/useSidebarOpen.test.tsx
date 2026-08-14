import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@/tests/utils'
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
