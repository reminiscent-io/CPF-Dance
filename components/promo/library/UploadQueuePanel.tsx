'use client'

import Image from 'next/image'
import { ArrowPathIcon, CheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { clearFinished, retryFailed, useUploadQueue, type UploadItem } from '@/lib/promo/client/upload/queue'

function statusLabel(item: UploadItem): string {
  switch (item.status) {
    case 'preparing':
      return 'Preparing'
    case 'waiting':
      return 'Waiting'
    case 'uploading':
      return `Uploading ${Math.round(item.progress * 100)}%`
    case 'saving':
      return 'Saving'
    case 'done':
      return 'Added'
    case 'duplicate':
      return 'Already in your library'
    case 'error':
      return item.error || 'Upload failed'
  }
}

/** Upload progress for the photo library. Renders nothing when the queue is empty. */
export function UploadQueuePanel({ className = '' }: { className?: string }) {
  const items = useUploadQueue((state) => state.items)
  if (items.length === 0) return null

  const pending = items.filter((item) => !['done', 'duplicate', 'error'].includes(item.status)).length
  const failed = items.filter((item) => item.status === 'error').length
  const finished = items.length - pending

  return (
    <section
      aria-label="Uploads"
      className={`rounded-lg border border-champagne-200 bg-champagne-100 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-charcoal-900" aria-live="polite">
            {pending > 0
              ? `Uploading ${items.length - pending + 1} of ${items.length}`
              : failed > 0
                ? `${failed} ${failed === 1 ? 'photo' : 'photos'} didn’t upload`
                : `${items.length} ${items.length === 1 ? 'photo' : 'photos'} added`}
          </p>
          {pending > 0 && (
            <p className="text-xs text-charcoal-500">Keep this page open until they finish.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {failed > 0 && (
            <Button size="sm" variant="outline" onClick={retryFailed}>
              <ArrowPathIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          )}
          {finished > 0 && (
            <Button size="sm" variant="ghost" onClick={clearFinished}>
              Clear
            </Button>
          )}
        </div>
      </div>
      <ul className="max-h-64 overflow-y-auto border-t border-champagne-200">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-2">
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-champagne-200">
              {item.previewUrl && (
                <Image src={item.previewUrl} alt="" fill sizes="40px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-charcoal-900">{item.filename}</p>
              {item.status === 'uploading' ? (
                <div
                  className="mt-1 h-1 overflow-hidden rounded-full bg-champagne-200"
                  role="progressbar"
                  aria-label={`Uploading ${item.filename}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(item.progress * 100)}
                >
                  <div
                    className="h-full rounded-full bg-rose-600 transition-[width] duration-300"
                    style={{ width: `${Math.max(2, item.progress * 100)}%` }}
                  />
                </div>
              ) : (
                <p className={`text-xs ${item.status === 'error' ? 'text-rose-700' : 'text-charcoal-500'}`}>
                  {statusLabel(item)}
                </p>
              )}
            </div>
            {item.status === 'done' && <CheckIcon className="h-4 w-4 text-gold-700" aria-label="Added" />}
            {item.status === 'error' && (
              <ExclamationCircleIcon className="h-4 w-4 text-rose-700" aria-label="Failed" />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
