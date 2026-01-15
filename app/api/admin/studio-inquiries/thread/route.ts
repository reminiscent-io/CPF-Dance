import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/server-auth'
import { getThreadMessages } from '@/lib/gmail/client'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin')
    
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')

    if (!threadId) {
      return NextResponse.json({ error: 'Missing threadId' }, { status: 400 })
    }

    const messages = await getThreadMessages(threadId)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching thread:', error)
    return NextResponse.json({ error: 'Failed to fetch thread' }, { status: 500 })
  }
}
