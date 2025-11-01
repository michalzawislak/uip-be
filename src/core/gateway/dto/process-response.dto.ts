import type { Presentation, ResponseAction } from '@common/types';

export interface ProcessResponseDto {
  success: true;
  contentType: string;
  presentation: Presentation;
  data: unknown;
  actions?: ResponseAction[];
  metadata: {
    executionTimeMs: number;
    toolsUsed: string[];
    llmModel: string;
    planGenerated: boolean;
    stepsCompleted: number;
    phaseTimings?: Record<string, number>;
  };
}

export interface LegacyProcessResponseDto {
  success: true;
  message: string;
  result: unknown;
  metadata: {
    executionTimeMs: number;
    toolsUsed: string[];
    llmModel: string;
    planGenerated: boolean;
    stepsCompleted: number;
    phaseTimings?: Record<string, number>;
  };
}

