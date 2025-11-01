/**
 * LLM message role types
 */
export type LLMRole = 'user' | 'assistant' | 'system';

/**
 * LLM message content part (for multimodal messages)
 */
export interface LLMMessageContent {
  type: 'text' | 'image';
  text?: string;
  image?: string;
}

/**
 * LLM message structure
 * content can be:
 * - string: simple text message
 * - LLMMessageContent[]: multimodal message (text + images)
 */
export interface LLMMessage {
  role: LLMRole;
  content: string | LLMMessageContent[];
}

/**
 * LLM response structure
 */
export interface LLMResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
}

/**
 * LLM request options
 */
export interface LLMRequestOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
