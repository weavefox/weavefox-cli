# @weavefox/cli

[![npm version](https://img.shields.io/npm/v/@weavefox/cli)](https://www.npmjs.com/package/@weavefox/cli)
[![npm downloads](https://img.shields.io/npm/dm/@weavefox/cli)](https://www.npmjs.com/package/@weavefox/cli)
[![CI](https://img.shields.io/github/actions/workflow/status/weavefox/weavefox-cli/ci.yml?branch=main)](https://github.com/weavefox/weavefox-cli/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/weavefox/weavefox-cli/release.yml)](https://github.com/weavefox/weavefox-cli/actions/workflows/release.yml)
[![License](https://img.shields.io/npm/l/@weavefox/cli)](https://github.com/weavefox/weavefox-cli/blob/main/LICENSE)
[![Skills.sh](https://img.shields.io/badge/skills.sh-compatible-blue)](https://www.skills.sh)

A CLI tool for calling WeaveFox server-side open capabilities via the MCP protocol. Built for developers and AI agents.

[中文文档](./README.zh-CN.md)

## Install

### npm

```bash
# Install globally
npm i -g @weavefox/cli
wf tools
```

### Standalone binary (no Node.js required)

Download from [GitHub Release](https://github.com/weavefox/weavefox-cli/releases) for your platform:

```bash
# macOS (Apple Silicon)
curl -fsSL https://github.com/weavefox/weavefox-cli/releases/latest/download/wf-darwin-arm64 -o /usr/local/bin/wf

# macOS (Intel)
curl -fsSL https://github.com/weavefox/weavefox-cli/releases/latest/download/wf-darwin-x64 -o /usr/local/bin/wf

# Linux (x64)
curl -fsSL https://github.com/weavefox/weavefox-cli/releases/latest/download/wf-linux-x64 -o /usr/local/bin/wf

# Linux (ARM64)
curl -fsSL https://github.com/weavefox/weavefox-cli/releases/latest/download/wf-linux-arm64 -o /usr/local/bin/wf

chmod +x /usr/local/bin/wf
wf tools
```

Windows: download `wf-windows-x64.exe` from [Releases](https://github.com/weavefox/weavefox-cli/releases).

### AI Agent Skill

Install via [skill](skills/weavefox/SKILL.md) with any skills-compatible agent:

```bash
npx skills add https://github.com/weavefox/weavefox-cli --skill weavefox
```

See [skills/weavefox/SKILL.md](skills/weavefox/SKILL.md) for details.

## Quick Start

```bash
# 1. Login
wf login --key <YOUR_API_KEY>

# 2. List available tools
wf tools

# 3. Call a tool
wf call <toolName> --args '{"page":1,"pageSize":10}' --json
```

## Commands

| Command | Description |
| --------- | ------------- |
| `wf login --key <key>` | Save API Key |
| `wf logout` | Clear credentials |
| `wf logout --purge` | Remove config directory (use before uninstalling) |
| `wf tools` | List all MCP tools and schemas |
| `wf call <toolName>` | Call a specific tool |
| `wf config` | View / modify configuration |

### Global options

| Option | Description |
| -------- | ------------- |
| `--json` | Output as pure JSON (errors are also JSON, not human text) |
| `--url <url>` | Override MCP Server URL for this invocation |
| `--auth-header <header>` | Override auth header name for this invocation |

### wf call arguments

```bash
# Pass all arguments as a JSON object
wf call <toolName> --args '{"page":1,"pageSize":10,"filter":{"tag":"tool"}}' --json

# Parameterless tools — no --args needed
wf call <toolName> --json

# Invalid JSON or non-object values fail explicitly
wf call <toolName> --args 'not json' --json
# Error: --args expects valid JSON, got: "not json"
wf call <toolName> --args '[1,2,3]' --json
# Error: --args expects a JSON object, got: "[1,2,3]"
```

## Configuration

Config file: `~/.weavefox/config.json`

The CLI connects to any MCP server endpoint using Streamable HTTP transport. Auth defaults to `Authorization: Bearer <key>` — for MCP servers that use a custom header, configure it:

```bash
# View current config
wf config

# Set a custom MCP server URL
wf config --set-url https://your-server.com/mcp

# Switch auth header (default "Authorization" sends as "Bearer <key>");
# a custom header sends the key as-is
wf config --set-auth-header "X-API-Key"
```

Environment variables (override config file, ideal for CI/CD):

```bash
export WEAVEFOX_API_KEY=your_api_key
export WEAVEFOX_MCP_URL=https://your-server.com/mcp
export WEAVEFOX_AUTH_HEADER=X-API-Key
```

## Uninstall

Remove credentials and config before uninstalling the CLI:

```bash
wf logout --purge
# This removes ~/.weavefox/ directory entirely

# Then remove the CLI itself
npm uninstall -g @weavefox/cli   # npm
# or delete the downloaded binary  # standalone
```
