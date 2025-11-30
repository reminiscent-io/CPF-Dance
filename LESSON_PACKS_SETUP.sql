-- Run this SQL in your Supabase SQL Editor to set up the lesson pack system

-- Lesson packs table
CREATE TABLE lesson_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  lesson_count INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lesson pack purchases table
CREATE TABLE lesson_pack_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_pack_id UUID NOT NULL REFERENCES lesson_packs(id) ON DELETE RESTRICT,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  stripe_checkout_session_id TEXT,
  remaining_lessons INTEGER NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lesson pack usage tracking table
CREATE TABLE lesson_pack_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_pack_purchase_id UUID NOT NULL REFERENCES lesson_pack_purchases(id) ON DELETE CASCADE,
  private_lesson_request_id UUID REFERENCES private_lesson_requests(id) ON DELETE SET NULL,
  lessons_used INTEGER NOT NULL DEFAULT 1,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_lesson_pack_purchases_student ON lesson_pack_purchases(student_id);
CREATE INDEX idx_lesson_pack_usage_purchase ON lesson_pack_usage(lesson_pack_purchase_id);

-- Enable RLS
ALTER TABLE lesson_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_pack_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_pack_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lesson packs
CREATE POLICY "Everyone can view active lesson packs"
  ON lesson_packs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage lesson packs"
  ON lesson_packs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for lesson pack purchases
CREATE POLICY "Students can view their own purchases"
  ON lesson_pack_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = lesson_pack_purchases.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Students can create purchases"
  ON lesson_pack_purchases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = lesson_pack_purchases.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Students can update their purchases"
  ON lesson_pack_purchases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = lesson_pack_purchases.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Instructors can view all purchases"
  ON lesson_pack_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

-- RLS Policies for lesson pack usage
CREATE POLICY "Students can view their usage"
  ON lesson_pack_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lesson_pack_purchases
      WHERE lesson_pack_purchases.id = lesson_pack_usage.lesson_pack_purchase_id
      AND EXISTS (
        SELECT 1 FROM students
        WHERE students.id = lesson_pack_purchases.student_id
        AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
      )
    )
  );

CREATE POLICY "Students can create usage records"
  ON lesson_pack_usage FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lesson_pack_purchases
      WHERE lesson_pack_purchases.id = lesson_pack_usage.lesson_pack_purchase_id
      AND EXISTS (
        SELECT 1 FROM students
        WHERE students.id = lesson_pack_purchases.student_id
        AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
      )
    )
  );

CREATE POLICY "Instructors can manage usage"
  ON lesson_pack_usage FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_lesson_packs_updated_at BEFORE UPDATE ON lesson_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_pack_purchases_updated_at BEFORE UPDATE ON lesson_pack_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial lesson packs
INSERT INTO lesson_packs (name, lesson_count, price, is_active) VALUES 
  ('1 Lesson', 1, 125.00, true),
  ('2 Lesson Pack', 2, 240.00, true),
  ('5 Lesson Pack', 5, 550.00, true),
  ('10 Lesson Pack', 10, 1000.00, true)
ON CONFLICT DO NOTHING;
