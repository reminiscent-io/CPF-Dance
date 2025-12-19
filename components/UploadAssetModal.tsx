'use client'

import { useState } from 'react'
import { Modal, ModalFooter, Button, Input, useToast } from '@/components/ui'
import { CloudArrowUpIcon } from '@heroicons/react/24/outline'

interface UploadAssetModalProps {
  onClose: () => void
  onSuccess: (asset: any) => void
}

export function UploadAssetModal({ onClose, onSuccess }: UploadAssetModalProps) {
  const { addToast } = useToast()
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      validateAndSetFile(selectedFile)
    }
  }

  const validateAndSetFile = (selectedFile: File) => {
    // Validate file type (images and PDFs only)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!validTypes.includes(selectedFile.type)) {
      addToast('Please upload an image (JPEG, PNG, GIF, WebP) or PDF file', 'error')
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (selectedFile.size > maxSize) {
      addToast('File size must be less than 10MB', 'error')
      return
    }

    setFile(selectedFile)

    // Auto-populate title from filename if not already set
    if (!title) {
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, '') // Remove extension
      setTitle(fileName)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !file) {
      addToast('Please provide a title and select a file', 'error')
      return
    }

    setUploading(true)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)

      const response = await fetch('/api/assets', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload asset')
      }

      const data = await response.json()
      onSuccess(data.asset)
    } catch (error) {
      console.error('Error uploading asset:', error)
      addToast(error instanceof Error ? error.message : 'Failed to upload asset', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Upload Asset" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Title *"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Spring Recital Promo, Class Schedule"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File * (Images or PDF, max 10MB)
            </label>

            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${dragActive
                  ? 'border-rose-500 bg-rose-50'
                  : 'border-gray-300 hover:border-gray-400'
                }
                ${file ? 'bg-green-50 border-green-500' : ''}
              `}
            >
              <input
                type="file"
                id="file-upload"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <CloudArrowUpIcon className={`mx-auto h-12 w-12 mb-3 ${file ? 'text-green-600' : 'text-gray-400'}`} />

              {file ? (
                <div>
                  <p className="text-sm font-medium text-green-900 mb-1">{file.name}</p>
                  <p className="text-xs text-green-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="mt-2 text-sm text-rose-600 hover:text-rose-700 font-medium"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Drop file here or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    JPEG, PNG, GIF, WebP, or PDF up to 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Tip:</strong> Uploaded assets are visible to all signed-in users (instructors and dancers)
              and can be used for class promotion, social media, or sharing with students.
            </p>
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button type="submit" disabled={uploading || !file || !title}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
