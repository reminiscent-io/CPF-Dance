-- Migration: Add Instructor Access Requests Table
-- Description: Create a table to store instructor signup requests for manual approval

-- Create status enum for request status
DO $$ BEGIN
  CREATE TYPE instructor_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the instructor_access_requests table
CREATE TABLE IF NOT EXISTS public.instructor_access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status instructor_request_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint on email to prevent duplicate requests
CREATE UNIQUE INDEX IF NOT EXISTS instructor_access_requests_email_idx
  ON public.instructor_access_requests(email);

-- Enable RLS
ALTER TABLE public.instructor_access_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (submit a request)
CREATE POLICY "Anyone can submit instructor access request"
  ON public.instructor_access_requests
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can view requests
CREATE POLICY "Admins can view instructor access requests"
  ON public.instructor_access_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update requests (approve/reject)
CREATE POLICY "Admins can update instructor access requests"
  ON public.instructor_access_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete requests
CREATE POLICY "Admins can delete instructor access requests"
  ON public.instructor_access_requests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_instructor_access_requests_updated_at
  BEFORE UPDATE ON public.instructor_access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.instructor_access_requests IS 'Stores instructor signup requests pending manual approval';
