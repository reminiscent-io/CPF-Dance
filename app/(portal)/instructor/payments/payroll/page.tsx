import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Payroll | Dance Studio',
  description: 'Track earnings and payouts',
}

export default async function PayrollPage() {
  await requireInstructor()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch instructor's classes and calculate earnings
  const { data: classes, error } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      date,
      class_type,
      pricing_model,
      pricing_data,
      actual_attendance_count,
      enrollments (
        id
      )
    `)
    .eq('instructor_id', user.id)
    .order('date', { ascending: false })

  // Calculate total earnings
  let totalEarnings = 0
  if (classes) {
    classes.forEach((cls) => {
      const enrollmentCount = cls.enrollments?.length || 0
      const attendanceCount = cls.actual_attendance_count || enrollmentCount

      // Simple calculation - in real app would use pricing utility
      if (cls.pricing_model === 'per_person' && cls.pricing_data?.pricePerPerson) {
        totalEarnings += cls.pricing_data.pricePerPerson * attendanceCount
      }
    })
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payroll</h1>
          <p className="mt-2 text-gray-600">Track your earnings and payouts</p>
        </div>

        {/* Earnings Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-rose-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">${totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Paid Out</p>
                <p className="text-2xl font-bold text-gray-900">$0.00</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">${totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll History Table */}
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Failed to load payroll data: {error.message}
          </div>
        ) : classes && classes.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Earnings Breakdown</h2>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Earnings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classes.map((cls) => {
                  const enrollmentCount = cls.enrollments?.length || 0
                  const attendanceCount = cls.actual_attendance_count || enrollmentCount
                  let earnings = 0

                  if (cls.pricing_model === 'per_person' && cls.pricing_data?.pricePerPerson) {
                    earnings = cls.pricing_data.pricePerPerson * attendanceCount
                  }

                  return (
                    <tr key={cls.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{cls.name}</div>
                        <div className="text-sm text-gray-500">{cls.class_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(cls.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {attendanceCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cls.pricing_model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${earnings.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payroll data yet</h3>
              <p className="mt-1 text-sm text-gray-500">Create classes and track attendance to see your earnings.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
