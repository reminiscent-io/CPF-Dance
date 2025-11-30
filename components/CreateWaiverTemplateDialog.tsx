'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RichTextEditor } from '@/components/RichTextEditor'

interface CreateWaiverTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateWaiverTemplateDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreateWaiverTemplateDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [waiverType, setWaiverType] = useState('general')
  const [isShared, setIsShared] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please provide both a title and content for the template')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/waiver-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          content,
          content_type: 'rich_text',
          waiver_type: waiverType,
          is_shared: isShared,
        }),
      })

      if (response.ok) {
        // Reset form
        setTitle('')
        setDescription('')
        setContent('')
        setWaiverType('general')
        setIsShared(false)
        onSuccess()
        onClose()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      alert('An error occurred while creating the template')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setTitle('')
      setDescription('')
      setContent('')
      setWaiverType('general')
      setIsShared(false)
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Waiver Template">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., General Liability Waiver"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this template"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Waiver Type
          </label>
          <select
            value={waiverType}
            onChange={(e) => setWaiverType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            disabled={loading}
          >
            <option value="general">General</option>
            <option value="private_lesson">Private Lesson</option>
            <option value="class">Class</option>
            <option value="liability">Liability</option>
            <option value="medical">Medical</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
              disabled={loading}
            />
            <span className="text-sm text-gray-700">
              Share this template with other instructors
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Waiver Content <span className="text-red-500">*</span>
          </label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Enter the waiver text. Use template variables like {{issue_date}}, {{signature_date}}, {{recipient_name}}, {{issuer_name}} for dynamic content."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Template'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
