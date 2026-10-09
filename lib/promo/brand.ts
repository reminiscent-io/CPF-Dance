import type { BrandTokens, ColorToken, TemplateVariant } from './types'
import { COLOR_TOKENS } from './types'

/**
 * Studio brand kit seeded from DESIGN.json, so promos start on the same
 * Ballet Noir palette as the app: Champagne paper, Stage Black ink, Curtain
 * Gilt as the accent. The reference poster uses exactly these families.
 */
export const DEFAULT_BRAND_TOKENS: BrandTokens = {
  colors: {
    paper: '#f5f1ea', // Champagne Page
    paperLight: '#faf8f5', // Champagne Silk
    paperDeep: '#ebe4d8', // Champagne Stroke
    ink: '#0a0a0a', // Stage Black
    inkSoft: '#4d4d4d', // Stage Graphite
    accent: '#b89651', // Curtain Gilt
    accentSoft: '#e8dbb8', // Gilt chip
    darkBlock: '#1a1a1a', // Stage Ink
    onDark: '#faf8f5', // Champagne Silk
  },
  fonts: {
    display: 'bodoni-moda',
    caps: 'manrope',
    script: 'great-vibes',
  },
  identity: {
    name: 'Courtney File',
    ledBy: 'Led by',
    signature: 'Courtney File',
    credentialPrimary: 'Former Radio City Rockette',
    credentialSecondary: 'Professional dancer | Choreographer | Teacher',
  },
  voice: {
    notes: [
      'Confident and calm. Speak to dancers as adults pursuing a serious craft, never as customers being sold to.',
      'Short, precise lines with the cadence of a printed program book.',
      'Name concrete skills (kicks, turns, cleanliness, stamina) instead of hype.',
      'No exclamation points, no emoji, no slang, no clichés about family or dreams.',
    ].join(' '),
    bannedWords: ['amazing', 'awesome', 'epic', 'crush', 'girlboss', 'family'],
  },
  logoPath: null,
}

export const COLOR_TOKEN_LABELS: Record<ColorToken, string> = {
  paper: 'Paper',
  paperLight: 'Light paper',
  paperDeep: 'Deep paper',
  ink: 'Ink',
  inkSoft: 'Soft ink',
  accent: 'Accent',
  accentSoft: 'Soft accent',
  darkBlock: 'Dark block',
  onDark: 'Text on dark',
}

export function resolveColor(
  token: ColorToken,
  brand: BrandTokens,
  variant?: TemplateVariant | null
): string {
  const mapped = variant?.remap[token] ?? token
  return brand.colors[mapped] ?? brand.colors[token] ?? DEFAULT_BRAND_TOKENS.colors[token]
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value)
}

/** #rrggbb (or #rgb) plus alpha as an rgba() string for gradients. */
export function withAlpha(hex: string, alpha: number): string {
  let value = hex.replace('#', '')
  if (value.length === 3) value = value.split('').map((c) => c + c).join('')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const a = Math.min(1, Math.max(0, alpha))
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/** Fills any colour a stored kit is missing, so older snapshots keep rendering. */
export function completeBrandTokens(tokens: Partial<BrandTokens> | null | undefined): BrandTokens {
  const base = DEFAULT_BRAND_TOKENS
  const colors = { ...base.colors }
  for (const token of COLOR_TOKENS) {
    const candidate = tokens?.colors?.[token]
    if (isHexColor(candidate)) colors[token] = candidate
  }
  return {
    colors,
    fonts: { ...base.fonts, ...(tokens?.fonts ?? {}) },
    identity: { ...base.identity, ...(tokens?.identity ?? {}) },
    voice: {
      notes: tokens?.voice?.notes ?? base.voice.notes,
      bannedWords: tokens?.voice?.bannedWords ?? base.voice.bannedWords,
    },
    logoPath: tokens?.logoPath ?? null,
  }
}
