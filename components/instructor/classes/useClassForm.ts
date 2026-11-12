import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useUser } from '@/lib/auth/hooks'
import type { CreateClassData } from '@/lib/types'
import {
  loadInstructorProfiles,
  loadStudents,
  type InstructorOption,
  type StudentOption,
} from './class-helpers'

export type ClassFormData = CreateClassData & {
  newStudioName?: string
  instructor_id?: string
  asset_id?: string | null
}

// What the shared form fields read and write
export interface ClassFormController {
  formData: ClassFormData
  patchForm: (patch: Partial<ClassFormData>) => void
  isCreatingNewStudio: boolean
  setIsCreatingNewStudio: (creating: boolean) => void
  durationMinutes: number
  setDurationMinutes: (minutes: number) => void
  instructors: InstructorOption[]
}

export interface ClassFormState<T extends ClassFormData> extends ClassFormController {
  formData: T
  setFormData: Dispatch<SetStateAction<T>>
  profile: ReturnType<typeof useUser>['profile']
  students: StudentOption[]
}

// Form state the create and edit class modals share, plus the instructor
// (admins only) and student lists their pickers need.
export function useClassForm<T extends ClassFormData>(initial: T, initialDurationMinutes: number): ClassFormState<T> {
  const { profile } = useUser()
  const [instructors, setInstructors] = useState<InstructorOption[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [formData, setFormData] = useState<T>(initial)
  const [isCreatingNewStudio, setIsCreatingNewStudio] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState(initialDurationMinutes)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (profile?.role === 'admin') {
        try {
          const loaded = await loadInstructorProfiles()
          if (!cancelled) setInstructors(loaded)
        } catch (error) {
          console.error('Error fetching instructors:', error)
        }
      }

      try {
        const loaded = await loadStudents()
        if (!cancelled) setStudents(loaded)
      } catch (error) {
        console.error('Error fetching students:', error)
      }
    }

    run()
    return () => { cancelled = true }
  }, [profile])

  const patchForm = (patch: Partial<ClassFormData>) => setFormData({ ...formData, ...patch })

  return {
    profile,
    instructors,
    students,
    formData,
    setFormData,
    patchForm,
    isCreatingNewStudio,
    setIsCreatingNewStudio,
    durationMinutes,
    setDurationMinutes,
  }
}
