import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a formatting assistant for dance instruction notes. Your job is to:
1. Fix spelling and grammar errors EXCEPT for proper names (student names, instructor names, dance move names, studio names)
2. Improve formatting and structure while keeping the content essentially the same
3. Use appropriate paragraph breaks and punctuation
4. Keep dance terminology accurate (e.g., pirouette, plié, chassé, relevé, etc.)
5. Preserve the original tone and voice of the instructor
6. Keep the content in HTML format suitable for a rich text editor (use <p>, <strong>, <em>, <ul>, <li> tags as appropriate)
7. Do NOT add new information or significantly change the meaning
8. Do NOT add headers or titles - just format the body content
9. Keep it concise - don't expand abbreviations unnecessarily

Return ONLY the formatted HTML content, nothing else.`
        },
        {
          role: 'user',
          content: `Please format and clean up this dance instruction note:\n\n${content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const formattedContent = completion.choices[0]?.message?.content?.trim() || content

    return NextResponse.json({ 
      success: true, 
      formattedContent 
    })
  } catch (error) {
    console.error('Error formatting note:', error)
    return NextResponse.json(
      { error: 'Failed to format note' },
      { status: 500 }
    )
  }
}
