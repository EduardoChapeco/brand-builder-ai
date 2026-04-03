import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { MCPTool, MCPToolCall, MCPToolResult } from './types';

export interface MCPServerConfig {
  workspaceId: string;
  supabaseClient: SupabaseClient<Database>;
  tools: MCPTool[];
}

export class CerebroMCPServer {
  private readonly tools = new Map<string, MCPTool>();
  private readonly workspaceId: string;
  private readonly supabase: SupabaseClient<Database>;

  constructor(config: MCPServerConfig) {
    this.workspaceId = config.workspaceId;
    this.supabase = config.supabaseClient;
    config.tools.forEach((tool) => this.tools.set(tool.name, tool));
  }

  listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return {
        tool: call.name,
        error: `Tool "${call.name}" not found. Available: ${this.listTools().map((item) => item.name).join(', ')}`,
        success: false,
      };
    }

    try {
      const result = await tool.handler({
        ...call.params,
        _workspaceId: this.workspaceId,
        _supabase: this.supabase,
      });

      return { tool: call.name, result, success: true };
    } catch (error) {
      return {
        tool: call.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  toXMLContext(): string {
    const toolsXml = this.listTools()
      .map(
        (tool) => `
      <tool name="${tool.name}" module="${tool.module}">
        <description>${tool.description}</description>
        <params>${JSON.stringify(tool.inputSchema)}</params>
      </tool>`,
      )
      .join('');

    return `<cerebro_mcp workspace="${this.workspaceId}">${toolsXml}</cerebro_mcp>`;
  }
}

const servers = new Map<string, CerebroMCPServer>();

export function getMCPServer(workspaceId: string): CerebroMCPServer | undefined {
  return servers.get(workspaceId);
}

export function initMCPServer(config: MCPServerConfig): CerebroMCPServer {
  const existing = servers.get(config.workspaceId);
  if (existing) return existing;

  const server = new CerebroMCPServer(config);
  servers.set(config.workspaceId, server);
  return server;
}
