# @weavefox/cli

[![npm version](https://img.shields.io/npm/v/@weavefox/cli)](https://www.npmjs.com/package/@weavefox/cli)
[![npm downloads](https://img.shields.io/npm/dm/@weavefox/cli)](https://www.npmjs.com/package/@weavefox/cli)
[![CI](https://img.shields.io/github/actions/workflow/status/weavefox/weavefox-cli/ci.yml?branch=main)](https://github.com/weavefox/weavefox-cli/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/weavefox/weavefox-cli/release.yml)](https://github.com/weavefox/weavefox-cli/actions/workflows/release.yml)
[![License](https://img.shields.io/npm/l/@weavefox/cli)](https://github.com/weavefox/weavefox-cli/blob/main/LICENSE)
[![Skills.sh](https://img.shields.io/badge/skills.sh-compatible-blue)](https://www.skills.sh)

通过 MCP 协议调用 WeaveFox 服务端开放能力的命令行工具，面向开发者和 AI Agent。

[English](./README.md)

## 安装

### npm

```bash
# 全局安装
npm i -g @weavefox/cli
wf tools
```

### 独立二进制（无需 Node.js）

从 [GitHub Release](https://github.com/weavefox/weavefox-cli/releases) 下载对应平台：

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

Windows: 从 [Releases](https://github.com/weavefox/weavefox-cli/releases) 下载 `wf-windows-x64.exe`。

### AI Agent Skill

通过 [skill](skills/weavefox/SKILL.md) 安装，任何兼容 skills 标准的 Agent 可直接使用：

```bash
npx skills add https://github.com/weavefox/weavefox-cli --skill weavefox
```

详见 [skills/weavefox/SKILL.md](skills/weavefox/SKILL.md)。

## 快速开始

```bash
# 1. 登录
wf login --key <YOUR_API_KEY>

# 2. 查看可用工具
wf tools

# 3. 调用工具
wf call <toolName> --args '{"page":1,"pageSize":10}' --json
```

## 命令

| 命令 | 说明 |
| --------- | ------------- |
| `wf login --key <key>` | 保存 API Key |
| `wf logout` | 清除凭据 |
| `wf logout --purge` | 删除整个配置目录（卸载前使用） |
| `wf tools` | 列出所有 MCP 工具及 Schema |
| `wf call <toolName>` | 调用指定工具 |
| `wf config` | 查看 / 修改配置 |

### 全局选项

| 选项 | 说明 |
| ------ | ------------- |
| `--json` | 纯 JSON 输出（错误也是 JSON，不含人类可读文本） |
| `--url <url>` | 单次覆盖 Server URL |
| `--auth-header <header>` | 单次覆盖鉴权 header 名 |

### wf call 传参

```bash
# 所有参数作为 JSON 对象传入
wf call <toolName> --args '{"page":1,"pageSize":10,"filter":{"tag":"tool"}}' --json

# 无参数工具——不需要 --args
wf call <toolName> --json

# 无效 JSON 或非对象类型会直接报错
wf call <toolName> --args 'not json' --json
# Error: --args expects valid JSON, got: "not json"
wf call <toolName> --args '[1,2,3]' --json
# Error: --args expects a JSON object, got: "[1,2,3]"
```

## 配置

配置文件: `~/.weavefox/config.json`

CLI 通过 Streamable HTTP 传输连接任意 MCP Server 端点。鉴权默认使用 `Authorization: Bearer <key>`，需要自定义 header 时可配置：

```bash
# 查看配置
wf config

# 设置自定义 MCP Server URL
wf config --set-url https://your-server.com/mcp

# 切换鉴权 header（默认 "Authorization" 发送 "Bearer <key>"，
# 自定义 header 直接发送 key 值）
wf config --set-auth-header "X-API-Key"
```

环境变量（优先级高于配置文件，适合 CI/CD）：

```bash
export WEAVEFOX_API_KEY=your_api_key
export WEAVEFOX_MCP_URL=https://your-server.com/mcp
export WEAVEFOX_AUTH_HEADER=X-API-Key
```

## 卸载

卸载 CLI 前清理凭据和配置：

```bash
wf logout --purge
# 会删除整个 ~/.weavefox/ 目录

# 然后卸载 CLI 本身
npm uninstall -g @weavefox/cli   # npm 安装的
# 或删除下载的二进制文件         # 独立二进制
```
