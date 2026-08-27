# Agents

## Overview

`@weavefox/cli` is a generic MCP client CLI. Connects to any MCP server over Streamable HTTP, supports Bearer/custom-header auth or no auth. Dual-channel distribution (npm + standalone binary). Includes an AI Agent skill for cross-platform agent integration.

## Tech Stack

- Language: TypeScript (ESM)
- CLI framework: cac
- MCP transport: `@modelcontextprotocol/sdk` — StreamableHTTPClientTransport (not SSE)
- Terminal colors: picocolors
- npm build: tsup
- Binary build: bun build --compile (cross-compile 5 platforms)
- Dev runner: tsx (no compilation needed)
- Commit lint: commitlint + husky (conventional commits)

## Directory Structure

```plain
weavefox-cli/
├── src/
│   ├── index.ts        # CLI entry, subcommand definitions + helpers
│   ├── config.ts       # Config: ~/.weavefox/config.json + env vars
│   ├── mcp-client.ts   # MCP client (StreamableHTTP + configurable auth + errors)
│   └── format.ts       # Output: JSON mode / human mode
├── scripts/
│   ├── build-bin.sh    # Bun cross-compile (5 platforms + SHA256)
│   └── release.sh      # Tag current version and push (triggers release pipeline)
├── skills/
│   └── weavefox/
│       ├── SKILL.md    # AI Agent skill (install via skills.sh)
│       └── scripts/
│           └── install.sh
├── .github/workflows/
│   ├── ci.yml          # CI: type check + build + binary smoke test
│   └── release.yml     # Release: NPM OIDC + GitHub Release
├── .husky/
│   └── commit-msg      # commitlint hook
├── pnpm-workspace.yaml  # pnpm v12 config (allowBuilds: esbuild)
├── commitlint.config.mjs
├── tsup.config.ts
├── tsconfig.json
├── package.json
├── README.md
├── README.zh-CN.md
└── AGENTS.md
```

## Commands

```bash
pnpm dev           # tsx runs TS directly
pnpm lint          # tsc --noEmit
pnpm build         # tsup -> dist/index.js
pnpm build:bin     # Bun binary (current platform)
pnpm build:bin:all # Cross-compile 5 platforms
pnpm clean         # rm -rf dist bin
pnpm release       # Tag current version and push (run on main after pull)
```

## CLI Subcommands

| Command | Description |
|---------|-------------|
| `login --key <key>` | Persist API Key |
| `logout [--purge]` | Clear credentials / remove config dir |
| `tools` | List MCP tools + schemas |
| `call <toolName> [--kv ...]` | Invoke a tool (`key=value` scalars, `key:=value` JSON) |
| `config [--set-url ...] [--set-auth-header ...]` | View / modify configuration |

Global options: `--json`, `--url <url>`, `--auth-header <header>`, `--version`

## Release Process

Main branch is protected — all changes go through PR.

1. Bump version in `package.json`, commit, push to a branch, create PR
2. Merge PR to main
3. `git checkout main && git pull`
4. `pnpm release` — tags current version and pushes tag
5. Tag push triggers `release.yml`:
   - NPM publish via OIDC -> binary cross-compile -> GitHub Release

Manual alternative: `git tag v0.0.2 && git push origin v0.0.2`

## Key Design

### Transport: StreamableHTTP

Server uses `WebStandardStreamableHTTPServerTransport`. Client matches with `StreamableHTTPClientTransport`.

### Auth: Configurable

- Default: `Authorization: Bearer <key>`
- Custom: `wf config --set-auth-header "X-API-Key"` or `--auth-header` global option
- No key: no auth header sent at all (public MCPs work out of the box)
- Env: `WEAVEFOX_API_KEY`, `WEAVEFOX_MCP_URL`, `WEAVEFOX_AUTH_HEADER`

### Config Priority

```
Env vars > Config file > Defaults
```

`--url`, `--auth-header`, `--json` are per-invocation overrides, don't write to file.

### --kv Syntax (httpie-style)

- `key=value` — scalar, auto-infer string/number/boolean/null
- `key:=value` — JSON, `JSON.parse` failure is an explicit error (no silent fallback)

### Dual-Channel Distribution

| Channel | Output | Target |
|---------|--------|--------|
| npm (`pnpm build`) | `dist/index.js` 11KB | Node developers, npx |
| Binary (`pnpm build:bin:all`) | 5 platform standalone binaries | No Node.js environment |

### CI/CD: OIDC Trusted Publishing

- NPM publish via OIDC, zero long-lived secrets, `--provenance` SLSA attestation
- Binary cross-compile via Bun, uploaded to GitHub Release with SHA256 checksums
- `concurrency` control prevents parallel release races
- `build-binaries` job depends on `publish-npm` success (version consistency)

## Coding Conventions

- ESM imports must include `.js` suffix: `import { getConfig } from './config.js'`
- JSON imports use `with { type: 'json' }` (not deprecated `assert`)
- Keep imports in sync with code changes (lint removes unused imports)
- SDK return types: `Awaited<ReturnType<...>>` inference, not direct Schema types
- Errors: `WeaveFoxCliError` with `code` field; no `process.exit()` except login
- Comments: only document WHY, never restate WHAT (function names already do that)
- `withClient()` closure manages MCP client lifecycle (create -> fn -> close)
- Commit messages: conventional commits (`feat:`, `fix:`, `docs:`, `chore:`), enforced by husky + commitlint
