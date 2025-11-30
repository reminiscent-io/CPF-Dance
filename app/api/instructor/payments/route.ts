import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const profile = await requireInstructor()
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const classId = searchParams.get('class_id')

    // Get all payments for classes taught by this instructor
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
          instructor_id
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

    // Filter to only include payments for this instructor's classes
    // Admins can see all payments
    const instructorPayments = profile.role === 'admin'
      ? (payments || [])
      : (payments?.filter(payment => {
          const classData = payment.class as any
          return classData && classData.instructor_id === profile.id
        }) || [])

    // Format the payments data
    const formattedPayments = instructorPayments.map(payment => {
      const student = payment.student as any
      const studentProfile = Array.isArray(student?.profile)
        ? student.profile[0]
        : student?.profile

      const classData = payment.class as any

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
          class_type: classData.class_type
        } : null,
        studio: studioData ? {
          id: studioData.id,
          name: studioData.name,
          city: studioData.city,
          state: studioData.state
        } : null
      }
    })

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
    console.error('Error in instructor payments GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
