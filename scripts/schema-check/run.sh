#!/usr/bin/env bash
# Builds supabase-schema.sql, plus any migration files passed as arguments, in
# a throwaway database and prints its fingerprint. Compare the output with
# fingerprint.sql run in the Supabase SQL editor.
#
# Usage: PGHOST=/path/to/socket PGPORT=5433 PGUSER=postgres scripts/schema-check/run.sh [migrations/53-*.sql]
# Needs a Postgres 16+ server you can create databases on. It drops and
# recreates a database named schema_check.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
db=schema_check
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $db;" -c "create database $db;"
psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$here/supabase-stubs.sql"
for f in "$root/supabase-schema.sql" "$@"; do
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$f"
done
psql -X -q -At -F ' ' -d "$db" -f "$here/fingerprint.sql"
