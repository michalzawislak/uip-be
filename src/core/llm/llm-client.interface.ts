import type { LLMMessage, LLMResponse, LLMRequestOptions } from '@common/types';

/**
 * Interface for LLM client implementations
 */
export interface ILLMClient {
  /**
   * Generate completion from messages
   *
   * @param messages - Array of conversation messages
   * @param options - Optional request options (temperature, maxTokens, etc.)
   * @returns LLM response with content and metadata
   * @throws {LLMError} When LLM API call fails
   */
  generateCompletion(
    messages: LLMMessage[],
    options?: LLMRequestOptions
  ): Promise<LLMResponse>;

  /**
   * Get the provider name
   */
  getProvider(): string;

  /**
   * Get the model name
   */
  getModel(): string;
}
