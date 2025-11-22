-- Add response tracking columns to studio_inquiries table
-- This allows admins to track their outreach across all channels

ALTER TABLE studio_inquiries ADD COLUMN is_responded BOOLEAN DEFAULT false;
ALTER TABLE studio_inquiries ADD COLUMN contact_method TEXT; -- 'email', 'instagram', 'phone', 'in-person'
ALTER TABLE studio_inquiries ADD COLUMN response_notes TEXT;
ALTER TABLE studio_inquiries ADD COLUMN responded_at TIMESTAMPTZ;

-- Create index for filtering by response status
CREATE INDEX idx_studio_inquiries_responded ON studio_inquiries(is_responded);
