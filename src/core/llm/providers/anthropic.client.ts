import Anthropic from '@anthropic-ai/sdk';

import type { ILLMClient } from '../llm-client.interface';
import type { LLMMessage, LLMMessageContent, LLMResponse, LLMRequestOptions, LLMModelConfig } from '@common/types';
import { LLMError } from '@common/types';

/**
 * Anthropic Claude client implementation
 */
export class AnthropicClient implements ILLMClient {
  private readonly client: Anthropic;
  private readonly config: LLMModelConfig;

  constructor(config: LLMModelConfig) {
    this.config = config;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new LLMError(
        'anthropic',
        'ANTHROPIC_API_KEY environment variable not set',
        'MISSING_API_KEY'
      );
    }

    this.client = new Anthropic({
      apiKey,
      timeout: 45000,
      maxRetries: 2
    });
  }

  /**
   * Map our LLMMessage format to Anthropic's format
   */
  private mapMessages(messages: LLMMessage[]): Anthropic.MessageParam[] {
    return messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: this.mapContent(msg.content)
      }));
  }

  /**
   * Map content to Anthropic format (supports multimodal)
   */
  private mapContent(
    content: string | LLMMessageContent[]
  ): string | Anthropic.MessageParam['content'] {
    if (typeof content === 'string') {
      return content;
    }

    return content.map(part => {
      if (part.type === 'text') {
        return {
          type: 'text' as const,
          text: part.text || ''
        };
      } else if (part.type === 'image' && part.image) {
        const base64Match = part.image.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/);
        if (base64Match) {
          return {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: `image/${base64Match[1]}` as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64Match[2]
            }
          };
        }
      }
      return {
        type: 'text' as const,
        text: ''
      };
    });
  }

  /**
   * Extract system message if present
   */
  private extractSystemMessage(messages: LLMMessage[]): string | undefined {
    const systemMsg = messages.find(msg => msg.role === 'system');
    if (!systemMsg) return undefined;
    
    if (typeof systemMsg.content === 'string') {
      return systemMsg.content;
    }
    
    return systemMsg.content
      .filter(part => part.type === 'text')
      .map(part => part.text || '')
      .join('\n');
  }

  async generateCompletion(
    messages: LLMMessage[],
    options?: LLMRequestOptions
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      // Extract system message and filter it out from messages
      const systemMessage = options?.systemPrompt || this.extractSystemMessage(messages);
      const anthropicMessages = this.mapMessages(messages);

      if (anthropicMessages.length === 0) {
        throw new LLMError(
          'anthropic',
          'At least one user or assistant message required',
          'INVALID_MESSAGES'
        );
      }

      console.log(`   🤖 [LLM:Anthropic] Wywołanie API (model: ${this.config.model})...`);

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        system: systemMessage,
        messages: anthropicMessages
      });

      const duration = Date.now() - startTime;
      console.log(`   ✓ [LLM:Anthropic] Odpowiedź otrzymana w ${duration}ms (${response.usage.input_tokens + response.usage.output_tokens} tokenów)`);

      // Extract text content from response
      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as Anthropic.TextBlock).text)
        .join('\n');

      return {
        content,
        finishReason: this.mapStopReason(response.stop_reason),
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        model: response.model
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof LLMError) {
        console.log(`   ✗ [LLM:Anthropic] Błąd po ${duration}ms: ${error.message}`);
        throw error;
      }

      // Handle Anthropic SDK errors
      if (error instanceof Anthropic.APIError) {
        console.log(`   ✗ [LLM:Anthropic] API Error po ${duration}ms (status ${error.status}): ${error.message}`);
        
        if (error.status === 429) {
          console.log(`   ⚠️  [LLM:Anthropic] Rate limit - SDK automatycznie retry z backoff`);
        } else if (error.status && error.status >= 500) {
          console.log(`   ⚠️  [LLM:Anthropic] Błąd serwera - SDK automatycznie retry`);
        }
        
        throw new LLMError(
          'anthropic',
          `API error (${error.status}): ${error.message}`,
          'API_ERROR'
        );
      }

      console.log(`   ✗ [LLM:Anthropic] Nieznany błąd po ${duration}ms: ${error instanceof Error ? error.message : 'Unknown'}`);
      
      throw new LLMError(
        'anthropic',
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Map Anthropic stop reason to our format
   */
  private mapStopReason(reason: string | null): 'stop' | 'length' | 'error' {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return 'error';
    }
  }

  getProvider(): string {
    return 'anthropic';
  }

  getModel(): string {
    return this.config.model;
  }
}
