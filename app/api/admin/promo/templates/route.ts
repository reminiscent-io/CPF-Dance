import { NextResponse } from 'next/server'
import { ensurePromoCatalog } from '@/lib/promo/server/catalog'
import { promoErrorResponse, requirePromoAdmin } from '@/lib/promo/server/context'

export const dynamic = 'force-dynamic'

/** Every template, with its live version number and whether a draft is waiting. */
export async function GET() {
  try {
    const { supabase } = await requirePromoAdmin()
    await ensurePromoCatalog()
    const [templates, versions] = await Promise.all([
      supabase
        .from('promo_templates')
        .select('id, slug, name, description, status, current_version_id, updated_at')
        .order('created_at', { ascending: true }),
      supabase.from('promo_template_versions').select('id, template_id, version, published_at, updated_at'),
    ])
    if (templates.error) throw templates.error
    if (versions.error) throw versions.error
    return NextResponse.json({
      templates: (templates.data ?? []).map((template) => {
        const own = (versions.data ?? []).filter((version) => version.template_id === template.id)
        const current = own.find((version) => version.id === template.current_version_id)
        const draft = own.find((version) => !version.published_at)
        return {
          ...template,
          currentVersion: current?.version ?? null,
          draftUpdatedAt: draft?.updated_at ?? null,
          versions: own.filter((version) => version.published_at).length,
        }
      }),
    })
  } catch (error) {
    return promoErrorResponse(error, 'GET /api/admin/promo/templates')
  }
}
