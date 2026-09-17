import { describe, it, expect } from 'vitest'
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match'
import nextConfig from './next.config'

// A document's Permissions-Policy is fixed when it loads, and App Router
// navigations keep that document. The policy has to hold on every page a
// user can arrive on, not just the pages that render VoiceRecorder.
const PAGES = [
  '/',
  '/login',
  '/instructor',
  '/instructor/notes',
  '/instructor/schedule',
  '/dancer',
  '/dancer/notes',
  '/dancer/schedule',
  '/admin',
]

// "camera=(), microphone=(self)" -> { camera: [], microphone: ['self'] }
function parseAllowlists(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy.split(',').map((directive) => {
      const match = directive.trim().match(/^([a-z-]+)=(?:\(([^()]*)\)|([^\s()]+))$/)
      if (!match) throw new Error(`Malformed Permissions-Policy directive: "${directive}"`)
      const [, feature, list, token] = match
      return [feature, token ? [token] : list.split(' ').filter(Boolean)]
    })
  )
}

// The policy a browser receives for `pathname`. Next's router matches each
// rule's `source` with getPathMatch too, and the last matching rule wins.
async function permissionsPolicyFor(pathname: string): Promise<Record<string, string[]>> {
  const rules = (await nextConfig.headers?.()) ?? []
  const value = rules
    .filter((rule) => getPathMatch(rule.source, { strict: true, removeUnnamedParams: true })(pathname))
    .flatMap((rule) => rule.headers)
    .filter((header) => header.key.toLowerCase() === 'permissions-policy')
    .at(-1)?.value
  if (value === undefined) throw new Error(`No Permissions-Policy header on ${pathname}`)
  return parseAllowlists(value)
}

describe('Permissions-Policy header', () => {
  it.each(PAGES)('lets %s use the microphone for voice notes, from this origin only', async (pathname) => {
    const policy = await permissionsPolicyFor(pathname)
    expect(policy.microphone).toEqual(['self'])
  })

  it.each(PAGES)('keeps the camera and geolocation off on %s', async (pathname) => {
    const policy = await permissionsPolicyFor(pathname)
    expect(policy.camera).toEqual([])
    expect(policy.geolocation).toEqual([])
  })
})
