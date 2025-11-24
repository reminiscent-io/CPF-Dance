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
    const { status, declined_reason, title, description, expires_at } = body

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

    // Build update data
    const updateData: any = {}

    // Status updates (by recipient or issuer)
    if (status !== undefined) {
      updateData.status = status
      if (status === 'declined') {
        updateData.declined_reason = declined_reason
        updateData.declined_at = new Date().toISOString()
      }
    }

    // Metadata updates (by issuer only, and only for pending waivers)
    if (isIssuer || isAdmin) {
      if (waiver.status === 'pending') {
        if (title !== undefined) updateData.title = title
        if (description !== undefined) updateData.description = description
        if (expires_at !== undefined) updateData.expires_at = expires_at
      } else if (title !== undefined || description !== undefined || expires_at !== undefined) {
        return NextResponse.json(
          { error: 'Can only edit title, description, and expiration for pending waivers' },
          { status: 400 }
        )
      }
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

// DELETE - Delete a waiver (only if not signed)
export async function DELETE(
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

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Verify permission and check if waiver can be deleted
    const { data: waiver, error: fetchError } = await supabase
      .from('waivers')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !waiver) {
      return NextResponse.json({ error: 'Waiver not found' }, { status: 404 })
    }

    // Check permissions: only issuer or admin can delete
    const isIssuer = waiver.issued_by_id === user.id
    const isAdmin = profile?.role === 'admin'

    if (!isIssuer && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Prevent deletion of signed waivers
    if (waiver.status === 'signed') {
      return NextResponse.json(
        { error: 'Cannot delete a signed waiver. Signed waivers must be kept for legal records.' },
        { status: 400 }
      )
    }

    // Delete the waiver
    const { error: deleteError } = await supabase
      .from('waivers')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting waiver:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete waiver' },
      { status: 500 }
    )
  }
}
