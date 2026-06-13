import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button, EmptyCell, EmptyState, PageHeader, StatusDot, Table } from '@/components/ui'
import type { Column, StatusTone } from '@/components/ui'
import { DocumentTextIcon, PlusIcon } from '@heroicons/react/24/outline'

export const metadata = {
  title: 'Invoices | Dance Studio',
  description: 'Manage student invoices and billing',
}

interface InvoiceRow {
  id: string
  amount: number | null
  payment_status: string
  transaction_date: string | null
  student: { id: string; full_name: string } | null
  class: { id: string; title: string; start_time: string | null } | null
  [key: string]: any
}

const statusTones: Record<string, StatusTone> = {
  confirmed: 'positive',
  pending: 'neutral',
  disputed: 'attention',
  cancelled: 'attention',
}

const requestPaymentAction = (
  <Link
    href="/instructor/payments?request=true"
    className="inline-flex min-h-control items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-base font-medium text-champagne-50 transition-colors duration-200 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
  >
    <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
    Request payment
  </Link>
)

const columns: Column<InvoiceRow>[] = [
  {
    key: 'student',
    header: 'Student',
    render: (invoice) =>
      invoice.student?.full_name ? (
        <span className="font-medium">{invoice.student.full_name}</span>
      ) : (
        <EmptyCell />
      ),
  },
  {
    key: 'class',
    header: 'Class',
    render: (invoice) =>
      invoice.class ? (
        <div>
          <div>{invoice.class.title || <EmptyCell />}</div>
          {invoice.class.start_time && (
            <div className="text-xs text-charcoal-500">
              {new Date(invoice.class.start_time).toLocaleDateString()}
            </div>
          )}
        </div>
      ) : (
        <EmptyCell />
      ),
  },
  {
    key: 'date',
    header: 'Date',
    render: (invoice) =>
      invoice.transaction_date ? (
        new Date(invoice.transaction_date).toLocaleDateString()
      ) : (
        <EmptyCell />
      ),
  },
  {
    key: 'amount',
    header: 'Amount',
    numeric: true,
    render: (invoice) => `$${invoice.amount?.toFixed(2) || '0.00'}`,
  },
  {
    key: 'status',
    header: 'Status',
    render: (invoice) => (
      <StatusDot
        tone={statusTones[invoice.payment_status] || 'neutral'}
        label={invoice.payment_status}
        className="capitalize"
      />
    ),
  },
  {
    key: 'actions',
    header: '',
    align: 'right',
    hoverOnly: true,
    render: () => (
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost">
          View
        </Button>
        <Button size="sm" variant="ghost">
          Download
        </Button>
      </div>
    ),
  },
]

export default async function InvoicesPage() {
  await requireInstructor()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch payments/invoices for the instructor's students
  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      *,
      student:students (
        id,
        full_name
      ),
      class:classes (
        id,
        title,
        start_time
      )
    `)
    .order('transaction_date', { ascending: false })

  const invoices = (payments ?? []) as InvoiceRow[]

  return (
    <div className="min-h-screen bg-champagne-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-page-x pt-5 lg:pt-page-top pb-8">
        <PageHeader
          title="Invoices"
          subtitle="Manage student invoices and billing."
          action={requestPaymentAction}
        />

        <div className="mt-header-gap">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Failed to load invoices: {error.message}
            </div>
          ) : (
            <Table
              data={invoices}
              columns={columns}
              empty={
                <EmptyState
                  icon={<DocumentTextIcon />}
                  message="No invoices yet."
                  action={requestPaymentAction}
                />
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
