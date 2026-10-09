import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { TemplateDefinitionSchema } from '@/lib/promo/schema'
import { isUuid, PromoError, promoErrorResponse, requirePromoAdmin } from '@/lib/promo/server/context'
import { DEFINITION_FORMAT } from '@/lib/promo/types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const BodySchema = z.object({ definition: TemplateDefinitionSchema, notes: z.string().max(500).optional() })

async function templateId(params: Params['params']) {
  const { id } = await params
  if (!isUuid(id)) throw new PromoError('Template not found.', 404)
  return id
}

/**
 * Autosaves the one draft a template can have, creating it as the next
 * version number on first save. Drafts may fail the layout checks; only
 * publishing requires them to pass.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { supabase, profile } = await requirePromoAdmin()
    const id = await templateId(params)
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      throw new PromoError(`The template isn’t valid: ${issue?.path.join('.') || 'definition'} ${issue?.message ?? ''}`.trim(), 400)
    }
    const { definition, notes } = parsed.data

    const { data: draft, error: draftError } = await supabase
      .from('promo_template_versions')
      .select('id, version')
      .eq('template_id', id)
      .is('published_at', null)
      .maybeSingle()
    if (draftError) throw draftError

    if (draft) {
      const { data, error } = await supabase
        .from('promo_template_versions')
        .update({ definition, notes: notes ?? null })
        .eq('id', draft.id)
        .is('published_at', null)
        .select('id, version, updated_at')
        .single()
      if (error) throw error
      return NextResponse.json({ draft: data })
    }

    const { data: latest, error: latestError } = await supabase
      .from('promo_template_versions')
      .select('version')
      .eq('template_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestError) throw latestError
    const { data, error } = await supabase
      .from('promo_template_versions')
      .insert({
        template_id: id,
        version: (latest?.version ?? 0) + 1,
        definition,
        definition_format: DEFINITION_FORMAT,
        notes: notes ?? null,
        created_by: profile.id,
      })
      .select('id, version, updated_at')
      .single()
    if (error) {
      if (error.code === '23505') throw new PromoError('Another tab just started a draft. Reload to continue.', 409, 'conflict')
      throw error
    }
    return NextResponse.json({ draft: data }, { status: 201 })
  } catch (error) {
    return promoErrorResponse(error, 'PUT /api/admin/promo/templates/[id]/draft')
  }
}

/** Throws the draft away; the live version stays as it is. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { supabase } = await requirePromoAdmin()
    const id = await templateId(params)
    const { error } = await supabase.from('promo_template_versions').delete().eq('template_id', id).is('published_at', null)
    if (error) throw error
    return NextResponse.json({ discarded: true })
  } catch (error) {
    return promoErrorResponse(error, 'DELETE /api/admin/promo/templates/[id]/draft')
  }
}
