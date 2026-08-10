#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${SERVICE_ROOT}"

if [ ! -f ".env" ]; then
    echo "No .env found. Copying .env.example -> .env"
    cp .env.example .env
fi

echo "==> Creating virtual environment"
python3 -m venv .venv
source .venv/bin/activate

echo "==> Upgrading pip"
pip install --upgrade pip -q

echo "==> Installing dependencies"
pip install -q -r requirements.txt

echo "==> Running test suite"
python -m pytest -v

if [ ! -f "app/model/malaria_risk_xgb.joblib" ]; then
    echo ""
    echo "No trained model found at app/model/malaria_risk_xgb.joblib."
    echo "Copy the model produced by 'python -m aquawatch.cli train' (Day 1) into that path before starting the server."
else
    echo ""
    echo "Day 2 ml-service ready."
    echo "Start it with: uvicorn app.main:app --reload --port 8000"
fi
