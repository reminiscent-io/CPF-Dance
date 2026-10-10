import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { enrollStudent } from '@/lib/class-enrollment'
import { parseSignupRef, sameLink, signupUrlFor, type SignupRef } from '@/lib/signup-link'

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

    // A class Payment Link opened from the dancer portal carries a signup
    // ref. Card payments settle on completed; bank debits settle later.
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session
      const ref = parseSignupRef(session.client_reference_id)
      if (ref) {
        if (session.payment_status === 'unpaid') {
          return NextResponse.json({ received: true })
        }
        return confirmClassSignup(session, ref)
      }
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Extract metadata
      const { student_id, lesson_pack_id, lesson_count } = session.metadata || {}

      // Not one of ours (a payment link sold outside the portal, say).
      // Acknowledge it so Stripe doesn't retry.
      if (!student_id || !lesson_pack_id || !lesson_count) {
        console.log('Ignoring checkout session without lesson pack metadata:', session.id)
        return NextResponse.json({ received: true })
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

// Enroll the dancer named in the signup ref, once we know the money went to
// that class's own link. Problems the dancer can fix by confirming in the
// portal (class full, link mismatch) are logged and acknowledged; only
// database errors return 500 so Stripe retries.
async function confirmClassSignup(session: Stripe.Checkout.Session, ref: SignupRef) {
  const supabase = createServiceClient()
  const skip = (reason: string) => {
    console.warn(`Class signup ${session.id} not auto-confirmed: ${reason}`)
    return NextResponse.json({ received: true })
  }

  const { data: cls } = await supabase
    .from('classes')
    .select('id, external_signup_url, workshop_signup_url')
    .eq('id', ref.classId)
    .single()
  if (!cls) return skip('class not found')

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('id', ref.studentId)
    .single()
  if (!student) return skip('student not found')

  // The ref rides in the URL, so check the sale was on the link this class
  // sells for that option, not a cheaper one with a doctored ref.
  if (!session.payment_link) return skip('not a payment link sale')
  const paymentLink = typeof session.payment_link === 'string'
    ? await stripe.paymentLinks.retrieve(session.payment_link)
    : session.payment_link
  if (!sameLink(paymentLink.url, signupUrlFor(cls, ref.option))) {
    return skip(`paid link ${paymentLink.url} is not this class's sign-up link`)
  }

  const result = await enrollStudent(supabase, supabase, ref.studentId, ref.classId, ref.option)
  if (result.ok) {
    console.log(`Class signup confirmed from Stripe: student ${ref.studentId}, class ${ref.classId}`)
    return NextResponse.json({ received: true })
  }
  if (result.already_enrolled) return NextResponse.json({ received: true })
  if (result.status >= 500) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return skip(result.error)
}
