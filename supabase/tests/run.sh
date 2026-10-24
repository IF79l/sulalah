#!/usr/bin/env bash
# Runs the policy tests on a throwaway database in the Postgres that DATABASE_URL points at
# (a plain Postgres 15+ is enough). Usage: DATABASE_URL=postgres://... supabase/tests/run.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
url="${DATABASE_URL:?set DATABASE_URL to a Postgres you may create databases on}"

# Each test file gets its own fresh database, so files never lean on one another.
for t in "$here"/*.sql; do
  [ "$(basename "$t")" = supabase-stub.sql ] && continue
  db="sulalah_test_$$_$(basename "$t" .sql)"
  psql "$url" -qc "create database $db" >/dev/null
  target="${url%/*}/$db"
  psql "$target" -q -v ON_ERROR_STOP=1 -f "$here/supabase-stub.sql"
  for f in "$here"/../migrations/*.sql; do
    psql "$target" -q -v ON_ERROR_STOP=1 -f "$f"
  done
  ok=1
  out="$(psql "$target" -q -v ON_ERROR_STOP=1 -f "$t" 2>&1 >/dev/null)" || ok=0
  psql "$url" -qc "drop database if exists $db with (force)" >/dev/null
  if [ $ok = 0 ]; then echo "$out"; exit 1; fi
  echo "$out" | sed -n "s/.*NOTICE:  //p"
done
echo "all policy tests passed"
