import { createAdminClient } from '@/lib/supabase/admin'
import { valueAsText } from '../document'
import type { DesignDocument, PromoDesignRow, PromoPublication } from '../types'
import { PromoError, type PromoContext } from './context'

export const DESIGN_COLUMNS =
  'id, owner_id, title, template_version_id, format, group_id, class_ids, brief, document, brand_snapshot, revision, thumbnail_updated_at, created_at, updated_at'

export const DESIGN_LIST_COLUMNS =
  'id, owner_id, title, format, group_id, class_ids, revision, thumbnail_updated_at, created_at, updated_at'

export const PUBLICATION_COLUMNS =
  'id, design_id, owner_id, asset_id, public_path, public_url, class_id, previous_class_asset_id, revision, published_at'

/** Where publish copies go: the existing public bucket that classes.asset_id points into. */
export const PUBLIC_ASSETS_BUCKET = 'assets'

export async function loadDesign(supabase: PromoContext['supabase'], id: string): Promise<PromoDesignRow> {
  const { data, error } = await supabase.from('promo_designs').select(DESIGN_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new PromoError('Promo not found.', 404, 'not_found')
  return data as PromoDesignRow
}

/** "Precision Workshop" from the two title lines, else the brief's idea, else a placeholder. */
export function defaultTitle(document: DesignDocument, titleIdea?: string): string {
  const fromTitle = [valueAsText(document.values.title_primary), valueAsText(document.values.title_accent)]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
  const title = fromTitle || titleIdea?.trim() || 'Untitled promo'
  return title.slice(0, 200)
}

export type Publication = PromoPublication

export async function livePublication(
  supabase: PromoContext['supabase'],
  designId: string
): Promise<Publication | null> {
  const { data, error } = await supabase
    .from('promo_publications')
    .select(PUBLICATION_COLUMNS)
    .eq('design_id', designId)
    .is('unpublished_at', null)
    .maybeSingle()
  if (error) throw error
  return (data as Publication | null) ?? null
}

/** The public path a publish of this design writes; unpublish only ever deletes paths like it. */
export function publicCopyPrefix(ownerId: string, designId: string): string {
  return `${ownerId}/promo-${designId}-`
}

/**
 * Takes a published copy down: the class gets back the image it had before
 * (if it still shows this one), then the public file and its `assets` row go,
 * unless a class still uses the copy because she picked it in the class form.
 *
 * Publication rows are written only by the publish route with the service
 * role, after the caller's own session has read the design; the caller reads
 * this row through her session too, which proves it's hers. The path check
 * below is a second guard before deleting anything with the service role.
 */
export async function unpublish(publication: Publication): Promise<{ kept: boolean }> {
  const admin = createAdminClient()
  const path = publication.public_path
  if (!path.startsWith(publicCopyPrefix(publication.owner_id, publication.design_id)) || path.includes('..')) {
    throw new Error(`Publication ${publication.id} points outside this promo's own copy`)
  }

  if (publication.class_id && publication.asset_id) {
    const { error } = await admin
      .from('classes')
      .update({ asset_id: publication.previous_class_asset_id })
      .eq('id', publication.class_id)
      .eq('asset_id', publication.asset_id)
    if (error) throw error
  }

  let kept = false
  if (publication.asset_id) {
    // A live copy that later replaced this one on a class would restore this
    // asset when it comes down. This asset is about to go, so hand that copy
    // this one's earlier image instead, keeping the chain back to the original.
    const { error: chainError } = await admin
      .from('promo_publications')
      .update({ previous_class_asset_id: publication.previous_class_asset_id })
      .eq('previous_class_asset_id', publication.asset_id)
      .is('unpublished_at', null)
    if (chainError) throw chainError

    const { count, error: countError } = await admin
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('asset_id', publication.asset_id)
    if (countError) throw countError
    kept = (count ?? 0) > 0
  }

  if (!kept) {
    const { error: removeError } = await admin.storage.from(PUBLIC_ASSETS_BUCKET).remove([path])
    if (removeError) throw removeError
    if (publication.asset_id) {
      const { error: deleteError } = await admin
        .from('assets')
        .delete()
        .eq('id', publication.asset_id)
        .eq('instructor_id', publication.owner_id)
      if (deleteError) throw deleteError
    }
  }

  const { error: updateError } = await admin
    .from('promo_publications')
    .update({ unpublished_at: new Date().toISOString() })
    .eq('id', publication.id)
  if (updateError) throw updateError
  return { kept }
}
