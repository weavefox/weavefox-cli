/**
 * Lightweight update notifier.
 *
 * Caches the npm "latest" version in ~/.weavefox/update-check.json for 1 hour
 * so the vast majority of invocations hit the cache and never touch the network.
 * When the cache is stale, a single fetch to the npm registry is fired with a
 * 3-second timeout — failing silently on timeout or offline so the CLI never
 * blocks on update checks.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG_DIR } from './config.js';

const CACHE_FILE = join(CONFIG_DIR, 'update-check.json');
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const NPM_REGISTRY = 'https://registry.npmjs.org';
const PACKAGE_NAME = '@weavefox/cli';
const FETCH_TIMEOUT = 3000;

interface UpdateCache {
  latestVersion?: string;
  lastCheck?: number;
}

function readCache(): UpdateCache {
  try {
    if (!existsSync(CACHE_FILE)) return {};
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as UpdateCache;
  } catch {
    return {};
  }
}

function writeCache(cache: UpdateCache): void {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(cache) + '\n', 'utf-8');
  } catch {
    // Best-effort; skip on permission errors.
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${NPM_REGISTRY}/${PACKAGE_NAME}/latest`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

/**
 * Simple semver comparison: returns true when `latest > current`.
 * Only compares major.minor.patch (ignores pre-release tags).
 */
function isOutdated(current: string, latest: string): boolean {
  const c = current.split('.').map(Number);
  const l = latest.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const cv = c[i] ?? 0;
    const lv = l[i] ?? 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

let pendingCheck: Promise<string | null> | null = null;

/**
 * Starts (or joins) a singleton update-check promise.
 *
 * Cache-first: if the cached version is fresh (< 1 h) the promise resolves
 * synchronously from disk. On a stale cache, fetches the registry in the
 * background with a short timeout; stale cache is used as fallback on fetch
 * failure. The returned promise resolves with the latest version string when
 * the installed version is outdated, or `null` otherwise.
 */
export function startUpdateCheck(currentVersion: string): Promise<string | null> {
  if (pendingCheck) return pendingCheck;

  pendingCheck = (async () => {
    const cache = readCache();

    if (
      cache.latestVersion &&
      cache.lastCheck &&
      Date.now() - cache.lastCheck < CACHE_TTL
    ) {
      return isOutdated(currentVersion, cache.latestVersion)
        ? cache.latestVersion
        : null;
    }

    const latest = await fetchLatestVersion();
    if (latest) {
      writeCache({ latestVersion: latest, lastCheck: Date.now() });
      return isOutdated(currentVersion, latest) ? latest : null;
    }

    if (cache.latestVersion) {
      return isOutdated(currentVersion, cache.latestVersion)
        ? cache.latestVersion
        : null;
    }

    return null;
  })();

  return pendingCheck;
}
