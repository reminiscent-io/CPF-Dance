'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface WaiverTemplate {
  id: string
  title: string
  description: string | null
  content_type: 'rich_text' | 'pdf'
  content: string | null
  waiver_type: string
}

interface IssueWaiverDialogProps {
  isOpen: boolean
  onClose: () => void
  template: WaiverTemplate
  onSuccess: () => void
}

interface Student {
  id: string
  profile?: {
    full_name: string
    email: string
  }
}

interface Studio {
  id: string
  name: string
  contact_email: string
}

export function IssueWaiverDialog({
  isOpen,
  onClose,
  template,
  onSuccess,
}: IssueWaiverDialogProps) {
  const [recipientType, setRecipientType] = useState<'student' | 'studio'>('student')
  const [students, setStudents] = useState<Student[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [selectedRecipientId, setSelectedRecipientId] = useState('')
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [loading, setLoading] = useState(false)

  // New recipient fields
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (recipientType === 'student') {
        fetchStudents()
      } else {
        fetchStudios()
      }
    }
  }, [isOpen, recipientType])

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students')
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchStudios = async () => {
    try {
      const response = await fetch('/api/studios')
      if (response.ok) {
        const data = await response.json()
        setStudios(data.studios || [])
      }
    } catch (error) {
      console.error('Error fetching studios:', error)
    }
  }

  const handleCreateAndIssue = async () => {
    if (!newName.trim() || (!newEmail.trim() && !newPhone.trim())) {
      alert('Please provide a name and either an email or phone number')
      return
    }

    setLoading(true)
    try {
      if (recipientType === 'student') {
        // Create new student
        const studentResponse = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: newName,
            email: newEmail || null,
            phone: newPhone || null,
          }),
        })

        if (!studentResponse.ok) {
          const error = await studentResponse.json()
          alert(error.error || 'Failed to create student')
          return
        }

        const studentData = await studentResponse.json()

        // Use student_id directly (works for students with or without auth accounts)
        await issueWaiverToStudent(studentData.student.id)
      } else {
        // Create new studio
        const studioResponse = await fetch('/api/studios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newName,
            contact_email: newEmail || null,
            contact_phone: newPhone || null,
          }),
        })

        if (!studioResponse.ok) {
          const error = await studioResponse.json()
          alert(error.error || 'Failed to create studio')
          return
        }

        const studioData = await studioResponse.json()

        // For studio, we need to get the studio admin profile_id
        // For now, we'll use a placeholder - this needs proper studio admin creation
        alert('Studio admin accounts need to be created separately. Please create the studio admin first.')
        return
      }
    } catch (error) {
      console.error('Error creating recipient and issuing waiver:', error)
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleIssueToExisting = async () => {
    if (!selectedRecipientId) {
      alert('Please select a recipient')
      return
    }

    setLoading(true)
    try {
      if (recipientType === 'student') {
        // For students, use student_id directly
        await issueWaiverToStudent(selectedRecipientId)
      } else {
        // For studios, use the studio ID (need to implement studio handling)
        await issueWaiver(selectedRecipientId)
      }
    } catch (error) {
      console.error('Error issuing waiver:', error)
      alert('An error occurred while issuing the waiver')
    } finally {
      setLoading(false)
    }
  }

  const issueWaiverToStudent = async (studentId: string) => {
    const response = await fetch('/api/waivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: template.id,
        title: template.title,
        description: template.description,
        content: template.content,
        waiver_type: template.waiver_type,
        student_id: studentId,
        recipient_type: recipientType,
      }),
    })

    if (response.ok) {
      alert('Waiver issued successfully!')
      resetForm()
      onSuccess()
      onClose()
    } else {
      const data = await response.json()
      alert(data.error || 'Failed to issue waiver')
    }
  }

  const issueWaiver = async (recipientId: string) => {
    const response = await fetch('/api/waivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: template.id,
        title: template.title,
        description: template.description,
        content: template.content,
        waiver_type: template.waiver_type,
        recipient_id: recipientId,
        recipient_type: recipientType,
      }),
    })

    if (response.ok) {
      alert('Waiver issued successfully!')
      resetForm()
      onSuccess()
      onClose()
    } else {
      const data = await response.json()
      alert(data.error || 'Failed to issue waiver')
    }
  }

  const resetForm = () => {
    setSelectedRecipientId('')
    setShowCreateNew(false)
    setNewName('')
    setNewEmail('')
    setNewPhone('')
  }

  const handleClose = () => {
    if (!loading) {
      resetForm()
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Issue: ${template.title}`}>
      <div className="space-y-4">
        {/* Recipient Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Issue waiver to:
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="student"
                checked={recipientType === 'student'}
                onChange={(e) => setRecipientType(e.target.value as 'student')}
                className="w-4 h-4 text-rose-600"
                disabled={loading}
              />
              <span className="text-sm">Student/Dancer</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="studio"
                checked={recipientType === 'studio'}
                onChange={(e) => setRecipientType(e.target.value as 'studio')}
                className="w-4 h-4 text-rose-600"
                disabled={loading}
              />
              <span className="text-sm">Studio</span>
            </label>
          </div>
        </div>

        {/* Toggle between existing and new */}
        <div className="border-t pt-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={!showCreateNew ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowCreateNew(false)}
              disabled={loading}
            >
              Select Existing
            </Button>
            <Button
              variant={showCreateNew ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowCreateNew(true)}
              disabled={loading}
            >
              Create New
            </Button>
          </div>

          {!showCreateNew ? (
            /* Select from existing */
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select {recipientType === 'student' ? 'Student' : 'Studio'}
              </label>
              <select
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                disabled={loading}
              >
                <option value="">-- Select --</option>
                {recipientType === 'student'
                  ? students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.profile?.full_name || 'Unknown'} -{' '}
                        {student.profile?.email || 'No email'}
                      </option>
                    ))
                  : studios.map((studio) => (
                      <option key={studio.id} value={studio.id}>
                        {studio.name} - {studio.contact_email || 'No email'}
                      </option>
                    ))}
              </select>
            </div>
          ) : (
            /* Create new recipient */
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {recipientType === 'student' ? 'Student' : 'Studio'} Name{' '}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={
                    recipientType === 'student' ? 'Full Name' : 'Studio Name'
                  }
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  disabled={loading}
                />
              </div>

              <p className="text-xs text-gray-500">
                * Provide at least an email or phone number
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={showCreateNew ? handleCreateAndIssue : handleIssueToExisting}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Issue Waiver'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
