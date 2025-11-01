import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ConfigLoaderService } from '../../../src/core/llm/config-loader.service';
import { ConfigError } from '../../../src/common/types';
import type { LLMModelsConfig } from '../../../src/common/types';

describe('ConfigLoaderService', () => {
  const testConfigPath = join(process.cwd(), 'tests', 'fixtures', 'test-llm-config.json');

  const validConfig: LLMModelsConfig = {
    models: {
      CLAUDE_FAST: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        temperature: 0.7,
        maxTokens: 4096,
        description: 'Fast Claude model'
      },
      GPT_FAST: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 4096,
        description: 'Fast GPT model'
      }
    },
    default: 'CLAUDE_FAST',
    fallback: 'GPT_FAST'
  };

  beforeEach(() => {
    // Create fixtures directory if it doesn't exist
    try {
      mkdirSync(join(process.cwd(), 'tests', 'fixtures'), { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    // Write valid config
    writeFileSync(testConfigPath, JSON.stringify(validConfig, null, 2));
  });

  describe('getModelConfig', () => {
    it('should return model config for valid alias', () => {
      const loader = new ConfigLoaderService(testConfigPath);
      const config = loader.getModelConfig('CLAUDE_FAST');

      expect(config).toEqual(validConfig.models.CLAUDE_FAST);
    });

    it('should throw ConfigError for invalid alias', () => {
      const loader = new ConfigLoaderService(testConfigPath);

      expect(() => loader.getModelConfig('INVALID')).toThrow(ConfigError);
      expect(() => loader.getModelConfig('INVALID')).toThrow(/not found/);
    });

    it('should cache config after first load', () => {
      const loader = new ConfigLoaderService(testConfigPath);

      // First load
      loader.getModelConfig('CLAUDE_FAST');

      // Delete file
      unlinkSync(testConfigPath);

      // Should still work because of cache
      const config = loader.getModelConfig('GPT_FAST');
      expect(config).toEqual(validConfig.models.GPT_FAST);
    });
  });

  describe('getDefaultAlias', () => {
    it('should return default alias', () => {
      const loader = new ConfigLoaderService(testConfigPath);
      expect(loader.getDefaultAlias()).toBe('CLAUDE_FAST');
    });
  });

  describe('getFallbackAlias', () => {
    it('should return fallback alias', () => {
      const loader = new ConfigLoaderService(testConfigPath);
      expect(loader.getFallbackAlias()).toBe('GPT_FAST');
    });
  });

  describe('getAvailableAliases', () => {
    it('should return all available aliases', () => {
      const loader = new ConfigLoaderService(testConfigPath);
      const aliases = loader.getAvailableAliases();

      expect(aliases).toContain('CLAUDE_FAST');
      expect(aliases).toContain('GPT_FAST');
      expect(aliases).toHaveLength(2);
    });
  });

  describe('validation', () => {
    it('should throw ConfigError for non-existent config file', () => {
      const loader = new ConfigLoaderService('/nonexistent/path.json');

      expect(() => loader.getModelConfig('CLAUDE_FAST')).toThrow(ConfigError);
      expect(() => loader.getModelConfig('CLAUDE_FAST')).toThrow(/Failed to load LLM config/);
    });

    it('should throw ConfigError for malformed JSON', () => {
      const invalidPath = join(process.cwd(), 'tests', 'fixtures', 'malformed.json');
      writeFileSync(invalidPath, '{invalid json');

      const loader = new ConfigLoaderService(invalidPath);

      expect(() => loader.getModelConfig('CLAUDE_FAST')).toThrow(ConfigError);

      unlinkSync(invalidPath);
    });
  });
});
