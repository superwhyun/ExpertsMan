#!/usr/bin/env bash
set -euo pipefail

# One-shot sync:
# 1) Export remote D1 to SQL
# 2) Delete local D1 state
# 3) Import SQL into local D1
#
# Usage:
#   ./scripts/sync-d1-from-remote.sh
#   DB_NAME=expertsman-db ./scripts/sync-d1-from-remote.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${BACKEND_DIR}"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required but not found."
  exit 1
fi

DB_NAME="${DB_NAME:-$(awk -F'=' '/^[[:space:]]*database_name[[:space:]]*=/{gsub(/[[:space:]"]/, "", $2); print $2; exit}' wrangler.toml)}"
if [[ -z "${DB_NAME}" ]]; then
  echo "Failed to detect D1 database_name from wrangler.toml. Set DB_NAME and retry."
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TMP_DIR="${BACKEND_DIR}/tmp"
SQL_FILE="${TMP_DIR}/prod-${TIMESTAMP}.sql"

mkdir -p "${TMP_DIR}"

echo "[1/4] Exporting remote D1 (${DB_NAME}) -> ${SQL_FILE}"
npx wrangler d1 export "${DB_NAME}" --remote --output "${SQL_FILE}"

echo "[2/4] Removing local D1 state (.wrangler/state/v3/d1)"
rm -rf "${BACKEND_DIR}/.wrangler/state/v3/d1"

echo "[3/4] Importing SQL into local D1 (${DB_NAME})"
npx wrangler d1 execute "${DB_NAME}" --local --file "${SQL_FILE}"

echo "[4/4] Quick verification"
npx wrangler d1 execute "${DB_NAME}" --local --command "SELECT COUNT(*) AS workspaces FROM workspaces;"
npx wrangler d1 execute "${DB_NAME}" --local --command "SELECT COUNT(*) AS experts FROM experts;"

echo
echo "Done. Local D1 is now synced from remote."
echo "SQL snapshot: ${SQL_FILE}"
