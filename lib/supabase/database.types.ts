export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          created_at: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          instructor_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          instructor_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          instructor_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_purchases: {
        Row: {
          amount_paid: number
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          class_id: string
          created_at: string
          currency: string
          id: string
          purchased_at: string
          stripe_checkout_session_id: string
          student_id: string | null
          workshop_option: string | null
        }
        Insert: {
          amount_paid: number
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          class_id: string
          created_at?: string
          currency?: string
          id?: string
          purchased_at: string
          stripe_checkout_session_id: string
          student_id?: string | null
          workshop_option?: string | null
        }
        Update: {
          amount_paid?: number
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          class_id?: string
          created_at?: string
          currency?: string
          id?: string
          purchased_at?: string
          stripe_checkout_session_id?: string
          student_id?: string | null
          workshop_option?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_purchases_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_purchases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          actual_attendance_count: number | null
          asset_id: string | null
          base_cost: number | null
          cancellation_reason: string | null
          class_type: Database["public"]["Enums"]["class_type"]
          cost_per_hour: number | null
          cost_per_person: number | null
          created_at: string | null
          description: string | null
          end_time: string
          external_signup_url: string | null
          google_calendar_event_id: string | null
          google_meet_url: string | null
          id: string
          instructor_id: string
          is_cancelled: boolean | null
          is_public: boolean | null
          is_virtual: boolean
          location: string | null
          max_capacity: number | null
          price: number | null
          pricing_model: Database["public"]["Enums"]["pricing_model"] | null
          series_id: string | null
          share_slug: string | null
          start_time: string
          studio_id: string | null
          tiered_additional_cost: number | null
          tiered_base_students: number | null
          title: string
          updated_at: string | null
          workshop_full_only: boolean
          workshop_price: number | null
          workshop_signup_url: string | null
        }
        Insert: {
          actual_attendance_count?: number | null
          asset_id?: string | null
          base_cost?: number | null
          cancellation_reason?: string | null
          class_type: Database["public"]["Enums"]["class_type"]
          cost_per_hour?: number | null
          cost_per_person?: number | null
          created_at?: string | null
          description?: string | null
          end_time: string
          external_signup_url?: string | null
          google_calendar_event_id?: string | null
          google_meet_url?: string | null
          id?: string
          instructor_id: string
          is_cancelled?: boolean | null
          is_public?: boolean | null
          is_virtual?: boolean
          location?: string | null
          max_capacity?: number | null
          price?: number | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"] | null
          series_id?: string | null
          share_slug?: string | null
          start_time: string
          studio_id?: string | null
          tiered_additional_cost?: number | null
          tiered_base_students?: number | null
          title: string
          updated_at?: string | null
          workshop_full_only?: boolean
          workshop_price?: number | null
          workshop_signup_url?: string | null
        }
        Update: {
          actual_attendance_count?: number | null
          asset_id?: string | null
          base_cost?: number | null
          cancellation_reason?: string | null
          class_type?: Database["public"]["Enums"]["class_type"]
          cost_per_hour?: number | null
          cost_per_person?: number | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          external_signup_url?: string | null
          google_calendar_event_id?: string | null
          google_meet_url?: string | null
          id?: string
          instructor_id?: string
          is_cancelled?: boolean | null
          is_public?: boolean | null
          is_virtual?: boolean
          location?: string | null
          max_capacity?: number | null
          price?: number | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"] | null
          series_id?: string | null
          share_slug?: string | null
          start_time?: string
          studio_id?: string | null
          tiered_additional_cost?: number | null
          tiered_base_students?: number | null
          title?: string
          updated_at?: string | null
          workshop_full_only?: boolean
          workshop_price?: number | null
          workshop_signup_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          attendance_status: string | null
          class_id: string
          enrolled_at: string | null
          id: string
          notes: string | null
          student_id: string
          workshop_pass: boolean
        }
        Insert: {
          attendance_status?: string | null
          class_id: string
          enrolled_at?: string | null
          id?: string
          notes?: string | null
          student_id: string
          workshop_pass?: boolean
        }
        Update: {
          attendance_status?: string | null
          class_id?: string
          enrolled_at?: string | null
          id?: string
          notes?: string | null
          student_id?: string
          workshop_pass?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_access_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["instructor_request_status"]
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["instructor_request_status"]
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["instructor_request_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructor_access_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_access_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_student_relationships: {
        Row: {
          can_view_notes: boolean | null
          can_view_payments: boolean | null
          can_view_progress: boolean | null
          created_at: string | null
          created_by: string | null
          ended_at: string | null
          id: string
          instructor_id: string
          relationship_status: string | null
          started_at: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          can_view_notes?: boolean | null
          can_view_payments?: boolean | null
          can_view_progress?: boolean | null
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          instructor_id: string
          relationship_status?: string | null
          started_at?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          can_view_notes?: boolean | null
          can_view_payments?: boolean | null
          can_view_progress?: boolean | null
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          instructor_id?: string
          relationship_status?: string | null
          started_at?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructor_student_relationships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_student_relationships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_student_relationships_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_student_relationships_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_student_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_pack_purchases: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          lesson_pack_id: string
          payment_id: string | null
          purchased_at: string | null
          remaining_lessons: number
          stripe_checkout_session_id: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          lesson_pack_id: string
          payment_id?: string | null
          purchased_at?: string | null
          remaining_lessons: number
          stripe_checkout_session_id?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          lesson_pack_id?: string
          payment_id?: string | null
          purchased_at?: string | null
          remaining_lessons?: number
          stripe_checkout_session_id?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_pack_purchases_lesson_pack_id_fkey"
            columns: ["lesson_pack_id"]
            isOneToOne: false
            referencedRelation: "lesson_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_pack_purchases_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_pack_purchases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_pack_usage: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          lesson_pack_purchase_id: string
          lessons_used: number
          private_lesson_request_id: string | null
          used_at: string | null
          voided_at: string | null
          voided_reason: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          lesson_pack_purchase_id: string
          lessons_used?: number
          private_lesson_request_id?: string | null
          used_at?: string | null
          voided_at?: string | null
          voided_reason?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          lesson_pack_purchase_id?: string
          lessons_used?: number
          private_lesson_request_id?: string | null
          used_at?: string | null
          voided_at?: string | null
          voided_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_pack_usage_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_pack_usage_lesson_pack_purchase_id_fkey"
            columns: ["lesson_pack_purchase_id"]
            isOneToOne: false
            referencedRelation: "lesson_pack_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_pack_usage_private_lesson_request_id_fkey"
            columns: ["private_lesson_request_id"]
            isOneToOne: false
            referencedRelation: "private_lesson_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_packs: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          lesson_count: number
          name: string
          price: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lesson_count: number
          name: string
          price: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lesson_count?: number
          name?: string
          price?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lesson_reschedule_requests: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          proposed_dates: string[] | null
          reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          proposed_dates?: string[] | null
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          proposed_dates?: string[] | null
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_reschedule_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_reschedule_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_reschedule_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_reschedule_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string
          class_id: string | null
          content: string
          created_at: string | null
          id: string
          personal_class_id: string | null
          student_id: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          visibility: Database["public"]["Enums"]["note_visibility"]
        }
        Insert: {
          author_id: string
          class_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          personal_class_id?: string | null
          student_id?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Update: {
          author_id?: string
          class_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          personal_class_id?: string | null
          student_id?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_personal_class_id_fkey"
            columns: ["personal_class_id"]
            isOneToOne: false
            referencedRelation: "personal_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          actor_id: string | null
          created_at: string | null
          event_type: string
          id: string
          notes: string | null
          payment_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          notes?: string | null
          payment_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          class_id: string | null
          confirmed_by_instructor_at: string | null
          confirmed_by_studio_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          receipt_url: string | null
          stripe_payment_id: string | null
          student_id: string
          studio_id: string | null
          transaction_date: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          class_id?: string | null
          confirmed_by_instructor_at?: string | null
          confirmed_by_studio_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          receipt_url?: string | null
          stripe_payment_id?: string | null
          student_id: string
          studio_id?: string | null
          transaction_date?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          class_id?: string | null
          confirmed_by_instructor_at?: string | null
          confirmed_by_studio_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          receipt_url?: string | null
          stripe_payment_id?: string | null
          student_id?: string
          studio_id?: string | null
          transaction_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_classes: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          instructor_name: string | null
          is_recurring: boolean | null
          location: string | null
          notes: string | null
          start_time: string
          student_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          instructor_name?: string | null
          is_recurring?: boolean | null
          location?: string | null
          notes?: string | null
          start_time: string
          student_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          instructor_name?: string | null
          is_recurring?: boolean | null
          location?: string | null
          notes?: string | null
          start_time?: string
          student_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      private_lesson_requests: {
        Row: {
          additional_notes: string | null
          created_at: string | null
          id: string
          instructor_id: string | null
          instructor_response: string | null
          preferred_dates: string[] | null
          requested_focus: string | null
          scheduled_class_id: string | null
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          additional_notes?: string | null
          created_at?: string | null
          id?: string
          instructor_id?: string | null
          instructor_response?: string | null
          preferred_dates?: string[] | null
          requested_focus?: string | null
          scheduled_class_id?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          additional_notes?: string | null
          created_at?: string | null
          id?: string
          instructor_id?: string | null
          instructor_response?: string | null
          preferred_dates?: string[] | null
          requested_focus?: string | null
          scheduled_class_id?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "private_lesson_requests_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_lesson_requests_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_lesson_requests_scheduled_class_id_fkey"
            columns: ["scheduled_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_lesson_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          consent_given: boolean | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string
          guardian_id: string | null
          id: string
          linked_profile_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          consent_given?: boolean | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          guardian_id?: string | null
          id: string
          linked_profile_id?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          consent_given?: boolean | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          guardian_id?: string | null
          id?: string
          linked_profile_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_linked_profile_id_fkey"
            columns: ["linked_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_linked_profile_id_fkey"
            columns: ["linked_profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_ai_budgets: {
        Row: {
          monthly_cap_micros: number
          owner_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          monthly_cap_micros: number
          owner_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          monthly_cap_micros?: number
          owner_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_ai_budgets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_ai_budgets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_ai_budgets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_ai_budgets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_ai_calls: {
        Row: {
          asset_id: string | null
          cached_input_tokens: number
          cost_micros: number
          created_at: string
          design_id: string | null
          error_code: string | null
          id: string
          input_tokens: number
          kind: string
          latency_ms: number | null
          model: string
          output_tokens: number
          owner_id: string
          status: string
        }
        Insert: {
          asset_id?: string | null
          cached_input_tokens?: number
          cost_micros?: number
          created_at?: string
          design_id?: string | null
          error_code?: string | null
          id?: string
          input_tokens?: number
          kind: string
          latency_ms?: number | null
          model: string
          output_tokens?: number
          owner_id: string
          status: string
        }
        Update: {
          asset_id?: string | null
          cached_input_tokens?: number
          cost_micros?: number
          created_at?: string
          design_id?: string | null
          error_code?: string | null
          id?: string
          input_tokens?: number
          kind?: string
          latency_ms?: number | null
          model?: string
          output_tokens?: number
          owner_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_ai_calls_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "promo_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_ai_calls_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "promo_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_ai_calls_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_ai_calls_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_assets: {
        Row: {
          bytes: number
          created_at: string
          derivation: Json | null
          display_path: string
          favorite: boolean
          height: number
          id: string
          matte_path: string | null
          original_filename: string | null
          original_path: string
          owner_id: string
          parent_id: string | null
          pose: Json | null
          sha256: string
          status: string
          tagged_at: string | null
          tags: Json
          tags_edited: boolean
          thumb_path: string
          updated_at: string
          width: number
        }
        Insert: {
          bytes?: number
          created_at?: string
          derivation?: Json | null
          display_path: string
          favorite?: boolean
          height: number
          id?: string
          matte_path?: string | null
          original_filename?: string | null
          original_path: string
          owner_id: string
          parent_id?: string | null
          pose?: Json | null
          sha256: string
          status?: string
          tagged_at?: string | null
          tags?: Json
          tags_edited?: boolean
          thumb_path: string
          updated_at?: string
          width: number
        }
        Update: {
          bytes?: number
          created_at?: string
          derivation?: Json | null
          display_path?: string
          favorite?: boolean
          height?: number
          id?: string
          matte_path?: string | null
          original_filename?: string | null
          original_path?: string
          owner_id?: string
          parent_id?: string | null
          pose?: Json | null
          sha256?: string
          status?: string
          tagged_at?: string | null
          tags?: Json
          tags_edited?: boolean
          thumb_path?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_assets_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "promo_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_brand_kits: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
          tokens: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          tokens: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          tokens?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_brand_kits_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_brand_kits_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_brand_kits_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_brand_kits_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_design_revisions: {
        Row: {
          ai_call_id: string | null
          created_at: string
          design_id: string
          document: Json
          id: string
          instruction: string | null
          owner_id: string
          revision: number
          source: string
          summary: string | null
        }
        Insert: {
          ai_call_id?: string | null
          created_at?: string
          design_id: string
          document: Json
          id?: string
          instruction?: string | null
          owner_id: string
          revision: number
          source: string
          summary?: string | null
        }
        Update: {
          ai_call_id?: string | null
          created_at?: string
          design_id?: string
          document?: Json
          id?: string
          instruction?: string | null
          owner_id?: string
          revision?: number
          source?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_design_revisions_ai_call_id_fkey"
            columns: ["ai_call_id"]
            isOneToOne: false
            referencedRelation: "promo_ai_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_design_revisions_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "promo_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_design_revisions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_design_revisions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_designs: {
        Row: {
          brand_snapshot: Json
          brief: Json
          class_ids: string[]
          created_at: string
          document: Json
          format: string
          group_id: string
          id: string
          owner_id: string
          revision: number
          template_version_id: string
          thumbnail_updated_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          brand_snapshot: Json
          brief?: Json
          class_ids?: string[]
          created_at?: string
          document: Json
          format: string
          group_id?: string
          id?: string
          owner_id: string
          revision?: number
          template_version_id: string
          thumbnail_updated_at?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          brand_snapshot?: Json
          brief?: Json
          class_ids?: string[]
          created_at?: string
          document?: Json
          format?: string
          group_id?: string
          id?: string
          owner_id?: string
          revision?: number
          template_version_id?: string
          thumbnail_updated_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_designs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_designs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_designs_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "promo_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_publications: {
        Row: {
          asset_id: string | null
          class_id: string | null
          design_id: string
          id: string
          owner_id: string
          previous_class_asset_id: string | null
          public_path: string
          public_url: string
          published_at: string
          revision: number
          unpublished_at: string | null
        }
        Insert: {
          asset_id?: string | null
          class_id?: string | null
          design_id: string
          id?: string
          owner_id: string
          previous_class_asset_id?: string | null
          public_path: string
          public_url: string
          published_at?: string
          revision: number
          unpublished_at?: string | null
        }
        Update: {
          asset_id?: string | null
          class_id?: string | null
          design_id?: string
          id?: string
          owner_id?: string
          previous_class_asset_id?: string | null
          public_path?: string
          public_url?: string
          published_at?: string
          revision?: number
          unpublished_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_publications_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_publications_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_publications_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "promo_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_publications_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_publications_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_publications_previous_class_asset_id_fkey"
            columns: ["previous_class_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_template_versions: {
        Row: {
          created_at: string
          created_by: string | null
          definition: Json
          definition_format: number
          id: string
          notes: string | null
          published_at: string | null
          published_by: string | null
          template_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          definition: Json
          definition_format?: number
          id?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          template_id: string
          updated_at?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          definition?: Json
          definition_format?: number
          id?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          template_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_template_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_template_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "promo_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_templates: {
        Row: {
          created_at: string
          created_by: string | null
          current_version_id: string | null
          description: string | null
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_templates_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "promo_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string | null
          created_at: string
          id: string
          instructor_id: string
          rating: number
          show_name: boolean
          student_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          instructor_id: string
          rating: number
          show_name?: boolean
          student_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          instructor_id?: string
          rating?: number
          show_name?: boolean
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          age_group: string | null
          created_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          goals: string | null
          guardian_id: string | null
          id: string
          is_active: boolean | null
          medical_notes: string | null
          phone: string | null
          profile_id: string | null
          skill_level: string | null
          updated_at: string | null
        }
        Insert: {
          age_group?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          goals?: string | null
          guardian_id?: string | null
          id?: string
          is_active?: boolean | null
          medical_notes?: string | null
          phone?: string | null
          profile_id?: string | null
          skill_level?: string | null
          updated_at?: string | null
        }
        Update: {
          age_group?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          goals?: string | null
          guardian_id?: string | null
          id?: string
          is_active?: boolean | null
          medical_notes?: string | null
          phone?: string | null
          profile_id?: string | null
          skill_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_inquiries: {
        Row: {
          contact_email: string
          contact_method: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string | null
          email_count: number | null
          gmail_thread_id: string | null
          has_unread_reply: boolean | null
          id: string
          is_responded: boolean | null
          last_email_date: string | null
          last_email_message_id: string | null
          message: string | null
          responded_at: string | null
          response_notes: string | null
          status: string | null
          studio_id: string | null
          studio_name: string
        }
        Insert: {
          contact_email: string
          contact_method?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string | null
          email_count?: number | null
          gmail_thread_id?: string | null
          has_unread_reply?: boolean | null
          id?: string
          is_responded?: boolean | null
          last_email_date?: string | null
          last_email_message_id?: string | null
          message?: string | null
          responded_at?: string | null
          response_notes?: string | null
          status?: string | null
          studio_id?: string | null
          studio_name: string
        }
        Update: {
          contact_email?: string
          contact_method?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string | null
          email_count?: number | null
          gmail_thread_id?: string | null
          has_unread_reply?: boolean | null
          id?: string
          is_responded?: boolean | null
          last_email_date?: string | null
          last_email_message_id?: string | null
          message?: string | null
          responded_at?: string | null
          response_notes?: string | null
          status?: string | null
          studio_id?: string | null
          studio_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_inquiries_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      waiver_signatures: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          signature_image_url: string
          signed_at: string
          signed_by_id: string
          signer_email: string
          signer_name: string
          user_agent: string | null
          waiver_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_image_url: string
          signed_at?: string
          signed_by_id: string
          signer_email: string
          signer_name: string
          user_agent?: string | null
          waiver_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_image_url?: string
          signed_at?: string
          signed_by_id?: string
          signer_email?: string
          signer_name?: string
          user_agent?: string | null
          waiver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiver_signatures_waiver_id_fkey"
            columns: ["waiver_id"]
            isOneToOne: false
            referencedRelation: "waivers"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_templates: {
        Row: {
          content: string | null
          content_type: string
          created_at: string
          created_by_id: string
          description: string | null
          id: string
          is_active: boolean | null
          is_shared: boolean | null
          pdf_filename: string | null
          pdf_url: string | null
          title: string
          updated_at: string
          waiver_type: string
        }
        Insert: {
          content?: string | null
          content_type?: string
          created_at?: string
          created_by_id: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_shared?: boolean | null
          pdf_filename?: string | null
          pdf_url?: string | null
          title: string
          updated_at?: string
          waiver_type?: string
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string
          created_by_id?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_shared?: boolean | null
          pdf_filename?: string | null
          pdf_url?: string | null
          title?: string
          updated_at?: string
          waiver_type?: string
        }
        Relationships: []
      }
      waivers: {
        Row: {
          class_id: string | null
          content: string
          created_at: string
          declined_at: string | null
          declined_reason: string | null
          description: string | null
          expires_at: string | null
          id: string
          issued_by_id: string
          issued_by_role: string
          private_lesson_id: string | null
          recipient_id: string | null
          recipient_type: string
          signature_image_url: string | null
          signed_at: string | null
          signed_by_id: string | null
          status: string
          student_id: string | null
          template_id: string | null
          title: string
          updated_at: string
          waiver_type: string
        }
        Insert: {
          class_id?: string | null
          content: string
          created_at?: string
          declined_at?: string | null
          declined_reason?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          issued_by_id: string
          issued_by_role: string
          private_lesson_id?: string | null
          recipient_id?: string | null
          recipient_type: string
          signature_image_url?: string | null
          signed_at?: string | null
          signed_by_id?: string | null
          status?: string
          student_id?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          waiver_type?: string
        }
        Update: {
          class_id?: string | null
          content?: string
          created_at?: string
          declined_at?: string | null
          declined_reason?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          issued_by_id?: string
          issued_by_role?: string
          private_lesson_id?: string | null
          recipient_id?: string | null
          recipient_type?: string
          signature_image_url?: string | null
          signed_at?: string | null
          signed_by_id?: string | null
          status?: string
          student_id?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          waiver_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "waivers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_private_lesson_id_fkey"
            columns: ["private_lesson_id"]
            isOneToOne: false
            referencedRelation: "private_lesson_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "waiver_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      promo_ai_monthly: {
        Row: {
          calls: number | null
          cost_micros: number | null
          kind: string | null
          month: string | null
          owner_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_ai_calls_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_ai_calls_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_user_view_class: {
        Args: { class_id: string; user_id: string }
        Returns: boolean
      }
      can_view_profile: { Args: { p_target_id: string }; Returns: boolean }
      promo_is_admin: { Args: never; Returns: boolean }
      promo_is_instructor: { Args: never; Returns: boolean }
      promo_owner_id: { Args: never; Returns: string }
      user_role: { Args: never; Returns: string }
    }
    Enums: {
      class_type:
        | "group"
        | "private"
        | "workshop"
        | "master_class"
        | "competition_choreography"
      instructor_request_status: "pending" | "approved" | "rejected"
      note_visibility:
        | "private"
        | "shared_with_student"
        | "shared_with_guardian"
        | "shared_with_studio"
        | "shared_with_instructor"
      payment_method: "stripe" | "cash" | "check" | "other"
      payment_status: "pending" | "confirmed" | "disputed" | "cancelled"
      pricing_model: "per_person" | "per_class" | "per_hour" | "tiered"
      user_role:
        | "instructor"
        | "dancer"
        | "guardian"
        | "studio_admin"
        | "admin"
        | "studio"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      class_type: [
        "group",
        "private",
        "workshop",
        "master_class",
        "competition_choreography",
      ],
      instructor_request_status: ["pending", "approved", "rejected"],
      note_visibility: [
        "private",
        "shared_with_student",
        "shared_with_guardian",
        "shared_with_studio",
        "shared_with_instructor",
      ],
      payment_method: ["stripe", "cash", "check", "other"],
      payment_status: ["pending", "confirmed", "disputed", "cancelled"],
      pricing_model: ["per_person", "per_class", "per_hour", "tiered"],
      user_role: [
        "instructor",
        "dancer",
        "guardian",
        "studio_admin",
        "admin",
        "studio",
      ],
    },
  },
} as const
