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
      template_id,
      title,
      description,
      content,
      waiver_type,
      recipient_id,
      student_id,
      recipient_type,
      private_lesson_id,
      class_id,
      expires_at
    } = body

    if (!title || !content || (!recipient_id && !student_id) || !recipient_type) {
      return NextResponse.json(
        { error: 'Missing required fields. Need either recipient_id or student_id.' },
        { status: 400 }
      )
    }

    // Get issuer profile
    const { data: issuerProfile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()

    // Get recipient name - either from profile or student record
    let recipientName = 'Recipient'
    let actualRecipientId = recipient_id

    if (student_id) {
      // Get student info
      const { data: student } = await supabase
        .from('students')
        .select('full_name, profile_id, profile:profiles!students_profile_id_fkey(full_name)')
        .eq('id', student_id)
        .single()

      if (student) {
        // Handle profile which may be an array or single object
        const profile = Array.isArray(student.profile) ? student.profile[0] : student.profile
        // Use profile name if available, otherwise use student's stored full_name
        recipientName = profile?.full_name || student.full_name || 'Student'
        // If student has a profile_id, also set recipient_id for notifications later
        if (student.profile_id) {
          actualRecipientId = student.profile_id
        }
      }
    } else if (recipient_id) {
      // Get recipient profile
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', recipient_id)
        .single()

      recipientName = recipientProfile?.full_name || 'Recipient'
    }

    // Replace template variables with dynamic values
    const issueDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    let processedContent = content
      .replace(/\{\{issue_date\}\}/g, issueDate)
      .replace(/\{\{issuer_name\}\}/g, issuerProfile?.full_name || 'Instructor')
      .replace(/\{\{recipient_name\}\}/g, recipientName)

    // signature_date will be replaced when the waiver is signed

    // Create the waiver
    const { data: waiver, error: createError } = await supabase
      .from('waivers')
      .insert({
        template_id: template_id || null,
        title,
        description,
        content: processedContent,
        waiver_type: waiver_type || 'general',
        issued_by_id: user.id,
        issued_by_role: issuerProfile?.role || 'instructor',
        recipient_id: actualRecipientId || null,
        student_id: student_id || null,
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
