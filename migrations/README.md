# Migrations

Numbered SQL files, run by hand in the Supabase SQL editor. Nothing records which files have run.

This folder records history and can't rebuild the database. Migrations 01–04 were deleted after they ran, and production holds objects no file here creates, including the `personal_classes` table and its policies, the waiver-signature and studio-logo storage policies, and a few indexes. Migration 16's enum rewrite never took effect either, so `user_role` still includes `studio` and `studio_admin`.

To build a new database, run [`supabase-schema.sql`](../supabase-schema.sql). It is the production schema after migration 52.

## Adding a migration

1. Run `ls migrations` and take the next number (53). Numbers have collided before; 08, 13, 14, 15 and 38 each have two files.
2. Make it safe to run twice: `IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, `CREATE OR REPLACE FUNCTION`. `SECURITY DEFINER` functions keep `SET search_path = public, pg_temp` (see CLAUDE.md).
3. Run it in the Supabase SQL editor.
4. Make the same change in `supabase-schema.sql` and bump the migration number in its header.
5. Check the file still matches production. Run `scripts/schema-check/run.sh` against a local Postgres and `scripts/schema-check/fingerprint.sql` in the SQL editor; every row should match.
