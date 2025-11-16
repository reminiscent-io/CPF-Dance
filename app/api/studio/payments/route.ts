import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudioAdmin } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const profile = await requireStudioAdmin()
    const supabase = await createClient()

    // Get all payments with student and class information
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_method,
        payment_status,
        transaction_date,
        notes,
        confirmed_by_instructor_at,
        confirmed_by_studio_at,
        students!payments_student_id_fkey(
          profile:profiles!students_profile_id_fkey(full_name)
        ),
        classes(title)
      `)
      .order('transaction_date', { ascending: false })

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_status: payment.payment_status,
      transaction_date: payment.transaction_date,
      notes: payment.notes,
      confirmed_by_instructor_at: payment.confirmed_by_instructor_at,
      confirmed_by_studio_at: payment.confirmed_by_studio_at,
      student_name: (payment.students as any)?.profile?.full_name || 'Unknown',
      class_title: (payment.classes as any)?.title || null
    }))

    return NextResponse.json({ payments: formattedPayments })
  } catch (error) {
    console.error('Error in studio payments GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await requireStudioAdmin()
    const supabase = await createClient()

    const body = await request.json()
    const { student_id, amount, payment_method, notes } = body

    // Validate required fields
    if (!student_id || !amount || !payment_method) {
      return NextResponse.json(
        { error: 'Missing required fields: student_id, amount, payment_method' },
        { status: 400 }
      )
    }

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        student_id,
        amount: parseFloat(amount),
        payment_method,
        payment_status: 'pending',
        notes: notes || null,
        confirmed_by_studio_at: new Date().toISOString()
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      return NextResponse.json({ error: paymentError.message }, { status: 500 })
    }

    // Create payment event
    await supabase.from('payment_events').insert({
      payment_id: payment.id,
      event_type: 'created',
      actor_id: profile.id,
      notes: 'Payment submitted by studio admin'
    })

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error('Error in studio payments POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
