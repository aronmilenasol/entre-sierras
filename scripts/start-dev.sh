#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${ROOT_DIR}/.venv/bin/python"
PIP="${ROOT_DIR}/.venv/bin/pip"

if [ ! -x "$PYTHON" ]; then
    echo "Creating Python environment..."
    python3 -m venv "${ROOT_DIR}/.venv"
fi

if ! "$PYTHON" -c "import fastapi, uvicorn" >/dev/null 2>&1; then
    echo "Installing Python dependencies..."
    "$PIP" install -r "${ROOT_DIR}/requirements.txt"
fi

if [ ! -x "${ROOT_DIR}/frontend/node_modules/.bin/vite" ]; then
    echo "Installing frontend dependencies..."
    npm install --prefix "${ROOT_DIR}/frontend"
fi

if [ ! -x "${ROOT_DIR}/node_modules/.bin/concurrently" ]; then
    echo "Installing root dependencies..."
    npm install --prefix "$ROOT_DIR"
fi

echo "Starting backend and frontend..."
"${ROOT_DIR}/node_modules/.bin/concurrently" \
    "npm --prefix '${ROOT_DIR}/frontend' run dev" \
    "cd '${ROOT_DIR}' && '${PYTHON}' -m uvicorn src.entre_sierras.main:app --reload --port 8001"
