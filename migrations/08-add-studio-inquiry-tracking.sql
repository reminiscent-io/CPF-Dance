-- Add missing columns to studio_inquiries for response tracking
ALTER TABLE studio_inquiries
ADD COLUMN IF NOT EXISTS is_responded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contact_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS response_notes TEXT,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

-- Create index for is_responded filtering
CREATE INDEX IF NOT EXISTS idx_studio_inquiries_is_responded ON studio_inquiries(is_responded);
CREATE INDEX IF NOT EXISTS idx_studio_inquiries_status_responded ON studio_inquiries(status, is_responded);
