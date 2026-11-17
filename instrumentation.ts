import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'

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

export const posthogLogProvider = new LoggerProvider({
  resource: resourceFromAttributes({
    'service.name': 'cpf-dance',
    'deployment.environment': process.env.NODE_ENV ?? 'development',
  }),
  processors: projectToken && host
    ? [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: `${host}/i/v1/logs`,
            headers: {
              Authorization: `Bearer ${projectToken}`,
              'Content-Type': 'application/json',
            },
          }),
        }),
      ]
    : [],
})

// This logger is deliberately separate from the application's existing console
// output, so PostHog receives only log records added by this integration.
export const posthogLog = posthogLogProvider.getLogger('cpf-dance.posthog')

export function register() {}
