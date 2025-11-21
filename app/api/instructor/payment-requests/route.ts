import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function POST(request: Request) {
  try {
    const profile = await requireInstructor()
    const supabase = await createClient()

    const body = await request.json()
    const {
      recipient_type, // 'student' or 'studio'
      recipient_id, // ID if existing
      recipient_name,
      recipient_email,
      amount,
      payment_method,
      notes,
      class_id
    } = body

    // Validate: either recipient_id or recipient_name must be provided
    if (!recipient_id && !recipient_name?.trim()) {
      return NextResponse.json(
        { error: 'Please select or enter a recipient' },
        { status: 400 }
      )
    }

    if (!recipient_type || !recipient_name || !amount || !payment_method) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    let student_id: string | null = null
    let studio_id: string | null = null

    // Handle student payment request
    if (recipient_type === 'student') {
      if (recipient_id) {
        // Use existing student
        student_id = recipient_id
      } else {
        // Create new phantom student (no profile yet)
        const { data: newStudent, error: studentError } = await supabase
          .from('students')
          .insert({
            profile_id: null, // No profile until they sign up
            age_group: null,
            skill_level: null,
            goals: null,
            is_active: true
          })
          .select('id')
          .single()

        if (studentError) {
          console.error('Error creating student:', studentError)
          return NextResponse.json(
            { error: 'Failed to create student record' },
            { status: 500 }
          )
        }

        student_id = newStudent.id

        // Store contact info in notes or a separate field if available
        // For now, we'll include it in the payment notes
      }
    }

    // Handle studio payment request
    if (recipient_type === 'studio') {
      if (recipient_id) {
        // Use existing studio
        studio_id = recipient_id
      } else {
        // Create new phantom studio
        const { data: newStudio, error: studioError } = await supabase
          .from('studios')
          .insert({
            name: recipient_name,
            contact_email: recipient_email || null,
            city: null,
            state: null,
            is_active: true
          })
          .select('id')
          .single()

        if (studioError) {
          console.error('Error creating studio:', studioError)
          return NextResponse.json(
            { error: 'Failed to create studio record' },
            { status: 500 }
          )
        }

        studio_id = newStudio.id
      }
    }

    // Create payment record
    const paymentNotes =
      recipient_type === 'student'
        ? `Payment request to ${recipient_name}${recipient_email ? ` (${recipient_email})` : ''}\n${notes || ''}`
        : notes || ''

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        student_id: student_id,
        studio_id: studio_id,
        class_id: class_id || null,
        amount: parseFloat(amount),
        payment_method,
        payment_status: 'pending',
        notes: paymentNotes.trim(),
        transaction_date: new Date().toISOString()
      })
      .select('id')
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      return NextResponse.json(
        { error: paymentError.message },
        { status: 500 }
      )
    }

    // Create payment event for audit trail
    await supabase.from('payment_events').insert({
      payment_id: payment.id,
      event_type: 'created',
      actor_id: profile.id,
      notes: `Payment request created for ${recipient_type}`
    })

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      message: `Payment request created for ${recipient_name}`
    })
  } catch (error) {
    console.error('Error in POST /api/instructor/payment-requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
