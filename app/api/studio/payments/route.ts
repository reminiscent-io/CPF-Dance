import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudioAdmin } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const profile = await requireStudioAdmin()
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const classId = searchParams.get('class_id')

    // Get all payments with student, class, and studio information
    let query = supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_method,
        payment_status,
        transaction_date,
        notes,
        receipt_url,
        confirmed_by_instructor_at,
        confirmed_by_studio_at,
        student:students!payments_student_id_fkey(
          id,
          profile:profiles!students_profile_id_fkey(full_name, email, phone)
        ),
        class:classes!payments_class_id_fkey(
          id,
          title,
          start_time,
          class_type,
          instructor:profiles!classes_instructor_id_fkey(full_name, email)
        ),
        studio:studios!payments_studio_id_fkey(
          id,
          name,
          city,
          state
        )
      `)
      .order('transaction_date', { ascending: false })

    // Filter by payment status if provided
    if (status && status !== 'all') {
      query = query.eq('payment_status', status)
    }

    // Filter by class if provided
    if (classId) {
      query = query.eq('class_id', classId)
    }

    const { data: payments, error } = await query

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format the payments data
    const formattedPayments = payments?.map(payment => {
      const student = payment.student as any
      const studentProfile = Array.isArray(student?.profile)
        ? student.profile[0]
        : student?.profile

      const classData = payment.class as any
      const instructor = Array.isArray(classData?.instructor)
        ? classData.instructor[0]
        : classData?.instructor

      const studio = payment.studio as any
      const studioData = Array.isArray(studio) ? studio[0] : studio

      return {
        id: payment.id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        payment_status: payment.payment_status,
        transaction_date: payment.transaction_date,
        confirmed_by_instructor_at: payment.confirmed_by_instructor_at,
        confirmed_by_studio_at: payment.confirmed_by_studio_at,
        notes: payment.notes,
        receipt_url: payment.receipt_url,
        student: {
          id: student?.id,
          full_name: studentProfile?.full_name || 'Unknown',
          email: studentProfile?.email,
          phone: studentProfile?.phone
        },
        class: classData ? {
          id: classData.id,
          title: classData.title,
          start_time: classData.start_time,
          class_type: classData.class_type,
          instructor_name: instructor?.full_name || 'Unknown',
          instructor_email: instructor?.email
        } : null,
        studio: studioData ? {
          id: studioData.id,
          name: studioData.name,
          city: studioData.city,
          state: studioData.state
        } : null
      }
    }) || []

    // Calculate summary stats
    const stats = {
      total_payments: formattedPayments.length,
      total_amount: formattedPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      pending: formattedPayments.filter(p => p.payment_status === 'pending').length,
      confirmed: formattedPayments.filter(p => p.payment_status === 'confirmed').length,
      disputed: formattedPayments.filter(p => p.payment_status === 'disputed').length,
      cancelled: formattedPayments.filter(p => p.payment_status === 'cancelled').length
    }

    return NextResponse.json({
      payments: formattedPayments,
      stats
    })
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
