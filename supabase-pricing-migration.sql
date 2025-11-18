-- Migration: Add flexible pricing models to classes table
-- Run this in your Supabase SQL Editor

-- Step 1: Create pricing_model enum type
CREATE TYPE pricing_model AS ENUM ('per_person', 'per_class', 'per_hour', 'tiered');

-- Step 2: Add new pricing columns to classes table
ALTER TABLE classes
  ADD COLUMN pricing_model pricing_model DEFAULT 'per_person',
  ADD COLUMN base_cost DECIMAL(10, 2), -- Base cost for the class
  ADD COLUMN cost_per_person DECIMAL(10, 2), -- Cost per person (for per_person model)
  ADD COLUMN cost_per_hour DECIMAL(10, 2), -- Cost per hour (for per_hour model)
  ADD COLUMN tiered_base_students INTEGER, -- Number of students included in base cost (for tiered model)
  ADD COLUMN tiered_additional_cost DECIMAL(10, 2); -- Cost per additional student beyond base (for tiered model)

-- Step 3: Migrate existing data
-- Copy existing price to cost_per_person and set pricing_model to 'per_person'
UPDATE classes
SET
  cost_per_person = price,
  pricing_model = 'per_person'
WHERE price IS NOT NULL;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN classes.pricing_model IS 'Pricing model: per_person, per_class (flat rate), per_hour, or tiered';
COMMENT ON COLUMN classes.base_cost IS 'Base/flat cost for per_class model or base cost for tiered model';
COMMENT ON COLUMN classes.cost_per_person IS 'Cost per person for per_person pricing model';
COMMENT ON COLUMN classes.cost_per_hour IS 'Cost per hour for per_hour pricing model';
COMMENT ON COLUMN classes.tiered_base_students IS 'Number of students included in base cost for tiered pricing';
COMMENT ON COLUMN classes.tiered_additional_cost IS 'Cost per additional student beyond base count for tiered pricing';

-- Note: The old 'price' column is kept for backward compatibility
-- You can optionally drop it after verifying the migration:
-- ALTER TABLE classes DROP COLUMN price;
