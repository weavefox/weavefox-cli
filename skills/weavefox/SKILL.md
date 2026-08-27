---
name: weavefox
description: Connect to WeaveFox platform to manage apps, and call server-side open capabilities via the wf CLI.
---

# WeaveFox

Use this skill when the user wants to interact with WeaveFox platform — manage apps, update app settings, send messages to app agents, or query user profile.

## Install

```bash
# One command (auto-detects npm or binary fallback)
bash skills/weavefox/scripts/install.sh

# Or manually:
npm i -g @weavefox/cli
# or download binary from https://github.com/weavefox/weavefox-cli/releases
```

## Authenticate

```bash
wf login --key <WEAVEFOX_API_KEY>

# or env var (no file write, ideal for CI/CD)
export WEAVEFOX_API_KEY=<key>
```

## Discover Available Capabilities

```bash
wf tools --json
```

Returns all server-side tools with their names, descriptions, and parameter schemas. Use this to match user intent to the right tool.

## Call a Tool

```bash
# Scalar arguments (auto-inferred: string, number, boolean, null)
wf call <toolName> --kv key1=value1 key2=value2 --json

# JSON arguments (httpie-style key:=value)
wf call <toolName> --kv key:='{"nested":"object"}' --json
```

## Parse Output

All `--json` output is valid JSON. Errors are also JSON:

```json
{"error": true, "code": "connection_failed", "message": "..."}
```

If output contains `"error": true`, show the error to the user and stop.

## Workflow

1. Check if `wf` is installed: `which wf`
2. If not installed, run the install step above
3. Check if authenticated: `wf config` (look for "Logged in: Yes")
4. If not authenticated, ask user for API Key and run `wf login --key <key>`
5. List tools: `wf tools --json`
6. Select the appropriate tool based on user intent
7. Call the tool with the right arguments
8. Parse JSON output and present results to user
