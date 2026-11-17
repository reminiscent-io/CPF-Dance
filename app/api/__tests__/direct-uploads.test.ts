// @vitest-environment node
// The voice route reads the recording back as a Blob and hands it to the
// OpenAI client as a File; under jsdom those globals are jsdom's.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { fakeSupabase, type Handler, type StorageHandler } from '../promo/__tests__/fake-supabase'

const ME = '11111111-1111-4111-8111-111111111111'
const SOMEONE_ELSE = '99999999-9999-4999-8999-999999999999'

const state = vi.hoisted(() => ({
  profile: null as { id: string; role: string } | null,
  session: null as unknown as ReturnType<typeof import('../promo/__tests__/fake-supabase').fakeSupabase>,
  admin: null as unknown as ReturnType<typeof import('../promo/__tests__/fake-supabase').fakeSupabase>,
  transcribe: vi.fn(),
  complete: vi.fn(),
}))

vi.mock('@/lib/auth/server-auth', () => ({ getCurrentUserWithRole: vi.fn(async () => state.profile) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(async () => state.session.client) }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => state.admin.client) }))
vi.mock('openai', () => {
  class APIError extends Error {
    constructor(readonly status: number) {
      super(`status ${status}`)
    }
  }
  class OpenAI {
    static APIError = APIError
    audio = { transcriptions: { create: state.transcribe } }
    chat = { completions: { create: state.complete } }
  }
  return { default: OpenAI }
})

import { POST as SAVE_ASSET } from '../assets/route'
import { POST as ASSET_UPLOAD_URL } from '../assets/upload-url/route'
import { POST as TRANSCRIBE } from '../voice-to-notes/route'
import { POST as VOICE_UPLOAD_URL } from '../voice-to-notes/upload-url/route'

function post(url: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setup({ session = () => undefined, admin = () => undefined, storage }: { session?: Handler; admin?: Handler; storage?: StorageHandler } = {}) {
  state.session = fakeSupabase(session)
  state.admin = fakeSupabase(admin, storage)
}

const storageMethods = () => state.admin.storageCalls.map((call) => call.method)
const removedPaths = () =>
  state.admin.storageCalls.filter((call) => call.method === 'remove').flatMap((call) => call.args[0] as string[])

beforeEach(() => {
  state.profile = { id: ME, role: 'instructor' }
  state.transcribe.mockReset()
  state.complete.mockReset()
  vi.stubEnv('OPENAI_API_KEY', 'sk-test')
  setup()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/assets/upload-url', () => {
  const ask = (body: unknown) => ASSET_UPLOAD_URL(post('/api/assets/upload-url', body))

  it('gives an instructor a signed upload in her own folder', async () => {
    const response = await ask({ fileName: 'Recital Flyer.PDF', contentType: 'application/pdf', size: 8_000_000 })
    expect(response.status).toBe(200)
    const { target } = await response.json()
    expect(target).toMatchObject({ bucket: 'assets', token: 'upload-token' })
    expect(target.path).toMatch(new RegExp(`^${ME}/\\d+-[a-z0-9]+\\.pdf$`))
  })

  it('refuses dancers, wrong types and oversized files before minting anything', async () => {
    state.profile = { id: ME, role: 'dancer' }
    expect((await ask({ fileName: 'a.pdf', contentType: 'application/pdf', size: 10 })).status).toBe(401)
    state.profile = { id: ME, role: 'instructor' }
    expect((await ask({ fileName: 'a.html', contentType: 'text/html', size: 10 })).status).toBe(400)
    expect((await ask({ fileName: 'a.pdf', contentType: 'application/pdf', size: 11 * 1024 * 1024 })).status).toBe(400)
    expect(state.admin.storageCalls).toHaveLength(0)
  })
})

describe('POST /api/assets', () => {
  const PATH = `${ME}/1731800000000-abc123.pdf`
  const save = (body: unknown) => SAVE_ASSET(post('/api/assets', body))
  const storedAs = (info: { contentType: string; size: number }): StorageHandler => (call) =>
    call.method === 'info' ? { data: info, error: null } : undefined

  it('saves a file Storage holds, using the size and type Storage recorded', async () => {
    setup({
      session: (query) => (query.table === 'assets' ? { data: { id: 'asset-1' }, error: null } : undefined),
      storage: storedAs({ contentType: 'application/pdf', size: 8_000_000 }),
    })
    const response = await save({ path: PATH, title: 'Recital flyer' })
    expect(response.status).toBe(201)
    const insert = state.session.queries.find((query) => query.action === 'insert')!
    expect(insert.payload).toEqual({
      title: 'Recital flyer',
      file_url: `https://cdn.test/assets/${PATH}`,
      file_type: 'application/pdf',
      file_size: 8_000_000,
      instructor_id: ME,
    })
    expect(removedPaths()).toEqual([])
  })

  it('refuses a path outside her folder without touching it', async () => {
    for (const path of [`${SOMEONE_ELSE}/x.pdf`, `${ME}/../${SOMEONE_ELSE}/x.pdf`, `${ME}/sub/x.pdf`]) {
      expect((await save({ path, title: 'x' })).status).toBe(400)
    }
    expect(state.admin.storageCalls).toHaveLength(0)
  })

  it('says so when the file never arrived', async () => {
    const response = await save({ path: PATH, title: 'x' })
    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/didn’t arrive/)
    expect(state.session.queries).toHaveLength(0)
  })

  it('removes a stored file of the wrong type', async () => {
    setup({ storage: storedAs({ contentType: 'text/html', size: 100 }) })
    expect((await save({ path: PATH, title: 'x' })).status).toBe(400)
    expect(removedPaths()).toEqual([PATH])
    expect(state.session.queries).toHaveLength(0)
  })

  it('removes the file when the row can’t be saved', async () => {
    setup({
      session: (query) => (query.table === 'assets' ? { data: null, error: { message: 'boom' } } : undefined),
      storage: storedAs({ contentType: 'image/png', size: 100 }),
    })
    expect((await save({ path: PATH, title: 'x' })).status).toBe(500)
    expect(removedPaths()).toEqual([PATH])
  })
})

describe('POST /api/voice-to-notes/upload-url', () => {
  const ask = () => VOICE_UPLOAD_URL(post('/api/voice-to-notes/upload-url', { size: 40_000 }))

  it('gives a signed upload in her folder of the private bucket and sweeps abandoned recordings', async () => {
    const now = Date.now()
    setup({
      storage: (call) =>
        call.method === 'list'
          ? {
              data: [
                { name: 'abandoned.webm', created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
                { name: 'in-flight.webm', created_at: new Date(now - 60 * 1000).toISOString() },
              ],
              error: null,
            }
          : undefined,
    })
    const response = await ask()
    expect(response.status).toBe(200)
    const { target } = await response.json()
    expect(target.bucket).toBe('voice-notes')
    expect(target.path).toMatch(new RegExp(`^${ME}/[0-9a-f-]{36}\\.webm$`))
    expect(removedPaths()).toEqual([`${ME}/abandoned.webm`])
  })

  it('refuses before minting when voice notes are off or not hers to use', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    expect((await ask()).status).toBe(503)
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    state.profile = { id: ME, role: 'guardian' }
    expect((await ask()).status).toBe(403)
    state.profile = null
    expect((await ask()).status).toBe(401)
    expect(state.admin.storageCalls).toHaveLength(0)
  })

  it('refuses a recording over Whisper’s limit', async () => {
    const response = await VOICE_UPLOAD_URL(post('/api/voice-to-notes/upload-url', { size: 26 * 1024 * 1024 }))
    expect(response.status).toBe(400)
    expect(storageMethods()).not.toContain('createSignedUploadUrl')
  })
})

describe('POST /api/voice-to-notes', () => {
  const PATH = `${ME}/0f8fad5b-d9cb-469f-a165-70867728950e.webm`
  const transcribe = (path: unknown = PATH) => TRANSCRIBE(post('/api/voice-to-notes', { path }))
  const recording: StorageHandler = (call) =>
    call.method === 'download' ? { data: new Blob([new Uint8Array(40_000)], { type: 'audio/webm' }), error: null } : undefined

  it('transcribes the stored recording, then deletes it', async () => {
    setup({ storage: recording })
    state.transcribe.mockResolvedValue('hold the arabesque through eight')
    state.complete.mockResolvedValue({ choices: [{ message: { content: '<p>Hold the arabesque through eight.</p>' } }] })

    const response = await transcribe()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ html: '<p>Hold the arabesque through eight.</p>', success: true })
    const sent = state.transcribe.mock.calls[0][0].file as File
    expect(sent.name).toBe('audio.webm')
    expect(sent.size).toBe(40_000)
    expect(removedPaths()).toEqual([PATH])
  })

  it('deletes the recording even when transcription fails', async () => {
    setup({ storage: recording })
    state.transcribe.mockRejectedValue(new Error('whisper down'))
    expect((await transcribe()).status).toBe(500)
    expect(removedPaths()).toEqual([PATH])
  })

  it('refuses a path outside her folder without reading or deleting it', async () => {
    setup({ storage: recording })
    expect((await transcribe(`${SOMEONE_ELSE}/x.webm`)).status).toBe(400)
    expect((await transcribe(null)).status).toBe(400)
    expect(state.admin.storageCalls).toHaveLength(0)
    expect(state.transcribe).not.toHaveBeenCalled()
  })

  it('says so when the recording never arrived', async () => {
    const response = await transcribe()
    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/didn’t arrive/)
    expect(state.transcribe).not.toHaveBeenCalled()
  })
})
