import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'

// GET - Fetch all templates for the current user
export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only instructors and admins can access templates' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Get templates created by user or shared templates
    const { data: templates, error } = await supabase
      .from('waiver_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error: any) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only instructors and admins can create templates' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const body = await request.json()

    const {
      title,
      description,
      content_type,
      content,
      pdf_url,
      pdf_filename,
      waiver_type,
      is_shared
    } = body

    if (!title || !content_type) {
      return NextResponse.json(
        { error: 'Title and content_type are required' },
        { status: 400 }
      )
    }

    if (content_type === 'rich_text' && !content) {
      return NextResponse.json(
        { error: 'Content is required for rich text templates' },
        { status: 400 }
      )
    }

    if (content_type === 'pdf' && !pdf_url) {
      return NextResponse.json(
        { error: 'PDF URL is required for PDF templates' },
        { status: 400 }
      )
    }

    const { data: template, error } = await supabase
      .from('waiver_templates')
      .insert({
        title,
        description,
        content_type,
        content: content || null,
        pdf_url: pdf_url || null,
        pdf_filename: pdf_filename || null,
        waiver_type: waiver_type || 'general',
        is_shared: is_shared || false,
        created_by_id: profile.id
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    )
  }
}
