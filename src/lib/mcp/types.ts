import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export interface MCPParamSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface MCPToolParams extends Record<string, unknown> {
  _workspaceId: string;
  _supabase: SupabaseClient<Database>;
}

export interface MCPTool {
  name: string;
  module: string;
  description: string;
  inputSchema: Record<string, MCPParamSchema>;
  handler: (params: MCPToolParams) => Promise<unknown>;
}

export interface MCPToolCall {
  name: string;
  params: Record<string, unknown>;
}

export interface MCPToolResult {
  tool: string;
  result?: unknown;
  error?: string;
  success: boolean;
}
