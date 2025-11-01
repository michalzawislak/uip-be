/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
  requestTimeout: number;
  bodyLimit: number;
  logLevel: string;
}

/**
 * Application configuration
 */
export interface AppConfig {
  server: {
    requestTimeout: number;
    bodyLimit: number;
    logLevel: string;
  };
  processing: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    maxPipelineSteps: number;
  };
  tools: {
    autoDiscovery: boolean;
    toolsDirectory: string;
  };
}

/**
 * LLM provider types
 */
export type LLMProvider = 'anthropic' | 'openai';

/**
 * LLM model configuration
 */
export interface LLMModelConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  description: string;
}

/**
 * LLM models configuration file structure
 */
export interface LLMModelsConfig {
  models: Record<string, LLMModelConfig>;
  default: string;
  fallback: string;
}
