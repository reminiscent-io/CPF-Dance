// Single source of truth for how a class type presents anywhere in the product.
//
// `block` (the calendar surface) collapses onto two tones per DESIGN.md: a private
// lesson is Stage Rose, everything else is champagne. Many blocks are scanned at
// once and the distinction has to survive a 10px month cell, so it buys exactly one
// thing — private or not.
//
// `chip` keeps per-type treatment. A chip appears in a modal or list row showing one
// class at a time, where there is nothing to scan against and the gilt-for-premium
// reservation still applies.

export type ClassType =
  | 'private'
  | 'group'
  | 'workshop'
  | 'master_class'
  | 'competition_choreography'
  | 'personal'

export interface ClassTypeStyle {
  /** Long form, for modals and detail rows. */
  label: string
  /** Compact form, for dense mobile chips. */
  shortLabel: string
  /** Calendar block: fill, hairline and text. */
  block: string
  /** Badge chip in modals and list rows. */
  chip: string
  /** Small marker for mobile day dots. */
  dot: string
}

const PRIVATE_BLOCK = 'bg-ballet-pink-100 border border-ballet-pink-200 text-ballet-pink-800'
const NEUTRAL_BLOCK = 'bg-champagne-100 border border-champagne-300 text-charcoal-800'

const PRIVATE_DOT = 'bg-ballet-pink-500'
const NEUTRAL_DOT = 'bg-champagne-500'

const NEUTRAL_CHIP = 'bg-champagne-100 text-charcoal-700 border-champagne-200'

/** Cancelled classes take this instead of their type style, on every surface. */
export const CANCELLED_BLOCK_STYLE =
  'bg-champagne-200 border border-champagne-300 text-charcoal-400 opacity-60'

const STYLES: Record<ClassType, ClassTypeStyle> = {
  private: {
    label: 'Private Lesson',
    shortLabel: 'Private',
    block: PRIVATE_BLOCK,
    chip: 'bg-ballet-pink-50 text-ballet-pink-800 border-ballet-pink-200',
    dot: PRIVATE_DOT,
  },
  group: {
    label: 'Group Class',
    shortLabel: 'Group',
    block: NEUTRAL_BLOCK,
    chip: NEUTRAL_CHIP,
    dot: NEUTRAL_DOT,
  },
  workshop: {
    label: 'Workshop',
    shortLabel: 'Workshop',
    block: NEUTRAL_BLOCK,
    chip: NEUTRAL_CHIP,
    dot: NEUTRAL_DOT,
  },
  master_class: {
    label: 'Master Class',
    shortLabel: 'Master',
    block: NEUTRAL_BLOCK,
    chip: 'bg-gold-100 text-gold-800 border-gold-200',
    dot: NEUTRAL_DOT,
  },
  competition_choreography: {
    label: 'Competition Choreography',
    shortLabel: 'Competition',
    block: NEUTRAL_BLOCK,
    chip: NEUTRAL_CHIP,
    dot: NEUTRAL_DOT,
  },
  personal: {
    label: 'Personal',
    shortLabel: 'Personal',
    block: NEUTRAL_BLOCK,
    chip: NEUTRAL_CHIP,
    dot: NEUTRAL_DOT,
  },
}

export function getClassTypeStyle(type: string): ClassTypeStyle {
  const known = STYLES[type as ClassType]
  if (known) return known
  // Unknown types render neutral and carry their own raw name as the label.
  return {
    label: type,
    shortLabel: type,
    block: NEUTRAL_BLOCK,
    chip: NEUTRAL_CHIP,
    dot: NEUTRAL_DOT,
  }
}

export function getClassTypeLabel(type: string): string {
  return getClassTypeStyle(type).label
}
