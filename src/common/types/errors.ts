/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, code, 400);
  }
}

/**
 * Tool execution error
 */
export class ToolExecutionError extends AppError {
  constructor(
    public readonly toolName: string,
    message: string,
    code: string = 'TOOL_EXECUTION_ERROR'
  ) {
    super(`Tool '${toolName}' failed: ${message}`, code, 500);
  }
}

/**
 * Pipeline processing error
 */
export class PipelineError extends AppError {
  constructor(
    message: string,
    code: string = 'PIPELINE_ERROR',
    public readonly stepIndex?: number
  ) {
    super(message, code, 500);
  }
}

/**
 * LLM client error
 */
export class LLMError extends AppError {
  constructor(
    public readonly provider: string,
    message: string,
    code: string = 'LLM_ERROR'
  ) {
    super(`LLM provider '${provider}' error: ${message}`, code, 500);
  }
}

/**
 * Configuration error
 */
export class ConfigError extends AppError {
  constructor(message: string, code: string = 'CONFIG_ERROR') {
    super(message, code, 500);
  }
}
