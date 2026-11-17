import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPathUnder } from '@/lib/storage/direct-upload'
import { isUuid, PromoError, promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'
import {
  livePublication,
  loadDesign,
  PUBLIC_ASSETS_BUCKET,
  PUBLICATION_COLUMNS,
  PUBLISH_MAX_BYTES,
  publicCopyPrefix,
  unpublish,
} from '@/lib/promo/server/designs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

async function designIdFrom(params: Params['params']) {
  const { id } = await params
  if (!isUuid(id)) throw new PromoError('Promo not found.', 404, 'not_found')
  return id
}

function isJpeg(bytes: Uint8Array) {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

/**
 * Puts a web-size render of the promo on the site: a copy in the public
 * `assets` bucket with an `assets` row, so the class form's picker and
 * /instructor/assets see it, and optionally the class's image. Body:
 * { path, classId? }, with `path` from POST ./upload-url: the browser has
 * already put the JPEG there (Vercel caps request bodies at 4.5 MB). Her
 * session proves she owns the promo and the class; the service role then
 * checks the file and writes the publication. Republishing replaces the
 * previous copy, and the new one is in place before the old one comes down,
 * so a failed publish leaves the current copy live and removes the new file.
 */
export async function POST(request: NextRequest, { params }: Params) {
  let admin: ReturnType<typeof createAdminClient> | null = null
  let uploadedPath: string | null = null
  let assetId: string | null = null
  let classRestore: { classId: string; assetId: string | null } | null = null
  try {
    const { supabase, ownerId, isAdmin } = await requirePromoInstructor()
    const design = await loadDesign(supabase, await designIdFrom(params))
    if (design.owner_id !== ownerId) throw new PromoError('Only the promo’s owner can publish it.', 403, 'not_owner')

    const body = await request.json().catch(() => null)
    const classId = typeof body?.classId === 'string' && body.classId ? body.classId : null
    const path = body?.path
    if (!isPathUnder(path, publicCopyPrefix(ownerId, design.id))) {
      throw new PromoError('The image didn’t arrive. Try again.', 400)
    }
    if (classId && !isUuid(classId)) throw new PromoError('That class wasn’t found.', 404)

    // A path that's already a publication isn't a new upload: adopting it would
    // let unpublishing the old copy delete the new one's file.
    admin = createAdminClient()
    const { data: reused, error: reusedError } = await admin
      .from('promo_publications')
      .select('id')
      .eq('public_path', path)
      .limit(1)
    if (reusedError) throw reusedError
    if (reused && reused.length > 0) throw new PromoError('Publishing failed. Try again.', 409)
    // From here on the file is this publish's own, and any failure removes it.
    uploadedPath = path

    if (classId) {
      const { data: cls, error: classError } = await supabase
        .from('classes')
        .select('id, instructor_id')
        .eq('id', classId)
        .maybeSingle()
      if (classError) throw classError
      if (!cls) throw new PromoError('That class wasn’t found.', 404)
      if (cls.instructor_id !== ownerId && !isAdmin) {
        throw new PromoError('You can only change the image on your own classes.', 403)
      }
    }

    const { data: file, error: downloadError } = await admin.storage.from(PUBLIC_ASSETS_BUCKET).download(path)
    if (downloadError || !file) throw new PromoError('The image didn’t arrive. Try again.', 400)
    if (file.size > PUBLISH_MAX_BYTES) throw new PromoError('That image is too large to publish.', 413)
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!isJpeg(bytes)) throw new PromoError('Publishing needs a JPEG render.', 400)

    const publicUrl = admin.storage.from(PUBLIC_ASSETS_BUCKET).getPublicUrl(path).data.publicUrl

    const { data: asset, error: assetError } = await admin
      .from('assets')
      .insert({
        title: design.title,
        file_url: publicUrl,
        file_type: 'image/jpeg',
        file_size: bytes.length,
        instructor_id: ownerId,
      })
      .select('id')
      .single()
    if (assetError) throw assetError
    assetId = asset.id as string

    // One live copy per promo. The old one comes down now, and its class
    // gets back the image it had before, which the new copy then records.
    const previous = await livePublication(supabase, design.id)
    if (previous) await unpublish(previous)

    let previousClassAssetId: string | null = null
    if (classId) {
      const { data: cls, error: readError } = await admin.from('classes').select('asset_id').eq('id', classId).single()
      if (readError) throw readError
      previousClassAssetId = (cls.asset_id as string | null) ?? null
      const { error: classUpdateError } = await admin.from('classes').update({ asset_id: assetId }).eq('id', classId)
      if (classUpdateError) throw classUpdateError
      classRestore = { classId, assetId: previousClassAssetId }
    }

    const { data: publication, error: publicationError } = await admin
      .from('promo_publications')
      .insert({
        design_id: design.id,
        owner_id: ownerId,
        asset_id: assetId,
        public_path: path,
        public_url: publicUrl,
        class_id: classId,
        previous_class_asset_id: previousClassAssetId,
        revision: design.revision,
      })
      .select(PUBLICATION_COLUMNS)
      .single()
    if (publicationError) throw publicationError
    return NextResponse.json({ publication }, { status: 201 })
  } catch (error) {
    // Leave nothing half-published behind.
    if (admin && classRestore && assetId) {
      await admin
        .from('classes')
        .update({ asset_id: classRestore.assetId })
        .eq('id', classRestore.classId)
        .eq('asset_id', assetId)
    }
    if (admin && assetId) await admin.from('assets').delete().eq('id', assetId)
    if (admin && uploadedPath) await admin.storage.from(PUBLIC_ASSETS_BUCKET).remove([uploadedPath])
    return promoErrorResponse(error, 'POST /api/promo/designs/[id]/publish')
  }
}

/** Takes the promo off the site and gives the class its earlier image back. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { supabase } = await requirePromoInstructor()
    const design = await loadDesign(supabase, await designIdFrom(params))
    const publication = await livePublication(supabase, design.id)
    if (!publication) return NextResponse.json({ unpublished: false })
    const { kept } = await unpublish(publication)
    return NextResponse.json({ unpublished: true, kept })
  } catch (error) {
    return promoErrorResponse(error, 'DELETE /api/promo/designs/[id]/publish')
  }
}
