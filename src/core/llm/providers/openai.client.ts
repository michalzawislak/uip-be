import OpenAI from 'openai';

import type { ILLMClient } from '../llm-client.interface';
import type { LLMMessage, LLMMessageContent, LLMResponse, LLMRequestOptions, LLMModelConfig } from '@common/types';
import { LLMError } from '@common/types';

/**
 * OpenAI GPT client implementation
 */
export class OpenAIClient implements ILLMClient {
  private readonly client: OpenAI;
  private readonly config: LLMModelConfig;

  constructor(config: LLMModelConfig) {
    this.config = config;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new LLMError(
        'openai',
        'OPENAI_API_KEY environment variable not set',
        'MISSING_API_KEY'
      );
    }

    this.client = new OpenAI({
      apiKey,
      timeout: 45000,
      maxRetries: 2
    });
  }

  /**
   * Map our LLMMessage format to OpenAI's format
   */
  private mapMessages(
    messages: LLMMessage[],
    systemPrompt?: string
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      openaiMessages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    for (const msg of messages) {
      const mappedContent = this.mapContent(msg.content);
      
      if (msg.role === 'system') {
        openaiMessages.push({
          role: 'system',
          content: typeof mappedContent === 'string' ? mappedContent : ''
        });
      } else if (msg.role === 'user') {
        openaiMessages.push({
          role: 'user',
          content: mappedContent
        });
      } else if (msg.role === 'assistant') {
        openaiMessages.push({
          role: 'assistant',
          content: typeof mappedContent === 'string' ? mappedContent : ''
        });
      }
    }

    return openaiMessages;
  }

  /**
   * Map content to OpenAI format (supports multimodal)
   */
  private mapContent(
    content: string | LLMMessageContent[]
  ): string | OpenAI.Chat.ChatCompletionContentPart[] {
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
        return {
          type: 'image_url' as const,
          image_url: {
            url: part.image
          }
        };
      }
      return {
        type: 'text' as const,
        text: ''
      };
    });
  }

  async generateCompletion(
    messages: LLMMessage[],
    options?: LLMRequestOptions
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      const openaiMessages = this.mapMessages(messages, options?.systemPrompt);

      if (openaiMessages.length === 0) {
        throw new LLMError(
          'openai',
          'At least one message required',
          'INVALID_MESSAGES'
        );
      }

      console.log(`   🤖 [LLM:OpenAI] Wywołanie API (model: ${this.config.model})...`);

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: openaiMessages,
        max_tokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature
      });

      const duration = Date.now() - startTime;
      const totalTokens = response.usage ? response.usage.total_tokens : 0;
      console.log(`   ✓ [LLM:OpenAI] Odpowiedź otrzymana w ${duration}ms (${totalTokens} tokenów)`);

      const choice = response.choices[0];
      if (!choice) {
        throw new LLMError(
          'openai',
          'No completion choices returned',
          'EMPTY_RESPONSE'
        );
      }

      const content = choice.message.content || '';

      return {
        content,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens
            }
          : undefined,
        model: response.model
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof LLMError) {
        console.log(`   ✗ [LLM:OpenAI] Błąd po ${duration}ms: ${error.message}`);
        throw error;
      }

      // Handle OpenAI SDK errors
      if (error instanceof OpenAI.APIError) {
        console.log(`   ✗ [LLM:OpenAI] API Error po ${duration}ms (status ${error.status}): ${error.message}`);
        
        if (error.status === 429) {
          console.log(`   ⚠️  [LLM:OpenAI] Rate limit - SDK automatycznie retry z backoff`);
        } else if (error.status && error.status >= 500) {
          console.log(`   ⚠️  [LLM:OpenAI] Błąd serwera - SDK automatycznie retry`);
        }
        
        throw new LLMError(
          'openai',
          `API error (${error.status}): ${error.message}`,
          'API_ERROR'
        );
      }

      console.log(`   ✗ [LLM:OpenAI] Nieznany błąd po ${duration}ms: ${error instanceof Error ? error.message : 'Unknown'}`);
      
      throw new LLMError(
        'openai',
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Map OpenAI finish reason to our format
   */
  private mapFinishReason(reason: string | null): 'stop' | 'length' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      default:
        return 'error';
    }
  }

  getProvider(): string {
    return 'openai';
  }

  getModel(): string {
    return this.config.model;
  }
}
