import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const packs = [
      {
        name: '2 Lesson Pack',
        lesson_count: 2,
        price: 39.99
      },
      {
        name: '5 Lesson Pack',
        lesson_count: 5,
        price: 89.99
      },
      {
        name: '10 Lesson Pack',
        lesson_count: 10,
        price: 159.99
      }
    ]

    const { data, error } = await supabase
      .from('lesson_packs')
      .insert(packs)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, created: data }, { status: 201 })
  } catch (error) {
    console.error('Error seeding lesson packs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
