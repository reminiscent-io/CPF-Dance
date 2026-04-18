import { NextResponse } from 'next/server'
import { VERSION, COMMIT_SHA, BUILD_TIME } from '@/lib/version'

export const dynamic = 'force-static'

export async function GET() {
  return NextResponse.json({
    version: VERSION,
    commit: COMMIT_SHA,
    buildTime: BUILD_TIME,
  })
}
