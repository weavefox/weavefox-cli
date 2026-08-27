# Agents

## Overview

`@weavefox/cli` is a generic MCP client CLI. Connects to any MCP server over Streamable HTTP, supports Bearer/custom-header auth or no auth. Dual-channel distribution (npm + standalone binary).

## Tech Stack

- Language: TypeScript (ESM)
- CLI framework: cac
- MCP transport: `@modelcontextprotocol/sdk` — StreamableHTTPClientTransport (not SSE)
- Terminal colors: picocolors
- npm build: tsup
- Binary build: bun build --compile (cross-compile 5 platforms)
- Dev runner: tsx (no compilation needed)

## Directory Structure

```plain
weavefox-cli/
├── src/
│   ├── index.ts        # CLI entry, subcommand definitions + helpers
│   ├── config.ts       # Config: ~/.weavefox/config.json + env vars
│   ├── mcp-client.ts   # MCP client (StreamableHTTP + configurable auth + errors)
│   └── format.ts       # Output: JSON mode / human mode
├── scripts/
│   └── build-bin.sh    # Bun cross-compile (5 platforms + SHA256)
├── .github/workflows/
│   ├── ci.yml          # CI: type check + build + binary smoke test
│   └── release.yml     # Release: NPM OIDC + GitHub Release
├── tsup.config.ts
├── tsconfig.json
└── package.json
```

## Commands

```bash
pnpm dev          # tsx runs TS directly
pnpm lint         # tsc --noEmit
pnpm build        # tsup -> dist/index.js
pnpm build:bin    # Bun binary (current platform)
pnpm build:bin:all # Bash script: cross-compile 5 platforms
pnpm clean        # rm -rf dist bin
```

## CLI Subcommands

| Command | Description |
| --------- | ------------- |
| `login --key <key>` | Persist API Key |
| `logout [--purge]` | Clear credentials / remove config dir |
| `tools` | List MCP tools + schemas |
| `call <toolName> [--kv ...]` | Invoke a tool (`key=value` scalars, `key:=value` JSON) |
| `config [--set-url ...] [--set-auth-header ...]` | View / modify configuration |

## Key Design

### Transport: StreamableHTTP

Server uses `WebStandardStreamableHTTPServerTransport`. Client matches with `StreamableHTTPClientTransport`.

### Auth: Configurable

- Default: `Authorization: Bearer <key>`
- Custom: `wf config --set-auth-header "X-API-Key"` → key sent as-is
- No key: no auth header sent at all (public MCPs work out of the box)
- Env: `WEAVEFOX_API_KEY`, `WEAVEFOX_MCP_URL`, `WEAVEFOX_AUTH_HEADER`

### Config Priority

```
Env vars > Config file > Defaults
```

`--url` and `--json` are per-invocation overrides, don't write to file.

### --kv Syntax (httpie-style)

- `key=value` — scalar, auto-infer string/number/boolean/null
- `key:=value` — JSON, `JSON.parse` failure is an explicit error (no silent fallback)

### Dual-Channel Distribution

| Channel | Output | Target |
|---------|--------|--------|
| npm (`pnpm build`) | `dist/index.js` 9.4KB | Node developers, npx |
| Binary (`pnpm build:bin:all`) | 5 platform standalone binaries | No Node.js environment |

### CI/CD: OIDC Trusted Publishing

- NPM publish via OIDC, zero long-lived secrets, `--provenance` SLSA attestation
- Binary cross-compile via Bun, uploaded to GitHub Release with SHA256 checksums
- `concurrency` control prevents parallel release races
- `build-binaries` job depends on `publish-npm` success (version consistency)

## Coding Conventions

- ESM imports must include `.js` suffix: `import { getConfig } from './config.js'`
- Keep imports in sync with code changes (lint removes unused imports)
- SDK return types: `Awaited<ReturnType<...>>` inference, not direct Schema types
- Errors: `WeaveFoxCliError` with `code` field; no `process.exit()` except login
- Comments: only document WHY, never restate WHAT (function names already do that)
- `withClient()` closure manages MCP client lifecycle (create -> fn -> close)
