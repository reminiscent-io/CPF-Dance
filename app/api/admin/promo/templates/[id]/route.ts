import { NextRequest, NextResponse } from 'next/server'
import { parseDefinition } from '@/lib/promo/server/catalog'
import { isUuid, PromoError, promoErrorResponse, requirePromoAdmin } from '@/lib/promo/server/context'

export const dynamic = 'force-dynamic'

/** A template for editing: its versions, and the draft (or the live version to start a draft from). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requirePromoAdmin()
    const { id } = await params
    if (!isUuid(id)) throw new PromoError('Template not found.', 404)
    const { data: template, error } = await supabase
      .from('promo_templates')
      .select('id, slug, name, description, status, current_version_id')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!template) throw new PromoError('Template not found.', 404)

    const { data: versions, error: versionError } = await supabase
      .from('promo_template_versions')
      .select('id, version, definition, notes, published_at, created_at, updated_at')
      .eq('template_id', id)
      .order('version', { ascending: false })
    if (versionError) throw versionError
    const draft = (versions ?? []).find((version) => !version.published_at) ?? null
    const current = (versions ?? []).find((version) => version.id === template.current_version_id) ?? null
    const base = draft ?? current
    if (!base) throw new PromoError('This template has no versions yet.', 404)

    return NextResponse.json({
      template,
      definition: parseDefinition(base.definition, `template ${id}`),
      draft: draft ? { id: draft.id, version: draft.version, notes: draft.notes, updatedAt: draft.updated_at } : null,
      currentVersion: current?.version ?? null,
      versions: (versions ?? [])
        .filter((version) => version.published_at)
        .map(({ id: versionId, version, notes, published_at }) => ({ id: versionId, version, notes, published_at })),
    })
  } catch (error) {
    return promoErrorResponse(error, 'GET /api/admin/promo/templates/[id]')
  }
}
