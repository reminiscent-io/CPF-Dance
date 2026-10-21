import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { enrollStudent } from '@/lib/class-enrollment'
import { parseSignupRef, sameLink, signupUrlFor, type SignupRef } from '@/lib/signup-link'
import { findStudentByEmail, matchPaidLink, purchaseRow, type LinkedClass } from '@/lib/class-purchases'

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
      // No ref: someone bought from the raw link. Lesson packs sell through
      // our own checkout sessions, never a payment link.
      if (session.payment_link) {
        if (session.payment_status === 'unpaid') {
          return NextResponse.json({ received: true })
        }
        return recordLinkSale(session)
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
// that class's own link, and book the sale. A ref we can't honor (unknown
// class or dancer, wrong link) is booked like an untagged sale. Only database
// errors return 500 so Stripe retries.
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
  if (!cls) return recordLinkSale(session)

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('id', ref.studentId)
    .single()
  // A ref we can't honor still leaves a real sale: book it like an untagged one
  if (!student) return recordLinkSale(session)

  // The ref rides in the URL, so check the sale was on the link this class
  // sells for that option, not a cheaper one with a doctored ref.
  if (!session.payment_link) return skip('not a payment link sale')
  const paymentLink = typeof session.payment_link === 'string'
    ? await stripe.paymentLinks.retrieve(session.payment_link)
    : session.payment_link
  if (!sameLink(paymentLink.url, signupUrlFor(cls, ref.option))) {
    console.warn(`Class signup ${session.id}: paid link ${paymentLink.url} is not this class's sign-up link`)
    return recordLinkSale(session, paymentLink)
  }

  const result = await enrollStudent(supabase, supabase, ref.studentId, ref.classId, ref.option)
  if (!result.ok && result.status >= 500) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  // Keep the sale on the books either way. One we couldn't enroll (class
  // full, say) shows the instructor as paid, not yet linked.
  const enrolled = result.ok || result.already_enrolled === true
  const recorded = await savePurchase(supabase, purchaseRow(session, ref.classId, ref.option, enrolled ? ref.studentId : null))
  if (!recorded) return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 })

  if (result.ok) {
    console.log(`Class signup confirmed from Stripe: student ${ref.studentId}, class ${ref.classId}`)
  }
  if (enrolled) return NextResponse.json({ received: true })
  return skip(result.error)
}

// A sale on a class link with no ref. Record it against the class whose link
// was paid, and enroll the buyer when their email names exactly one dancer.
// Links that aren't any class's (a lesson pack sold outside the portal, say)
// are acknowledged and left alone.
async function recordLinkSale(session: Stripe.Checkout.Session, retrieved?: Stripe.PaymentLink) {
  const supabase = createServiceClient()

  if (!session.payment_link) return NextResponse.json({ received: true })
  const paymentLink = retrieved ?? (typeof session.payment_link === 'string'
    ? await stripe.paymentLinks.retrieve(session.payment_link)
    : session.payment_link)

  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id, start_time, class_type, series_id, workshop_full_only, external_signup_url, workshop_signup_url')
    .or('external_signup_url.not.is.null,workshop_signup_url.not.is.null')
    .eq('is_cancelled', false)
    .gte('start_time', new Date(session.created * 1000).toISOString())
  if (classesError) {
    console.error('Error loading classes for link sale:', classesError)
    return NextResponse.json({ error: 'Failed to load classes' }, { status: 500 })
  }

  const match = matchPaidLink((classes || []) as LinkedClass[], paymentLink.url)
  if (!match) {
    console.log(`Payment link sale ${session.id} matches no class link; ignoring`)
    return NextResponse.json({ received: true })
  }

  // Record first, unlinked, so a retry after a failed enrollment can't lose the sale
  const recorded = await savePurchase(supabase, purchaseRow(session, match.classId, match.option, null))
  if (!recorded) return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 })

  const studentId = match.ambiguous ? null : await findStudentByEmail(supabase, session.customer_details?.email)
  if (!studentId) {
    console.log(`Link sale ${session.id} recorded on class ${match.classId}; not yet linked to a dancer`)
    return NextResponse.json({ received: true })
  }

  const result = await enrollStudent(supabase, supabase, studentId, match.classId, match.option)
  if (!result.ok && !result.already_enrolled) {
    if (result.status >= 500) return NextResponse.json({ error: result.error }, { status: 500 })
    console.warn(`Link sale ${session.id} recorded but not enrolled: ${result.error}`)
    return NextResponse.json({ received: true })
  }

  const { error: linkError } = await supabase
    .from('class_purchases')
    .update({ student_id: studentId })
    .eq('stripe_checkout_session_id', session.id)
  if (linkError) {
    console.error('Error linking purchase to student:', linkError)
    return NextResponse.json({ error: 'Failed to link purchase' }, { status: 500 })
  }

  console.log(`Link sale ${session.id} enrolled student ${studentId} in class ${match.classId}`)
  return NextResponse.json({ received: true })
}

// Stripe retries and sends completed + async_payment_succeeded for one
// checkout, so the session id is the key and a repeat is a no-op.
async function savePurchase(supabase: ReturnType<typeof createServiceClient>, row: ReturnType<typeof purchaseRow>) {
  const { error } = await supabase
    .from('class_purchases')
    .upsert(row, { onConflict: 'stripe_checkout_session_id', ignoreDuplicates: true })
  if (error) console.error('Error recording class purchase:', error)
  return !error
}
