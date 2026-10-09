import { vi } from 'vitest'

/**
 * A scripted Supabase client for route tests: every query records what it
 * asked for (table, action, filters, payload) and gets its result from a
 * handler, so a test can answer "update promo_designs where revision = 3"
 * differently from "select promo_designs".
 */

export interface Query {
  table: string
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  filters: [string, string, unknown][]
  payload?: unknown
  columns?: string
}

export type Handler = (query: Query) => { data: unknown; error: unknown; count?: number } | undefined

export type StorageHandler = (call: { bucket: string; method: string; args: unknown[] }) => unknown

export function fakeSupabase(handler: Handler, storageHandler: StorageHandler = () => undefined) {
  const queries: Query[] = []
  const storageCalls: { bucket: string; method: string; args: unknown[] }[] = []

  const chain = (table: string) => {
    const query: Query = { table, action: 'select', filters: [] }
    const result = () => {
      queries.push(query)
      return handler(query) ?? { data: null, error: null }
    }
    const builder: Record<string, unknown> = {}
    const passthrough = (name: string, record?: (...args: unknown[]) => void) =>
      (builder[name] = vi.fn((...args: unknown[]) => {
        record?.(...args)
        return builder
      }))
    passthrough('select', (columns) => {
      if (query.action === 'select') query.columns = columns as string
    })
    passthrough('insert', (payload) => Object.assign(query, { action: 'insert', payload }))
    passthrough('update', (payload) => Object.assign(query, { action: 'update', payload }))
    passthrough('upsert', (payload) => Object.assign(query, { action: 'upsert', payload }))
    passthrough('delete', () => Object.assign(query, { action: 'delete' }))
    for (const op of ['eq', 'is', 'in', 'gte', 'lt', 'not', 'neq']) {
      passthrough(op, (column, value, extra) =>
        query.filters.push([op, column as string, op === 'not' ? [value, extra] : value])
      )
    }
    passthrough('order')
    passthrough('limit')
    builder.single = vi.fn(async () => result())
    builder.maybeSingle = vi.fn(async () => result())
    builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject)
    return builder
  }

  const storage = {
    from: vi.fn((bucket: string) => {
      const call = (method: string, value: unknown) =>
        vi.fn(async (...args: unknown[]) => {
          const entry = { bucket, method, args }
          storageCalls.push(entry)
          return storageHandler(entry) ?? value
        })
      return {
        upload: call('upload', { data: { path: 'x' }, error: null }),
        remove: call('remove', { data: [], error: null }),
        list: call('list', { data: [], error: null }),
        download: call('download', { data: null, error: null }),
        getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.test/${bucket}/${path}` } })),
      }
    }),
  }

  return { client: { from: vi.fn(chain), storage }, queries, storageCalls }
}

export function hasFilter(query: Query, op: string, column: string, value?: unknown) {
  return query.filters.some(([o, c, v]) => o === op && c === column && (value === undefined || v === value))
}
