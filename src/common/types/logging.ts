/**
 * Log level types
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Request context for logging
 */
export interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Processing context for logging
 */
export interface ProcessingContext extends RequestContext {
  step?: number;
  toolName?: string;
  duration?: number;
}
