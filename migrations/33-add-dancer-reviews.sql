-- Migration: Add dancer reviews table
-- Allows dancers to leave reviews for their instructors

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(student_id, instructor_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Dancers can view their own reviews
CREATE POLICY "Dancers can view own reviews"
  ON public.reviews
  FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.profile_id = auth.uid()
    )
    OR instructor_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

-- Dancers can insert reviews for their instructors
CREATE POLICY "Dancers can insert own reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.profile_id = auth.uid()
    )
  );

-- Dancers can update their own reviews
CREATE POLICY "Dancers can update own reviews"
  ON public.reviews
  FOR UPDATE
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.profile_id = auth.uid()
    )
  );

-- Dancers can delete their own reviews
CREATE POLICY "Dancers can delete own reviews"
  ON public.reviews
  FOR DELETE
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.profile_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
