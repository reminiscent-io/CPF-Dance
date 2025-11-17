-- DISABLE ALL RLS POLICIES AND RLS
-- Run this in your Supabase SQL Editor to allow all database operations

-- Drop all policies from profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Instructors can view all profiles" ON profiles;

-- Drop all policies from students
DROP POLICY IF EXISTS "Students can view their own student record" ON students;
DROP POLICY IF EXISTS "Instructors can view all students" ON students;
DROP POLICY IF EXISTS "Instructors can manage students" ON students;

-- Drop all policies from classes
DROP POLICY IF EXISTS "Everyone can view active classes" ON classes;
DROP POLICY IF EXISTS "Instructors can manage their classes" ON classes;

-- Drop all policies from enrollments
DROP POLICY IF EXISTS "Students can view their enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can manage enrollments" ON enrollments;

-- Drop all policies from notes
DROP POLICY IF EXISTS "Students can view shared notes about them" ON notes;
DROP POLICY IF EXISTS "Instructors can manage all notes" ON notes;

-- Drop all policies from payments
DROP POLICY IF EXISTS "Students can view their payments" ON payments;
DROP POLICY IF EXISTS "Instructors can manage all payments" ON payments;
DROP POLICY IF EXISTS "Studio admins can view their studio payments" ON payments;

-- Drop all policies from payment_events
-- (No policies were defined in schema, but including for completeness)

-- Drop all policies from private_lesson_requests
DROP POLICY IF EXISTS "Students can view their own requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Students can create requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Instructors can manage all requests" ON private_lesson_requests;

-- Drop all policies from studio_inquiries
DROP POLICY IF EXISTS "Anyone can create studio inquiries" ON studio_inquiries;
DROP POLICY IF EXISTS "Instructors can view all inquiries" ON studio_inquiries;

-- Disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE studios DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE private_lesson_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE studio_inquiries DISABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'RLS completely disabled on all tables!' as status;
