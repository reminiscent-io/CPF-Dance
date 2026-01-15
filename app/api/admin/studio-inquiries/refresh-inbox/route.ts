import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/server-auth'
import { getThreadMessages, searchEmails } from '@/lib/gmail/client'

export async function POST(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const { data: inquiries } = await supabase
      .from('studio_inquiries')
      .select('id, gmail_thread_id, email_count, studio_name')
      .not('gmail_thread_id', 'is', null)

    if (!inquiries || inquiries.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No inquiries with email threads to check',
        updatedCount: 0 
      })
    }

    let updatedCount = 0

    for (const inquiry of inquiries) {
      if (!inquiry.gmail_thread_id) continue

      try {
        console.log(`[Refresh] Checking thread ${inquiry.gmail_thread_id} for inquiry ${inquiry.id}`);
        const messages = await getThreadMessages(inquiry.gmail_thread_id)
        const newEmailCount = messages.length
        console.log(`[Refresh] Found ${newEmailCount} messages (previous: ${inquiry.email_count || 0})`);

        const hasNewReplies = newEmailCount > (inquiry.email_count || 0)
        const lastMessage = messages[messages.length - 1]
        const hasUnreadReply = hasNewReplies && lastMessage && !lastMessage.isFromMe

        if (hasNewReplies) {
          console.log(`[Refresh] Updating inquiry ${inquiry.id} - New messages found. Unread: ${hasUnreadReply}`);
            .from('studio_inquiries')
            .update({
              email_count: newEmailCount,
              last_email_date: lastMessage?.date ? new Date(lastMessage.date).toISOString() : new Date().toISOString(),
              has_unread_reply: hasUnreadReply,
            })
            .eq('id', inquiry.id)

          updatedCount++
        }
      } catch (threadError) {
        console.error(`Error checking thread for inquiry ${inquiry.id}:`, threadError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Checked ${inquiries.length} threads, ${updatedCount} with new messages`,
      updatedCount 
    })
  } catch (error) {
    console.error('Error refreshing inbox:', error)
    return NextResponse.json({ error: 'Failed to refresh inbox' }, { status: 500 })
  }
}
