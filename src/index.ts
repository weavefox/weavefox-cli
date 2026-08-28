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
import pkg from '../package.json' with { type: 'json' };
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
  .option('--args <json>', 'Pass all arguments as a JSON object')
  .action(async (toolName, options) => {
    const { json, url, authHeader, args: jsonArgs } = options;

    await withClient(json, url, authHeader, async (client) => {
      let args: Record<string, unknown> = {};

      if (jsonArgs) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonArgs);
        } catch {
          throw new WeaveFoxCliError(
            'invalid_args',
            `--args expects valid JSON, got: "${jsonArgs}"`,
          );
        }
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new WeaveFoxCliError(
            'invalid_args',
            `--args expects a JSON object, got: "${jsonArgs}"`,
          );
        }
        args = parsed as Record<string, unknown>;
      }

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

/** show first 4 + last 4; mask everything in between. */
function maskApiKey(key: string): string {
  if (!key) return pc.dim('(not set)');
  if (key.length <= 8) return '*'.repeat(key.length);
  return key.slice(0, 4) + '****' + key.slice(-4);
}

cli.parse();
