/**
 * Output formatting for two modes:
 *   - JSON mode (--json): bare JSON.stringify, no decoration.
 *   - Human mode (default): structured, colored output via picocolors.
 *
 * The SDK's CallToolResult / ListToolsResult types drift between versions, so
 * we accept a local structural interface (the `{ ...; [key: string]: unknown }`
 * shape) and only touch the fields we actually read. This keeps format.ts
 * decoupled from MCP SDK internals.
 */

import pc from 'picocolors';

interface ToolCallResultLike {
  isError?: boolean;
  content?: Array<{ type: string; text?: string }>;
  [key: string]: unknown;
}

interface ToolListResultLike {
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  }>;
  [key: string]: unknown;
}

export function outputToolResult(result: ToolCallResultLike, jsonMode: boolean): void {
  if (jsonMode) {
    console.log(JSON.stringify(result));
    return;
  }

  if (result.isError) {
    const text = extractText(result);
    console.error(pc.red('Error: ') + text);
    return;
  }

  const text = extractText(result);
  if (text) {
    console.log(text);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

export function outputToolList(result: ToolListResultLike, jsonMode: boolean): void {
  if (jsonMode) {
    console.log(JSON.stringify(result));
    return;
  }

  const tools = result.tools ?? [];
  if (tools.length === 0) {
    console.log(pc.yellow('No tools available.'));
    return;
  }

  console.log(pc.bold(`Available tools (${tools.length}):\n`));
  for (const tool of tools) {
    console.log(`  ${pc.cyan(tool.name)}`);
    if (tool.description) {
      console.log(`    ${pc.dim(tool.description)}`);
    }
    if (tool.inputSchema && Object.keys(tool.inputSchema).length > 0) {
      const schema = JSON.stringify(tool.inputSchema, null, 2)
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n');
      console.log(`    ${pc.dim('Input Schema:')}`);
      console.log(schema);
    }
    console.log();
  }
}

/** Joins text content blocks from a CallToolResult; ignores non-text blocks. */
function extractText(result: ToolCallResultLike): string {
  const { content } = result;
  if (!content || content.length === 0) return '';

  return content
    .filter((block) => block.type === 'text' && block.text !== undefined)
    .map((block) => block.text as string)
    .join('\n');
}
