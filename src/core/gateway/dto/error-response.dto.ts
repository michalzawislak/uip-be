export interface ErrorResponseDto {
  success: false;
  error: string;
  failedAtStep?: number;
  completedSteps?: string[];
  metadata: {
    executionTimeMs: number;
    llmModel?: string;
    requestId: string;
  };
}

