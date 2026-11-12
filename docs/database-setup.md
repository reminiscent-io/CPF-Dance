# Database Setup

## New database

1. Create a Supabase project.
2. In the **SQL Editor**, paste all of [`supabase-schema.sql`](../supabase-schema.sql) and run it. It creates every table, function, trigger and policy, the storage buckets and their policies, and the realtime publication entries.
3. Run any migration numbered above 52, in order. The schema file already contains 52 and everything before it.
4. In **Authentication → Providers**, keep **Email** on. The app signs people in with email and password.

## Existing database

Run each new migration in the SQL editor, in order. [migrations/README.md](../migrations/README.md) covers how to write one.

## Checking the schema file

`scripts/schema-check/run.sh` builds `supabase-schema.sql` in a throwaway local Postgres and prints one hash per kind of object. Run `scripts/schema-check/fingerprint.sql` in the Supabase SQL editor. When every row matches, the file matches production. Run the check after each migration so the file can't drift again.
