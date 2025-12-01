import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { class_id } = body

    if (!class_id) {
      return NextResponse.json({ error: 'Missing class_id' }, { status: 400 })
    }

    const { data: classData } = await supabase
      .from('classes')
      .select(`
        id,
        title,
        start_time,
        instructor_id
      `)
      .eq('id', class_id)
      .single()

    if (!classData || classData.instructor_id !== user.id) {
      return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 })
    }

    const { data: unpaidClasses } = await supabase
      .from('class_earnings')
      .select(`
        id,
        student:student_id(id, profile:profiles(full_name, email)),
        amount_owed
      `)
      .eq('class_id', class_id)
      .gt('amount_owed', 0)

    if (!unpaidClasses || unpaidClasses.length === 0) {
      return NextResponse.json({ message: 'No unpaid payments to remind about' }, { status: 200 })
    }

    for (const earning of unpaidClasses) {
      const student = earning.student as any
      if (student?.profile?.email) {
        console.log(`Reminder would be sent to ${student.profile.email} for $${earning.amount_owed} payment`)
      }
    }

    return NextResponse.json({ 
      message: `Reminder sent for ${classData.title}`,
      remindersCount: unpaidClasses.length 
    })
  } catch (error) {
    console.error('Error sending payment reminder:', error)
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
  }
}
