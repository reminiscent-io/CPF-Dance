import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@/tests/utils'
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
    let call = 0
    const fetcher = vi.fn(() => {
      call += 1
      const isStale = call === 1
      return new Promise<string>(resolve => {
        setTimeout(() => resolve(isStale ? 'stale' : 'fresh'), isStale ? 50 : 0)
      })
    })
    const { rerender } = render(<Probe fetcher={fetcher} token="a" />)
    rerender(<Probe fetcher={fetcher} token="b" />)
    await waitFor(() => expect(screen.getByTestId('data')).toHaveTextContent('fresh'))
    await new Promise(r => setTimeout(r, 90))
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
