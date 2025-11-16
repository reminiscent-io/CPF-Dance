-- Fix infinite recursion in RLS policies by using JWT metadata instead of querying profiles table

-- Drop the problematic policies
DROP POLICY IF EXISTS "Instructors can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Instructors can view all students" ON students;
DROP POLICY IF EXISTS "Instructors can manage students" ON students;
DROP POLICY IF EXISTS "Instructors can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can manage enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can manage all notes" ON notes;
DROP POLICY IF EXISTS "Instructors can manage all payments" ON payments;
DROP POLICY IF EXISTS "Instructors can manage all requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Instructors can view all inquiries" ON studio_inquiries;

-- Recreate policies using JWT metadata to avoid recursion
CREATE POLICY "Instructors can view all profiles"
  ON profiles FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

CREATE POLICY "Instructors can view all students"
  ON students FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

CREATE POLICY "Instructors can manage students"
  ON students FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

CREATE POLICY "Instructors can view all enrollments"
  ON enrollments FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

CREATE POLICY "Instructors can manage enrollments"
  ON enrollments FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

CREATE POLICY "Instructors can manage all notes"
  ON notes FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor'
    OR author_id = auth.uid()
  );

CREATE POLICY "Instructors can manage all payments"
  ON payments FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

CREATE POLICY "Instructors can manage all requests"
  ON private_lesson_requests FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

CREATE POLICY "Instructors can view all inquiries"
  ON studio_inquiries FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');
