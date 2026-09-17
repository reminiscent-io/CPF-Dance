import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  act,
  fireEvent,
  createMockResponse,
  createErrorResponse,
} from '@/tests/utils'
import { VoiceRecorder } from '@/components/VoiceRecorder'

// jsdom has neither getUserMedia nor MediaRecorder. The fakes below model what
// VoiceRecorder relies on, including the MediaRecorder spec's ordering for
// stop(): state flips to 'inactive' right away, then a queued task fires
// 'dataavailable' with the audio gathered since the last timeslice, then 'stop'.

const BYTES_PER_SECOND = 4000

class FakeBlobEvent extends Event {
  constructor(type: string, readonly data: Blob) {
    super(type)
  }
}

class FakeMediaRecorder extends EventTarget {
  static instances: FakeMediaRecorder[] = []

  static isTypeSupported(mimeType: string) {
    return mimeType.startsWith('audio/webm')
  }

  state: RecordingState = 'inactive'
  started = false
  ondataavailable: ((event: FakeBlobEvent) => void) | null = null
  onstop: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  private sliceTimer: ReturnType<typeof setInterval> | undefined
  private gatheringSince = 0

  constructor(readonly stream: MediaStream, readonly options?: MediaRecorderOptions) {
    super()
    // Event handler attributes behave like listeners registered up front.
    this.addEventListener('dataavailable', event => this.ondataavailable?.(event as FakeBlobEvent))
    this.addEventListener('stop', event => this.onstop?.(event))
    this.addEventListener('error', event => this.onerror?.(event))
    FakeMediaRecorder.instances.push(this)
  }

  start(timeslice?: number) {
    this.state = 'recording'
    this.started = true
    this.gatheringSince = Date.now()
    if (timeslice) {
      this.sliceTimer = setInterval(() => {
        this.dispatchEvent(new FakeBlobEvent('dataavailable', this.takeGathered()))
      }, timeslice)
    }
  }

  stop() {
    if (this.state === 'inactive') return
    this.state = 'inactive'
    clearInterval(this.sliceTimer)
    const tail = this.takeGathered()
    setTimeout(() => {
      this.dispatchEvent(new FakeBlobEvent('dataavailable', tail))
      this.dispatchEvent(new Event('stop'))
    }, 0)
  }

  private takeGathered() {
    const bytes = ((Date.now() - this.gatheringSince) / 1000) * BYTES_PER_SECOND
    this.gatheringSince = Date.now()
    return new Blob([new Uint8Array(bytes)], { type: 'audio/webm' })
  }
}

function fakeMicStream() {
  const track = {
    kind: 'audio',
    readyState: 'live' as MediaStreamTrackState,
    stop() {
      this.readyState = 'ended'
    },
  }
  return { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream
}

function trackStates(stream: MediaStream) {
  return stream.getTracks().map(track => track.readyState)
}

function recordersStarted() {
  return FakeMediaRecorder.instances.filter(recorder => recorder.started).length
}

function stubGetUserMedia(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(getUserMedia) },
  })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })
  return { promise, resolve }
}

async function clickVoiceToText() {
  fireEvent.click(screen.getByRole('button', { name: 'Voice to Text' }))
  await act(async () => {})
}

async function recordFor(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

// Runs the task stop() queued: the final 'dataavailable', then 'stop'.
async function deliverQueuedRecorderEvents() {
  await act(async () => {
    vi.advanceTimersByTime(0)
  })
}

describe('VoiceRecorder', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let stream: MediaStream

  beforeEach(() => {
    vi.useFakeTimers()
    FakeMediaRecorder.instances = []
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    stream = fakeMicStream()
    stubGetUserMedia(async () => stream)
    // What the dev server answers without OPENAI_API_KEY.
    fetchMock = vi.fn(async () =>
      createErrorResponse('Voice notes feature is not configured. Please contact support.', 503)
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'mediaDevices')
    vi.useRealTimers()
  })

  it.each([
    // No timeslice has passed, so the tail is a complete WebM file the server
    // would transcribe straight into the note.
    {
      heldForMs: 600,
      respond: () => createMockResponse({ html: '<p>I did not mean to keep this.</p>', success: true }),
    },
    // The tail has no WebM header, so transcription fails.
    {
      heldForMs: 2500,
      respond: () => createErrorResponse('Failed to process voice note. Please try again.', 500),
    },
  ])('Cancel after $heldForMs ms uploads nothing and leaves no trace', async ({ heldForMs, respond }) => {
    fetchMock.mockImplementation(async () => respond())
    const onTranscriptReady = vi.fn()
    const { container } = render(<VoiceRecorder onTranscriptReady={onTranscriptReady} />)
    const idleText = container.textContent

    await clickVoiceToText()
    await recordFor(heldForMs)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await deliverQueuedRecorderEvents()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(onTranscriptReady).not.toHaveBeenCalled()
    expect(container.textContent).toBe(idleText)
    expect(trackStates(stream)).toEqual(['ended'])
  })

  it('Stop uploads the whole recording and releases the mic', async () => {
    fetchMock.mockImplementation(async () =>
      createMockResponse({ html: '<p>Spot the corner on every fouetté.</p>', success: true })
    )
    const onTranscriptReady = vi.fn()
    render(<VoiceRecorder onTranscriptReady={onTranscriptReady} />)

    await clickVoiceToText()
    await recordFor(2500)
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    await deliverQueuedRecorderEvents()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/voice-to-notes')
    expect(init.method).toBe('POST')
    // Two 1 s timeslices (4000 bytes each) plus the 500 ms tail stop() flushes.
    expect(((init.body as FormData).get('audio') as File).size).toBe(10_000)
    expect(onTranscriptReady).toHaveBeenCalledWith('<p>Spot the corner on every fouetté.</p>')
    expect(trackStates(stream)).toEqual(['ended'])
  })

  it('discards the recording when the modal closes mid-recording', async () => {
    const onTranscriptReady = vi.fn()
    const { unmount } = render(<VoiceRecorder onTranscriptReady={onTranscriptReady} />)

    await clickVoiceToText()
    await recordFor(2500)
    unmount()
    await deliverQueuedRecorderEvents()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(trackStates(stream)).toEqual(['ended'])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('releases the mic when the modal closes while the permission prompt is open', async () => {
    const prompt = deferred<MediaStream>()
    stubGetUserMedia(() => prompt.promise)
    const { unmount } = render(<VoiceRecorder onTranscriptReady={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Voice to Text' }))
    unmount()
    // The user answers the prompt after the modal is gone.
    await act(async () => prompt.resolve(stream))

    expect(trackStates(stream)).toEqual(['ended'])
    expect(recordersStarted()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('records once when Voice to Text is clicked again while the prompt is open', async () => {
    const firstPrompt = deferred<MediaStream>()
    const secondPrompt = deferred<MediaStream>()
    const prompts = [firstPrompt.promise, secondPrompt.promise]
    stubGetUserMedia(() => prompts.shift()!)
    render(<VoiceRecorder onTranscriptReady={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Voice to Text' }))
    fireEvent.click(screen.getByRole('button', { name: 'Voice to Text' }))
    const firstStream = fakeMicStream()
    const secondStream = fakeMicStream()
    await act(async () => firstPrompt.resolve(firstStream))
    await act(async () => secondPrompt.resolve(secondStream))

    expect(recordersStarted()).toBe(1)
    expect([...trackStates(firstStream), ...trackStates(secondStream)].sort()).toEqual(['ended', 'live'])

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await deliverQueuedRecorderEvents()

    expect([...trackStates(firstStream), ...trackStates(secondStream)]).toEqual(['ended', 'ended'])
    expect(vi.getTimerCount()).toBe(0)
  })
})
