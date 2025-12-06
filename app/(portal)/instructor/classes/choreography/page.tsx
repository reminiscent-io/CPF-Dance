import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Choreography | Dance Studio',
  description: 'Manage choreography and routines',
}

export default async function ChoreographyPage() {
  await requireInstructor()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch classes for choreography management
  const { data: classes, error } = await supabase
    .from('classes')
    .select('id, name, class_type, date, description')
    .eq('instructor_id', user.id)
    .order('date', { ascending: false })

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Choreography</h1>
          <p className="mt-2 text-gray-600">Manage choreography notes, routines, and music for your classes</p>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Failed to load classes: {error.message}
          </div>
        ) : classes && classes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                    <p className="text-sm text-gray-500">{cls.class_type}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                    {new Date(cls.date).toLocaleDateString()}
                  </span>
                </div>

                {cls.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{cls.description}</p>
                )}

                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium">
                    View Choreography
                  </button>
                  <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                    Edit Notes
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="max-w-md mx-auto">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No choreography yet</h3>
              <p className="mt-1 text-sm text-gray-500">Create your first class to start adding choreography notes.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
