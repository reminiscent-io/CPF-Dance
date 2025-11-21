export type UserRole = 'instructor' | 'dancer' | 'guardian' | 'studio' | 'admin'
export type PaymentStatus = 'pending' | 'confirmed' | 'disputed' | 'cancelled'
export type PaymentMethod = 'stripe' | 'cash' | 'check' | 'other'
export type ClassType = 'group' | 'private' | 'workshop' | 'master_class'
export type NoteVisibility = 'private' | 'shared_with_student' | 'shared_with_guardian' | 'shared_with_studio'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
export type PrivateLessonRequestStatus = 'pending' | 'approved' | 'scheduled' | 'declined'
export type PricingModel = 'per_person' | 'per_class' | 'per_hour' | 'tiered'

export interface Student {
  id: string
  profile_id: string | null
  guardian_id: string | null
  full_name: string | null // Stored directly on student when no profile linked
  email: string | null // Stored directly on student when no profile linked
  phone: string | null // Stored directly on student when no profile linked
  age_group: string | null
  skill_level: string | null
  goals: string | null
  medical_notes: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  profile?: {
    full_name: string
    email: string | null
    phone: string | null
    date_of_birth: string | null
  }
  guardian?: {
    full_name: string
    email: string | null
    phone: string | null
  }
}

export interface Studio {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Class {
  id: string
  instructor_id: string
  studio_id: string | null
  class_type: ClassType
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  max_capacity: number | null

  // Pricing structure
  pricing_model: PricingModel
  base_cost: number | null // Base/flat cost for per_class or tiered models
  cost_per_person: number | null // Cost per student for per_person model
  cost_per_hour: number | null // Cost per hour for per_hour model
  tiered_base_students: number | null // Number of students included in base cost (tiered model)
  tiered_additional_cost: number | null // Cost per additional student beyond base (tiered model)

  // Legacy field (deprecated)
  price: number | null

  is_cancelled: boolean
  cancellation_reason: string | null
  actual_attendance_count: number | null // Manual override for actual attendance
  created_at: string
  updated_at: string
  studio?: Studio
  enrollments?: Enrollment[]
  enrolled_count?: number
}

export interface Enrollment {
  id: string
  student_id: string
  class_id: string
  enrolled_at: string
  attendance_status: AttendanceStatus | null
  notes: string | null
  student?: Student
}

export interface Note {
  id: string
  author_id: string
  student_id: string
  class_id: string | null
  title: string | null
  content: string
  tags: string[] | null
  visibility: NoteVisibility
  created_at: string
  updated_at: string
  student?: Student
  class?: Class
  author?: {
    full_name: string
  }
}

export interface Payment {
  id: string
  student_id: string
  class_id: string | null
  studio_id: string | null
  amount: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  stripe_payment_id: string | null
  transaction_date: string
  confirmed_by_instructor_at: string | null
  confirmed_by_studio_at: string | null
  notes: string | null
  receipt_url: string | null
  created_at: string
  updated_at: string
  student?: Student
  class?: Class
}

export interface PrivateLessonRequest {
  id: string
  student_id: string
  requested_focus: string | null
  preferred_dates: string[] | null
  additional_notes: string | null
  status: PrivateLessonRequestStatus
  instructor_response: string | null
  created_at: string
  updated_at: string
  student?: Student
}

export interface DashboardStats {
  total_students: number
  active_students: number
  upcoming_classes: number
  pending_requests: number
  unpaid_invoices: number
}

export interface RecentActivity {
  id: string
  type: 'enrollment' | 'note' | 'payment' | 'request'
  description: string
  timestamp: string
  student_name?: string
}

export interface CreateStudentData {
  profile_id?: string
  guardian_id?: string
  age_group?: string
  skill_level?: string
  goals?: string
  medical_notes?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  full_name: string // Required - the only mandatory field
  email?: string
  phone?: string
}

export interface UpdateStudentData {
  age_group?: string
  skill_level?: string
  goals?: string
  medical_notes?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  is_active?: boolean
}

export interface CreateNoteData {
  student_id: string
  class_id?: string
  title?: string
  content: string
  tags?: string[]
  visibility: NoteVisibility
}

export interface CreateClassData {
  studio_id?: string
  class_type: ClassType
  title: string
  description?: string
  location?: string
  start_time: string
  end_time: string
  max_capacity?: number

  // Pricing structure
  pricing_model?: PricingModel
  base_cost?: number // For per_class or tiered models
  cost_per_person?: number // For per_person model
  cost_per_hour?: number // For per_hour model
  tiered_base_students?: number // For tiered model
  tiered_additional_cost?: number // For tiered model

  // Legacy field (backward compatibility)
  price?: number
}

export interface CreateStudioData {
  name: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  contact_email?: string
  contact_phone?: string
  notes?: string
}
