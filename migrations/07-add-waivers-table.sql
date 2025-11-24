-- Create waivers table for tracking waiver documents
CREATE TABLE waivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Waiver content and metadata
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  waiver_type VARCHAR(50) NOT NULL DEFAULT 'general', -- 'general', 'private_lesson', 'class'
  
  -- Issuer information
  issued_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issued_by_role VARCHAR(50) NOT NULL, -- 'instructor', 'studio', 'admin'
  
  -- Recipients can be dancer or studio
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_type VARCHAR(50) NOT NULL, -- 'dancer', 'studio'
  
  -- Related entities
  private_lesson_id UUID REFERENCES private_lesson_requests(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  
  -- Signature data
  signature_image_url TEXT, -- URL to signed signature image
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'signed', 'acknowledged', 'declined', 'expired'
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  declined_reason TEXT,
  declined_at TIMESTAMP WITH TIME ZONE
);

-- Create waiver signature table for tracking signature events
CREATE TABLE waiver_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  waiver_id UUID NOT NULL REFERENCES waivers(id) ON DELETE CASCADE,
  
  -- Signer information
  signed_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  
  -- Signature data
  signature_image_url TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_waivers_issued_by ON waivers(issued_by_id);
CREATE INDEX idx_waivers_recipient ON waivers(recipient_id);
CREATE INDEX idx_waivers_status ON waivers(status);
CREATE INDEX idx_waivers_private_lesson ON waivers(private_lesson_id);
CREATE INDEX idx_waivers_created_at ON waivers(created_at DESC);
CREATE INDEX idx_waiver_signatures_waiver ON waiver_signatures(waiver_id);

-- RLS Policies
ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_signatures ENABLE ROW LEVEL SECURITY;

-- Waivers: Users can view waivers they issued or received
CREATE POLICY "Users can view waivers they issued or received"
  ON waivers
  FOR SELECT
  USING (
    auth.uid() = issued_by_id 
    OR auth.uid() = recipient_id
    OR auth.uid() = signed_by_id
  );

-- Waivers: Users can create waivers (for issuing)
CREATE POLICY "Users can create waivers"
  ON waivers
  FOR INSERT
  WITH CHECK (
    auth.uid() = issued_by_id
  );

-- Waivers: Users can update waivers they issued or are signing
CREATE POLICY "Users can update waivers"
  ON waivers
  FOR UPDATE
  USING (
    auth.uid() = issued_by_id 
    OR auth.uid() = recipient_id
  )
  WITH CHECK (
    auth.uid() = issued_by_id 
    OR auth.uid() = recipient_id
  );

-- Waiver signatures: Users can view signatures for waivers they have access to
CREATE POLICY "Users can view waiver signatures"
  ON waiver_signatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM waivers
      WHERE waivers.id = waiver_signatures.waiver_id
      AND (
        auth.uid() = waivers.issued_by_id 
        OR auth.uid() = waivers.recipient_id
        OR auth.uid() = waivers.signed_by_id
      )
    )
  );

-- Waiver signatures: Users can create signatures for waivers they received
CREATE POLICY "Users can create waiver signatures"
  ON waiver_signatures
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waivers
      WHERE waivers.id = waiver_id
      AND auth.uid() = waivers.recipient_id
    )
    AND auth.uid() = signed_by_id
  );
