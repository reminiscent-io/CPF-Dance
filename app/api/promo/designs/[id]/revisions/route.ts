import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { DesignDocumentSchema } from '@/lib/promo/schema'
import { isUuid, PromoError, promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'
import { loadDesign } from '@/lib/promo/server/designs'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

async function designId(params: Params['params']) {
  const { id } = await params
  if (!isUuid(id)) throw new PromoError('Promo not found.', 404, 'not_found')
  return id
}

/** Saved points to go back to: AI results, checkpoints and restores, newest first. */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { supabase } = await requirePromoInstructor()
    const id = await designId(params)
    const { data, error } = await supabase
      .from('promo_design_revisions')
      .select('id, revision, document, source, instruction, summary, created_at')
      .eq('design_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return NextResponse.json({ revisions: data ?? [] })
  } catch (error) {
    return promoErrorResponse(error, 'GET /api/promo/designs/[id]/revisions')
  }
}

const CheckpointSchema = z.object({
  revision: z.number().int().positive(),
  document: DesignDocumentSchema,
  source: z.enum(['checkpoint', 'restore']),
  summary: z.string().max(200).optional(),
})

/** The editor writes a checkpoint every few minutes of editing, and one when she restores. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { supabase, ownerId } = await requirePromoInstructor()
    const design = await loadDesign(supabase, await designId(params))
    const parsed = CheckpointSchema.safeParse(await request.json())
    if (!parsed.success) throw new PromoError('That checkpoint isn’t valid.', 400)
    const { error } = await supabase.from('promo_design_revisions').insert({
      design_id: design.id,
      owner_id: ownerId,
      revision: parsed.data.revision,
      document: parsed.data.document,
      source: parsed.data.source,
      summary: parsed.data.summary ?? null,
    })
    if (error) throw error
    return NextResponse.json({ saved: true }, { status: 201 })
  } catch (error) {
    return promoErrorResponse(error, 'POST /api/promo/designs/[id]/revisions')
  }
}
