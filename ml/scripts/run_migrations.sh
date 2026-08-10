#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ML_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${ML_ROOT}/.." && pwd)"
MIGRATIONS_DIR="${PROJECT_ROOT}/database/migrations"

if [ -f "${ML_ROOT}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${ML_ROOT}/.env"
    set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "DATABASE_URL is not set. Fill it in ml/.env first."
    exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
    echo "psql is not installed. Install the postgresql-client package and re-run."
    exit 1
fi

for migration_file in $(find "${MIGRATIONS_DIR}" -name '*.sql' | sort); do
    echo "==> Applying $(basename "${migration_file}")"
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${migration_file}"
done

echo "All migrations applied."
