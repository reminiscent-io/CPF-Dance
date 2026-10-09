#!/usr/bin/env bash
# Applies migrations 46 and 47 (twice, to prove they re-run) to a throwaway
# local Postgres with minimal Supabase stand-ins, then runs RLS checks as a
# linked login, another instructor, a dancer and anon.
#
# Usage: PGHOST=/path/to/socket PGPORT=5433 PGUSER=postgres scripts/promo-studio-rls/run.sh
# Needs a Postgres 16 server you can create databases on. It drops and
# recreates a database named promo_rls_check.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
db=promo_rls_check
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $db;" -c "create database $db;"
psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$here/00-supabase-stubs.sql"
for pass in 1 2; do
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$root/migrations/46-promo-studio-foundation.sql" 2>/dev/null
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$root/migrations/47-promo-studio-designs.sql" 2>/dev/null
done
echo "migrations applied twice"
psql -d "$db" -f "$here/10-rls-checks.sql"
