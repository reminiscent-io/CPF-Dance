import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Signout error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
