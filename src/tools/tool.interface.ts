import type { ILLMClient } from '@core/llm/llm-client.interface';

/**
 * Tool configuration metadata
 */
export interface IToolConfig {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  inputTypes: string[];
  outputType: string;
  estimatedDurationMs: number;
  priority: number;
  contentType?: {
    contentType: string;
    version: string;
    category: string;
    schemaUrl?: string;
    examples?: unknown[];
    defaultDisplayType?: string;
    primaryField?: string;
    icon?: string;
  };
}

/**
 * Context passed to tool execution
 */
export interface IToolContext {
  instruction: string;
  file?: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  };
  previousResult?: unknown;
  llmClient: ILLMClient;
  metadata?: Record<string, unknown>;
}

/**
 * Result returned by tool execution
 */
export interface IToolResult {
  success: boolean;
  output: unknown;
  metadata?: {
    processingTimeMs?: number;
    tokensUsed?: number;
    [key: string]: unknown;
  };
  error?: string;
}

/**
 * Tool interface that all tools must implement
 */
export interface ITool {
  config: IToolConfig;
  execute(context: IToolContext): Promise<IToolResult>;
}

