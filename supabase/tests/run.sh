#!/usr/bin/env bash
# Runs every test file here on its own throwaway database in the Postgres that DATABASE_URL
# points at (a plain Postgres 15+ is enough). Usage: DATABASE_URL=postgres://... supabase/tests/run.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
url="${DATABASE_URL:?set DATABASE_URL to a Postgres you may create databases on}"

trap '[ -n "${db:-}" ] && psql "$url" -qc "drop database if exists $db with (force)" >/dev/null' EXIT
for test in "$here"/*.sql; do
  [ "$(basename "$test")" = supabase-stub.sql ] && continue
  db="sulalah_test_$$_$(basename "$test" .sql)"
  psql "$url" -qc "create database $db" >/dev/null
  target="${url%/*}/$db"
  psql "$target" -q -v ON_ERROR_STOP=1 -f "$here/supabase-stub.sql"
  for f in "$here"/../migrations/*.sql; do
    psql "$target" -q -v ON_ERROR_STOP=1 -f "$f"
  done
  echo "# $(basename "$test")"
  if ! out="$(psql "$target" -q -v ON_ERROR_STOP=1 -f "$test" 2>&1 >/dev/null)"; then echo "$out"; exit 1; fi
  echo "$out" | sed -n "s/.*NOTICE:  //p"
  psql "$url" -qc "drop database $db with (force)" >/dev/null
  db=
done
echo "all policy tests passed"
