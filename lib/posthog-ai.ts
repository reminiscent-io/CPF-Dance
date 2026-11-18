import { OpenAI as PostHogOpenAI } from '@posthog/ai/openai'
import OpenAI from 'openai'
import { PostHog } from 'posthog-node'

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (!projectToken && process.env.NODE_ENV !== 'production') {
  console.warn(
    'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured'
  )
}

if (!host && process.env.NODE_ENV !== 'production') {
  console.warn(
    'NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured'
  )
}

export const posthogAiClient = projectToken && host
  ? new PostHog(projectToken, {
      host,
      // Prompts and replies hold dancers' notes and voice transcripts. Privacy
      // mode sends only model, tokens, cost, latency and errors.
      privacyMode: true,
      flushAt: 1,
      flushInterval: 0,
      requestTimeout: 2000,
      fetchRetryCount: 0,
    })
  : null

export function createOpenAIClient(apiKey: string, options: { maxRetries?: number } = {}): OpenAI {
  return posthogAiClient
    ? new PostHogOpenAI({ apiKey, ...options, posthog: posthogAiClient })
    : new OpenAI({ apiKey, ...options })
}

export function openAIPostHogProperties(distinctId: string, sessionId: string, traceId: string) {
  return posthogAiClient
    ? {
        posthogDistinctId: distinctId,
        posthogTraceId: traceId,
        posthogProperties: { $ai_session_id: sessionId },
      }
    : {}
}

export async function flushAiObservability() {
  if (posthogAiClient) await posthogAiClient.flush().catch(() => {})
}
