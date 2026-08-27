/**
 * MCP client wrapper using StreamableHTTPClientTransport (not SSE).
 *
 * We match the server's WebStandardStreamableHTTPServerTransport via the
 * SDK's streamable-http client transport. Each call creates a fresh transport
 * + client, and the caller is expected to release via closeMcpClient when
 * done so the connection doesn't leak across invocations.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { getConfig } from './config.js';

const CLIENT_INFO = { name: 'weavefox-cli', version: '1.0.0' } as const;
const CLIENT_OPTIONS = { capabilities: {} } as const;

/**
 * Inferred from the SDK Client methods instead of importing CallToolResult /
 * ListToolsResult directly. The SDK's inferred return type can drift from its
 * exported Zod-schema types after transformations, so trusting ReturnType
 * keeps us in sync with what the SDK actually returns at runtime.
 */
export type ToolCallResult = Awaited<ReturnType<Client['callTool']>>;
export type ToolListResult = Awaited<ReturnType<Client['listTools']>>;

/**
 * @param urlOverride         Per-invocation URL override via --url
 * @param authHeaderOverride   Per-invocation auth header override via --auth-header
 * @throws                     WeaveFoxCliError('connection_failed')
 */
export async function createMcpClient(
  urlOverride?: string,
  authHeaderOverride?: string,
): Promise<Client> {
  const { apiKey, mcpUrl, authHeader } = getConfig();
  const serverUrl = urlOverride ?? mcpUrl;
  const effectiveAuthHeader = authHeaderOverride ?? authHeader;

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers[effectiveAuthHeader] = effectiveAuthHeader === 'Authorization' ? `Bearer ${apiKey}` : apiKey;
  }

  const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
    requestInit: { headers },
  });

  const client = new Client(CLIENT_INFO, CLIENT_OPTIONS);

  try {
    await client.connect(transport);
  } catch (err) {
    throw new WeaveFoxCliError(
      'connection_failed',
      `Failed to connect to MCP server at ${serverUrl}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return client;
}

/** Best-effort cleanup; close failures are silent. */
export async function closeMcpClient(client: Client): Promise<void> {
  try {
    await client.close();
  } catch {
    /* noop */
  }
}

export async function callTool(
  client: Client,
  name: string,
  arguments_?: Record<string, unknown>,
): Promise<ToolCallResult> {
  return client.callTool({ name, arguments: arguments_ ?? {} });
}

export async function listTools(client: Client): Promise<ToolListResult> {
  return client.listTools();
}

/**
 * Error type for known CLI-side conditions (not logged in, connection failed,
 * invalid --kv input). Carries a stable `code` the caller can branch on instead
 * of pattern-matching on messages.
 */
export class WeaveFoxCliError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'WeaveFoxCliError';
    this.code = code;
  }

  static is(err: unknown): err is WeaveFoxCliError {
    return err instanceof WeaveFoxCliError;
  }
}
