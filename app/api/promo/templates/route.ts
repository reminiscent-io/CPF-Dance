import { NextResponse } from 'next/server'
import { listActiveTemplates, loadStudioBrand } from '@/lib/promo/server/catalog'
import { promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'

export const dynamic = 'force-dynamic'

/** Active templates at their current published version, plus the studio brand kit to draw them with. */
export async function GET() {
  try {
    const { supabase } = await requirePromoInstructor()
    const [templates, brand] = await Promise.all([listActiveTemplates(supabase), loadStudioBrand(supabase)])
    return NextResponse.json({
      templates: templates.map((template) => ({
        id: template.id,
        slug: template.slug,
        name: template.name,
        description: template.description,
        versionId: template.version.id,
        version: template.version.version,
        definition: template.version.definition,
      })),
      brand,
    })
  } catch (error) {
    return promoErrorResponse(error, 'GET /api/promo/templates')
  }
}
