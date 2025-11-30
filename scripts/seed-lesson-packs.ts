// Script to seed initial lesson packs to Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedLessonPacks() {
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

  for (const pack of packs) {
    const { data, error } = await supabase
      .from('lesson_packs')
      .insert(pack)
      .select()

    if (error) {
      console.error(`Error creating pack "${pack.name}":`, error.message)
    } else {
      console.log(`✅ Created pack: ${pack.name}`)
    }
  }

  console.log('✨ Lesson packs seeded successfully!')
}

seedLessonPacks().catch(console.error)
