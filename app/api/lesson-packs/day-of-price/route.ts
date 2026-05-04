import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDayOfLessonPrice } from '@/lib/lesson-credits'

export async function GET() {
  const supabase = await createClient()
  const price = await getDayOfLessonPrice(supabase)
  return NextResponse.json({ price })
}
