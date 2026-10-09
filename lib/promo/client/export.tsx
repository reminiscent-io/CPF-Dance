'use client'

import Konva from 'konva'
import { createRef } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Group, Layer, Stage } from 'react-konva'
import { PromoSceneNodes } from '@/components/promo/PromoScene'
import type { Scene, ScenePhoto } from '../layout/scene'
import type { ExportKind } from '../formats'

/**
 * Exports draw the same PromoSceneNodes the editor shows, in an off-screen
 * Stage at the format's native pixel size, on this device, with the fonts
 * the editor already loaded. That is why a file matches the screen.
 *
 * Posters render in horizontal strips: iOS 17 caps a canvas at 4096² pixels,
 * which 3300×5100 exceeds, and strips keep peak memory low on any phone.
 */

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

export type SceneImages = Record<string, CanvasImageSource | undefined>

/** Renders part of a scene into a fresh canvas at `scale` pixels per design unit. */
export function renderSceneRegion(
  scene: Scene,
  images: SceneImages,
  region: Region,
  scale = 1,
  logo?: CanvasImageSource
): HTMLCanvasElement {
  const width = Math.round(region.width * scale)
  const height = Math.round(region.height * scale)
  const container = document.createElement('div')
  const root = createRoot(container)
  const stageRef = createRef<Konva.Stage>()
  const previousRatio = Konva.pixelRatio
  // Layer canvases must be exactly the export size, not size × devicePixelRatio.
  Konva.pixelRatio = 1
  try {
    flushSync(() => {
      root.render(
        <Stage ref={stageRef} width={width} height={height} listening={false}>
          <Layer imageSmoothingEnabled>
            <Group x={-region.x * scale} y={-region.y * scale} scaleX={scale} scaleY={scale}>
              <PromoSceneNodes scene={scene} images={images} logo={logo} />
            </Group>
          </Layer>
        </Stage>
      )
    })
    const stage = stageRef.current
    if (!stage) throw new Error('Export stage did not mount')
    stage.draw()
    return stage.toCanvas({ pixelRatio: 1 })
  } finally {
    root.unmount()
    Konva.pixelRatio = previousRatio
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Free the backing store right away; iOS counts canvas memory per tab.
        canvas.width = 0
        canvas.height = 0
        if (blob) resolve(blob)
        else reject(new Error('The browser could not encode the image'))
      },
      type,
      quality
    )
  })
}

export async function exportImage(
  scene: Scene,
  images: SceneImages,
  options: { type: 'image/png' | 'image/jpeg'; scale?: number; quality?: number; logo?: CanvasImageSource }
): Promise<Blob> {
  const canvas = renderSceneRegion(
    scene,
    images,
    { x: 0, y: 0, width: scene.width, height: scene.height },
    options.scale ?? 1,
    options.logo
  )
  return canvasToBlob(canvas, options.type, options.quality)
}

const POINTS_PER_INCH = 72

/**
 * Print PDF: the scene at native resolution (3300×5100 is 300 dpi at
 * 11×17 in) as JPEG strips on a single page. Each strip runs 2 px into the
 * next so no hairline seam can appear where they meet.
 */
export async function exportPosterPdf(
  scene: Scene,
  images: SceneImages,
  options: { title: string; widthInches: number; heightInches: number; bleedInches?: number; logo?: CanvasImageSource }
): Promise<Blob> {
  const { PDFDocument } = await import('@cantoo/pdf-lib')
  const pdf = await PDFDocument.create()
  pdf.setTitle(options.title)
  pdf.setCreator('CPF Dance Promo Studio')
  pdf.setProducer('CPF Dance Promo Studio')

  const pageWidth = options.widthInches * POINTS_PER_INCH
  const pageHeight = options.heightInches * POINTS_PER_INCH
  const page = pdf.addPage([pageWidth, pageHeight])
  const pointsPerUnit = pageWidth / scene.width

  const strips = 4
  const stripHeight = Math.ceil(scene.height / strips)
  for (let i = 0; i < strips; i++) {
    const y = i * stripHeight
    if (y >= scene.height) break
    const overlap = i < strips - 1 ? 2 : 0
    const height = Math.min(stripHeight + overlap, scene.height - y)
    const canvas = renderSceneRegion(scene, images, { x: 0, y, width: scene.width, height }, 1, options.logo)
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.95)
    const jpg = await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer()))
    page.drawImage(jpg, {
      x: 0,
      y: pageHeight - (y + height) * pointsPerUnit,
      width: pageWidth,
      height: height * pointsPerUnit,
    })
  }

  if (options.bleedInches && options.bleedInches > 0) {
    const bleed = options.bleedInches * POINTS_PER_INCH
    page.setTrimBox(bleed, bleed, pageWidth - bleed * 2, pageHeight - bleed * 2)
    page.setBleedBox(0, 0, pageWidth, pageHeight)
  }

  const bytes = await pdf.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}

export interface ExportResult {
  blob: Blob
  filename: string
}

/** Pixel size each photo needs at an export scale, so the caller can load the right rendition. */
export function photoNeeds(scene: Scene, scale: number): { assetId: string; longEdge: number }[] {
  const needs = new Map<string, number>()
  for (const node of scene.nodes) {
    if (node.type !== 'photo' || !node.assetId || !node.draw) continue
    const photo = node as ScenePhoto
    const longEdge = Math.max(photo.draw!.width, photo.draw!.height) * scale
    needs.set(photo.assetId!, Math.max(needs.get(photo.assetId!) ?? 0, longEdge))
  }
  return [...needs.entries()].map(([assetId, longEdge]) => ({ assetId, longEdge }))
}

export function exportFilename(title: string, format: string, kind: ExportKind): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'promo'
  const ext = kind === 'pdf' ? 'pdf' : kind === 'png' ? 'png' : 'jpg'
  return `${base}-${format.replace('ig_', '')}.${ext}`
}

export function prefersShareSheet(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}

export function canShareFiles(file: File): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

/**
 * On a phone, hands the file to the share sheet ("Save Image", Instagram,
 * AirDrop). Call it straight from a tap: Safari allows share() for about five
 * seconds after the user's gesture, so render first, then show the button.
 * Desktops get a normal download. Only the file is shared; adding text or a
 * URL can remove "Save Image" from the iOS sheet.
 */
export async function shareOrDownload(result: ExportResult): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([result.blob], result.filename, { type: result.blob.type })
  if (prefersShareSheet() && canShareFiles(file)) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(result.blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = result.filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'downloaded'
}
