import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'
import { redirect } from 'next/navigation'
import { Button, EmptyState } from '@/components/ui'
import { MusicalNoteIcon } from '@heroicons/react/24/outline'

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
    <div className="min-h-screen bg-champagne-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-page-x pt-5 lg:pt-page-top pb-8">
        <h1 className="font-serif text-3xl font-semibold text-charcoal-950">Choreography</h1>
        <p className="mt-1 text-sm text-charcoal-500">Manage choreography notes, routines, and music for your classes.</p>

        <div className="mt-header-gap">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Failed to load classes: {error.message}
            </div>
          ) : classes && classes.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls) => (
                <div key={cls.id} className="rounded-lg border border-champagne-200 bg-champagne-50 p-6">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg font-semibold text-charcoal-950 truncate">{cls.name}</h3>
                      <p className="text-sm text-charcoal-500">{cls.class_type}</p>
                    </div>
                    <span className="shrink-0 text-xs text-charcoal-500 tabular-nums">
                      {new Date(cls.date).toLocaleDateString()}
                    </span>
                  </div>

                  {cls.description && (
                    <p className="text-sm text-charcoal-500 mb-4 line-clamp-3">{cls.description}</p>
                  )}

                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-center">
                      View Choreography
                    </Button>
                    <Button variant="ghost" className="w-full justify-center">
                      Edit Notes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-champagne-200 bg-champagne-50">
              <EmptyState
                icon={<MusicalNoteIcon />}
                message="No choreography yet. Create your first class to start adding choreography notes."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
