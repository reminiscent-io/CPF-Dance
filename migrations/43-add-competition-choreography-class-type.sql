-- Migration 43: Competition Choreography class type
--
-- Adds 'competition_choreography' to the class_type enum so instructors can
-- schedule competition choreography sessions as a first-class class type
-- (alongside group, private, workshop, and master_class).
--
-- No RLS or table changes needed — this only extends the enum.
-- Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in
-- older Postgres versions; run this statement on its own in the SQL editor.

ALTER TYPE class_type ADD VALUE IF NOT EXISTS 'competition_choreography';
