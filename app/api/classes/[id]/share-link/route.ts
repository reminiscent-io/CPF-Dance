import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { hasInstructorPrivileges } from '@/lib/auth/privileges'
import { buildShareSlug, claimShareSlug } from '@/lib/class-share-slug'

interface SlugRow {
  id: string
  start_time: string
  share_slug: string | null
}

const UNIQUE_VIOLATION = '23505'

/**
 * The public signup link for a class: /classes/<slug>. Mints the slug the
 * first time and returns the stored one after that (lib/class-share-slug.ts).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserWithRole()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!hasInstructorPrivileges(profile)) {
      return NextResponse.json({ error: 'Forbidden: Only instructors and admins can share classes' }, { status: 403 })
    }

    const supabase = await createClient()
    const { id } = await params

    // Admins can share any class, instructors only their own
    let classQuery = supabase
      .from('classes')
      .select('id, title, start_time, class_type, series_id, is_public, is_cancelled, share_slug')
      .eq('id', id)
    if (profile.role !== 'admin') {
      classQuery = classQuery.eq('instructor_id', profile.id)
    }
    const { data: cls, error: classError } = await classQuery.maybeSingle()

    if (classError) {
      console.error('Error loading class for share link:', classError)
      return NextResponse.json({ error: 'Failed to load class' }, { status: 500 })
    }
    if (!cls) {
      return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 })
    }
    if (!cls.is_public || cls.is_cancelled) {
      return NextResponse.json({ error: 'Only a public class that is not cancelled has a signup link' }, { status: 409 })
    }

    // A workshop shares one link across its days, kept on the first day
    let owner: SlugRow = cls
    if (cls.class_type === 'workshop' && cls.series_id) {
      const { data: days, error: seriesError } = await supabase
        .from('classes')
        .select('id, start_time, share_slug')
        .eq('series_id', cls.series_id)
        .order('start_time', { ascending: true })
      if (seriesError) {
        console.error('Error loading workshop days for share link:', seriesError)
        return NextResponse.json({ error: 'Failed to load class' }, { status: 500 })
      }
      const rows = (days || []) as SlugRow[]
      owner = rows.find(day => day.share_slug) ?? rows[0] ?? cls
    }

    if (owner.share_slug) {
      return NextResponse.json({ slug: owner.share_slug })
    }

    const slug = await claimShareSlug(buildShareSlug(cls.title, owner.start_time), async candidate => {
      const { error } = await supabase
        .from('classes')
        .update({ share_slug: candidate })
        .eq('id', owner.id)
        .is('share_slug', null)
      if (error?.code === UNIQUE_VIOLATION) return 'taken'
      if (error) throw error
      return 'claimed'
    })

    // Another request may have set it first; the stored slug is the answer
    const { data: stored } = await supabase
      .from('classes')
      .select('share_slug')
      .eq('id', owner.id)
      .maybeSingle()

    return NextResponse.json({ slug: stored?.share_slug ?? slug })
  } catch (error) {
    console.error('Unexpected error creating share link:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
