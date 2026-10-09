'use client'

import { useState } from 'react'
import { ArrowDownTrayIcon, ArrowUpOnSquareIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import { Button, ConfirmDialog, Select, useToast } from '@/components/ui'
import {
  exportFilename,
  exportImage,
  exportPosterPdf,
  prefersShareSheet,
  shareOrDownload,
} from '@/lib/promo/client/export'
import { releaseRendition } from '@/lib/promo/client/images'
import { loadPlannedImages, planSceneImages } from '@/lib/promo/client/scene-images'
import { EXPORT_LABELS, FORMAT_SPECS, type ExportKind } from '@/lib/promo/formats'
import type { PromoPublication } from '@/lib/promo/types'
import { promoFetch } from '../hooks'
import { useEditor } from './EditorContext'

/** The poster's web copy: a quarter of the print pixels, plenty for a phone screen or the site. */
const WEB_POSTER_WIDTH = 1275

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

interface Ready {
  blob: Blob
  filename: string
  kind: ExportKind
}

/**
 * Export tab. Files render here on her device at full size, from the same
 * scene the editor shows. On a phone the file opens the share sheet ("Save
 * Image" puts it in Photos); on a laptop it downloads.
 */
export function ExportPanel() {
  const { data, scene, assets, flushSave } = useEditor()
  const { design } = data
  const spec = FORMAT_SPECS[design.format]
  const { addToast } = useToast()
  const [busy, setBusy] = useState<ExportKind | 'publish' | 'unpublish' | null>(null)
  const [ready, setReady] = useState<Ready | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [publication, setPublication] = useState<PromoPublication | null>(data.publication)
  const [classId, setClassId] = useState<string>(data.publication?.class_id ?? data.classes[0]?.id ?? '')
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)

  const render = async (kind: ExportKind, quality = 0.92): Promise<Blob> => {
    if (!scene) throw new Error('The design is still loading.')
    const scale = kind === 'jpeg_web' ? WEB_POSTER_WIDTH / scene.width : 1
    const images = await loadPlannedImages(planSceneImages(scene, assets, scale), assets)
    try {
      if (kind === 'pdf') {
        const print = spec.printInches ?? { width: 11, height: 17 }
        return await exportPosterPdf(scene, images, {
          title: design.title,
          widthInches: print.width,
          heightInches: print.height,
        })
      }
      return await exportImage(scene, images, { type: kind === 'png' ? 'image/png' : 'image/jpeg', scale, quality })
    } finally {
      // Full-size originals are big; keep only the screen-size copies cached.
      releaseRendition('original')
    }
  }

  const runExport = async (kind: ExportKind) => {
    setBusy(kind)
    setReady(null)
    setMessage(null)
    try {
      const blob = await render(kind)
      const file = { blob, filename: exportFilename(design.title, design.format, kind), kind }
      if (prefersShareSheet()) {
        // The share sheet needs a fresh tap; rendering can outlast the first one.
        setReady(file)
      } else {
        await shareOrDownload(file)
        setMessage(`Downloaded ${file.filename}`)
      }
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : 'Export failed. Try again.')
    } finally {
      setBusy(null)
    }
  }

  const share = async () => {
    if (!ready) return
    const result = await shareOrDownload(ready)
    if (result !== 'cancelled') {
      setMessage(result === 'shared' ? 'Done.' : `Downloaded ${ready.filename}`)
      setReady(null)
    }
  }

  const publish = async () => {
    setBusy('publish')
    setMessage(null)
    try {
      await flushSave()
      const blob = await render(design.format === 'poster' ? 'jpeg_web' : 'jpeg', 0.88)
      const form = new FormData()
      form.append('file', blob, 'promo.jpg')
      if (classId) form.append('classId', classId)
      const { publication: live } = await promoFetch<{ publication: PromoPublication }>(
        `/api/promo/designs/${design.id}/publish`,
        { method: 'POST', body: form }
      )
      setPublication(live)
      addToast(classId ? 'Published and set as the class image' : 'Published to your assets', 'success')
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : 'Publishing failed. Try again.')
    } finally {
      setBusy(null)
    }
  }

  const unpublish = async () => {
    setBusy('unpublish')
    try {
      await promoFetch(`/api/promo/designs/${design.id}/publish`, { method: 'DELETE' })
      setPublication(null)
      setConfirmUnpublish(false)
      addToast('Taken off the site', 'success')
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : 'That didn’t work. Try again.')
    } finally {
      setBusy(null)
    }
  }

  const linkedClass = data.classes.find((cls) => cls.id === publication?.class_id)

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-serif text-lg font-semibold text-charcoal-950">Save a file</h3>
        <p className="mt-0.5 text-xs text-charcoal-500">
          {spec.label}, {spec.width} × {spec.height}
          {spec.printInches ? ` (${spec.printInches.width} × ${spec.printInches.height} in at 300 dpi)` : ''}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {spec.exports.map((kind, index) => (
            <Button
              key={kind}
              variant={index === 0 && !ready ? 'primary' : 'outline'}
              onClick={() => runExport(kind)}
              disabled={busy !== null || !scene}
            >
              <ArrowDownTrayIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {busy === kind ? 'Rendering…' : EXPORT_LABELS[kind]}
            </Button>
          ))}
        </div>
        {ready && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-champagne-100 px-4 py-3">
            <p className="flex-1 text-sm text-charcoal-800">
              {ready.filename} is ready ({(ready.blob.size / 1024 / 1024).toFixed(1)} MB).
            </p>
            <Button onClick={share}>
              <ArrowUpOnSquareIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {ready.kind === 'pdf' ? 'Share PDF' : 'Save to Photos'}
            </Button>
          </div>
        )}
        {message && (
          <p className="mt-2 text-sm text-charcoal-600" role="status">
            {message}
          </p>
        )}
      </section>

      <section>
        <h3 className="font-serif text-lg font-semibold text-charcoal-950">Put it on the site</h3>
        <p className="mt-0.5 text-xs text-charcoal-500">
          Publishing makes a public copy of this design. Your photos and drafts stay private.
        </p>
        {publication ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-charcoal-800">
              <GlobeAltIcon className="mr-1 inline h-4 w-4 align-[-2px] text-gold-700" aria-hidden="true" />
              Live since {dateFormat.format(new Date(publication.published_at))}
              {linkedClass ? ` as the image for ${linkedClass.title}` : ''}.{' '}
              <a
                href={publication.public_url}
                target="_blank"
                rel="noreferrer"
                className="text-rose-700 underline-offset-2 hover:underline"
              >
                Open
              </a>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={publish} disabled={busy !== null || !scene}>
                {busy === 'publish' ? 'Publishing…' : 'Update with this version'}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmUnpublish(true)} disabled={busy !== null}>
                Take it down
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {data.classes.length > 0 && (
              <Select
                label="Class image"
                id="promo-publish-class"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                options={[
                  ...data.classes.map((cls) => ({ value: cls.id, label: `Use for ${cls.title}` })),
                  { value: '', label: 'Don’t change any class image' },
                ]}
              />
            )}
            <Button variant="outline" onClick={publish} disabled={busy !== null || !scene}>
              {busy === 'publish' ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={confirmUnpublish}
        title="Take this promo off the site?"
        body={
          linkedClass
            ? `The public copy is deleted and ${linkedClass.title} gets back the image it had before.`
            : 'The public copy is deleted. Your design stays here.'
        }
        confirmLabel={busy === 'unpublish' ? 'Taking it down…' : 'Take it down'}
        tone="destructive"
        busy={busy === 'unpublish'}
        onConfirm={unpublish}
        onCancel={() => setConfirmUnpublish(false)}
      />
    </div>
  )
}
