import type { ILLMClient } from '@core/llm/llm-client.interface';

/**
 * Single step in execution plan
 */
export interface IPipelineStep {
  toolName: string;
  reason?: string;
  parameters?: Record<string, unknown>;
}

/**
 * Complete execution plan
 */
export interface IExecutionPlan {
  steps: IPipelineStep[];
  estimatedDurationMs?: number;
}

/**
 * Context for pipeline execution
 */
export interface IPipelineContext {
  instruction: string;
  file?: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  };
  plan: IExecutionPlan;
  llmClient: ILLMClient;
  requestId: string;
}

/**
 * Result of single step execution
 */
export interface IStepResult {
  stepIndex: number;
  toolName: string;
  success: boolean;
  output: unknown;
  metadata?: Record<string, unknown>;
  error?: string;
}

/**
 * Complete pipeline execution result
 */
export interface IPipelineResult {
  success: boolean;
  steps: IStepResult[];
  finalOutput: unknown;
  metadata: {
    totalDurationMs: number;
    stepsCompleted: number;
    totalSteps: number;
  };
  error?: string;
}

