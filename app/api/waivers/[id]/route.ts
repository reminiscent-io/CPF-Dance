import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RLS policies will automatically filter based on:
    // - Issuer can view
    // - Recipient can view
    // - Signer can view
    // - Admins can view all
    // - Guardians can view their student's waivers
    const { data: waiver, error } = await supabase
      .from('waivers')
      .select('*, waiver_signatures(*)')
      .eq('id', id)
      .single()

    if (error || !waiver) {
      return NextResponse.json({ error: 'Waiver not found' }, { status: 404 })
    }

    return NextResponse.json({ waiver })
  } catch (error: any) {
    console.error('Error fetching waiver:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch waiver' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, declined_reason } = body

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Verify permission to update
    const { data: waiver, error: fetchError } = await supabase
      .from('waivers')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !waiver) {
      return NextResponse.json({ error: 'Waiver not found' }, { status: 404 })
    }

    // Check permissions: issuer, recipient, or admin
    const isIssuer = waiver.issued_by_id === user.id
    const isRecipient = waiver.recipient_id === user.id
    const isAdmin = profile?.role === 'admin'

    if (!isIssuer && !isRecipient && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update waiver
    const updateData: any = { status }
    if (status === 'declined') {
      updateData.declined_reason = declined_reason
      updateData.declined_at = new Date().toISOString()
    }

    const { data: updatedWaiver, error: updateError } = await supabase
      .from('waivers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ waiver: updatedWaiver })
  } catch (error: any) {
    console.error('Error updating waiver:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update waiver' },
      { status: 500 }
    )
  }
}
