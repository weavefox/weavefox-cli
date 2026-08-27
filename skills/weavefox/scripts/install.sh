#!/usr/bin/env bash
#
# Install wf CLI for the current platform.
# Used by the weavefox-mcp skill so agents can bootstrap in one command.
#
set -euo pipefail

if command -v wf &> /dev/null; then
  echo "wf already installed: $(wf --version)"
  exit 0
fi

# Try npm first (works if Node.js is available)
if command -v npm &> /dev/null; then
  npm i -g @weavefox/cli
  echo "Installed via npm: $(wf --version)"
  exit 0
fi

# Fall back to standalone binary
OS=$(uname -s | tr 'A-Z' 'a-z')
ARCH=$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')
URL="https://github.com/weavefox/weavefox-cli/releases/latest/download/wf-${OS}-${ARCH}"

curl -fsSL "$URL" -o /usr/local/bin/wf
chmod +x /usr/local/bin/wf
echo "Installed binary: $(wf --version)"
