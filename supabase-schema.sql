-- Dance Teaching Schedule Management Platform - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('instructor', 'dancer', 'guardian', 'studio_admin', 'admin');
CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'disputed', 'cancelled');
CREATE TYPE payment_method AS ENUM ('stripe', 'cash', 'check', 'other');
CREATE TYPE class_type AS ENUM ('group', 'private', 'workshop', 'master_class');
CREATE TYPE note_visibility AS ENUM ('private', 'shared_with_student', 'shared_with_guardian', 'shared_with_studio');
CREATE TYPE pricing_model AS ENUM ('per_person', 'per_class', 'per_hour', 'tiered');

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  avatar_url TEXT,
  date_of_birth DATE,
  guardian_id UUID REFERENCES profiles(id), -- For dancers under 13
  consent_given BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studios table
CREATE TABLE studios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students table (for tracking dancer information)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES profiles(id),
  age_group TEXT,
  skill_level TEXT,
  goals TEXT,
  medical_notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  studio_id UUID REFERENCES studios(id),
  class_type class_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_capacity INTEGER,

  -- Pricing structure (supports multiple pricing models)
  pricing_model pricing_model DEFAULT 'per_person',
  base_cost DECIMAL(10, 2), -- Base/flat cost for per_class or tiered models
  cost_per_person DECIMAL(10, 2), -- Cost per student for per_person model
  cost_per_hour DECIMAL(10, 2), -- Cost per hour for per_hour model
  tiered_base_students INTEGER, -- Number of students included in base cost (tiered model)
  tiered_additional_cost DECIMAL(10, 2), -- Cost per additional student beyond base (tiered model)

  -- Legacy field (deprecated, use pricing_model fields instead)
  price DECIMAL(10, 2), -- Kept for backward compatibility

  is_cancelled BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments table (links students to classes)
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  attendance_status TEXT, -- 'present', 'absent', 'late', 'excused'
  notes TEXT,
  UNIQUE(student_id, class_id)
);

-- Notes table (instructor feedback and student personal notes)
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES profiles(id),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT[], -- e.g., ['technique', 'performance', 'improvement']
  visibility note_visibility NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  studio_id UUID REFERENCES studios(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  stripe_payment_id TEXT,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  confirmed_by_instructor_at TIMESTAMPTZ,
  confirmed_by_studio_at TIMESTAMPTZ,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment events table (audit trail)
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'confirmed', 'disputed', 'cancelled'
  actor_id UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Private lesson requests table
CREATE TABLE private_lesson_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requested_focus TEXT,
  preferred_dates TEXT[],
  additional_notes TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'scheduled', 'declined'
  instructor_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studio inquiries table (for public form)
CREATE TABLE studio_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'converted', 'declined'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_classes_instructor ON classes(instructor_id);
CREATE INDEX idx_classes_studio ON classes(studio_id);
CREATE INDEX idx_classes_start_time ON classes(start_time);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_class ON enrollments(class_id);
CREATE INDEX idx_notes_student ON notes(student_id);
CREATE INDEX idx_notes_author ON notes(author_id);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(payment_status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_lesson_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow all authenticated users to view profiles
-- This is safe and necessary for the app to function properly
-- Previous policy caused infinite recursion by querying profiles table within a profiles policy
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Note: No INSERT policy needed - the handle_new_user() trigger creates profiles with SECURITY DEFINER

-- RLS Policies for students
CREATE POLICY "Students can view their own student record"
  ON students FOR SELECT
  USING (
    profile_id = auth.uid() OR
    guardian_id = auth.uid()
  );

CREATE POLICY "Instructors can view all students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

CREATE POLICY "Instructors can manage students"
  ON students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

-- RLS Policies for classes
CREATE POLICY "Everyone can view active classes"
  ON classes FOR SELECT
  USING (is_cancelled = false);

CREATE POLICY "Instructors can manage their classes"
  ON classes FOR ALL
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

-- Admin policies for classes
CREATE POLICY "Admins can view all classes"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create classes"
  ON classes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all classes"
  ON classes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete classes"
  ON classes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for enrollments
CREATE POLICY "Students can view their enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = enrollments.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Instructors can view all enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

CREATE POLICY "Instructors can manage enrollments"
  ON enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

-- RLS Policies for notes
CREATE POLICY "Students can view shared notes about them"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = notes.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
      AND notes.visibility IN ('shared_with_student', 'shared_with_guardian')
    )
    OR author_id = auth.uid()
  );

CREATE POLICY "Instructors and Admins can manage all notes"
  ON notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('instructor', 'admin')
    )
    OR author_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('instructor', 'admin')
    )
    OR author_id = auth.uid()
  );

-- RLS Policies for payments
CREATE POLICY "Students can view their payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = payments.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Instructors can manage all payments"
  ON payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

CREATE POLICY "Studio admins can view their studio payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'studio_admin'
    )
  );

-- RLS Policies for private lesson requests
CREATE POLICY "Students can view their own requests"
  ON private_lesson_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = private_lesson_requests.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Students can create requests"
  ON private_lesson_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = private_lesson_requests.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Instructors can manage all requests"
  ON private_lesson_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

-- RLS Policies for studio inquiries (public insert, instructor view)
CREATE POLICY "Anyone can create studio inquiries"
  ON studio_inquiries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Instructors can view all inquiries"
  ON studio_inquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

-- Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  guardian_uuid UUID;
BEGIN
  -- Get role from metadata, default to 'dancer' if not provided
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'dancer');

  -- Get guardian_id from metadata if provided
  guardian_uuid := (NEW.raw_user_meta_data->>'guardian_id')::UUID;

  -- Insert profile
  INSERT INTO public.profiles (id, email, phone, full_name, role, guardian_id, consent_given)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role::user_role,
    guardian_uuid,
    false
  );

  -- If role is dancer, also create student record with guardian_id
  IF user_role = 'dancer' THEN
    INSERT INTO public.students (profile_id, guardian_id, is_active)
    VALUES (NEW.id, guardian_uuid, true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_studios_updated_at BEFORE UPDATE ON studios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_private_lesson_requests_updated_at BEFORE UPDATE ON private_lesson_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
