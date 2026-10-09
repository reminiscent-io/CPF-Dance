import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { documentAssetIds } from '@/lib/promo/document'
import { DesignDocumentSchema } from '@/lib/promo/schema'
import { loadTemplateVersion } from '@/lib/promo/server/catalog'
import {
  ASSET_COLUMNS,
  designThumbPath,
  isUuid,
  PROMO_BUCKET,
  PromoError,
  promoErrorResponse,
  requirePromoInstructor,
} from '@/lib/promo/server/context'
import { livePublication, loadDesign, unpublish } from '@/lib/promo/server/designs'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

async function designId(params: Params['params']): Promise<string> {
  const { id } = await params
  if (!isUuid(id)) throw new PromoError('Promo not found.', 404, 'not_found')
  return id
}

/** Everything the editor needs: the design, its pinned template, the photos it shows, its siblings. */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { supabase } = await requirePromoInstructor()
    const design = await loadDesign(supabase, await designId(params))
    const version = await loadTemplateVersion(supabase, design.template_version_id)

    const assetIds = documentAssetIds(design.document)
    const [assets, siblings, publication, classes, template] = await Promise.all([
      assetIds.length
        ? supabase.from('promo_assets').select(ASSET_COLUMNS).in('id', assetIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('promo_designs')
        .select('id, format, title, updated_at')
        .eq('group_id', design.group_id)
        .order('created_at', { ascending: true }),
      livePublication(supabase, design.id),
      design.class_ids.length
        ? supabase.from('classes').select('id, title, start_time').in('id', design.class_ids)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('promo_templates')
        .select('current_version_id, current:promo_template_versions!promo_templates_current_version_fkey(version)')
        .eq('id', version.templateId)
        .maybeSingle(),
    ])
    if (assets.error) throw assets.error
    if (siblings.error) throw siblings.error
    if (classes.error) throw classes.error

    const currentId = template.data?.current_version_id as string | undefined
    const current = template.data?.current as { version: number } | { version: number }[] | null | undefined
    const currentNumber = Array.isArray(current) ? current[0]?.version : current?.version
    return NextResponse.json({
      design,
      template: {
        versionId: version.id,
        version: version.version,
        definition: version.definition,
        latest: currentId && currentId !== version.id && currentNumber ? { versionId: currentId, version: currentNumber } : null,
      },
      assets: assets.data ?? [],
      siblings: siblings.data ?? [],
      publication,
      classes: classes.data ?? [],
    })
  } catch (error) {
    return promoErrorResponse(error, 'GET /api/promo/designs/[id]')
  }
}

const PatchSchema = z
  .object({
    revision: z.number().int().positive(),
    document: DesignDocumentSchema.optional(),
    title: z.string().trim().min(1).max(200).optional(),
    classIds: z.array(z.guid()).max(8).optional(),
  })
  .refine((body) => body.document || body.title || body.classIds, 'Nothing to save')

/**
 * Autosave. The browser sends the revision it started from; a save from a
 * stale tab gets a 409 instead of overwriting newer work.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { supabase } = await requirePromoInstructor()
    const id = await designId(params)
    const parsed = PatchSchema.safeParse(await request.json())
    if (!parsed.success) throw new PromoError('Those changes aren’t valid.', 400)
    const input = parsed.data

    const changes: Record<string, unknown> = { revision: input.revision + 1 }
    if (input.document) changes.document = input.document
    if (input.title) changes.title = input.title
    if (input.classIds) changes.class_ids = input.classIds

    const { data, error } = await supabase
      .from('promo_designs')
      .update(changes)
      .eq('id', id)
      .eq('revision', input.revision)
      .select('revision, updated_at')
    if (error) throw error
    if (!data || data.length === 0) {
      const { data: current, error: readError } = await supabase
        .from('promo_designs')
        .select('revision')
        .eq('id', id)
        .maybeSingle()
      if (readError) throw readError
      if (!current) throw new PromoError('Promo not found.', 404, 'not_found')
      return NextResponse.json(
        {
          error: 'This promo changed on another device or tab. Reload to get the latest version.',
          code: 'conflict',
          revision: current.revision,
        },
        { status: 409 }
      )
    }
    return NextResponse.json(data[0])
  } catch (error) {
    return promoErrorResponse(error, 'PATCH /api/promo/designs/[id]')
  }
}

/** Deletes the promo; a live copy on the site comes down first. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { supabase, ownerId } = await requirePromoInstructor()
    const design = await loadDesign(supabase, await designId(params))

    const publication = await livePublication(supabase, design.id)
    if (publication) await unpublish(publication)

    const { error } = await supabase.from('promo_designs').delete().eq('id', design.id)
    if (error) throw error
    await supabase.storage.from(PROMO_BUCKET).remove([designThumbPath(design.owner_id ?? ownerId, design.id)])
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return promoErrorResponse(error, 'DELETE /api/promo/designs/[id]')
  }
}
