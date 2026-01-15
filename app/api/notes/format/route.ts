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
3. Use smart paragraph breaks to separate distinct ideas or topics
4. Convert lists of items into bullet points (<ul><li>) when appropriate
5. Use numbered lists (<ol><li>) for sequences or steps
6. Bold (<strong>) key terms, dance moves, or important points sparingly
7. Keep dance terminology accurate (e.g., pirouette, plié, chassé, relevé, etc.)
8. Preserve the original tone and voice of the instructor
9. Keep the content in HTML format suitable for a rich text editor
10. Do NOT add new information or significantly change the meaning
11. Do NOT add headers or titles - just format the body content
12. Keep it concise - don't expand abbreviations unnecessarily
13. Tighten up run-on sentences and improve readability

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
