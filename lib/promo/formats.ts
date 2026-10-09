import type { PromoFormat } from './types'

export type ExportKind = 'png' | 'jpeg' | 'pdf' | 'jpeg_web'

export interface FormatSpec {
  label: string
  shortLabel: string
  width: number
  height: number
  /** Instagram story UI covers the top and bottom bands; text stays out of them. */
  safeArea?: { top: number; bottom: number }
  exports: ExportKind[]
  printInches?: { width: number; height: number }
}

export const FORMAT_SPECS: Record<PromoFormat, FormatSpec> = {
  ig_post: {
    label: 'Instagram post',
    shortLabel: 'Post',
    width: 1080,
    height: 1350,
    exports: ['png', 'jpeg'],
  },
  ig_story: {
    label: 'Instagram story',
    shortLabel: 'Story',
    width: 1080,
    height: 1920,
    safeArea: { top: 250, bottom: 250 },
    exports: ['png', 'jpeg'],
  },
  poster: {
    label: 'Poster, 11 × 17 in',
    shortLabel: 'Poster',
    width: 3300,
    height: 5100,
    // Print PDF at 300 dpi, plus a half-size JPEG for sharing the poster online.
    exports: ['pdf', 'jpeg_web'],
    printInches: { width: 11, height: 17 },
  },
}

export const EXPORT_LABELS: Record<ExportKind, string> = {
  png: 'PNG',
  jpeg: 'JPEG',
  pdf: 'Print PDF',
  jpeg_web: 'JPEG for sharing',
}

export function isPromoFormat(value: unknown): value is PromoFormat {
  return value === 'ig_post' || value === 'ig_story' || value === 'poster'
}
