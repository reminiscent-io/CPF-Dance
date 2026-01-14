import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { full_name, email, phone, message } = body

    // Validate required fields
    if (!full_name || !full_name.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if a request with this email already exists
    const { data: existingRequest } = await supabase
      .from('instructor_access_requests')
      .select('id, status')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { error: 'A request with this email is already pending review' },
          { status: 409 }
        )
      } else if (existingRequest.status === 'approved') {
        return NextResponse.json(
          { error: 'This email has already been approved. Please check your email for the signup link.' },
          { status: 409 }
        )
      }
      // If rejected, allow them to submit again by updating the existing record
      const { error: updateError } = await supabase
        .from('instructor_access_requests')
        .update({
          full_name: full_name.trim(),
          phone: phone?.trim() || null,
          message: message?.trim() || null,
          status: 'pending',
          reviewed_at: null,
          reviewed_by: null,
          admin_notes: null
        })
        .eq('id', existingRequest.id)

      if (updateError) {
        console.error('Error updating instructor access request:', updateError)
        return NextResponse.json(
          { error: 'Failed to submit request. Please try again.' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Your request has been resubmitted. We will review it and reach out soon.'
      })
    }

    // Insert new request
    const { error: insertError } = await supabase
      .from('instructor_access_requests')
      .insert({
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        message: message?.trim() || null
      })

    if (insertError) {
      console.error('Error creating instructor access request:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit request. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your interest! We will review your request and reach out soon.'
    })
  } catch (error) {
    console.error('Error in instructor access request:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
