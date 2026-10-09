import type { FontRole } from './types'

/**
 * Fonts a brand kit can assign to the three promo roles. All SIL OFL 1.1,
 * self-hosted from Fontsource builds under public/fonts/promo (licence files
 * sit next to each family). Canvas text needs explicit loading and stable
 * family names, so these load through the FontFace API rather than next/font.
 *
 * A snapshot in a saved design can reference any id here, so never remove an
 * entry or its files; add new fonts under new ids.
 */
export interface PromoFont {
  id: string
  label: string
  /** CSS family name registered with FontFace. */
  family: string
  roles: FontRole[]
  weights: number[]
  note?: string
}

export const PROMO_FONTS: Record<string, PromoFont> = {
  'bodoni-moda': {
    id: 'bodoni-moda',
    label: 'Bodoni Moda',
    family: 'Promo Bodoni Moda',
    roles: ['display'],
    weights: [400, 500, 600, 700],
    note: 'High-contrast Didone that holds up in capitals.',
  },
  'cormorant-garamond': {
    id: 'cormorant-garamond',
    label: 'Cormorant Garamond',
    family: 'Promo Cormorant Garamond',
    roles: ['display'],
    weights: [500, 600, 700],
    note: 'The app’s display serif.',
  },
  manrope: {
    id: 'manrope',
    label: 'Manrope',
    family: 'Promo Manrope',
    roles: ['caps'],
    weights: [400, 500, 600, 700],
    note: 'The app’s body sans.',
  },
  jost: {
    id: 'jost',
    label: 'Jost',
    family: 'Promo Jost',
    roles: ['caps'],
    weights: [400, 500, 600],
    note: 'Geometric, closest to the reference poster’s caps.',
  },
  'great-vibes': {
    id: 'great-vibes',
    label: 'Great Vibes',
    family: 'Promo Great Vibes',
    roles: ['script'],
    weights: [400],
  },
  allura: {
    id: 'allura',
    label: 'Allura',
    family: 'Promo Allura',
    roles: ['script'],
    weights: [400],
  },
  'mrs-saint-delafield': {
    id: 'mrs-saint-delafield',
    label: 'Mrs Saint Delafield',
    family: 'Promo Mrs Saint Delafield',
    roles: ['script'],
    weights: [400],
  },
}

export const FALLBACK_FONT_BY_ROLE: Record<FontRole, string> = {
  display: 'bodoni-moda',
  caps: 'manrope',
  script: 'great-vibes',
}

export function getPromoFont(id: string | undefined, role: FontRole): PromoFont {
  return (id && PROMO_FONTS[id]) || PROMO_FONTS[FALLBACK_FONT_BY_ROLE[role]]
}

export function fontsForRole(role: FontRole): PromoFont[] {
  return Object.values(PROMO_FONTS).filter((font) => font.roles.includes(role))
}

/** Closest weight the font ships, preferring the heavier one on a tie. */
export function nearestWeight(font: PromoFont, weight: number): number {
  return font.weights.reduce((best, candidate) => {
    const diff = Math.abs(candidate - weight)
    const bestDiff = Math.abs(best - weight)
    if (diff < bestDiff || (diff === bestDiff && candidate > best)) return candidate
    return best
  }, font.weights[0])
}

export function fontFileUrl(font: PromoFont, weight: number): string {
  return `/fonts/promo/${font.id}/${font.id}-latin-${weight}-normal.woff2`
}
