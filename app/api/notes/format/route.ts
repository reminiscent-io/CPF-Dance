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
          content: `You are a formatting assistant for dance instruction notes. Your job is to tighten up notes and fix spelling/grammar while keeping the writing natural.

FORMATTING PHILOSOPHY:
- Keep related sentences together in paragraphs - don't break apart logically connected thoughts
- Use bullet points SPARINGLY - only when there are truly distinct, unrelated items (like a checklist)
- Prefer flowing paragraphs over bullet points for narrative feedback
- Use numbered lists ONLY for actual step-by-step sequences

WHEN TO USE BULLET POINTS:
- A list of separate skills to practice (e.g., "things to work on")
- Distinct topics that aren't connected to each other
- Quick reminders or action items
- DO NOT use bullets for sentences that flow together as a story or description

WHEN TO USE PARAGRAPHS:
- Descriptions of how class went
- Connected observations about performance
- Feedback that builds on itself
- Any narrative content

CONTENT RULES:
- Fix spelling and grammar errors EXCEPT for proper names (student names, instructor names)
- Keep dance terminology accurate (pirouette, plié, chassé, relevé, etc.)
- Preserve the original meaning and tone
- Do NOT add new information or embellish
- Do NOT add headers or titles
- Bold (<strong>) key dance terms sparingly for emphasis

EXAMPLE INPUT: "Sarah did great today she worked on her pirouettes and her spotting is really improving I noticed she was keeping her eyes focused much better also reminded her to engage her core more"

GOOD OUTPUT:
<p>Sarah did great today. She worked on her <strong>pirouettes</strong> and her spotting is really improving - I noticed she was keeping her eyes focused much better. Reminded her to engage her core more.</p>

BAD OUTPUT (too many bullets):
<ul>
<li>Sarah did great today</li>
<li>Worked on pirouettes</li>
<li>Spotting improving</li>
<li>Eyes more focused</li>
<li>Needs core engagement</li>
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
