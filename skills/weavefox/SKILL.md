---
name: weavefox
description: Connect to WeaveFox open capabilities to manage apps and interact with app agents via the wf CLI.
---

# WeaveFox

Use this skill when the user wants to connect to WeaveFox and use its open capabilities.

## Available Capabilities

- Get the current authenticated user profile
- List apps with pagination
- Update an app (name, description, tags, cover image, visibility, custom domain)
- Send a message to an app agent (runs asynchronously, poll for status)
- Get the status and content of an app agent message

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
# Pass all arguments as a JSON object
wf call <toolName> --args '{"key":"value","num":42,"nested":{"obj":true}}' --json

# Parameterless tools — no --args needed
wf call <toolName> --json
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
