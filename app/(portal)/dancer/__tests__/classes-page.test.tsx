import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { createTestISODate } from '@/tests/utils'

vi.mock('@/lib/auth/hooks', () => ({
  useUser: () => ({
    user: { id: 'user-1' },
    profile: { id: 'user-1', role: 'dancer', full_name: 'Ada Dancer' },
    loading: false,
  }),
}))

import DancerClassesPage from '@/app/(portal)/dancer/classes/page'

const openClass = (id: string, title: string, daysFromNow: number, isEnrolled: boolean) => ({
  id,
  title,
  description: null,
  location: null,
  start_time: createTestISODate(daysFromNow),
  end_time: createTestISODate(daysFromNow),
  class_type: 'group',
  series_id: null,
  max_capacity: null,
  pricing_model: 'per_person',
  cost_per_person: 25,
  base_cost: null,
  external_signup_url: null,
  workshop_price: null,
  workshop_signup_url: null,
  workshop_full_only: false,
  enrolled_count: 1,
  is_enrolled: isEnrolled,
  studio: null,
  instructor: { full_name: 'Courtney' },
  asset: null,
})

const enrolledClass = (
  id: string,
  title: string,
  daysFromNow: number,
  extra: Record<string, unknown> = {}
) => ({
  id,
  title,
  description: null,
  location: null,
  start_time: createTestISODate(daysFromNow),
  end_time: createTestISODate(daysFromNow),
  class_type: 'group',
  is_cancelled: false,
  is_public: false,
  is_virtual: false,
  google_meet_url: null,
  enrollment_id: `e-${id}`,
  enrolled_at: createTestISODate(-30),
  attendance_status: null,
  enrollment_notes: null,
  instructor_name: 'Courtney',
  studio: null,
  ...extra,
})

const RESPONSES: Record<string, unknown> = {
  '/api/dancer/public-classes': {
    student_id: 'student-1',
    classes: [
      openClass('turns', 'Turns Clinic', 5, false),
      openClass('precision', 'Precision Workshop', 3, true),
    ],
  },
  '/api/dancer/classes': {
    classes: [
      enrolledClass('precision', 'Precision Workshop', 3, { is_public: true }),
      enrolledClass('private', 'Private with Courtney', -3, { class_type: 'private', attendance_status: 'present' }),
      enrolledClass('missed', 'Missed Class', -4, { attendance_status: 'absent' }),
      enrolledClass('called-off', 'Called-Off Class', -5, { is_cancelled: true }),
    ],
  },
  '/api/dancer/personal-classes': { classes: [] },
  '/api/dancer/notes': { notes: [] },
}

describe('DancerClassesPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: url in RESPONSES,
      json: async () => RESPONSES[url],
    })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function renderPage() {
    render(
      <ToastProvider>
        <DancerClassesPage />
      </ToastProvider>
    )
    await waitFor(() => expect(screen.getByRole('region', { name: 'Open for enrollment' })).toBeInTheDocument())
    return {
      open: screen.getByRole('region', { name: 'Open for enrollment' }),
      upcoming: screen.getByRole('region', { name: 'Upcoming' }),
      past: screen.getByRole('region', { name: 'Past' }),
    }
  }

  it('lists open classes she has not signed up for at the top', async () => {
    const { open } = await renderPage()
    expect(within(open).getByText('Turns Clinic')).toBeInTheDocument()
    expect(within(open).getByRole('button', { name: 'Enroll' })).toBeInTheDocument()
    expect(within(open).queryByText('Precision Workshop')).not.toBeInTheDocument()
  })

  it('moves an open class she enrolled in to Upcoming with an enrolled mark', async () => {
    const { upcoming } = await renderPage()
    const row = within(upcoming).getByRole('button', { name: 'View details for Precision Workshop' })
    expect(within(row).getByText('Enrolled')).toBeInTheDocument()
  })

  it('keeps attended privates and group classes in Past, without absences or cancellations', async () => {
    const { past } = await renderPage()
    expect(within(past).getByText('Private with Courtney')).toBeInTheDocument()
    expect(within(past).queryByText('Missed Class')).not.toBeInTheDocument()
    expect(within(past).queryByText('Called-Off Class')).not.toBeInTheDocument()
  })
})
