import { readFileSync } from 'fs';
import { join } from 'path';

import type { LLMModelsConfig, LLMModelConfig } from '@common/types';
import { ConfigError } from '@common/types';

/**
 * Service for loading and validating LLM model configurations
 */
export class ConfigLoaderService {
  private config: LLMModelsConfig | null = null;
  private readonly configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || join(process.cwd(), 'config', 'llm-models.json');
  }

  /**
   * Load configuration from file
   *
   * @throws {ConfigError} When config file is invalid or missing
   */
  private loadConfig(): LLMModelsConfig {
    if (this.config) {
      return this.config;
    }

    try {
      const configData = readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(configData) as LLMModelsConfig;

      this.validateConfig(this.config);

      return this.config;
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      throw new ConfigError(
        `Failed to load LLM config from ${this.configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate configuration structure
   *
   * @throws {ConfigError} When config structure is invalid
   */
  private validateConfig(config: LLMModelsConfig): void {
    if (!config.models || typeof config.models !== 'object') {
      throw new ConfigError('Invalid config: missing or invalid "models" object');
    }

    if (!config.default || typeof config.default !== 'string') {
      throw new ConfigError('Invalid config: missing or invalid "default" alias');
    }

    if (!config.fallback || typeof config.fallback !== 'string') {
      throw new ConfigError('Invalid config: missing or invalid "fallback" alias');
    }

    // Validate that default and fallback aliases exist
    if (!config.models[config.default]) {
      throw new ConfigError(`Default alias "${config.default}" not found in models`);
    }

    if (!config.models[config.fallback]) {
      throw new ConfigError(`Fallback alias "${config.fallback}" not found in models`);
    }

    // Validate each model configuration
    for (const [alias, modelConfig] of Object.entries(config.models)) {
      this.validateModelConfig(alias, modelConfig);
    }
  }

  /**
   * Validate individual model configuration
   *
   * @throws {ConfigError} When model config is invalid
   */
  private validateModelConfig(alias: string, config: LLMModelConfig): void {
    const requiredFields = ['provider', 'model', 'temperature', 'maxTokens', 'description'];

    for (const field of requiredFields) {
      if (!(field in config)) {
        throw new ConfigError(`Model "${alias}" missing required field: ${field}`);
      }
    }

    if (config.provider !== 'anthropic' && config.provider !== 'openai') {
      throw new ConfigError(
        `Model "${alias}" has invalid provider: ${config.provider}. Must be "anthropic" or "openai"`
      );
    }

    if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
      throw new ConfigError(`Model "${alias}" has invalid temperature: must be between 0 and 2`);
    }

    if (typeof config.maxTokens !== 'number' || config.maxTokens <= 0) {
      throw new ConfigError(`Model "${alias}" has invalid maxTokens: must be positive number`);
    }
  }

  /**
   * Get model configuration by alias
   *
   * @param alias - Model alias (e.g., 'CLAUDE_FAST', 'GPT_SMART')
   * @returns Model configuration
   * @throws {ConfigError} When alias not found
   */
  getModelConfig(alias: string): LLMModelConfig {
    const config = this.loadConfig();

    if (!config.models[alias]) {
      throw new ConfigError(
        `Model alias "${alias}" not found. Available aliases: ${Object.keys(config.models).join(', ')}`
      );
    }

    return config.models[alias];
  }

  /**
   * Get default model alias
   */
  getDefaultAlias(): string {
    const config = this.loadConfig();
    return config.default;
  }

  /**
   * Get fallback model alias
   */
  getFallbackAlias(): string {
    const config = this.loadConfig();
    return config.fallback;
  }

  /**
   * Get all available model aliases
   */
  getAvailableAliases(): string[] {
    const config = this.loadConfig();
    return Object.keys(config.models);
  }
}
