import { createAdminClient } from '@/lib/supabase/admin'
import { valueAsText } from '../document'
import type { DesignDocument, PromoDesignRow, PromoPublication } from '../types'
import { PromoError, type PromoContext } from './context'

export const DESIGN_COLUMNS =
  'id, owner_id, title, template_version_id, format, group_id, class_ids, brief, document, brand_snapshot, revision, thumbnail_updated_at, created_at, updated_at'

export const DESIGN_LIST_COLUMNS =
  'id, owner_id, title, format, group_id, class_ids, revision, thumbnail_updated_at, created_at, updated_at'

export const PUBLICATION_COLUMNS =
  'id, design_id, asset_id, public_path, public_url, class_id, previous_class_asset_id, revision, published_at'

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

/**
 * Takes a published copy down: the class gets back the image it had before
 * (if it still shows this one), then the public file and its `assets` row go.
 * The service role does the class update and the public-bucket delete after
 * the caller's own session has read the publication, which proves ownership.
 */
export async function unpublish(supabase: PromoContext['supabase'], publication: Publication): Promise<void> {
  const admin = createAdminClient()
  if (publication.class_id && publication.asset_id) {
    const { error } = await admin
      .from('classes')
      .update({ asset_id: publication.previous_class_asset_id })
      .eq('id', publication.class_id)
      .eq('asset_id', publication.asset_id)
    if (error) throw error
  }
  const { error: removeError } = await admin.storage.from(PUBLIC_ASSETS_BUCKET).remove([publication.public_path])
  if (removeError) throw removeError
  if (publication.asset_id) {
    const { error: deleteError } = await admin.from('assets').delete().eq('id', publication.asset_id)
    if (deleteError) throw deleteError
  }
  const { error: updateError } = await supabase
    .from('promo_publications')
    .update({ unpublished_at: new Date().toISOString() })
    .eq('id', publication.id)
  if (updateError) throw updateError
}
