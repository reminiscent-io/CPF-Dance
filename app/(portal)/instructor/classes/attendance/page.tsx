import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'
import { redirect } from 'next/navigation'
import { Button, EmptyCell, EmptyState, Table } from '@/components/ui'
import type { Column } from '@/components/ui'
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'

export const metadata = {
  title: 'Class Attendance | Dance Studio',
  description: 'Track and manage class attendance',
}

interface AttendanceRow {
  id: string
  name: string
  class_type: string | null
  date: string
  actual_attendance_count: number | null
  enrollments?: Array<{ id: string; student: { id: string; full_name: string } | null }>
  [key: string]: any
}

const columns: Column<AttendanceRow>[] = [
  {
    key: 'name',
    header: 'Class Name',
    render: (cls) => (
      <div>
        <div className="font-medium text-charcoal-900">{cls.name}</div>
        <div className="text-xs text-charcoal-500">{cls.class_type || <EmptyCell />}</div>
      </div>
    ),
  },
  {
    key: 'date',
    header: 'Date',
    render: (cls) => new Date(cls.date).toLocaleDateString(),
  },
  {
    key: 'enrolled',
    header: 'Enrolled',
    numeric: true,
    render: (cls) => cls.enrollments?.length || 0,
  },
  {
    key: 'attendance',
    header: 'Attendance',
    numeric: true,
    render: (cls) => cls.actual_attendance_count || cls.enrollments?.length || 0,
  },
  {
    key: 'actions',
    header: '',
    align: 'right',
    hoverOnly: true,
    render: () => (
      <Button size="sm" variant="ghost">
        Take Attendance
      </Button>
    ),
  },
]

export default async function AttendancePage() {
  await requireInstructor()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch classes for attendance tracking
  const { data: classes, error } = await supabase
    .from('classes')
    .select(`
      *,
      enrollments (
        id,
        student:students (
          id,
          full_name
        )
      )
    `)
    .eq('instructor_id', user.id)
    .order('date', { ascending: false })

  const rows = (classes ?? []) as AttendanceRow[]

  return (
    <div className="min-h-screen bg-champagne-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-page-x pt-5 lg:pt-page-top pb-8">
        <h1 className="font-serif text-3xl font-semibold text-charcoal-950">Class Attendance</h1>
        <p className="mt-1 text-sm text-charcoal-500">Track and manage attendance for your classes.</p>

        <div className="mt-header-gap">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Failed to load classes: {error.message}
            </div>
          ) : (
            <Table
              data={rows}
              columns={columns}
              empty={
                <EmptyState
                  icon={<ClipboardDocumentCheckIcon />}
                  message="No classes yet. Create your first class to start tracking attendance."
                />
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
