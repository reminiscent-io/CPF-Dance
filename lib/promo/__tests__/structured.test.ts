import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import OpenAI from 'openai'

const create = vi.fn()
const logAiCall = vi.fn(async (_entry: Record<string, unknown>) => 'call-1')

vi.mock('../ai/log', () => ({ logAiCall: (entry: Record<string, unknown>) => logAiCall(entry) }))
vi.mock('openai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('openai')>()
  class FakeOpenAI extends actual.default {
    // jsdom looks like a browser to the SDK; the real client only runs on the server.
    constructor(options: ConstructorParameters<typeof actual.default>[0]) {
      super({ ...options, dangerouslyAllowBrowser: true })
      Object.assign(this, { responses: { create } })
    }
  }
  return { ...actual, default: FakeOpenAI, OpenAI: FakeOpenAI }
})

const Schema = z.object({ title: z.string() })

function reply(text: string, overrides: Record<string, unknown> = {}) {
  return {
    status: 'completed',
    incomplete_details: null,
    output: [{ type: 'message', content: [{ type: 'output_text', text }] }],
    output_text: text,
    usage: { input_tokens: 1000, input_tokens_details: { cached_tokens: 200 }, output_tokens: 500 },
    ...overrides,
  }
}

// The module remembers a rejected primary model, so each test loads a fresh copy.
async function load() {
  vi.resetModules()
  return import('../ai/structured')
}

const call = {
  ownerId: 'owner-1',
  kind: 'generate' as const,
  schema: Schema,
  schemaName: 'test',
  instructions: 'Write a title.',
  input: 'Precision workshop',
}

beforeEach(() => {
  create.mockReset()
  logAiCall.mockClear()
  vi.stubEnv('OPENAI_API_KEY', 'test-key')
  vi.stubEnv('PROMO_TEXT_MODEL', 'gpt-4.1-mini')
  vi.stubEnv('PROMO_TEXT_FALLBACK_MODEL', 'gpt-4.1-nano')
})

describe('callStructured', () => {
  it('returns parsed data and logs tokens with the estimated cost', async () => {
    const { callStructured } = await load()
    create.mockResolvedValueOnce(reply('{"title":"Precision Workshop"}'))
    const result = await callStructured(call)
    expect(result.data).toEqual({ title: 'Precision Workshop' })
    expect(result.costMicros).toBe(1140)
    expect(create.mock.calls[0][0]).toMatchObject({ model: 'gpt-4.1-mini', store: false })
    expect(create.mock.calls[0][0].reasoning).toBeUndefined()
    expect(logAiCall).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok', inputTokens: 1000, cachedInputTokens: 200, outputTokens: 500, costMicros: 1140 })
    )
  })

  it('logs the spend of a cut-off reply and reports it as incomplete', async () => {
    const { callStructured } = await load()
    create.mockResolvedValueOnce(
      reply('{"title":"Prec', { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } })
    )
    await expect(callStructured(call)).rejects.toMatchObject({ status: 502, code: 'incomplete_max_output_tokens' })
    expect(logAiCall).toHaveBeenCalledWith(expect.objectContaining({ status: 'invalid', costMicros: 1140 }))
  })

  it('rejects replies that do not match the schema', async () => {
    const { callStructured } = await load()
    create.mockResolvedValueOnce(reply('{"headline":"Wrong key"}'))
    await expect(callStructured(call)).rejects.toMatchObject({ code: 'schema_mismatch' })
  })

  it('falls back once when the primary model is rejected, then stays on the fallback', async () => {
    const { callStructured } = await load()
    create
      .mockRejectedValueOnce(new OpenAI.NotFoundError(404, { message: 'model not found' }, 'model not found', new Headers()))
      .mockResolvedValueOnce(reply('{"title":"A"}'))
      .mockResolvedValueOnce(reply('{"title":"B"}'))
    expect((await callStructured(call)).model).toBe('gpt-4.1-nano')
    expect((await callStructured(call)).data).toEqual({ title: 'B' })
    expect(create.mock.calls.map(([body]) => body.model)).toEqual(['gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4.1-nano'])
    expect(logAiCall).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', errorCode: 'http_404' }))
  })

  it('retries a rate limit once, logging both attempts, then explains it', async () => {
    const { callStructured } = await load()
    const limited = () => new OpenAI.RateLimitError(429, { message: 'slow down' }, 'slow down', new Headers())
    create.mockRejectedValueOnce(limited()).mockRejectedValueOnce(limited())
    await expect(callStructured(call)).rejects.toMatchObject({ status: 429, code: 'rate_limited' })
    expect(create).toHaveBeenCalledTimes(2)
    expect(logAiCall.mock.calls.filter(([entry]) => entry.errorCode === 'http_429')).toHaveLength(2)
  })

  it('recovers from one dropped connection', async () => {
    const { callStructured } = await load()
    create
      .mockRejectedValueOnce(new OpenAI.APIConnectionError({ message: 'reset' }))
      .mockResolvedValueOnce(reply('{"title":"A"}'))
    expect((await callStructured(call)).data).toEqual({ title: 'A' })
  })

  it('doesn’t retry a timeout', async () => {
    const { callStructured } = await load()
    create.mockRejectedValueOnce(new OpenAI.APIConnectionTimeoutError())
    await expect(callStructured(call)).rejects.toMatchObject({ status: 504, code: 'timeout' })
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('asks for low reasoning effort on reasoning models only', async () => {
    vi.stubEnv('PROMO_TEXT_MODEL', 'gpt-6-luna')
    const { callStructured } = await load()
    create.mockResolvedValueOnce(reply('{"title":"A"}'))
    await callStructured(call)
    expect(create.mock.calls[0][0].reasoning).toEqual({ effort: 'low' })
  })

  it('explains a missing API key without calling anything', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const { callStructured } = await load()
    await expect(callStructured(call)).rejects.toMatchObject({ status: 503, code: 'no_api_key' })
    expect(create).not.toHaveBeenCalled()
  })
})
