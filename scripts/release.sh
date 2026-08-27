#!/usr/bin/env bash
#
# Bump version, commit, tag, and push.
# This triggers the GitHub Actions release pipeline (NPM OIDC + binary + GitHub Release).
#
# Usage:
#   bash scripts/release.sh patch    # 0.0.1 -> 0.0.2
#   bash scripts/release.sh minor    # 0.0.1 -> 0.1.0
#   bash scripts/release.sh major    # 0.0.1 -> 1.0.0
#   bash scripts/release.sh 1.2.3    # explicit version
#
set -euo pipefail

BUMP="${1:-patch}"
PKG_FILE="package.json"

# Read current version
CURRENT=$(node -p "require('./$PKG_FILE').version")

# Calculate next version
if [[ "$BUMP" == "patch" || "$BUMP" == "minor" || "$BUMP" == "major" ]]; then
  NEXT=$(node -e "
    const semver = require('./$PKG_FILE').version.split('.');
    const map = { patch: 2, minor: 1, major: 0 };
    const idx = map['$BUMP'];
    semver[idx] = (parseInt(semver[idx]) + 1).toString();
    for (let i = idx + 1; i < 3; i++) semver[i] = '0';
    console.log(semver.join('.'));
  ")
else
  NEXT="$BUMP"
fi

echo "Releasing: $CURRENT -> $NEXT"

# Validate format
if ! [[ "$NEXT" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid version: $NEXT"
  exit 1
fi

# Update package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('$PKG_FILE', 'utf-8'));
  pkg.version = '$NEXT';
  fs.writeFileSync('$PKG_FILE', JSON.stringify(pkg, null, 2) + '\n');
"

# Commit + tag + push
git add "$PKG_FILE"
git commit -m "chore: release v$NEXT"
git tag "v$NEXT"
git push origin main
git push origin "v$NEXT"

echo ""
echo "Done. v$NEXT pushed. GitHub Actions release pipeline will start automatically."
echo "Check: https://github.com/weavefox/weavefox-cli/actions/workflows/release.yml"
