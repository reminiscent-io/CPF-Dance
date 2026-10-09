import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid, PromoError, promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'
import {
  livePublication,
  loadDesign,
  PUBLIC_ASSETS_BUCKET,
  PUBLICATION_COLUMNS,
  unpublish,
} from '@/lib/promo/server/designs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BYTES = 6 * 1024 * 1024

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
 * /instructor/assets see it, and optionally the class's image. Her session
 * proves she owns the promo and the class; the service role then writes the
 * public copy. Republishing replaces the previous copy.
 */
export async function POST(request: NextRequest, { params }: Params) {
  let admin: ReturnType<typeof createAdminClient> | null = null
  let uploadedPath: string | null = null
  let assetId: string | null = null
  try {
    const { supabase, ownerId, isAdmin } = await requirePromoInstructor()
    const design = await loadDesign(supabase, await designIdFrom(params))
    if (design.owner_id !== ownerId) throw new PromoError('Only the promo’s owner can publish it.', 403, 'not_owner')
    admin = createAdminClient()

    const form = await request.formData()
    const file = form.get('file')
    const classIdRaw = form.get('classId')
    const classId = typeof classIdRaw === 'string' && classIdRaw ? classIdRaw : null
    // A form entry is a File or a string; instanceof Blob depends on which runtime made the File.
    if (!file || typeof file === 'string') throw new PromoError('The image didn’t arrive. Try again.', 400)
    if (file.size > MAX_BYTES) throw new PromoError('That image is too large to publish.', 413)
    if (classId && !isUuid(classId)) throw new PromoError('That class wasn’t found.', 404)
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!isJpeg(bytes)) throw new PromoError('Publishing needs a JPEG render.', 400)

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

    // One live copy per promo: the old one comes down (and the class gets its
    // earlier image back) before the new one goes up.
    const previous = await livePublication(supabase, design.id)
    if (previous) await unpublish(supabase, previous)

    const path = `${ownerId}/promo-${design.id}-${design.revision}-${Date.now().toString(36)}.jpg`
    const { error: uploadError } = await admin.storage.from(PUBLIC_ASSETS_BUCKET).upload(path, bytes, {
      contentType: 'image/jpeg',
      // Short CDN lifetime, so an unpublish clears cached copies within minutes.
      cacheControl: '300',
      upsert: false,
    })
    if (uploadError) throw uploadError
    uploadedPath = path
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

    let previousClassAssetId: string | null = null
    if (classId) {
      const { data: cls, error: readError } = await admin.from('classes').select('asset_id').eq('id', classId).single()
      if (readError) throw readError
      previousClassAssetId = (cls.asset_id as string | null) ?? null
      const { error: classUpdateError } = await admin.from('classes').update({ asset_id: assetId }).eq('id', classId)
      if (classUpdateError) throw classUpdateError
    }

    const { data: publication, error: publicationError } = await supabase
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
    if (publicationError) {
      if (classId) {
        await admin.from('classes').update({ asset_id: previousClassAssetId }).eq('id', classId).eq('asset_id', assetId)
      }
      throw publicationError
    }
    return NextResponse.json({ publication }, { status: 201 })
  } catch (error) {
    // Leave nothing half-published behind.
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
    await unpublish(supabase, publication)
    return NextResponse.json({ unpublished: true })
  } catch (error) {
    return promoErrorResponse(error, 'DELETE /api/promo/designs/[id]/publish')
  }
}
