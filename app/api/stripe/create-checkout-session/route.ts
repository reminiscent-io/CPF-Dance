import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent, getDefaultInstructorId } from '@/lib/auth/server-auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

export async function POST(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()
    const { lesson_pack_id } = await request.json()

    if (!lesson_pack_id) {
      return NextResponse.json(
        { error: 'lesson_pack_id is required' },
        { status: 400 }
      )
    }

    const instructor_id = await getDefaultInstructorId()

    // Get the lesson pack
    const { data: pack, error: packError } = await supabase
      .from('lesson_packs')
      .select('*')
      .eq('id', lesson_pack_id)
      .single()

    if (packError || !pack) {
      return NextResponse.json(
        { error: 'Lesson pack not found' },
        { status: 404 }
      )
    }

    // Get student profile for customer info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', student.profile_id)
      .single()

    // Determine the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    console.log('Base URL being used:', baseUrl)
    console.log('Success URL will be:', `${baseUrl}/dancer/request-lesson?session_id={CHECKOUT_SESSION_ID}&success=true`)

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${pack.lesson_count} Private Lesson Pack`,
              description: `Pack of ${pack.lesson_count} private lessons`,
            },
            unit_amount: Math.round(pack.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/dancer/request-lesson?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${baseUrl}/dancer/request-lesson?canceled=true`,
      customer_email: profile?.email || undefined,
      metadata: {
        student_id: student.id,
        lesson_pack_id: lesson_pack_id,
        instructor_id: instructor_id,
        lesson_count: pack.lesson_count.toString(),
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
