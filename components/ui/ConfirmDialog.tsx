'use client'

import React, { useEffect, useRef } from 'react'
import { Button } from './Button'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  body?: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  /** Disable the buttons while an async confirm is in flight. */
  busy?: boolean
  /**
   * "destructive" tints the confirm button slightly deeper rose to telegraph
   * an irreversible action; "default" uses Stage Rose primary.
   */
  tone?: 'default' | 'destructive'
}

/**
 * Yes/no dialog with `role="alertdialog"`, focus trap, escape-to-cancel, and
 * focus restoration. Use this instead of window.confirm() and instead of
 * hand-rolling per-page confirmation modals.
 */
export function ConfirmDialog({
  isOpen,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  busy = false,
  tone = 'default',
}: ConfirmDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(containerRef, isOpen)

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel, busy])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fadeIn"
      style={{ backgroundColor: 'rgba(10, 10, 10, 0.5)', backdropFilter: 'blur(4px)' }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={body ? 'confirm-body' : undefined}
      onClick={() => !busy && onCancel()}
    >
      <div
        ref={containerRef}
        className="bg-champagne-50 rounded-lg shadow-soft-lg w-full max-w-sm p-6 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-title"
          className="text-2xl font-semibold text-charcoal-950 tracking-[-0.02em]"
        >
          {title}
        </h2>
        {body && (
          <div id="confirm-body" className="mt-2 text-sm text-charcoal-600">
            {body}
          </div>
        )}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={busy}
            className={tone === 'destructive' ? 'bg-rose-700 hover:bg-rose-800 active:bg-rose-900' : ''}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
