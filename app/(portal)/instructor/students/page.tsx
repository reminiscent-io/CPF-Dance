'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import {
  Badge,
  Button,
  EmptyCell,
  EmptyState,
  Input,
  Modal,
  ModalFooter,
  PageHeader,
  PersonChip,
  SegmentedControl,
  Select,
  StatusDot,
  Table,
  Textarea,
  Toolbar,
  useToast,
  PageSkeleton,
  SkeletonCardGrid
} from '@/components/ui'
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import type { Student, CreateStudentData } from '@/lib/types'

type StudentFilter = 'all' | 'active' | 'inactive'

/**
 * Loaders that return data instead of setting state, so the mount effect and
 * the tag/untag handlers can share them and own their own setState.
 */
async function loadStudents(filterActive: boolean | null): Promise<Student[]> {
  const params = new URLSearchParams()
  if (filterActive !== null) {
    params.append('is_active', filterActive.toString())
  }
  const response = await fetch(`/api/students?${params}`)
  if (!response.ok) throw new Error('Failed to fetch students')
  const data = await response.json()
  return data.students || []
}

async function loadInstructors(): Promise<any[]> {
  const response = await fetch('/api/instructors')
  const data = await response.json()
  return data.instructors || []
}

async function loadRelationships(): Promise<any[]> {
  const response = await fetch('/api/relationships')
  const data = await response.json()
  return data.data || []
}

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
      router.push('/dancer')
    }
  }, [authLoading, profile, router])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    loadStudents(filterActive)
      .then((loaded) => { if (!cancelled) setStudents(loaded) })
      .catch((error) => {
        console.error('Error fetching students:', error)
        if (!cancelled) addToast('Failed to load students', 'error')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    if (profile?.role === 'admin') {
      loadInstructors()
        .then((loaded) => { if (!cancelled) setInstructors(loaded) })
        .catch((error) => console.error('Error fetching instructors:', error))

      loadRelationships()
        .then((loaded) => { if (!cancelled) setRelationships(loaded) })
        .catch((error) => console.error('Error fetching relationships:', error))
    }

    return () => { cancelled = true }
  }, [user?.id, filterActive, profile?.role, addToast])

  const refreshRelationships = async () => {
    try {
      setRelationships(await loadRelationships())
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
      refreshRelationships()
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
      refreshRelationships()
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
      <PortalLayout profile={profile}>
        <PageSkeleton variant="table" withAction withToolbar />
      </PortalLayout>
    )
  }

  const getStudentName = (student: Student) =>
    student.full_name || student.profile?.full_name || ''

  // Most-taught students first; ties fall back to name
  const filteredStudents = students
    .filter(student => getStudentName(student).toLowerCase().includes(search.toLowerCase()))
    .sort(
      (a, b) =>
        (b.classes_taken ?? 0) - (a.classes_taken ?? 0) ||
        getStudentName(a).localeCompare(getStudentName(b))
    )

  // Sparse columns stay hidden until the data exists.
  const hasAgeGroups = filteredStudents.some((s) => s.age_group)
  const hasSkillLevels = filteredStudents.some((s) => s.skill_level)

  let studentFilter: StudentFilter = 'all'
  if (filterActive !== null) studentFilter = filterActive ? 'active' : 'inactive'

  const baseColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (student: Student) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{getStudentName(student) || <EmptyCell />}</span>
          {!student.profile_id && (
            <Badge variant="warning" size="sm">Not linked</Badge>
          )}
        </div>
      )
    },
    ...(hasAgeGroups
      ? [{
          key: 'age_group',
          header: 'Age Group',
          render: (student: Student) => student.age_group || <EmptyCell />
        }]
      : []),
    ...(hasSkillLevels
      ? [{
          key: 'skill_level',
          header: 'Skill Level',
          render: (student: Student) => student.skill_level || <EmptyCell />
        }]
      : []),
    {
      key: 'classes_taken',
      header: 'Classes',
      numeric: true,
      render: (student: Student) => student.classes_taken ?? 0
    },
    {
      key: 'status',
      header: 'Status',
      render: (student: Student) => (
        <StatusDot
          tone={student.is_active ? 'positive' : 'neutral'}
          label={student.is_active ? 'Active' : 'Inactive'}
        />
      )
    }
  ]

  const adminColumns = profile?.role === 'admin' ? [
    ...baseColumns,
    {
      key: 'instructors',
      header: 'Instructors',
      render: (student: Student) => {
        const taggedInstructors = getStudentInstructors(student.id)
        return taggedInstructors.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {taggedInstructors.map((instructor: any) => (
              <PersonChip key={instructor.id} name={instructor.full_name} />
            ))}
          </div>
        ) : (
          <EmptyCell />
        )
      }
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      hoverOnly: true,
      render: (student: Student) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedStudent(student)
            setShowTagModal(true)
          }}
        >
          + Tag
        </Button>
      )
    }
  ] : baseColumns

  const columns = adminColumns

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="Students"
        subtitle="Manage your student roster"
        action={
          <Button onClick={() => setShowAddModal(true)}>
            <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
            Add student
          </Button>
        }
      />

      <Toolbar
        search={
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search students"
          />
        }
        filters={
          <SegmentedControl<StudentFilter>
            aria-label="Filter students by status"
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            value={studentFilter}
            onChange={(value) => setFilterActive(value === 'all' ? null : value === 'active')}
          />
        }
      />

      {/* Desktop Table View */}
      <div className="mt-toolbar-gap hidden md:block">
        <Table
          data={filteredStudents}
          columns={columns}
          onRowClick={(student) => router.push(`/instructor/students/${student.id}`)}
          loading={loading}
          empty={
            <EmptyState
              icon={<UserGroupIcon />}
              message={
                search || filterActive !== null
                  ? 'No students match this view.'
                  : 'Your roster is empty.'
              }
              action={
                !search && filterActive === null ? (
                  <Button onClick={() => setShowAddModal(true)}>
                    <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
                    Add student
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </div>

      {/* Mobile Card View */}
      <div className="mt-toolbar-gap md:hidden">
        {loading ? (
          <SkeletonCardGrid count={4} cols="grid-cols-1" gap="gap-3" />
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-lg border border-champagne-200 bg-champagne-50">
            <EmptyState
              icon={<UserGroupIcon />}
              message={
                search || filterActive !== null
                  ? 'No students match this view.'
                  : 'Your roster is empty.'
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => router.push(`/instructor/students/${student.id}`)}
                className="rounded-lg border border-champagne-200 bg-champagne-50 p-4 cursor-pointer hover:bg-champagne-100 active:bg-champagne-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif text-lg font-semibold text-charcoal-950 truncate">
                        {getStudentName(student) || '–'}
                      </h3>
                      {!student.profile_id && (
                        <Badge variant="warning" size="sm" className="whitespace-nowrap">
                          Not linked
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-charcoal-700">
                      {student.age_group && (
                        <span className="inline-flex items-center">
                          <span className="text-charcoal-400 mr-1">Age:</span>
                          {student.age_group}
                        </span>
                      )}
                      {student.skill_level && (
                        <span className="inline-flex items-center">
                          <span className="text-charcoal-400 mr-1">Level:</span>
                          {student.skill_level}
                        </span>
                      )}
                      <span className="inline-flex items-center tabular-nums">
                        <span className="text-charcoal-400 mr-1">Classes:</span>
                        {student.classes_taken ?? 0}
                      </span>
                    </div>
                    {profile?.role === 'admin' && (
                      <div className="mt-2">
                        {getStudentInstructors(student.id).length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {getStudentInstructors(student.id).map((instructor: any) => (
                              <PersonChip key={instructor.id} name={instructor.full_name} />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-charcoal-400">No instructors tagged</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusDot
                      tone={student.is_active ? 'positive' : 'neutral'}
                      label={student.is_active ? 'Active' : 'Inactive'}
                    />
                    {profile?.role === 'admin' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedStudent(student)
                          setShowTagModal(true)
                        }}
                      >
                        + Tag
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
            <Select
              label="Age Group (optional)"
              value={formData.age_group}
              onChange={(e) => setFormData({ ...formData, age_group: e.target.value })}
              options={[
                { value: '', label: 'Select age group...' },
                { value: 'Child (<13)', label: 'Child (<13)' },
                { value: 'Teen (13-18)', label: 'Teen (13-18)' },
                { value: 'Adult (+18)', label: 'Adult (+18)' }
              ]}
            />
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
            <h3 className="text-sm font-medium text-charcoal-700 mb-2">Currently Tagged:</h3>
            <div className="space-y-2">
              {currentRelationships.map((instructor) => {
                const relationship = relationships.find(r => r.instructor?.id === instructor.id)
                return (
                  <div
                    key={instructor.id}
                    className="flex items-center justify-between p-3 bg-champagne-100 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-charcoal-900">{instructor.full_name}</p>
                      <p className="text-sm text-charcoal-500">{instructor.email}</p>
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
          <h3 className="text-sm font-medium text-charcoal-700 mb-2">Add New Instructor:</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Select
                label="Select Instructor"
                value={selectedInstructorId}
                onChange={(e) => setSelectedInstructorId(e.target.value)}
                required
                options={[
                  { value: '', label: 'Choose an instructor...' },
                  ...availableInstructors.map((instructor) => ({
                    value: instructor.id,
                    label: `${instructor.full_name} (${instructor.email})`
                  }))
                ]}
              />
              {availableInstructors.length === 0 && (
                <p className="text-sm text-charcoal-400 mt-2">
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
