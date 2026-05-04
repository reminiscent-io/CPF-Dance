import { describe, it, expect, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  spendCreditForClass,
  refundCreditForClass,
  getStudentRemainingLessons,
  getDayOfLessonPrice
} from '../lesson-credits'

interface PurchaseRow {
  id: string
  student_id: string
  remaining_lessons: number
  purchased_at: string
  lesson_pack: { name: string } | null
}

interface UsageRow {
  id: string
  lesson_pack_purchase_id: string
  private_lesson_request_id: string | null
  class_id: string | null
  lessons_used: number
  voided_at: string | null
  voided_reason: string | null
}

interface PackRow {
  price: number
  lesson_count: number
  is_active: boolean
}

class FakeSupabase {
  purchases: PurchaseRow[] = []
  usage: UsageRow[] = []
  packs: PackRow[] = []
  insertShouldFail = false
  updateShouldFail = false

  from(table: string): any {
    if (table === 'lesson_pack_purchases') return this.purchaseQuery()
    if (table === 'lesson_pack_usage') return this.usageQuery()
    if (table === 'lesson_packs') return this.packQuery()
    throw new Error(`Unexpected table ${table}`)
  }

  purchaseQuery() {
    const self = this
    let pendingFilter: ((p: PurchaseRow) => boolean) | null = null
    let orderField: keyof PurchaseRow | null = null
    let limitN: number | null = null
    let mode: 'select' | 'update' | 'insert' = 'select'
    let updatePayload: Partial<PurchaseRow> = {}
    const chain: any = {
      select() { return chain },
      eq(col: string, val: any) {
        const prev = pendingFilter
        pendingFilter = (p) => (prev ? prev(p) : true) && (p as any)[col] === val
        return chain
      },
      gt(col: string, val: number) {
        const prev = pendingFilter
        pendingFilter = (p) => (prev ? prev(p) : true) && ((p as any)[col] as number) > val
        return chain
      },
      order(col: string) {
        orderField = col as keyof PurchaseRow
        return chain
      },
      limit(n: number) {
        limitN = n
        return chain
      },
      update(payload: Partial<PurchaseRow>) {
        mode = 'update'
        updatePayload = payload
        return chain
      },
      then(resolve: (value: any) => void) {
        if (mode === 'update') {
          if (self.updateShouldFail) return resolve({ error: new Error('forced update fail') })
          self.purchases = self.purchases.map((p) =>
            pendingFilter && pendingFilter(p) ? { ...p, ...updatePayload } : p
          )
          return resolve({ data: null, error: null })
        }
        let rows = self.purchases.filter((p) => (pendingFilter ? pendingFilter(p) : true))
        if (orderField) rows = [...rows].sort((a, b) => (a[orderField!] as any).localeCompare(b[orderField!] as any))
        if (limitN != null) rows = rows.slice(0, limitN)
        return resolve({ data: rows, error: null })
      },
      single() {
        return {
          then(resolve: (value: any) => void) {
            const rows = self.purchases.filter((p) => (pendingFilter ? pendingFilter(p) : true))
            return resolve({ data: rows[0] ?? null, error: rows[0] ? null : { code: 'PGRST116' } })
          }
        }
      }
    }
    return chain
  }

  usageQuery() {
    const self = this
    let pendingFilter: ((u: UsageRow) => boolean) | null = null
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
    let payload: any = null
    const chain: any = {
      select() { return chain },
      eq(col: string, val: any) {
        const prev = pendingFilter
        pendingFilter = (u) => (prev ? prev(u) : true) && (u as any)[col] === val
        return chain
      },
      is(col: string, val: any) {
        const prev = pendingFilter
        pendingFilter = (u) => (prev ? prev(u) : true) && (u as any)[col] === val
        return chain
      },
      insert(row: any) {
        mode = 'insert'
        payload = row
        return chain
      },
      update(p: any) {
        mode = 'update'
        payload = p
        return chain
      },
      delete() {
        mode = 'delete'
        return chain
      },
      single() {
        return {
          then(resolve: (value: any) => void) {
            if (mode === 'insert') {
              if (self.insertShouldFail) return resolve({ data: null, error: new Error('forced insert fail') })
              const created: UsageRow = {
                id: `usage-${self.usage.length + 1}`,
                lesson_pack_purchase_id: payload.lesson_pack_purchase_id,
                private_lesson_request_id: payload.private_lesson_request_id ?? null,
                class_id: payload.class_id ?? null,
                lessons_used: payload.lessons_used ?? 1,
                voided_at: null,
                voided_reason: null
              }
              self.usage.push(created)
              return resolve({ data: { id: created.id }, error: null })
            }
            const rows = self.usage.filter((u) => (pendingFilter ? pendingFilter(u) : true))
            return resolve({ data: rows[0] ?? null, error: null })
          }
        }
      },
      maybeSingle() {
        return {
          then(resolve: (value: any) => void) {
            const rows = self.usage.filter((u) => (pendingFilter ? pendingFilter(u) : true))
            return resolve({ data: rows[0] ?? null, error: null })
          }
        }
      },
      then(resolve: (value: any) => void) {
        if (mode === 'update') {
          self.usage = self.usage.map((u) =>
            pendingFilter && pendingFilter(u) ? { ...u, ...payload } : u
          )
          return resolve({ data: null, error: null })
        }
        if (mode === 'delete') {
          self.usage = self.usage.filter((u) => !(pendingFilter && pendingFilter(u)))
          return resolve({ data: null, error: null })
        }
        const rows = self.usage.filter((u) => (pendingFilter ? pendingFilter(u) : true))
        return resolve({ data: rows, error: null })
      }
    }
    return chain
  }

  packQuery() {
    const self = this
    let pendingFilter: ((p: PackRow) => boolean) | null = null
    const chain: any = {
      select() { return chain },
      eq(col: string, val: any) {
        const prev = pendingFilter
        pendingFilter = (p) => (prev ? prev(p) : true) && (p as any)[col] === val
        return chain
      },
      then(resolve: (value: any) => void) {
        const rows = self.packs.filter((p) => (pendingFilter ? pendingFilter(p) : true))
        return resolve({ data: rows, error: null })
      }
    }
    return chain
  }
}

function makeClient(): { client: SupabaseClient; fake: FakeSupabase } {
  const fake = new FakeSupabase()
  return { client: fake as unknown as SupabaseClient, fake }
}

describe('spendCreditForClass', () => {
  let fake: FakeSupabase
  let client: SupabaseClient

  beforeEach(() => {
    const made = makeClient()
    fake = made.fake
    client = made.client
  })

  it('returns used:false when no purchases have remaining lessons', async () => {
    fake.purchases = [
      { id: 'p1', student_id: 's1', remaining_lessons: 0, purchased_at: '2025-01-01', lesson_pack: { name: '5-pack' } }
    ]
    const result = await spendCreditForClass({
      supabase: client,
      studentId: 's1',
      classId: 'c1',
      requestId: null
    })
    expect(result.used).toBe(false)
  })

  it('spends from the earliest-purchased active pack', async () => {
    fake.purchases = [
      { id: 'newer', student_id: 's1', remaining_lessons: 5, purchased_at: '2026-04-01', lesson_pack: { name: '5-pack' } },
      { id: 'older', student_id: 's1', remaining_lessons: 3, purchased_at: '2025-12-01', lesson_pack: { name: '3-pack' } }
    ]
    const result = await spendCreditForClass({
      supabase: client,
      studentId: 's1',
      classId: 'c1',
      requestId: 'req-1'
    })
    expect(result.used).toBe(true)
    if (!result.used) return
    expect(result.packPurchaseId).toBe('older')
    expect(result.remainingAfter).toBe(2)
    expect(fake.purchases.find((p) => p.id === 'older')!.remaining_lessons).toBe(2)
    expect(fake.usage[0].class_id).toBe('c1')
    expect(fake.usage[0].private_lesson_request_id).toBe('req-1')
  })

  it('skips students with no purchases at all', async () => {
    fake.purchases = []
    const result = await spendCreditForClass({
      supabase: client,
      studentId: 's-empty',
      classId: 'c1',
      requestId: null
    })
    expect(result.used).toBe(false)
  })
})

describe('refundCreditForClass', () => {
  let fake: FakeSupabase
  let client: SupabaseClient

  beforeEach(() => {
    const made = makeClient()
    fake = made.fake
    client = made.client
  })

  it('voids the active usage row and increments remaining lessons', async () => {
    fake.purchases = [
      { id: 'p1', student_id: 's1', remaining_lessons: 2, purchased_at: '2025-01-01', lesson_pack: { name: '5-pack' } }
    ]
    fake.usage = [
      {
        id: 'u1',
        lesson_pack_purchase_id: 'p1',
        private_lesson_request_id: null,
        class_id: 'c1',
        lessons_used: 1,
        voided_at: null,
        voided_reason: null
      }
    ]
    const result = await refundCreditForClass({ supabase: client, classId: 'c1', reason: 'cancelled_outside_24h' })
    expect(result.refunded).toBe(true)
    if (!result.refunded) return
    expect(result.remainingAfter).toBe(3)
    expect(fake.usage[0].voided_at).not.toBeNull()
    expect(fake.usage[0].voided_reason).toBe('cancelled_outside_24h')
    expect(fake.purchases[0].remaining_lessons).toBe(3)
  })

  it('returns refunded:false when no active usage row exists', async () => {
    fake.purchases = []
    fake.usage = []
    const result = await refundCreditForClass({ supabase: client, classId: 'c1', reason: 'class_deleted' })
    expect(result.refunded).toBe(false)
  })

  it('ignores already-voided rows', async () => {
    fake.purchases = [
      { id: 'p1', student_id: 's1', remaining_lessons: 2, purchased_at: '2025-01-01', lesson_pack: { name: '5-pack' } }
    ]
    fake.usage = [
      {
        id: 'u1',
        lesson_pack_purchase_id: 'p1',
        private_lesson_request_id: null,
        class_id: 'c1',
        lessons_used: 1,
        voided_at: '2026-04-01T00:00:00Z',
        voided_reason: 'class_deleted'
      }
    ]
    const result = await refundCreditForClass({ supabase: client, classId: 'c1', reason: 'instructor_reinstated' })
    expect(result.refunded).toBe(false)
    expect(fake.purchases[0].remaining_lessons).toBe(2)
  })
})

describe('getStudentRemainingLessons', () => {
  it('sums remaining_lessons across all purchases', async () => {
    const { client, fake } = makeClient()
    fake.purchases = [
      { id: 'a', student_id: 's1', remaining_lessons: 2, purchased_at: '2025-01-01', lesson_pack: null },
      { id: 'b', student_id: 's1', remaining_lessons: 5, purchased_at: '2025-02-01', lesson_pack: null }
    ]
    expect(await getStudentRemainingLessons(client, 's1')).toBe(7)
  })

  it('returns 0 when there are no purchases', async () => {
    const { client } = makeClient()
    expect(await getStudentRemainingLessons(client, 's-none')).toBe(0)
  })
})

describe('getDayOfLessonPrice', () => {
  it('returns the largest per-lesson rate across active packs', async () => {
    const { client, fake } = makeClient()
    fake.packs = [
      { price: 100, lesson_count: 1, is_active: true }, // $100/lesson
      { price: 450, lesson_count: 5, is_active: true }, // $90/lesson
      { price: 800, lesson_count: 10, is_active: true } // $80/lesson
    ]
    expect(await getDayOfLessonPrice(client)).toBe(100)
  })

  it('returns null when there are no active packs', async () => {
    const { client } = makeClient()
    expect(await getDayOfLessonPrice(client)).toBeNull()
  })
})
