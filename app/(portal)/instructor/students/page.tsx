'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, Button, Input, Modal, ModalFooter, Textarea, Table, useToast, Spinner } from '@/components/ui'
import type { Student, CreateStudentData } from '@/lib/types'

export default function StudentsPage() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()
  
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  const [showTagModal, setShowTagModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [instructors, setInstructors] = useState<any[]>([])
  const [relationships, setRelationships] = useState<any[]>([])

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'studio' ? 'studio' : 'dancer'}`)
    }
  }, [authLoading, profile, router])

  useEffect(() => {
    if (user) {
      fetchStudents()
      if (profile?.role === 'admin') {
        fetchInstructors()
        fetchRelationships()
      }
    }
  }, [user, filterActive, profile])

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams()
      if (filterActive !== null) {
        params.append('is_active', filterActive.toString())
      }

      const response = await fetch(`/api/students?${params}`)
      if (!response.ok) throw new Error('Failed to fetch students')

      const data = await response.json()
      setStudents(data.students || [])
    } catch (error) {
      console.error('Error fetching students:', error)
      addToast('Failed to load students', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchInstructors = async () => {
    try {
      const response = await fetch('/api/instructors')
      const data = await response.json()
      setInstructors(data.instructors || [])
    } catch (error) {
      console.error('Error fetching instructors:', error)
    }
  }

  const fetchRelationships = async () => {
    try {
      const response = await fetch('/api/relationships')
      const data = await response.json()
      setRelationships(data.data || [])
    } catch (error) {
      console.error('Error fetching relationships:', error)
    }
  }

  const handleTagInstructor = async (instructorId: string) => {
    if (!selectedStudent) return

    try {
      const response = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructor_id: instructorId,
          student_id: selectedStudent.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to tag instructor')
      }

      addToast('Instructor tagged successfully', 'success')
      setShowTagModal(false)
      setSelectedStudent(null)
      fetchRelationships()
    } catch (error: any) {
      console.error('Error tagging instructor:', error)
      addToast(error.message || 'Failed to tag instructor', 'error')
    }
  }

  const handleRemoveTag = async (relationshipId: string) => {
    try {
      const response = await fetch(`/api/relationships?id=${relationshipId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to remove tag')

      addToast('Tag removed successfully', 'success')
      fetchRelationships()
    } catch (error) {
      console.error('Error removing tag:', error)
      addToast('Failed to remove tag', 'error')
    }
  }

  const getStudentInstructors = (studentId: string) => {
    return relationships
      .filter(r => r.student_id === studentId && r.relationship_status === 'active')
      .map(r => r.instructor)
  }

  const handleAddStudent = async (formData: CreateStudentData) => {
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to create student')

      const { student } = await response.json()
      setStudents(prev => [student, ...prev])
      setShowAddModal(false)
      addToast('Student added successfully', 'success')
    } catch (error) {
      console.error('Error adding student:', error)
      addToast('Failed to add student', 'error')
    }
  }

  if (authLoading || !profile || profile.role !== 'instructor' && profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  const filteredStudents = students.filter(student => {
    const studentName = (student.full_name || student.profile?.full_name || '').toLowerCase()
    return studentName.includes(search.toLowerCase())
  })

  const baseColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (student: Student) => (
        <div className="flex items-center gap-2">
          <span>{student.full_name || student.profile?.full_name || 'N/A'}</span>
          {!student.profile_id && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Not Linked
            </span>
          )}
        </div>
      )
    },
    {
      key: 'age_group',
      header: 'Age Group',
      render: (student: Student) => student.age_group || 'N/A'
    },
    {
      key: 'skill_level',
      header: 'Skill Level',
      render: (student: Student) => student.skill_level || 'N/A'
    },
    {
      key: 'status',
      header: 'Status',
      render: (student: Student) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          student.is_active
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {student.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ]

  const adminColumns = profile?.role === 'admin' ? [
    ...baseColumns,
    {
      key: 'instructors',
      header: 'Tagged Instructors',
      render: (student: Student) => {
        const taggedInstructors = getStudentInstructors(student.id)
        return (
          <div className="flex items-center gap-2">
            {taggedInstructors.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {taggedInstructors.map((instructor: any) => (
                  <span key={instructor.id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {instructor.full_name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 text-sm">No instructors</span>
            )}
          </div>
        )
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (student: Student) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedStudent(student)
            setShowTagModal(true)
          }}
        >
          Tag Instructor
        </Button>
      )
    }
  ] : baseColumns

  const columns = adminColumns

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-600 mt-1">Manage your student roster</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            Add New Student
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterActive === null ? 'primary' : 'outline'}
              onClick={() => setFilterActive(null)}
              size="sm"
            >
              All
            </Button>
            <Button
              variant={filterActive === true ? 'primary' : 'outline'}
              onClick={() => setFilterActive(true)}
              size="sm"
            >
              Active
            </Button>
            <Button
              variant={filterActive === false ? 'primary' : 'outline'}
              onClick={() => setFilterActive(false)}
              size="sm"
            >
              Inactive
            </Button>
          </div>
        </div>
      </div>

      <Table
        data={filteredStudents}
        columns={columns}
        onRowClick={(student) => router.push(`/instructor/students/${student.id}`)}
        loading={loading}
        emptyMessage="No students found"
      />

      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddStudent}
        />
      )}

      {showTagModal && selectedStudent && (
        <TagInstructorModal
          student={selectedStudent}
          instructors={instructors}
          currentRelationships={getStudentInstructors(selectedStudent.id)}
          onClose={() => {
            setShowTagModal(false)
            setSelectedStudent(null)
          }}
          onTag={handleTagInstructor}
          onRemove={handleRemoveTag}
          relationships={relationships.filter(r => r.student_id === selectedStudent.id)}
        />
      )}
    </PortalLayout>
  )
}

interface AddStudentModalProps {
  onClose: () => void
  onSubmit: (data: CreateStudentData) => void
}

function AddStudentModal({ onClose, onSubmit }: AddStudentModalProps) {
  const [formData, setFormData] = useState<CreateStudentData>({
    full_name: '',
    email: '',
    phone: '',
    age_group: '',
    skill_level: '',
    goals: '',
    medical_notes: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Add New Student" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Full Name"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age Group (optional)
              </label>
              <select
                value={formData.age_group}
                onChange={(e) => setFormData({ ...formData, age_group: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
              >
                <option value="">Select age group...</option>
                <option value="Child (<13)">Child (&lt;13)</option>
                <option value="Teen (13-18)">Teen (13-18)</option>
                <option value="Adult (+18)">Adult (+18)</option>
              </select>
            </div>
            <Input
              label="Skill Level (optional)"
              placeholder="e.g., Beginner, Intermediate"
              value={formData.skill_level}
              onChange={(e) => setFormData({ ...formData, skill_level: e.target.value })}
            />
          </div>

          <Textarea
            label="Goals (optional)"
            rows={3}
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
          />

          <Textarea
            label="Medical Notes (optional)"
            rows={2}
            value={formData.medical_notes}
            onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Emergency Contact Name (optional)"
              value={formData.emergency_contact_name}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
            />
            <Input
              label="Emergency Contact Phone (optional)"
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
            />
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add Student</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

interface TagInstructorModalProps {
  student: Student
  instructors: any[]
  currentRelationships: any[]
  onClose: () => void
  onTag: (instructorId: string) => void
  onRemove: (relationshipId: string) => void
  relationships: any[]
}

function TagInstructorModal({
  student,
  instructors,
  currentRelationships,
  onClose,
  onTag,
  onRemove,
  relationships
}: TagInstructorModalProps) {
  const [selectedInstructorId, setSelectedInstructorId] = useState('')

  // Filter out instructors who are already tagged
  const availableInstructors = instructors.filter(
    instructor => !currentRelationships.some(rel => rel.id === instructor.id)
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedInstructorId) {
      onTag(selectedInstructorId)
      setSelectedInstructorId('')
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Tag Instructors for ${student.full_name || student.profile?.full_name}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Current Tagged Instructors */}
        {currentRelationships.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Currently Tagged:</h3>
            <div className="space-y-2">
              {currentRelationships.map((instructor) => {
                const relationship = relationships.find(r => r.instructor?.id === instructor.id)
                return (
                  <div
                    key={instructor.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{instructor.full_name}</p>
                      <p className="text-sm text-gray-600">{instructor.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => relationship && onRemove(relationship.id)}
                    >
                      Remove
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Add New Instructor */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Add New Instructor:</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Instructor
              </label>
              <select
                value={selectedInstructorId}
                onChange={(e) => setSelectedInstructorId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
                required
              >
                <option value="">Choose an instructor...</option>
                {availableInstructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.full_name} ({instructor.email})
                  </option>
                ))}
              </select>
              {availableInstructors.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  All available instructors are already tagged
                </p>
              )}
            </div>

            <ModalFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                type="submit"
                disabled={!selectedInstructorId || availableInstructors.length === 0}
              >
                Tag Instructor
              </Button>
            </ModalFooter>
          </form>
        </div>
      </div>
    </Modal>
  )
}
