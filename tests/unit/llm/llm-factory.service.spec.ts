import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMFactoryService } from '../../../src/core/llm/llm-factory.service';
import { ConfigLoaderService } from '../../../src/core/llm/config-loader.service';
import { AnthropicClient } from '../../../src/core/llm/providers/anthropic.client';
import { OpenAIClient } from '../../../src/core/llm/providers/openai.client';
import { ConfigError } from '../../../src/common/types';
import type { LLMModelConfig } from '../../../src/common/types';

// Mock environment variables
vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');

describe('LLMFactoryService', () => {
  let factory: LLMFactoryService;
  let configLoader: ConfigLoaderService;

  const mockAnthropicConfig: LLMModelConfig = {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 4096,
    description: 'Test Claude model'
  };

  const mockOpenAIConfig: LLMModelConfig = {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 4096,
    description: 'Test GPT model'
  };

  beforeEach(() => {
    // Create mock config loader
    configLoader = {
      getModelConfig: vi.fn(),
      getDefaultAlias: vi.fn().mockReturnValue('CLAUDE_FAST'),
      getFallbackAlias: vi.fn().mockReturnValue('GPT_FAST'),
      getAvailableAliases: vi.fn().mockReturnValue(['CLAUDE_FAST', 'GPT_FAST'])
    } as any;

    factory = new LLMFactoryService(configLoader);
  });

  describe('create', () => {
    it('should create AnthropicClient for anthropic provider', () => {
      vi.mocked(configLoader.getModelConfig).mockReturnValue(mockAnthropicConfig);

      const client = factory.create('CLAUDE_FAST');

      expect(configLoader.getModelConfig).toHaveBeenCalledWith('CLAUDE_FAST');
      expect(client).toBeInstanceOf(AnthropicClient);
      expect(client.getProvider()).toBe('anthropic');
      expect(client.getModel()).toBe('claude-sonnet-4-20250514');
    });

    it('should create OpenAIClient for openai provider', () => {
      vi.mocked(configLoader.getModelConfig).mockReturnValue(mockOpenAIConfig);

      const client = factory.create('GPT_FAST');

      expect(configLoader.getModelConfig).toHaveBeenCalledWith('GPT_FAST');
      expect(client).toBeInstanceOf(OpenAIClient);
      expect(client.getProvider()).toBe('openai');
      expect(client.getModel()).toBe('gpt-4o-mini');
    });

    it('should throw ConfigError for unknown provider', () => {
      const invalidConfig = { ...mockAnthropicConfig, provider: 'unknown' } as any;
      vi.mocked(configLoader.getModelConfig).mockReturnValue(invalidConfig);

      expect(() => factory.create('UNKNOWN')).toThrow(ConfigError);
      expect(() => factory.create('UNKNOWN')).toThrow(/Unknown LLM provider/);
    });

    it('should propagate ConfigError from config loader', () => {
      vi.mocked(configLoader.getModelConfig).mockImplementation(() => {
        throw new ConfigError('Model alias not found');
      });

      expect(() => factory.create('INVALID')).toThrow(ConfigError);
      expect(() => factory.create('INVALID')).toThrow('Model alias not found');
    });
  });

  describe('createDefault', () => {
    it('should create client using default alias', () => {
      vi.mocked(configLoader.getModelConfig).mockReturnValue(mockAnthropicConfig);

      const client = factory.createDefault();

      expect(configLoader.getDefaultAlias).toHaveBeenCalled();
      expect(configLoader.getModelConfig).toHaveBeenCalledWith('CLAUDE_FAST');
      expect(client).toBeInstanceOf(AnthropicClient);
    });
  });

  describe('createFallback', () => {
    it('should create client using fallback alias', () => {
      vi.mocked(configLoader.getModelConfig).mockReturnValue(mockOpenAIConfig);

      const client = factory.createFallback();

      expect(configLoader.getFallbackAlias).toHaveBeenCalled();
      expect(configLoader.getModelConfig).toHaveBeenCalledWith('GPT_FAST');
      expect(client).toBeInstanceOf(OpenAIClient);
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of available model aliases', () => {
      const aliases = factory.getAvailableModels();

      expect(configLoader.getAvailableAliases).toHaveBeenCalled();
      expect(aliases).toEqual(['CLAUDE_FAST', 'GPT_FAST']);
    });
  });
});
