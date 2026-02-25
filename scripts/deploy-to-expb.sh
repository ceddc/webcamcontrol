#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
EXTENSIONS_DIR="${SOURCE_DIR}/../expb119/client/your-extensions"
TARGET_DIR="${EXTENSIONS_DIR}/webcamcontrol"

if [ ! -d "${EXTENSIONS_DIR}" ]; then
  echo "Extensions directory not found: ${EXTENSIONS_DIR}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"

rsync -a --delete \
  --exclude '.git/' \
  --exclude 'dist/' \
  --exclude 'node_modules/' \
  --exclude '.DS_Store' \
  "${SOURCE_DIR}/" "${TARGET_DIR}/"

ln -sfn "../webcamcontrol" "${EXTENSIONS_DIR}/widgets/webcamcontrol"

echo "Deployed webcamcontrol to: ${TARGET_DIR}"
