import { NextResponse } from 'next/server'
import { promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'

export const dynamic = 'force-dynamic'

/**
 * Who Promo Studio is working for. The client's useUser() reads the profile
 * of whichever email signed in; this resolves linked logins to the primary
 * profile, which is what ownership and admin checks use.
 */
export async function GET() {
  try {
    const { ownerId, isAdmin, profile } = await requirePromoInstructor()
    return NextResponse.json({ ownerId, isAdmin, name: profile.full_name })
  } catch (error) {
    return promoErrorResponse(error, 'GET /api/promo/me')
  }
}
