-- Migration: Add show_name column to reviews
-- Allows dancers to opt-in to displaying their first name and last initial on reviews

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS show_name BOOLEAN DEFAULT false NOT NULL;
