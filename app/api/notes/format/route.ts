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
          content: `You are a formatting assistant for dance instruction notes. Your job is to make notes easier to read by breaking up dense text.

IMPORTANT FORMATTING RULES:
1. Analyze the content and identify distinct feedback points, observations, or topics
2. Break up long paragraphs into separate <p> tags for each distinct thought
3. When there are multiple pieces of feedback or observations, convert them into bullet points (<ul><li>)
4. Use numbered lists (<ol><li>) for sequences, steps, or progressions
5. Each bullet point should be a single, clear observation or piece of feedback
6. Add blank lines between sections by using separate <p> tags
7. Bold (<strong>) key dance moves or critical points sparingly

CONTENT RULES:
- Fix spelling and grammar errors EXCEPT for proper names (student names, instructor names, dance move names)
- Keep dance terminology accurate (pirouette, plié, chassé, relevé, etc.)
- Preserve the original meaning and tone
- Do NOT add new information
- Do NOT add headers or titles
- Keep it concise

EXAMPLE: If input is "Sarah did great today she worked on her pirouettes and her spotting is improving also her arms need work on the port de bras"

Output should be:
<p>Sarah did great today.</p>
<ul>
<li>Worked on <strong>pirouettes</strong> - spotting is improving</li>
<li>Arms need work on the <strong>port de bras</strong></li>
</ul>

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
