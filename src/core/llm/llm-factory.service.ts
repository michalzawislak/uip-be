import type { ILLMClient } from './llm-client.interface';
import type { LLMModelConfig } from '@common/types';
import { ConfigError } from '@common/types';

import { ConfigLoaderService } from './config-loader.service';
import { AnthropicClient } from './providers/anthropic.client';
import { OpenAIClient } from './providers/openai.client';

/**
 * Factory service for creating LLM client instances
 */
export class LLMFactoryService {
  private readonly configLoader: ConfigLoaderService;

  constructor(configLoader?: ConfigLoaderService) {
    this.configLoader = configLoader || new ConfigLoaderService();
  }

  /**
   * Create LLM client by model alias
   *
   * @param alias - Model alias (e.g., 'CLAUDE_FAST', 'GPT_SMART')
   * @returns Configured LLM client instance
   * @throws {ConfigError} When alias not found or config invalid
   * @throws {LLMError} When client creation fails
   */
  create(alias: string): ILLMClient {
    const config = this.configLoader.getModelConfig(alias);
    return this.createFromConfig(config);
  }

  /**
   * Create LLM client using default model
   *
   * @returns Configured LLM client instance
   */
  createDefault(): ILLMClient {
    const defaultAlias = this.configLoader.getDefaultAlias();
    return this.create(defaultAlias);
  }

  /**
   * Create LLM client using fallback model
   *
   * @returns Configured LLM client instance
   */
  createFallback(): ILLMClient {
    const fallbackAlias = this.configLoader.getFallbackAlias();
    return this.create(fallbackAlias);
  }

  /**
   * Create LLM client from model configuration
   *
   * @param config - Model configuration
   * @returns Configured LLM client instance
   * @throws {ConfigError} When provider is unknown
   * @throws {LLMError} When client creation fails
   */
  private createFromConfig(config: LLMModelConfig): ILLMClient {
    switch (config.provider) {
      case 'anthropic':
        return new AnthropicClient(config);
      case 'openai':
        return new OpenAIClient(config);
      default:
        throw new ConfigError(
          `Unknown LLM provider: ${config.provider}. Supported providers: anthropic, openai`
        );
    }
  }

  /**
   * Get list of available model aliases
   */
  getAvailableModels(): string[] {
    return this.configLoader.getAvailableAliases();
  }
}
