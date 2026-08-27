/**
 * WeaveFox CLI entry.
 *
 * Commands:
 *   wf login --key <key>           Persist API Key
 *   wf logout [--purge]            Clear credentials (optionally remove dir)
 *   wf tools                       List MCP tools exposed by the server
 *   wf call <toolName> [--kv ...]  Invoke a tool (-kv key=value | key:=value)
 *   wf config [--set-url <url>]    Show / override MCP server URL
 *
 * Global options:
 *   --json      Pure JSON to stdout, suitable for piping / AI agents
 *   --url <url> Use this URL only for the current invocation
 *
 * Env vars:
 *   WEAVEFOX_API_KEY      API Key (takes precedence over config file)
 *   WEAVEFOX_MCP_URL      Server URL
 *   WEAVEFOX_AUTH_HEADER  Auth header name (default: Authorization)
 */

import { cac } from 'cac';
import pc from 'picocolors';
import pkg from '../package.json' assert { type: 'json' };
import { getConfig, setConfig, clearConfig, purgeConfig, hasApiKey, getConfigPath } from './config.js';
import {
  createMcpClient,
  closeMcpClient,
  callTool,
  listTools,
  WeaveFoxCliError,
} from './mcp-client.js';
import { outputToolResult, outputToolList } from './format.js';

export const cli = cac('wf')
  .version(pkg.version)
  .option('--json', 'Output as pure JSON (AI Agent friendly)')
  .option('--url <url>', 'Override MCP Server URL for this invocation')
  .option('--auth-header <header>', 'Override auth header name for this invocation')
  .help();

cli
  .command('login', 'Save your WeaveFox API Key locally')
  .option('--key <key>', 'Your WeaveFox API Key')
  .action((options) => {
    if (!options.key) {
      console.error(
        pc.red('Error: ') + 'Please provide a key: ' + pc.cyan('wf login --key <YOUR_KEY>'),
      );
      process.exit(1);
    }
    setConfig({ apiKey: options.key });
    console.log(pc.green('✓') + ' API Key saved to ' + pc.dim(getConfigPath()));
  });

cli
  .command('logout', 'Clear saved credentials')
  .option('--purge', 'Remove the entire config directory (use before uninstalling)')
  .action((options) => {
    if (options.purge) {
      purgeConfig();
      console.log(pc.green('✓') + ' Config directory removed: ' + pc.dim(getConfigPath().replace(/config\.json$/, '')));
      console.log(pc.yellow('You can now safely uninstall the CLI.'));
    } else {
      clearConfig();
      console.log(pc.green('✓') + ' Credentials cleared.');
    }
  });

cli
  .command('tools', 'List all available MCP tools and their schemas')
  .action(async (options) => {
    const { json, url, authHeader } = options;
    await withClient(json, url, authHeader, async (client) => {
      const result = await listTools(client);
      outputToolList(result, json);
    });
  });

cli
  .command('call <toolName>', 'Call a specific MCP tool by name')
  .option('--kv <key=value>', 'Pass arguments as key=value (scalars) or key:=value (JSON)', {
    type: [String],
  })
  .action(async (toolName, options) => {
    const { json, url, authHeader } = options;
    const args = parseToolArgs(options.kv);

    await withClient(json, url, authHeader, async (client) => {
      const result = await callTool(client, toolName, args);
      outputToolResult(result, json);
    });
  });

cli
  .command('config', 'View or modify CLI configuration')
  .option('--set-url <url>', 'Set the MCP Server URL')
  .option('--set-auth-header <header>', 'Set the auth header name (default: Authorization)')
  .action((options) => {
    if (options.setUrl) {
      setConfig({ mcpUrl: options.setUrl });
      console.log(pc.green('✓') + ' MCP Server URL updated.');
    }
    if (options.setAuthHeader) {
      setConfig({ authHeader: options.setAuthHeader });
      console.log(pc.green('✓') + ' Auth header updated.');
    }

    const config = getConfig();
    console.log(pc.bold('\nConfiguration:'));
    console.log(`  ${pc.cyan('config file')}   ${pc.dim(getConfigPath())}`);
    console.log(`  ${pc.cyan('API Key')}        ${maskApiKey(config.apiKey)}`);
    console.log(`  ${pc.cyan('MCP Server URL')}  ${config.mcpUrl}`);
    console.log(`  ${pc.cyan('Auth header')}    ${config.authHeader}${config.authHeader === 'Authorization' ? pc.dim(' (Bearer)') : ''}`);
    console.log(`  ${pc.cyan('Logged in')}      ${hasApiKey() ? pc.green('Yes') : pc.red('No')}`);
    console.log();
  });

/**
 * Connects a fresh MCP client, runs `fn`, and always closes the client before
 * returning. Errors (both WeaveFoxCliError and unknown) are formatted according
 * to `jsonMode` and never re-thrown — the process simply returns with non-zero
 * implied by error output. The closure pattern guarantees we never leak a
 * transport even on the early-return paths.
 */
async function withClient(
  jsonMode: boolean,
  urlOverride: string | undefined,
  authHeaderOverride: string | undefined,
  fn: (client: Awaited<ReturnType<typeof createMcpClient>>) => Promise<void>,
): Promise<void> {
  let client: Awaited<ReturnType<typeof createMcpClient>> | null = null;

  try {
    client = await createMcpClient(urlOverride, authHeaderOverride);
    await fn(client);
  } catch (err) {
    if (WeaveFoxCliError.is(err)) {
      if (jsonMode) {
        console.log(JSON.stringify({ error: true, code: err.code, message: err.message }));
      } else {
        console.error(pc.red('Error: ') + err.message);
      }
    } else {
      const message = err instanceof Error ? err.message : String(err);
      if (jsonMode) {
        console.log(JSON.stringify({ error: true, code: 'unknown', message }));
      } else {
        console.error(pc.red('Error: ') + message);
      }
    }
  } finally {
    if (client) {
      await closeMcpClient(client);
    }
  }
}

/**
 * Parses --kv pairs into a arguments object.
 *
 * Two syntaxes (httpie-inspired):
 *   key=value     Scalar; parsed via parseKvValue (auto-infers string/number/
 *                 boolean/null).
 *   key:=value    Explicit JSON; passes the value through JSON.parse. A parse
 *                 failure is thrown, NOT silently downgraded to a string —
 *                 the caller would otherwise get a bogus string that looks
 *                 like JSON but isn't.
 *
 * Multiple pairs are allowed on one command line; later pairs override
 * earlier ones for the same key.
 */
function parseToolArgs(kvPairs: string[] | undefined): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  if (!kvPairs || kvPairs.length === 0) return args;

  for (const pair of kvPairs) {
    const jsonSep = pair.indexOf(':=');
    const eqSep = pair.indexOf('=');

    if (jsonSep !== -1 && (eqSep === -1 || jsonSep < eqSep)) {
      const key = pair.slice(0, jsonSep).trim();
      const raw = pair.slice(jsonSep + 2).trim();
      try {
        args[key] = JSON.parse(raw);
      } catch {
        throw new WeaveFoxCliError(
          'invalid_kv',
          `--kv key:=value expects valid JSON, got: "${raw}"`,
        );
      }
    } else if (eqSep !== -1) {
      const key = pair.slice(0, eqSep).trim();
      const value = pair.slice(eqSep + 1).trim();
      args[key] = parseKvValue(value);
    } else {
      throw new WeaveFoxCliError(
        'invalid_kv',
        `--kv expects key=value or key:=value, got: "${pair}"`,
      );
    }
  }

  return args;
}

/**
 * Auto-infer scalar primitives for --kv key=value.
 * Use --kv key:=value for any JSON-typed value (objects, arrays, edge cases).
 */
function parseKvValue(value: string): unknown {
  const lower = value.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (lower === 'null') return null;
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return Number.parseFloat(value);
  return value;
}

/** show first 4 + last 4; mask everything in between. */
function maskApiKey(key: string): string {
  if (!key) return pc.dim('(not set)');
  if (key.length <= 8) return '*'.repeat(key.length);
  return key.slice(0, 4) + '****' + key.slice(-4);
}

cli.parse();
