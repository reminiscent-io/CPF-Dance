-- Migration: Add asset_id to classes table
-- This allows classes to have promotional images or documents attached
-- NOTE: The assets table already exists from migration 17

-- Add asset_id column to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_classes_asset_id ON public.classes(asset_id);

-- Add comment
COMMENT ON COLUMN public.classes.asset_id IS 'Optional promotional image or document for the class';
