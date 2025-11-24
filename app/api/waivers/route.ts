import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get waivers for this user (issued or received)
    const { data: waivers, error: waiversError } = await supabase
      .from('waivers')
      .select('*')
      .or(`issued_by_id.eq.${user.id},recipient_id.eq.${user.id},signed_by_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (waiversError) {
      throw waiversError
    }

    return NextResponse.json({ waivers: waivers || [] })
  } catch (error: any) {
    console.error('Error fetching waivers:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch waivers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      content,
      waiver_type,
      recipient_id,
      recipient_type,
      private_lesson_id,
      class_id,
      expires_at
    } = body

    if (!title || !content || !recipient_id || !recipient_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create the waiver
    const { data: waiver, error: createError } = await supabase
      .from('waivers')
      .insert({
        title,
        description,
        content,
        waiver_type: waiver_type || 'general',
        issued_by_id: user.id,
        issued_by_role: 'instructor', // TODO: get from profile
        recipient_id,
        recipient_type,
        private_lesson_id: private_lesson_id || null,
        class_id: class_id || null,
        expires_at: expires_at || null,
        status: 'pending'
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return NextResponse.json({ waiver }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating waiver:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create waiver' },
      { status: 500 }
    )
  }
}
