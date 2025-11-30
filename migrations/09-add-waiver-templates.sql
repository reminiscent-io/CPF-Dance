-- Create waiver_templates table for reusable waiver templates
CREATE TABLE waiver_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Template metadata
  title TEXT NOT NULL,
  description TEXT,

  -- Template content - either rich text or PDF
  content_type VARCHAR(20) NOT NULL DEFAULT 'rich_text', -- 'rich_text' or 'pdf'
  content TEXT, -- Rich text HTML content (for rich_text type)
  pdf_url TEXT, -- URL to PDF file in storage (for pdf type)
  pdf_filename TEXT, -- Original PDF filename

  -- Template variables support
  -- Templates can include: {{issue_date}}, {{signature_date}}, {{recipient_name}}, {{issuer_name}}

  -- Ownership and permissions
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_shared BOOLEAN DEFAULT false, -- Whether template is shared with other instructors/admins

  -- Categorization
  waiver_type VARCHAR(50) NOT NULL DEFAULT 'general', -- 'general', 'private_lesson', 'class', 'liability', 'medical'

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add template_id to waivers table to track which template was used
ALTER TABLE waivers ADD COLUMN template_id UUID REFERENCES waiver_templates(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_waiver_templates_created_by ON waiver_templates(created_by_id);
CREATE INDEX idx_waiver_templates_type ON waiver_templates(waiver_type);
CREATE INDEX idx_waiver_templates_active ON waiver_templates(is_active);
CREATE INDEX idx_waivers_template ON waivers(template_id);

-- RLS Policies for waiver_templates
ALTER TABLE waiver_templates ENABLE ROW LEVEL SECURITY;

-- Users can view templates they created or that are shared
CREATE POLICY "Users can view their templates or shared templates"
  ON waiver_templates
  FOR SELECT
  USING (
    auth.uid() = created_by_id
    OR is_shared = true
  );

-- Only instructors and admins can create templates
CREATE POLICY "Instructors and admins can create templates"
  ON waiver_templates
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('instructor', 'admin')
    )
  );

-- Users can update their own templates
CREATE POLICY "Users can update their own templates"
  ON waiver_templates
  FOR UPDATE
  USING (auth.uid() = created_by_id)
  WITH CHECK (auth.uid() = created_by_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
  ON waiver_templates
  FOR DELETE
  USING (auth.uid() = created_by_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_waiver_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_waiver_templates_updated_at
  BEFORE UPDATE ON waiver_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_waiver_templates_updated_at();
