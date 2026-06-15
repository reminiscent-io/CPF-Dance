-- Migration 42: Virtual lessons (Google Meet)
--
-- Adds support for marking a private lesson as virtual. When a class is virtual,
-- the app auto-creates a Google Calendar event with a Google Meet link on the
-- instructor's Workspace account and stores the link + event id here so it can be
-- surfaced to the dancer (in-app Join button + email) and cleaned up on cancel.
--
-- No RLS changes needed: dancers already read active classes, so they can read
-- google_meet_url on classes they're enrolled in via the existing policies.

ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS google_meet_url TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;
