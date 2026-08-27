#!/usr/bin/env bash
#
# Cross-platform binary build script.
#
# Uses Bun's --compile + --target to cross-compile standalone binaries
# for multiple platforms. Outputs to bin/ directory as wf-<platform>-<arch>.
#
# Usage:
#   bash scripts/build-bin.sh           # Build all platforms
#   bash scripts/build-bin.sh darwin     # Build macOS only (arm64 + x64)
#
# Prerequisite: Bun installed (https://bun.sh)
#

set -euo pipefail

ENTRY="src/index.ts"
OUT_DIR="bin"
mkdir -p "$OUT_DIR"

# Target platforms: name|bun-target|extension
TARGETS=(
  "darwin-arm64|bun-darwin-arm64|"
  "darwin-x64|bun-darwin-x64|"
  "linux-x64|bun-linux-x64|"
  "linux-arm64|bun-linux-arm64|"
  "windows-x64|bun-windows-x64|.exe"
)

# Optional platform filter
FILTER="${1:-}"

echo "Building standalone binaries with Bun..."
echo ""

for target in "${TARGETS[@]}"; do
  # Parse name|bun-target|extension
  IFS='|' read -r name bun_target ext <<< "$target"

  # Filter logic
  if [[ -n "$FILTER" && "$name" != "$FILTER"* ]]; then
    continue
  fi

  outfile="${OUT_DIR}/wf-${name}${ext}"
  echo "  -> ${name}"
  bun build "$ENTRY" --compile --target="$bun_target" --outfile="$outfile"
done

echo ""
echo "Done. Binaries in ${OUT_DIR}/:"
ls -lh "${OUT_DIR}"/wf-* 2>/dev/null || echo "  (no binaries found)"

# Generate SHA256 checksums for download verification
echo ""
echo "Generating SHA256 checksums..."
cd "${OUT_DIR}"
if command -v sha256sum &> /dev/null; then
  sha256sum wf-* > checksums-sha256.txt
elif command -v shasum &> /dev/null; then
  shasum -a 256 wf-* > checksums-sha256.txt
else
  echo "Warning: no sha256 tool found, skipping checksums"
fi
cd ..
if [[ -f "${OUT_DIR}/checksums-sha256.txt" ]]; then
  echo "Checksums saved to ${OUT_DIR}/checksums-sha256.txt"
fi
