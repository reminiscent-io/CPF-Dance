import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { fakeSupabase, hasFilter, type Handler } from './fake-supabase'

const OWNER = '11111111-1111-4111-8111-111111111111'
const DESIGN = '22222222-2222-4222-8222-222222222222'
const CLASS = '33333333-3333-4333-8333-333333333333'

const state = vi.hoisted(() => ({
  session: null as unknown as ReturnType<typeof import('./fake-supabase').fakeSupabase>,
  admin: null as unknown as ReturnType<typeof import('./fake-supabase').fakeSupabase>,
  isAdmin: false,
}))

vi.mock('@/lib/promo/server/context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/promo/server/context')>()
  return {
    ...actual,
    requirePromoInstructor: vi.fn(async () => ({
      supabase: state.session.client,
      ownerId: OWNER,
      isAdmin: state.isAdmin,
      profile: { id: OWNER, role: state.isAdmin ? 'admin' : 'instructor' },
    })),
  }
})
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => state.admin.client) }))

import { PATCH } from '../designs/[id]/route'
import { DELETE as UNPUBLISH, POST as PUBLISH } from '../designs/[id]/publish/route'

const document = { v: 1, variant: 'ivory', values: {}, photos: {}, edited: [], nudges: {}, layout: {} }
const design = {
  id: DESIGN,
  owner_id: OWNER,
  title: 'Precision Workshop',
  template_version_id: 'v1',
  format: 'ig_post',
  group_id: 'g1',
  class_ids: [CLASS],
  brief: {},
  document,
  brand_snapshot: {},
  revision: 3,
  thumbnail_updated_at: null,
  created_at: '2026-10-09T00:00:00Z',
  updated_at: '2026-10-09T00:00:00Z',
}
const publication = {
  id: 'pub-1',
  design_id: DESIGN,
  asset_id: 'asset-1',
  public_path: `${OWNER}/promo-old.jpg`,
  public_url: 'https://cdn.test/assets/old.jpg',
  class_id: CLASS,
  previous_class_asset_id: 'old-asset',
  revision: 2,
  published_at: '2026-10-08T00:00:00Z',
}
const params = { params: Promise.resolve({ id: DESIGN }) }

function setup(session: Handler, admin: Handler = () => undefined) {
  state.session = fakeSupabase(session)
  state.admin = fakeSupabase(admin)
}

function jpeg() {
  return new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70])], { type: 'image/jpeg' })
}

function publishRequest(file: Blob, classId?: string) {
  const form = new FormData()
  form.append('file', file, 'promo.jpg')
  if (classId) form.append('classId', classId)
  return new NextRequest(`http://localhost/api/promo/designs/${DESIGN}/publish`, { method: 'POST', body: form })
}

beforeEach(() => {
  state.isAdmin = false
})

describe('PATCH /api/promo/designs/[id] (autosave)', () => {
  const patch = (body: unknown) =>
    PATCH(
      new NextRequest(`http://localhost/api/promo/designs/${DESIGN}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      params
    )

  it('saves against the revision it started from and bumps it', async () => {
    setup((query) => (query.action === 'update' ? { data: [{ revision: 4, updated_at: 'now' }], error: null } : undefined))
    const response = await patch({ revision: 3, document })
    expect(response.status).toBe(200)
    expect((await response.json()).revision).toBe(4)
    const update = state.session.queries.find((query) => query.action === 'update')!
    expect(hasFilter(update, 'eq', 'revision', 3)).toBe(true)
    expect((update.payload as { revision: number }).revision).toBe(4)
  })

  it('answers 409 when another device saved first, instead of overwriting', async () => {
    setup((query) => {
      if (query.action === 'update') return { data: [], error: null }
      if (query.table === 'promo_designs') return { data: { revision: 5 }, error: null }
    })
    const response = await patch({ revision: 3, document })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'conflict', revision: 5 })
  })

  it('rejects a document that fails the schema', async () => {
    setup(() => undefined)
    const response = await patch({ revision: 3, document: { ...document, v: 2 } })
    expect(response.status).toBe(400)
    expect(state.session.queries).toHaveLength(0)
  })
})

describe('POST /api/promo/designs/[id]/publish', () => {
  const designRead: Handler = (query) => {
    if (query.table === 'promo_designs' && query.action === 'select') return { data: design, error: null }
    if (query.table === 'promo_publications' && query.action === 'select') return { data: null, error: null }
  }

  it('refuses anything but a JPEG', async () => {
    setup(designRead)
    const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' })
    const response = await PUBLISH(publishRequest(png), params)
    expect(response.status).toBe(400)
    expect(state.admin.storageCalls).toHaveLength(0)
  })

  it('won’t change another instructor’s class image', async () => {
    setup((query) => {
      if (query.table === 'classes') return { data: { id: CLASS, instructor_id: 'someone-else' }, error: null }
      return designRead(query)
    })
    const response = await PUBLISH(publishRequest(jpeg(), CLASS), params)
    expect(response.status).toBe(403)
    expect(state.admin.storageCalls).toHaveLength(0)
  })

  it('publishes, sets the class image and remembers the old one', async () => {
    setup(
      (query) => {
        if (query.table === 'classes') return { data: { id: CLASS, instructor_id: OWNER }, error: null }
        if (query.table === 'promo_publications' && query.action === 'insert') {
          return { data: { ...publication, id: 'pub-2' }, error: null }
        }
        return designRead(query)
      },
      (query) => {
        if (query.table === 'assets' && query.action === 'insert') return { data: { id: 'asset-2' }, error: null }
        if (query.table === 'classes' && query.action === 'select') return { data: { asset_id: 'old-asset' }, error: null }
      }
    )
    const response = await PUBLISH(publishRequest(jpeg(), CLASS), params)
    expect(response.status).toBe(201)
    const upload = state.admin.storageCalls.find((call) => call.method === 'upload')!
    expect(upload.bucket).toBe('assets')
    expect((upload.args[2] as { cacheControl: string }).cacheControl).toBe('300')
    const classUpdate = state.admin.queries.find((query) => query.table === 'classes' && query.action === 'update')!
    expect(classUpdate.payload).toEqual({ asset_id: 'asset-2' })
    const insert = state.session.queries.find((query) => query.table === 'promo_publications' && query.action === 'insert')!
    expect(insert.payload).toMatchObject({ asset_id: 'asset-2', class_id: CLASS, previous_class_asset_id: 'old-asset', revision: 3 })
  })

  it('leaves nothing half-published when the last step fails', async () => {
    setup(
      (query) => {
        if (query.table === 'classes') return { data: { id: CLASS, instructor_id: OWNER }, error: null }
        if (query.table === 'promo_publications' && query.action === 'insert') return { data: null, error: { message: 'boom' } }
        return designRead(query)
      },
      (query) => {
        if (query.table === 'assets' && query.action === 'insert') return { data: { id: 'asset-2' }, error: null }
        if (query.table === 'classes' && query.action === 'select') return { data: { asset_id: 'old-asset' }, error: null }
      }
    )
    const response = await PUBLISH(publishRequest(jpeg(), CLASS), params)
    expect(response.status).toBe(500)
    const restore = state.admin.queries.filter((query) => query.table === 'classes' && query.action === 'update').at(-1)!
    expect(restore.payload).toEqual({ asset_id: 'old-asset' })
    expect(hasFilter(restore, 'eq', 'asset_id', 'asset-2')).toBe(true)
    expect(state.admin.queries.some((query) => query.table === 'assets' && query.action === 'delete' && hasFilter(query, 'eq', 'id', 'asset-2'))).toBe(true)
    const uploaded = state.admin.storageCalls.find((call) => call.method === 'upload')!.args[0]
    expect(state.admin.storageCalls.some((call) => call.method === 'remove' && (call.args[0] as string[]).includes(uploaded as string))).toBe(true)
  })
})

describe('DELETE /api/promo/designs/[id]/publish', () => {
  it('gives the class its earlier image back only if it still shows this promo', async () => {
    setup((query) => {
      if (query.table === 'promo_designs') return { data: design, error: null }
      if (query.table === 'promo_publications' && query.action === 'select') return { data: publication, error: null }
    })
    const response = await UNPUBLISH(new NextRequest(`http://localhost/api/promo/designs/${DESIGN}/publish`, { method: 'DELETE' }), params)
    expect(response.status).toBe(200)
    const restore = state.admin.queries.find((query) => query.table === 'classes' && query.action === 'update')!
    expect(restore.payload).toEqual({ asset_id: 'old-asset' })
    expect(hasFilter(restore, 'eq', 'id', CLASS)).toBe(true)
    expect(hasFilter(restore, 'eq', 'asset_id', 'asset-1')).toBe(true)
    expect(state.admin.storageCalls).toContainEqual({ bucket: 'assets', method: 'remove', args: [[publication.public_path]] })
    const marked = state.session.queries.find((query) => query.table === 'promo_publications' && query.action === 'update')!
    expect(marked.payload).toHaveProperty('unpublished_at')
  })
})
