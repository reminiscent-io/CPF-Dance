'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export interface DeleteRequestDialogProps {
  isOpen: boolean
  isDeleting: boolean
  onConfirm: () => void
  onClose: () => void
}

export function DeleteRequestDialog({
  isOpen,
  isDeleting,
  onConfirm,
  onClose
}: DeleteRequestDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete this request?" size="sm">
      <p className="text-base text-charcoal-700 leading-relaxed">
        You’ll need to send a new one if you change your mind.
      </p>
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isDeleting}
          className="mt-3 sm:mt-0 w-full sm:w-auto"
        >
          Keep
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={isDeleting}
          className="w-full sm:w-auto"
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Modal>
  )
}
