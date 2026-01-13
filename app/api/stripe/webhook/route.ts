import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Create a Supabase client with service role key to bypass RLS
// This is necessary because webhooks come from Stripe (no user session)
function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      )
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Extract metadata
      const { student_id, lesson_pack_id, instructor_id, lesson_count } = session.metadata || {}

      if (!student_id || !lesson_pack_id || !lesson_count) {
        console.error('Missing required metadata in checkout session')
        return NextResponse.json(
          { error: 'Missing metadata' },
          { status: 400 }
        )
      }

      // Create the lesson pack purchase using service role client
      // This bypasses RLS since webhooks don't have user sessions
      const supabase = createServiceClient()

      const { data: purchase, error: insertError } = await supabase
        .from('lesson_pack_purchases')
        .insert({
          student_id: student_id,
          lesson_pack_id: lesson_pack_id,
          remaining_lessons: parseInt(lesson_count),
          stripe_checkout_session_id: session.id,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating lesson pack purchase:', insertError)
        return NextResponse.json(
          { error: 'Failed to create purchase record' },
          { status: 500 }
        )
      }

      console.log('Lesson pack purchase created:', purchase.id)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
