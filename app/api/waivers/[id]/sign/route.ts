import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
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
    const { signature_image, signer_name, signer_email } = body

    if (!signature_image || !signer_name || !signer_email) {
      return NextResponse.json(
        { error: 'Missing signature data' },
        { status: 400 }
      )
    }

    // Verify user has permission to sign this waiver
    const { data: waiver, error: fetchError } = await supabase
      .from('waivers')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !waiver) {
      return NextResponse.json({ error: 'Waiver not found' }, { status: 404 })
    }

    if (waiver.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to sign this waiver' }, { status: 403 })
    }

    // Save signature to Supabase storage
    const fileName = `waiver-${id}-${Date.now()}.png`
    const base64Data = signature_image.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    const { error: uploadError } = await supabase.storage
      .from('waiver-signatures')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: false
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('waiver-signatures')
      .getPublicUrl(fileName)

    // Replace signature_date template variable
    const signatureDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })

    const updatedContent = waiver.content.replace(
      /\{\{signature_date\}\}/g,
      signatureDate
    )

    // Update waiver with signature
    const { data: updatedWaiver, error: updateError } = await supabase
      .from('waivers')
      .update({
        content: updatedContent,
        signature_image_url: publicUrl,
        signed_at: new Date().toISOString(),
        signed_by_id: user.id,
        status: 'signed'
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Create signature record
    const { error: signatureError } = await supabase
      .from('waiver_signatures')
      .insert({
        waiver_id: id,
        signed_by_id: user.id,
        signer_name,
        signer_email,
        signature_image_url: publicUrl,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    if (signatureError) {
      throw signatureError
    }

    return NextResponse.json({ waiver: updatedWaiver })
  } catch (error: any) {
    console.error('Error signing waiver:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sign waiver' },
      { status: 500 }
    )
  }
}
