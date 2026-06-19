#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dry_run=0

export DATABASE_URL="${DATABASE_URL:-postgresql://ci:ci@localhost:5432/ci}"
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"

usage() {
  cat <<'USAGE'
Usage: scripts/ci-local.sh [--dry-run]

Runs the repository's local CI checks.
USAGE
}

if [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ "${1:-}" = "--dry-run" ]; then
  dry_run=1
  shift
fi

if [ "$#" -ne 0 ]; then
  usage >&2
  exit 2
fi

run() {
  local display="$1"
  shift

  printf '+ %s\n' "$display"

  if [ "$dry_run" -eq 1 ]; then
    return 0
  fi

  "$@"
}

run "node --test scripts/ci-local.test.js scripts/github-ci.test.js" node --test "$repo_root/scripts/ci-local.test.js" "$repo_root/scripts/github-ci.test.js"
run "npm --prefix unt-grade-distribution test" npm --prefix "$repo_root/unt-grade-distribution" test
run "npm --prefix unt-grade-distribution run build" npm --prefix "$repo_root/unt-grade-distribution" run build
run "npm --prefix extension run build" npm --prefix "$repo_root/extension" run build
