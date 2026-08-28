/**
 * CLI configuration.
 *
 * API Key, MCP Server URL, and auth header name are persisted to
 * ~/.weavefox/config.json with 0600 permissions. Environment variables take
 * priority over the file, so CI/CD can inject WEAVEFOX_API_KEY /
 * WEAVEFOX_MCP_URL / WEAVEFOX_AUTH_HEADER without touching disk.
 */

import { existsSync, chmodSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_MCP_URL = 'https://www.weavefox.cn/mcp';
const DEFAULT_AUTH_HEADER = 'Authorization';
export const CONFIG_DIR = join(homedir(), '.weavefox');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const CONFIG_FILE_MODE = 0o600;

export interface CliConfig {
  apiKey: string;
  mcpUrl: string;
  /** Header name for API key. Default "Authorization" (sends as Bearer). */
  authHeader: string;
}

type StoredConfig = Partial<CliConfig>;

function readStoredConfig(): StoredConfig {
  try {
    if (!existsSync(CONFIG_FILE)) return {};
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as StoredConfig;
  } catch {
    return {};
  }
}

function writeStoredConfig(config: StoredConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  chmodSync(CONFIG_FILE, CONFIG_FILE_MODE);
}

/**
 * Priority: env vars > config file > defaults.
 */
export function getConfig(): CliConfig {
  const stored = readStoredConfig();
  return {
    apiKey: process.env.WEAVEFOX_API_KEY ?? stored.apiKey ?? '',
    mcpUrl: process.env.WEAVEFOX_MCP_URL ?? stored.mcpUrl ?? DEFAULT_MCP_URL,
    authHeader: process.env.WEAVEFOX_AUTH_HEADER ?? stored.authHeader ?? DEFAULT_AUTH_HEADER,
  };
}

export function setConfig(values: Partial<CliConfig>): void {
  const next: StoredConfig = { ...readStoredConfig() };
  if (values.apiKey !== undefined) next.apiKey = values.apiKey;
  if (values.mcpUrl !== undefined) next.mcpUrl = values.mcpUrl;
  if (values.authHeader !== undefined) next.authHeader = values.authHeader;
  writeStoredConfig(next);
}

export function clearConfig(): void {
  writeStoredConfig({});
}

/** Removes ~/.weavefox/ entirely — used by `wf logout --purge`. */
export function purgeConfig(): void {
  rmSync(CONFIG_DIR, { recursive: true, force: true });
}

export function hasApiKey(): boolean {
  return getConfig().apiKey.length > 0;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
