#!/usr/bin/env bash
#
# Create release tag from the current commit on main.
# Run this AFTER the version change has been merged to main via PR.
#
# Prerequisites:
#   1. Version in package.json was bumped and merged to main via PR
#   2. You are on the main branch, up to date with origin
#
# Usage:
#   bash scripts/release.sh           # tag current version from package.json
#   bash scripts/release.sh 0.0.2     # explicit version
#
set -euo pipefail

PKG_FILE="package.json"

# Verify we're on main
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "Error: must be on main (currently on '$BRANCH')"
  echo "Run: git checkout main && git pull"
  exit 1
fi

# Determine version
VERSION="${1:-$(node -p "require('./$PKG_FILE').version")}"
TAG="v${VERSION}"

# Validate format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid version: $VERSION"
  exit 1
fi

# Check tag doesn't already exist
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: tag $TAG already exists"
  exit 1
fi

echo "Creating tag $TAG for version $VERSION..."

git tag "$TAG"
git push origin "$TAG"

echo ""
echo "Done. $TAG pushed. Release pipeline will start automatically."
echo "Check: https://github.com/weavefox/weavefox-cli/actions/workflows/release.yml"
