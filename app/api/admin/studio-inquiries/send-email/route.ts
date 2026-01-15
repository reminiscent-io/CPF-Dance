import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/server-auth'
import { sendEmail } from '@/lib/gmail/client'

export async function POST(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()
    const { inquiryId, to, subject, body, studioName, contactName, originalMessage } = await request.json()

    if (!inquiryId || !to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: inquiry } = await supabase
      .from('studio_inquiries')
      .select('gmail_thread_id, last_email_message_id, email_count')
      .eq('id', inquiryId)
      .single()
    
    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    const fullBody = `
      <div style="font-family: Arial, sans-serif;">
        ${body}
        <br><br>
        <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
        <div style="color: #666; font-size: 12px;">
          <strong>Original Inquiry from ${contactName}:</strong><br>
          ${originalMessage}
        </div>
      </div>
    `

    const result = await sendEmail({
      to,
      subject,
      body: fullBody,
      threadId: inquiry?.gmail_thread_id || undefined,
      inReplyTo: inquiry?.last_email_message_id || undefined,
    })

    const { error: updateError } = await supabase
      .from('studio_inquiries')
      .update({
        gmail_thread_id: result.threadId,
        last_email_message_id: result.messageId,
        email_count: (inquiry.email_count ?? 0) + 1,
        last_email_date: new Date().toISOString(),
        is_responded: true,
        responded_at: new Date().toISOString(),
        status: 'responded',
        has_unread_reply: false,
      })
      .eq('id', inquiryId)

    if (updateError) {
      console.error('Error updating inquiry:', updateError)
    }

    return NextResponse.json({ 
      success: true, 
      threadId: result.threadId,
      messageId: result.messageId 
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
