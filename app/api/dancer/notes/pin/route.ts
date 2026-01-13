import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireDancer } from '@/lib/auth/server-auth'

export async function PUT(request: NextRequest) {
  try {
    const profile = await requireDancer()
    const supabase = await createClient()

    const body = await request.json()
    const { id, is_pinned } = body

    if (!id || typeof is_pinned !== 'boolean') {
      return NextResponse.json(
        { error: 'Note ID and is_pinned (boolean) are required' },
        { status: 400 }
      )
    }

    // Update the note's pin status
    const { data: note, error: updateError } = await supabase
      .from('notes')
      .update({ is_pinned })
      .eq('id', id)
      .eq('author_id', profile.id) // Ensure user can only pin their own notes
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, note })
  } catch (error) {
    console.error('Error pinning/unpinning note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
