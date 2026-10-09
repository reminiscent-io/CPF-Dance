import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emptyDocument, normalizeDocument } from '@/lib/promo/document'
import { DesignDocumentSchema, PromoBriefSchema } from '@/lib/promo/schema'
import { activeTemplateBySlug, loadStudioBrand, loadTemplateVersion } from '@/lib/promo/server/catalog'
import { PromoError, promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'
import { DESIGN_COLUMNS, DESIGN_LIST_COLUMNS, defaultTitle } from '@/lib/promo/server/designs'
import type { DesignDocument } from '@/lib/promo/types'

export const dynamic = 'force-dynamic'

/** Her promos, newest first, with which ones are live on the site. */
export async function GET() {
  try {
    const { supabase, ownerId } = await requirePromoInstructor()
    const { data, error } = await supabase
      .from('promo_designs')
      .select(DESIGN_LIST_COLUMNS)
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
      .limit(200)
    if (error) throw error
    const designs = data ?? []

    const { data: live, error: liveError } = designs.length
      ? await supabase
          .from('promo_publications')
          .select('design_id, public_url, class_id')
          .in(
            'design_id',
            designs.map((design) => design.id)
          )
          .is('unpublished_at', null)
      : { data: [], error: null }
    if (liveError) throw liveError

    const classIds = [...new Set(designs.flatMap((design) => (design.class_ids as string[]) ?? []))]
    const { data: classes, error: classError } = classIds.length
      ? await supabase.from('classes').select('id, title, start_time').in('id', classIds)
      : { data: [], error: null }
    if (classError) throw classError

    return NextResponse.json({ designs, publications: live ?? [], classes: classes ?? [] })
  } catch (error) {
    return promoErrorResponse(error, 'GET /api/promo/designs')
  }
}

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  format: z.enum(['ig_post', 'ig_story', 'poster']),
  templateVersionId: z.guid().optional(),
  templateSlug: z.string().max(80).optional(),
  classIds: z.array(z.guid()).max(8).optional(),
  brief: PromoBriefSchema.partial().optional(),
  document: DesignDocumentSchema.optional(),
  source: z.enum(['generate', 'manual']).default('manual'),
  aiCallId: z.guid().nullable().optional(),
})

/**
 * Creates a promo from a document the browser assembled (an AI variation, or
 * the facts-only fallback). The brand kit is copied in now, so later brand
 * edits never change this promo.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, ownerId } = await requirePromoInstructor()
    const parsed = CreateSchema.safeParse(await request.json())
    if (!parsed.success) throw new PromoError('That promo is missing details. Try again.', 400)
    const input = parsed.data

    const version = input.templateVersionId
      ? await loadTemplateVersion(supabase, input.templateVersionId)
      : (await activeTemplateBySlug(supabase, input.templateSlug)).version
    if (!version.publishedAt) throw new PromoError('That template isn’t published yet.', 400, 'draft_template')
    if (!version.definition.formats[input.format]) {
      throw new PromoError('This template has no layout for that format.', 400, 'no_format')
    }

    const document = normalizeDocument(
      (input.document as DesignDocument | undefined) ?? emptyDocument(version.definition),
      version.definition
    )
    const brand = await loadStudioBrand(supabase)

    const { data: design, error } = await supabase
      .from('promo_designs')
      .insert({
        owner_id: ownerId,
        title: input.title ?? defaultTitle(document, input.brief?.titleIdea),
        template_version_id: version.id,
        format: input.format,
        class_ids: input.classIds ?? input.brief?.classIds ?? [],
        brief: input.brief ?? {},
        document,
        brand_snapshot: brand,
      })
      .select(DESIGN_COLUMNS)
      .single()
    if (error) throw error

    // The starting point, so an AI revision or a restore always has something to go back to.
    await supabase.from('promo_design_revisions').insert({
      design_id: design.id,
      owner_id: ownerId,
      revision: 1,
      document,
      source: input.source === 'generate' ? 'generate' : 'checkpoint',
      ai_call_id: input.aiCallId ?? null,
    })

    return NextResponse.json({ design }, { status: 201 })
  } catch (error) {
    return promoErrorResponse(error, 'POST /api/promo/designs')
  }
}
