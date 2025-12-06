import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Invoices | Dance Studio',
  description: 'Manage student invoices and billing',
}

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
        name,
        date
      )
    `)
    .eq('classes.instructor_id', user.id)
    .order('payment_date', { ascending: false })

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="mt-2 text-gray-600">Manage student invoices and billing</p>
          </div>
          <button className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium">
            Create Invoice
          </button>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Failed to load invoices: {error.message}
          </div>
        ) : payments && payments.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => {
                  const statusColors = {
                    paid: 'bg-green-100 text-green-800',
                    pending: 'bg-yellow-100 text-yellow-800',
                    failed: 'bg-red-100 text-red-800',
                  }

                  return (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.student?.full_name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payment.class?.name || 'N/A'}</div>
                        {payment.class?.date && (
                          <div className="text-sm text-gray-500">
                            {new Date(payment.class.date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'Not set'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${payment.amount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[payment.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-rose-600 hover:text-rose-900 font-medium mr-3">
                          View
                        </button>
                        <button className="text-gray-600 hover:text-gray-900 font-medium">
                          Download
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="max-w-md mx-auto">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices yet</h3>
              <p className="mt-1 text-sm text-gray-500">Create your first invoice to start tracking payments.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
